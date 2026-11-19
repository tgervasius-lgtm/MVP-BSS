import { createHash } from "node:crypto";
import type pg from "pg";
import { withTenant, type TenantTransaction } from "../db/tenant.js";
import { AppError } from "../domain/errors.js";
import type { ActorContext } from "../domain/types.js";
import { requireRole, requireWorkerScope } from "../security/rbac.js";
import type { LeaveRequestWrite, RequestStatus } from "./contracts.js";
import { requireLeaveApprovalPeriods } from "./attendance-period-lock.js";
import { lockActiveLeaveWorker, requireNonOverlappingLeave } from "./leave-calendar-days.js";
import { insertAudit } from "./mvp-audit.js";
import { requireBoundedDateRange } from "./validation.js";

type ReservationYear = { year: number; requestedDays: number; reservedDays: number };
export type CoveredDate = { date: string; type: "annual_leave" };
type ReservationRequestRow = {
  id: string;
  worker_id: string;
  revision: string;
  status: RequestStatus;
  reservation_submission_hash: string;
};
type PendingReservationRow = ReservationRequestRow & {
  start_date: string; end_date: string; reservation_submitted_by: string;
};
const requestColumns = "id, worker_id, revision::text, status, reservation_submission_hash";

async function requestedYears(
  client: TenantTransaction, startDate: string, endDate: string
): Promise<ReservationYear[]> {
  const result = await client.query<ReservationYear>(
    `SELECT EXTRACT(YEAR FROM day.value)::integer AS year,
            COUNT(*)::integer AS "requestedDays", 0::integer AS "reservedDays"
     FROM generate_series($1::timestamp, $2::timestamp, interval '1 day') day(value)
     WHERE EXTRACT(ISODOW FROM day.value) < 6
       AND NOT EXISTS (SELECT 1 FROM holidays h WHERE h.holiday_date = day.value::date)
     GROUP BY year ORDER BY year`,
    [startDate, endDate]
  );
  if (!result.rows.length) throw new AppError("VALIDATION_FAILED", "Odabrano razdoblje nema radnih dana.");
  return result.rows;
}

export async function recordedYears(client: TenantTransaction, requestId: string): Promise<ReservationYear[]> {
  const result = await client.query<ReservationYear>(
    `SELECT calendar_year AS year, requested_days AS "requestedDays", reserved_days AS "reservedDays"
     FROM annual_leave_reservations WHERE request_id = $1 ORDER BY calendar_year`,
    [requestId]
  );
  if (!result.rows.length) throw new AppError("CONFLICT", "Nedostaje zapis rezervacije zahtjeva.");
  return result.rows;
}

