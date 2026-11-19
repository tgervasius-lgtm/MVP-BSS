import type pg from "pg";
import { withTenant, type TenantTransaction } from "../db/tenant.js";
import { AppError } from "../domain/errors.js";
import type { ActorContext } from "../domain/types.js";
import { requireRole, requireWorkerScope } from "../security/rbac.js";
import { requireAnnualLeaveExceptionGrant } from "./annual-leave-exception-grants.js";
import type { LeaveType } from "./contracts.js";
import { insertAudit } from "./mvp-audit.js";
import { lockPendingReservation, recordedYears } from "./pg-annual-leave-reservation-service.js";
import { requireBoundedDateRange } from "./validation.js";

export const alternateLeaveTypes = ["paid_leave", "unpaid_leave", "free_day"] as const;
type AlternateLeaveType = typeof alternateLeaveTypes[number];
export type ExceptionDate = { date: string; type: LeaveType };
type CompanyPolicy = (organizationId: string) => readonly AlternateLeaveType[];

type ProposalView = {
  requestId: string;
  revision: string;
  proposalRevision: string;
  confirmed: boolean;
  dates: ExceptionDate[];
};

function sortedDates(dates: ExceptionDate[]): ExceptionDate[] {
  if (!dates.length || dates.length > 366 || new Set(dates.map(item => item.date)).size !== dates.length) {
    throw new AppError("VALIDATION_FAILED", "Navedite točne i jedinstvene datume prijedloga.");
  }
  for (const item of dates) requireBoundedDateRange(item.date, item.date, 1);
  return [...dates].sort((left, right) => left.date.localeCompare(right.date));
}

async function advanceRevision(db: TenantTransaction, requestId: string): Promise<string> {
  const { rows: [next] } = await db.query<{ revision: string }>(
    "UPDATE leave_requests SET revision = revision + 1 WHERE id = $1 RETURNING revision::text", [requestId]
  );
  return next!.revision;
}

async function requireProposalTerms(
  db: TenantTransaction, row: { id: string; start_date: string; end_date: string },
  dates: ExceptionDate[], companyTypes: readonly AlternateLeaveType[]
) {
  const { rows: workdays } = await db.query<{ date: string }>(
    `SELECT to_char(day.value, 'YYYY-MM-DD') AS date
     FROM generate_series($1::timestamp, $2::timestamp, interval '1 day') day(value)
     WHERE EXTRACT(ISODOW FROM day.value) < 6
       AND NOT EXISTS (SELECT 1 FROM holidays h WHERE h.holiday_date = day.value::date)
     ORDER BY day.value`,
    [row.start_date, row.end_date]
  );
  if (dates.length !== workdays.length || dates.some((item, index) => item.date !== workdays[index]!.date)) {
    throw new AppError("VALIDATION_FAILED", "Prijedlog mora obuhvatiti svaki radni dan iz zahtjeva.");
  }

  const counts = new Map<number, { annual: number; total: number }>();
  const allowed = new Set<LeaveType>(alternateLeaveTypes.filter(type => companyTypes.includes(type)));
  for (const item of dates) {
    if (item.type !== "annual_leave" && !allowed.has(item.type)) {
      throw new AppError("VALIDATION_FAILED", "Vrsta odsutnosti nije dopuštena za iznimke ove tvrtke.");
    }
    const year = Number(item.date.slice(0, 4));
    const count = counts.get(year) ?? { annual: 0, total: 0 };
    count.total++;
    if (item.type === "annual_leave") count.annual++;
    counts.set(year, count);
  }
  const years = await recordedYears(db, row.id);
  if (years.length !== counts.size || years.some(year => counts.get(year.year)?.total !== year.requestedDays
    || counts.get(year.year)?.annual !== year.reservedDays)) {
    throw new AppError("CONFLICT", "Prijedlog mora odgovarati rezerviranim danima godišnjeg odmora po godini.");
  }
  if (years.every(year => year.reservedDays === year.requestedDays)) {
    throw new AppError("CONFLICT", "Zahtjev nema nepokrivenih dana.");
  }
}

export class PgAnnualLeaveExceptionProposalService {
  constructor(private readonly pool: pg.Pool, private readonly companyPolicy: CompanyPolicy) {}

