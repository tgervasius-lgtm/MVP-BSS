import type pg from "pg";
import { AppError } from "../domain/errors.js";
import type { ActorContext } from "../domain/types.js";
import { requireRole } from "../security/rbac.js";
import { assertChecksum, assertId, digest, IMPORT_POLICY, invalid, keyHash, normalizeInput,
  normalizeRows, type ImportInput, type ImportWorker } from "./model.js";
import { assertRevision, auditImport, expire, lockedSession, nonterminal, readResult,
  SESSION_COLUMNS, sessionView, stagedRows, terminate, updatePreview, type CommitRow, type SessionRow } from "./persistence.js";
import { importTransaction, type ImportTransaction } from "./transaction.js";
import { validateImport } from "./validation.js";
import { writeCommit } from "./commit.js";

// Not constructed by server.ts or reachable through HTTP. A future bounded
// parser/mapping adapter must supply these canonical rows after file validation.
export class PgWorkerImportStore {
  constructor(private readonly pool: pg.Pool) {}

  private async run<T>(actor: ActorContext, requestId: string,
    operation: (tx: ImportTransaction) => Promise<T | AppError>): Promise<T> {
    const result = await importTransaction(this.pool, actor, requestId, operation);
    // Expiry cleanup must commit even when the requested action is refused.
    if (result instanceof AppError) throw result;
    return result;
  }

