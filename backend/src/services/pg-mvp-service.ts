import { createHash, timingSafeEqual } from "node:crypto";
import type pg from "pg";
import type { AppConfig } from "../config.js";
import { withTenant, type TenantTransaction } from "../db/tenant.js";
import { withTransaction } from "../db/transaction.js";
import { AppError } from "../domain/errors.js";
import type { ActorContext, EntityStatus, Page } from "../domain/types.js";
import { decryptDeviceCredential, encryptDeviceCredential } from "../security/device-credentials.js";
import { verifyDeviceSignature } from "../security/device-signature.js";
import { requireRole, requireWorkerScope } from "../security/rbac.js";
import { createOpaqueToken, hashToken } from "../security/tokens.js";
import { generateReportArtifact } from "../reports/generate.js";
import { decodeTimelineCursor, encodeTimelineCursor } from "./cursors.js";
import { normalizeDatabaseError } from "./database-errors.js";
import { datasetVersion } from "./dataset-version.js";
import { requireBoundedDateRange } from "./validation.js";
import { PgPhaseAService } from "./pg-phase-a-service.js";
import type {
  AttendanceDayView,
  AttendancePageView,
  AttendanceStatus,
  ApprovedLeaveCalendarView,
  AuditEventView,
  CorrectionDecisionView,
  CorrectionRequestView,
  CorrectionRequestWrite,
  DeviceRequestProof,
  LeaveRequestView,
  LeaveRequestWrite,
  MvpService,
  ReportArtifact,
  ReportExportView,
  ReportExportWrite,
  RequestStatus,
  TerminalEventBatchView,
  TerminalEventBatchWrite,
  TerminalHeartbeatWrite,
  TerminalPairView,
  TerminalPairWrite,
  TerminalView
} from "./contracts.js";

const MAX_EXPORT_ROWS = 10_000;

type AttendanceRow = {
  id: string;
  worker_id: string;
  work_date: string | Date;
  shift_snapshot: AttendanceDayView["shift"] | string;
  check_in: string | Date | null;
  check_out: string | Date | null;
  break_minutes: number;
  worked_minutes: number;
  planned_minutes: number;
  status: AttendanceStatus;
  revision: string | number;
};

type LeaveRow = {
  id: string;
  worker_id: string;
  department_id?: string;
  leave_type: LeaveRequestView["typeCode"];
  start_date: string | Date;
  end_date: string | Date;
  working_days: number;
  note: string | null;
  status: RequestStatus;
  created_at: string | Date;
  decided_at: string | Date | null;
  decided_by: string | null;
  decision_note: string | null;
  revision: string | number;
};

type CorrectionRow = {
  id: string;
  attendance_day_id: string;
  worker_id: string;
  department_id?: string;
  before_values: { checkIn?: string | null; checkOut?: string | null } | string;
  requested_values: { checkIn?: string | null; checkOut?: string | null } | string;
  reason: string;
  status: RequestStatus;
  created_at: string | Date;
  decided_at: string | Date | null;
  decided_by: string | null;
  decision_note: string | null;
  revision: string | number;
};

type ReportExportRow = {
  id: string;
  report_type: ReportExportView["reportType"];
  format: ReportExportView["format"];
  status: ReportExportView["status"];
  filters: ReportExportWrite | string;
  row_count: number | null;
  total_minutes: string | number | null;
  checksum_sha256: string | null;
  dataset_version: string;
  template_version: string;
  created_at: string | Date;
  completed_at: string | Date | null;
  expires_at: string | Date | null;
  content?: Buffer | null;
  mime_type?: string | null;
  file_name?: string | null;
};

type AuditRow = {
  id: string;
  actor_type: AuditEventView["actorType"];
  actor_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  before_json: Record<string, unknown> | string | null;
  after_json: Record<string, unknown> | string | null;
  request_id: string;
  occurred_at: string | Date;
  metadata: Record<string, unknown> | string;
};

type TerminalRow = {
  id: string;
  name: string;
  location: string;
  status: TerminalView["status"];
  last_seen_at: string | Date | null;
  queue_depth: number;
  clock_offset_seconds: number;
  revision: string | number;
};

const attendanceSelect = `SELECT a.id, a.worker_id, a.work_date, a.shift_snapshot, a.check_in, a.check_out,
  a.break_minutes, a.worked_minutes, a.planned_minutes, a.status, a.revision`;
const leaveSelect = `SELECT l.id, l.worker_id, w.department_id, l.leave_type, l.start_date, l.end_date,
  l.working_days, l.note, l.status, l.created_at, l.decided_at, l.decided_by, l.decision_note, l.revision`;
const correctionSelect = `SELECT c.id, c.attendance_day_id, a.worker_id, w.department_id,
  c.before_values, c.requested_values, c.reason, c.status, c.created_at, c.decided_at,
  c.decided_by, c.decision_note, c.revision`;
const reportSelect = `SELECT id, report_type, format,
  CASE WHEN status = 'ready' AND expires_at <= clock_timestamp() THEN 'expired' ELSE status END AS status,
  filters, row_count, total_minutes,
  checksum_sha256, dataset_version, template_version, created_at, completed_at, expires_at`;
const terminalSelect = `SELECT id, name, location, status, last_seen_at, queue_depth, clock_offset_seconds, revision`;

