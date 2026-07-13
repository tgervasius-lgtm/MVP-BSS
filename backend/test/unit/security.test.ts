import assert from "node:assert/strict";
import test from "node:test";
import { hashPassword, verifyPassword } from "../../src/security/passwords.js";
import { createOpaqueToken, hashToken, tokenHashMatches } from "../../src/security/tokens.js";

test("opaque session tokens are random and stored only as SHA-256 hashes", () => {
  const first = createOpaqueToken();
  const second = createOpaqueToken();
  assert.notEqual(first, second);
  assert.equal(Buffer.from(first, "base64url").length, 32);
  const digest = hashToken(first);
  assert.equal(digest.length, 32);
  assert.equal(tokenHashMatches(first, digest), true);
  assert.equal(tokenHashMatches(second, digest), false);
});

test("passwords use Argon2id and reject an incorrect password", async () => {
  const digest = await hashPassword("A-correct-long-password-2026!");
  assert.match(digest, /^\$argon2id\$/);
  assert.equal(await verifyPassword(digest, "A-correct-long-password-2026!"), true);
  assert.equal(await verifyPassword(digest, "A-wrong-long-password-2026!"), false);
});
