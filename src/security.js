import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { getAddress, verifyMessage } from "ethers";

export function randomToken(bytes = 32) {
  return randomBytes(bytes).toString("base64url");
}

export function hashToken(token) {
  return createHash("sha256").update(String(token)).digest("hex");
}

export function hashIp(ip, secret) {
  return createHmac("sha256", secret).update(String(ip || "unknown")).digest("hex");
}

export function normalizeHandle(value) {
  const handle = String(value || "").trim().replace(/^@/, "").toLowerCase();
  return /^[a-z0-9_]{1,15}$/.test(handle) ? handle : null;
}

export function normalizeWallet(value) {
  try {
    return getAddress(String(value || "").trim());
  } catch {
    return null;
  }
}

export function verifyWalletSignature(message, signature, expectedWallet) {
  try {
    return verifyMessage(message, signature).toLowerCase() === expectedWallet.toLowerCase();
  } catch {
    return false;
  }
}

export function safeReturnTo(value) {
  const target = String(value || "/index.html");
  if (!target.startsWith("/") || target.startsWith("//") || /[\\\r\n]/.test(target)) return "/index.html";
  return target;
}

export function constantTimeEqual(left, right) {
  const a = Buffer.from(String(left));
  const b = Buffer.from(String(right));
  return a.length === b.length && timingSafeEqual(a, b);
}

export function walletChallengeMessage({ baseUrl, walletAddress, nonce, issuedAt, expiresAt }) {
  return [
    "HandlePay wallet verification",
    `Domain: ${new URL(baseUrl).host}`,
    `Address: ${walletAddress}`,
    `Nonce: ${nonce}`,
    `Issued At: ${issuedAt.toISOString()}`,
    `Expiration Time: ${expiresAt.toISOString()}`,
    "Purpose: Link this wallet to your HandlePay account. This does not send a transaction.",
  ].join("\n");
}
