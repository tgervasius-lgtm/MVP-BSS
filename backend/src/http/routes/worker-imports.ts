import type { FastifyInstance, FastifyRequest } from "fastify";
import { AppError, requireRevision } from "../../domain/errors.js";
import type { ActorContext } from "../../domain/types.js";
import { requireRole } from "../../security/rbac.js";
import { WorkerImportApi } from "../../imports/api-service.js";
import { IMPORT_POLICY, invalid } from "../../imports/model.js";
import { IMPORT_RUNTIME, importUnavailable } from "../../imports/runtime.js";
import { TABULAR_LIMITS } from "../../imports/tabular-parser.js";
import type { SourceMapping } from "../../imports/source-mapping.js";
import type { Authenticate } from "../app.js";

type Context = { actor: ActorContext; token?: string; controller: AbortController; processing: boolean; released: boolean };
type Params = { importId: string };
type Page = { limit?: number; cursor?: string };
const root = "/api/v1/worker-imports";
const csv = "text/csv", xlsx = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const params = { type: "object", additionalProperties: false, required: ["importId"], properties: { importId: { type: "string", format: "uuid" } } };
const pageProperties = { limit: { type: "integer", minimum: 1, maximum: 100, default: 50 }, cursor: { type: "string", maxLength: 1024 } };
const key = (request: FastifyRequest): string => {
  const value = request.headers["idempotency-key"];
  if (typeof value !== "string" || !/^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/.test(value)) invalid();
  return value as string;
};


function importProblem(error: unknown): AppError {
  if (error instanceof AppError) return error;
  const problem = error as { code?: string; statusCode?: number; validation?: unknown };
  if (problem.statusCode === 429 || problem.code === "RATE_LIMITED")
    return new AppError("RATE_LIMITED", "Previše zahtjeva. Pokušajte ponovno kasnije.");
  if (problem.code === "FST_ERR_CTP_BODY_TOO_LARGE")
    return new AppError("IMPORT_FILE_TOO_LARGE", "Datoteka je prevelika.");
  if (problem.code === "FST_ERR_CTP_INVALID_MEDIA_TYPE")
    return new AppError("IMPORT_FORMAT_UNSUPPORTED", "Vrsta sadržaja nije podržana.");
  if (problem.statusCode === 400 || problem.validation)
    return new AppError("VALIDATION_FAILED", "Zahtjev sadrži neispravna polja.");
  return importUnavailable();
}

