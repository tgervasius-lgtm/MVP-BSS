import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { mapImportSource, type SourceMapping } from "../../src/imports/source-mapping.js";
import { parseImportFile, TABULAR_VERSION, type ParsedTable } from "../../src/imports/tabular-parser.js";

const department = randomUUID(), shift = randomUUID();
const source = (): ParsedTable => ({ version: TABULAR_VERSION, fileChecksum: "a".repeat(64),
  headers: ["Šifra", "Ime", "Odjel", "Smjena", "Godišnji", "Email"],
  rows: [["000001", "Synthetic Worker", "Office", "Day", "0", "SYNTHETIC@example.invalid"]] });
const mapping = (): SourceMapping => ({ columns: ["code", "name", "department", "shift", "annualLeaveAllowance", "email"],
  departments: [{ source: "Office", id: department }], shifts: [{ source: "Day", id: shift }] });

test("explicit mapping preserves lexical codes, zero allowance and normalized email", () => {
  const result = mapImportSource(source(), mapping());
  assert.deepEqual(result.issues, []);
  assert.deepEqual(result.canonicalRows, [{ code: "000001", name: "Synthetic Worker", departmentId: department,
    shiftId: shift, annualLeaveAllowance: 0, email: "synthetic@example.invalid" }]);
  const five = source(); five.headers.pop(); five.rows[0]!.pop();
  const m = mapping(); m.columns.pop();
  assert.equal(mapImportSource(five, m).canonicalRows?.[0]?.email, null);
});

test("mapping is total: reject extra/missing/duplicate/forged columns and bindings", () => {
  for (const m of [
    { ...mapping(), columns: ["code", "name", "department", "shift", "email", "email"] },
    { ...mapping(), columns: [...mapping().columns, "password"] },
    { ...mapping(), departments: [{ source: "absent", id: department }] },
    { ...mapping(), departments: [{ source: "Office", id: "bad" }] },
    { ...mapping(), departments: [...mapping().departments, ...mapping().departments] },
    { ...mapping(), organizationId: randomUUID() }
  ]) assert.throws(() => mapImportSource(source(), m as SourceMapping), { code: "VALIDATION_FAILED" });
});

test("numeric IDs, missing allowance and unmapped refs block the whole batch without guessing", () => {
  for (const [column, value] of [[0, 1], [4, ""], [4, "01"], [4, 367], [2, "missing"], [5, 22]] as const) {
    const s = source(); s.rows.push([...s.rows[0]!]); s.rows[1]![column] = value;
    const result = mapImportSource(s, mapping());
    assert.equal(result.canonicalRows, null);
    assert.ok(result.issues.length > 0);
    assert.ok(result.issues.every(issue => issue.rowNumber === 3));
    assert.ok(result.issues.every(issue => !JSON.stringify(issue).includes("example.invalid")));
  }
  assert.equal(mapImportSource(source(), { ...mapping(), departments: [] }).canonicalRows, null);
});

test("mapping fingerprint binds source content, headers and reviewed target IDs", () => {
  const baseline = mapImportSource(source(), mapping()).mappingChecksum;
  const changed = source(); changed.headers[0] = "Worker code";
  assert.notEqual(mapImportSource(changed, mapping()).mappingChecksum, baseline);
  assert.notEqual(mapImportSource(source(), { ...mapping(), departments: [{ source: "Office", id: randomUUID() }] }).mappingChecksum, baseline);
  const s = source(); s.rows[0]![0] = "000002";
  assert.notEqual(mapImportSource(s, mapping()).mappingChecksum, baseline);
});

test("mapping identity ignores property and binding insertion order, including accented labels", () => {
  const s = source();
  s.rows[0]![2] = "Željeni odjel";
  s.rows.push(["000002", "Second Worker", "Alpha", "Day", 20, ""]);
  const m = mapping();
  m.departments = [{ source: "Željeni odjel", id: department }, { source: "Alpha", id: randomUUID() }];
  const baseline = mapImportSource(s, m);
  const reordered: SourceMapping = { shifts: m.shifts, departments: [...m.departments].reverse().map(
    ({ source: label, id }) => ({ id, source: label })), columns: m.columns };
  assert.deepEqual(baseline.issues, []);
  assert.deepEqual(mapImportSource(s, reordered), baseline);
  const inherited = Object.assign(Object.create({ shifts: m.shifts }), {
    columns: m.columns, departments: m.departments, extra: true
  }) as SourceMapping;
  assert.throws(() => mapImportSource(s, inherited), { code: "VALIDATION_FAILED" });
});

test("oversized input and cancellation reject before starting a parser process", async () => {
  await assert.rejects(parseImportFile(Buffer.alloc(1048577), "csv", ","), { kind: "REJECTED", reason: "FILE_LIMIT" });
  await assert.rejects(parseImportFile(Buffer.alloc(0), "xlsx", ","), { kind: "REJECTED" });
  const controller = new AbortController(); controller.abort();
  await assert.rejects(parseImportFile(Buffer.from("synthetic"), "csv", ",", controller.signal), { kind: "CANCELLED" });
});
