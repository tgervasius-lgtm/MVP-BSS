import type { TenantTransaction } from "../db/tenant.js";
import { AppError } from "../domain/errors.js";

export async function workingDays(client: TenantTransaction, startDate: string, endDate: string): Promise<number> {
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

export async function lockActiveLeaveWorker(client: TenantTransaction, workerId: string) {
  const result = await client.query<{ annual_leave_allowance: number; department_id: string }>(
    "SELECT annual_leave_allowance, department_id FROM workers WHERE id = $1 AND status = 'active' FOR UPDATE",
    [workerId]
  );
  const worker = result.rows[0];
  if (!worker) throw new AppError("NOT_FOUND", "Radnik nije pronađen.");
  return worker;
}

export async function requireNonOverlappingLeave(
  client: TenantTransaction, workerId: string, startDate: string, endDate: string, coveredDates = false
): Promise<void> {
  const approvedOverlap = coveredDates
    ? `l.reservation_submission_key IS NULL OR EXISTS (
        SELECT 1 FROM annual_leave_decision_dates d
        WHERE d.organization_id = l.organization_id AND d.request_id = l.id
          AND d.approved_revision IS NOT NULL AND d.absence_date BETWEEN $2::date AND $3::date
      )`
    : "true";
  const overlap = await client.query(
    `SELECT 1 FROM leave_requests l WHERE l.worker_id = $1
     AND l.end_date >= $2::date AND l.start_date <= $3::date
     AND (l.status = 'pending' OR (l.status = 'approved' AND (${approvedOverlap}))) LIMIT 1`,
    [workerId, startDate, endDate]
  );
  if (overlap.rows[0]) throw new AppError("CONFLICT", "Za odabrano razdoblje već postoji aktivan zahtjev.");
}
