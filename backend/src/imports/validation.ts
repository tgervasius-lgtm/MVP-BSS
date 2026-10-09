import { digest, IMPORT_POLICY, type ImportCounts, type ImportInput, type ImportIssue } from "./model.js";
import type { ImportTransaction } from "./transaction.js";

type Reference = { id: string; status: string; revision: string };
export async function validateImport(tx: ImportTransaction, input: ImportInput, mappingChecksum: string | null = null): Promise<{
  issues: ImportIssue[]; counts: ImportCounts; checksum: string;
}> {
  const departments = await tx.query<Reference>(`SELECT id, status, revision::text FROM departments
    WHERE id = ANY($1::uuid[]) ORDER BY id FOR SHARE`, [[...new Set(input.rows.map((r) => r.departmentId))]]);
  const shifts = await tx.query<Reference>(`SELECT id, status, revision::text FROM shifts
    WHERE id = ANY($1::uuid[]) ORDER BY id FOR SHARE`, [[...new Set(input.rows.map((r) => r.shiftId))]]);
  const issues: ImportIssue[] = [];
  const departmentMap = new Map(departments.rows.map((r) => [r.id, r]));
  const shiftMap = new Map(shifts.rows.map((r) => [r.id, r]));
  input.rows.forEach((row, index) => {
    for (const [field, reference] of [["department", departmentMap.get(row.departmentId)], ["shift", shiftMap.get(row.shiftId)]] as const) {
      if (!reference || reference.status !== "active") issues.push({ rowNumber: index + 2, field,
        code: reference ? "REFERENCE_INACTIVE" : "REFERENCE_MISSING" });
    }
  });
  // PostgreSQL lower() is authoritative for both in-file and existing-record
  // uniqueness. JavaScript case folding must not disagree with the DB indexes.
  const duplicates = await tx.query<{ row_number: number; field: string; issue: string }>(`
    WITH candidate AS (
      SELECT (ordinality + 1)::integer AS row_number, lower(value->>'code') AS code,
        lower(value->>'email') AS email FROM jsonb_array_elements($1::jsonb) WITH ORDINALITY
    ), counted AS (
      SELECT *, count(*) OVER (PARTITION BY code) AS codes,
        count(*) OVER (PARTITION BY email) AS emails FROM candidate
    )
    SELECT row_number, 'code' AS field, 'DUPLICATE_IN_FILE' AS issue FROM counted WHERE codes > 1
    UNION ALL SELECT row_number, 'email', 'DUPLICATE_IN_FILE' FROM counted WHERE email IS NOT NULL AND emails > 1
    UNION ALL SELECT c.row_number, 'code', 'DUPLICATE_IN_TENANT' FROM counted c
      WHERE EXISTS (SELECT 1 FROM workers w WHERE lower(w.code) = c.code)
    UNION ALL SELECT c.row_number, 'email', 'DUPLICATE_IN_TENANT' FROM counted c
      WHERE c.email IS NOT NULL AND EXISTS (SELECT 1 FROM workers w WHERE lower(w.email) = c.email)`, [JSON.stringify(input.rows)]);
  issues.push(...duplicates.rows.map((r) => ({ rowNumber: r.row_number, field: r.field, code: r.issue })));
  issues.sort((a, b) => a.rowNumber - b.rowNumber || a.field.localeCompare(b.field) || a.code.localeCompare(b.code));
  const blocked = new Set(issues.map((r) => r.rowNumber)).size;
  return { issues, counts: { total: input.rows.length, valid: input.rows.length - blocked, blocked },
    checksum: digest([IMPORT_POLICY.schemaVersion, IMPORT_POLICY.version, input.parserVersion,
      input.fileChecksum, input.rows, departments.rows, shifts.rows, ...(mappingChecksum ? [mappingChecksum] : [])]) };
}
