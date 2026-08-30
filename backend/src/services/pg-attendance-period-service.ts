import { randomUUID } from "node:crypto";
import type pg from "pg";
import { withTenant, type TenantTransaction } from "../db/tenant.js";
import { AppError } from "../domain/errors.js";
import type { ActorContext } from "../domain/types.js";
import { requireRole } from "../security/rbac.js";
import {
  lockAttendancePeriod,
  type AttendancePeriodState
} from "./attendance-period-lock.js";
import {
  attendancePeriodBounds,
  captureAttendancePeriodSnapshot,
  REPORT_TEMPLATE_VERSION
} from "./attendance-period-snapshot.js";
import type {
  AttendancePeriodTransitionWrite,
  AttendancePeriodUnresolvedCounts,
  AttendancePeriodView
} from "./contracts.js";
import { lockTerminalEventLifecycle } from "./terminal-event-lock.js";

type PeriodRow = {
  id: string;
  year: number;
  month: number;
  status: AttendancePeriodState;
  revision: string | number;
  dataset_version: string | null;
  dataset_checksum_sha256: string | null;
  calculation_versions: string[] | string;
  template_version: string;
  provenance_status: "none" | "complete" | "legacy_unavailable";
  review_started_at: string | Date | null;
  locked_at: string | Date | null;
  closed_at: string | Date | null;
  reopened_at: string | Date | null;
  transition_reason: string | null;
};

const periodSelect = `SELECT id, year, month, status, revision, dataset_version,
  dataset_checksum_sha256, calculation_versions, template_version, provenance_status,
  review_started_at, locked_at, closed_at, reopened_at, transition_reason`;

function iso(value: string | Date | null): string | null {
  return value ? (value instanceof Date ? value.toISOString() : new Date(value).toISOString()) : null;
}

function versions(value: string[] | string): string[] {
  return typeof value === "string" ? JSON.parse(value) as string[] : value;
}

function validatePeriod(year: number, month: number): void {
  if (!Number.isInteger(year) || year < 2020 || year > 2100 || !Number.isInteger(month) || month < 1 || month > 12) {
    throw new AppError("VALIDATION_FAILED", "Razdoblje mora sadržavati valjanu godinu i mjesec.");
  }
}

function reason(input: AttendancePeriodTransitionWrite): string {
  const value = input.reason.trim();
  if (value.length < 3) throw new AppError("VALIDATION_FAILED", "Razlog prijelaza mora imati najmanje tri znaka.");
  return value;
}