function iso(value: string | Date): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function dateOnly(value: string | Date): string {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

function jsonObject<T>(value: T | string): T {
  return typeof value === "string" ? JSON.parse(value) as T : value;
}

function safeSecretEquals(actual: string, expected: string): boolean {
  const actualHash = createHash("sha256").update(actual, "utf8").digest();
  const expectedHash = createHash("sha256").update(expected, "utf8").digest();
  return timingSafeEqual(actualHash, expectedHash);
}

function attendanceView(row: AttendanceRow): AttendanceDayView {
  const shift = jsonObject<AttendanceDayView["shift"]>(row.shift_snapshot);
  return {
    id: row.id,
    workerId: row.worker_id,
    workDate: dateOnly(row.work_date),
    shift,
    checkIn: row.check_in ? iso(row.check_in) : null,
    checkOut: row.check_out ? iso(row.check_out) : null,
    breakMinutes: row.break_minutes,
    workedMinutes: row.worked_minutes,
    plannedMinutes: row.planned_minutes,
    balanceMinutes: row.worked_minutes - row.planned_minutes,
    status: row.status,
    source: row.status === "corrected" ? "approved_correction" : "terminal",
    revision: String(row.revision)
  };
}

function leaveView(row: LeaveRow): LeaveRequestView {
  return {
    id: row.id,
    workerId: row.worker_id,
    typeCode: row.leave_type,
    startDate: dateOnly(row.start_date),
    endDate: dateOnly(row.end_date),
    workingDays: row.working_days,
    note: row.note ?? "",
    status: row.status,
    submittedAt: iso(row.created_at),
    decidedAt: row.decided_at ? iso(row.decided_at) : null,
    decidedBy: row.decided_by,
    decisionNote: row.decision_note,
    revision: String(row.revision)
  };
}

function correctionView(row: CorrectionRow): CorrectionRequestView {
  const before = jsonObject<{ checkIn?: string | null; checkOut?: string | null }>(row.before_values);
  const requested = jsonObject<{ checkIn?: string | null; checkOut?: string | null }>(row.requested_values);
  return {
    id: row.id,
    attendanceDayId: row.attendance_day_id,
    workerId: row.worker_id,
    oldValues: { checkIn: before.checkIn ?? null, checkOut: before.checkOut ?? null },
    newValues: { checkIn: requested.checkIn ?? null, checkOut: requested.checkOut ?? null },
    reason: row.reason,
    status: row.status,
    submittedAt: iso(row.created_at),
    decidedAt: row.decided_at ? iso(row.decided_at) : null,
    decidedBy: row.decided_by,
    decisionNote: row.decision_note,
    revision: String(row.revision)
  };
}

function reportExportView(row: ReportExportRow): ReportExportView {
  const expired = row.expires_at !== null && new Date(row.expires_at).getTime() <= Date.now();
  const status = expired && row.status === "ready" ? "expired" : row.status;
  return {
    id: row.id,
    reportType: row.report_type,
    format: row.format,
    status,
    filters: jsonObject<ReportExportWrite>(row.filters),
    rowCount: row.row_count,
    officialMinutes: row.total_minutes === null ? null : Number(row.total_minutes),
    checksumSha256: row.checksum_sha256,
    datasetVersion: row.dataset_version,
    templateVersion: row.template_version,
    createdAt: iso(row.created_at),
    readyAt: row.completed_at ? iso(row.completed_at) : null,
    downloadUrl: status === "ready" ? `/api/v1/report-exports/${row.id}/download` : null,
    downloadExpiresAt: row.expires_at ? iso(row.expires_at) : null
  };
}

function terminalView(row: TerminalRow): TerminalView {
  return {
    id: row.id,
    name: row.name,
    location: row.location,
    status: row.status,
    lastSeenAt: row.last_seen_at ? iso(row.last_seen_at) : null,
    queueDepth: row.queue_depth,
    clockOffsetSeconds: row.clock_offset_seconds,
    revision: String(row.revision)
  };
}

async function insertAudit(
  client: TenantTransaction,
  actor: Pick<ActorContext, "organizationId" | "userId" | "role">,
  requestId: string,
  action: string,
  entityType: string,
  entityId: string,
  before: unknown,
  after: unknown,
  module: string
): Promise<string> {
  const result = await client.query<{ id: string }>(
    `INSERT INTO audit_events (
       organization_id, actor_type, actor_id, actor_role, action, entity_type, entity_id,
       before_json, after_json, request_id, metadata
     ) VALUES ($1, 'user', $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb)
     RETURNING id`,
    [
      actor.organizationId,
      actor.userId,
      actor.role,
      action,
      entityType,
      entityId,
      before === null || before === undefined ? null : JSON.stringify(before),
      after === null || after === undefined ? null : JSON.stringify(after),
      requestId,
      JSON.stringify({ module })
    ]
  );
  return result.rows[0]!.id;
}

async function workingDays(client: TenantTransaction, startDate: string, endDate: string): Promise<number> {
  if (startDate > endDate) throw new AppError("VALIDATION_FAILED", "Početni datum mora biti prije završnog datuma.");
  const result = await client.query<{ days: number }>(
    `SELECT COUNT(*)::integer AS days
     FROM generate_series($1::date, $2::date, interval '1 day') day(value)
     WHERE EXTRACT(ISODOW FROM day.value) < 6
       AND NOT EXISTS (SELECT 1 FROM holidays h WHERE h.holiday_date = day.value::date)`,
    [startDate, endDate]
  );
  return result.rows[0]?.days ?? 0;
}

function plannedMinutes(startTime: string, endTime: string, breakMinutes: number): number {
  const [startHour = 0, startMinute = 0] = startTime.slice(0, 5).split(":").map(Number);
  const [endHour = 0, endMinute = 0] = endTime.slice(0, 5).split(":").map(Number);
  const start = startHour * 60 + startMinute;
  let end = endHour * 60 + endMinute;
  if (end <= start) end += 24 * 60;
  return Math.max(0, end - start - breakMinutes);
}

function correctionTimes(checkInValue: string, checkOutValue: string): { checkIn: Date; checkOut: Date } {
  const checkIn = new Date(checkInValue);
  const checkOut = new Date(checkOutValue);
  if (!Number.isFinite(checkIn.getTime()) || !Number.isFinite(checkOut.getTime()) ||
      checkOut <= checkIn || checkOut.getTime() - checkIn.getTime() > 16 * 60 * 60 * 1000) {
    throw new AppError("VALIDATION_FAILED", "Nova vremena prijave i odjave nisu valjana.");
  }
  return { checkIn, checkOut };
}

export class PgMvpService extends PgPhaseAService implements MvpService {
  constructor(
    private readonly mvpPool: pg.Pool,
    private readonly config: Pick<AppConfig, "rfidUidPepper" | "deviceCredentialEncryptionKey" | "terminalActivationCode" | "publicOrigin">
  ) {
    super(mvpPool, config.rfidUidPepper, config.publicOrigin);
  }

  async listAttendance(
    actor: ActorContext,
    filters: { from: string; to: string; departmentId?: string; workerId?: string; attendanceStatus?: AttendanceStatus; cursor?: string; limit: number }
  ): Promise<AttendancePageView> {
    requireRole(actor, ["admin", "manager"]);
    requireBoundedDateRange(filters.from, filters.to);
    return withTenant(this.mvpPool, actor, "list-attendance", (client) => this.listAttendanceInTransaction(client, actor, filters));
  }

  async listApprovedLeaveCalendar(
    actor: ActorContext,
    filters: { from: string; to: string }
  ): Promise<ApprovedLeaveCalendarView> {
    requireBoundedDateRange(filters.from, filters.to);
    return withTenant(this.mvpPool, actor, "approved-leave-calendar", async (client) => {
      const organization = await client.query<{ approved_leave_visibility: ApprovedLeaveCalendarView["visibility"]; revision: string }>(
        "SELECT approved_leave_visibility, revision::text FROM organizations WHERE id = $1",
        [actor.organizationId]
      );
      const visibility = organization.rows[0]?.approved_leave_visibility ?? "department";
      let departmentIds: readonly string[] = [];
      if (actor.role === "manager") departmentIds = actor.departmentIds;
      if (actor.role === "worker") {
        if (!actor.selfWorkerId) throw new AppError("FORBIDDEN", "Korisnik nije povezan s radnikom.");
        if (visibility !== "organization") {
          const worker = await client.query<{ department_id: string }>("SELECT department_id FROM workers WHERE id = $1", [actor.selfWorkerId]);
          if (!worker.rows[0]) throw new AppError("NOT_FOUND", "Radnik nije pronađen.");
          departmentIds = [worker.rows[0].department_id];
        }
      }
      const result = await client.query<{ id: string; employee_name: string; start_date: string | Date; end_date: string | Date; revision: string }>(
        `SELECT l.id, w.name AS employee_name, l.start_date, l.end_date, l.revision::text
         FROM leave_requests l
         JOIN workers w ON w.id = l.worker_id
         WHERE l.status = 'approved' AND l.leave_type = 'annual_leave'
           AND l.end_date >= $1::date AND l.start_date <= $2::date
           AND ($3::boolean OR w.department_id = ANY($4::uuid[]))
         ORDER BY l.start_date, w.name, l.id`,
        [filters.from, filters.to, ["admin", "accountant"].includes(actor.role) || visibility === "organization", departmentIds]
      );
      const items = result.rows.map((row) => ({
        id: row.id,
        employeeName: row.employee_name,
        startDate: dateOnly(row.start_date),
        endDate: dateOnly(row.end_date)
      }));
      return {
        visibility,
        items,
        datasetVersion: datasetVersion({ filters, visibility, organizationRevision: organization.rows[0]?.revision ?? "0", items })
      };
    });
  }

  async getWorkerAttendance(
    actor: ActorContext,
    workerId: string,
    filters: { from: string; to: string; cursor?: string; limit: number }
  ): Promise<AttendancePageView> {
    requireRole(actor, ["admin", "manager", "worker"]);
    requireBoundedDateRange(filters.from, filters.to);
    return withTenant(this.mvpPool, actor, "worker-attendance-scope", async (client) => {
      const worker = await client.query<{ department_id: string }>("SELECT department_id FROM workers WHERE id = $1", [workerId]);
      if (!worker.rows[0]) throw new AppError("NOT_FOUND", "Radnik nije pronađen.");
      requireWorkerScope(actor, workerId, worker.rows[0].department_id);
      return this.listAttendanceInTransaction(client, actor, { ...filters, workerId });
    });
  }

  async listLeaveRequests(
    actor: ActorContext,
    filters: { from: string; to: string; departmentId?: string; leaveStatus?: RequestStatus; cursor?: string; limit: number }
  ): Promise<Page<LeaveRequestView>> {
    requireBoundedDateRange(filters.from, filters.to);
    return withTenant(this.mvpPool, actor, "list-leave-requests", async (client) => {
      const after = decodeTimelineCursor(filters.cursor);
      const params = [filters.from, filters.to, actor.role, actor.departmentIds, actor.selfWorkerId, filters.departmentId ?? null, filters.leaveStatus ?? null];
      const rows = await client.query<LeaveRow>(
        `${leaveSelect}
         FROM leave_requests l JOIN workers w ON w.id = l.worker_id
         WHERE l.end_date >= $1::date AND l.start_date <= $2::date
           AND ($3::text <> 'manager' OR w.department_id = ANY($4::uuid[]))
           AND ($3::text <> 'worker' OR w.id = $5::uuid)
           AND ($3::text <> 'accountant' OR l.status = 'approved')
           AND ($6::uuid IS NULL OR w.department_id = $6)
           AND ($7::text IS NULL OR l.status = $7)
           AND ($8::timestamptz IS NULL OR (l.created_at, l.id) < ($8::timestamptz, $9::uuid))
         ORDER BY l.created_at DESC, l.id DESC LIMIT $10`,
        [...params, after?.at ?? null, after?.id ?? null, filters.limit + 1]
      );
      const count = await client.query<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM leave_requests l JOIN workers w ON w.id = l.worker_id
         WHERE l.end_date >= $1::date AND l.start_date <= $2::date
           AND ($3::text <> 'manager' OR w.department_id = ANY($4::uuid[]))
           AND ($3::text <> 'worker' OR w.id = $5::uuid)
           AND ($3::text <> 'accountant' OR l.status = 'approved')
           AND ($6::uuid IS NULL OR w.department_id = $6)
           AND ($7::text IS NULL OR l.status = $7)`,
        params
      );
      const hasMore = rows.rows.length > filters.limit;
      const pageRows = rows.rows.slice(0, filters.limit);
      return {
        items: pageRows.map((row) => actor.role === "accountant" ? { ...leaveView(row), note: "", decisionNote: null } : leaveView(row)),
        page: { nextCursor: hasMore && pageRows.at(-1) ? encodeTimelineCursor(pageRows.at(-1)!.created_at, pageRows.at(-1)!.id) : null, total: Number(count.rows[0]?.count ?? 0) }
      };
    });
  }

  async createLeaveRequest(actor: ActorContext, input: LeaveRequestWrite, requestId: string): Promise<LeaveRequestView> {
    requireRole(actor, ["worker"]);
    if (!actor.selfWorkerId) throw new AppError("FORBIDDEN", "Korisnik nije povezan s radnikom.");
    requireBoundedDateRange(input.startDate, input.endDate);
    try {
      return await withTenant(this.mvpPool, actor, requestId, async (client) => {
        const days = await workingDays(client, input.startDate, input.endDate);
        if (days <= 0) throw new AppError("VALIDATION_FAILED", "Odabrano razdoblje nema radnih dana.");
        const worker = await client.query<{ annual_leave_allowance: number }>(
          "SELECT annual_leave_allowance FROM workers WHERE id = $1 AND status = 'active' FOR UPDATE",
          [actor.selfWorkerId]
        );
        if (!worker.rows[0]) throw new AppError("NOT_FOUND", "Radnik nije pronađen.");
        const overlap = await client.query(
          `SELECT 1 FROM leave_requests WHERE worker_id = $1 AND status IN ('pending', 'approved')
           AND end_date >= $2::date AND start_date <= $3::date LIMIT 1`,
          [actor.selfWorkerId, input.startDate, input.endDate]
        );
        if (overlap.rows[0]) throw new AppError("CONFLICT", "Za odabrano razdoblje već postoji aktivan zahtjev.");
        if (input.typeCode === "annual_leave") {
          const firstYear = Number(input.startDate.slice(0, 4));
          const lastYear = Number(input.endDate.slice(0, 4));
          for (let year = firstYear; year <= lastYear; year += 1) {
            const yearStart = `${year}-01-01`;
            const yearEnd = `${year}-12-31`;
            const requestedDays = await workingDays(
              client,
              input.startDate > yearStart ? input.startDate : yearStart,
              input.endDate < yearEnd ? input.endDate : yearEnd
            );
            const used = await client.query<{ days: number }>(
              `SELECT COUNT(*)::integer AS days
               FROM leave_requests l
               CROSS JOIN LATERAL generate_series(
                 GREATEST(l.start_date, $2::date)::timestamp,
                 LEAST(l.end_date, $3::date)::timestamp,
                 interval '1 day'
               ) AS day(value)
               WHERE l.worker_id = $1 AND l.leave_type = 'annual_leave'
                 AND l.status IN ('pending', 'approved')
                 AND l.end_date >= $2::date AND l.start_date <= $3::date
                 AND EXTRACT(ISODOW FROM day.value) < 6
                 AND NOT EXISTS (SELECT 1 FROM holidays h WHERE h.holiday_date = day.value::date)`,
              [actor.selfWorkerId, yearStart, yearEnd]
            );
            if ((used.rows[0]?.days ?? 0) + requestedDays > worker.rows[0].annual_leave_allowance) {
              throw new AppError("VALIDATION_FAILED", `Zahtjev prelazi raspoloživi fond godišnjeg odmora za ${year}. godinu.`);
            }
          }
        }
        const result = await client.query<LeaveRow>(
          `INSERT INTO leave_requests (
             organization_id, worker_id, leave_type, start_date, end_date, working_days, note
           ) VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING id, worker_id, leave_type, start_date, end_date, working_days, note, status,
             created_at, decided_at, decided_by, decision_note, revision`,
          [actor.organizationId, actor.selfWorkerId, input.typeCode, input.startDate, input.endDate, days, input.note ?? null]
        );
        const row = result.rows[0]!;
        await insertAudit(client, actor, requestId, "leave_request.create", "leave_request", row.id, null, row, "leave");
        return leaveView(row);
      });
    } catch (error) {
      return normalizeDatabaseError(error);
    }
  }

  async approveLeaveRequest(actor: ActorContext, requestIdValue: string, revision: string, note: string | undefined, requestId: string): Promise<LeaveRequestView> {
    requireRole(actor, ["admin", "manager"]);
    return this.decideLeave(actor, requestIdValue, revision, "approved", note ?? null, requestId);
  }

  async rejectLeaveRequest(actor: ActorContext, requestIdValue: string, revision: string, note: string, requestId: string): Promise<LeaveRequestView> {
    requireRole(actor, ["admin", "manager"]);
    return this.decideLeave(actor, requestIdValue, revision, "rejected", note, requestId);
  }

  async cancelOwnLeaveRequest(actor: ActorContext, requestIdValue: string, revision: string, requestId: string): Promise<LeaveRequestView> {
    requireRole(actor, ["worker"]);
    if (!actor.selfWorkerId) throw new AppError("FORBIDDEN", "Korisnik nije povezan s radnikom.");
    return withTenant(this.mvpPool, actor, requestId, async (client) => {
      const before = await client.query<LeaveRow>(
        `${leaveSelect} FROM leave_requests l JOIN workers w ON w.id = l.worker_id WHERE l.id = $1 FOR UPDATE OF l`,
        [requestIdValue]
      );
      const row = before.rows[0];
      if (!row) throw new AppError("NOT_FOUND", "Zahtjev nije pronađen.");
      if (row.worker_id !== actor.selfWorkerId) throw new AppError("FORBIDDEN", "Možete poništiti samo vlastiti zahtjev.");
      if (String(row.revision) !== revision || row.status !== "pending") throw new AppError("STALE_REVISION", "Zahtjev više nije na čekanju.");
      const updated = await client.query<LeaveRow>(
        `UPDATE leave_requests SET status = 'cancelled', decided_by = $2, decided_at = clock_timestamp(),
           decision_note = 'Poništio radnik.', revision = revision + 1
         WHERE id = $1 RETURNING id, worker_id, leave_type, start_date, end_date, working_days, note,
           status, created_at, decided_at, decided_by, decision_note, revision`,
        [requestIdValue, actor.userId]
      );
      const result = updated.rows[0]!;
      await insertAudit(client, actor, requestId, "leave_request.cancel", "leave_request", result.id, row, result, "leave");
      return leaveView(result);
    });
  }

  async listCorrectionRequests(
    actor: ActorContext,
    filters: { from: string; to: string; correctionStatus?: RequestStatus; cursor?: string; limit: number }
  ): Promise<Page<CorrectionRequestView>> {
    requireRole(actor, ["admin", "manager", "worker"]);
    requireBoundedDateRange(filters.from, filters.to);
    return withTenant(this.mvpPool, actor, "list-corrections", async (client) => {
      const after = decodeTimelineCursor(filters.cursor);
      const params = [filters.from, filters.to, actor.role, actor.departmentIds, actor.selfWorkerId, filters.correctionStatus ?? null];
      const result = await client.query<CorrectionRow>(
        `${correctionSelect}
         FROM correction_requests c
         JOIN attendance_days a ON a.id = c.attendance_day_id
         JOIN workers w ON w.id = a.worker_id
         WHERE c.created_at >= $1::date AND c.created_at < ($2::date + interval '1 day')
           AND ($3::text <> 'manager' OR w.department_id = ANY($4::uuid[]))
           AND ($3::text <> 'worker' OR w.id = $5::uuid)
           AND ($6::text IS NULL OR c.status = $6)
           AND ($7::timestamptz IS NULL OR (c.created_at, c.id) < ($7::timestamptz, $8::uuid))
         ORDER BY c.created_at DESC, c.id DESC LIMIT $9`,
        [...params, after?.at ?? null, after?.id ?? null, filters.limit + 1]
      );
      const count = await client.query<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM correction_requests c
         JOIN attendance_days a ON a.id = c.attendance_day_id
         JOIN workers w ON w.id = a.worker_id
         WHERE c.created_at >= $1::date AND c.created_at < ($2::date + interval '1 day')
           AND ($3::text <> 'manager' OR w.department_id = ANY($4::uuid[]))
           AND ($3::text <> 'worker' OR w.id = $5::uuid)
           AND ($6::text IS NULL OR c.status = $6)`,
        params
      );
      const hasMore = result.rows.length > filters.limit;
      const rows = result.rows.slice(0, filters.limit);
      return {
        items: rows.map(correctionView),
        page: { nextCursor: hasMore && rows.at(-1) ? encodeTimelineCursor(rows.at(-1)!.created_at, rows.at(-1)!.id) : null, total: Number(count.rows[0]?.count ?? 0) }
      };
    });
  }

  async createCorrectionRequest(actor: ActorContext, input: CorrectionRequestWrite, requestId: string): Promise<CorrectionRequestView> {
    requireRole(actor, ["worker"]);
    if (!actor.selfWorkerId) throw new AppError("FORBIDDEN", "Korisnik nije povezan s radnikom.");
    if (input.reason.trim().length < 3) throw new AppError("VALIDATION_FAILED", "Razlog korekcije mora imati najmanje tri znaka.");
    const { checkIn, checkOut } = correctionTimes(input.newCheckIn, input.newCheckOut);
    try {
      return await withTenant(this.mvpPool, actor, requestId, async (client) => {
        const day = await client.query<AttendanceRow & { department_id: string }>(
          `${attendanceSelect}, w.department_id
           FROM attendance_days a JOIN workers w ON w.id = a.worker_id
           WHERE a.id = $1 FOR UPDATE OF a`,
          [input.attendanceDayId]
        );
        const row = day.rows[0];
        if (!row) throw new AppError("NOT_FOUND", "Evidencijski zapis nije pronađen.");
        if (row.worker_id !== actor.selfWorkerId) throw new AppError("FORBIDDEN", "Korekciju možete zatražiti samo za vlastiti zapis.");
        const aligned = await client.query<{ aligned: boolean }>(
          `SELECT (($1::timestamptz AT TIME ZONE timezone)::date = $2::date) AS aligned
           FROM organizations WHERE id = $3`,
          [checkIn.toISOString(), dateOnly(row.work_date), actor.organizationId]
        );
        if (aligned.rows[0]?.aligned !== true) {
          throw new AppError("VALIDATION_FAILED", "Nova prijava mora pripadati datumu evidencijskog zapisa u vremenskoj zoni organizacije.");
        }
        const locked = await client.query(
          `SELECT 1 FROM attendance_month_locks
           WHERE year = EXTRACT(YEAR FROM $1::date) AND month = EXTRACT(MONTH FROM $1::date)`,
          [dateOnly(row.work_date)]
        );
        if (locked.rows[0]) throw new AppError("CONFLICT", "Mjesec je zaključan za izmjene.");
        const beforeValues = { checkIn: row.check_in ? iso(row.check_in) : null, checkOut: row.check_out ? iso(row.check_out) : null };
        const requestedValues = { checkIn: checkIn.toISOString(), checkOut: checkOut.toISOString() };
        const created = await client.query<CorrectionRow>(
          `INSERT INTO correction_requests (
             organization_id, attendance_day_id, requested_by, before_values, requested_values, reason
           ) VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6)
           RETURNING id, attendance_day_id, $7::uuid AS worker_id, before_values, requested_values,
             reason, status, created_at, decided_at, decided_by, decision_note, revision`,
          [actor.organizationId, input.attendanceDayId, actor.userId, JSON.stringify(beforeValues), JSON.stringify(requestedValues), input.reason.trim(), actor.selfWorkerId]
        );
        const result = created.rows[0]!;
        await insertAudit(client, actor, requestId, "correction_request.create", "correction_request", result.id, null, result, "corrections");
        return correctionView(result);
      });
    } catch (error) {
      return normalizeDatabaseError(error);
    }
  }

  async approveCorrectionRequest(
    actor: ActorContext,
    requestIdValue: string,
    revision: string,
    note: string | undefined,
    requestId: string
  ): Promise<CorrectionDecisionView> {
    requireRole(actor, ["admin", "manager"]);
    return withTenant(this.mvpPool, actor, requestId, async (client) => {
      const requestResult = await client.query<CorrectionRow>(
        `${correctionSelect}
         FROM correction_requests c
         JOIN attendance_days a ON a.id = c.attendance_day_id
         JOIN workers w ON w.id = a.worker_id
         WHERE c.id = $1 FOR UPDATE OF c, a`,
        [requestIdValue]
      );
      const requestRow = requestResult.rows[0];
      if (!requestRow) throw new AppError("NOT_FOUND", "Zahtjev za korekciju nije pronađen.");
      requireWorkerScope(actor, requestRow.worker_id, requestRow.department_id);
      if (String(requestRow.revision) !== revision || requestRow.status !== "pending") throw new AppError("STALE_REVISION", "Zahtjev više nije na čekanju.");
      const beforeDay = await client.query<AttendanceRow>(`${attendanceSelect} FROM attendance_days a WHERE a.id = $1`, [requestRow.attendance_day_id]);
      const attendanceRow = beforeDay.rows[0]!;
      const locked = await client.query(
        `SELECT 1 FROM attendance_month_locks
         WHERE year = EXTRACT(YEAR FROM $1::date) AND month = EXTRACT(MONTH FROM $1::date)`,
        [dateOnly(attendanceRow.work_date)]
      );
      if (locked.rows[0]) throw new AppError("CONFLICT", "Mjesec je zaključan za izmjene.");
      const values = jsonObject<{ checkIn?: string | null; checkOut?: string | null }>(requestRow.requested_values);
      if (!values.checkIn || !values.checkOut) throw new AppError("VALIDATION_FAILED", "Zahtjev nema potpuna vremena korekcije.");
      const beforeValues = jsonObject<{ checkIn?: string | null; checkOut?: string | null }>(requestRow.before_values);
      const currentCheckIn = attendanceRow.check_in ? iso(attendanceRow.check_in) : null;
      const currentCheckOut = attendanceRow.check_out ? iso(attendanceRow.check_out) : null;
      if ((beforeValues.checkIn ?? null) !== currentCheckIn || (beforeValues.checkOut ?? null) !== currentCheckOut) {
        throw new AppError("CONFLICT", "Evidencija se promijenila nakon slanja zahtjeva; zahtjev treba ponovno provjeriti.");
      }
      const { checkIn, checkOut } = correctionTimes(values.checkIn, values.checkOut);
      const aligned = await client.query<{ aligned: boolean }>(
        `SELECT (($1::timestamptz AT TIME ZONE timezone)::date = $2::date) AS aligned
         FROM organizations WHERE id = $3`,
        [checkIn.toISOString(), dateOnly(attendanceRow.work_date), actor.organizationId]
      );
      if (aligned.rows[0]?.aligned !== true) {
        throw new AppError("VALIDATION_FAILED", "Nova prijava mora pripadati datumu evidencijskog zapisa u vremenskoj zoni organizacije.");
      }
      const duration = Math.max(0, Math.floor((checkOut.getTime() - checkIn.getTime()) / 60_000) - attendanceRow.break_minutes);
      const updatedDay = await client.query<AttendanceRow>(
        `UPDATE attendance_days SET check_in = $2, check_out = $3, worked_minutes = $4,
           status = 'corrected', revision = revision + 1
         WHERE id = $1
         RETURNING id, worker_id, work_date, shift_snapshot, check_in, check_out, break_minutes,
           worked_minutes, planned_minutes, status, revision`,
        [requestRow.attendance_day_id, checkIn.toISOString(), checkOut.toISOString(), duration]
      );
      const updatedRequest = await client.query<CorrectionRow>(
        `UPDATE correction_requests SET status = 'approved', decided_by = $2, decided_at = clock_timestamp(),
           decision_note = $3, revision = revision + 1
         WHERE id = $1
         RETURNING id, attendance_day_id, $4::uuid AS worker_id, before_values, requested_values,
           reason, status, created_at, decided_at, decided_by, decision_note, revision`,
        [requestIdValue, actor.userId, note ?? null, requestRow.worker_id]
      );
      const auditEventId = await insertAudit(
        client, actor, requestId, "correction_request.approve", "attendance_day", requestRow.attendance_day_id,
        attendanceRow, updatedDay.rows[0], "corrections"
      );
      return { request: correctionView(updatedRequest.rows[0]!), attendanceDay: attendanceView(updatedDay.rows[0]!), auditEventId };
    });
  }

  async rejectCorrectionRequest(actor: ActorContext, requestIdValue: string, revision: string, note: string, requestId: string): Promise<CorrectionRequestView> {
    requireRole(actor, ["admin", "manager"]);
    return this.decideCorrection(actor, requestIdValue, revision, "rejected", note, requestId);
  }

  async cancelOwnCorrectionRequest(actor: ActorContext, requestIdValue: string, revision: string, requestId: string): Promise<CorrectionRequestView> {
    requireRole(actor, ["worker"]);
    if (!actor.selfWorkerId) throw new AppError("FORBIDDEN", "Korisnik nije povezan s radnikom.");
    return withTenant(this.mvpPool, actor, requestId, async (client) => {
      const before = await client.query<CorrectionRow>(
        `${correctionSelect}
         FROM correction_requests c JOIN attendance_days a ON a.id = c.attendance_day_id
         JOIN workers w ON w.id = a.worker_id WHERE c.id = $1 FOR UPDATE OF c`,
        [requestIdValue]
      );
      const row = before.rows[0];
      if (!row) throw new AppError("NOT_FOUND", "Zahtjev za korekciju nije pronađen.");
      if (row.worker_id !== actor.selfWorkerId) throw new AppError("FORBIDDEN", "Možete poništiti samo vlastiti zahtjev.");
      if (String(row.revision) !== revision || row.status !== "pending") throw new AppError("STALE_REVISION", "Zahtjev više nije na čekanju.");
      const updated = await client.query<CorrectionRow>(
        `UPDATE correction_requests SET status = 'cancelled', decided_by = $2, decided_at = clock_timestamp(),
           decision_note = 'Poništio radnik.', revision = revision + 1
         WHERE id = $1
         RETURNING id, attendance_day_id, $3::uuid AS worker_id, before_values, requested_values,
           reason, status, created_at, decided_at, decided_by, decision_note, revision`,
        [requestIdValue, actor.userId, row.worker_id]
      );
      const result = updated.rows[0]!;
      await insertAudit(client, actor, requestId, "correction_request.cancel", "correction_request", result.id, row, result, "corrections");
      return correctionView(result);
    });
  }

  async listReportExports(actor: ActorContext, cursor: string | undefined, limit: number): Promise<Page<ReportExportView>> {
    requireRole(actor, ["admin", "manager", "accountant"]);
    return withTenant(this.mvpPool, actor, "list-report-exports", async (client) => {
      const after = decodeTimelineCursor(cursor);
      const result = await client.query<ReportExportRow>(
        `${reportSelect} FROM report_exports
         WHERE ($1::text <> 'manager' OR created_by = $2)
           AND ($3::timestamptz IS NULL OR (created_at, id) < ($3::timestamptz, $4::uuid))
         ORDER BY created_at DESC, id DESC LIMIT $5`,
        [actor.role, actor.userId, after?.at ?? null, after?.id ?? null, limit + 1]
      );
      const count = await client.query<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM report_exports WHERE ($1::text <> 'manager' OR created_by = $2)`,
        [actor.role, actor.userId]
      );
      const hasMore = result.rows.length > limit;
      const rows = result.rows.slice(0, limit);
      return {
        items: rows.map(reportExportView),
        page: { nextCursor: hasMore && rows.at(-1) ? encodeTimelineCursor(rows.at(-1)!.created_at, rows.at(-1)!.id) : null, total: Number(count.rows[0]?.count ?? 0) }
      };
    });
  }

  async createReportExport(actor: ActorContext, input: ReportExportWrite, requestId: string): Promise<ReportExportView> {
    requireRole(actor, ["admin", "manager", "accountant"]);
    const previewInput = {
      reportType: input.reportType,
      periodFrom: input.periodFrom,
      periodTo: input.periodTo,
      ...(input.departmentId !== undefined ? { departmentId: input.departmentId } : {}),
      ...(input.workerId !== undefined ? { workerId: input.workerId } : {}),
      ...(input.attendanceStatus !== undefined ? { attendanceStatus: input.attendanceStatus } : {}),
      limit: MAX_EXPORT_ROWS
    };
    const preview = await this.createReportPreview(actor, previewInput);
    if (preview.truncated) {
      throw new AppError("VALIDATION_FAILED", `Izvještaj prelazi sigurnosni limit od ${MAX_EXPORT_ROWS} redaka. Suzite razdoblje ili filtre.`);
    }
    const artifact = await generateReportArtifact(preview, input);
    return withTenant(this.mvpPool, actor, requestId, async (client) => {
      const result = await client.query<ReportExportRow>(
        `INSERT INTO report_exports (
           organization_id, created_by, report_type, filters, format, status, dataset_version,
           template_version, row_count, total_minutes, storage_key, checksum_sha256, expires_at,
           completed_at, content, mime_type, file_name
         ) VALUES ($1, $2, $3, $4::jsonb, $5, 'ready', $6, 'bss-report-v1.1', $7, $8,
           'postgres:report_exports', $9, clock_timestamp() + interval '24 hours', clock_timestamp(), $10, $11, $12)
         RETURNING id, report_type, format, status, filters, row_count, total_minutes,
           checksum_sha256, dataset_version, template_version, created_at, completed_at, expires_at`,
        [
          actor.organizationId,
          actor.userId,
          input.reportType,
          JSON.stringify(input),
          input.format,
          preview.datasetVersion,
          artifact.rowCount,
          artifact.officialMinutes,
          artifact.checksumSha256,
          artifact.content,
          artifact.mimeType,
          artifact.fileName
        ]
      );
      const row = result.rows[0]!;
      await insertAudit(client, actor, requestId, "report_export.create", "report_export", row.id, null, {
        reportType: row.report_type,
        format: row.format,
        rowCount: row.row_count,
        checksumSha256: row.checksum_sha256
      }, "reports");
      return reportExportView(row);
    });
  }

  async getReportExport(actor: ActorContext, exportId: string): Promise<ReportExportView> {
    requireRole(actor, ["admin", "manager", "accountant"]);
    return withTenant(this.mvpPool, actor, "get-report-export", async (client) => {
      const result = await client.query<ReportExportRow>(
        `${reportSelect} FROM report_exports WHERE id = $1 AND ($2::text <> 'manager' OR created_by = $3)`,
        [exportId, actor.role, actor.userId]
      );
      const row = result.rows[0];
      if (!row) throw new AppError("NOT_FOUND", "Izvještaj nije pronađen.");
      return reportExportView(row);
    });
  }

  async downloadReportExport(actor: ActorContext, exportId: string): Promise<ReportArtifact> {
    requireRole(actor, ["admin", "manager", "accountant"]);
    return withTenant(this.mvpPool, actor, "download-report-export", async (client) => {
      const result = await client.query<ReportExportRow>(
        `${reportSelect}, content, mime_type, file_name FROM report_exports
         WHERE id = $1 AND ($2::text <> 'manager' OR created_by = $3)`,
        [exportId, actor.role, actor.userId]
      );
      const row = result.rows[0];
      if (!row) throw new AppError("NOT_FOUND", "Izvještaj nije pronađen.");
      if (row.status !== "ready" || !row.content || !row.mime_type || !row.file_name || (row.expires_at && new Date(row.expires_at) <= new Date())) {
        throw new AppError("NOT_FOUND", "Izvještaj više nije dostupan za preuzimanje.");
      }
      return { content: row.content, mimeType: row.mime_type, fileName: row.file_name, checksumSha256: row.checksum_sha256 ?? "" };
    });
  }

  async listAuditEvents(
    actor: ActorContext,
    filters: { from: string; to: string; module?: string; entityId?: string; cursor?: string; limit: number }
  ): Promise<Page<AuditEventView>> {
    requireRole(actor, ["admin"]);
    requireBoundedDateRange(filters.from, filters.to);
    return withTenant(this.mvpPool, actor, "list-audit-events", async (client) => {
      const after = decodeTimelineCursor(filters.cursor);
      const params = [filters.from, filters.to, filters.module ?? null, filters.entityId ?? null];
      const result = await client.query<AuditRow>(
        `SELECT id, actor_type, actor_id, action, entity_type, entity_id, before_json, after_json,
           request_id, occurred_at, metadata
         FROM audit_events
         WHERE occurred_at >= $1::date AND occurred_at < ($2::date + interval '1 day')
           AND ($3::text IS NULL OR COALESCE(metadata->>'module', entity_type) = $3)
           AND ($4::uuid IS NULL OR entity_id = $4)
           AND ($5::timestamptz IS NULL OR (occurred_at, id) < ($5::timestamptz, $6::uuid))
         ORDER BY occurred_at DESC, id DESC LIMIT $7`,
        [...params, after?.at ?? null, after?.id ?? null, filters.limit + 1]
      );
      const count = await client.query<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM audit_events
         WHERE occurred_at >= $1::date AND occurred_at < ($2::date + interval '1 day')
           AND ($3::text IS NULL OR COALESCE(metadata->>'module', entity_type) = $3)
           AND ($4::uuid IS NULL OR entity_id = $4)`,
        params
      );
      const hasMore = result.rows.length > filters.limit;
      const rows = result.rows.slice(0, filters.limit);
      const items = rows.map((row): AuditEventView => {
        const metadata = jsonObject<Record<string, unknown>>(row.metadata);
        return {
          id: row.id,
          actorType: row.actor_type,
          actorId: row.actor_id,
          action: row.action,
          module: typeof metadata.module === "string" ? metadata.module : row.entity_type,
          entityType: row.entity_type,
          entityId: row.entity_id ?? row.id,
          before: row.before_json === null ? null : jsonObject<Record<string, unknown>>(row.before_json),
          after: row.after_json === null ? null : jsonObject<Record<string, unknown>>(row.after_json),
          createdAt: iso(row.occurred_at),
          requestId: row.request_id
        };
      });
      return {
        items,
        page: { nextCursor: hasMore && rows.at(-1) ? encodeTimelineCursor(rows.at(-1)!.occurred_at, rows.at(-1)!.id) : null, total: Number(count.rows[0]?.count ?? 0) }
      };
    });
  }

  async listTerminals(actor: ActorContext): Promise<TerminalView[]> {
    requireRole(actor, ["admin", "manager"]);
    return withTenant(this.mvpPool, actor, "list-terminals", async (client) => {
      const result = await client.query<TerminalRow>(
        `SELECT id, name, location,
           CASE WHEN status = 'online' AND (last_seen_at IS NULL OR last_seen_at < clock_timestamp() - interval '2 minutes')
             THEN 'offline' ELSE status END AS status,
           last_seen_at, queue_depth, clock_offset_seconds, revision
         FROM terminals ORDER BY name`
      );
      return result.rows.map(terminalView);
    });
  }

  async pairTerminal(actor: ActorContext, input: TerminalPairWrite, requestId: string): Promise<TerminalPairView> {
    requireRole(actor, ["admin"]);
    if (input.name.trim().length < 2 || input.location.trim().length < 2) {
      throw new AppError("VALIDATION_FAILED", "Naziv i lokacija terminala moraju imati najmanje dva znaka.");
    }
    if (!safeSecretEquals(input.activationCode, this.config.terminalActivationCode)) {
      throw new AppError("VALIDATION_FAILED", "Aktivacijski kod terminala nije valjan.");
    }
    const credential = createOpaqueToken();
    const encrypted = encryptDeviceCredential(this.config.deviceCredentialEncryptionKey, credential);
    return withTenant(this.mvpPool, actor, requestId, async (client) => {
      const terminal = await client.query<TerminalRow>(
        `INSERT INTO terminals (organization_id, name, location, status)
         VALUES ($1, $2, $3, 'offline')
         RETURNING id, name, location, status, last_seen_at, queue_depth, clock_offset_seconds, revision`,
        [actor.organizationId, input.name.trim(), input.location.trim()]
      );
      const row = terminal.rows[0]!;
      await client.query(
        `INSERT INTO terminal_credentials (
           organization_id, terminal_id, credential_hash, credential_ciphertext, credential_iv,
           credential_auth_tag, key_version
         ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [actor.organizationId, row.id, hashToken(credential), encrypted.ciphertext, encrypted.iv, encrypted.authTag, encrypted.keyVersion]
      );
      await insertAudit(client, actor, requestId, "terminal.pair", "terminal", row.id, null, terminalView(row), "terminals");
      return { terminal: terminalView(row), deviceCredential: credential };
    });
  }

  async revokeTerminal(actor: ActorContext, terminalId: string, revision: string, requestId: string): Promise<TerminalView> {
    requireRole(actor, ["admin"]);
    return withTenant(this.mvpPool, actor, requestId, async (client) => {
      const before = await client.query<TerminalRow>(`${terminalSelect} FROM terminals WHERE id = $1 FOR UPDATE`, [terminalId]);
      const row = before.rows[0];
      if (!row) throw new AppError("NOT_FOUND", "Terminal nije pronađen.");
      if (String(row.revision) !== revision) throw new AppError("STALE_REVISION", "Terminal je u međuvremenu promijenjen.");
      const updated = await client.query<TerminalRow>(
        `UPDATE terminals SET status = 'revoked', revision = revision + 1 WHERE id = $1
         RETURNING id, name, location, status, last_seen_at, queue_depth, clock_offset_seconds, revision`,
        [terminalId]
      );
      await client.query("UPDATE terminal_credentials SET revoked_at = clock_timestamp(), valid_to = clock_timestamp() WHERE terminal_id = $1 AND revoked_at IS NULL", [terminalId]);
      await insertAudit(client, actor, requestId, "terminal.revoke", "terminal", terminalId, row, updated.rows[0], "terminals");
      return terminalView(updated.rows[0]!);
    });
  }

  async ingestTerminalEventBatch(proof: DeviceRequestProof, input: TerminalEventBatchWrite, requestId: string): Promise<TerminalEventBatchView> {
    return this.withVerifiedDevice(proof, requestId, async (client, organizationId, terminalId) => {
      const receivedAt = new Date().toISOString();
      const results: TerminalEventBatchView["results"] = [];
      // Serialize batches per tenant. Without a stable global lock order, two
      // terminals processing different workers in reverse order can deadlock.
      await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1::text, 0))", [organizationId]);
      const terminalState = await client.query<{ last_sequence: string | number }>(
        "SELECT last_sequence FROM terminals WHERE id = $1 FOR UPDATE",
        [terminalId]
      );
      let lastSequence = Number(terminalState.rows[0]?.last_sequence ?? 0);
      for (const event of input.events) {
        let status: "synced" | "duplicate" | "rejected" = "synced";
        let code: string | null = null;
        let workerId: string | null = null;
        if (Date.parse(event.occurredAt) > Date.now() + 5 * 60_000) {
          status = "rejected";
          code = "EVENT_IN_FUTURE";
        } else if (!/^[a-f0-9]{64}$/i.test(event.cardUidHash)) {
          status = "rejected";
          code = "INVALID_CARD_HASH";
        }
        const existing = await client.query<{ id: string }>(
          "SELECT id FROM attendance_events WHERE terminal_id = $1 AND device_event_id = $2",
          [terminalId, event.deviceEventId]
        );
        if (existing.rows[0]) {
          status = "duplicate";
          code = null;
        } else if (event.sequence <= lastSequence) {
          status = "rejected";
          code = "SEQUENCE_OUT_OF_ORDER";
        } else {
          lastSequence = event.sequence;
        }

        let card: { id: string; worker_id: string } | undefined;
        if (status === "synced") {
          const cardResult = await client.query<{ id: string; worker_id: string }>(
            `SELECT c.id, c.worker_id FROM rfid_cards c JOIN workers w ON w.id = c.worker_id
             WHERE c.uid_hash = decode($1, 'hex') AND c.status = 'active' AND w.status = 'active'
               AND c.valid_from <= $2 AND (c.valid_to IS NULL OR c.valid_to >= $2)`,
            [event.cardUidHash, event.occurredAt]
          );
          card = cardResult.rows[0];
          if (!card) {
            status = "rejected";
            code = "CARD_NOT_ASSIGNED";
          } else {
            workerId = card.worker_id;
          }
        }

        if (status === "synced" && card) {
          const workerResult = await client.query<{
            worker_id: string; shift_id: string; shift_name: string; start_time: string; end_time: string;
            break_minutes: number; tolerance_minutes: number; local_date: string; local_time: string;
          }>(
            `SELECT w.id AS worker_id, s.id AS shift_id, s.name AS shift_name,
               s.start_time::text, s.end_time::text, s.break_minutes, s.tolerance_minutes,
               ($2::timestamptz AT TIME ZONE o.timezone)::date::text AS local_date,
               ($2::timestamptz AT TIME ZONE o.timezone)::time::text AS local_time
             FROM workers w JOIN shifts s ON s.id = w.shift_id
             JOIN organizations o ON o.id = w.organization_id
             WHERE w.id = $1 AND w.status = 'active' AND s.status = 'active'
             FOR UPDATE OF w`,
            [card.worker_id, event.occurredAt]
          );
          const worker = workerResult.rows[0];
          if (!worker) {
            status = "rejected";
            code = "WORKER_OR_SHIFT_INACTIVE";
          } else {
            const startMinutes = this.timeMinutes(worker.start_time);
            const endMinutes = this.timeMinutes(worker.end_time);
            const localMinutes = this.timeMinutes(worker.local_time);
            let workDate = worker.local_date;
            let shiftLocalMinutes = localMinutes;
            if (endMinutes <= startMinutes && localMinutes <= endMinutes) {
              workDate = this.previousDate(workDate);
              shiftLocalMinutes += 24 * 60;
            }
            const snapshot = {
              id: worker.shift_id,
              name: worker.shift_name,
              startTime: worker.start_time.slice(0, 5),
              endTime: worker.end_time.slice(0, 5),
              breakMinutes: worker.break_minutes
            };
            const day = await client.query<AttendanceRow>(
              `${attendanceSelect} FROM attendance_days a WHERE a.worker_id = $1 AND a.work_date = $2::date FOR UPDATE`,
              [worker.worker_id, workDate]
            );
            const current = day.rows[0];
            if (event.eventType === "check_in") {
              if (current?.check_in) {
                status = "rejected";
                code = "ALREADY_CHECKED_IN";
              } else {
                const late = shiftLocalMinutes > startMinutes + worker.tolerance_minutes;
                if (current?.check_out) {
                  const elapsed = new Date(current.check_out).getTime() - new Date(event.occurredAt).getTime();
                  if (elapsed <= 0) {
                    status = "rejected";
                    code = "CHECK_IN_AFTER_CHECK_OUT";
                  } else if (elapsed > 16 * 60 * 60 * 1000) {
                    status = "rejected";
                    code = "SHIFT_DURATION_EXCEEDED";
                  } else {
                    const worked = Math.max(0, Math.floor(elapsed / 60_000) - current.break_minutes);
                    await client.query(
                      `UPDATE attendance_days SET check_in = $2, shift_snapshot = $3::jsonb,
                         break_minutes = $4, worked_minutes = $5, planned_minutes = $6,
                         status = $7, revision = revision + 1 WHERE id = $1`,
                      [current.id, event.occurredAt, JSON.stringify(snapshot), worker.break_minutes, worked,
                        plannedMinutes(worker.start_time, worker.end_time, worker.break_minutes), late ? "late" : "complete"]
                    );
                  }
                } else if (current) {
                  await client.query(
                    `UPDATE attendance_days SET check_in = $2, shift_snapshot = $3::jsonb,
                       break_minutes = $4, planned_minutes = $5, status = $6, revision = revision + 1
                     WHERE id = $1`,
                    [current.id, event.occurredAt, JSON.stringify(snapshot), worker.break_minutes,
                      plannedMinutes(worker.start_time, worker.end_time, worker.break_minutes), late ? "late" : "active"]
                  );
                } else {
                  await client.query(
                    `INSERT INTO attendance_days (
                       organization_id, worker_id, work_date, shift_snapshot, check_in, break_minutes,
                       worked_minutes, planned_minutes, status
                     ) VALUES ($1, $2, $3, $4::jsonb, $5, $6, 0, $7, $8)`,
                    [organizationId, worker.worker_id, workDate, JSON.stringify(snapshot), event.occurredAt, worker.break_minutes,
                      plannedMinutes(worker.start_time, worker.end_time, worker.break_minutes), late ? "late" : "active"]
                  );
                }
              }
            } else if (current?.check_out) {
              status = "rejected";
              code = "ALREADY_CHECKED_OUT";
            } else if (current?.check_in) {
              const elapsed = new Date(event.occurredAt).getTime() - new Date(current.check_in).getTime();
              if (elapsed <= 0) {
                status = "rejected";
                code = "CHECK_OUT_BEFORE_CHECK_IN";
              } else if (elapsed > 16 * 60 * 60 * 1000) {
                status = "rejected";
                code = "SHIFT_DURATION_EXCEEDED";
              } else {
                const worked = Math.max(0, Math.floor(elapsed / 60_000) - current.break_minutes);
                await client.query(
                  `UPDATE attendance_days SET check_out = $2, worked_minutes = $3,
                     status = CASE WHEN status = 'late' THEN 'late' ELSE 'complete' END,
                     revision = revision + 1 WHERE id = $1`,
                  [current.id, event.occurredAt, worked]
                );
              }
            } else {
              await client.query(
                `INSERT INTO attendance_days (
                   organization_id, worker_id, work_date, shift_snapshot, check_out, break_minutes,
                   worked_minutes, planned_minutes, status
                 ) VALUES ($1, $2, $3, $4::jsonb, $5, $6, 0, $7, 'incomplete')
                 ON CONFLICT (organization_id, worker_id, work_date) DO UPDATE
                   SET check_out = EXCLUDED.check_out, status = 'incomplete', revision = attendance_days.revision + 1`,
                [organizationId, worker.worker_id, workDate, JSON.stringify(snapshot), event.occurredAt, worker.break_minutes, plannedMinutes(worker.start_time, worker.end_time, worker.break_minutes)]
              );
            }
          }
        }

        if (status !== "duplicate") {
          await client.query(
            `INSERT INTO attendance_events (
               organization_id, terminal_id, worker_id, rfid_card_id, device_event_id, sequence,
               occurred_at, event_type, card_uid_hash, device_clock_offset_seconds, processing_status, rejection_code
             ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, decode($9, 'hex'), $10, $11, $12)`,
            [
              organizationId,
              terminalId,
              workerId,
              card?.id ?? null,
              event.deviceEventId,
              event.sequence,
              event.occurredAt,
              event.eventType,
              /^[a-f0-9]{64}$/i.test(event.cardUidHash) ? event.cardUidHash : "0".repeat(64),
              event.deviceClockOffsetSeconds ?? 0,
              status === "synced" ? "accepted" : "rejected",
              code
            ]
          );
        }
        await client.query(
          `INSERT INTO terminal_sync_events (
             organization_id, terminal_id, device_event_id, sequence, worker_id, occurred_at,
             event_type, status, rejection_code, request_id
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [organizationId, terminalId, event.deviceEventId, event.sequence, workerId, event.occurredAt, event.eventType, status, code, requestId]
        );
        await client.query(
          `INSERT INTO audit_events (
             organization_id, actor_type, actor_id, action, entity_type, entity_id, request_id, metadata
           ) VALUES ($1, 'terminal', $2, $3, 'attendance_event', $4, $5, $6::jsonb)`,
          [organizationId, terminalId, `terminal_event.${status}`, event.deviceEventId, requestId, JSON.stringify({ module: "terminal", eventType: event.eventType, result: status, code })]
        );
        results.push({ deviceEventId: event.deviceEventId, status, code });
      }
      await client.query(
        `UPDATE terminals SET status = 'online', last_seen_at = clock_timestamp(), queue_depth = 0,
           last_sequence = GREATEST(last_sequence, $2), revision = revision + 1 WHERE id = $1`,
        [terminalId, lastSequence]
      );
      return { batchId: input.batchId, receivedAt, results };
    });
  }

  async terminalHeartbeat(proof: DeviceRequestProof, input: TerminalHeartbeatWrite, requestId: string): Promise<void> {
    await this.withVerifiedDevice(proof, requestId, async (client, organizationId, terminalId) => {
      await client.query(
        `UPDATE terminals SET status = 'online', last_seen_at = clock_timestamp(), queue_depth = $2,
           clock_offset_seconds = $3, software_version = $4, revision = revision + 1
         WHERE id = $1`,
        [terminalId, input.queueDepth, input.deviceClockOffsetSeconds ?? 0, input.softwareVersion]
      );
      await client.query(
        `INSERT INTO audit_events (
           organization_id, actor_type, actor_id, action, entity_type, entity_id, request_id, metadata
         ) VALUES ($1, 'terminal', $2, 'terminal.heartbeat', 'terminal', $2, $3, $4::jsonb)`,
        [organizationId, terminalId, requestId, JSON.stringify({ module: "terminals", sequence: input.sequence, queueDepth: input.queueDepth })]
      );
    });
  }

  private async listAttendanceInTransaction(
    client: TenantTransaction,
    actor: ActorContext,
    filters: { from: string; to: string; departmentId?: string; workerId?: string; attendanceStatus?: AttendanceStatus; cursor?: string; limit: number }
  ): Promise<AttendancePageView> {
    if (actor.role === "worker" && !actor.selfWorkerId) {
      throw new AppError("FORBIDDEN", "Korisnik nije povezan s radnikom.");
    }
    const after = decodeTimelineCursor(filters.cursor);
    const parameters = [
      filters.from,
      filters.to,
      actor.role,
      actor.departmentIds,
      actor.selfWorkerId,
      filters.departmentId ?? null,
      filters.workerId ?? null,
      filters.attendanceStatus ?? null
    ];
    const result = await client.query<AttendanceRow>(
      `${attendanceSelect}
       FROM attendance_days a JOIN workers w ON w.id = a.worker_id
       WHERE a.work_date BETWEEN $1::date AND $2::date
         AND ($3::text <> 'manager' OR w.department_id = ANY($4::uuid[]))
         AND ($3::text <> 'worker' OR w.id = $5::uuid)
         AND ($6::uuid IS NULL OR w.department_id = $6)
         AND ($7::uuid IS NULL OR w.id = $7)
         AND ($8::text IS NULL OR a.status = $8)
         AND ($9::date IS NULL OR (a.work_date, a.id) < ($9::date, $10::uuid))
       ORDER BY a.work_date DESC, a.id DESC LIMIT $11`,
      [...parameters, after?.at ?? null, after?.id ?? null, filters.limit + 1]
    );
    const totalsResult = await client.query<{
      row_count: string; completed_count: string; active_count: string; review_count: string;
      worked_minutes: string; planned_minutes: string; balance_minutes: string; revision: string;
    }>(
      `SELECT COUNT(*)::text AS row_count,
         COUNT(*) FILTER (WHERE a.check_out IS NOT NULL)::text AS completed_count,
         COUNT(*) FILTER (WHERE a.check_in IS NOT NULL AND a.check_out IS NULL)::text AS active_count,
         COUNT(*) FILTER (WHERE a.status IN ('late', 'incomplete'))::text AS review_count,
         COALESCE(SUM(a.worked_minutes), 0)::text AS worked_minutes,
         COALESCE(SUM(a.planned_minutes), 0)::text AS planned_minutes,
         COALESCE(SUM(a.worked_minutes - a.planned_minutes), 0)::text AS balance_minutes,
         COALESCE(MAX(a.revision), 0)::text AS revision
       FROM attendance_days a JOIN workers w ON w.id = a.worker_id
       WHERE a.work_date BETWEEN $1::date AND $2::date
         AND ($3::text <> 'manager' OR w.department_id = ANY($4::uuid[]))
         AND ($3::text <> 'worker' OR w.id = $5::uuid)
         AND ($6::uuid IS NULL OR w.department_id = $6)
         AND ($7::uuid IS NULL OR w.id = $7)
         AND ($8::text IS NULL OR a.status = $8)`,
      parameters
    );
    const totalsRow = totalsResult.rows[0]!;
    const hasMore = result.rows.length > filters.limit;
    const rows = result.rows.slice(0, filters.limit);
    const totals = {
      rowCount: Number(totalsRow.row_count),
      completedCount: Number(totalsRow.completed_count),
      activeCount: Number(totalsRow.active_count),
      reviewCount: Number(totalsRow.review_count),
      workedMinutes: Number(totalsRow.worked_minutes),
      plannedMinutes: Number(totalsRow.planned_minutes),
      balanceMinutes: Number(totalsRow.balance_minutes)
    };
    const items = rows.map(attendanceView);
    return {
      items,
      totals,
      page: { nextCursor: hasMore && rows.at(-1) ? encodeTimelineCursor(dateOnly(rows.at(-1)!.work_date), rows.at(-1)!.id) : null, total: totals.rowCount },
      datasetVersion: datasetVersion({ filters, totals, revision: totalsRow.revision, items })
    };
  }

  private async decideLeave(
    actor: ActorContext,
    requestIdValue: string,
    revision: string,
    status: "approved" | "rejected",
    note: string | null,
    requestId: string
  ): Promise<LeaveRequestView> {
    return withTenant(this.mvpPool, actor, requestId, async (client) => {
      const before = await client.query<LeaveRow>(
        `${leaveSelect} FROM leave_requests l JOIN workers w ON w.id = l.worker_id WHERE l.id = $1 FOR UPDATE OF l`,
        [requestIdValue]
      );
      const row = before.rows[0];
      if (!row) throw new AppError("NOT_FOUND", "Zahtjev nije pronađen.");
      requireWorkerScope(actor, row.worker_id, row.department_id);
      if (String(row.revision) !== revision || row.status !== "pending") throw new AppError("STALE_REVISION", "Zahtjev više nije na čekanju.");
      const result = await client.query<LeaveRow>(
        `UPDATE leave_requests SET status = $2, decided_by = $3, decided_at = clock_timestamp(),
           decision_note = $4, revision = revision + 1 WHERE id = $1
         RETURNING id, worker_id, leave_type, start_date, end_date, working_days, note,
           status, created_at, decided_at, decided_by, decision_note, revision`,
        [requestIdValue, status, actor.userId, note]
      );
      const updated = result.rows[0]!;
      await insertAudit(client, actor, requestId, `leave_request.${status}`, "leave_request", updated.id, row, updated, "leave");
      return leaveView(updated);
    });
  }

  private async decideCorrection(
    actor: ActorContext,
    requestIdValue: string,
    revision: string,
    status: "rejected",
    note: string,
    requestId: string
  ): Promise<CorrectionRequestView> {
    return withTenant(this.mvpPool, actor, requestId, async (client) => {
      const before = await client.query<CorrectionRow>(
        `${correctionSelect}
         FROM correction_requests c JOIN attendance_days a ON a.id = c.attendance_day_id
         JOIN workers w ON w.id = a.worker_id WHERE c.id = $1 FOR UPDATE OF c`,
        [requestIdValue]
      );
      const row = before.rows[0];
      if (!row) throw new AppError("NOT_FOUND", "Zahtjev za korekciju nije pronađen.");
      requireWorkerScope(actor, row.worker_id, row.department_id);
      if (String(row.revision) !== revision || row.status !== "pending") throw new AppError("STALE_REVISION", "Zahtjev više nije na čekanju.");
      const result = await client.query<CorrectionRow>(
        `UPDATE correction_requests SET status = $2, decided_by = $3, decided_at = clock_timestamp(),
           decision_note = $4, revision = revision + 1 WHERE id = $1
         RETURNING id, attendance_day_id, $5::uuid AS worker_id, before_values, requested_values,
           reason, status, created_at, decided_at, decided_by, decision_note, revision`,
        [requestIdValue, status, actor.userId, note, row.worker_id]
      );
      const updated = result.rows[0]!;
      await insertAudit(client, actor, requestId, "correction_request.reject", "correction_request", updated.id, row, updated, "corrections");
      return correctionView(updated);
    });
  }

  private async withVerifiedDevice<T>(
    proof: DeviceRequestProof,
    requestId: string,
    operation: (client: TenantTransaction, organizationId: string, terminalId: string) => Promise<T>
  ): Promise<T> {
    type CredentialRow = {
      organization_id: string;
      terminal_id: string;
      terminal_status: TerminalView["status"];
      credential_hash: Buffer;
      credential_ciphertext: Buffer | null;
      credential_iv: Buffer | null;
      credential_auth_tag: Buffer | null;
      valid_from: string | Date;
      valid_to: string | Date | null;
      revoked_at: string | Date | null;
    };
    const lookup = await this.mvpPool.query<CredentialRow>("SELECT * FROM bss_terminal_credential_lookup($1)", [proof.terminalId]);
    const credential = lookup.rows[0];
    if (!credential || credential.terminal_status === "revoked" || credential.revoked_at || (credential.valid_to && new Date(credential.valid_to) <= new Date()) ||
      !credential.credential_ciphertext || !credential.credential_iv || !credential.credential_auth_tag) {
      throw new AppError("UNAUTHENTICATED", "Terminalski identitet nije valjan.");
    }
    let secret: string;
    try {
      secret = decryptDeviceCredential(this.config.deviceCredentialEncryptionKey, {
        ciphertext: credential.credential_ciphertext,
        iv: credential.credential_iv,
        authTag: credential.credential_auth_tag
      });
    } catch {
      throw new AppError("UNAUTHENTICATED", "Terminalski identitet nije valjan.");
    }
    const secretHash = hashToken(secret);
    if (secretHash.length !== credential.credential_hash.length || !timingSafeEqual(secretHash, credential.credential_hash) ||
      !verifyDeviceSignature(secret, {
        method: proof.method,
        path: proof.path,
        body: proof.rawBody,
        timestamp: proof.timestamp,
        nonce: proof.nonce
      }, proof.signature)) {
      throw new AppError("UNAUTHENTICATED", "Potpis terminalskog zahtjeva nije valjan.");
    }

    return withTransaction(
      this.mvpPool,
      async (client) => {
        await client.query("SELECT set_config('bss.organization_id', $1, true)", [credential.organization_id]);
        await client.query("SELECT set_config('bss.actor_id', $1, true)", [credential.terminal_id]);
        await client.query("SELECT set_config('bss.actor_role', 'terminal', true)");
        await client.query("SELECT set_config('bss.request_id', $1, true)", [requestId]);
        await client.query("SET LOCAL statement_timeout = '10s'");
        const currentTerminal = await client.query<{ status: TerminalView["status"]; organization_status: EntityStatus }>(
          `SELECT t.status, o.status AS organization_status
           FROM terminals t JOIN organizations o ON o.id = t.organization_id
           WHERE t.id = $1 FOR SHARE OF t`,
          [credential.terminal_id]
        );
        if (!currentTerminal.rows[0] || currentTerminal.rows[0].status === "revoked" || currentTerminal.rows[0].organization_status !== "active") {
          throw new AppError("UNAUTHENTICATED", "Terminalski identitet više nije aktivan.");
        }
        try {
          await client.query(
            `INSERT INTO terminal_request_nonces (
               organization_id, terminal_id, nonce, request_timestamp, expires_at
             ) VALUES ($1, $2, $3, $4, $4::timestamptz + interval '10 minutes')`,
            [credential.organization_id, credential.terminal_id, proof.nonce, proof.timestamp]
          );
        } catch (error) {
          const code = typeof error === "object" && error !== null && "code" in error ? String(error.code) : "";
          if (code === "23505") throw new AppError("UNAUTHENTICATED", "Terminalski nonce je već iskorišten.");
          throw error;
        }
        await client.query("DELETE FROM terminal_request_nonces WHERE expires_at < clock_timestamp()");
      },
      (client) => operation(client, credential.organization_id, credential.terminal_id)
    );
  }

  private timeMinutes(value: string): number {
    const [hours = 0, minutes = 0] = value.slice(0, 5).split(":").map(Number);
    return hours * 60 + minutes;
  }

  private previousDate(value: string): string {
    const date = new Date(`${value}T12:00:00Z`);
    date.setUTCDate(date.getUTCDate() - 1);
    return date.toISOString().slice(0, 10);
  }
}
