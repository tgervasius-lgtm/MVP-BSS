import { randomUUID } from "node:crypto";
import { AppError } from "../domain/errors.js";
import type { ActorContext } from "../domain/types.js";
import { requireRole } from "../security/rbac.js";
import { assertChecksum, assertId, digest, IMPORT_POLICY, invalid, keyHash, normalizeRows, type ImportIssue, type ImportWorker } from "./model.js";
import { PgWorkerImportStore } from "./pg-worker-import-store.js";
import { assertRevision, auditImport, expire, lockedSession, nonterminal, SESSION_COLUMNS,
  sessionView, terminate, type SessionRow } from "./persistence.js";
import { checkedParsedTable, TABULAR_VERSION, type ParsedTable } from "./tabular-parser.js";
import { mapImportSource, type SourceMapping } from "./source-mapping.js";
import { validateImport } from "./validation.js";
import type { ImportTransaction } from "./transaction.js";

export type ImportSourceIdentity = {
  fileChecksum: string; format: "csv" | "xlsx"; delimiter: "," | ";"; policyVersion: string;
};
type SourceStage = { source_json: ParsedTable; mapping_json: SourceMapping | null;
  mapping_issues: ImportIssue[]; rows_json: ImportWorker[] | null };
const conflict = () => new AppError("CONFLICT", "Pripremu uvoza više nije moguće obraditi.");

async function sourceStage(tx: ImportTransaction, id: string): Promise<SourceStage> {
  const result = await tx.query<SourceStage>(`SELECT source_json, mapping_json, mapping_issues, rows_json
    FROM worker_import_staging WHERE session_id = $1`, [id]);
  if (!result.rows[0]?.source_json) throw conflict();
  return result.rows[0];
}

/** Inactive internal boundary. Before calling reserve, a future coordinator MUST
 * enforce deployment-wide parser admission, durable attempt limits and monitored
 * cleanup health. The per-session fence here is not a global parser semaphore.
 */