// Call after taking the same worker row lock as legacy submissions and allowance edits.
async function allocate(
  client: TenantTransaction, workerId: string, allowance: number,
  years: ReservationYear[], excludedRequestId: string | null
): Promise<ReservationYear[]> {
  const result = await client.query<{ year: number; used: number }>(
    `WITH years AS (
       SELECT year, make_date(year, 1, 1) AS start_date, make_date(year, 12, 31) AS end_date
       FROM unnest($2::integer[]) AS candidates(year)
     ), legacy_days AS (
       SELECT y.year, COUNT(*)::integer AS used
       FROM years y
       JOIN leave_requests l ON l.end_date >= y.start_date AND l.start_date <= y.end_date
       CROSS JOIN LATERAL generate_series(GREATEST(l.start_date, y.start_date)::timestamp,
                    LEAST(l.end_date, y.end_date)::timestamp, interval '1 day') day(value)
       WHERE l.worker_id = $1 AND l.leave_type = 'annual_leave'
         AND l.reservation_submission_key IS NULL AND l.status IN ('pending', 'approved')
         AND EXTRACT(ISODOW FROM day.value) < 6
         AND NOT EXISTS (SELECT 1 FROM holidays h WHERE h.holiday_date = day.value::date)
       GROUP BY y.year
     ), reserved AS (
       SELECT r.calendar_year AS year, SUM(r.reserved_days)::integer AS used
       FROM annual_leave_reservations r
       JOIN leave_requests l ON l.organization_id = r.organization_id AND l.id = r.request_id
       WHERE l.worker_id = $1 AND l.status = 'pending' AND l.reservation_submission_key IS NOT NULL
         AND r.calendar_year = ANY($2::integer[]) AND r.request_id IS DISTINCT FROM $3::uuid
       GROUP BY r.calendar_year
     ), approved AS (
       SELECT y.year, COUNT(*)::integer AS used
       FROM years y
       JOIN annual_leave_decision_dates d ON d.absence_date BETWEEN y.start_date AND y.end_date
       JOIN leave_requests l ON l.organization_id = d.organization_id AND l.id = d.request_id
       WHERE l.worker_id = $1 AND l.status = 'approved' AND d.approved_revision IS NOT NULL AND d.absence_type = 'annual_leave'
       GROUP BY y.year
     )
     SELECT y.year, COALESCE(l.used, 0) + COALESCE(r.used, 0) + COALESCE(a.used, 0) AS used
     FROM years y LEFT JOIN legacy_days l USING (year) LEFT JOIN reserved r USING (year)
     LEFT JOIN approved a USING (year)`,
    [workerId, years.map(year => year.year), excludedRequestId]
  );
  const availableByYear = new Map(result.rows.map(row => [row.year, Math.max(0, allowance - row.used)]));
  return years.map(year => {
    const available = availableByYear.get(year.year)!;
    if (available < year.reservedDays) {
      throw new AppError("CONFLICT", "Raspoloživi fond više ne pokriva postojeću rezervaciju.");
    }
    return { ...year, reservedDays: Math.min(year.requestedDays, available) };
  });
}

function reservationView(row: ReservationRequestRow, years: ReservationYear[]) {
  return {
    requestId: row.id,
    revision: row.revision,
    status: row.status,
    years: years.map(year => ({ ...year, reservedDays: row.status === "pending" ? year.reservedDays : 0 }))
  };
}

export async function lockPendingReservation(
  client: TenantTransaction, actor: ActorContext, requestIdValue: string, revision: string
) {
  const found = (await client.query<{ worker_id: string; department_id: string }>(
    `SELECT l.worker_id, w.department_id FROM leave_requests l JOIN workers w ON w.id = l.worker_id
     WHERE l.id = $1 AND l.reservation_submission_key IS NOT NULL`, [requestIdValue]
  )).rows[0];
  if (!found) throw new AppError("NOT_FOUND", "Zahtjev s rezervacijom nije pronađen.");
  requireWorkerScope(actor, found.worker_id, found.department_id);
  const worker = await lockActiveLeaveWorker(client, found.worker_id);
  requireWorkerScope(actor, found.worker_id, worker.department_id);
  const { rows: [row] } = await client.query<PendingReservationRow>(
    `SELECT ${requestColumns}, start_date::text, end_date::text, reservation_submitted_by FROM leave_requests
     WHERE id = $1 AND worker_id = $2 AND reservation_submission_key IS NOT NULL FOR UPDATE`,
    [requestIdValue, found.worker_id]
  );
  if (!row || row.status !== "pending" || row.revision !== revision) {
    throw new AppError("STALE_REVISION", "Revizija zahtjeva više nije aktualna.");
  }
  return { row, worker };
}

async function requireCoveredDates(
  client: TenantTransaction, row: PendingReservationRow, dates: CoveredDate[], years: ReservationYear[]
): Promise<void> {
  const covered = new Map(years.map(y => [y.year, y.reservedDays]));
  for (const item of dates) {
    if (item.date < row.start_date || item.date > row.end_date || item.type !== "annual_leave") {
      throw new AppError("VALIDATION_FAILED", "Datum ili vrsta odstupaju od pokrivenog zahtjeva.");
    }
    const year = Number(item.date.slice(0, 4));
    const left = covered.get(year) ?? 0;
    if (left <= 0) throw new AppError("CONFLICT", "Odabrani dani prelaze rezervaciju za godinu.");
    covered.set(year, left - 1);
  }
  const { rows: [invalid] } = await client.query<{ invalid: boolean }>(
    `SELECT EXISTS (SELECT 1 FROM unnest($1::date[]) AS dates(day)
       WHERE EXTRACT(ISODOW FROM day) > 5 OR EXISTS (SELECT 1 FROM holidays h WHERE h.holiday_date = day)) AS invalid`,
    [dates.map(day => day.date)]
  );
  if (invalid!.invalid) throw new AppError("VALIDATION_FAILED", "Odabrani dan mora biti radni dan.");
}