  async propose(
    actor: ActorContext, id: string, revision: string, input: { reason: string; dates: ExceptionDate[] }, requestId: string
  ): Promise<ProposalView> {
    requireRole(actor, ["admin"]);
    const reason = input.reason.trim();
    if (!reason || reason.length > 500 || /[\u0000-\u001f\u007f]/.test(reason)) {
      throw new AppError("VALIDATION_FAILED", "Navedite valjan razlog iznimke.");
    }
    const dates = sortedDates(input.dates);
    return withTenant(this.pool, actor, requestId, async db => {
      const grantRevision = await requireAnnualLeaveExceptionGrant(db, actor);
      const { row } = await lockPendingReservation(db, actor, id, revision);
      await requireProposalTerms(db, row, dates, this.companyPolicy(actor.organizationId));
      const proposalRevision = await advanceRevision(db, id);
      await db.query(
        `INSERT INTO annual_leave_exception_proposals
          (organization_id, request_id, proposal_revision, administrator_id, grant_revision, reason, dates)
         VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)`,
        [actor.organizationId, id, proposalRevision, actor.userId, grantRevision, reason, JSON.stringify(dates)]
      );
      const result = { requestId: id, revision: proposalRevision, proposalRevision, confirmed: false, dates };
      await insertAudit(db, actor, requestId, "leave_request.propose_exception", "leave_request", id,
        { revision }, { ...result, grantRevision, reason }, "leave");
      return result;
    });
  }

  async read(actor: ActorContext, id: string, requestId: string): Promise<ProposalView> {
    requireRole(actor, ["worker", "manager", "admin"]);
    return withTenant(this.pool, actor, requestId, async db => {
      const { rows: [row] } = await db.query<{
        revision: string; worker_id: string; department_id: string; proposal_revision: string;
        confirmed: boolean; dates: ExceptionDate[];
      }>(
        `SELECT l.revision::text, l.worker_id, w.department_id, p.proposal_revision::text,
                (c.confirmation_revision IS NOT NULL) AS confirmed, p.dates
         FROM leave_requests l
         JOIN workers w ON (w.organization_id, w.id) = (l.organization_id, l.worker_id)
         JOIN annual_leave_exception_proposals p
           ON (p.organization_id, p.request_id) = (l.organization_id, l.id)
           AND l.revision IN (p.proposal_revision, p.proposal_revision + 1)
         LEFT JOIN annual_leave_exception_confirmations c
           ON (c.organization_id, c.request_id, c.proposal_revision) = (p.organization_id, p.request_id, p.proposal_revision)
           AND c.confirmation_revision = l.revision
         WHERE l.id = $1 AND l.status = 'pending' AND l.reservation_submission_key IS NOT NULL
           AND (p.proposal_revision = l.revision OR c.confirmation_revision = l.revision)`, [id]
      );
      if (!row) throw new AppError("NOT_FOUND", "Aktualni prijedlog iznimke nije pronađen.");
      requireWorkerScope(actor, row.worker_id, row.department_id);
      return { requestId: id, revision: row.revision, proposalRevision: row.proposal_revision,
        confirmed: row.confirmed, dates: row.dates };
    });
  }

  async confirm(
    actor: ActorContext, id: string, revision: string, dates: ExceptionDate[], requestId: string
  ): Promise<ProposalView> {
    requireRole(actor, ["worker"]);
    const selected = sortedDates(dates);
    return withTenant(this.pool, actor, requestId, async db => {
      const { row } = await lockPendingReservation(db, actor, id, revision);
      if (row.reservation_submitted_by !== actor.userId) {
        throw new AppError("FORBIDDEN", "Prijedlog može potvrditi podnositelj zahtjeva.");
      }
      const { rows: [proposal] } = await db.query<{ dates: ExceptionDate[] }>(
        `SELECT dates FROM annual_leave_exception_proposals
         WHERE request_id = $1 AND proposal_revision = $2`, [id, revision]
      );
      if (!proposal || selected.length !== proposal.dates.length || selected.some((item, index) =>
        item.date !== proposal.dates[index]!.date || item.type !== proposal.dates[index]!.type)) {
        throw new AppError("CONFLICT", "Potvrdite točne datume i vrste odsutnosti iz aktualnog prijedloga.");
      }
      await requireProposalTerms(db, row, selected, this.companyPolicy(actor.organizationId));
      const confirmationRevision = await advanceRevision(db, id);
      await db.query(
        `INSERT INTO annual_leave_exception_confirmations
          (organization_id, request_id, proposal_revision, confirmation_revision, worker_user_id)
         VALUES ($1, $2, $3, $4, $5)`, [actor.organizationId, id, revision, confirmationRevision, actor.userId]
      );
      const result = { requestId: id, revision: confirmationRevision, proposalRevision: revision, confirmed: true, dates: selected };
      await insertAudit(db, actor, requestId, "leave_request.confirm_exception", "leave_request", id, { revision }, result, "leave");
      return result;
    });
  }
}
