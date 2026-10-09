import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { digest, IMPORT_POLICY } from "../../src/imports/model.js";
import { PgImportSourceStore } from "../../src/imports/pg-import-source-store.js";
import type { SourceMapping } from "../../src/imports/source-mapping.js";
import { TABULAR_VERSION, type ParsedTable } from "../../src/imports/tabular-parser.js";
import { importFixture } from "./import-fixture.js";

export async function importSourceFixture(url: string) {
  const f = await importFixture(url);
  const sourceStore = new PgImportSourceStore(f.appPool);
  const mapping: SourceMapping = { columns: ["code", "name", "department", "shift", "annualLeaveAllowance"],
    departments: [{ source: "Department", id: f.first.department }], shifts: [{ source: "Day", id: f.first.shift }] };
  function source(code = "001", count = 1): ParsedTable {
    const rows = Array.from({ length: count }, (_, i) => [`${code}-${i}`, "Synthetic Person", "Department", "Day", "0"]);
    return { version: TABULAR_VERSION, fileChecksum: digest(rows), headers: ["Code", "Name", "Department", "Shift", "Days"], rows };
  }
  async function reserve(table = source(), key = randomUUID()) {
    const result = await sourceStore.reserve(f.first.actor, { fileChecksum: table.fileChecksum, format: "csv", delimiter: ",",
      policyVersion: IMPORT_POLICY.version }, key, "reserve");
    assert.ok(result.lease);
    return { ...result, lease: result.lease, table, key };
  }
  async function parsed(table = source(), key = randomUUID()) {
    const r = await reserve(table, key);
    const session = await sourceStore.publish(f.first.actor, r.session.id, r.session.revision, r.lease, table, "parsed");
    return { ...r, session };
  }
  return { ...f, sourceStore, mapping, source, reserve, parsed };
}
