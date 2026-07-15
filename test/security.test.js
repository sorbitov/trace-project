import assert from "node:assert/strict";
import test from "node:test";
import { Wallet } from "ethers";
import {
  hashToken,
  normalizeHandle,
  normalizeWallet,
  safeReturnTo,
  verifyWalletSignature,
  walletChallengeMessage,
} from "../src/security.js";

test("normalizes only valid X handles", () => {
  assert.equal(normalizeHandle(" @Alice_42 "), "alice_42");
  assert.equal(normalizeHandle("bad handle"), null);
  assert.equal(normalizeHandle("a".repeat(16)), null);
});

test("wallet challenge proves address ownership", async () => {
  const wallet = Wallet.createRandom();
  const message = walletChallengeMessage({
    baseUrl: "https://handlepay.app",
    walletAddress: wallet.address,
    nonce: "unique-nonce",
    issuedAt: new Date("2026-01-01T00:00:00Z"),
    expiresAt: new Date("2026-01-01T00:05:00Z"),
  });
  const signature = await wallet.signMessage(message);
  assert.equal(verifyWalletSignature(message, signature, wallet.address), true);
  assert.equal(verifyWalletSignature(`${message}!`, signature, wallet.address), false);
  assert.equal(normalizeWallet(wallet.address.toLowerCase()), wallet.address);
});

test("return paths reject open redirects and tokens are hashed", () => {
  assert.equal(safeReturnTo("/index.html#claim=hp_1"), "/index.html#claim=hp_1");
  assert.equal(safeReturnTo("https://evil.example"), "/index.html");
  assert.equal(safeReturnTo("//evil.example"), "/index.html");
  assert.equal(safeReturnTo("/\\\\evil.example"), "/index.html");
  assert.equal(safeReturnTo("/\\evil.example"), "/index.html");
  assert.equal(hashToken("secret").length, 64);
});