export class PgAnnualLeaveReservationService {
  constructor(private readonly pool: pg.Pool) {}

  async readCoveredDecision(actor: ActorContext, requestIdValue: string, requestId: string) {
    requireRole(actor, ["worker", "manager", "admin"]);
    return withTenant(this.pool, actor, requestId, async client => {
      const { rows: [row] } = await client.query<{
        id: string; worker_id: string; department_id: string; revision: string; status: RequestStatus; dates: CoveredDate[];
        years: ReservationYear[]; eligible_dates: string[];
      }>(
        `SELECT l.id, l.worker_id, w.department_id, l.revision::text, l.status,
           COALESCE((SELECT jsonb_agg(jsonb_build_object('date', to_char(d.absence_date, 'YYYY-MM-DD'),
                      'type', d.absence_type) ORDER BY d.absence_date)
             FROM annual_leave_decision_dates d
             WHERE d.organization_id = l.organization_id AND d.request_id = l.id
               AND ((l.status = 'pending' AND d.confirmed_revision = l.revision AND d.approved_revision IS NULL)
                 OR (l.status = 'approved' AND d.approved_revision = l.revision))), '[]'::jsonb) AS dates,
           COALESCE((SELECT jsonb_agg(jsonb_build_object('year', r.calendar_year, 'requestedDays', r.requested_days,
                         'reservedDays', CASE WHEN l.status = 'pending' THEN r.reserved_days ELSE 0 END)
                         ORDER BY r.calendar_year)
             FROM annual_leave_reservations r
             WHERE r.organization_id = l.organization_id AND r.request_id = l.id), '[]'::jsonb) AS years,
           ARRAY(SELECT to_char(day.value, 'YYYY-MM-DD')
             FROM generate_series(l.start_date::timestamp, l.end_date::timestamp, interval '1 day') day(value)
             JOIN annual_leave_reservations r ON r.organization_id = l.organization_id AND r.request_id = l.id
               AND r.calendar_year = EXTRACT(YEAR FROM day.value) AND r.reserved_days > 0
             WHERE $2::boolean AND l.status = 'pending' AND EXTRACT(ISODOW FROM day.value) < 6
               AND NOT EXISTS (SELECT 1 FROM holidays h WHERE h.organization_id = l.organization_id
                               AND h.holiday_date = day.value::date)
             ORDER BY day.value) AS eligible_dates
         FROM leave_requests l JOIN workers w ON w.id = l.worker_id
         WHERE l.id = $1 AND l.reservation_submission_key IS NOT NULL`,
        [requestIdValue, actor.role === "worker"]
      );
      if (!row) throw new AppError("NOT_FOUND", "Zahtjev s rezervacijom nije pronađen.");
      requireWorkerScope(actor, row.worker_id, row.department_id);
      if (!row.years.length) throw new AppError("CONFLICT", "Nedostaje zapis rezervacije zahtjeva.");
      return { requestId: row.id, revision: row.revision, status: row.status, dates: row.dates,
        years: row.years, eligibleDates: row.eligible_dates };
    });
  }

