import { createHash } from "node:crypto";
import type { TenantTransaction } from "../db/tenant.js";

export const REPORT_TEMPLATE_VERSION = "bss-report-v1.2";

export type AttendancePeriodSnapshot = {
  schemaVersion: "attendance-period-dataset-v1";
  organization: { id: string; name: string; timezone: string };
  period: { year: number; month: number; from: string; to: string };
  attendance: Array<{
    id: string; workerId: string; workerCode: string; workerName: string;
    departmentId: string; departmentName: string; scopeDepartmentId: string | null;
    workDate: string; shiftName: string;
    checkIn: string | null; checkOut: string | null; breakMinutes: number;
    workedMinutes: number; plannedMinutes: number; status: string;
    calculationVersion: string; calculationId: string | null; revision: string;
  }>;
  approvedAbsences: Array<{
    id: string; workerId: string; workerCode: string; workerName: string;
    departmentId: string; departmentName: string; typeCode: string;
    startDate: string; endDate: string; workingDays: number; status: string;
    decidedBy: string | null; decidedAt: string | null; revision: string;
  }>;
  corrections: Array<{
    id: string; attendanceDayId: string; workerId: string; workerCode: string;
    workerName: string; departmentId: string; departmentName: string;
    scopeDepartmentId: string | null; workDate: string;
    beforeValues: Record<string, unknown>; requestedValues: Record<string, unknown>;
    reason: string; status: string; requestedAt: string; decidedBy: string | null;
    decidedAt: string | null; decisionNote: string | null; revision: string;
  }>;
};

export function attendancePeriodBounds(year: number, month: number): { from: string; to: string } {
  const from = `${year}-${String(month).padStart(2, "0")}-01`;
  const next = new Date(Date.UTC(year, month, 1));
  const toDate = new Date(next.getTime() - 86_400_000);
  return { from, to: toDate.toISOString().slice(0, 10) };
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === "object" && !(value instanceof Date)) {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => [key, stableValue(item)]));
  }
  return value instanceof Date ? value.toISOString() : value;
}

export function canonicalSnapshot(snapshot: AttendancePeriodSnapshot): string {
  return JSON.stringify(stableValue(snapshot));
}

export function snapshotChecksum(snapshot: AttendancePeriodSnapshot): string {
  return createHash("sha256").update(canonicalSnapshot(snapshot), "utf8").digest("hex");
}

export function parsePeriodSnapshot(value: AttendancePeriodSnapshot | string): AttendancePeriodSnapshot {
  return typeof value === "string" ? JSON.parse(value) as AttendancePeriodSnapshot : value;
}

