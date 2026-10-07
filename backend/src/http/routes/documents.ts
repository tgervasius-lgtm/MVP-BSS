import type { FastifyInstance } from "fastify";
import { AppError, requireRevision } from "../../domain/errors.js";
import { CATEGORIES, MAX_DOCUMENT_BYTES, documentReader, documentWriter, type DocumentService, type DocumentFilters, type DocumentUpload } from "../../documents/model.js";
import type { Authenticate } from "../app.js";

export function registerDocumentRoutes(app: FastifyInstance, dependencies: { authenticate: Authenticate; documents?: DocumentService }): void {
  const { authenticate, documents } = dependencies;
  const service = () => {
    if (!documents) throw new AppError("DOCUMENTS_UNAVAILABLE", "Sandučić dokumenata još nije aktiviran za ovo okruženje.");
    return documents;
  };
  const readRateLimit = { max: 60, timeWindow: "1 minute" };
  const activeUploads = new Set<string>();
  const params = { type: "object", additionalProperties: false, required: ["documentId"], properties: { documentId: { type: "string", format: "uuid" } } };
  app.get("/api/v1/documents/config", { config: { rateLimit: readRateLimit } }, async request => {
    const { actor } = await authenticate(request); documentReader(actor);
    return { enabled: Boolean(documents), maxBytes: MAX_DOCUMENT_BYTES };
  });
  app.get<{ Querystring: { search: string } }>("/api/v1/documents/recipients", { config: { rateLimit: readRateLimit }, schema: { querystring: {
    type: "object", additionalProperties: false, properties: { search: { type: "string", maxLength: 100, default: "" } }
  } } }, async request => {
    const { actor } = await authenticate(request); documentWriter(actor);
    return { items: await service().recipients(actor, request.query.search, request.id) };
  });
  app.get<{ Querystring: DocumentFilters }>("/api/v1/documents", { config: { rateLimit: readRateLimit }, schema: { querystring: {
    type: "object", additionalProperties: false, properties: {
      limit: { type: "integer", minimum: 1, maximum: 100, default: 25 }, cursor: { type: "string", maxLength: 256 },
      period: { type: "string", pattern: "^20[0-9]{2}-(0[1-9]|1[0-2])$" }, category: { type: "string", enum: CATEGORIES }
    }
  } } }, async request => {
    const { actor } = await authenticate(request); documentReader(actor);
    return service().list(actor, request.query, request.id);
  });
  app.post<{ Body: DocumentUpload }>("/api/v1/documents", {
    bodyLimit: Math.ceil(MAX_DOCUMENT_BYTES / 3) * 4 + 4096,
    config: { rateLimit: { max: 10, timeWindow: "1 minute" } },
    // Authorize before accepting a large request body.
    onRequest: async request => {
      const { actor } = await authenticate(request); documentWriter(actor); service();
      if (activeUploads.size >= 2) throw new AppError("RATE_LIMITED", "Provjera drugih dokumenata je u tijeku. Pokušajte ponovno uskoro.");
      activeUploads.add(request.id);
      request.raw.once("aborted", () => activeUploads.delete(request.id));
    },
    onResponse: (request, _reply, done) => { activeUploads.delete(request.id); done(); },
    onTimeout: (request, _reply, done) => { activeUploads.delete(request.id); done(); },
    schema: { body: { type: "object", additionalProperties: false,
      required: ["workerId","title","category","period","uploadId","contentBase64"], properties: {
        workerId: { type: "string", format: "uuid" }, uploadId: { type: "string", format: "uuid" },
        title: { type: "string", minLength: 2, maxLength: 120 }, category: { type: "string", enum: CATEGORIES },
        period: { anyOf: [{ type: "string", pattern: "^20[0-9]{2}-(0[1-9]|1[0-2])$" }, { type: "null" }] },
        contentBase64: { type: "string", maxLength: Math.ceil(MAX_DOCUMENT_BYTES / 3) * 4 }
      }
    } }
  }, async (request, reply) => {
    const { actor } = await authenticate(request); documentWriter(actor);
    const result = await service().upload(actor, request.body, request.id);
    reply.code(201).header("ETag", `"${result.revision}"`); return result;
  });
  const transitionSchema = { params, body: { type: "object", additionalProperties: false, required: ["confirmed"], properties: { confirmed: { type: "boolean", const: true } } } };
  const transition = (action: "publish" | "withdraw") => async (request: import("fastify").FastifyRequest<{ Params: { documentId: string } }>, reply: import("fastify").FastifyReply) => {
    const { actor } = await authenticate(request); documentWriter(actor);
    const result = await service().transition(actor, request.params.documentId, requireRevision(request.headers["if-match"]), action, request.id);
    reply.header("ETag", `"${result.revision}"`); return result;
  };
  app.post<{ Params: { documentId: string } }>("/api/v1/documents/:documentId/publish", {
    config: { rateLimit: { max: 30, timeWindow: "1 minute" } }, schema: transitionSchema
  }, transition("publish"));
  app.post<{ Params: { documentId: string } }>("/api/v1/documents/:documentId/withdraw", {
    config: { rateLimit: { max: 30, timeWindow: "1 minute" } }, schema: transitionSchema
  }, transition("withdraw"));
  app.get<{ Params: { documentId: string } }>("/api/v1/documents/:documentId/download", { config: { rateLimit: readRateLimit }, schema: { params } }, async (request, reply) => {
    const { actor } = await authenticate(request); documentReader(actor);
    const result = await service().download(actor, request.params.documentId, request.id);
    reply.type("application/pdf").header("Content-Disposition", `attachment; filename="${result.fileName}"`);
    return reply.send(result.content);
  });
}
