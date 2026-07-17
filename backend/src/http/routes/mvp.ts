import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { requireRevision } from "../../domain/errors.js";
import { requireDepartmentScope, requirePermission } from "../../security/rbac.js";
import type {
  AttendanceStatus,
  CorrectionRequestWrite,
  DeviceRequestProof,
  LeaveRequestWrite,
  MvpService,
  ReportExportWrite,
  RequestStatus,
  TerminalEventBatchWrite,
  TerminalHeartbeatWrite,
  TerminalPairWrite
} from "../../services/contracts.js";
import type { Authenticate } from "../app.js";

type Dependencies = Readonly<{ mvpService: MvpService; authenticate: Authenticate }>;

const uuid = { type: "string", pattern: "^[0-9a-fA-F-]{36}$" } as const;
const idParams = (name: string) => ({
  type: "object",
  additionalProperties: false,
  required: [name],
  properties: { [name]: uuid }
});
const revisionHeader = {
  type: "object",
  required: ["if-match"],
  properties: { "if-match": { type: "string", minLength: 1, maxLength: 64 } }
} as const;
const pagination = {
  cursor: { type: "string" },
  limit: { type: "integer", minimum: 1, maximum: 200, default: 50 }
} as const;
const dateRange = {
  from: { type: "string", format: "date" },
  to: { type: "string", format: "date" }
} as const;
const requestStatuses = ["pending", "approved", "rejected", "cancelled"] as const;
const attendanceStatuses = ["active", "complete", "late", "incomplete", "corrected"] as const;
const reportTypes = ["monthly_summary", "attendance_journal", "exceptions", "approved_absences", "correction_log"] as const;

function etag(reply: FastifyReply, revision: string): void {
  reply.header("ETag", `"${revision}"`);
}

function deviceProof(request: FastifyRequest): DeviceRequestProof {
  const terminalId = request.headers["x-bss-device-id"];
  const timestamp = request.headers["x-bss-timestamp"];
  const nonce = request.headers["x-bss-nonce"];
  const signature = request.headers["x-bss-signature"];
  if ([terminalId, timestamp, nonce, signature].some((value) => typeof value !== "string")) {
    throw new Error("Device headers were not validated");
  }
  const rawBody = "rawBody" in request && Buffer.isBuffer(request.rawBody)
    ? request.rawBody
    : Buffer.from(JSON.stringify(request.body ?? null), "utf8");
  return {
    terminalId: terminalId as string,
    timestamp: timestamp as string,
    nonce: nonce as string,
    signature: signature as string,
    method: request.method,
    path: request.url.split("?")[0] ?? request.url,
    rawBody
  };
}

const deviceHeaders = {
  type: "object",
  required: ["x-bss-device-id", "x-bss-timestamp", "x-bss-nonce", "x-bss-signature"],
  properties: {
    "x-bss-device-id": uuid,
    "x-bss-timestamp": { type: "string", format: "date-time" },
    "x-bss-nonce": { type: "string", minLength: 22, maxLength: 128 },
    "x-bss-signature": { type: "string", pattern: "^[a-f0-9]{64}$" }
  }
} as const;

