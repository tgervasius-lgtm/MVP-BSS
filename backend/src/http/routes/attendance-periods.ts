import type { FastifyInstance, FastifyReply } from "fastify";
import { AppError } from "../../domain/errors.js";
import { requirePermission, requireRole } from "../../security/rbac.js";
import type { AttendancePeriodTransitionWrite, MvpService } from "../../services/contracts.js";
import type { Authenticate } from "../app.js";

type Dependencies = Readonly<{ mvpService: MvpService; authenticate: Authenticate }>;
type PeriodParams = { year: number; month: number };
type TransitionHeaders = { "if-match": string; "idempotency-key": string };

const readRateLimit = { max: 60, timeWindow: "1 minute" } as const;
const transitionRateLimit = { max: 30, timeWindow: "1 minute" } as const;
const periodParams = {
  type: "object", additionalProperties: false, required: ["year", "month"],
  properties: { year: { type: "integer", minimum: 2020, maximum: 2100 }, month: { type: "integer", minimum: 1, maximum: 12 } }
} as const;
const transitionHeaders = {
  type: "object", required: ["if-match", "idempotency-key"],
  properties: {
    "if-match": { type: "string", pattern: "^(?:W/)?(?:\"[0-9]{1,19}\"|[0-9]{1,19})$" },
    "idempotency-key": { type: "string", minLength: 8, maxLength: 128, pattern: "^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$" }
  }
} as const;
const transitionBody = {
  type: "object", additionalProperties: false, required: ["reason"],
  properties: { reason: { type: "string", minLength: 3, maxLength: 1000 } }
} as const;

function etag(reply: FastifyReply, revision: string): void {
  reply.header("ETag", `"${revision}"`);
}

function revision(value: string | undefined): string {
  const normalized = value?.trim().replace(/^W\//, "").replace(/^"([^"]+)"$/, "$1") ?? "";
  if (!/^\d{1,19}$/.test(normalized) || BigInt(normalized) > 9_223_372_036_854_775_807n) {
    throw new AppError("VALIDATION_FAILED", "If-Match mora sadržavati valjanu reviziju razdoblja.");
  }
  return normalized;
}

export async function registerAttendancePeriodRoutes(app: FastifyInstance, dependencies: Dependencies): Promise<void> {
  const { mvpService: service, authenticate } = dependencies;

  app.get<{ Params: PeriodParams }>(
    "/api/v1/attendance-periods/:year/:month",
    { config: { rateLimit: readRateLimit }, schema: { params: periodParams } },
    async (request, reply) => {
      const { actor } = await authenticate(request);
      requirePermission(actor, "reports", "read");
      const result = await service.getAttendancePeriod(actor, request.params.year, request.params.month);
      etag(reply, result.revision);
      return result;
    }
  );

  app.post<{ Params: PeriodParams; Headers: TransitionHeaders; Body: AttendancePeriodTransitionWrite }>(
    "/api/v1/attendance-periods/:year/:month/review",
    { config: { rateLimit: transitionRateLimit }, schema: { params: periodParams, headers: transitionHeaders, body: transitionBody } },
    async (request, reply) => {
      const { actor } = await authenticate(request);
      requirePermission(actor, "reports", "write");
      requireRole(actor, ["admin"]);
      const result = await service.startAttendancePeriodReview(actor, request.params.year, request.params.month,
        request.body, revision(request.headers["if-match"]), request.headers["idempotency-key"], request.id);
      etag(reply, result.revision);
      return result;
    }
  );

  app.post<{ Params: PeriodParams; Headers: TransitionHeaders; Body: AttendancePeriodTransitionWrite }>(
    "/api/v1/attendance-periods/:year/:month/finalize",
    { config: { rateLimit: transitionRateLimit }, schema: { params: periodParams, headers: transitionHeaders, body: transitionBody } },
    async (request, reply) => {
      const { actor } = await authenticate(request);
      requirePermission(actor, "reports", "write");
      requireRole(actor, ["admin"]);
      const result = await service.finalizeAttendancePeriod(actor, request.params.year, request.params.month,
        request.body, revision(request.headers["if-match"]), request.headers["idempotency-key"], request.id);
      etag(reply, result.revision);
      return result;
    }
  );

  app.post<{ Params: PeriodParams; Headers: TransitionHeaders; Body: AttendancePeriodTransitionWrite }>(
    "/api/v1/attendance-periods/:year/:month/close",
    { config: { rateLimit: transitionRateLimit }, schema: { params: periodParams, headers: transitionHeaders, body: transitionBody } },
    async (request, reply) => {
      const { actor } = await authenticate(request);
      requirePermission(actor, "reports", "write");
      requireRole(actor, ["admin"]);
      const result = await service.closeAttendancePeriod(actor, request.params.year, request.params.month,
        request.body, revision(request.headers["if-match"]), request.headers["idempotency-key"], request.id);
      etag(reply, result.revision);
      return result;
    }
  );

  app.post<{ Params: PeriodParams; Headers: TransitionHeaders; Body: AttendancePeriodTransitionWrite }>(
    "/api/v1/attendance-periods/:year/:month/reopen",
    { config: { rateLimit: transitionRateLimit }, schema: { params: periodParams, headers: transitionHeaders, body: transitionBody } },
    async (request, reply) => {
      const { actor } = await authenticate(request);
      requirePermission(actor, "reports", "write");
      requireRole(actor, ["admin"]);
      const result = await service.reopenAttendancePeriod(actor, request.params.year, request.params.month,
        request.body, revision(request.headers["if-match"]), request.headers["idempotency-key"], request.id);
      etag(reply, result.revision);
      return result;
    }
  );
}