async function unresolvedCounts(
  client: TenantTransaction,
  actor: ActorContext,
  year: number,
  month: number
): Promise<AttendancePeriodUnresolvedCounts> {
  const bounds = attendancePeriodBounds(year, month);
  const result = await client.query<{
    active: string; incomplete: string; pending_corrections: string; reconciliation_required: string;
  }>(
    `WITH scoped_days AS (
       SELECT a.id, a.status,
         COALESCE(event_scope.effective_department_id, assignment_scope.department_id) AS scope_department_id
       FROM attendance_days a
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
         JOIN organizations o ON o.id = a.organization_id
         WHERE assignment.worker_id = a.worker_id
           AND assignment.effective_from <= COALESCE(
             a.check_in,
             a.work_date::timestamp AT TIME ZONE o.timezone
           )
           AND (assignment.effective_to IS NULL OR assignment.effective_to > COALESCE(
             a.check_in,
             a.work_date::timestamp AT TIME ZONE o.timezone
           ))
         ORDER BY assignment.effective_from DESC LIMIT 1
       ) assignment_scope ON true
       WHERE a.work_date BETWEEN $1::date AND $2::date
     )
     SELECT
       (SELECT COUNT(*)::text FROM scoped_days
        WHERE status = 'active' AND ($3::text <> 'manager' OR scope_department_id = ANY($4::uuid[]))) AS active,
       (SELECT COUNT(*)::text FROM scoped_days
        WHERE status = 'incomplete' AND ($3::text <> 'manager' OR scope_department_id = ANY($4::uuid[]))) AS incomplete,
       (SELECT COUNT(*)::text FROM correction_requests c JOIN scoped_days a ON a.id = c.attendance_day_id
        WHERE c.status = 'pending' AND ($3::text <> 'manager' OR a.scope_department_id = ANY($4::uuid[]))) AS pending_corrections,
       (SELECT COUNT(*)::text FROM attendance_events e CROSS JOIN organizations o
        LEFT JOIN organization_timezone_versions tz
          ON tz.id = NULLIF(e.lifecycle_evidence->>'timezoneVersionId', '')::uuid
        WHERE o.id = bss_current_organization_id() AND e.processing_status = 'reconciliation_required'
          AND COALESCE(e.resolved_local_at::date, (e.occurred_at AT TIME ZONE COALESCE(tz.timezone, o.timezone))::date)
            BETWEEN $1::date AND $2::date
          AND ($3::text <> 'manager' OR e.effective_department_id = ANY($4::uuid[]))
          AND NOT EXISTS (SELECT 1 FROM terminal_event_reconciliations r WHERE r.attendance_event_id = e.id)) AS reconciliation_required`,
    [bounds.from, bounds.to, actor.role, actor.departmentIds]
  );
  const row = result.rows[0]!;
  const counts = {
    active: Number(row.active),
    incomplete: Number(row.incomplete),
    pendingCorrections: Number(row.pending_corrections),
    reconciliationRequired: Number(row.reconciliation_required)
  };
  return { ...counts, total: counts.active + counts.incomplete + counts.pendingCorrections + counts.reconciliationRequired };
}

async function periodView(
  client: TenantTransaction,
  actor: ActorContext,
  year: number,
  month: number,
  row?: PeriodRow
): Promise<AttendancePeriodView> {
  const period = row ?? (await client.query<PeriodRow>(
    `${periodSelect} FROM attendance_month_locks WHERE year = $1 AND month = $2`, [year, month]
  )).rows[0];
  const unresolved = await unresolvedCounts(client, actor, year, month);
  if (!period) {
    return { id: null, year, month, status: "open", revision: "0", datasetVersion: null,
      datasetChecksumSha256: null, calculationVersions: [], templateVersion: null,
      provenanceStatus: "none", unresolved, reviewStartedAt: null, finalizedAt: null,
      closedAt: null, reopenedAt: null, lastReason: null };
  }
  return {
    id: period.id,
    year: period.year,
    month: period.month,
    status: period.status,
    revision: String(period.revision),
    datasetVersion: period.dataset_version,
    datasetChecksumSha256: period.dataset_checksum_sha256,
    calculationVersions: period.provenance_status === "complete" ? versions(period.calculation_versions) : [],
    templateVersion: period.provenance_status === "complete" ? period.template_version : null,
    provenanceStatus: period.provenance_status,
    unresolved,
    reviewStartedAt: iso(period.review_started_at),
    finalizedAt: iso(period.locked_at),
    closedAt: iso(period.closed_at),
    reopenedAt: iso(period.reopened_at),
    lastReason: period.transition_reason
  };
}

async function idempotentResult(
  client: TenantTransaction,
  idempotencyKey: string,
  year: number,
  month: number,
  targetStatus: AttendancePeriodState
): Promise<AttendancePeriodView | null> {
  const result = await client.query<{
    year: number; month: number; transition_to_status: AttendancePeriodState;
    result_json: AttendancePeriodView | string;
  }>(
    `SELECT p.year, p.month, t.to_status AS transition_to_status, t.result_json
     FROM attendance_period_transitions t
     JOIN attendance_month_locks p ON p.id = t.period_id
     WHERE t.idempotency_key = $1`,
    [idempotencyKey]
  );
  const row = result.rows[0];
  if (row && (row.year !== year || row.month !== month || row.transition_to_status !== targetStatus)) {
    throw new AppError("CONFLICT", "Ključ idempotentnosti već je korišten za drugu promjenu razdoblja.");
  }
  if (!row) return null;
  return typeof row.result_json === "string"
    ? JSON.parse(row.result_json) as AttendancePeriodView
    : row.result_json;
}

