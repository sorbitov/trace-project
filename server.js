import { createServer } from "node:http";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL(".", import.meta.url));
const appRoot = join(root, "app");
const dataDir = join(root, "data");
const statePath = join(dataDir, "state.json");
const port = Number(process.env.PORT || 4174);

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
};

function normalizeHandle(value) {
  return String(value || "").trim().replace(/^@/, "").toLowerCase();
}

function resolveXUserId(handle) {
  const normalized = normalizeHandle(handle);
  if (!/^[a-z0-9_]{1,15}$/.test(normalized)) return null;
  return `xuid_${Buffer.from(normalized).toString("hex")}`;
}

async function ensureState() {
  await mkdir(dataDir, { recursive: true });
  if (!existsSync(statePath)) {
    await writeFile(statePath, JSON.stringify({ dashboard: null, payments: [] }, null, 2));
  }
}

async function readState() {
  await ensureState();
  const raw = await readFile(statePath, "utf8");
  return JSON.parse(raw.replace(/^\uFEFF/, ""));
}

async function writeState(state) {
  await ensureState();
  await writeFile(statePath, JSON.stringify(state, null, 2));
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function send(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
}

function paymentView(payment, xVerified = false) {
  return {
    ...payment,
    amountLabel: payment.amountVisibility === "public" || xVerified ? `${payment.amount.toFixed(2)} USDC` : "USDC amount hidden",
    senderLabel: payment.senderVisibility === "public" || xVerified ? payment.sender : "Sender hidden",
    memoLabel: xVerified ? payment.memo : "Private memo unlocks after X OAuth.",
  };
}

async function handleApi(req, res, url) {
  if (req.method === "GET" && url.pathname === "/api/state") {
    const state = await readState();
    send(res, 200, state);
    return true;
  }

  if (req.method === "POST" && url.pathname === "/api/dashboard") {
    const body = await readBody(req);
    const handle = normalizeHandle(body.handle);
    const xUserId = resolveXUserId(handle);
    if (!xUserId) {
      send(res, 400, { error: "Enter a valid X handle." });
      return true;
    }
    const state = await readState();
    state.dashboard = {
      handle,
      displayName: String(body.displayName || "").trim() || `@${handle}`,
      defaultSenderVisibility: body.defaultSenderVisibility === "public" ? "public" : "private",
      xUserId,
      createdAt: new Date().toISOString(),
    };
    await writeState(state);
    send(res, 200, state);
    return true;
  }

  if (req.method === "POST" && url.pathname === "/api/payments") {
    const state = await readState();
    if (!state.dashboard) {
      send(res, 409, { error: "Create dashboard before sending tips." });
      return true;
    }
    const body = await readBody(req);
    const handle = normalizeHandle(body.handle);
    const xUserId = resolveXUserId(handle);
    if (!xUserId) {
      send(res, 400, { error: "X handle lookup failed. Payment was not created." });
      return true;
    }
    const amount = Number(body.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      send(res, 400, { error: "Amount must be positive." });
      return true;
    }
    const feePct = Math.max(0.5, Number(body.feePct) || 0.5);
    const expiryDays = Math.max(1, Math.min(365, Number(body.expiryDays) || 30));
    const id = `hp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
    const claimUrl = `http://127.0.0.1:${port}/index.html#claim=${id}`;
    const payment = {
      id,
      handle,
      xUserId,
      amount,
      feePct,
      fee: Number((amount * (feePct / 100)).toFixed(6)),
      expiryDays,
      amountVisibility: body.amountVisibility === "public" ? "public" : "private",
      senderVisibility: body.senderVisibility === "public" ? "public" : "private",
      cancelMode: body.cancelMode === "locked" ? "locked" : "cancellable",
      memo: String(body.memo || "").trim(),
      sender: `@${state.dashboard.handle}`,
      status: "pending",
      xVerified: false,
      walletAddress: null,
      claimUrl,
      shareText: `@${handle} you have ${amount} USDC waiting on Arc. Claim with X: ${claimUrl}`,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000).toISOString(),
    };
    state.payments.unshift(payment);
    await writeState(state);
    send(res, 201, state);
    return true;
  }

  const verifyMatch = url.pathname.match(/^\/api\/payments\/([^/]+)\/verify-x$/);
  if (req.method === "POST" && verifyMatch) {
    const state = await readState();
    const payment = state.payments.find((item) => item.id === verifyMatch[1]);
    if (!payment) {
      send(res, 404, { error: "Payment not found." });
      return true;
    }
    if (payment.status !== "pending") {
      send(res, 409, { error: "Payment is not claimable." });
      return true;
    }
    payment.xVerified = true;
    await writeState(state);
    send(res, 200, { payment: paymentView(payment, true), state });
    return true;
  }

  const claimMatch = url.pathname.match(/^\/api\/payments\/([^/]+)\/claim$/);
  if (req.method === "POST" && claimMatch) {
    const state = await readState();
    const payment = state.payments.find((item) => item.id === claimMatch[1]);
    const body = await readBody(req);
    if (!payment) {
      send(res, 404, { error: "Payment not found." });
      return true;
    }
    if (payment.status !== "pending") {
      send(res, 409, { error: "Payment is not claimable." });
      return true;
    }
    if (!payment.xVerified) {
      send(res, 403, { error: "Complete X OAuth before wallet claim." });
      return true;
    }
    const walletAddress = String(body.walletAddress || "").trim();
    if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      send(res, 400, { error: "Enter a valid Arc EVM wallet address." });
      return true;
    }
    payment.walletAddress = walletAddress;
    payment.status = "claimed";
    payment.claimedAt = new Date().toISOString();
    await writeState(state);
    send(res, 200, state);
    return true;
  }

  const cancelMatch = url.pathname.match(/^\/api\/payments\/([^/]+)\/cancel$/);
  if (req.method === "POST" && cancelMatch) {
    const state = await readState();
    const payment = state.payments.find((item) => item.id === cancelMatch[1]);
    if (!payment) {
      send(res, 404, { error: "Payment not found." });
      return true;
    }
    if (payment.status !== "pending") {
      send(res, 409, { error: "Only pending payments can be cancelled." });
      return true;
    }
    if (payment.cancelMode !== "cancellable") {
      send(res, 409, { error: "This payment is locked until expiry." });
      return true;
    }
    payment.status = "cancelled";
    payment.cancelledAt = new Date().toISOString();
    await writeState(state);
    send(res, 200, state);
    return true;
  }

  return false;
}

async function serveStatic(req, res, url) {
  const requested = url.pathname === "/" ? "/index.html" : url.pathname;
  const filePath = normalize(join(appRoot, requested));
  if (!filePath.startsWith(appRoot)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }
  try {
    const data = await readFile(filePath);
    res.writeHead(200, { "Content-Type": contentTypes[extname(filePath)] || "application/octet-stream" });
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end("Not found");
  }
}

createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", `http://${req.headers.host}`);
    if (url.pathname.startsWith("/api/")) {
      const handled = await handleApi(req, res, url);
      if (!handled) send(res, 404, { error: "API route not found." });
      return;
    }
    await serveStatic(req, res, url);
  } catch (error) {
    send(res, 500, { error: error instanceof Error ? error.message : "Server error" });
  }
}).listen(port, "127.0.0.1", () => {
  console.log(`HandlePay server running at http://127.0.0.1:${port}/index.html`);
});
