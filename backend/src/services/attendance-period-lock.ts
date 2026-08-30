import type { TenantTransaction } from "../db/tenant.js";

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
