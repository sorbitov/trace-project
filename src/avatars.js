import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const cacheRoot = join(fileURLToPath(new URL("..", import.meta.url)), "cache", "avatars");

// unavatar.io enforces a DAILY anonymous quota, not a per-second rate: once it is
// spent every request returns 429 ERATE with Retry-After ~23h, so spacing requests
// out does not help. The browser asks for up to 142 avatars, so we (a) funnel all
// upstream fetches through one throttled queue, (b) cache successes on disk
// forever, and (c) trip a circuit breaker on 429 for as long as Retry-After says,
// which turns the remaining 141 requests into instant local 404s instead of 141
// pointless round trips. Clients render initials on a 404.
const UPSTREAM_CONCURRENCY = 2;
const UPSTREAM_MIN_INTERVAL_MS = 320;
const NEGATIVE_TTL_MS = 10 * 60_000;
const BREAKER_FALLBACK_MS = 60 * 60_000;
const BREAKER_MAX_MS = 24 * 60 * 60_000;
const UPSTREAM_TIMEOUT_MS = 8_000;
const MAX_BYTES = 512 * 1024;

const HANDLE_PATTERN = /^[A-Za-z0-9_]{1,15}$/;
const TYPES = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["image/gif", "gif"],
]);
const EXTENSION_TYPES = new Map([...TYPES].map(([type, extension]) => [extension, type]));

export function normalizeAvatarHandle(value) {
  const handle = String(value || "").trim().replace(/^@/, "");
  return HANDLE_PATTERN.test(handle) ? handle.toLowerCase() : null;
}

function createQueue({ concurrency, minIntervalMs }) {
  const pending = [];
  let active = 0;
  let lastStartedAt = 0;

  function pump() {
    if (active >= concurrency || pending.length === 0) return;
    const wait = Math.max(0, lastStartedAt + minIntervalMs - Date.now());
    if (wait > 0) {
      setTimeout(pump, wait).unref?.();
      return;
    }
    const job = pending.shift();
    active += 1;
    lastStartedAt = Date.now();
    job.run().then(job.resolve, job.reject).finally(() => {
      active -= 1;
      pump();
    });
  }

  return function enqueue(run) {
    return new Promise((resolve, reject) => {
      pending.push({ run, resolve, reject });
      pump();
    });
  };
}

async function readCachedFile(handle) {
  for (const [extension, type] of EXTENSION_TYPES) {
    try {
      return { body: await readFile(join(cacheRoot, `${handle}.${extension}`)), type };
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }
  return null;
}

function retryAfterMs(response) {
  const header = String(response.headers.get("retry-after") || "").trim();
  if (!header) return BREAKER_FALLBACK_MS;
  const seconds = Number(header);
  const ms = Number.isFinite(seconds) ? seconds * 1_000 : Date.parse(header) - Date.now();
  if (!Number.isFinite(ms) || ms <= 0) return BREAKER_FALLBACK_MS;
  return Math.min(ms, BREAKER_MAX_MS);
}

export function createAvatarProxy({ fetchImpl = fetch } = {}) {
  const enqueue = createQueue({ concurrency: UPSTREAM_CONCURRENCY, minIntervalMs: UPSTREAM_MIN_INTERVAL_MS });
  const memory = new Map();
  const inflight = new Map();
  const failures = new Map();
  let cacheReady = null;
  let breakerUntil = 0;

  function ensureCacheDir() {
    cacheReady ||= mkdir(cacheRoot, { recursive: true }).catch(() => null);
    return cacheReady;
  }

  async function fetchUpstream(handle) {
    const url = `https://unavatar.io/x/${encodeURIComponent(handle)}?fallback=false&size=128`;
    const response = await fetchImpl(url, {
      headers: { accept: "image/*" },
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
    if (response.status === 429) {
      breakerUntil = Date.now() + retryAfterMs(response);
      throw Object.assign(new Error("upstream 429"), { status: 429 });
    }
    if (!response.ok) throw Object.assign(new Error(`upstream ${response.status}`), { status: response.status });
    const type = String(response.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
    const extension = TYPES.get(type);
    if (!extension) throw new Error(`unsupported upstream type ${type || "unknown"}`);
    const body = Buffer.from(await response.arrayBuffer());
    if (body.byteLength < 64) throw new Error("upstream image too small");
    if (body.byteLength > MAX_BYTES) throw new Error("upstream image too large");
    await ensureCacheDir();
    await writeFile(join(cacheRoot, `${handle}.${extension}`), body).catch(() => null);
    return { body, type };
  }

  async function resolve(handle) {
    const cached = memory.get(handle);
    if (cached) return cached;

    const onDisk = await readCachedFile(handle);
    if (onDisk) {
      memory.set(handle, onDisk);
      return onDisk;
    }

    // Daily quota is spent: skip the round trip entirely until Retry-After passes.
    if (Date.now() < breakerUntil) return null;

    const failedAt = failures.get(handle);
    if (failedAt && Date.now() - failedAt < NEGATIVE_TTL_MS) return null;

    let request = inflight.get(handle);
    if (!request) {
      request = enqueue(() => fetchUpstream(handle))
        .then((image) => {
          memory.set(handle, image);
          failures.delete(handle);
          return image;
        })
        .catch(() => {
          failures.set(handle, Date.now());
          return null;
        })
        .finally(() => inflight.delete(handle));
      inflight.set(handle, request);
    }
    return request;
  }

  return async function avatarHandler(req, res) {
    const handle = normalizeAvatarHandle(req.params.handle);
    if (!handle) return res.status(400).type("text/plain").send("Invalid handle.");
    const image = await resolve(handle);
    if (!image) {
      // The client falls back to initials on a non-200, so keep this cheap and
      // let it retry once the negative cache expires.
      res.setHeader("Cache-Control", "public, max-age=600");
      return res.status(404).type("text/plain").send("Avatar unavailable.");
    }
    res.setHeader("Content-Type", image.type);
    res.setHeader("Cache-Control", "public, max-age=86400, stale-while-revalidate=604800");
    res.setHeader("Cross-Origin-Resource-Policy", "same-origin");
    return res.send(image.body);
  };
}
