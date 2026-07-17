import assert from "node:assert/strict";
import test from "node:test";
import { normalizeDatabaseError } from "../../src/services/database-errors.js";

test("database errors map expected integrity failures without hiding unknown faults", () => {
  assert.throws(() => normalizeDatabaseError({ code: "23505" }), (error: unknown) =>
    typeof error === "object" && error !== null && "code" in error && error.code === "CONFLICT");
  for (const code of ["23503", "23514", "22P02", "22001", "22003", "22007"]) {
    assert.throws(() => normalizeDatabaseError({ code }), (error: unknown) =>
      typeof error === "object" && error !== null && "code" in error && error.code === "VALIDATION_FAILED");
  }
  const unexpected = new Error("connection lost");
  assert.throws(() => normalizeDatabaseError(unexpected), (error: unknown) => error === unexpected);
});
