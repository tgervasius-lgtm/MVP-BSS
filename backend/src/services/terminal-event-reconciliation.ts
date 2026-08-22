import { randomUUID } from "node:crypto";
import type pg from "pg";
import { withTenant, type TenantTransaction } from "../db/tenant.js";
import { AppError } from "../domain/errors.js";
import type { ActorContext } from "../domain/types.js";
import { requireRole } from "../security/rbac.js";
import {
  ATTENDANCE_CALCULATION_VERSION,
  attendanceSelect,
  attendanceView,
  eventBusinessContext,
  iso,
  jsonObject,
  plannedMinutes,
  shiftSnapshot,
  timeMinutes,
  type AttendanceRow,
  type CompleteConfigurationSnapshot
} from "./attendance-calculation.js";
import type {
  AttendanceDayView,
  TerminalEventReconciliationView,
  TerminalEventReconciliationWrite,
  TerminalEventWrite,
  TerminalLifecycleEvidence
} from "./contracts.js";
import { resolveTerminalConfiguration, type ResolvedEventTime } from "./terminal-event-configuration.js";
import { lockTerminalEventLifecycle } from "./terminal-event-lock.js";

type AppliedAttendanceEvent = {
  status: "synced" | "rejected";
  code: string | null;
  attendanceDayId: string | null;
  beforeDay: AttendanceRow | null;
};

type ReconciliationEventRow = {
  id: string;
  terminal_id: string;
  worker_id: string | null;
  effective_department_id: string | null;
  rfid_card_id: string | null;
  occurred_at: string | Date;
  acknowledged_at: string | Date | null;
  event_type: "check_in" | "check_out";
  device_clock_offset_seconds: number;
  clock_status: "trusted" | "uncertain" | null;
  acknowledgement_key_id: string | null;
  acknowledgement_key_version: number | null;
  processing_status: string;
  rejection_code: string | null;
  lifecycle_evidence: TerminalLifecycleEvidence | string;
};

type ExistingResolutionRow = {
  id: string;
  resolution: "accepted" | "rejected";
  reason: string;
  attendance_day_id: string | null;
  resolved_by: string;
  created_at: string | Date;
};

function withCurrentCalculation(row: AttendanceRow, calculationId: string, sourceEventIds: string[]): AttendanceRow {
  return { ...row, current_calculation_id: calculationId, source_event_ids: sourceEventIds };
}

async function insertCalculation(
  client: TenantTransaction,
  input: {
    id: string;
    organizationId: string;
    attendanceDayId: string;
    configuration: CompleteConfigurationSnapshot;
    sourceEventIds: string[];
    before: AttendanceDayView | null;
    after: AttendanceDayView;
    reason: string;
    actorId: string;
    supersedesId: string | null;
    workDate: string;
    requestId: string;
  }
): Promise<void> {
  await client.query(
    `INSERT INTO attendance_calculations (
       id, organization_id, attendance_day_id, calculation_version, configuration_snapshot,
       source_event_ids, before_json, after_json, reason, actor_type, actor_id,
       supersedes_id, affected_from, affected_to, request_id
     ) VALUES ($1, $2, $3, $4, $5::jsonb, $6::uuid[], $7::jsonb, $8::jsonb,
       $9, 'user', $10, $11, $12::date, $12::date, $13)`,
    [input.id, input.organizationId, input.attendanceDayId, ATTENDANCE_CALCULATION_VERSION,
      JSON.stringify({ ...input.configuration, eventTimeInterpretations: input.after.provenance.eventTimeInterpretations }),
      input.sourceEventIds, input.before ? JSON.stringify(input.before) : null, JSON.stringify(input.after),
      input.reason, input.actorId, input.supersedesId, input.workDate, input.requestId]
  );
  await client.query("UPDATE attendance_days SET current_calculation_id = $2 WHERE id = $1", [input.attendanceDayId, input.id]);
}

