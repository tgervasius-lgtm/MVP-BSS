import { assertId, digest, normalizeRows, type ImportIssue, type ImportWorker } from "./model.js";
import type { ParsedTable, SourceCell } from "./tabular-parser.js";
import { AppError } from "../domain/errors.js";

const FIELDS = ["code", "name", "email", "department", "shift", "annualLeaveAllowance"] as const;
export type ImportField = typeof FIELDS[number];
export type ReferenceBinding = { source: string; id: string };
export type SourceMapping = { columns: ImportField[]; departments: ReferenceBinding[]; shifts: ReferenceBinding[] };
const invalid = (): never => { throw new AppError("VALIDATION_FAILED", "Povežite svaki stupac i svaku vrijednost odjela/smjene točno jednom."); };

function bindings(input: ReferenceBinding[], cells: SourceCell[]): Map<string, string> {
  if (!Array.isArray(input) || input.length > 1000) invalid();
  const present = new Set(cells.filter((x): x is string => typeof x === "string").map(x => x.trim()).filter(Boolean));
  const result = new Map<string, string>();
  for (const item of input) {
    if (!item || typeof item.source !== "string" || item.source !== item.source.trim()
      || Object.keys(item).length !== 2 || !Object.hasOwn(item, "id") || !Object.hasOwn(item, "source")
      || !present.has(item.source) || result.has(item.source)) invalid();
    assertId(item.id); result.set(item.source, item.id.toLowerCase());
  }
  // Missing bindings become row errors (the Admin can repair the mapping).
  // Every supplied ID is rechecked by the existing store under tenant RLS.
  return result;
}

function validAllowance(value: unknown): boolean {
  if (typeof value === "number") return Number.isInteger(value) && value >= 0 && value <= 366;
  return typeof value === "string" && /^(?:0|[1-9]\d{0,2})$/.test(value) && Number(value) <= 366;
}

// Checksums need a stable code-unit order, independent of the host's locale.
function orderedBindings(map: Map<string, string>): [string, string][] {
  return [...map.entries()].sort(([a], [b]) => {
    if (a === b) return 0;
    return a < b ? -1 : 1;
  });
}

/** Pure normalization boundary; never looks up names globally or creates refs.
 * Persist source + mapping and bind mappingChecksum into the public session's
 * identity before any future route may call the canonical store.
 */
export function mapImportSource(source: ParsedTable, mapping: SourceMapping): {
  canonicalRows: ImportWorker[] | null; issues: ImportIssue[]; mappingChecksum: string;
} {
  if (!mapping || !Array.isArray(mapping.columns) || mapping.columns.length !== source.headers.length
    || Object.keys(mapping).length !== 3 || !["columns", "departments", "shifts"].every(key => Object.hasOwn(mapping, key))
    || mapping.columns.some(x => !FIELDS.includes(x)) || new Set(mapping.columns).size !== mapping.columns.length
    || FIELDS.filter(x => x !== "email").some(x => !mapping.columns.includes(x))) invalid();
  const departmentIndex = mapping.columns.indexOf("department");
  const shiftIndex = mapping.columns.indexOf("shift");
  const departments = bindings(mapping.departments, source.rows.map(row => row[departmentIndex]!));
  const shifts = bindings(mapping.shifts, source.rows.map(row => row[shiftIndex]!));
  const issues: ImportIssue[] = [];
  const rows: ImportWorker[] = [];
  source.rows.forEach((row, index) => {
    const value = Object.fromEntries(mapping.columns.map((field, i) => [field, row[i]]));
    const issue = (field: string, code: string) => issues.push({ rowNumber: index + 2, field, code });
    const before = issues.length;
    for (const field of ["code", "name", "department", "shift"] as const)
      if (typeof value[field] !== "string" || !(value[field] as string).trim()) issue(field, "TEXT_REQUIRED");
    if (value.email !== undefined && typeof value.email !== "string") issue("email", "TEXT_REQUIRED");
    const allowance = typeof value.annualLeaveAllowance === "string" ? value.annualLeaveAllowance.trim() : value.annualLeaveAllowance;
    if (!validAllowance(allowance))
      issue("annualLeaveAllowance", "EXPLICIT_ALLOWANCE_REQUIRED");
    const departmentId = typeof value.department === "string" ? departments.get(value.department.trim()) : undefined;
    const shiftId = typeof value.shift === "string" ? shifts.get(value.shift.trim()) : undefined;
    if (!departmentId) issue("department", "REFERENCE_MAPPING_REQUIRED");
    if (!shiftId) issue("shift", "REFERENCE_MAPPING_REQUIRED");
    if (issues.length !== before) return;
    try {
      rows.push(normalizeRows([{ code: value.code, name: value.name, email: value.email ?? null,
        departmentId, shiftId, annualLeaveAllowance: Number(allowance) }])[0]!);
    } catch { issue("row", "INVALID_WORKER_FIELDS"); }
  });
  const mappingChecksum = digest({ parserVersion: source.version, fileChecksum: source.fileChecksum,
    headers: source.headers, rows: source.rows, columns: mapping.columns,
    departments: orderedBindings(departments), shifts: orderedBindings(shifts) });
  return { canonicalRows: issues.length ? null : rows, issues, mappingChecksum };
}
