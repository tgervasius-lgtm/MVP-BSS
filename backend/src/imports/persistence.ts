import { AppError } from "../domain/errors.js";
import type { ActorContext } from "../domain/types.js";
import type { ImportCounts, ImportResult, ImportSession, ImportState, ImportWorker } from "./model.js";
import type { ImportTransaction } from "./transaction.js";

export type SessionRow = {
  id: string; uploader_id: string; state: ImportState; revision: string;
  created_at: Date; expires_at: Date; expired: boolean; file_checksum: string;
  parser_version: string; policy_version: string; schema_version: string;
  total: number; blocked: number; preview_checksum: string | null; create_fingerprint: string;
};
export const SESSION_COLUMNS = `id, uploader_id, state, revision::text, created_at, expires_at,
  expires_at <= clock_timestamp() AS expired, file_checksum, parser_version, policy_version,
  schema_version, total, blocked, preview_checksum, create_fingerprint`;
export function sessionView(row: SessionRow): ImportSession {
  return { id: row.id, uploaderId: row.uploader_id, state: row.state, revision: row.revision,
    createdAt: row.created_at.toISOString(), expiresAt: row.expires_at.toISOString(), fileChecksum: row.file_checksum,
    parserVersion: row.parser_version, policyVersion: row.policy_version, schemaVersion: row.schema_version,
    counts: { total: row.total, valid: row.total - row.blocked, blocked: row.blocked }, previewChecksum: row.preview_checksum };
}
export async function lockedSession(tx: ImportTransaction, id: string): Promise<SessionRow> {
  const result = await tx.query<SessionRow>(`SELECT ${SESSION_COLUMNS} FROM worker_import_sessions WHERE id = $1 FOR UPDATE`, [id]);
  const row = result.rows[0];
  if (!row) throw new AppError("NOT_FOUND", "Priprema uvoza nije pronađena.");
  return row;
}
export function assertRevision(row: SessionRow, revision: string): void {
  if (revision !== row.revision) throw new AppError("STALE_REVISION", "Priprema uvoza je promijenjena.");
}
export function nonterminal(row: SessionRow): boolean { return row.state === "READY" || row.state === "INVALID"; }
export async function auditImport(tx: ImportTransaction, actor: ActorContext, requestId: string,
  id: string, action: string, data: object): Promise<void> {
  await tx.query(`INSERT INTO audit_events(organization_id, actor_type, actor_id, actor_role,
    action, entity_type, entity_id, after_json, request_id, metadata)
    VALUES ($1, 'user', $2, 'admin', $3, 'worker_import', $4, $5::jsonb, $6, '{}'::jsonb)`,
  [actor.organizationId, actor.userId, `worker_import.${action}`, id, JSON.stringify(data), requestId]);
}
export async function terminate(tx: ImportTransaction, actor: ActorContext, requestId: string,
  row: SessionRow, state: "CANCELLED" | "EXPIRED"): Promise<SessionRow> {
  await tx.query("DELETE FROM worker_import_staging WHERE session_id = $1", [row.id]);
  const updated = await tx.query<SessionRow>(`UPDATE worker_import_sessions SET state = $2, revision = revision + 1,
    terminal_at = clock_timestamp(), preview_checksum = NULL WHERE id = $1 RETURNING ${SESSION_COLUMNS}`, [row.id, state]);
  await auditImport(tx, actor, requestId, row.id, state.toLowerCase(), { total: row.total });
  return updated.rows[0]!;
}
export async function expire(tx: ImportTransaction, actor: ActorContext, requestId: string, row: SessionRow): Promise<SessionRow> {
  // Re-evaluate after acquiring locks; a transaction may have waited for another
  // writer. Never trust application clocks or the pre-lock SELECT expression.
  const clock = await tx.query<{ expired: boolean }>("SELECT expires_at <= clock_timestamp() AS expired FROM worker_import_sessions WHERE id = $1", [row.id]);
  return nonterminal(row) && clock.rows[0]?.expired ? terminate(tx, actor, requestId, row, "EXPIRED") : row;
}
export async function stagedRows(tx: ImportTransaction, id: string): Promise<ImportWorker[]> {
  const result = await tx.query<{ rows_json: ImportWorker[] }>("SELECT rows_json FROM worker_import_staging WHERE session_id = $1", [id]);
  if (!result.rows[0]) throw new AppError("CONFLICT", "Privremeni podaci više nisu dostupni.");
  return result.rows[0].rows_json;
}
export async function updatePreview(tx: ImportTransaction, id: string, rows: readonly ImportWorker[],
  counts: ImportCounts, checksum: string): Promise<ImportSession> {
  await tx.query("UPDATE worker_import_staging SET rows_json = $2::jsonb WHERE session_id = $1", [id, JSON.stringify(rows)]);
  const result = await tx.query<SessionRow>(`UPDATE worker_import_sessions SET total = $2, blocked = $3,
    preview_checksum = $4, state = $5, revision = revision + 1 WHERE id = $1 RETURNING ${SESSION_COLUMNS}`,
  [id, counts.total, counts.blocked, checksum, counts.blocked ? "INVALID" : "READY"]);
  return sessionView(result.rows[0]!);
}
export type CommitRow = { id: string; idempotency_key_hash: string; request_fingerprint: string;
  preview_checksum: string; approved_by: string; committed_at: Date; created_count: number };
export async function readResult(tx: ImportTransaction, session: SessionRow, commit: CommitRow): Promise<ImportResult> {
  const workers = await tx.query<{ worker_id: string }>(`SELECT worker_id FROM worker_import_commit_workers
    WHERE commit_id = $1 ORDER BY row_number`, [commit.id]);
  return { commitId: commit.id, sessionId: session.id, fileChecksum: session.file_checksum,
    previewChecksum: commit.preview_checksum, schemaVersion: session.schema_version, parserVersion: session.parser_version,
    policyVersion: session.policy_version, uploaderId: session.uploader_id, approvedBy: commit.approved_by,
    approvedAt: commit.committed_at.toISOString(), committedAt: commit.committed_at.toISOString(), createdCount: commit.created_count,
    counts: { total: commit.created_count, valid: commit.created_count, blocked: 0 }, errors: [],
    createdWorkerIds: workers.rows.map((r) => r.worker_id) };
}
