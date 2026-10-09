import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import type pg from "pg";
import type { ActorContext } from "../../src/domain/types.js";
import { PgImportSourceStore } from "../../src/imports/pg-import-source-store.js";
import { IMPORT_POLICY } from "../../src/imports/model.js";
import { checkedParsedTable, ImportParserError, TABULAR_VERSION, type ParsedTable } from "../../src/imports/tabular-parser.js";

test("parsed persistence boundary rejects malformed output and detaches mutable arrays", () => {
  const source: ParsedTable = { version: TABULAR_VERSION, fileChecksum: "a".repeat(64),
    headers: ["Code", "Name", "Department", "Shift", "Days"], rows: [["001", "Synthetic", "Dept", "Day", "0"]] };
  const copy = checkedParsedTable(source);
  source.rows[0]![0] = "changed";
  assert.equal(copy.rows[0]?.[0], "001");
  for (const invalid of [
    { ...source, extra: "unrecognized" }, { ...source, fileChecksum: "invalid" },
    { ...source, rows: [["=1+1", "Synthetic", "Dept", "Day", "0"]] },
    { ...source, rows: [["001"]] }, { ...source, headers: ["A", "A", "B", "C", "D"] }
  ]) assert.throws(() => checkedParsedTable(invalid), ImportParserError);
});

test("all source lifecycle entries authorize Admin before touching the database", async () => {
  const pool = { connect: () => assert.fail("Unauthorized source access opened a DB connection") } as unknown as pg.Pool;
  const store = new PgImportSourceStore(pool);
  const source: ParsedTable = { version: TABULAR_VERSION, fileChecksum: "b".repeat(64),
    headers: ["A", "B", "C", "D", "E"], rows: [["001", "Synthetic", "Dept", "Day", "0"]] };
  for (const role of ["manager", "accountant", "worker"] as const) {
    const actor: ActorContext = { organizationId: randomUUID(), userId: randomUUID(), role,
      departmentIds: [], selfWorkerId: null, sessionId: randomUUID() };
    const id = randomUUID();
    for (const action of [
      () => store.reserve(actor, { fileChecksum: source.fileChecksum, format: "csv", delimiter: ",", policyVersion: IMPORT_POLICY.version }, "create-key", "test"),
      () => store.publish(actor, id, "1", id, source, "test"),
      () => store.fail(actor, id, "1", id, "test"),
      () => store.map(actor, id, "1", { columns: [], departments: [], shifts: [] }, "test"),
      () => store.source(actor, id, "1", 0, 100, "test")
    ]) await assert.rejects(action, { code: "FORBIDDEN" });
  }
});
