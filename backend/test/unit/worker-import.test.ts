import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import type pg from "pg";
import type { ActorContext } from "../../src/domain/types.js";
import { normalizeInput, normalizeRows } from "../../src/imports/model.js";
import { PgWorkerImportStore } from "../../src/imports/pg-worker-import-store.js";

const row = { code: "000001", name: "Synthetic Worker", email: null,
  departmentId: randomUUID(), shiftId: randomUUID(), annualLeaveAllowance: 0 };

test("import canonical boundary preserves text identifiers and explicit zero allowance", () => {
  assert.deepEqual(normalizeRows([{ ...row, code: " 000001 ", name: " Synthetic Worker ", email: " TEST@EXAMPLE.INVALID " }]),
    [{ ...row, email: "test@example.invalid" }]);
  assert.equal(normalizeRows([{ ...row, annualLeaveAllowance: 366 }])[0]?.annualLeaveAllowance, 366);
  assert.equal(normalizeRows(Array.from({ length: 1000 }, () => row)).length, 1000);
});

test("import canonical boundary rejects implicit defaults, extra PII and malformed fields", () => {
  for (const change of [
    { code: 1 }, { code: "" }, { code: "x".repeat(41) }, { name: "a" }, { name: "x".repeat(161) },
    { name: "a\0b" }, { email: "invalid" }, { departmentId: randomUUID().replaceAll("-", "") },
    { shiftId: "outside" }, { annualLeaveAllowance: undefined }, { annualLeaveAllowance: "20" },
    { annualLeaveAllowance: -1 }, { annualLeaveAllowance: 367 }, { annualLeaveAllowance: 2.5 },
    { password: "not-accepted" }, { organizationId: randomUUID() }, { history: [] }
  ]) assert.throws(() => normalizeRows([{ ...row, ...change }]), { code: "VALIDATION_FAILED" });
  assert.throws(() => normalizeRows([]), { code: "VALIDATION_FAILED" });
  assert.throws(() => normalizeRows(Array.from({ length: 1001 }, () => row)), { code: "VALIDATION_FAILED" });
  assert.throws(() => normalizeInput({ fileChecksum: "bad", parserVersion: "test", rows: [row] }), { code: "VALIDATION_FAILED" });
  assert.throws(() => normalizeInput({ fileChecksum: "a".repeat(64), parserVersion: "../file", rows: [row] }), { code: "VALIDATION_FAILED" });
});

test("every import store entry denies non-Admin roles before opening a database connection", async () => {
  const pool = { connect: () => assert.fail("Unauthorized request opened DB connection") } as unknown as pg.Pool;
  const store = new PgWorkerImportStore(pool);
  for (const role of ["manager", "worker", "accountant"] as const) {
    const actor: ActorContext = { organizationId: randomUUID(), userId: randomUUID(), role,
      departmentIds: [], selfWorkerId: null, sessionId: randomUUID() };
    const id = randomUUID();
    for (const action of [
      () => store.prepare(actor, { fileChecksum: "a".repeat(64), parserVersion: "test-v1", rows: [row] }, "create-key", "test"),
      () => store.get(actor, id, "test"), () => store.preview(actor, id, "1", 0, 10, "test"),
      () => store.replace(actor, id, "1", [row], "test"),
      () => store.commit(actor, id, "1", { approved: true, previewChecksum: "b".repeat(64) }, "commit-key", "test"),
      () => store.cancel(actor, id, "1", "test"), () => store.cleanupTenant(actor, "test")
    ]) await assert.rejects(action, { code: "FORBIDDEN" });
  }
});
