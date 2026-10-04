import type { ActorContext } from "../domain/types.js";
import type { ImportWorker } from "./model.js";
import { auditImport, readResult, type CommitRow, type SessionRow } from "./persistence.js";
import type { ImportTransaction } from "./transaction.js";

export async function writeCommit(tx: ImportTransaction, actor: ActorContext, requestId: string,
  session: SessionRow, rows: readonly ImportWorker[], key: string, fingerprint: string, checksum: string) {
  const inserted = await tx.query<CommitRow>(`INSERT INTO worker_import_commits(organization_id, session_id,
    idempotency_key_hash, request_fingerprint, preview_checksum, approved_by, created_count)
    VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
  [actor.organizationId, session.id, key, fingerprint, checksum, actor.userId, rows.length]);
  const commit = inserted.rows[0]!;
  // No ON CONFLICT, per-row commits, disabled triggers or implicit upsert.
  // Existing worker insert triggers produce department/shift/status history.
  await tx.query(`WITH source AS (
    SELECT value, (ordinality + 1)::integer AS row_number FROM jsonb_array_elements($1::jsonb) WITH ORDINALITY
  ), inserted AS (
    INSERT INTO workers(organization_id, code, name, email, department_id, shift_id, annual_leave_allowance)
    SELECT $2, value->>'code', value->>'name', value->>'email', (value->>'departmentId')::uuid,
      (value->>'shiftId')::uuid, (value->>'annualLeaveAllowance')::integer FROM source ORDER BY row_number
    RETURNING id, code, name, email, department_id, shift_id, status, annual_leave_allowance, revision
  ), links AS (
    INSERT INTO worker_import_commit_workers(organization_id, commit_id, worker_id, row_number)
    SELECT $2, $3, w.id, s.row_number FROM inserted w JOIN source s ON s.value->>'code' = w.code
  )
  INSERT INTO audit_events(organization_id, actor_type, actor_id, actor_role, action,
    entity_type, entity_id, before_json, after_json, request_id, metadata)
  SELECT $2, 'user', $4, 'admin', 'worker.create', 'worker', w.id, NULL, to_jsonb(w), $5,
    jsonb_build_object('importId', $6::text, 'commitId', $3::text) FROM inserted w`,
  [JSON.stringify(rows), actor.organizationId, commit.id, actor.userId, requestId, session.id]);
  await tx.query("DELETE FROM worker_import_staging WHERE session_id = $1", [session.id]);
  await tx.query(`UPDATE worker_import_sessions SET state = 'COMMITTED', revision = revision + 1,
    terminal_at = clock_timestamp() WHERE id = $1`, [session.id]);
  await auditImport(tx, actor, requestId, session.id, "committed", {
    commitId: commit.id, createdCount: rows.length, previewChecksum: checksum
  });
  return readResult(tx, session, commit);
}
