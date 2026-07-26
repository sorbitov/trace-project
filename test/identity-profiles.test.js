import test from "node:test";
import assert from "node:assert/strict";
import { identityProfiles } from "../app/identity-profiles.js";

test("social graph contains at least 100 unique valid X handles", () => {
  const handles = identityProfiles.map(({ handle }) => handle.toLowerCase());
  assert.ok(identityProfiles.length >= 100);
  assert.equal(new Set(handles).size, identityProfiles.length);
  identityProfiles.forEach(({ handle, name, group }) => {
    assert.match(handle, /^[A-Za-z0-9_]{1,15}$/);
    assert.ok(name.trim());
    assert.ok(group.trim());
  });
});

test("Base ecosystem has a substantial dedicated cohort", () => {
  assert.ok(identityProfiles.filter(({ base }) => base).length >= 30);
});
