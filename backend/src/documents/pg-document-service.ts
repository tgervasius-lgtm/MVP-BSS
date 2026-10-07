import { randomUUID } from "node:crypto";
import type pg from "pg";
import { withTenant, type TenantTransaction } from "../db/tenant.js";
import { AppError } from "../domain/errors.js";
import type { ActorContext } from "../domain/types.js";
import type { DocumentConfig } from "./config.js";
import { openDocument, sealDocument } from "./crypto.js";
import { documentReader, documentWriter, fingerprint, validateUpload, type DocumentView, type DocumentUpload, type DocumentFilters, type DocumentPage, type DocumentService } from "./model.js";
import type { DocumentScanner } from "./scanner.js";

type Row = { id: string; worker_id: string; name: string; code: string; title: string; category: DocumentView['category']; period: string | null;
  state: DocumentView['state']; byte_length: number; revision: string; created_at: Date; published_at: Date | null; fingerprint?: string;
  ciphertext: Buffer; nonce: Buffer; tag: Buffer; key_id: string };
const columns = "d.id,d.worker_id,w.name,w.code,d.title,d.category,d.period,d.state,d.byte_length,d.revision::text,d.created_at,d.published_at";
const join = "FROM worker_documents d JOIN workers w ON w.organization_id=d.organization_id AND w.id=d.worker_id";
function view(r: Row): DocumentView {
  return { id: r.id, workerId: r.worker_id, workerName: r.name, workerCode: r.code, title: r.title, category: r.category, period: r.period,
    state: r.state, bytes: r.byte_length, revision: r.revision, createdAt: r.created_at.toISOString(), publishedAt: r.published_at?.toISOString() ?? null };
}
async function audit(tx: TenantTransaction, actor: ActorContext, id: string, action: string, requestId: string): Promise<void> {
  await tx.query(`INSERT INTO audit_events(organization_id,actor_type,actor_id,actor_role,action,entity_type,entity_id,request_id,metadata)
    VALUES ($1,'user',$2,$3,$4,'worker_document',$5,$6,'{"module":"documents"}')`, [actor.organizationId, actor.userId, actor.role, action, id, requestId]);
}
export class PgDocumentService implements DocumentService {
  constructor(private readonly pool: pg.Pool, private readonly config: DocumentConfig, private readonly scan: DocumentScanner) {}

