import assert from "node:assert/strict";
import test from "node:test";
import { decodeTimelineCursor, decodeUuidCursor, encodeTimelineCursor, encodeUuidCursor } from "../../src/services/cursors.js";

const id = "11111111-1111-4111-8111-111111111111";

test("opaque UUID cursors round-trip and reject arbitrary input", () => {
  assert.equal(decodeUuidCursor(encodeUuidCursor(id)), id);
  assert.throws(() => decodeUuidCursor(Buffer.from("not-a-uuid").toString("base64url")), (error: unknown) => (
    typeof error === "object" && error !== null && "code" in error && error.code === "VALIDATION_FAILED"
  ));
});

test("timeline cursor uses one envelope and accepts the previous terminal envelope", () => {
  const at = "2026-07-17T10:00:00.000Z";
  assert.deepEqual(decodeTimelineCursor(encodeTimelineCursor(at, id)), { at, id });
  const previous = Buffer.from(JSON.stringify({ receivedAt: at, id }), "utf8").toString("base64url");
  assert.deepEqual(decodeTimelineCursor(previous), { at, id });
  assert.throws(() => decodeTimelineCursor(Buffer.from("{}").toString("base64url")));
});
