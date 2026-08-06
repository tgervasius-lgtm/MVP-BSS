import type { FastifyInstance, FastifyReply } from "fastify";
import { requireRevision } from "../../domain/errors.js";
import type { EntityStatus, Role } from "../../domain/types.js";
import { requireDepartmentScope, requirePermission } from "../../security/rbac.js";
import type { PhaseAService, ReportPreviewWrite, ShiftWrite, TerminalSyncEventView, WorkerWrite } from "../../services/contracts.js";
import type { Authenticate } from "../app.js";
import { paginationSchema, revisionHeaderSchema, uuidSchema } from "../schema.js";

type Dependencies = Readonly<{ phaseAService: PhaseAService; authenticate: Authenticate }>;

const idParams = (name: string) => ({
  type: "object",
  additionalProperties: false,
  required: [name],
  properties: { [name]: uuidSchema }
});
const revisionHeader = revisionHeaderSchema;
const workerBody = {
  type: "object",
  additionalProperties: false,
  required: ["code", "name", "departmentId", "shiftId", "annualLeaveAllowance"],
  properties: {
    code: { type: "string", minLength: 1, maxLength: 40 },
    name: { type: "string", minLength: 2, maxLength: 160 },
    email: { anyOf: [{ type: "string", format: "email", maxLength: 320 }, { type: "null" }] },
    departmentId: uuidSchema,
    shiftId: uuidSchema,
    annualLeaveAllowance: { type: "integer", minimum: 0, maximum: 366 }
  }
} as const;
const shiftBody = {
  type: "object",
  additionalProperties: false,
  required: ["name", "startTime", "endTime", "breakMinutes", "toleranceMinutes"],
  properties: {
    name: { type: "string", minLength: 2, maxLength: 100 },
    startTime: { type: "string", pattern: "^([01][0-9]|2[0-3]):[0-5][0-9]$" },
    endTime: { type: "string", pattern: "^([01][0-9]|2[0-3]):[0-5][0-9]$" },
    breakMinutes: { type: "integer", minimum: 0, maximum: 960 },
    toleranceMinutes: { type: "integer", minimum: 0, maximum: 240 }
  }
} as const;
const dateRangeProperties = {
  from: { type: "string", format: "date" },
  to: { type: "string", format: "date" }
} as const;
const reportTypes = ["monthly_summary", "attendance_journal", "exceptions", "approved_absences", "correction_log"] as const;
const attendanceStatuses = ["active", "complete", "late", "incomplete", "corrected"] as const;

function etag(reply: FastifyReply, revision: string): void {
  reply.header("ETag", `"${revision}"`);
}