async function insertTransition(
  client: TenantTransaction,
  actor: ActorContext,
  period: PeriodRow,
  fromStatus: AttendancePeriodState,
  reasonValue: string,
  idempotencyKey: string,
  requestId: string,
  beforeVersion: string | null,
  beforeChecksum: string | null
): Promise<AttendancePeriodView> {
  const result = await periodView(client, actor, period.year, period.month, period);
  await client.query(
    `INSERT INTO attendance_period_transitions (
       organization_id, period_id, from_status, to_status, resulting_revision, actor_id,
       reason, before_dataset_version, after_dataset_version,
       before_dataset_checksum_sha256, after_dataset_checksum_sha256, idempotency_key, request_id,
       result_json
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14::jsonb)`,
    [actor.organizationId, period.id, fromStatus, period.status, period.revision, actor.userId,
      reasonValue, beforeVersion, period.dataset_version, beforeChecksum,
      period.dataset_checksum_sha256, idempotencyKey, requestId, JSON.stringify(result)]
  );
  await client.query(
    `INSERT INTO audit_events (
       organization_id, actor_type, actor_id, actor_role, action, entity_type, entity_id,
       before_json, after_json, request_id, metadata
     ) VALUES ($1, 'user', $2, $3, $4, 'attendance_period', $5, $6::jsonb, $7::jsonb, $8, $9::jsonb)`,
    [actor.organizationId, actor.userId, actor.role, `attendance_period.${period.status}`, period.id,
      JSON.stringify({ status: fromStatus, datasetVersion: beforeVersion, datasetChecksumSha256: beforeChecksum }),
      JSON.stringify({ status: period.status, revision: String(period.revision), datasetVersion: period.dataset_version,
        datasetChecksumSha256: period.dataset_checksum_sha256 }), requestId,
      JSON.stringify({ module: "reports", year: period.year, month: period.month, reason: reasonValue })]
  );
  return result;
}

export class PgAttendancePeriodService {
  constructor(private readonly pool: pg.Pool) {}

  async get(actor: ActorContext, year: number, month: number): Promise<AttendancePeriodView> {
    requireRole(actor, ["admin", "manager", "accountant"]);
    validatePeriod(year, month);
    return withTenant(this.pool, actor, "attendance-period-read", (client) => periodView(client, actor, year, month));
  }