export async function registerMvpRoutes(app: FastifyInstance, dependencies: Dependencies): Promise<void> {
  const { mvpService: service, authenticate } = dependencies;

  app.get<{ Querystring: { from: string; to: string } }>(
    "/api/v1/approved-leave-calendar",
    {
      schema: {
        querystring: { type: "object", additionalProperties: false, required: ["from", "to"], properties: dateRange }
      }
    },
    async (request) => {
      const { actor } = await authenticate(request);
      requirePermission(actor, "leave", "read");
      return service.listApprovedLeaveCalendar(actor, request.query);
    }
  );

  app.get<{
    Querystring: { from: string; to: string; departmentId?: string; workerId?: string; attendanceStatus?: AttendanceStatus; cursor?: string; limit?: number };
  }>(
    "/api/v1/attendance",
    {
      schema: {
        querystring: {
          type: "object", additionalProperties: false, required: ["from", "to"],
          properties: { ...dateRange, departmentId: uuid, workerId: uuid, attendanceStatus: { type: "string", enum: attendanceStatuses }, ...pagination }
        }
      }
    },
    async (request) => {
      const { actor } = await authenticate(request);
      requirePermission(actor, "attendance", "read");
      if (request.query.departmentId && actor.role === "manager") requireDepartmentScope(actor, request.query.departmentId);
      return service.listAttendance(actor, { ...request.query, limit: request.query.limit ?? 50 });
    }
  );

  app.get<{ Params: { workerId: string }; Querystring: { from: string; to: string } }>(
    "/api/v1/workers/:workerId/attendance",
    {
      schema: {
        params: idParams("workerId"),
        querystring: { type: "object", additionalProperties: false, required: ["from", "to"], properties: dateRange }
      }
    },
    async (request) => {
      const { actor } = await authenticate(request);
      requirePermission(actor, "attendance", "read");
      return service.getWorkerAttendance(actor, request.params.workerId, request.query);
    }
  );

  app.get<{
    Querystring: { from: string; to: string; departmentId?: string; leaveStatus?: RequestStatus };
  }>(
    "/api/v1/leave-requests",
    {
      schema: {
        querystring: {
          type: "object", additionalProperties: false, required: ["from", "to"],
          properties: { ...dateRange, departmentId: uuid, leaveStatus: { type: "string", enum: requestStatuses } }
        }
      }
    },
    async (request) => {
      const { actor } = await authenticate(request);
      requirePermission(actor, "leave", "read");
      if (request.query.departmentId && actor.role === "manager") requireDepartmentScope(actor, request.query.departmentId);
      return service.listLeaveRequests(actor, { ...request.query, limit: 200 });
    }
  );

  app.post<{ Body: LeaveRequestWrite }>(
    "/api/v1/leave-requests",
    {
      schema: {
        body: {
          type: "object", additionalProperties: false, required: ["typeCode", "startDate", "endDate"],
          properties: {
            typeCode: { type: "string", enum: ["annual_leave", "paid_leave", "unpaid_leave", "free_day"] },
            startDate: { type: "string", format: "date" }, endDate: { type: "string", format: "date" },
            note: { type: "string", maxLength: 1000 }
          }
        }
      }
    },
    async (request, reply) => {
      const { actor } = await authenticate(request);
      requirePermission(actor, "leave", "write");
      if (actor.role !== "worker") return reply.status(403).send({ code: "FORBIDDEN", message: "Samo radnik može predati vlastiti zahtjev.", requestId: request.id });
      const result = await service.createLeaveRequest(actor, request.body, request.id);
      etag(reply, result.revision);
      return reply.status(201).send(result);
    }
  );

  const decisionBody = {
    type: "object", additionalProperties: false, properties: { note: { type: "string", maxLength: 1000 } }
  } as const;
  const requiredDecisionBody = {
    type: "object", additionalProperties: false, required: ["note"], properties: { note: { type: "string", minLength: 2, maxLength: 1000 } }
  } as const;

  app.post<{ Params: { requestId: string }; Headers: { "if-match": string }; Body: { note?: string } }>(
    "/api/v1/leave-requests/:requestId/approve",
    { schema: { params: idParams("requestId"), headers: revisionHeader, body: decisionBody } },
    async (request, reply) => {
      const { actor } = await authenticate(request);
      requirePermission(actor, "leave", "write");
      if (!['admin', 'manager'].includes(actor.role)) return reply.status(403).send({ code: "FORBIDDEN", message: "Nemate ovlast za odluku.", requestId: request.id });
      const result = await service.approveLeaveRequest(actor, request.params.requestId, requireRevision(request.headers["if-match"]), request.body.note, request.id);
      etag(reply, result.revision);
      return result;
    }
  );

  app.post<{ Params: { requestId: string }; Headers: { "if-match": string }; Body: { note: string } }>(
    "/api/v1/leave-requests/:requestId/reject",
    { schema: { params: idParams("requestId"), headers: revisionHeader, body: requiredDecisionBody } },
    async (request, reply) => {
      const { actor } = await authenticate(request);
      requirePermission(actor, "leave", "write");
      if (!['admin', 'manager'].includes(actor.role)) return reply.status(403).send({ code: "FORBIDDEN", message: "Nemate ovlast za odluku.", requestId: request.id });
      const result = await service.rejectLeaveRequest(actor, request.params.requestId, requireRevision(request.headers["if-match"]), request.body.note, request.id);
      etag(reply, result.revision);
      return result;
    }
  );

  app.post<{ Params: { requestId: string }; Headers: { "if-match": string } }>(
    "/api/v1/leave-requests/:requestId/cancel",
    { schema: { params: idParams("requestId"), headers: revisionHeader } },
    async (request, reply) => {
      const { actor } = await authenticate(request);
      requirePermission(actor, "leave", "write");
      if (actor.role !== "worker") return reply.status(403).send({ code: "FORBIDDEN", message: "Samo radnik može poništiti vlastiti zahtjev.", requestId: request.id });
      const result = await service.cancelOwnLeaveRequest(actor, request.params.requestId, requireRevision(request.headers["if-match"]), request.id);
      etag(reply, result.revision);
      return result;
    }
  );

  app.get<{ Querystring: { from: string; to: string; correctionStatus?: RequestStatus } }>(
    "/api/v1/correction-requests",
    {
      schema: {
        querystring: { type: "object", additionalProperties: false, required: ["from", "to"], properties: { ...dateRange, correctionStatus: { type: "string", enum: requestStatuses } } }
      }
    },
    async (request) => {
      const { actor } = await authenticate(request);
      requirePermission(actor, "corrections", "read");
      return service.listCorrectionRequests(actor, { ...request.query, limit: 200 });
    }
  );

  app.post<{ Body: CorrectionRequestWrite }>(
    "/api/v1/correction-requests",
    {
      schema: {
        body: {
          type: "object", additionalProperties: false, required: ["attendanceDayId", "newCheckIn", "newCheckOut", "reason"],
          properties: { attendanceDayId: uuid, newCheckIn: { type: "string", format: "date-time" }, newCheckOut: { type: "string", format: "date-time" }, reason: { type: "string", minLength: 2, maxLength: 1000 } }
        }
      }
    },
    async (request, reply) => {
      const { actor } = await authenticate(request);
      requirePermission(actor, "corrections", "write");
      if (actor.role !== "worker") return reply.status(403).send({ code: "FORBIDDEN", message: "Samo radnik može zatražiti vlastitu korekciju.", requestId: request.id });
      const result = await service.createCorrectionRequest(actor, request.body, request.id);
      etag(reply, result.revision);
      return reply.status(201).send(result);
    }
  );

  app.post<{ Params: { requestId: string }; Headers: { "if-match": string }; Body: { note?: string } }>(
    "/api/v1/correction-requests/:requestId/approve",
    { schema: { params: idParams("requestId"), headers: revisionHeader, body: decisionBody } },
    async (request, reply) => {
      const { actor } = await authenticate(request);
      requirePermission(actor, "corrections", "write");
      if (!['admin', 'manager'].includes(actor.role)) return reply.status(403).send({ code: "FORBIDDEN", message: "Nemate ovlast za odluku.", requestId: request.id });
      const result = await service.approveCorrectionRequest(actor, request.params.requestId, requireRevision(request.headers["if-match"]), request.body.note, request.id);
      etag(reply, result.request.revision);
      return result;
    }
  );

  app.post<{ Params: { requestId: string }; Headers: { "if-match": string }; Body: { note: string } }>(
    "/api/v1/correction-requests/:requestId/reject",
    { schema: { params: idParams("requestId"), headers: revisionHeader, body: requiredDecisionBody } },
    async (request, reply) => {
      const { actor } = await authenticate(request);
      requirePermission(actor, "corrections", "write");
      if (!['admin', 'manager'].includes(actor.role)) return reply.status(403).send({ code: "FORBIDDEN", message: "Nemate ovlast za odluku.", requestId: request.id });
      const result = await service.rejectCorrectionRequest(actor, request.params.requestId, requireRevision(request.headers["if-match"]), request.body.note, request.id);
      etag(reply, result.revision);
      return result;
    }
  );

  app.post<{ Params: { requestId: string }; Headers: { "if-match": string } }>(
    "/api/v1/correction-requests/:requestId/cancel",
    { schema: { params: idParams("requestId"), headers: revisionHeader } },
    async (request, reply) => {
      const { actor } = await authenticate(request);
      requirePermission(actor, "corrections", "write");
      if (actor.role !== "worker") return reply.status(403).send({ code: "FORBIDDEN", message: "Samo radnik može poništiti vlastiti zahtjev.", requestId: request.id });
      const result = await service.cancelOwnCorrectionRequest(actor, request.params.requestId, requireRevision(request.headers["if-match"]), request.id);
      etag(reply, result.revision);
      return result;
    }
  );

  app.get<{ Querystring: { cursor?: string; limit?: number } }>(
    "/api/v1/report-exports",
    { schema: { querystring: { type: "object", additionalProperties: false, properties: pagination } } },
    async (request) => {
      const { actor } = await authenticate(request);
      requirePermission(actor, "reports", "read");
      return service.listReportExports(actor, request.query.cursor, request.query.limit ?? 50);
    }
  );

  app.post<{ Body: ReportExportWrite }>(
    "/api/v1/report-exports",
    {
      schema: {
        body: {
          type: "object", additionalProperties: false, required: ["reportType", "format", "periodFrom", "periodTo"],
          properties: {
            reportType: { type: "string", enum: reportTypes }, format: { type: "string", enum: ["csv", "xlsx", "pdf"] },
            periodFrom: { type: "string", format: "date" }, periodTo: { type: "string", format: "date" },
            departmentId: { anyOf: [uuid, { type: "null" }] }, workerId: { anyOf: [uuid, { type: "null" }] },
            attendanceStatus: { anyOf: [{ type: "string", enum: attendanceStatuses }, { type: "null" }] }
          }
        }
      }
    },
    async (request, reply) => {
      const { actor } = await authenticate(request);
      requirePermission(actor, "reports", "write");
      if (request.body.departmentId && actor.role === "manager") requireDepartmentScope(actor, request.body.departmentId);
      return reply.status(202).send(await service.createReportExport(actor, request.body, request.id));
    }
  );

  app.get<{ Params: { exportId: string } }>(
    "/api/v1/report-exports/:exportId",
    { schema: { params: idParams("exportId") } },
    async (request) => {
      const { actor } = await authenticate(request);
      requirePermission(actor, "reports", "read");
      return service.getReportExport(actor, request.params.exportId);
    }
  );

  app.get<{ Params: { exportId: string } }>(
    "/api/v1/report-exports/:exportId/download",
    { schema: { params: idParams("exportId") } },
    async (request, reply) => {
      const { actor } = await authenticate(request);
      requirePermission(actor, "reports", "read");
      const artifact = await service.downloadReportExport(actor, request.params.exportId);
      reply.header("Content-Type", artifact.mimeType);
      reply.header("Content-Disposition", `attachment; filename="${artifact.fileName.replaceAll('"', '')}"`);
      reply.header("Content-Length", artifact.content.length);
      reply.header("X-Content-SHA256", artifact.checksumSha256);
      return reply.send(artifact.content);
    }
  );

  app.get<{
    Querystring: { from: string; to: string; module?: string; entityId?: string; cursor?: string; limit?: number };
  }>(
    "/api/v1/audit-events",
    {
      schema: {
        querystring: { type: "object", additionalProperties: false, required: ["from", "to"], properties: { ...dateRange, module: { type: "string", maxLength: 80 }, entityId: uuid, ...pagination } }
      }
    },
    async (request) => {
      const { actor } = await authenticate(request);
      requirePermission(actor, "audit", "read");
      return service.listAuditEvents(actor, { ...request.query, limit: request.query.limit ?? 50 });
    }
  );

  app.get("/api/v1/terminals", async (request) => {
    const { actor } = await authenticate(request);
    requirePermission(actor, "terminals", "read");
    return service.listTerminals(actor);
  });

  app.post<{ Body: TerminalPairWrite }>(
    "/api/v1/terminals/pair",
    {
      schema: {
        body: {
          type: "object", additionalProperties: false, required: ["activationCode", "name", "location"],
          properties: { activationCode: { type: "string", minLength: 8, maxLength: 256 }, name: { type: "string", minLength: 2, maxLength: 120 }, location: { type: "string", minLength: 2, maxLength: 160 } }
        }
      }
    },
    async (request, reply) => {
      const { actor } = await authenticate(request);
      requirePermission(actor, "terminals", "write");
      return reply.status(201).send(await service.pairTerminal(actor, request.body, request.id));
    }
  );

  app.post<{ Params: { terminalId: string }; Headers: { "if-match": string } }>(
    "/api/v1/terminals/:terminalId/revoke",
    { schema: { params: idParams("terminalId"), headers: revisionHeader } },
    async (request, reply) => {
      const { actor } = await authenticate(request);
      requirePermission(actor, "terminals", "write");
      const result = await service.revokeTerminal(actor, request.params.terminalId, requireRevision(request.headers["if-match"]), request.id);
      etag(reply, result.revision);
      return result;
    }
  );

  app.post<{ Body: TerminalEventBatchWrite }>(
    "/api/v1/terminal/v1/events/batch",
    {
      config: { rawBody: true },
      schema: {
        headers: deviceHeaders,
        body: {
          type: "object", additionalProperties: false, required: ["batchId", "sentAt", "events"],
          properties: {
            batchId: uuid, sentAt: { type: "string", format: "date-time" },
            events: {
              type: "array", minItems: 1, maxItems: 500,
              items: {
                type: "object", additionalProperties: false, required: ["deviceEventId", "sequence", "occurredAt", "eventType", "cardUidHash"],
                properties: {
                  deviceEventId: uuid, sequence: { type: "integer", minimum: 1 }, occurredAt: { type: "string", format: "date-time" },
                  eventType: { type: "string", enum: ["check_in", "check_out"] }, cardUidHash: { type: "string", minLength: 64, maxLength: 64 },
                  deviceClockOffsetSeconds: { type: "integer", minimum: -86400, maximum: 86400 }
                }
              }
            }
          }
        }
      }
    },
    async (request) => service.ingestTerminalEventBatch(deviceProof(request), request.body, request.id)
  );

  app.post<{ Body: TerminalHeartbeatWrite }>(
    "/api/v1/terminal/v1/heartbeat",
    {
      config: { rawBody: true },
      schema: {
        headers: deviceHeaders,
        body: {
          type: "object", additionalProperties: false, required: ["sentAt", "sequence", "queueDepth", "softwareVersion"],
          properties: {
            sentAt: { type: "string", format: "date-time" }, sequence: { type: "integer", minimum: 1 },
            queueDepth: { type: "integer", minimum: 0 }, softwareVersion: { type: "string", minLength: 1, maxLength: 64 },
            deviceClockOffsetSeconds: { type: "integer", minimum: -86400, maximum: 86400 }
          }
        }
      }
    },
    async (request, reply) => {
      await service.terminalHeartbeat(deviceProof(request), request.body, request.id);
      return reply.status(204).send();
    }
  );
}
