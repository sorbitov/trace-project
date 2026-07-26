import assert from "node:assert/strict";
import test from "node:test";
import { getIdentityState } from "../app/identity-state.js";

test("identity setup can start with X and still requires a wallet", () => {
  const state = getIdentityState({ xUserId: "x_1", handle: "alice" });
  assert.equal(state.xConnected, true);
  assert.equal(state.walletConnected, false);
  assert.equal(state.missing, "wallet");
  assert.equal(state.nextView, "profile");
});

test("identity setup can start with a wallet and still requires X", () => {
  const state = getIdentityState({ walletAddress: "0x1234" });
  assert.equal(state.xConnected, false);
  assert.equal(state.walletConnected, true);
  assert.equal(state.missing, "x");
  assert.equal(state.nextView, "profile");
});

test("sending unlocks only when X and wallet are joined", () => {
  const state = getIdentityState({ xUserId: "x_1", handle: "alice", walletAddress: "0x1234" });
  assert.equal(state.ready, true);
  assert.equal(state.missing, null);
  assert.equal(state.nextView, "send");
});
