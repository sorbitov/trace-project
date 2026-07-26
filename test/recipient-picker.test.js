import assert from "node:assert/strict";
import test from "node:test";
import { identityProfiles } from "../app/identity-profiles.js";
import { filterRecipientProfiles, normalizeRecipientHandle, recipientInitials } from "../app/recipient-picker.js";

test("recipient input accepts handles and X profile URLs", () => {
  assert.equal(normalizeRecipientHandle("@BuildOnBase"), "buildonbase");
  assert.equal(normalizeRecipientHandle("https://x.com/jessepollak?ref=home"), "jessepollak");
  assert.equal(normalizeRecipientHandle("twitter.com/VitalikButerin/status/1"), "vitalikbuterin");
  assert.equal(normalizeRecipientHandle("not a handle"), "");
});

test("recipient search prioritizes exact and prefix handle matches", () => {
  const results = filterRecipientProfiles(identityProfiles, { query: "buildonbase" });
  assert.equal(results[0].handle, "buildonbase");
  const partial = filterRecipientProfiles(identityProfiles, { query: "jesse" });
  assert.equal(partial[0].handle.toLowerCase(), "jessepollak");
});

test("recipient filters expose Base, people, projects, recent and saved cohorts", () => {
  assert.ok(filterRecipientProfiles(identityProfiles, { filter: "base" }).every(({ base }) => base));
  assert.ok(filterRecipientProfiles(identityProfiles, { filter: "people" }).every(({ type }) => type === "people"));
  assert.ok(filterRecipientProfiles(identityProfiles, { filter: "projects" }).every(({ type }) => type === "projects"));
  assert.deepEqual(
    filterRecipientProfiles(identityProfiles, { filter: "recent", recent: ["vitalikbuterin", "buildonbase"] }).map(({ handle }) => handle.toLowerCase()),
    ["vitalikbuterin", "buildonbase"],
  );
  assert.deepEqual(
    filterRecipientProfiles(identityProfiles, { filter: "favorites", favorites: ["jessepollak"] }).map(({ handle }) => handle.toLowerCase()),
    ["jessepollak"],
  );
});

test("recipient fallbacks always produce a compact monogram", () => {
  assert.equal(recipientInitials("Brian Armstrong"), "BA");
  assert.equal(recipientInitials("Base"), "B");
  assert.equal(recipientInitials(""), "?");
});
