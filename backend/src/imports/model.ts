import { createHash } from "node:crypto";
import { AppError } from "../domain/errors.js";

// Internal persistence boundary. File parsing, source-column mapping and HTTP
// admission are deliberately not exposed by this module.
export const IMPORT_POLICY = Object.freeze({
  version: "h2-import-2026-10-04", schemaVersion: "worker-import-v1",
  maxRows: 1000, maxSessions: 2, ttlSeconds: 86_400, metadataDays: 30,
  transactionMs: 5000, lockMs: 1000, parseLeaseSeconds: 10
});
export type ImportWorker = Readonly<{
  code: string; name: string; email: string | null;
  departmentId: string; shiftId: string; annualLeaveAllowance: number;
}>;
export type ImportInput = Readonly<{
  fileChecksum: string; parserVersion: string; rows: readonly ImportWorker[];
}>;
export type ImportState = "PARSING" | "NEEDS_MAPPING" | "READY" | "INVALID" | "COMMITTED" | "CANCELLED" | "EXPIRED" | "FAILED";
export type ImportIssue = { rowNumber: number; field: string; code: string };
export type ImportCounts = { total: number; valid: number; blocked: number };
export type ImportSession = {
  id: string; state: ImportState; revision: string; uploaderId: string;
  createdAt: string; expiresAt: string; fileChecksum: string;
  parserVersion: string; policyVersion: string; schemaVersion: string;
  counts: ImportCounts; previewChecksum: string | null; mappingChecksum: string | null;
};
export type ImportResult = {
  commitId: string; sessionId: string; mappingChecksum: string | null; fileChecksum: string; previewChecksum: string;
  schemaVersion: string; parserVersion: string; policyVersion: string;
  uploaderId: string; approvedBy: string; approvedAt: string; committedAt: string;
  createdCount: number; counts: ImportCounts; errors: never[]; createdWorkerIds: string[];
};
export function digest(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}
export function invalid(): never {
  throw new AppError("VALIDATION_FAILED", "Neispravni podaci pripreme uvoza.");
}
export function assertId(value: unknown): asserts value is string {
  if (typeof value !== "string" || !/^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(value)) invalid();
}
export function assertChecksum(value: unknown): asserts value is string {
  if (typeof value !== "string" || !/^[a-f0-9]{64}$/.test(value)) invalid();
}
export function keyHash(value: unknown): string {
  if (typeof value !== "string" || !/^[A-Za-z0-9_.:-]{8,200}$/.test(value)) invalid();
  return digest(value);
}
function textField(value: unknown, min: number, max: number): string {
  if (typeof value !== "string" || value.length > 1024 || value.includes("\0")) invalid();
  const result = value.trim();
  if ([...result].length < min || [...result].length > max) invalid();
  return result;
}
export function normalizeRows(input: unknown): ImportWorker[] {
  if (!Array.isArray(input) || input.length < 1 || input.length > IMPORT_POLICY.maxRows) invalid();
  return input.map((value: unknown) => {
    if (typeof value !== "object" || value === null || Array.isArray(value)) invalid();
    const row = value as Record<string, unknown>;
    const keys = ["code", "name", "email", "departmentId", "shiftId", "annualLeaveAllowance"];
    if (Object.keys(row).some((key) => !keys.includes(key))) invalid();
    assertId(row.departmentId); assertId(row.shiftId);
    if (!Number.isInteger(row.annualLeaveAllowance) || typeof row.annualLeaveAllowance !== "number"
      || row.annualLeaveAllowance < 0 || row.annualLeaveAllowance > 366) invalid();
    const email = row.email === null || row.email === undefined || row.email === ""
      ? null : textField(row.email, 3, 320).toLowerCase();
    if (email !== null && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) invalid();
    return { code: textField(row.code, 1, 40), name: textField(row.name, 2, 160), email,
      departmentId: row.departmentId.toLowerCase(), shiftId: row.shiftId.toLowerCase(),
      annualLeaveAllowance: row.annualLeaveAllowance };
  });
}
export function normalizeInput(input: ImportInput): ImportInput {
  assertChecksum(input.fileChecksum);
  if (typeof input.parserVersion !== "string" || !/^[a-zA-Z0-9._-]{1,80}$/.test(input.parserVersion)) invalid();
  return { fileChecksum: input.fileChecksum, parserVersion: input.parserVersion, rows: normalizeRows(input.rows) };
}
