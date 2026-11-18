import type { TenantTransaction } from "../db/tenant.js";
import { AppError } from "../domain/errors.js";

export type AttendancePeriodState = "open" | "review" | "finalized" | "closed";

export function attendancePeriodParts(workDate: string): { year: number; month: number } {
  return { year: Number(workDate.slice(0, 4)), month: Number(workDate.slice(5, 7)) };
}

export async function lockAttendancePeriod(
  client: TenantTransaction,
  organizationId: string,
  year: number,
  month: number
): Promise<void> {
  const key = `attendance-period:${organizationId}:${year}-${String(month).padStart(2, "0")}`;
  await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1::text, 0))", [key]);
}

export async function attendancePeriodState(
  client: TenantTransaction,
  year: number,
  month: number
): Promise<AttendancePeriodState> {
  const result = await client.query<{ status: AttendancePeriodState }>(
    "SELECT status FROM attendance_month_locks WHERE year = $1 AND month = $2",
    [year, month]
  );
  return result.rows[0]?.status ?? "open";
}

export function isAttendancePeriodLocked(status: AttendancePeriodState): boolean {
  return status === "finalized" || status === "closed";
}

export async function requireLeaveApprovalPeriods(
  client: TenantTransaction,
  organizationId: string,
  startDate: string,
  endDate: string,
  organizationToday?: string
): Promise<void> {
  const start = attendancePeriodParts(startDate);
  const end = attendancePeriodParts(endDate);
  const monthIndex = (year: number, month: number) => year * 12 + month - 1;
  const last = monthIndex(end.year, end.month);
  // Finalization uses the same transaction lock before reading approved leave.
  for (let index = monthIndex(start.year, start.month); index <= last; index += 1) {
    const year = Math.floor(index / 12);
    const month = index % 12 + 1;
    await lockAttendancePeriod(client, organizationId, year, month);
    const state = await attendancePeriodState(client, year, month);
    const period = `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}`;
    if (isAttendancePeriodLocked(state)) {
      throw new AppError("CONFLICT", `Razdoblje ${period} je zaključano. Administrator ga mora ponovno otvoriti prije odobrenja odsutnosti.`);
    }
    const firstAffectedDate = index === monthIndex(start.year, start.month) ? startDate : `${period}-01`;
    if (state !== "open" && organizationToday && firstAffectedDate < organizationToday) {
      throw new AppError("CONFLICT", `Razdoblje ${period} mora biti otvoreno za retroaktivno odobrenje odsutnosti.`);
    }
  }
}
