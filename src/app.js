import { createHash, randomUUID } from "node:crypto";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import cookieParser from "cookie-parser";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { formatUnits } from "ethers";
import { config } from "./config.js";
import { createAvatarProxy } from "./avatars.js";
import {
  chainConfigured,
  claimAuthorization,
  fundingTransactions,
  identityHash,
  parseAmountUnits,
  settlementTransaction,
  verifyFundingTransaction,
  verifySettlementTransaction,
} from "./chain.js";
import {
  hashIp,
  hashToken,
  normalizeHandle,
  normalizeWallet,
  randomToken,
  safeReturnTo,
  verifyWalletSignature,
  walletChallengeMessage,
} from "./security.js";
import {
  exchangeOAuthCode,
  getAuthenticatedXUser,
  resolveXUser,
  xLookupConfigured,
  xOAuthConfigured,
} from "./x-client.js";

const appRoot = join(fileURLToPath(new URL("..", import.meta.url)), "app");
const docsRoot = join(fileURLToPath(new URL("..", import.meta.url)), "docs");
const publicProjectDocs = new Map([
  ["hackathon-submission", "hackathon-submission.md"],
  ["executive-summary", "executive-summary.md"],
  ["grant-application", "grant-application.md"],
  ["budget-and-milestones", "budget-and-milestones.md"],
  ["pilot-and-impact", "pilot-and-impact.md"],
  ["project-status", "project-status.md"],
  ["architecture", "architecture.md"],
  ["security", "security.md"],
  ["internal-security-review", "internal-security-review.md"],
  ["roadmap", "roadmap.md"],
  ["demo-guide", "demo-guide.md"],
  ["submission-checklist", "submission-checklist.md"],
  ["deployment", "deployment.md"],
]);
const sessionCookie = "hp_session";

function httpError(status, message) {
  return Object.assign(new Error(message), { status });
}

function paymentView(payment, viewer = {}) {
  const sender = viewer.profileId && viewer.profileId === payment.sender_profile_id;
  const recipient = viewer.xUserId && viewer.xUserId === payment.recipient_x_user_id;
  const revealed = sender || recipient;
  const amount = formatUnits(BigInt(payment.amount_units), 6);
  const amountVisible = payment.amount_visibility === "public" || revealed;
  const senderVisible = payment.sender_visibility === "public" || revealed;
  return {
    id: payment.id,
    handle: payment.recipient_handle,
    status: payment.status,
    amount: amountVisible ? Number(amount) : null,
    amountLabel: amountVisible ? `${Number(amount).toFixed(2)} USDC` : "USDC amount hidden",
    sender: senderVisible ? `@${payment.sender_handle}` : null,
    senderLabel: senderVisible ? `@${payment.sender_handle}` : "Sender hidden",
    memo: revealed ? payment.memo : null,
    memoLabel: revealed ? payment.memo || "No private memo." : "Private memo unlocks after X OAuth.",
    feePct: sender ? payment.fee_bps / 100 : null,
    expiryDays: payment.expiry_days,
    cancelMode: sender ? payment.cancel_mode : null,
    claimUrl: `${config.baseUrl}/index.html#claim=${encodeURIComponent(payment.id)}`,
    shareText: sender ? `@${payment.recipient_handle} you have ${Number(amount)} USDC waiting on Arc. Claim with X: ${config.baseUrl}/index.html#claim=${payment.id}` : null,
    expiresAt: payment.expires_at,
    createdAt: payment.created_at,
    onchainPaymentId: payment.onchain_payment_id ? String(payment.onchain_payment_id) : null,
    fundTxHash: sender ? payment.fund_tx_hash : null,
    settlementTxHash: revealed ? payment.settlement_tx_hash : null,
    claimWallet: recipient ? payment.claim_wallet : null,
    isSender: Boolean(sender),
    isRecipient: Boolean(recipient),
    canClaim: Boolean(recipient && payment.status === "pending"),
    canCancel: Boolean(sender && payment.status === "pending" && payment.cancel_mode === "cancellable"),
    canRefund: Boolean(sender && ["pending", "expired"].includes(payment.status) && new Date(payment.expires_at) < new Date()),
  };
}

