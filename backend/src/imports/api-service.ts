import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { AppError } from "../domain/errors.js";
import type { ActorContext } from "../domain/types.js";
import { requireRole } from "../security/rbac.js";
import { IMPORT_POLICY, invalid } from "./model.js";
import { PgImportSourceStore, type ImportSourceIdentity } from "./pg-import-source-store.js";
import { PgImportRuntime, importUnavailable } from "./runtime.js";
import { ImportParserError, parseImportFile, TABULAR_LIMITS } from "./tabular-parser.js";

export class WorkerImportApi {
  constructor(readonly store: PgImportSourceStore, readonly runtime: PgImportRuntime,
    private readonly cursorKey: Buffer, private readonly parser: typeof parseImportFile = parseImportFile) {
    if (cursorKey.length < 32) throw new Error("Import cursors require a separate stable key of at least 32 bytes.");
  }
  async policy(actor: ActorContext) {
    requireRole(actor, ["admin"]);
    return { version: IMPORT_POLICY.version, approvalStatus: "APPROVED", uploadEnabled: await this.runtime.healthy(),
      maxUploadBytes: TABULAR_LIMITS.bytes, maxRows: IMPORT_POLICY.maxRows, maxColumns: TABULAR_LIMITS.columns,
      formats: ["csv", "xlsx"], csvDelimiters: [",", ";"], sessionTtlSeconds: IMPORT_POLICY.ttlSeconds,
      cleanupDeadlineSeconds: 300, maxNonterminalSessions: IMPORT_POLICY.maxSessions, maxPreviewRows: 100,
      lifecycleNotice: "Datoteka se obrađuje u memoriji. Privremeni podaci istječu nakon 24 sata i brišu se pri potvrdi, otkazu ili isteku; rok čišćenja je pet minuta. Minimalni rezultat i revizijski trag zadržavaju se prema životnom ciklusu radnika. Uklanjanje iz sigurnosnih kopija i odjava tvrtke zahtijevaju zasebno odobren postupak." };
  }
  cursor(scope: string, value: string | number): string {
    const body = Buffer.from(JSON.stringify([scope, value])).toString("base64url");
    return body + "." + createHmac("sha256", this.cursorKey).update(body).digest("base64url");
  }
  private decode(scope: string, cursor: string | undefined): unknown {
    if (!cursor) return null;
    try {
      if (cursor.length > 1024) invalid();
      const [body, signature, extra] = cursor.split(".");
      if (!body || !signature || extra !== undefined) invalid();
      const actual = Buffer.from(signature, "base64url");
      const expected = createHmac("sha256", this.cursorKey).update(body).digest();
      if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) invalid();
      const parsed: unknown = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
      if (!Array.isArray(parsed) || parsed.length !== 2 || parsed[0] !== scope) invalid();
      return parsed[1];
    } catch { throw new AppError("VALIDATION_FAILED", "Kursor stranice nije valjan."); }
  }
  async list(actor: ActorContext, limit: number, cursor: string | undefined, requestId: string) {
    requireRole(actor, ["admin"]);
    const scope = actor.organizationId + ":imports:" + limit;
    const after = this.decode(scope, cursor);
    if (after !== null && typeof after !== "string") invalid();
    const page = await this.store.list(actor, after as string | null, limit, requestId);
    return { items: page.items, nextCursor: page.hasMore ? this.cursor(scope, page.items.at(-1)!.id) : null };
  }
  async rows(actor: ActorContext, id: string, revision: string, limit: number, cursor: string | undefined, requestId: string) {
    requireRole(actor, ["admin"]);
    const scope = actor.organizationId + ":" + id + ":" + revision + ":" + limit;
    const offset = this.decode(scope, cursor) ?? 0;
    if (typeof offset !== "number" || !Number.isInteger(offset) || offset < 0 || offset > 1000) invalid();
    try {
      const page = await this.store.source(actor, id, revision, offset as number, limit, requestId);
      const next = (offset as number) + page.sourceRows.length;
      return { ...page, nextCursor: next < page.counts.total ? this.cursor(scope, next) : null };
    } catch (error) {
      if (error instanceof AppError && error.code === "CONFLICT") {
        const { session } = await this.store.get(actor, id, requestId);
        if (["COMMITTED", "CANCELLED", "EXPIRED", "FAILED"].includes(session.state))
          throw new AppError("IMPORT_DATA_PURGED", "Privremeni podaci uvoza više nisu dostupni.");
      }
      throw error;
    }
  }
  async create(actor: ActorContext, bytes: Buffer, input: Omit<ImportSourceIdentity, "fileChecksum">,
    key: string, token: string, signal: AbortSignal, requestId: string) {
    requireRole(actor, ["admin"]);
    if (signal.aborted) throw importUnavailable();
    const fileChecksum = createHash("sha256").update(bytes).digest("hex");
    const reserved = await this.store.reserve(actor, { ...input, fileChecksum }, key, requestId);
    if (reserved.replayed) return { session: reserved.session, replayed: true };
    try {
      const table = await this.parser(bytes, input.format, input.delimiter, signal);
      if (signal.aborted) throw importUnavailable();
      return { session: await this.store.publish(actor, reserved.session.id, reserved.session.revision,
        reserved.lease!, table, requestId, token), replayed: false };
    } catch (error) {
      // If cleanup already won, failure transition is fenced and harmless.
      await this.store.fail(actor, reserved.session.id, reserved.session.revision, reserved.lease!, requestId).catch(() => {});
      if (error instanceof ImportParserError) {
        if (error.kind === "REJECTED") throw new AppError("VALIDATION_FAILED", "Datoteka nije podržana za siguran uvoz.");
        throw importUnavailable();
      }
      throw error;
    }
  }
}