export async function registerPhaseARoutes(app: FastifyInstance, dependencies: Dependencies): Promise<void> {
  const { phaseAService: service, authenticate } = dependencies;

  app.get<{ Querystring: { date: string } }>(
    "/api/v1/dashboard-summary",
    {
      schema: {
        querystring: {
          type: "object",
          additionalProperties: false,
          required: ["date"],
          properties: { date: { type: "string", format: "date" } }
        }
      }
    },
    async (request) => {
      const { actor } = await authenticate(request);
      return service.getDashboardSummary(actor, request.query.date);
    }
  );

  app.get("/api/v1/organization", async (request, reply) => {
    const { actor } = await authenticate(request);
    requirePermission(actor, "organization", "read");
    const result = await service.getOrganization(actor);
    etag(reply, result.revision);
    return result;
  });

  app.patch<{
    Body: { name?: string; taxIdentifier?: string; timezone?: string; approvedLeaveVisibility?: "team" | "department" | "organization" };
    Headers: { "if-match": string };
  }>(
    "/api/v1/organization",
    {
      schema: {
        headers: revisionHeader,
        body: {
          type: "object",
          additionalProperties: false,
          minProperties: 1,
          properties: {
            name: { type: "string", minLength: 2, maxLength: 160 },
            taxIdentifier: { type: "string", maxLength: 32 },
            timezone: { type: "string", minLength: 1, maxLength: 64 }
            ,approvedLeaveVisibility: { type: "string", enum: ["team", "department", "organization"] }
          }
        }
      }
    },
    async (request, reply) => {
      const { actor } = await authenticate(request);
      requirePermission(actor, "organization", "write");
      const result = await service.updateOrganization(actor, request.body, requireRevision(request.headers["if-match"]), request.id);
      etag(reply, result.revision);
      return result;
    }
  );

  app.get("/api/v1/departments", async (request) => {
    const { actor } = await authenticate(request);
    requirePermission(actor, "departments", "read");
    return service.listDepartments(actor);
  });

  app.post<{ Body: { name: string } }>(
    "/api/v1/departments",
    {
      schema: {
        body: {
          type: "object",
          additionalProperties: false,
          required: ["name"],
          properties: { name: { type: "string", minLength: 2, maxLength: 120 } }
        }
      }
    },
    async (request, reply) => {
      const { actor } = await authenticate(request);
      requirePermission(actor, "departments", "write");
      const result = await service.createDepartment(actor, request.body.name, request.id);
      etag(reply, result.revision);
      return reply.status(201).send(result);
    }
  );

  app.patch<{
    Params: { departmentId: string };
    Headers: { "if-match": string };
    Body: { name?: string; status?: EntityStatus };
  }>(
    "/api/v1/departments/:departmentId",
    {
      schema: {
        params: idParams("departmentId"),
        headers: revisionHeader,
        body: {
          type: "object",
          additionalProperties: false,
          minProperties: 1,
          properties: {
            name: { type: "string", minLength: 2, maxLength: 120 },
            status: { type: "string", enum: ["active", "blocked"] }
          }
        }
      }
    },
    async (request, reply) => {
      const { actor } = await authenticate(request);
      requirePermission(actor, "departments", "write");
      const result = await service.updateDepartment(
        actor,
        request.params.departmentId,
        request.body,
        requireRevision(request.headers["if-match"]),
        request.id
      );
      etag(reply, result.revision);
      return result;
    }
  );

  app.get<{ Querystring: { year: number } }>(
    "/api/v1/holidays",
    {
      schema: {
        querystring: {
          type: "object",
          additionalProperties: false,
          required: ["year"],
          properties: { year: { type: "integer", minimum: 2020, maximum: 2100 } }
        }
      }
    },
    async (request, reply) => {
      const { actor } = await authenticate(request);
      requirePermission(actor, "holidays", "read");
      const result = await service.listHolidays(actor, request.query.year);
      etag(reply, result.revision);
      return result.items;
    }
  );

  app.put<{
    Querystring: { year: number };
    Headers: { "if-match": string };
    Body: Array<{ date: string; name: string }>;
  }>(
    "/api/v1/holidays",
    {
      schema: {
        headers: revisionHeader,
        querystring: {
          type: "object",
          additionalProperties: false,
          required: ["year"],
          properties: { year: { type: "integer", minimum: 2020, maximum: 2100 } }
        },
        body: {
          type: "array",
          maxItems: 366,
          items: {
            type: "object",
            additionalProperties: false,
            required: ["date", "name"],
            properties: {
              date: { type: "string", format: "date" },
              name: { type: "string", minLength: 2, maxLength: 120 }
            }
          }
        }
      }
    },
    async (request, reply) => {
      const { actor } = await authenticate(request);
      requirePermission(actor, "holidays", "write");
      const result = await service.replaceHolidays(actor, request.query.year, request.body, requireRevision(request.headers["if-match"]), request.id);
      etag(reply, result.revision);
      return result.items;
    }
  );

  app.get<{ Querystring: { cursor?: string; limit?: number } }>(
    "/api/v1/users",
    {
      schema: {
        querystring: {
          type: "object",
          additionalProperties: false,
          properties: {
            ...paginationSchema
          }
        }
      }
    },
    async (request) => {
      const { actor } = await authenticate(request);
      requirePermission(actor, "users", "read");
      return service.listUsers(actor, request.query.cursor, request.query.limit ?? 50);
    }
  );

  app.post<{
    Body: { email: string; role: Role; workerId?: string | null; departmentIds?: string[] };
  }>(
    "/api/v1/users",
    {
      schema: {
        body: {
          type: "object",
          additionalProperties: false,
          required: ["email", "role"],
          properties: {
            email: { type: "string", format: "email", maxLength: 320 },
            role: { type: "string", enum: ["admin", "manager", "worker", "accountant"] },
            workerId: { anyOf: [uuidSchema, { type: "null" }] },
            departmentIds: { type: "array", uniqueItems: true, maxItems: 100, items: uuidSchema }
          }
        }
      }
    },
    async (request, reply) => {
      const { actor } = await authenticate(request);
      requirePermission(actor, "users", "write");
      const result = await service.inviteUser(actor, request.body, request.id);
      etag(reply, result.revision);
      return reply.status(202).send(result);
    }
  );

  app.patch<{
    Params: { userId: string };
    Headers: { "if-match": string };
    Body: { role?: Role; status?: EntityStatus; departmentIds?: string[] };
  }>(
    "/api/v1/users/:userId",
    {
      schema: {
        params: idParams("userId"),
        headers: revisionHeader,
        body: {
          type: "object",
          additionalProperties: false,
          minProperties: 1,
          properties: {
            role: { type: "string", enum: ["admin", "manager", "worker", "accountant"] },
            status: { type: "string", enum: ["active", "blocked"] },
            departmentIds: { type: "array", uniqueItems: true, maxItems: 100, items: uuidSchema }
          }
        }
      }
    },
    async (request, reply) => {
      const { actor } = await authenticate(request);
      requirePermission(actor, "users", "write");
      const result = await service.updateUser(actor, request.params.userId, request.body, requireRevision(request.headers["if-match"]), request.id);
      etag(reply, result.revision);
      return result;
    }
  );

  app.get<{
    Querystring: { cursor?: string; limit?: number; departmentId?: string; status?: EntityStatus; search?: string };
  }>(
    "/api/v1/workers",
    {
      schema: {
        querystring: {
          type: "object",
          additionalProperties: false,
          properties: {
            ...paginationSchema,
            departmentId: uuidSchema,
            status: { type: "string", enum: ["active", "blocked"] },
            search: { type: "string", maxLength: 100 }
          }
        }
      }
    },
    async (request) => {
      const { actor } = await authenticate(request);
      requirePermission(actor, "workers", "read");
      if (request.query.departmentId && actor.role === "manager") requireDepartmentScope(actor, request.query.departmentId);
      return service.listWorkers(actor, { ...request.query, limit: request.query.limit ?? 50 });
    }
  );

  app.post<{ Body: WorkerWrite }>(
    "/api/v1/workers",
    { schema: { body: workerBody } },
    async (request, reply) => {
      const { actor } = await authenticate(request);
      requirePermission(actor, "workers", "write");
      const result = await service.createWorker(actor, request.body, request.id);
      etag(reply, result.revision);
      return reply.status(201).send(result);
    }
  );

  app.get<{ Params: { workerId: string } }>(
    "/api/v1/workers/:workerId",
    { schema: { params: idParams("workerId") } },
    async (request, reply) => {
      const { actor } = await authenticate(request);
      if (!(actor.role === "worker" && actor.selfWorkerId === request.params.workerId)) {
        requirePermission(actor, "workers", "read");
      }
      const result = await service.getWorker(actor, request.params.workerId);
      etag(reply, result.revision);
      return result;
    }
  );

  app.patch<{ Params: { workerId: string }; Headers: { "if-match": string }; Body: WorkerWrite }>(
    "/api/v1/workers/:workerId",
    { schema: { params: idParams("workerId"), headers: revisionHeader, body: workerBody } },
    async (request, reply) => {
      const { actor } = await authenticate(request);
      requirePermission(actor, "workers", "write");
      const result = await service.updateWorker(actor, request.params.workerId, request.body, requireRevision(request.headers["if-match"]), request.id);
      etag(reply, result.revision);
      return result;
    }
  );

  app.post<{ Params: { workerId: string }; Headers: { "if-match": string } }>(
    "/api/v1/workers/:workerId/deactivate",
    { schema: { params: idParams("workerId"), headers: revisionHeader } },
    async (request, reply) => {
      const { actor } = await authenticate(request);
      requirePermission(actor, "workers", "write");
      const result = await service.deactivateWorker(actor, request.params.workerId, requireRevision(request.headers["if-match"]), request.id);
      etag(reply, result.revision);
      return result;
    }
  );

  app.post<{ Params: { workerId: string }; Headers: { "if-match": string } }>(
    "/api/v1/workers/:workerId/activate",
    { schema: { params: idParams("workerId"), headers: revisionHeader } },
    async (request, reply) => {
      const { actor } = await authenticate(request);
      requirePermission(actor, "workers", "write");
      const result = await service.activateWorker(actor, request.params.workerId, requireRevision(request.headers["if-match"]), request.id);
      etag(reply, result.revision);
      return result;
    }
  );

  app.get("/api/v1/shifts", async (request) => {
    const { actor } = await authenticate(request);
    requirePermission(actor, "shifts", "read");
    return service.listShifts(actor);
  });

  app.post<{ Body: ShiftWrite }>(
    "/api/v1/shifts",
    { schema: { body: shiftBody } },
    async (request, reply) => {
      const { actor } = await authenticate(request);
      requirePermission(actor, "shifts", "write");
      const result = await service.createShift(actor, request.body, request.id);
      etag(reply, result.revision);
      return reply.status(201).send(result);
    }
  );

  app.patch<{ Params: { shiftId: string }; Headers: { "if-match": string }; Body: ShiftWrite }>(
    "/api/v1/shifts/:shiftId",
    { schema: { params: idParams("shiftId"), headers: revisionHeader, body: shiftBody } },
    async (request, reply) => {
      const { actor } = await authenticate(request);
      requirePermission(actor, "shifts", "write");
      const result = await service.updateShift(actor, request.params.shiftId, request.body, requireRevision(request.headers["if-match"]), request.id);
      etag(reply, result.revision);
      return result;
    }
  );

  app.get<{ Params: { workerId: string } }>(
    "/api/v1/workers/:workerId/rfid-cards",
    { schema: { params: idParams("workerId") } },
    async (request) => {
      const { actor } = await authenticate(request);
      requirePermission(actor, "workers", "read");
      return service.listWorkerRfidCards(actor, request.params.workerId);
    }
  );

  app.post<{ Params: { workerId: string }; Body: { uid: string; validFrom?: string } }>(
    "/api/v1/workers/:workerId/rfid-cards",
    {
      schema: {
        params: idParams("workerId"),
        body: {
          type: "object",
          additionalProperties: false,
          required: ["uid"],
          properties: {
            uid: { type: "string", minLength: 8, maxLength: 128 },
            validFrom: { type: "string", format: "date-time" }
          }
        }
      }
    },
    async (request, reply) => {
      const { actor } = await authenticate(request);
      requirePermission(actor, "workers", "write");
      const result = await service.assignWorkerRfidCard(actor, request.params.workerId, request.body, request.id);
      etag(reply, result.revision);
      return reply.status(201).send(result);
    }
  );

  app.post<{ Params: { cardId: string } }>(
    "/api/v1/rfid-cards/:cardId/block",
    { schema: { params: idParams("cardId") } },
    async (request, reply) => {
      const { actor } = await authenticate(request);
      requirePermission(actor, "workers", "write");
      const result = await service.blockRfidCard(actor, request.params.cardId, request.id);
      etag(reply, result.revision);
      return result;
    }
  );

  app.get<{
    Querystring: { year: number; departmentId?: string; workerId?: string; cursor?: string; limit?: number };
  }>(
    "/api/v1/leave-balances",
    {
      schema: {
        querystring: {
          type: "object",
          additionalProperties: false,
          required: ["year"],
          properties: {
            year: { type: "integer", minimum: 2020, maximum: 2100 },
            departmentId: uuidSchema,
            workerId: uuidSchema,
            ...paginationSchema
          }
        }
      }
    },
    async (request) => {
      const { actor } = await authenticate(request);
      requirePermission(actor, "leave", "read");
      if (request.query.departmentId && actor.role === "manager") requireDepartmentScope(actor, request.query.departmentId);
      return service.listLeaveBalances(actor, { ...request.query, limit: request.query.limit ?? 50 });
    }
  );

  app.post<{ Body: ReportPreviewWrite }>(
    "/api/v1/report-previews",
    {
      schema: {
        body: {
          type: "object",
          additionalProperties: false,
          required: ["reportType", "periodFrom", "periodTo"],
          properties: {
            reportType: { type: "string", enum: reportTypes },
            periodFrom: { type: "string", format: "date" },
            periodTo: { type: "string", format: "date" },
            departmentId: { anyOf: [uuidSchema, { type: "null" }] },
            workerId: { anyOf: [uuidSchema, { type: "null" }] },
            attendanceStatus: { anyOf: [{ type: "string", enum: attendanceStatuses }, { type: "null" }] },
            limit: { type: "integer", minimum: 1, maximum: 200, default: 100 }
          }
        }
      }
    },
    async (request) => {
      const { actor } = await authenticate(request);
      requirePermission(actor, "reports", "read");
      if (request.body.departmentId && actor.role === "manager") requireDepartmentScope(actor, request.body.departmentId);
      return service.createReportPreview(actor, request.body);
    }
  );

  app.get<{
    Params: { terminalId: string };
    Querystring: { from: string; to: string; eventStatus?: TerminalSyncEventView["status"]; cursor?: string; limit?: number };
  }>(
    "/api/v1/terminals/:terminalId/sync-events",
    {
      schema: {
        params: idParams("terminalId"),
        querystring: {
          type: "object",
          additionalProperties: false,
          required: ["from", "to"],
          properties: {
            ...dateRangeProperties,
            eventStatus: { type: "string", enum: ["queued", "synced", "duplicate", "rejected"] },
            ...paginationSchema
          }
        }
      }
    },
    async (request) => {
      const { actor } = await authenticate(request);
      requirePermission(actor, "terminals", "read");
      return service.listTerminalSyncEvents(actor, request.params.terminalId, {
        ...request.query,
        limit: request.query.limit ?? 50
      });
    }
  );
}