  async startReview(actor: ActorContext, year: number, month: number, input: AttendancePeriodTransitionWrite,
    revision: string, idempotencyKey: string, requestId: string): Promise<AttendancePeriodView> {
    requireRole(actor, ["admin"]);
    validatePeriod(year, month);
    const reasonValue = reason(input);
    return withTenant(this.pool, actor, requestId, async (client) => {
      await lockTerminalEventLifecycle(client, actor.organizationId);
      await lockAttendancePeriod(client, actor.organizationId, year, month);
      const repeated = await idempotentResult(client, idempotencyKey, year, month, "review");
      if (repeated) return repeated;
      const current = (await client.query<PeriodRow>(
        `${periodSelect} FROM attendance_month_locks WHERE year = $1 AND month = $2 FOR UPDATE`, [year, month]
      )).rows[0];
      if (!current) {
        if (revision !== "0") throw new AppError("STALE_REVISION", "Razdoblje je u međuvremenu promijenjeno.");
        const created = (await client.query<PeriodRow>(
          `INSERT INTO attendance_month_locks (
             organization_id, year, month, status, review_started_by, review_started_at, transition_reason
           ) VALUES ($1, $2, $3, 'review', $4, clock_timestamp(), $5)
           RETURNING id, year, month, status, revision, dataset_version, dataset_checksum_sha256,
             calculation_versions, template_version, provenance_status, review_started_at,
             locked_at, closed_at, reopened_at, transition_reason`,
          [actor.organizationId, year, month, actor.userId, reasonValue]
        )).rows[0]!;
        return insertTransition(client, actor, created, "open", reasonValue, idempotencyKey, requestId, null, null);
      }
      if (current.status !== "open") throw new AppError("CONFLICT", "Samo otvoreno razdoblje može prijeći u pregled.");
      if (String(current.revision) !== revision) throw new AppError("STALE_REVISION", "Razdoblje je u međuvremenu promijenjeno.");
      const updated = (await client.query<PeriodRow>(
        `UPDATE attendance_month_locks SET status = 'review', revision = revision + 1,
           review_started_by = $2, review_started_at = clock_timestamp(), transition_reason = $3
         WHERE id = $1 RETURNING id, year, month, status, revision, dataset_version,
           dataset_checksum_sha256, calculation_versions, template_version, provenance_status,
           review_started_at, locked_at, closed_at, reopened_at, transition_reason`,
        [current.id, actor.userId, reasonValue]
      )).rows[0]!;
      return insertTransition(client, actor, updated, "open", reasonValue, idempotencyKey, requestId,
        current.provenance_status === "complete" ? current.dataset_version : null,
        current.provenance_status === "complete" ? current.dataset_checksum_sha256 : null);
    });
  }

  async finalize(actor: ActorContext, year: number, month: number, input: AttendancePeriodTransitionWrite,
    revision: string, idempotencyKey: string, requestId: string): Promise<AttendancePeriodView> {
    requireRole(actor, ["admin"]);
    validatePeriod(year, month);
    const reasonValue = reason(input);
    return withTenant(this.pool, actor, requestId, async (client) => {
      await lockTerminalEventLifecycle(client, actor.organizationId);
      await lockAttendancePeriod(client, actor.organizationId, year, month);
      const repeated = await idempotentResult(client, idempotencyKey, year, month, "finalized");
      if (repeated) return repeated;
      const current = (await client.query<PeriodRow>(
        `${periodSelect} FROM attendance_month_locks WHERE year = $1 AND month = $2 FOR UPDATE`, [year, month]
      )).rows[0];
      if (!current || current.status !== "review") throw new AppError("CONFLICT", "Samo razdoblje u pregledu može biti finalizirano.");
      if (String(current.revision) !== revision) throw new AppError("STALE_REVISION", "Razdoblje je u međuvremenu promijenjeno.");
      const unresolved = await unresolvedCounts(client, actor, year, month);
      if (unresolved.total > 0) {
        throw new AppError("CONFLICT", `Razdoblje ima ${unresolved.total} neriješenih evidencijskih stavki i ne može biti finalizirano.`);
      }
      const captured = await captureAttendancePeriodSnapshot(client, actor.organizationId, year, month);
      const nextRevision = (BigInt(String(current.revision)) + 1n).toString();
      const versionId = randomUUID();
      await client.query(
        `INSERT INTO attendance_period_versions (
           id, organization_id, period_id, year, month, period_revision, dataset_snapshot,
           dataset_checksum_sha256, calculation_versions, template_version, finalized_by,
           reason, request_id
         ) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9::jsonb, $10, $11, $12, $13)`,
        [versionId, actor.organizationId, current.id, year, month, nextRevision,
          JSON.stringify(captured.snapshot), captured.checksumSha256, JSON.stringify(captured.calculationVersions),
          REPORT_TEMPLATE_VERSION, actor.userId, reasonValue, requestId]
      );
      const updated = (await client.query<PeriodRow>(
        `UPDATE attendance_month_locks SET status = 'finalized', revision = revision + 1,
           locked_by = $2, locked_at = clock_timestamp(), dataset_version = $3,
           dataset_checksum_sha256 = $4, calculation_versions = $5::jsonb,
           template_version = $6, dataset_snapshot = $7::jsonb, provenance_status = 'complete',
           transition_reason = $8, closed_by = NULL, closed_at = NULL
         WHERE id = $1 RETURNING id, year, month, status, revision, dataset_version,
           dataset_checksum_sha256, calculation_versions, template_version, provenance_status,
           review_started_at, locked_at, closed_at, reopened_at, transition_reason`,
        [current.id, actor.userId, versionId, captured.checksumSha256,
          JSON.stringify(captured.calculationVersions), REPORT_TEMPLATE_VERSION,
          JSON.stringify(captured.snapshot), reasonValue]
      )).rows[0]!;
      return insertTransition(client, actor, updated, "review", reasonValue, idempotencyKey, requestId,
        current.provenance_status === "complete" ? current.dataset_version : null,
        current.provenance_status === "complete" ? current.dataset_checksum_sha256 : null);
    });
  }

