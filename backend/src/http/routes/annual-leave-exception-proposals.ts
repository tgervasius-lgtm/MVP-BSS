import type { FastifyInstance } from "fastify";
import { AppError, requireRevision } from "../../domain/errors.js";
import { requirePermission, requireRole } from "../../security/rbac.js";
import {
  alternateLeaveTypes, type ExceptionDate, type PgAnnualLeaveExceptionProposalService
} from "../../services/annual-leave-exception-proposals.js";
import type { Authenticate } from "../app.js";
import { revisionHeaderSchema, uuidSchema } from "../schema.js";

export type AnnualLeaveExceptionProposals = Pick<PgAnnualLeaveExceptionProposalService, "propose" | "read" | "confirm">;

export type AnnualLeaveExceptionApproval = Pick<PgAnnualLeaveExceptionProposalService, "approve">;

const path = "/api/v1/leave-requests/:requestId/exception-proposal";
const params = {
  type: "object", additionalProperties: false, required: ["requestId"], properties: { requestId: uuidSchema }
} as const;
const dates = {
  type: "array", minItems: 1, maxItems: 366, uniqueItems: true,
  items: {
    type: "object", additionalProperties: false, required: ["date", "type"],
    properties: {
      date: { type: "string", format: "date" },
      type: { type: "string", enum: ["annual_leave", ...alternateLeaveTypes] }
    }
  }
} as const;
const writeOptions = { config: { rateLimit: { max: 60, timeWindow: "1 minute" } } } as const;
type Params = { requestId: string };
type Headers = { "if-match": string };
type DateSelection = { dates: ExceptionDate[] };

export function registerAnnualLeaveExceptionProposalRoutes(
  app: FastifyInstance, service: AnnualLeaveExceptionProposals, authenticate: Authenticate,
  approval?: AnnualLeaveExceptionApproval
): void {
  app.get<{ Params: Params }>(path,
    { config: { rateLimit: { max: 120, timeWindow: "1 minute" } }, schema: { params } }, async (request, reply) => {
      const { actor } = await authenticate(request);
      requirePermission(actor, "leave", "read");
      const result = await service.read(actor, request.params.requestId, request.id);
      reply.header("ETag", `"${result.revision}"`);
      return result;
    }
  );

  app.post<{ Params: Params; Headers: Headers; Body: DateSelection & { reason: string } }>(
    path, {
      ...writeOptions,
      schema: { params, headers: revisionHeaderSchema, body: {
        type: "object", additionalProperties: false, required: ["dates", "reason"],
        properties: { dates, reason: { type: "string", minLength: 1, maxLength: 500 } }
      } }
    }, async (request, reply) => {
      const { actor } = await authenticate(request);
      requirePermission(actor, "leave", "write");
      requireRole(actor, ["admin"]);
      const revision = requireRevision(request.headers["if-match"]);
      const result = await service.propose(actor, request.params.requestId, revision, request.body, request.id);
      return reply.code(201).header("ETag", `"${result.revision}"`).send(result);
    }
  );

  app.post<{ Params: Params; Headers: Headers; Body: DateSelection }>(
    `${path}/confirm`, {
      ...writeOptions,
      schema: { params, headers: revisionHeaderSchema, body: {
        type: "object", additionalProperties: false, required: ["dates"], properties: { dates }
      } }
    }, async (request, reply) => {
      const { actor } = await authenticate(request);
      requirePermission(actor, "leave", "write");
      requireRole(actor, ["worker"]);
      const revision = requireRevision(request.headers["if-match"]);
      const result = await service.confirm(actor, request.params.requestId, revision, request.body.dates, request.id);
      reply.header("ETag", `"${result.revision}"`);
      return result;
    }
  );

  if (approval) {
    app.post<{ Params: Params; Headers: Headers }>(
      `${path}/approve`,
      { config: { rateLimit: { max: 30, timeWindow: "1 minute" } }, schema: { params, headers: revisionHeaderSchema } },
      async (request, reply) => {
        const { actor } = await authenticate(request);
        requirePermission(actor, "leave", "write");
        requireRole(actor, ["admin", "manager"]);
        if (request.body !== undefined) throw new AppError("VALIDATION_FAILED", "Odobrenje preuzima potvrđeni prijedlog.");
        const revision = requireRevision(request.headers["if-match"]);
        const result = await approval.approve(actor, request.params.requestId, revision, request.id);
        reply.header("ETag", `"${result.revision}"`);
        return result;
      }
    );
  }
}