  async submit(
    actor: ActorContext, input: Omit<LeaveRequestWrite, "typeCode">, submissionKey: string, requestId: string
  ) {
    requireRole(actor, ["worker"]);
    const workerId = actor.selfWorkerId;
    if (!workerId) throw new AppError("FORBIDDEN", "Korisnik nije povezan s radnikom.");
    if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/.test(submissionKey)) {
      throw new AppError("VALIDATION_FAILED", "Ključ ponavljanja zahtjeva nije valjan.");
    }
    requireBoundedDateRange(input.startDate, input.endDate);
    if ((input.note?.length ?? 0) > 1000) throw new AppError("VALIDATION_FAILED", "Napomena je preduga.");
    const hash = createHash("sha256")
      .update(JSON.stringify([workerId, input.startDate, input.endDate, input.note ?? null]))
      .digest("hex");
    return withTenant(this.pool, actor, requestId, async client => {
      const worker = await lockActiveLeaveWorker(client, workerId);
      const prior = (await client.query<ReservationRequestRow>(
        `SELECT ${requestColumns} FROM leave_requests
         WHERE organization_id = $1 AND reservation_submitted_by = $2 AND reservation_submission_key = $3`,
        [actor.organizationId, actor.userId, submissionKey]
      )).rows[0];
      if (prior) {
        if (prior.worker_id !== workerId || prior.reservation_submission_hash !== hash) {
          throw new AppError("CONFLICT", "Ključ je već korišten za drugi zahtjev.");
        }
        return reservationView(prior, await recordedYears(client, prior.id));
      }
      await requireNonOverlappingLeave(client, workerId, input.startDate, input.endDate, true);
      const requested = await requestedYears(client, input.startDate, input.endDate);
      const years = await allocate(client, workerId, worker.annual_leave_allowance, requested, null);
      const days = years.reduce((sum, year) => sum + year.requestedDays, 0);
      const { rows: [row] } = await client.query<ReservationRequestRow>(
        `INSERT INTO leave_requests (organization_id, worker_id, leave_type, start_date, end_date, working_days, note,
                                    reservation_submitted_by, reservation_submission_key, reservation_submission_hash)
         VALUES ($1, $2, 'annual_leave', $3, $4, $5, $6, $7, $8, $9)
         RETURNING ${requestColumns}`,
        [actor.organizationId, workerId, input.startDate, input.endDate, days, input.note ?? null,
          actor.userId, submissionKey, hash]
      );
      await client.query(
        `INSERT INTO annual_leave_reservations (organization_id, request_id, calendar_year, requested_days, reserved_days)
         SELECT $1, $2, q.year, q.requested, q.reserved
         FROM unnest($3::integer[], $4::integer[], $5::integer[]) q(year, requested, reserved)`,
        [actor.organizationId, row!.id, years.map(year => year.year),
          years.map(year => year.requestedDays), years.map(year => year.reservedDays)]
      );
      const result = reservationView(row!, years);
      await insertAudit(client, actor, requestId, "leave_request.reserve", "leave_request", row!.id, null, result, "leave");
      return result;
    });
  }

  async reprocess(actor: ActorContext, requestIdValue: string, revision: string, requestId: string) {
    requireRole(actor, ["worker", "manager", "admin"]);
    return withTenant(this.pool, actor, requestId, async client => {
      const { row, worker } = await lockPendingReservation(client, actor, requestIdValue, revision);
      const prior = await recordedYears(client, row.id);
      const next = await allocate(client, row.worker_id, worker.annual_leave_allowance, prior, row.id);
      if (next.every((year, index) => year.reservedDays === prior[index]!.reservedDays)) {
        return reservationView(row, prior);
      }
      await client.query(
        `UPDATE annual_leave_reservations r SET reserved_days = q.reserved
         FROM unnest($2::integer[], $3::integer[]) q(year, reserved)
         WHERE r.request_id = $1 AND r.calendar_year = q.year AND r.reserved_days <> q.reserved`,
        [row.id, next.map(year => year.year), next.map(year => year.reservedDays)]
      );
      const { rows: [updated] } = await client.query<ReservationRequestRow>(
        `UPDATE leave_requests SET revision = revision + 1 WHERE id = $1 RETURNING ${requestColumns}`,
        [row.id]
      );
      const result = reservationView(updated!, next);
      await insertAudit(client, actor, requestId, "leave_request.reprocess_reservation", "leave_request", row.id,
        reservationView(row, prior), result, "leave");
      return result;
    });
  }
  async confirmCoveredDates(
    actor: ActorContext, requestIdValue: string, revision: string, dates: CoveredDate[], requestId: string
  ) {
    requireRole(actor, ["worker"]);
    if (!dates.length || dates.length > 366 || new Set(dates.map(item => item.date)).size !== dates.length) {
      throw new AppError("VALIDATION_FAILED", "Odaberite jedinstvene datume godišnjeg odmora.");
    }
    const sorted = [...dates].sort((a, b) => a.date.localeCompare(b.date));
    for (const item of sorted) requireBoundedDateRange(item.date, item.date, 1);
    return withTenant(this.pool, actor, requestId, async client => {
      const { row } = await lockPendingReservation(client, actor, requestIdValue, revision);
      await requireCoveredDates(client, row, sorted, await recordedYears(client, row.id));
      const { rows: [next] } = await client.query<{ revision: string }>(
        "UPDATE leave_requests SET revision = revision + 1 WHERE id = $1 RETURNING revision::text", [row.id]
      );
      await client.query(
        `INSERT INTO annual_leave_decision_dates (organization_id, request_id, confirmed_revision, absence_date, absence_type, confirmed_by)
         SELECT $1, $2, $3, day, 'annual_leave', $4 FROM unnest($5::date[]) AS dates(day)`,
        [actor.organizationId, row.id, next!.revision, actor.userId, sorted.map(day => day.date)]
      );
      const confirmation = { requestId: row.id, revision: next!.revision, dates: sorted };
      await insertAudit(client, actor, requestId, "leave_request.confirm_covered_dates", "leave_request", row.id, null, confirmation, "leave");
      return confirmation;
    });
  }

  async approveConfirmedCoveredDates(actor: ActorContext, requestIdValue: string, revision: string, requestId: string) {
    requireRole(actor, ["admin", "manager"]);
    return withTenant(this.pool, actor, requestId, async client => {
      const { row, worker } = await lockPendingReservation(client, actor, requestIdValue, revision);
      const { rows: dates } = await client.query<CoveredDate>(
        `SELECT absence_date::text AS date, absence_type AS type FROM annual_leave_decision_dates
         WHERE request_id = $1 AND confirmed_revision = $2 AND approved_revision IS NULL ORDER BY absence_date`,
        [row.id, revision]
      );
      if (!dates.length) throw new AppError("CONFLICT", "Radnik mora potvrditi datume za aktualnu reviziju.");
      const { rows: [org] } = await client.query<{ today: string }>(
        "SELECT (transaction_timestamp() AT TIME ZONE timezone)::date::text AS today FROM organizations WHERE id = $1",
        [actor.organizationId]
      );
      if (!org) throw new AppError("NOT_FOUND", "Organizacija nije pronađena.");
      await requireLeaveApprovalPeriods(client, actor.organizationId, row.start_date, row.end_date, org.today);
      const years = await recordedYears(client, row.id);
      await allocate(client, row.worker_id, worker.annual_leave_allowance, years, row.id);
      await requireCoveredDates(client, row, dates, years);
      const { rows: [updated] } = await client.query<{ revision: string }>(
        `UPDATE leave_requests SET status = 'approved', decided_by = $2, decided_at = clock_timestamp(),
           revision = revision + 1 WHERE id = $1 RETURNING revision::text`, [row.id, actor.userId]
      );
      await client.query(
        `UPDATE annual_leave_decision_dates SET approved_revision = $3
         WHERE request_id = $1 AND confirmed_revision = $2`, [row.id, revision, updated!.revision]
      );
      const decision = { requestId: row.id, revision: updated!.revision, status: "approved" as const, dates };
      await insertAudit(client, actor, requestId, "leave_request.approve_covered_dates", "leave_request", row.id,
        { revision, status: "pending" }, decision, "leave");
      return decision;
    });
  }

}