export async function captureAttendancePeriodSnapshot(
  client: TenantTransaction,
  organizationId: string,
  year: number,
  month: number
): Promise<{ snapshot: AttendancePeriodSnapshot; checksumSha256: string; calculationVersions: string[] }> {
  const bounds = attendancePeriodBounds(year, month);
  const organization = await client.query<{ id: string; name: string; timezone: string }>(
    "SELECT id, name, timezone FROM organizations WHERE id = $1",
    [organizationId]
  );
  const attendance = await client.query<AttendancePeriodSnapshot["attendance"][number]>(
    `SELECT a.id, a.worker_id AS "workerId", w.code AS "workerCode", w.name AS "workerName",
       d.id AS "departmentId", d.name AS "departmentName",
       COALESCE(event_scope.effective_department_id, assignment_scope.department_id) AS "scopeDepartmentId",
       a.work_date::text AS "workDate",
       COALESCE(a.shift_snapshot->>'name', '') AS "shiftName",
       CASE WHEN a.check_in IS NULL THEN NULL ELSE to_char(a.check_in AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') END AS "checkIn",
       CASE WHEN a.check_out IS NULL THEN NULL ELSE to_char(a.check_out AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') END AS "checkOut",
       a.break_minutes AS "breakMinutes", a.worked_minutes AS "workedMinutes",
       a.planned_minutes AS "plannedMinutes", a.status, a.calculation_version AS "calculationVersion",
       a.current_calculation_id AS "calculationId", a.revision::text AS revision
     FROM attendance_days a
     JOIN workers w ON w.id = a.worker_id
     JOIN organizations o ON o.id = a.organization_id
     LEFT JOIN LATERAL (
       SELECT scope.effective_department_id
       FROM (
         SELECT e.effective_department_id, e.occurred_at, e.id
         FROM attendance_events e
         WHERE e.attendance_day_id = a.id AND e.effective_department_id IS NOT NULL
         UNION ALL
         SELECT e.effective_department_id, e.occurred_at, e.id
         FROM terminal_event_reconciliations r
         JOIN attendance_events e ON e.id = r.attendance_event_id
         WHERE r.attendance_day_id = a.id AND r.resolution = 'accepted'
           AND e.effective_department_id IS NOT NULL
       ) scope ORDER BY scope.occurred_at, scope.id LIMIT 1
     ) event_scope ON true
     LEFT JOIN LATERAL (
       SELECT assignment.department_id
       FROM worker_department_assignments assignment
       WHERE assignment.worker_id = a.worker_id
         AND assignment.effective_from <= COALESCE(a.check_in, a.work_date::timestamp AT TIME ZONE o.timezone)
         AND (assignment.effective_to IS NULL OR assignment.effective_to >
           COALESCE(a.check_in, a.work_date::timestamp AT TIME ZONE o.timezone))
       ORDER BY assignment.effective_from DESC LIMIT 1
     ) assignment_scope ON true
     JOIN departments d ON d.id = COALESCE(event_scope.effective_department_id, assignment_scope.department_id, w.department_id)
     WHERE a.work_date BETWEEN $1::date AND $2::date
       AND a.status NOT IN ('active', 'incomplete')
     ORDER BY a.work_date, w.code, a.id`,
    [bounds.from, bounds.to]
  );
  const approvedAbsences = await client.query<AttendancePeriodSnapshot["approvedAbsences"][number]>(
    `SELECT l.id, l.worker_id AS "workerId", w.code AS "workerCode", w.name AS "workerName",
       d.id AS "departmentId", d.name AS "departmentName", l.leave_type AS "typeCode",
       l.start_date::text AS "startDate", l.end_date::text AS "endDate",
       l.working_days AS "workingDays", l.status, l.decided_by AS "decidedBy",
       CASE WHEN l.decided_at IS NULL THEN NULL ELSE to_char(l.decided_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') END AS "decidedAt",
       l.revision::text AS revision
     FROM leave_requests l JOIN workers w ON w.id = l.worker_id JOIN departments d ON d.id = w.department_id
     WHERE l.status = 'approved' AND l.end_date >= $1::date AND l.start_date <= $2::date
     ORDER BY l.start_date, w.code, l.id`,
    [bounds.from, bounds.to]
  );
  const corrections = await client.query<AttendancePeriodSnapshot["corrections"][number]>(
    `SELECT c.id, c.attendance_day_id AS "attendanceDayId", a.worker_id AS "workerId",
       w.code AS "workerCode", w.name AS "workerName", d.id AS "departmentId",
       d.name AS "departmentName",
       COALESCE(event_scope.effective_department_id, assignment_scope.department_id) AS "scopeDepartmentId",
       a.work_date::text AS "workDate", c.before_values AS "beforeValues",
       c.requested_values AS "requestedValues", c.reason, c.status,
       to_char(c.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "requestedAt",
       c.decided_by AS "decidedBy",
       CASE WHEN c.decided_at IS NULL THEN NULL ELSE to_char(c.decided_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') END AS "decidedAt",
       c.decision_note AS "decisionNote", c.revision::text AS revision
     FROM correction_requests c JOIN attendance_days a ON a.id = c.attendance_day_id
     JOIN workers w ON w.id = a.worker_id JOIN organizations o ON o.id = a.organization_id
     LEFT JOIN LATERAL (
       SELECT scope.effective_department_id
       FROM (
         SELECT e.effective_department_id, e.occurred_at, e.id FROM attendance_events e
         WHERE e.attendance_day_id = a.id AND e.effective_department_id IS NOT NULL
         UNION ALL
         SELECT e.effective_department_id, e.occurred_at, e.id
         FROM terminal_event_reconciliations r JOIN attendance_events e ON e.id = r.attendance_event_id
         WHERE r.attendance_day_id = a.id AND r.resolution = 'accepted' AND e.effective_department_id IS NOT NULL
       ) scope ORDER BY scope.occurred_at, scope.id LIMIT 1
     ) event_scope ON true
     LEFT JOIN LATERAL (
       SELECT assignment.department_id FROM worker_department_assignments assignment
       WHERE assignment.worker_id = a.worker_id
         AND assignment.effective_from <= COALESCE(a.check_in, a.work_date::timestamp AT TIME ZONE o.timezone)
         AND (assignment.effective_to IS NULL OR assignment.effective_to >
           COALESCE(a.check_in, a.work_date::timestamp AT TIME ZONE o.timezone))
       ORDER BY assignment.effective_from DESC LIMIT 1
     ) assignment_scope ON true
     JOIN departments d ON d.id = COALESCE(event_scope.effective_department_id, assignment_scope.department_id, w.department_id)
     WHERE a.work_date BETWEEN $1::date AND $2::date
     ORDER BY c.created_at, c.id`,
    [bounds.from, bounds.to]
  );
  const snapshot: AttendancePeriodSnapshot = {
    schemaVersion: "attendance-period-dataset-v1",
    organization: organization.rows[0]!,
    period: { year, month, ...bounds },
    attendance: attendance.rows,
    approvedAbsences: approvedAbsences.rows,
    corrections: corrections.rows
  };
  const calculationVersions = [...new Set(snapshot.attendance.map((row) => row.calculationVersion))]
    .sort((left, right) => left.localeCompare(right, "en"));
  return { snapshot, checksumSha256: snapshotChecksum(snapshot), calculationVersions };
}