function profileCanSend(profile) {
  return Boolean(profile?.walletAddress && profile?.xUserId && profile?.handle);
}

export function createApp(db) {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", 1);
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
        imgSrc: ["'self'", "data:"],
        connectSrc: ["'self'", config.arc.rpcUrl],
      },
    },
  }));
  app.use(express.json({ limit: "32kb" }));
  app.use(cookieParser());
  app.use((req, res, next) => {
    req.requestId = randomUUID();
    res.setHeader("X-Request-Id", req.requestId);
    next();
  });

  const authLimiter = rateLimit({ windowMs: 10 * 60_000, limit: 30, standardHeaders: "draft-8", legacyHeaders: false });
  const mutationLimiter = rateLimit({ windowMs: 60_000, limit: 60, standardHeaders: "draft-8", legacyHeaders: false });
  app.use("/api/auth", authLimiter);
  app.use("/api/payments", mutationLimiter);

  app.use("/api", async (req, res, next) => {
    try {
      let rawToken = req.cookies[sessionCookie];
      let tokenHash = rawToken ? hashToken(rawToken) : null;
      let session = tokenHash ? await db.getSession(tokenHash) : null;
      if (!session) {
        rawToken = randomToken();
        tokenHash = hashToken(rawToken);
        const expiresAt = new Date(Date.now() + config.sessionDays * 86_400_000);
        await db.createSession(tokenHash, expiresAt);
        session = await db.getSession(tokenHash);
        res.cookie(sessionCookie, rawToken, {
          httpOnly: true,
          sameSite: "lax",
          secure: config.production,
          maxAge: config.sessionDays * 86_400_000,
          path: "/",
        });
      }
      req.session = session;
      req.sessionTokenHash = tokenHash;
      next();
    } catch (error) { next(error); }
  });

  app.get("/api/health", async (req, res) => {
    res.json({ ok: await db.health(), chainConfigured: chainConfigured(), xOAuthConfigured: xOAuthConfigured(), xLookupConfigured: xLookupConfigured() });
  });

  app.get("/api/config", (req, res) => {
    res.json({
      chain: {
        id: config.arc.chainId,
        hexId: `0x${config.arc.chainId.toString(16)}`,
        name: "Arc Testnet",
        rpcUrl: config.arc.rpcUrl,
        explorerUrl: config.arc.explorerUrl,
        nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
        usdcAddress: config.arc.usdcAddress,
        escrowAddress: config.arc.escrowAddress,
      },
      integrations: { chain: chainConfigured(), xOAuth: xOAuthConfigured(), xLookup: xLookupConfigured() },
    });
  });

  app.get("/api/auth/x/start", async (req, res, next) => {
    try {
      if (!xOAuthConfigured()) {
        const target = new URL(safeReturnTo(req.query.return_to), config.baseUrl);
        target.searchParams.set("x_error", "missing_x_oauth_config");
        return res.redirect(`${target.pathname}${target.search}${target.hash}`);
      }
      const state = randomToken(24);
      const codeVerifier = randomToken(48);
      const codeChallenge = createHash("sha256").update(codeVerifier).digest("base64url");
      await db.saveOAuthState({
        state,
        codeVerifier,
        sessionTokenHash: req.sessionTokenHash,
        returnTo: safeReturnTo(req.query.return_to),
        expiresAt: new Date(Date.now() + 10 * 60_000),
      });
      const url = new URL("https://x.com/i/oauth2/authorize");
      url.search = new URLSearchParams({
        response_type: "code",
        client_id: config.x.clientId,
        redirect_uri: config.x.redirectUri,
        scope: "users.read tweet.read",
        state,
        code_challenge: codeChallenge,
        code_challenge_method: "S256",
      });
      res.redirect(url.toString());
    } catch (error) { next(error); }
  });

  app.get("/api/auth/x/callback", async (req, res) => {
    const oauth = req.query.state ? await db.consumeOAuthState(String(req.query.state)) : null;
    if (!oauth || !req.query.code || oauth.session_token_hash !== req.sessionTokenHash) {
      return res.redirect("/index.html?x_error=invalid_x_oauth_state");
    }
    try {
      const token = await exchangeOAuthCode({ code: String(req.query.code), codeVerifier: oauth.code_verifier });
      const identity = await getAuthenticatedXUser(token);
      const profile = await db.attachXIdentity(req.sessionTokenHash, identity);
      await db.audit({ requestId: req.requestId, profileId: profile.id, action: "x_oauth_verified", ipHash: hashIp(req.ip, config.sessionSecret) });
      const target = new URL(oauth.return_to, config.baseUrl);
      return res.redirect(`${target.pathname}${target.search}${target.hash}`);
    } catch (error) {
      console.error(`[${req.requestId}] X OAuth callback failed:`, error.message);
      return res.redirect("/index.html?x_error=x_oauth_failed");
    }
  });

  app.get("/api/auth/x/session", async (req, res) => {
    const profile = await db.getProfile(req.session.profile_id);
    res.json({
      connected: Boolean(req.session.x_user_id),
      profile: req.session.x_user_id ? {
        handle: profile?.handle,
        displayName: profile?.displayName,
        xUserId: req.session.x_user_id,
        connectedAt: req.session.x_verified_at,
      } : null,
    });
  });

  app.post("/api/auth/wallet/challenge", async (req, res, next) => {
    try {
      const walletAddress = normalizeWallet(req.body.walletAddress);
      if (!walletAddress) throw httpError(400, "Enter a valid EVM wallet address.");
      const nonce = randomToken(24);
      const issuedAt = new Date();
      const expiresAt = new Date(Date.now() + 5 * 60_000);
      const message = walletChallengeMessage({ baseUrl: config.baseUrl, walletAddress, nonce, issuedAt, expiresAt });
      await db.createWalletChallenge({
        nonceHash: hashToken(nonce), sessionTokenHash: req.sessionTokenHash, walletAddress, message, expiresAt,
      });
      res.json({ nonce, message, expiresAt });
    } catch (error) { next(error); }
  });

  app.post("/api/auth/wallet/verify", async (req, res, next) => {
    try {
      const challenge = await db.consumeWalletChallenge(hashToken(req.body.nonce), req.sessionTokenHash);
      if (!challenge || !verifyWalletSignature(challenge.message, req.body.signature, challenge.wallet_address)) {
        throw httpError(401, "Wallet signature is invalid or expired.");
      }
      const profile = await db.attachWallet(req.sessionTokenHash, challenge.wallet_address);
      await db.audit({ requestId: req.requestId, profileId: profile.id, action: "wallet_verified", ipHash: hashIp(req.ip, config.sessionSecret), metadata: { wallet: challenge.wallet_address } });
      res.json({ profile });
    } catch (error) { next(error); }
  });

  app.get("/api/state", async (req, res) => {
    await db.expirePending();
    const profile = await db.getProfile(req.session.profile_id);
    const payments = await db.listPayments(req.session.profile_id, req.session.x_user_id);
    res.json({
      dashboard: profile,
      payments: payments.map((item) => paymentView(item, { profileId: req.session.profile_id, xUserId: req.session.x_user_id })),
    });
  });

  app.get("/api/payments/:id", async (req, res, next) => {
    try {
      const payment = await db.getPayment(req.params.id);
      if (!payment) throw httpError(404, "Payment not found.");
      res.json({ payment: paymentView(payment, { profileId: req.session.profile_id, xUserId: req.session.x_user_id }) });
    } catch (error) { next(error); }
  });

  app.post("/api/payments", async (req, res, next) => {
    try {
      const profile = await db.getProfile(req.session.profile_id);
      if (!profileCanSend(profile)) throw httpError(403, "Verified X and wallet identities are required to send.");
      if (!chainConfigured()) throw httpError(503, "Escrow contract is not deployed/configured.");
      const recipient = await resolveXUser(req.body.handle);
      const amountUnits = parseAmountUnits(req.body.amount);
      const requestedExpiryDays = Number(req.body.expiryDays ?? 30);
      const requestedFeePct = Number(req.body.feePct ?? 0.5);
      if (!Number.isFinite(requestedExpiryDays) || !Number.isFinite(requestedFeePct)) {
        throw httpError(400, "Expiry and fee must be valid numbers.");
      }
      const expiryDays = Math.max(1, Math.min(365, Math.round(requestedExpiryDays)));
      const feeBps = Math.max(config.arc.minimumFeeBps, Math.min(1_000, Math.round(requestedFeePct * 100)));
      const payment = await db.createPayment({
        id: `hp_${Date.now().toString(36)}_${randomToken(5).toLowerCase()}`,
        senderProfileId: profile.id,
        recipientXUserId: recipient.id,
        recipientHandle: recipient.handle,
        identityHash: identityHash(recipient.id),
        amountUnits: amountUnits.toString(),
        feeBps,
        expiryDays,
        amountVisibility: req.body.amountVisibility === "public" ? "public" : "private",
        senderVisibility: req.body.senderVisibility === "public" ? "public" : "private",
        cancelMode: req.body.cancelMode === "locked" ? "locked" : "cancellable",
        memo: String(req.body.memo || "").trim().slice(0, 2_000),
        expiresAt: new Date(Date.now() + expiryDays * 86_400_000),
      });
      await db.audit({ requestId: req.requestId, profileId: profile.id, action: "payment_intent_created", targetType: "payment", targetId: payment.id, ipHash: hashIp(req.ip, config.sessionSecret) });
      res.status(201).json({ payment: paymentView({ ...payment, sender_handle: profile.handle, sender_wallet: profile.walletAddress }, { profileId: profile.id }), transactions: fundingTransactions(payment) });
    } catch (error) { next(error); }
  });

  app.post("/api/payments/:id/funding", async (req, res, next) => {
    try {
      const payment = await db.getPayment(req.params.id);
      if (!payment) throw httpError(404, "Payment not found.");
      if (payment.sender_profile_id !== req.session.profile_id) throw httpError(403, "Only the sender can confirm funding.");
      const verified = await verifyFundingTransaction(payment, String(req.body.transactionHash || ""));
      const updated = await db.markFunded(payment.id, { onchainPaymentId: verified.onchainPaymentId, txHash: req.body.transactionHash, fundedAt: verified.fundedAt }) || await db.getPayment(payment.id);
      await db.audit({ requestId: req.requestId, profileId: req.session.profile_id, action: "payment_funded", targetType: "payment", targetId: payment.id, ipHash: hashIp(req.ip, config.sessionSecret), metadata: { txHash: req.body.transactionHash } });
      res.json({ payment: paymentView({ ...payment, ...updated }, { profileId: req.session.profile_id }) });
    } catch (error) { next(error); }
  });

  app.post("/api/payments/:id/claim-authorization", async (req, res, next) => {
    try {
      const payment = await db.getPayment(req.params.id);
      if (!payment) throw httpError(404, "Payment not found.");
      const verifiedAt = req.session.x_verified_at ? new Date(req.session.x_verified_at).getTime() : 0;
      if (req.session.x_user_id !== payment.recipient_x_user_id || Date.now() - verifiedAt > 30 * 60_000) {
        throw httpError(403, "A fresh X OAuth login for the recipient account is required.");
      }
      const profile = await db.getProfile(req.session.profile_id);
      const walletAddress = normalizeWallet(req.body.walletAddress);
      if (!walletAddress || profile?.walletAddress?.toLowerCase() !== walletAddress.toLowerCase()) {
        throw httpError(403, "Verify and link the claiming wallet first.");
      }
      const authorization = await claimAuthorization(payment, walletAddress);
      await db.audit({ requestId: req.requestId, profileId: profile.id, action: "claim_authorization_issued", targetType: "payment", targetId: payment.id, ipHash: hashIp(req.ip, config.sessionSecret), metadata: { walletAddress } });
      res.json(authorization);
    } catch (error) { next(error); }
  });

  app.post(["/api/payments/:id/cancel", "/api/payments/:id/refund"], async (req, res, next) => {
    try {
      const action = req.path.endsWith("/refund") ? "refund" : "cancel";
      const payment = await db.getPayment(req.params.id);
      if (!payment) throw httpError(404, "Payment not found.");
      if (payment.sender_profile_id !== req.session.profile_id) throw httpError(403, "Only the sender can settle this payment.");
      if (action === "cancel" && (payment.cancel_mode !== "cancellable" || payment.status !== "pending")) {
        throw httpError(409, "Payment cannot be cancelled.");
      }
      if (action === "refund" && new Date(payment.expires_at) >= new Date()) {
        throw httpError(409, "Payment has not expired yet.");
      }
      res.json({ transaction: settlementTransaction(payment, action) });
    } catch (error) { next(error); }
  });

  app.post("/api/payments/:id/settlement", async (req, res, next) => {
    try {
      const payment = await db.getPayment(req.params.id);
      if (!payment) throw httpError(404, "Payment not found.");
      const related = payment.sender_profile_id === req.session.profile_id || payment.recipient_x_user_id === req.session.x_user_id;
      if (!related) throw httpError(403, "Not authorized for this payment.");
      const verified = await verifySettlementTransaction(payment, String(req.body.transactionHash || ""));
      const updated = await db.markSettlement(payment.onchain_payment_id, verified.status, req.body.transactionHash, verified.walletAddress, verified.settledAt) || await db.getPayment(payment.id);
      await db.audit({ requestId: req.requestId, profileId: req.session.profile_id, action: `payment_${verified.status}`, targetType: "payment", targetId: payment.id, ipHash: hashIp(req.ip, config.sessionSecret), metadata: { txHash: req.body.transactionHash } });
      res.json({ payment: paymentView({ ...payment, ...updated }, { profileId: req.session.profile_id, xUserId: req.session.x_user_id }) });
    } catch (error) { next(error); }
  });

  for (const path of ["/api/dashboard", "/api/account/wallet", "/api/account/x-login", "/api/account/x-connect", "/api/account/link-x", "/api/x/connect", "/api/payments/:id/verify-x", "/api/payments/:id/claim"]) {
    app.all(path, (req, res) => res.status(410).json({ error: "This prototype endpoint was removed. Use verified auth and onchain routes." }));
  }

  app.get("/avatars/x/:handle", createAvatarProxy());

  app.get("/project-docs/:name", (req, res) => {
    const filename = publicProjectDocs.get(req.params.name);
    if (!filename) return res.status(404).type("text/plain").send("Project document not found.");
    res.type("text/markdown");
    return res.sendFile(join(docsRoot, filename));
  });

  app.use(express.static(appRoot, {
    etag: true,
    maxAge: config.production ? "5m" : 0,
    extensions: ["html"],
    setHeaders(response) {
      if (!config.production) response.setHeader("Cache-Control", "no-store");
    },
  }));
  app.get("/", (req, res) => {
    if (!config.production) res.setHeader("Cache-Control", "no-store");
    return res.sendFile(join(appRoot, "index.html"));
  });

  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    const status = Number(error.status) || (error.code === "23505" ? 409 : 500);
    void db.audit?.({
      requestId: req.requestId,
      profileId: req.session?.profile_id || null,
      action: "request_rejected",
      ipHash: hashIp(req.ip, config.sessionSecret),
      metadata: { method: req.method, path: req.path, status },
    }).catch(() => {});
    if (status >= 500) console.error(`[${req.requestId}]`, error);
    res.status(status).json({ error: status >= 500 && config.production ? "Internal server error" : error.message, requestId: req.requestId });
  });
  return app;
}