export async function registerWorkerImportRoutes(app: FastifyInstance,
  dependencies: { authenticate: Authenticate; imports?: WorkerImportApi }): Promise<void> {
  await app.register(async app => {
    const contexts = new WeakMap<FastifyRequest, Context>();
    const readRateLimit = { max: 60, timeWindow: "1 minute" };
    const service = () => { if (!dependencies.imports) throw importUnavailable(); return dependencies.imports; };
    const context = (request: FastifyRequest) => contexts.get(request)!;
    const release = async (request: FastifyRequest) => {
      const ctx = contexts.get(request);
      if (!ctx || ctx.processing || ctx.released || !ctx.token) return;
      ctx.released = true;
      await service().runtime.release(ctx.actor, ctx.token, request.id).catch(() =>
        request.log.error({ event: "import_lease_release_failed", requestId: request.id }, "Import lease release failed"));
    };
    app.addHook("onRequest", async request => {
      const { actor } = await dependencies.authenticate(request);
      requireRole(actor, ["admin"]);
      const ctx: Context = { actor, controller: new AbortController(), processing: false, released: false };
      contexts.set(request, ctx);
      request.raw.once("aborted", () => { ctx.controller.abort(); void release(request); });
      const mediaType = request.headers["content-type"]?.split(";")[0]?.trim().toLowerCase();
      if ((mediaType === csv || mediaType === xlsx) && !(request.method === "POST" && request.routeOptions.url === root))
        throw new AppError("IMPORT_FORMAT_UNSUPPORTED", "Izvorne datoteke šalju se samo na ulaz za uvoz.");
      if (request.method === "POST" && request.routeOptions.url === root) {
        const type = request.headers["content-type"]?.split(";")[0]?.trim().toLowerCase();
        if (type !== csv && type !== xlsx) throw new AppError("IMPORT_FORMAT_UNSUPPORTED", "Pošaljite izvornu CSV ili XLSX datoteku.");
        const query = request.query as Record<string, unknown>;
        if (!["csv", "xlsx"].includes(String(query.format)) || typeof query.policyVersion !== "string"
          || Object.keys(query).some(k => !["format", "delimiter", "policyVersion"].includes(k))
          || (query.format === "csv" ? ![",", ";"].includes(String(query.delimiter)) : query.delimiter !== undefined)
          || type !== (query.format === "csv" ? csv : xlsx)) invalid();
        if (query.policyVersion !== IMPORT_POLICY.version) throw new AppError("CONFLICT", "Obnovite pravila uvoza.");
        key(request);
        const length = request.headers["content-length"];
        if (length && (!/^\d+$/.test(length) || Number(length) > TABULAR_LIMITS.bytes))
          throw new AppError("IMPORT_FILE_TOO_LARGE", "Datoteka je prevelika.");
        ctx.token = await service().runtime.admit(actor, "create", request.id);
        if (request.raw.aborted) { ctx.controller.abort(); await release(request); throw importUnavailable(); }
      } else if (request.method === "POST" && request.routeOptions.url === root + "/:importId/commit") {
        requireRevision(request.headers["if-match"]); key(request);
        await service().runtime.admit(actor, "commit", request.id);
      }
    });
    app.addHook("onResponse", async request => { await release(request); });
    app.addHook("onError", async request => { await release(request); });
    app.addHook("onTimeout", async request => { context(request)?.controller.abort(); await release(request); });
    app.setErrorHandler((error, request, reply) => {
      const problem = importProblem(error);
      if (request.method === "POST" && request.routeOptions.url === root) reply.header("Connection", "close");
      if (problem.statusCode === 429 || problem.statusCode === 503) reply.header("Retry-After", "60");
      return reply.code(problem.statusCode).send({ code: problem.code, message: problem.message, requestId: request.id,
        ...(problem.fieldErrors ? { fieldErrors: problem.fieldErrors } : {}) });
    });
    // Scope-only parser: raw bytes never pass through JSON, multipart or rawBody.
    app.addContentTypeParser([csv, xlsx], (request, payload, done) => {
      const chunks: Buffer[] = [];
      let total = 0, finished = false;
      const finish = (error?: Error) => {
        if (finished) return;
        finished = true; clearTimeout(timer);
        context(request).controller.signal.removeEventListener("abort", aborted);
        if (error) { chunks.length = 0; payload.pause(); done(error); }
        else { const result = Buffer.concat(chunks, total); chunks.length = 0; done(null, result); }
      };
      const aborted = () => finish(importUnavailable());
      const timer = setTimeout(() => { context(request).controller.abort(); finish(importUnavailable()); }, IMPORT_RUNTIME.uploadMs);
      context(request).controller.signal.addEventListener("abort", aborted, { once: true });
      payload.on("data", (chunk: Buffer) => {
        if (finished) return;
        total += chunk.length;
        if (total > TABULAR_LIMITS.bytes) return finish(new AppError("IMPORT_FILE_TOO_LARGE", "Datoteka je prevelika."));
        chunks.push(chunk);
      });
      payload.once("error", () => finish(importUnavailable()));
      payload.once("end", () => total ? finish() : finish(new AppError("VALIDATION_FAILED", "Datoteka je prazna.")));
    });

    app.get("/api/v1/worker-import-policy", { config: { rateLimit: readRateLimit } }, async request => {
      const actor = context(request).actor;
      if (dependencies.imports) return dependencies.imports.policy(actor);
      return { version: IMPORT_POLICY.version, approvalStatus: "APPROVED", uploadEnabled: false,
        maxUploadBytes: TABULAR_LIMITS.bytes, maxRows: 1000, maxColumns: 6, formats: ["csv", "xlsx"],
        csvDelimiters: [",", ";"], sessionTtlSeconds: 86400, cleanupDeadlineSeconds: 300,
        maxNonterminalSessions: 2, maxPreviewRows: 100, lifecycleNotice: "Uvoz nije aktiviran u ovom okruženju." };
    });
    app.get<{ Querystring: Page } >("/api/v1/worker-imports", { config: { rateLimit: readRateLimit }, schema: { querystring: { type: "object", additionalProperties: false, properties: pageProperties } } }, async request =>
      service().list(context(request).actor, request.query.limit ?? 50, request.query.cursor, request.id));
    app.post<{ Body: Buffer; Querystring: { format: "csv" | "xlsx"; delimiter?: "," | ";"; policyVersion: string } }>("/api/v1/worker-imports",
      { config: { rateLimit: readRateLimit }, bodyLimit: TABULAR_LIMITS.bytes }, async (request, reply) => {
        const ctx = context(request); ctx.processing = true;
        try {
          const result = await service().create(ctx.actor, request.body, { ...request.query, delimiter: request.query.delimiter ?? "," },
            key(request), ctx.token!, ctx.controller.signal, request.id);
          reply.code(result.replayed ? 200 : 201).header("ETag", `"${result.session.revision}"`);
          return result.session;
        } finally { request.body = Buffer.alloc(0); ctx.processing = false; await release(request); }
      });
    app.get<{ Params: Params }>("/api/v1/worker-imports/:importId", { config: { rateLimit: readRateLimit }, schema: { params } }, async (request, reply) => {
      const result = await service().store.get(context(request).actor, request.params.importId, request.id);
      reply.header("ETag", `"${result.session.revision}"`);
      return { ...result.session, ...(result.result ? { result: result.result } : {}) };
    });
    app.get<{ Params: Params; Querystring: Page & { revision: string } }>("/api/v1/worker-imports/:importId/rows", {
      config: { rateLimit: readRateLimit }, schema: { params, querystring: { type: "object", additionalProperties: false, required: ["revision"], properties: {
        ...pageProperties, revision: { type: "string", pattern: "^[1-9][0-9]{0,18}$" } } } }
    }, async request => service().rows(context(request).actor, request.params.importId, requireRevision(request.query.revision),
      request.query.limit ?? 50, request.query.cursor, request.id));
    app.patch<{ Params: Params; Body: SourceMapping }>("/api/v1/worker-imports/:importId/mapping", { config: { rateLimit: readRateLimit }, schema: { params } }, async (request, reply) => {
      const result = await service().store.map(context(request).actor, request.params.importId, requireRevision(request.headers["if-match"]), request.body, request.id);
      reply.header("ETag", `"${result.revision}"`); return result;
    });
    app.post<{ Params: Params; Body: { approved: true; previewChecksum: string } }>("/api/v1/worker-imports/:importId/commit", { config: { rateLimit: readRateLimit }, schema: { params,
      body: { type: "object", additionalProperties: false, required: ["approved", "previewChecksum"], properties: {
        approved: { const: true, type: "boolean" }, previewChecksum: { type: "string", pattern: "^[a-f0-9]{64}$" } } } }
    }, async request => {
      const actor = context(request).actor, revision = requireRevision(request.headers["if-match"]), commitKey = key(request);
      return service().store.commit(actor, request.params.importId, revision, request.body, commitKey, request.id);
    });
    app.post<{ Params: Params }>("/api/v1/worker-imports/:importId/cancel", { config: { rateLimit: readRateLimit }, schema: { params } }, async (request, reply) => {
      if (request.body !== undefined) invalid();
      const result = await service().store.cancel(context(request).actor, request.params.importId, requireRevision(request.headers["if-match"]), request.id);
      reply.header("ETag", `"${result.revision}"`); return result;
    });
  });
}