  async recipients(actor: ActorContext, search: string, requestId: string) {
    documentWriter(actor);
    if (search.length > 100) throw new AppError("VALIDATION_FAILED", "Upit je predug.");
    return withTenant(this.pool, actor, requestId, async tx => (await tx.query<{ id: string; name: string; code: string }>(
      `SELECT id,name,code FROM workers WHERE organization_id=$1 AND status='active'
        AND (strpos(lower(name),lower($2))>0 OR strpos(lower(code),lower($2))>0) ORDER BY name,id LIMIT 50`, [actor.organizationId, search.trim()])).rows);
  }
  async list(actor: ActorContext, filters: DocumentFilters, requestId: string): Promise<DocumentPage> {
    documentReader(actor);
    if (!Number.isInteger(filters.limit) || filters.limit < 1 || filters.limit > 100) throw new AppError("VALIDATION_FAILED", "Neispravna veličina stranice.");
    let cursor: [string, string] | null = null;
    if (filters.cursor) {
      try {
        const parsed: unknown = JSON.parse(Buffer.from(filters.cursor, "base64url").toString());
        if (!Array.isArray(parsed) || parsed.length !== 2 || typeof parsed[0] !== 'string' || !Number.isFinite(Date.parse(parsed[0]))
          || typeof parsed[1] !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(parsed[1])) throw new Error("Invalid document cursor");
        cursor = [new Date(parsed[0]).toISOString(), parsed[1]];
      } catch { throw new AppError("VALIDATION_FAILED", "Neispravna stranica dokumenata."); }
    }
    return withTenant(this.pool, actor, requestId, async tx => {
      const result = await tx.query<Row>(`SELECT ${columns} ${join} WHERE d.organization_id=$1
        AND ($2::uuid IS NULL OR (d.worker_id=$2 AND d.state='published'))
        AND ($3::text IS NULL OR d.category=$3) AND ($4::text IS NULL OR d.period=$4)
        AND ($5::timestamptz IS NULL OR (d.created_at,d.id)<($5::timestamptz,$6::uuid))
        ORDER BY d.created_at DESC,d.id DESC LIMIT $7`, [actor.organizationId, actor.role === 'worker' ? actor.selfWorkerId : null,
        filters.category ?? null, filters.period ?? null, cursor?.[0] ?? null, cursor?.[1] ?? null, filters.limit + 1]);
      const rows = result.rows.slice(0, filters.limit); const last = rows.at(-1);
      return { items: rows.map(view), nextCursor: result.rows.length > filters.limit && last
        ? Buffer.from(JSON.stringify([last.created_at.toISOString(), last.id])).toString('base64url') : null };
    });
  }
  async upload(actor: ActorContext, input: DocumentUpload, requestId: string): Promise<DocumentView> {
    documentWriter(actor); const bytes = validateUpload(input); const digest = fingerprint(input, bytes);
    const existing = async (tx: TenantTransaction) => {
      const r = (await tx.query<Row>(`SELECT ${columns},d.fingerprint ${join} WHERE d.organization_id=$1 AND d.uploaded_by=$2 AND d.upload_id=$3`,
        [actor.organizationId, actor.userId, input.uploadId])).rows[0];
      if (r && r.fingerprint !== digest) throw new AppError("CONFLICT", "Ovaj identifikator učitavanja već je korišten za drugi dokument.");
      return r ? view(r) : null;
    };
    const replay = await withTenant(this.pool, actor, requestId, existing); if (replay) return replay;
    // No content is persisted before a successful scan; no transaction is held while scanning.
    await this.scan(bytes);
    return withTenant(this.pool, actor, requestId, async tx => {
      await tx.query("SELECT pg_advisory_xact_lock(hashtextextended($1,256))", [actor.organizationId]);
      const repeated = await existing(tx); if (repeated) return repeated;
      const worker = (await tx.query<{ name: string; code: string }>("SELECT name,code FROM workers WHERE organization_id=$1 AND id=$2 AND status='active' FOR SHARE", [actor.organizationId, input.workerId])).rows[0];
      if (!worker) throw new AppError("NOT_FOUND", "Primatelj nije dostupan.");
      const usage = (await tx.query<{ bytes: string; count: string }>("SELECT coalesce(sum(byte_length),0)::text AS bytes,count(*)::text AS count FROM worker_documents WHERE organization_id=$1", [actor.organizationId])).rows[0]!;
      if (Number(usage.bytes) + bytes.length > this.config.quotaBytes || Number(usage.count) >= 10000) throw new AppError("CONFLICT", "Dosegnut je kapacitet dokumenata. Obratite se administratoru.");
      const id = randomUUID(); const sealed = sealDocument(bytes, actor.organizationId, id, this.config.ring);
      await tx.query(`INSERT INTO worker_documents(id,organization_id,worker_id,uploaded_by,upload_id,fingerprint,title,category,period,byte_length,ciphertext,nonce,tag,key_id)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`, [id,actor.organizationId,input.workerId,actor.userId,input.uploadId,digest,input.title.trim(),input.category,input.period,
        bytes.length,sealed.ciphertext,sealed.nonce,sealed.tag,sealed.keyId]);
      await audit(tx, actor, id, "document.uploaded", requestId);
      return view((await tx.query<Row>(`SELECT ${columns} ${join} WHERE d.organization_id=$1 AND d.id=$2`, [actor.organizationId,id])).rows[0]!);
    });
  }
  async transition(actor: ActorContext, id: string, revision: string, action: "publish" | "withdraw", requestId: string): Promise<DocumentView> {
    documentWriter(actor);
    return withTenant(this.pool, actor, requestId, async tx => {
      await tx.query("SELECT pg_advisory_xact_lock(hashtextextended($1,257))", [`${actor.organizationId}:${id}`]);
      const row = (await tx.query<Row>(`SELECT ${columns} ${join} WHERE d.organization_id=$1 AND d.id=$2 FOR UPDATE OF d`, [actor.organizationId,id])).rows[0];
      if (!row) throw new AppError("NOT_FOUND", "Dokument nije dostupan.");
      if (row.revision !== revision) throw new AppError("STALE_REVISION", "Dokument je promijenjen. Osvježite prikaz.");
      if ((action === 'publish' && row.state !== 'draft') || (action === 'withdraw' && row.state === 'withdrawn')) throw new AppError("CONFLICT", "Ta radnja više nije dostupna.");
      await tx.query(`UPDATE worker_documents SET state=$3,revision=revision+1,published_at=CASE WHEN $3='published' THEN clock_timestamp() ELSE published_at END WHERE organization_id=$1 AND id=$2`, [actor.organizationId,id,action === 'publish' ? 'published' : 'withdrawn']);
      await audit(tx,actor,id,action === 'publish' ? 'document.published' : 'document.withdrawn',requestId);
      return view((await tx.query<Row>(`SELECT ${columns} ${join} WHERE d.organization_id=$1 AND d.id=$2`, [actor.organizationId,id])).rows[0]!);
    });
  }
  async download(actor: ActorContext, id: string, requestId: string): Promise<{ content: Buffer; fileName: string }> {
    documentReader(actor);
    return withTenant(this.pool, actor, requestId, async tx => {
      await tx.query("SELECT pg_advisory_xact_lock_shared(hashtextextended($1,257))", [`${actor.organizationId}:${id}`]);
      const row = (await tx.query<Row>(`SELECT d.id,d.state,d.ciphertext,d.nonce,d.tag,d.key_id FROM worker_documents d WHERE d.organization_id=$1 AND d.id=$2
        AND d.state <> 'withdrawn' AND ($3::uuid IS NULL OR (d.worker_id=$3 AND d.state='published'))`, [actor.organizationId,id,actor.role==='worker'?actor.selfWorkerId:null])).rows[0];
      if (!row) throw new AppError("NOT_FOUND", "Dokument nije dostupan.");
      let content: Buffer;
      try { content = openDocument({ ciphertext:row.ciphertext,nonce:row.nonce,tag:row.tag,keyId:row.key_id },actor.organizationId,id,this.config.ring); }
      catch { throw new AppError("DOCUMENTS_UNAVAILABLE", "Dokument trenutačno nije dostupan. Obratite se administratoru."); }
      await audit(tx,actor,id,"document.download_issued",requestId);
      return { content, fileName:`BSS-dokument-${id}.pdf` };
    });
  }
}