  async prepare(actor: ActorContext, input: ImportInput, createKey: string, requestId: string) {
    requireRole(actor, ["admin"]);
    const normalized = normalizeInput(input);
    const key = keyHash(createKey);
    const fingerprint = digest([IMPORT_POLICY.version, IMPORT_POLICY.schemaVersion, normalized]);
    return this.run(actor, requestId, async (tx) => {
      // Serialize admission per tenant across every application instance. A hash
      // collision only reduces concurrency; it cannot mix organization scopes.
      await tx.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 237))", [actor.organizationId]);
      const replay = await tx.query<SessionRow>(`SELECT ${SESSION_COLUMNS} FROM worker_import_sessions
        WHERE create_key_hash = $1 FOR UPDATE`, [key]);
      const previous = replay.rows[0];
      if (previous) {
        if (previous.create_fingerprint !== fingerprint) throw new AppError("CONFLICT", "Ključ je već korišten za drukčiji uvoz.");
        return { session: sessionView(await expire(tx, actor, requestId, previous)), replayed: true };
      }
      await this.cleanup(tx, actor, requestId);
      const active = await tx.query<{ count: string }>("SELECT count(*)::text FROM worker_import_sessions WHERE state IN ('READY','INVALID')");
      if (Number(active.rows[0]?.count) >= IMPORT_POLICY.maxSessions) return new AppError("CONFLICT", "Već postoje dvije otvorene pripreme uvoza.");
      const validation = await validateImport(tx, normalized);
      const result = await tx.query<SessionRow>(`WITH stamp AS (SELECT clock_timestamp() AS now)
        INSERT INTO worker_import_sessions(organization_id, uploader_id, state, create_key_hash,
          create_fingerprint, file_checksum, parser_version, schema_version, policy_version,
          total, blocked, preview_checksum, created_at, expires_at)
        SELECT $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,now,now + interval '24 hours' FROM stamp
        RETURNING ${SESSION_COLUMNS}`, [actor.organizationId, actor.userId, validation.counts.blocked ? "INVALID" : "READY",
        key, fingerprint, normalized.fileChecksum, normalized.parserVersion, IMPORT_POLICY.schemaVersion,
        IMPORT_POLICY.version, validation.counts.total, validation.counts.blocked, validation.checksum]);
      const row = result.rows[0]!;
      await tx.query("INSERT INTO worker_import_staging(organization_id, session_id, rows_json) VALUES ($1,$2,$3::jsonb)",
        [actor.organizationId, row.id, JSON.stringify(normalized.rows)]);
      await auditImport(tx, actor, requestId, row.id, "prepared", { total: row.total, blocked: row.blocked });
      return { session: sessionView(row), replayed: false };
    });
  }

  async get(actor: ActorContext, id: string, requestId: string) {
    requireRole(actor, ["admin"]); assertId(id);
    return this.run(actor, requestId, async (tx) => {
      const row = await expire(tx, actor, requestId, await lockedSession(tx, id));
      const commit = await tx.query<CommitRow>("SELECT * FROM worker_import_commits WHERE session_id = $1", [id]);
      return { session: sessionView(row), result: commit.rows[0] ? await readResult(tx, row, commit.rows[0]) : null };
    });
  }

  async preview(actor: ActorContext, id: string, revision: string, offset: number, limit: number, requestId: string) {
    requireRole(actor, ["admin"]); assertId(id);
    if (!Number.isInteger(offset) || offset < 0 || offset > 1000 || !Number.isInteger(limit) || limit < 1 || limit > 100) invalid();
    return this.run(actor, requestId, async (tx) => {
      const row = await expire(tx, actor, requestId, await lockedSession(tx, id));
      if (!nonterminal(row)) return new AppError("CONFLICT", "Privremeni podaci više nisu dostupni.");
      assertRevision(row, revision);
      const rows = normalizeRows(await stagedRows(tx, id));
      const validation = await validateImport(tx, { fileChecksum: row.file_checksum, parserVersion: row.parser_version, rows });
      // Reads do not extend expiry, remap values or silently change approval.
      return { rows: rows.slice(offset, offset + limit), offset, counts: validation.counts,
        issues: validation.issues.filter((issue) => issue.rowNumber >= offset + 2 && issue.rowNumber < offset + limit + 2),
        requiresRefresh: validation.checksum !== row.preview_checksum || validation.counts.blocked !== row.blocked };
    });
  }

  async replace(actor: ActorContext, id: string, revision: string, input: readonly ImportWorker[], requestId: string) {
    requireRole(actor, ["admin"]); assertId(id);
    const rows = normalizeRows(input);
    return this.run(actor, requestId, async (tx) => {
      const row = await expire(tx, actor, requestId, await lockedSession(tx, id));
      if (!nonterminal(row)) return new AppError("CONFLICT", "Priprema uvoza je završena.");
      assertRevision(row, revision);
      const validation = await validateImport(tx, { fileChecksum: row.file_checksum, parserVersion: row.parser_version, rows });
      const updated = await updatePreview(tx, id, rows, validation.counts, validation.checksum);
      await auditImport(tx, actor, requestId, id, "revalidated", { revision: updated.revision, ...validation.counts });
      return updated;
    });
  }

  async commit(actor: ActorContext, id: string, revision: string, input: { approved: true; previewChecksum: string },
    commitKey: string, requestId: string) {
    requireRole(actor, ["admin"]); assertId(id); assertChecksum(input.previewChecksum);
    if (input.approved !== true) invalid();
    const key = keyHash(commitKey);
    const fingerprint = digest([revision, input.approved, input.previewChecksum]);
    return this.run(actor, requestId, async (tx) => {
      let row = await lockedSession(tx, id);
      const previous = await tx.query<CommitRow>("SELECT * FROM worker_import_commits WHERE session_id = $1", [id]);
      const replay = previous.rows[0];
      if (replay) {
        if (replay.idempotency_key_hash !== key || replay.request_fingerprint !== fingerprint)
          throw new AppError("CONFLICT", "Ovaj uvoz već je potvrđen drugim zahtjevom.");
        return readResult(tx, row, replay);
      }
      row = await expire(tx, actor, requestId, row);
      if (!nonterminal(row)) return new AppError("CONFLICT", "Priprema uvoza je završena.");
      assertRevision(row, revision);
      if (row.state !== "READY" || row.preview_checksum !== input.previewChecksum)
        throw new AppError("CONFLICT", "Potvrdite aktualnu ispravnu pripremu uvoza.");
      const rows = normalizeRows(await stagedRows(tx, id));
      const validation = await validateImport(tx, { fileChecksum: row.file_checksum, parserVersion: row.parser_version, rows });
      if (validation.checksum !== input.previewChecksum) throw new AppError("STALE_REVISION", "Promijenjeni su podaci odjela ili smjena.");
      if (validation.counts.blocked) throw new AppError("CONFLICT", "Uvoz sadrži neispravne ili već postojeće radnike.");
      // Recheck expiry after reference locks and validation, before any write.
      row = await expire(tx, actor, requestId, row);
      if (!nonterminal(row)) return new AppError("CONFLICT", "Priprema uvoza je istekla.");
      return writeCommit(tx, actor, requestId, row, rows, key, fingerprint, input.previewChecksum);
    });
  }

  async cancel(actor: ActorContext, id: string, revision: string, requestId: string) {
    requireRole(actor, ["admin"]); assertId(id);
    return this.run(actor, requestId, async (tx) => {
      const row = await expire(tx, actor, requestId, await lockedSession(tx, id));
      if (!nonterminal(row)) return new AppError("CONFLICT", "Priprema uvoza je završena.");
      assertRevision(row, revision);
      return sessionView(await terminate(tx, actor, requestId, row, "CANCELLED"));
    });
  }

  private async cleanup(tx: ImportTransaction, actor: ActorContext, requestId: string) {
    const expired = await tx.query<SessionRow>(`SELECT ${SESSION_COLUMNS} FROM worker_import_sessions
      WHERE state IN ('READY','INVALID') AND expires_at <= clock_timestamp()
      ORDER BY id LIMIT 100 FOR UPDATE SKIP LOCKED`);
    for (const row of expired.rows) await terminate(tx, actor, requestId, row, "EXPIRED");
    const removed = await tx.query(`DELETE FROM worker_import_sessions WHERE id IN (
      SELECT id FROM worker_import_sessions WHERE state IN ('CANCELLED','EXPIRED')
        AND terminal_at <= clock_timestamp() - interval '30 days'
      ORDER BY id LIMIT 100 FOR UPDATE SKIP LOCKED) RETURNING id`);
    return { expired: expired.rowCount ?? 0, removed: removed.rowCount ?? 0 };
  }

  // Tenant-scoped primitive only; this is NOT the deployment-wide monitored
  // startup/recurring cleanup required before file ingestion may be enabled.
  async cleanupTenant(actor: ActorContext, requestId: string) {
    return this.run(actor, requestId, (tx) => this.cleanup(tx, actor, requestId));
  }
}
