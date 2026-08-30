import { createHash } from "node:crypto";
import type { TenantTransaction } from "../db/tenant.js";
import { AppError } from "../domain/errors.js";
import type { ActorContext } from "../domain/types.js";
import type { AttendancePeriodSnapshot } from "./attendance-period-snapshot.js";
import type { ReportPreviewView, ReportPreviewWrite } from "./contracts.js";

type ReportRow = Record<string, string | number | Date | null>;
type PreviewRow = ReportRow & {
  __row_count: string | number;
  __worked_minutes: string | number;
  __planned_minutes: string | number;
  __balance_minutes: string | number;
  __revision: string | number;
};

function reportValue(value: string | number | Date | null): string | number | null {
  if (value instanceof Date) return value.toISOString();
  return value;
}

function reportRows(rows: ReportRow[]): Array<Record<string, string | number | null>> {
  return rows.map((row) => Object.fromEntries(Object.entries(row).map(([key, value]) => [key, reportValue(value)])));
}

function datasetVersion(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function finish(
  input: ReportPreviewWrite,
  columns: ReportPreviewView["columns"],
  allRows: ReportRow[],
  limit: number,
  version?: string
): ReportPreviewView {
  const rows = reportRows(allRows.slice(0, limit));
  const totals = {
    rowCount: allRows.length,
    workedMinutes: allRows.reduce((sum, row) => sum + Number(row.workedMinutes ?? 0), 0),
    plannedMinutes: allRows.reduce((sum, row) => sum + Number(row.plannedMinutes ?? 0), 0),
    balanceMinutes: allRows.reduce((sum, row) => sum + Number(row.balanceMinutes ?? 0), 0)
  };
  const filters = { ...input, limit };
  return { reportType: input.reportType, filters, columns, rows, totals,
    datasetVersion: version ?? datasetVersion({ filters, totals, rows: allRows }), truncated: allRows.length > limit };
}

function databasePreview(
  input: ReportPreviewWrite,
  columns: ReportPreviewView["columns"],
  resultRows: PreviewRow[],
  limit: number
): ReportPreviewView {
  const metadata = resultRows[0];
  const rowCount = Number(metadata?.__row_count ?? 0);
  const rows = reportRows(resultRows.slice(0, limit).map((row) => {
    const { __row_count: _rowCount, __worked_minutes: _worked, __planned_minutes: _planned,
      __balance_minutes: _balance, __revision: _revision, revision: _entityRevision, ...data } = row;
    return data;
  }));
  const totals = { rowCount, workedMinutes: Number(metadata?.__worked_minutes ?? 0),
    plannedMinutes: Number(metadata?.__planned_minutes ?? 0), balanceMinutes: Number(metadata?.__balance_minutes ?? 0) };
  const filters = { ...input, limit };
  return { reportType: input.reportType, filters, columns, rows, totals,
    datasetVersion: datasetVersion({ filters, totals, revision: String(metadata?.__revision ?? 0), rows }),
    truncated: rowCount > limit };
}

export async function createLiveReportPreview(
  client: TenantTransaction,
  actor: ActorContext,
  input: ReportPreviewWrite
): Promise<ReportPreviewView> {
  const limit = input.limit ?? 100;
  const parameters = [input.periodFrom, input.periodTo, actor.role, actor.departmentIds,
    input.departmentId ?? null, input.workerId ?? null, input.attendanceStatus ?? null, limit + 1];
  const attendanceScopeJoins = `JOIN organizations o ON o.id = a.organization_id
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
    ) assignment_scope ON true`;
  const attendanceScope = `a.work_date BETWEEN $1::date AND $2::date
    AND ($3::text <> 'manager' OR COALESCE(event_scope.effective_department_id, assignment_scope.department_id) = ANY($4::uuid[]))
    AND ($5::uuid IS NULL OR COALESCE(event_scope.effective_department_id, assignment_scope.department_id) = $5)
    AND ($6::uuid IS NULL OR w.id = $6)`;
  let rows: PreviewRow[];
  let columns: ReportPreviewView["columns"];
  if (input.reportType === "monthly_summary") {
    rows = (await client.query<PreviewRow>(
      `WITH rows AS (
         SELECT w.code AS "workerCode", w.name AS "workerName", COUNT(a.id)::integer AS "dayCount",
           SUM(a.worked_minutes)::integer AS "workedMinutes", SUM(a.planned_minutes)::integer AS "plannedMinutes",
           SUM(a.worked_minutes - a.planned_minutes)::integer AS "balanceMinutes", MAX(a.revision) AS revision
         FROM attendance_days a JOIN workers w ON w.id = a.worker_id ${attendanceScopeJoins}
         WHERE ${attendanceScope} AND ($7::text IS NULL OR a.status = $7) GROUP BY w.id
       ) SELECT rows.*, COUNT(*) OVER() AS __row_count,
         COALESCE(SUM("workedMinutes") OVER(), 0) AS __worked_minutes,
         COALESCE(SUM("plannedMinutes") OVER(), 0) AS __planned_minutes,
         COALESCE(SUM("balanceMinutes") OVER(), 0) AS __balance_minutes,
         COALESCE(MAX(revision) OVER(), 0) AS __revision
       FROM rows ORDER BY "workerCode" LIMIT $8`, parameters)).rows;
    columns = [
      { key: "workerCode", label: "Šifra", dataType: "text" }, { key: "workerName", label: "Radnik", dataType: "text" },
      { key: "dayCount", label: "Dana", dataType: "integer" }, { key: "workedMinutes", label: "Odrađeno", dataType: "minutes" },
      { key: "plannedMinutes", label: "Planirano", dataType: "minutes" }, { key: "balanceMinutes", label: "Saldo", dataType: "minutes" }
    ];
  } else if (input.reportType === "attendance_journal" || input.reportType === "exceptions") {
    const exceptionClause = input.reportType === "exceptions" ? "AND a.status IN ('late', 'incomplete', 'corrected')" : "";
    rows = (await client.query<PreviewRow>(
      `WITH rows AS (
         SELECT w.code AS "workerCode", w.name AS "workerName", a.work_date AS "workDate", a.status,
           a.worked_minutes AS "workedMinutes", a.planned_minutes AS "plannedMinutes",
           a.worked_minutes - a.planned_minutes AS "balanceMinutes", a.revision
         FROM attendance_days a JOIN workers w ON w.id = a.worker_id ${attendanceScopeJoins}
         WHERE ${attendanceScope} ${exceptionClause} AND ($7::text IS NULL OR a.status = $7)
       ) SELECT rows.*, COUNT(*) OVER() AS __row_count,
         COALESCE(SUM("workedMinutes") OVER(), 0) AS __worked_minutes,
         COALESCE(SUM("plannedMinutes") OVER(), 0) AS __planned_minutes,
         COALESCE(SUM("balanceMinutes") OVER(), 0) AS __balance_minutes,
         COALESCE(MAX(revision) OVER(), 0) AS __revision
       FROM rows ORDER BY "workDate", "workerCode" LIMIT $8`, parameters)).rows;
    columns = [
      { key: "workerCode", label: "Šifra", dataType: "text" }, { key: "workerName", label: "Radnik", dataType: "text" },
      { key: "workDate", label: "Datum", dataType: "date" }, { key: "status", label: "Status", dataType: "status" },
      { key: "workedMinutes", label: "Odrađeno", dataType: "minutes" }, { key: "plannedMinutes", label: "Planirano", dataType: "minutes" },
      { key: "balanceMinutes", label: "Saldo", dataType: "minutes" }
    ];
  } else if (input.reportType === "approved_absences") {
    rows = (await client.query<PreviewRow>(
      `WITH rows AS (
         SELECT w.code AS "workerCode", w.name AS "workerName", l.leave_type AS "typeCode",
           l.start_date AS "startDate", l.end_date AS "endDate", l.working_days AS "workingDays", l.status, l.revision
         FROM leave_requests l JOIN workers w ON w.id = l.worker_id
         WHERE l.status = 'approved' AND l.end_date >= $1::date AND l.start_date <= $2::date
           AND ($3::text <> 'manager' OR w.department_id = ANY($4::uuid[]))
           AND ($5::uuid IS NULL OR w.department_id = $5) AND ($6::uuid IS NULL OR w.id = $6)
       ) SELECT rows.*, COUNT(*) OVER() AS __row_count, 0 AS __worked_minutes,
         0 AS __planned_minutes, 0 AS __balance_minutes, COALESCE(MAX(revision) OVER(), 0) AS __revision
       FROM rows ORDER BY "startDate", "workerCode" LIMIT $8`, parameters)).rows;
    columns = [
      { key: "workerCode", label: "Šifra", dataType: "text" }, { key: "workerName", label: "Radnik", dataType: "text" },
      { key: "typeCode", label: "Vrsta", dataType: "text" }, { key: "startDate", label: "Od", dataType: "date" },
      { key: "endDate", label: "Do", dataType: "date" }, { key: "workingDays", label: "Radnih dana", dataType: "integer" },
      { key: "status", label: "Status", dataType: "status" }
    ];
  } else {
    rows = (await client.query<PreviewRow>(
      `WITH rows AS (
         SELECT w.code AS "workerCode", w.name AS "workerName", a.work_date AS "workDate", c.status,
           c.created_at AS "requestedAt", c.reason, c.revision
         FROM correction_requests c JOIN attendance_days a ON a.id = c.attendance_day_id
         JOIN workers w ON w.id = a.worker_id ${attendanceScopeJoins}
         WHERE a.work_date BETWEEN $1::date AND $2::date
           AND ($3::text <> 'manager' OR COALESCE(event_scope.effective_department_id, assignment_scope.department_id) = ANY($4::uuid[]))
           AND ($5::uuid IS NULL OR COALESCE(event_scope.effective_department_id, assignment_scope.department_id) = $5)
           AND ($6::uuid IS NULL OR w.id = $6)
       ) SELECT rows.*, COUNT(*) OVER() AS __row_count, 0 AS __worked_minutes,
         0 AS __planned_minutes, 0 AS __balance_minutes, COALESCE(MAX(revision) OVER(), 0) AS __revision
       FROM rows ORDER BY "requestedAt", "workerCode" LIMIT $8`, parameters)).rows;
    columns = [
      { key: "workerCode", label: "Šifra", dataType: "text" }, { key: "workerName", label: "Radnik", dataType: "text" },
      { key: "workDate", label: "Datum", dataType: "date" }, { key: "status", label: "Status", dataType: "status" },
      { key: "requestedAt", label: "Zatraženo", dataType: "datetime" }, { key: "reason", label: "Razlog korekcije", dataType: "text" }
    ];
  }
  return databasePreview(input, columns, rows, limit);
}

function scoped<T extends { departmentId: string; workerId: string; scopeDepartmentId?: string | null }>(
  rows: T[], actor: ActorContext, input: ReportPreviewWrite
): T[] {
  return rows.filter((row) => {
    const scopeDepartmentId = "scopeDepartmentId" in row ? row.scopeDepartmentId : row.departmentId;
    return (actor.role !== "manager" || (scopeDepartmentId !== null && actor.departmentIds.includes(scopeDepartmentId)))
    && (!input.departmentId || scopeDepartmentId === input.departmentId)
    && (!input.workerId || row.workerId === input.workerId);
  });
}

export function createLockedReportPreview(
  snapshot: AttendancePeriodSnapshot,
  periodVersionId: string,
  actor: ActorContext,
  input: ReportPreviewWrite
): ReportPreviewView {
  if (input.periodFrom !== snapshot.period.from || input.periodTo !== snapshot.period.to) {
    throw new AppError("VALIDATION_FAILED", "Zaključani izvoz mora koristiti cijelo spremljeno mjesečno razdoblje.");
  }
  const limit = input.limit ?? 100;
  const attendance = scoped(snapshot.attendance, actor, input)
    .filter((row) => !["active", "incomplete"].includes(row.status))
    .filter((row) => !input.attendanceStatus || row.status === input.attendanceStatus);
  if (input.reportType === "monthly_summary") {
    const grouped = new Map<string, ReportRow>();
    for (const row of attendance) {
      const item = grouped.get(row.workerId) ?? { workerCode: row.workerCode, workerName: row.workerName,
        dayCount: 0, workedMinutes: 0, plannedMinutes: 0, balanceMinutes: 0 };
      item.dayCount = Number(item.dayCount) + 1;
      item.workedMinutes = Number(item.workedMinutes) + row.workedMinutes;
      item.plannedMinutes = Number(item.plannedMinutes) + row.plannedMinutes;
      item.balanceMinutes = Number(item.balanceMinutes) + row.workedMinutes - row.plannedMinutes;
      grouped.set(row.workerId, item);
    }
    return finish(input, [
      { key: "workerCode", label: "Šifra", dataType: "text" }, { key: "workerName", label: "Radnik", dataType: "text" },
      { key: "dayCount", label: "Dana", dataType: "integer" }, { key: "workedMinutes", label: "Odrađeno", dataType: "minutes" },
      { key: "plannedMinutes", label: "Planirano", dataType: "minutes" }, { key: "balanceMinutes", label: "Saldo", dataType: "minutes" }
    ], [...grouped.values()].sort((a, b) => String(a.workerCode).localeCompare(String(b.workerCode))), limit, periodVersionId);
  }
  if (input.reportType === "attendance_journal" || input.reportType === "exceptions") {
    const rows = attendance.filter((row) => input.reportType !== "exceptions" || ["late", "corrected"].includes(row.status))
      .map((row) => ({ workerCode: row.workerCode, workerName: row.workerName, workDate: row.workDate,
        status: row.status, workedMinutes: row.workedMinutes, plannedMinutes: row.plannedMinutes,
        balanceMinutes: row.workedMinutes - row.plannedMinutes }));
    return finish(input, [
      { key: "workerCode", label: "Šifra", dataType: "text" }, { key: "workerName", label: "Radnik", dataType: "text" },
      { key: "workDate", label: "Datum", dataType: "date" }, { key: "status", label: "Status", dataType: "status" },
      { key: "workedMinutes", label: "Odrađeno", dataType: "minutes" }, { key: "plannedMinutes", label: "Planirano", dataType: "minutes" },
      { key: "balanceMinutes", label: "Saldo", dataType: "minutes" }
    ], rows, limit, periodVersionId);
  }
  if (input.reportType === "approved_absences") {
    const rows = scoped(snapshot.approvedAbsences, actor, input).map((row) => ({ workerCode: row.workerCode,
      workerName: row.workerName, typeCode: row.typeCode, startDate: row.startDate, endDate: row.endDate,
      workingDays: row.workingDays, status: row.status }));
    return finish(input, [
      { key: "workerCode", label: "Šifra", dataType: "text" }, { key: "workerName", label: "Radnik", dataType: "text" },
      { key: "typeCode", label: "Vrsta", dataType: "text" }, { key: "startDate", label: "Od", dataType: "date" },
      { key: "endDate", label: "Do", dataType: "date" }, { key: "workingDays", label: "Radnih dana", dataType: "integer" },
      { key: "status", label: "Status", dataType: "status" }
    ], rows, limit, periodVersionId);
  }
  const rows = scoped(snapshot.corrections, actor, input).map((row) => ({ workerCode: row.workerCode,
    workerName: row.workerName, workDate: row.workDate, status: row.status,
    requestedAt: row.requestedAt, reason: row.reason }));
  return finish(input, [
    { key: "workerCode", label: "Šifra", dataType: "text" }, { key: "workerName", label: "Radnik", dataType: "text" },
    { key: "workDate", label: "Datum", dataType: "date" }, { key: "status", label: "Status", dataType: "status" },
    { key: "requestedAt", label: "Zatraženo", dataType: "datetime" }, { key: "reason", label: "Razlog korekcije", dataType: "text" }
  ], rows, limit, periodVersionId);
}