  async close(actor: ActorContext, year: number, month: number, input: AttendancePeriodTransitionWrite,
    revision: string, idempotencyKey: string, requestId: string): Promise<AttendancePeriodView> {
    return this.simpleTransition(actor, year, month, input, revision, idempotencyKey, requestId, ["finalized"], "closed");
  }

  async reopen(actor: ActorContext, year: number, month: number, input: AttendancePeriodTransitionWrite,
    revision: string, idempotencyKey: string, requestId: string): Promise<AttendancePeriodView> {
    return this.simpleTransition(actor, year, month, input, revision, idempotencyKey, requestId, ["finalized", "closed"], "open");
  }

  private async simpleTransition(actor: ActorContext, year: number, month: number,
    input: AttendancePeriodTransitionWrite, revision: string, idempotencyKey: string, requestId: string,
    allowed: AttendancePeriodState[], target: AttendancePeriodState): Promise<AttendancePeriodView> {
    requireRole(actor, ["admin"]);
    validatePeriod(year, month);
    const reasonValue = reason(input);
    return withTenant(this.pool, actor, requestId, async (client) => {
      await lockTerminalEventLifecycle(client, actor.organizationId);
      await lockAttendancePeriod(client, actor.organizationId, year, month);
      const repeated = await idempotentResult(client, idempotencyKey, year, month, target);
      if (repeated) return repeated;
      const current = (await client.query<PeriodRow>(
        `${periodSelect} FROM attendance_month_locks WHERE year = $1 AND month = $2 FOR UPDATE`, [year, month]
      )).rows[0];
      if (!current || !allowed.includes(current.status)) throw new AppError("CONFLICT", "Prijelaz stanja razdoblja nije dopušten.");
      if (String(current.revision) !== revision) throw new AppError("STALE_REVISION", "Razdoblje je u međuvremenu promijenjeno.");
      if (target === "closed") {
        const unresolved = await unresolvedCounts(client, actor, year, month);
        if (unresolved.total > 0) {
          throw new AppError("CONFLICT", `Razdoblje ima ${unresolved.total} novih neriješenih evidencijskih stavki i ne može biti zatvoreno.`);
        }
      }
      const timestampColumns = target === "closed"
        ? "closed_by = $2, closed_at = clock_timestamp()"
        : "reopened_by = $2, reopened_at = clock_timestamp()";
      const updated = (await client.query<PeriodRow>(
        `UPDATE attendance_month_locks SET status = $3, revision = revision + 1,
           ${timestampColumns}, transition_reason = $4
         WHERE id = $1 RETURNING id, year, month, status, revision, dataset_version,
           dataset_checksum_sha256, calculation_versions, template_version, provenance_status,
           review_started_at, locked_at, closed_at, reopened_at, transition_reason`,
        [current.id, actor.userId, target, reasonValue]
      )).rows[0]!;
      return insertTransition(client, actor, updated, current.status, reasonValue, idempotencyKey, requestId,
        current.provenance_status === "complete" ? current.dataset_version : null,
        current.provenance_status === "complete" ? current.dataset_checksum_sha256 : null);
    });
  }
}