export async function applyAttendanceEvent(
  client: TenantTransaction,
  organizationId: string,
  workerId: string,
  event: Pick<TerminalEventWrite, "occurredAt" | "eventType">,
  configuration: CompleteConfigurationSnapshot,
  interpretation: ResolvedEventTime
): Promise<AppliedAttendanceEvent> {
  const { workDate, localMinutes } = eventBusinessContext(
    interpretation,
    configuration.shift.startTime,
    configuration.shift.endTime
  );
  const snapshot = shiftSnapshot(configuration);
  const day = await client.query<AttendanceRow>(
    `${attendanceSelect} FROM attendance_days a WHERE a.worker_id = $1 AND a.work_date = $2::date FOR UPDATE OF a`,
    [workerId, workDate]
  );
  const current = day.rows[0];
  const beforeDay = current ?? null;
  let attendanceDayId: string | null = null;
  if (event.eventType === "check_in") {
    if (current?.check_in) return { status: "rejected", code: "ALREADY_CHECKED_IN", attendanceDayId: null, beforeDay };
    const late = localMinutes > timeMinutes(configuration.shift.startTime) + configuration.shift.toleranceMinutes;
    if (current?.check_out) {
      const elapsed = new Date(current.check_out).getTime() - new Date(event.occurredAt).getTime();
      if (elapsed <= 0) return { status: "rejected", code: "CHECK_IN_AFTER_CHECK_OUT", attendanceDayId: null, beforeDay };
      if (elapsed > 16 * 60 * 60 * 1000) return { status: "rejected", code: "SHIFT_DURATION_EXCEEDED", attendanceDayId: null, beforeDay };
      const worked = Math.max(0, Math.floor(elapsed / 60_000) - configuration.shift.breakMinutes);
      await client.query(
        `UPDATE attendance_days SET check_in = $2, shift_snapshot = $3::jsonb,
           break_minutes = $4, worked_minutes = $5, planned_minutes = $6,
           status = $7, calculation_version = $8, configuration_snapshot = $9::jsonb,
           revision = revision + 1 WHERE id = $1`,
        [current.id, event.occurredAt, JSON.stringify(snapshot), configuration.shift.breakMinutes, worked,
          plannedMinutes(configuration.shift.startTime, configuration.shift.endTime, configuration.shift.breakMinutes),
          late ? "late" : "complete", ATTENDANCE_CALCULATION_VERSION, JSON.stringify(configuration)]
      );
      attendanceDayId = current.id;
    } else if (current) {
      await client.query(
        `UPDATE attendance_days SET check_in = $2, shift_snapshot = $3::jsonb,
           break_minutes = $4, planned_minutes = $5, status = $6,
           calculation_version = $7, configuration_snapshot = $8::jsonb,
           revision = revision + 1 WHERE id = $1`,
        [current.id, event.occurredAt, JSON.stringify(snapshot), configuration.shift.breakMinutes,
          plannedMinutes(configuration.shift.startTime, configuration.shift.endTime, configuration.shift.breakMinutes),
          late ? "late" : "active", ATTENDANCE_CALCULATION_VERSION, JSON.stringify(configuration)]
      );
      attendanceDayId = current.id;
    } else {
      const inserted = await client.query<{ id: string }>(
        `INSERT INTO attendance_days (
           organization_id, worker_id, work_date, shift_snapshot, check_in, break_minutes,
           worked_minutes, planned_minutes, status, calculation_version, configuration_snapshot
         ) VALUES ($1, $2, $3, $4::jsonb, $5, $6, 0, $7, $8, $9, $10::jsonb) RETURNING id`,
        [organizationId, workerId, workDate, JSON.stringify(snapshot), event.occurredAt,
          configuration.shift.breakMinutes,
          plannedMinutes(configuration.shift.startTime, configuration.shift.endTime, configuration.shift.breakMinutes),
          late ? "late" : "active", ATTENDANCE_CALCULATION_VERSION, JSON.stringify(configuration)]
      );
      attendanceDayId = inserted.rows[0]!.id;
    }
  } else if (current?.check_out) {
    return { status: "rejected", code: "ALREADY_CHECKED_OUT", attendanceDayId: null, beforeDay };
  } else if (current?.check_in) {
    const elapsed = new Date(event.occurredAt).getTime() - new Date(current.check_in).getTime();
    if (elapsed <= 0) return { status: "rejected", code: "CHECK_OUT_BEFORE_CHECK_IN", attendanceDayId: null, beforeDay };
    if (elapsed > 16 * 60 * 60 * 1000) return { status: "rejected", code: "SHIFT_DURATION_EXCEEDED", attendanceDayId: null, beforeDay };
    const worked = Math.max(0, Math.floor(elapsed / 60_000) - current.break_minutes);
    await client.query(
      `UPDATE attendance_days SET check_out = $2, worked_minutes = $3,
         status = CASE WHEN status = 'late' THEN 'late' ELSE 'complete' END,
         revision = revision + 1 WHERE id = $1`,
      [current.id, event.occurredAt, worked]
    );
    attendanceDayId = current.id;
  } else {
    const inserted = await client.query<{ id: string }>(
      `INSERT INTO attendance_days (
         organization_id, worker_id, work_date, shift_snapshot, check_out, break_minutes,
         worked_minutes, planned_minutes, status, calculation_version, configuration_snapshot
       ) VALUES ($1, $2, $3, $4::jsonb, $5, $6, 0, $7, 'incomplete', $8, $9::jsonb)
       ON CONFLICT (organization_id, worker_id, work_date) DO UPDATE
         SET check_out = EXCLUDED.check_out, status = 'incomplete', revision = attendance_days.revision + 1
       RETURNING id`,
      [organizationId, workerId, workDate, JSON.stringify(snapshot), event.occurredAt,
        configuration.shift.breakMinutes,
        plannedMinutes(configuration.shift.startTime, configuration.shift.endTime, configuration.shift.breakMinutes),
        ATTENDANCE_CALCULATION_VERSION, JSON.stringify(configuration)]
    );
    attendanceDayId = inserted.rows[0]!.id;
  }
  return { status: "synced", code: null, attendanceDayId, beforeDay };
}

