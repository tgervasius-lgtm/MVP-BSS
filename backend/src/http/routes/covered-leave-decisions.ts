import type { FastifyInstance } from "fastify";
import { AppError, requireRevision } from "../../domain/errors.js";
import { requirePermission, requireRole } from "../../security/rbac.js";
import type { CoveredDate, PgAnnualLeaveReservationService } from "../../services/pg-annual-leave-reservation-service.js";
import type { Authenticate } from "../app.js";
import { revisionHeaderSchema, uuidSchema } from "../schema.js";

export type CoveredLeaveDecisions = Pick<PgAnnualLeaveReservationService,
  "readCoveredDecision" | "confirmCoveredDates" | "approveConfirmedCoveredDates">;

const params = {
  type: "object", additionalProperties: false, required: ["requestId"], properties: { requestId: uuidSchema }
} as const;
const confirmationBody = {
  type: "object", required: ["dates"], additionalProperties: false,
  properties: {
    dates: {
      type: "array", minItems: 1, maxItems: 366, uniqueItems: true,
      items: {
        type: "object", required: ["date", "type"], additionalProperties: false,
        properties: { date: { type: "string", format: "date" }, type: { type: "string", const: "annual_leave" } }
      }
    }
  }
} as const;
type RequestParams = { requestId: string };
type RevisionHeaders = { "if-match": string };

export function registerCoveredLeaveDecisionRoutes(
  app: FastifyInstance, service: CoveredLeaveDecisions, authenticate: Authenticate
): void {
  app.get<{ Params: RequestParams }>(
    "/api/v1/leave-requests/:requestId/covered-dates",
    { config: { rateLimit: { max: 120, timeWindow: "1 minute" } }, schema: { params } },
    async (request, reply) => {
      const { actor } = await authenticate(request);
      requirePermission(actor, "leave", "read");
      requireRole(actor, ["worker", "manager", "admin"]);
      const result = await service.readCoveredDecision(actor, request.params.requestId, request.id);
      reply.header("ETag", `"${result.revision}"`);
      return result;
    }
  );
  app.post<{ Params: RequestParams; Headers: RevisionHeaders; Body: { dates: CoveredDate[] } }>(
    "/api/v1/leave-requests/:requestId/covered-dates/confirm",
    { config: { rateLimit: { max: 60, timeWindow: "1 minute" } },
      schema: { params, headers: revisionHeaderSchema, body: confirmationBody } },
    async (request, reply) => {
      const { actor } = await authenticate(request);
      requirePermission(actor, "leave", "write");
      requireRole(actor, ["worker"]);
      const revision = requireRevision(request.headers["if-match"]);
      const result = await service.confirmCoveredDates(actor, request.params.requestId, revision, request.body.dates, request.id);
      reply.header("ETag", `"${result.revision}"`);
      return { ...result, status: "pending" as const };
    }
  );
  app.post<{ Params: RequestParams; Headers: RevisionHeaders }>(
    "/api/v1/leave-requests/:requestId/covered-dates/approve",
    { config: { rateLimit: { max: 30, timeWindow: "1 minute" } }, schema: { params, headers: revisionHeaderSchema } },
    async (request, reply) => {
      const { actor } = await authenticate(request);
      requirePermission(actor, "leave", "write");
      requireRole(actor, ["manager", "admin"]);
      if (request.body !== undefined) throw new AppError("VALIDATION_FAILED", "Odobrenje preuzima samo datume potvrđene revizije.");
      const revision = requireRevision(request.headers["if-match"]);
      const result = await service.approveConfirmedCoveredDates(actor, request.params.requestId, revision, request.id);
      reply.header("ETag", `"${result.revision}"`);
      return result;
    }
  );
}
