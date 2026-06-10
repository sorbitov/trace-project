import { createServer } from "node:http";
import { createHash, randomBytes } from "node:crypto";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL(".", import.meta.url));
const appRoot = join(root, "app");
const dataDir = join(root, "data");
const statePath = join(dataDir, "state.json");
const port = Number(process.env.PORT || 4174);
const xClientId = process.env.X_CLIENT_ID || process.env.TWITTER_CLIENT_ID || "";
const xClientSecret = process.env.X_CLIENT_SECRET || process.env.TWITTER_CLIENT_SECRET || "";
const xRedirectUri = process.env.X_REDIRECT_URI || `http://127.0.0.1:${port}/api/auth/x/callback`;
const xOAuthStates = new Map();
const xSessions = new Map();

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

function isEvmAddress(value) {
  return /^0x[a-fA-F0-9]{40}$/.test(String(value || "").trim());
}

function base64Url(buffer) {
  return buffer.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function parseCookies(req) {
  return Object.fromEntries(
    String(req.headers.cookie || "")
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const index = part.indexOf("=");
        return index === -1 ? [part, ""] : [part.slice(0, index), decodeURIComponent(part.slice(index + 1))];
      }),
  );
}

function redirect(res, location, headers = {}) {
  res.writeHead(302, { Location: location, ...headers });
  res.end();
}

function currentXSession(req) {
  const sessionId = parseCookies(req).hp_x_session;
  return sessionId ? xSessions.get(sessionId) || null : null;
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

function sendOAuthRequired(res) {
  send(res, 501, {
    error: "X OAuth is not configured. Set X_CLIENT_ID, optional X_CLIENT_SECRET, and X_REDIRECT_URI, then restart server.",
  });
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
  if (req.method === "GET" && url.pathname === "/api/auth/x/start") {
    if (!xClientId) {
      redirect(res, "/index.html?x_error=missing_x_oauth_config");
      return true;
    }

    const state = base64Url(randomBytes(24));
    const codeVerifier = base64Url(randomBytes(48));
    const codeChallenge = base64Url(createHash("sha256").update(codeVerifier).digest());
    xOAuthStates.set(state, { codeVerifier, createdAt: Date.now() });

    const authUrl = new URL("https://twitter.com/i/oauth2/authorize");
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("client_id", xClientId);
    authUrl.searchParams.set("redirect_uri", xRedirectUri);
    authUrl.searchParams.set("scope", "users.read tweet.read offline.access");
    authUrl.searchParams.set("state", state);
    authUrl.searchParams.set("code_challenge", codeChallenge);
    authUrl.searchParams.set("code_challenge_method", "S256");
    redirect(res, authUrl.toString());
    return true;
  }

  if (req.method === "GET" && url.pathname === "/api/auth/x/callback") {
    const code = url.searchParams.get("code");
    const returnedState = url.searchParams.get("state");
    const stored = returnedState ? xOAuthStates.get(returnedState) : null;
    if (!code || !returnedState || !stored) {
      redirect(res, "/index.html?x_error=invalid_x_oauth_state");
      return true;
    }
    xOAuthStates.delete(returnedState);

    try {
      const tokenHeaders = { "Content-Type": "application/x-www-form-urlencoded" };
      if (xClientSecret) {
        tokenHeaders.Authorization = `Basic ${Buffer.from(`${xClientId}:${xClientSecret}`).toString("base64")}`;
      }
      const tokenBody = new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: xRedirectUri,
        code_verifier: stored.codeVerifier,
        client_id: xClientId,
      });
      const tokenRes = await fetch("https://api.twitter.com/2/oauth2/token", {
        method: "POST",
        headers: tokenHeaders,
        body: tokenBody,
      });
      const token = await tokenRes.json();
      if (!tokenRes.ok) throw new Error(token.error_description || token.error || "X token exchange failed");

      const userRes = await fetch("https://api.twitter.com/2/users/me?user.fields=username,name,profile_image_url", {
        headers: { Authorization: `Bearer ${token.access_token}` },
      });
      const user = await userRes.json();
      if (!userRes.ok || !user.data?.username) throw new Error(user.detail || "X profile lookup failed");

      const handle = normalizeHandle(user.data.username);
      const sessionId = base64Url(randomBytes(32));
      xSessions.set(sessionId, {
        handle,
        displayName: `@${handle}`,
        name: user.data.name || "",
        xUserId: user.data.id,
        avatarUrl: user.data.profile_image_url || "",
        connectedAt: new Date().toISOString(),
      });
      redirect(res, "/index.html?x=connected", {
        "Set-Cookie": `hp_x_session=${encodeURIComponent(sessionId)}; Path=/; HttpOnly; SameSite=Lax`,
      });
    } catch (error) {
      redirect(res, `/index.html?x_error=${encodeURIComponent(error instanceof Error ? error.message : "x_oauth_failed")}`);
    }
    return true;
  }

  if (req.method === "GET" && url.pathname === "/api/auth/x/session") {
    const session = currentXSession(req);
    if (!session) {
      send(res, 200, { connected: false });
      return true;
    }
    send(res, 200, { connected: true, profile: session });
    return true;
  }

  if (req.method === "GET" && url.pathname === "/api/state") {
    const state = await readState();
    send(res, 200, state);
    return true;
  }

  if (req.method === "POST" && url.pathname === "/api/x/connect") {
    const session = currentXSession(req);
    if (!session) {
      sendOAuthRequired(res);
      return true;
    }
    send(res, 200, session);
    return true;
  }

  if (req.method === "POST" && url.pathname === "/api/dashboard") {
    const body = await readBody(req);
    const handle = normalizeHandle(body.handle);
    const session = currentXSession(req);
    if (!session || session.handle !== handle) {
      send(res, 403, { error: "Complete X OAuth before profile registration." });
      return true;
    }
    const xUserId = session.xUserId;
    if (!xUserId) {
      send(res, 400, { error: "Enter a valid X handle." });
      return true;
    }
    const walletAddress = String(body.walletAddress || "").trim();
    if (!isEvmAddress(walletAddress)) {
      send(res, 400, { error: "Enter a valid Arc EVM wallet address." });
      return true;
    }
    const state = await readState();
    state.dashboard = {
      handle,
      displayName: `@${handle}`,
      walletAddress,
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
    if (!isEvmAddress(walletAddress)) {
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
