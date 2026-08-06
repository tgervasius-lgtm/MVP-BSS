import assert from "node:assert/strict";
import test from "node:test";
import { requireBoundedDateRange, requireValidShiftWindow, shiftDurationMinutes } from "../../src/services/validation.js";

test("date range validation rejects invalid dates, reverse order and oversized inclusive spans", () => {
  assert.doesNotThrow(() => requireBoundedDateRange("2024-01-01", "2024-12-31"));
  assert.throws(() => requireBoundedDateRange("2026-02-30", "2026-03-01"));
  assert.throws(() => requireBoundedDateRange("2026-03-02", "2026-03-01"));
  assert.throws(() => requireBoundedDateRange("2024-01-01", "2025-01-01"));
});

test("shift validation handles overnight work and rejects impossible attendance windows", () => {
  assert.equal(shiftDurationMinutes("22:00", "06:00"), 480);
  assert.doesNotThrow(() => requireValidShiftWindow("22:00", "06:00", 30));
  assert.doesNotThrow(() => requireValidShiftWindow("08:00", "16:00", 0));
  assert.throws(() => requireValidShiftWindow("08:00", "08:00", 30));
  assert.throws(() => requireValidShiftWindow("00:00", "17:00", 30));
  assert.throws(() => requireValidShiftWindow("08:00", "09:00", 60));
  assert.throws(() => requireValidShiftWindow("not-a-time", "09:00", 0));
});
