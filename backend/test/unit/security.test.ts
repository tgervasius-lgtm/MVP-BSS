import assert from "node:assert/strict";
import test from "node:test";
import { canonicalDeviceRequest, signDeviceRequest, verifyDeviceSignature } from "../../src/security/device-signature.js";
import { hashPassword, verifyPassword } from "../../src/security/passwords.js";
import { hashRfidUid, maskRfidUid, normalizeRfidUid } from "../../src/security/rfid.js";
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

test("RFID UIDs are normalized, masked and keyed-hashed without retaining raw values", () => {
  assert.equal(normalizeRfidUid("04:A1-b2 c3"), "04A1B2C3");
  assert.equal(maskRfidUid("04:A1-b2 c3"), "****B2C3");
  const first = hashRfidUid("04:A1-b2 c3", "pepper-one");
  const same = hashRfidUid("04A1B2C3", "pepper-one");
  const rotated = hashRfidUid("04A1B2C3", "pepper-two");
  assert.equal(first.equals(same), true);
  assert.equal(first.equals(rotated), false);
  assert.throws(() => normalizeRfidUid("not-a-card"));
});

test("terminal HMAC v1 signs the locked canonical request and rejects replay-window drift", () => {
  const request = {
    method: "post",
    path: "/api/v1/terminal/v1/events/batch",
    body: '{"events":[]}',
    timestamp: "2026-07-13T12:00:00.000Z",
    nonce: "MDEyMzQ1Njc4OWFiY2RlZg"
  };
  assert.equal(
    canonicalDeviceRequest(request),
    "POST\n/api/v1/terminal/v1/events/batch\n24de1c4a19c43ad41b013f13dcd858c17b0daa7f33a53f19913e5b11366d1c2e\n2026-07-13T12:00:00.000Z\nMDEyMzQ1Njc4OWFiY2RlZg"
  );
  const signature = signDeviceRequest("terminal-secret", request);
  assert.equal(signature, "44fb5608b1e09fc82f1707fe266acf94dc92893a97c45aea4e3f12483c2ef2c4");
  assert.equal(verifyDeviceSignature("terminal-secret", request, signature, new Date("2026-07-13T12:04:59.000Z")), true);
  assert.equal(verifyDeviceSignature("terminal-secret", request, signature, new Date("2026-07-13T12:05:01.000Z")), false);
  assert.equal(verifyDeviceSignature("other-secret", request, signature, new Date("2026-07-13T12:00:00.000Z")), false);
});