export async function resolveTerminalEventReconciliation(
  pool: pg.Pool,
  actor: ActorContext,
  attendanceEventId: string,
  input: TerminalEventReconciliationWrite,
  requestId: string
): Promise<TerminalEventReconciliationView> {
  requireRole(actor, ["admin"]);
  const reason = input.reason.trim();
  if (reason.length < 3) throw new AppError("VALIDATION_FAILED", "Razlog usklađenja mora imati najmanje tri znaka.");
  return withTenant(pool, actor, requestId, async (client) => {
    await lockTerminalEventLifecycle(client, actor.organizationId);
    const rawResult = await client.query<ReconciliationEventRow>(
      `SELECT id, terminal_id, worker_id, effective_department_id, rfid_card_id,
         occurred_at, acknowledged_at, event_type, device_clock_offset_seconds, clock_status,
         acknowledgement_key_id, acknowledgement_key_version, processing_status,
         rejection_code, lifecycle_evidence
       FROM attendance_events WHERE id = $1`,
      [attendanceEventId]
    );
    const raw = rawResult.rows[0];
    if (!raw) throw new AppError("NOT_FOUND", "Izvorni terminalski događaj nije pronađen.");
    const existing = await client.query<ExistingResolutionRow>(
      `SELECT id, resolution, reason, attendance_day_id, resolved_by, created_at
       FROM terminal_event_reconciliations WHERE attendance_event_id = $1`,
      [attendanceEventId]
    );
    if (existing.rows[0]) {
      const row = existing.rows[0];
      if (row.resolution !== input.resolution || row.reason !== reason) {
        throw new AppError("CONFLICT", "Usklađenje terminalskog događaja već je zaključeno.");
      }
      return { id: row.id, attendanceEventId, resolution: row.resolution, reason: row.reason,
        attendanceDayId: row.attendance_day_id, resolvedBy: row.resolved_by, createdAt: iso(row.created_at) };
    }
    if (raw.processing_status !== "reconciliation_required") {
      throw new AppError("CONFLICT", "Samo događaj koji zahtijeva usklađenje može se razriješiti.");
    }
    const lifecycleEvidence = jsonObject<TerminalLifecycleEvidence>(raw.lifecycle_evidence);
    const beforeEvidence = { processingStatus: raw.processing_status, rejectionCode: raw.rejection_code,
      lifecycleEvidence, attendanceDayId: null };
    let attendanceDayId: string | null = null;
    let beforeDay: AttendanceDayView | null = null;
    let afterEvidence: unknown = { resolution: "rejected", attendanceDayId: null };
    let interpretation: ResolvedEventTime | null = null;
    let configuration: CompleteConfigurationSnapshot | null = null;
    if (input.resolution === "accepted") {
      if (!lifecycleEvidence.acknowledgement.verified || !raw.acknowledgement_key_id
        || !raw.acknowledgement_key_version || !raw.acknowledged_at) {
        throw new AppError("CONFLICT", "Događaj bez DEC-025 kriptografskog dokaza ne može postati autoritativan.");
      }
      if (raw.clock_status !== "trusted" || Math.abs(raw.device_clock_offset_seconds) > 300) {
        throw new AppError("CONFLICT", "Neodređeno vrijeme terminala ne smije se pretvoriti u izmišljenu autoritativnu vremensku oznaku.");
      }
      if (!raw.worker_id || !raw.effective_department_id || !raw.rfid_card_id) {
        throw new AppError("CONFLICT", "Događaj nema dovoljan autoritativni identitet radnika, kartice ili odjela.");
      }
      const resolved = await resolveTerminalConfiguration(client, raw.worker_id, iso(raw.occurred_at), iso(raw.acknowledged_at));
      if (resolved.outcome !== "accepted") throw new AppError("CONFLICT", "Povijesna konfiguracija i dalje nije jednoznačno dokaziva.");
      configuration = resolved.configuration;
      interpretation = resolved.interpretation;
      const applied = await applyAttendanceEvent(client, actor.organizationId, raw.worker_id,
        { occurredAt: iso(raw.occurred_at), eventType: raw.event_type }, configuration, interpretation);
      if (applied.status !== "synced" || !applied.attendanceDayId) {
        throw new AppError("CONFLICT", `Usklađenje ne može stvoriti netočnu ili dupliciranu evidenciju (${applied.code ?? "UNKNOWN"}).`);
      }
      attendanceDayId = applied.attendanceDayId;
      beforeDay = applied.beforeDay ? attendanceView(applied.beforeDay) : null;
      const afterResult = await client.query<AttendanceRow>(`${attendanceSelect} FROM attendance_days a WHERE a.id = $1`, [attendanceDayId]);
      const afterRow = afterResult.rows[0]!;
      const sourceRows = await client.query<{ id: string }>(
        `SELECT source.id FROM (
           SELECT e.id, e.occurred_at FROM attendance_events e
           WHERE e.attendance_day_id = $1 AND e.processing_status = 'accepted'
           UNION ALL
           SELECT r.attendance_event_id, e.occurred_at FROM terminal_event_reconciliations r
           JOIN attendance_events e ON e.id = r.attendance_event_id
           WHERE r.attendance_day_id = $1 AND r.resolution = 'accepted'
           UNION ALL SELECT $2::uuid, $3::timestamptz
         ) source ORDER BY source.occurred_at, source.id`,
        [attendanceDayId, raw.id, raw.occurred_at]
      );
      const sourceEventIds = [...new Set(sourceRows.rows.map((row) => row.id))];
      const currentInterpretations = jsonObject<NonNullable<AttendanceRow["event_interpretations"]>>(afterRow.event_interpretations ?? []);
      const calculationId = randomUUID();
      const eventInterpretations = [...(Array.isArray(currentInterpretations) ? currentInterpretations : []), {
        sourceEventId: raw.id, eventType: raw.event_type,
        utcEpochMilliseconds: new Date(raw.occurred_at).getTime(),
        timezoneVersionId: interpretation.timezoneVersionId, timezone: interpretation.timezone,
        localTimestamp: interpretation.localTimestamp, utcOffsetSeconds: interpretation.utcOffsetSeconds
      }].sort((left, right) => Number(left.utcEpochMilliseconds) - Number(right.utcEpochMilliseconds)
        || left.sourceEventId.localeCompare(right.sourceEventId));
      const after = attendanceView({
        ...withCurrentCalculation(afterRow, calculationId, sourceEventIds),
        event_interpretations: eventInterpretations
      });
      await insertCalculation(client, { id: calculationId, organizationId: actor.organizationId,
        attendanceDayId, configuration, sourceEventIds, before: beforeDay, after, reason,
        actorId: actor.userId, supersedesId: afterRow.current_calculation_id, workDate: after.workDate, requestId });
      afterEvidence = after;
    }
    const reconciliation = await client.query<{ id: string; created_at: string | Date }>(
      `INSERT INTO terminal_event_reconciliations (
         organization_id, attendance_event_id, resolution, reason, resolved_by,
         attendance_day_id, timezone_version_id, timezone_name, resolved_local_at,
         resolved_utc_offset_seconds, before_json, after_json, provenance, request_id
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::timestamp, $10,
         $11::jsonb, $12::jsonb, $13::jsonb, $14) RETURNING id, created_at`,
      [actor.organizationId, raw.id, input.resolution, reason, actor.userId, attendanceDayId,
        interpretation?.timezoneVersionId ?? null, interpretation?.timezone ?? null,
        interpretation?.localTimestamp ?? null, interpretation?.utcOffsetSeconds ?? null,
        JSON.stringify(beforeDay ?? beforeEvidence), JSON.stringify(afterEvidence),
        JSON.stringify({ decision: "DEC-025", rawAttendanceEventId: raw.id, terminalId: raw.terminal_id,
          acknowledgementKeyId: raw.acknowledgement_key_id, acknowledgementKeyVersion: raw.acknowledgement_key_version,
          acknowledgementVerified: lifecycleEvidence.acknowledgement.verified,
          originalLifecycleEvidence: lifecycleEvidence }), requestId]
    );
    await client.query(
      `INSERT INTO audit_events (
         organization_id, actor_type, actor_id, actor_role, action, entity_type, entity_id,
         before_json, after_json, request_id, metadata
       ) VALUES ($1, 'user', $2, $3, 'terminal_event.reconcile', 'attendance_event', $4,
         $5::jsonb, $6::jsonb, $7, $8::jsonb)`,
      [actor.organizationId, actor.userId, actor.role, raw.id, JSON.stringify(beforeDay ?? beforeEvidence),
        JSON.stringify(afterEvidence), requestId, JSON.stringify({ module: "terminal", resolution: input.resolution,
          reason, reconciliationId: reconciliation.rows[0]!.id, attendanceDayId, provenance: "DEC-025" })]
    );
    return { id: reconciliation.rows[0]!.id, attendanceEventId: raw.id, resolution: input.resolution,
      reason, attendanceDayId, resolvedBy: actor.userId, createdAt: iso(reconciliation.rows[0]!.created_at) };
  });
}