export class PgImportSourceStore extends PgWorkerImportStore {
  async reserve(actor: ActorContext, input: ImportSourceIdentity, createKey: string, requestId: string) {
    requireRole(actor, ["admin"]); assertChecksum(input.fileChecksum);
    if (!["csv", "xlsx"].includes(input.format) || ![",", ";"].includes(input.delimiter)) invalid();
    if (input.policyVersion !== IMPORT_POLICY.version) throw new AppError("CONFLICT", "Obnovite pravila uvoza.");
    const identity = { ...input };
    const key = keyHash(createKey);
    const fingerprint = digest([identity.fileChecksum, identity.format, identity.delimiter,
      IMPORT_POLICY.version, IMPORT_POLICY.schemaVersion, TABULAR_VERSION]);
    return this.run(actor, requestId, async tx => {
      await tx.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 237))", [actor.organizationId]);
      const replay = await tx.query<SessionRow>(`SELECT ${SESSION_COLUMNS} FROM worker_import_sessions
        WHERE create_key_hash = $1 FOR UPDATE`, [key]);
      if (replay.rows[0]) {
        if (replay.rows[0].create_fingerprint !== fingerprint) throw new AppError("CONFLICT", "Ključ je već korišten za drukčiji uvoz.");
        const previous = await expire(tx, actor, requestId, replay.rows[0]);
        if (previous.state === "PARSING") return conflict();
        return { session: sessionView(previous), replayed: true, lease: null };
      }
      await this.cleanup(tx, actor, requestId);
      const active = await tx.query<{ count: string }>(`SELECT count(*)::text FROM worker_import_sessions
        WHERE state IN ('PARSING','NEEDS_MAPPING','READY','INVALID')`);
      if (Number(active.rows[0]?.count) >= IMPORT_POLICY.maxSessions) return conflict();
      const lease = randomUUID();
      const result = await tx.query<SessionRow>(`WITH stamp AS (SELECT clock_timestamp() AS now)
        INSERT INTO worker_import_sessions(organization_id, uploader_id, state, create_key_hash,
          create_fingerprint, file_checksum, parser_version, schema_version, policy_version,
          total, blocked, created_at, expires_at, source_format, source_delimiter, parse_lease, parse_expires_at)
        SELECT $1,$2,'PARSING',$3,$4,$5,$6,$7,$8,0,0,now,now + interval '24 hours',$9,$10,$11,
          now + interval '10 seconds' FROM stamp RETURNING ${SESSION_COLUMNS}`,
      [actor.organizationId, actor.userId, key, fingerprint, identity.fileChecksum, TABULAR_VERSION,
        IMPORT_POLICY.schemaVersion, IMPORT_POLICY.version, identity.format, identity.delimiter, lease]);
      const row = result.rows[0]!;
      await auditImport(tx, actor, requestId, row.id, "reserved", { parserVersion: TABULAR_VERSION });
      return { session: sessionView(row), replayed: false, lease };
    });
  }

  async publish(actor: ActorContext, id: string, revision: string, lease: string, input: ParsedTable, requestId: string) {
    requireRole(actor, ["admin"]); assertId(id); assertId(lease);
    const source = checkedParsedTable(input);
    return this.run(actor, requestId, async tx => {
      const row = await expire(tx, actor, requestId, await lockedSession(tx, id));
      if (row.state !== "PARSING") return conflict();
      assertRevision(row, revision);
      if (row.parse_lease !== lease || row.file_checksum !== source.fileChecksum || row.parser_version !== source.version) throw conflict();
      await tx.query(`INSERT INTO worker_import_staging(organization_id, session_id, source_json)
        VALUES ($1,$2,$3::jsonb)`, [actor.organizationId, id, JSON.stringify(source)]);
      // SQL clock check also fences a lease that expires during the staged write.
      const updated = await tx.query<SessionRow>(`UPDATE worker_import_sessions SET state = 'NEEDS_MAPPING',
        revision = revision + 1, total = $2, blocked = $2, parse_lease = NULL, parse_expires_at = NULL
        WHERE id = $1 AND parse_expires_at > clock_timestamp() AND expires_at > clock_timestamp()
        RETURNING ${SESSION_COLUMNS}`, [id, source.rows.length]);
      if (!updated.rows[0]) {
        await terminate(tx, actor, requestId, row, "FAILED");
        return conflict();
      }
      await auditImport(tx, actor, requestId, id, "parsed", { total: source.rows.length });
      return sessionView(updated.rows[0]);
    });
  }

  async fail(actor: ActorContext, id: string, revision: string, lease: string, requestId: string) {
    requireRole(actor, ["admin"]); assertId(id); assertId(lease);
    return this.run(actor, requestId, async tx => {
      const row = await expire(tx, actor, requestId, await lockedSession(tx, id));
      if (row.state !== "PARSING") return conflict();
      assertRevision(row, revision);
      if (row.parse_lease !== lease) throw conflict();
      return sessionView(await terminate(tx, actor, requestId, row, "FAILED"));
    });
  }

  async map(actor: ActorContext, id: string, revision: string, input: SourceMapping, requestId: string) {
    requireRole(actor, ["admin"]); assertId(id);
    const mapping = structuredClone(input);
    return this.run(actor, requestId, async tx => {
      const row = await expire(tx, actor, requestId, await lockedSession(tx, id));
      if (!nonterminal(row) || row.state === "PARSING") return conflict();
      assertRevision(row, revision);
      const staged = await sourceStage(tx, id);
      const result = mapImportSource(staged.source_json, mapping);
      const validation = result.canonicalRows ? await validateImport(tx, { fileChecksum: row.file_checksum,
        parserVersion: row.parser_version, rows: result.canonicalRows }, result.mappingChecksum) : null;
      const blocked = validation?.counts.blocked ?? new Set(result.issues.map(issue => issue.rowNumber)).size;
      // Recheck absolute expiry after waiting for reference locks.
      if (!nonterminal(await expire(tx, actor, requestId, row))) return conflict();
      await tx.query(`UPDATE worker_import_staging SET mapping_json = $2::jsonb, mapping_issues = $3::jsonb,
        rows_json = $4::jsonb WHERE session_id = $1`,
      [id, JSON.stringify(mapping), JSON.stringify(result.issues), result.canonicalRows ? JSON.stringify(result.canonicalRows) : null]);
      const updated = await tx.query<SessionRow>(`UPDATE worker_import_sessions SET revision = revision + 1,
        state = $2, blocked = $3, preview_checksum = $4, mapping_checksum = $5 WHERE id = $1 RETURNING ${SESSION_COLUMNS}`,
      [id, blocked ? "INVALID" : "READY", blocked, validation?.checksum ?? null, result.mappingChecksum]);
      await auditImport(tx, actor, requestId, id, "mapped", { revision: updated.rows[0]!.revision,
        total: row.total, blocked, mappingChecksum: result.mappingChecksum });
      return sessionView(updated.rows[0]!);
    });
  }

  async source(actor: ActorContext, id: string, revision: string, offset: number, limit: number, requestId: string) {
    requireRole(actor, ["admin"]); assertId(id);
    if (!Number.isInteger(offset) || offset < 0 || offset > 1000 || !Number.isInteger(limit) || limit < 1 || limit > 100) invalid();
    return this.run(actor, requestId, async tx => {
      const row = await expire(tx, actor, requestId, await lockedSession(tx, id));
      if (!nonterminal(row) || row.state === "PARSING") return conflict();
      assertRevision(row, revision);
      const staged = await sourceStage(tx, id);
      // PostgreSQL jsonb reorders object keys; reconstruct the same canonical
      // representation used by mapping and commit before computing its digest.
      const rows = staged.rows_json ? normalizeRows(staged.rows_json) : null;
      const validation = rows ? await validateImport(tx, { fileChecksum: row.file_checksum,
        parserVersion: row.parser_version, rows }, row.mapping_checksum) : null;
      if (!nonterminal(await expire(tx, actor, requestId, row))) return conflict();
      const issues = validation?.issues ?? staged.mapping_issues;
      return { session: sessionView(row), offset, headers: staged.source_json.headers, mapping: staged.mapping_json,
        sourceRows: staged.source_json.rows.slice(offset, offset + limit),
        canonicalRows: rows?.slice(offset, offset + limit) ?? null,
        counts: validation?.counts ?? sessionView(row).counts,
        issues: issues.filter(issue => issue.rowNumber >= offset + 2 && issue.rowNumber < offset + limit + 2),
        requiresRefresh: validation !== null && (validation.checksum !== row.preview_checksum || validation.counts.blocked !== row.blocked) };
    });
  }
}
