import assert from "node:assert/strict";
import test from "node:test";
import { AppError, requireRevision } from "../../src/domain/errors.js";

test("If-Match parser accepts positive bigint ETags and rejects malformed revisions", () => {
  assert.equal(requireRevision('W/"3"'), "3");
  assert.equal(requireRevision('"42"'), "42");
  assert.equal(requireRevision("9223372036854775807"), "9223372036854775807");

  for (const value of [undefined, "", "0", "-1", '"3", "4"', "9223372036854775808", "abc"]) {
    assert.throws(
      () => requireRevision(value),
      (error: unknown) => error instanceof AppError && error.code === "VALIDATION_FAILED"
    );
  }
});
