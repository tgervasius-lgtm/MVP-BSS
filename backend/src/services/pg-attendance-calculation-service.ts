import { randomUUID } from "node:crypto";
import type pg from "pg";
import { withTenant, type TenantTransaction } from "../db/tenant.js";
import { AppError } from "../domain/errors.js";
import type { ActorContext } from "../domain/types.js";
import { requireRole } from "../security/rbac.js";
import { terminalEventFingerprint } from "../security/terminal-acknowledgement.js";
import {
  ATTENDANCE_CALCULATION_VERSION,
  attendanceSelect,
  attendanceView,
  dateOnly,
  eventBusinessContext,
  iso,
  jsonObject,
  plannedMinutes,
  shiftSnapshot,
  timeMinutes,
  type AttendanceRow,
  type CompleteConfigurationSnapshot,
  type ConfigurationSnapshot
} from "./attendance-calculation.js";
import type {
  AttendanceDayView,
  AttendanceEventTimeInterpretation,
  AttendanceRecalculationView,
  AttendanceRecalculationWrite,
  AttendanceStatus,
  TerminalEventBatchView,
  TerminalEventBatchWrite,
  TerminalEventReconciliationView,
  TerminalEventReconciliationWrite,
  TerminalLifecycleEvidence
} from "./contracts.js";
import { resolveTerminalConfiguration, type ResolvedEventTime } from "./terminal-event-configuration.js";
import { resolveTerminalEventIntegrity } from "./terminal-event-integrity.js";
import { lockTerminalEventLifecycle } from "./terminal-event-lock.js";
import {
  attendancePeriodParts,
  attendancePeriodState,
  isAttendancePeriodLocked,
  lockAttendancePeriod
} from "./attendance-period-lock.js";
import { applyAttendanceEvent, resolveTerminalEventReconciliation } from "./terminal-event-reconciliation.js";

type RawEventRow = {
  id: string;
  occurred_at: string | Date;
  event_type: "check_in" | "check_out";
  timezone_version_id: string | null;
  timezone_name: string | null;
  resolved_local_at: string | null;
  resolved_utc_offset_seconds: number | null;
};

function persistedInterpretation(event: RawEventRow): AttendanceEventTimeInterpretation {
  if (!event.timezone_version_id || !event.timezone_name || !event.resolved_local_at || event.resolved_utc_offset_seconds === null) {
    throw new AppError("CONFLICT", "Izvorni događaj nema dokazivu spremljenu lokalnu interpretaciju.");
  }
  return {
    sourceEventId: event.id,
    eventType: event.event_type,
    utcInstant: iso(event.occurred_at),
    timezoneVersionId: event.timezone_version_id,
    timezone: event.timezone_name,
    localTimestamp: event.resolved_local_at.replace(" ", "T"),
    utcOffsetSeconds: event.resolved_utc_offset_seconds
  };
}

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
    actorType: "terminal" | "user";
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
       $9, $10, $11, $12, $13::date, $13::date, $14)`,
    [
      input.id, input.organizationId, input.attendanceDayId, ATTENDANCE_CALCULATION_VERSION,
      JSON.stringify({ ...input.configuration, eventTimeInterpretations: input.after.provenance.eventTimeInterpretations }), input.sourceEventIds,
      input.before ? JSON.stringify(input.before) : null, JSON.stringify(input.after),
      input.reason, input.actorType, input.actorId, input.supersedesId, input.workDate, input.requestId
    ]
  );
  await client.query("UPDATE attendance_days SET current_calculation_id = $2 WHERE id = $1", [input.attendanceDayId, input.id]);
}

export class PgAttendanceCalculationService {
  constructor(
    private readonly pool: pg.Pool,
    private readonly deviceCredentialEncryptionKey: string
  ) {}

  async ingestVerifiedTerminalBatch(
    client: TenantTransaction,
    organizationId: string,
    terminalId: string,
    input: TerminalEventBatchWrite,
    requestId: string
  ): Promise<TerminalEventBatchView> {
    const receivedAt = new Date().toISOString();
    const results: TerminalEventBatchView["results"] = [];
    await lockTerminalEventLifecycle(client, organizationId);
    const terminalState = await client.query<{ last_sequence: string | number }>(
      "SELECT last_sequence FROM terminals WHERE id = $1 FOR UPDATE", [terminalId]
    );
    let lastSequence = Number(terminalState.rows[0]?.last_sequence ?? 0);
    for (const event of input.events) {
      let status: "synced" | "duplicate" | "rejected" | "reconciliation_required" = "synced";
      let code: string | null = null;
      let workerId: string | null = null;
      let effectiveDepartmentId: string | null = null;
      let attendanceDayId: string | null = null;
      let beforeDay: AttendanceRow | null = null;
      let eventInterpretation: ResolvedEventTime | null = null;
      let card: { id: string; worker_id: string } | null = null;
      let lifecycleEvidence: TerminalLifecycleEvidence = {
        decision: "rejected",
        code: null,
        acknowledgement: { verified: false, delaySeconds: null }
      };
      const fingerprint = terminalEventFingerprint(terminalId, event);
      const existing = await client.query<{
        id: string;
        worker_id: string | null;
        effective_department_id: string | null;
        event_fingerprint: Buffer | null;
        processing_status: "accepted" | "rejected" | "reconciliation_required";
        rejection_code: string | null;
        lifecycle_evidence: TerminalLifecycleEvidence | string;
        reconciliation_resolution: "accepted" | "rejected" | null;
      }>(
        `SELECT e.id, e.worker_id, e.effective_department_id, e.event_fingerprint, e.processing_status,
           e.rejection_code, e.lifecycle_evidence, r.resolution AS reconciliation_resolution
         FROM attendance_events e
         LEFT JOIN terminal_event_reconciliations r ON r.attendance_event_id = e.id
         WHERE e.terminal_id = $1 AND e.device_event_id = $2`,
        [terminalId, event.deviceEventId]
      );
      const existingEvent = existing.rows[0];
      let rawEventId = existingEvent?.id ?? null;
      if (existingEvent) {
        const matches = existingEvent.event_fingerprint !== null && existingEvent.event_fingerprint.equals(fingerprint);
        status = !matches
          ? "rejected"
          : existingEvent.reconciliation_resolution === "accepted"
            ? "duplicate"
            : existingEvent.reconciliation_resolution === "rejected"
              ? "rejected"
          : existingEvent.processing_status === "accepted"
            ? "duplicate"
            : existingEvent.processing_status;
        code = !matches
          ? "EVENT_IDENTITY_MISMATCH"
          : existingEvent.reconciliation_resolution === "accepted" || existingEvent.processing_status === "accepted"
            ? null
            : existingEvent.reconciliation_resolution === "rejected"
              ? "RECONCILIATION_REJECTED"
              : existingEvent.rejection_code;
        workerId = existingEvent.worker_id;
        effectiveDepartmentId = existingEvent.effective_department_id;
        const originalEvidence = jsonObject<TerminalLifecycleEvidence>(existingEvent.lifecycle_evidence);
        lifecycleEvidence = {
          ...originalEvidence,
          decision: status,
          code,
          acknowledgement: {
            ...originalEvidence.acknowledgement,
            verified: matches && originalEvidence.acknowledgement.verified
          },
          originalAttendanceEventId: existingEvent.id
        };
      } else if (event.sequence <= lastSequence) {
        status = "rejected";
        code = "SEQUENCE_OUT_OF_ORDER";
      } else {
        lastSequence = event.sequence;
      }

      if (status === "synced" && !/^[a-f0-9]{64}$/.test(event.cardUidHash)) {
        status = "rejected";
        code = "INVALID_CARD_HASH";
      }
      if (status === "synced") {
        const integrity = await resolveTerminalEventIntegrity(
          client,
          terminalId,
          this.deviceCredentialEncryptionKey,
          event,
          input.sentAt
        );
        lifecycleEvidence = integrity.evidence;
        workerId = integrity.workerId;
        effectiveDepartmentId = integrity.effectiveDepartmentId;
        card = integrity.card;
        if (integrity.outcome !== "accepted") {
          status = integrity.outcome;
          code = integrity.code;
        }
      }

      if (status === "synced" && card) {
        const resolved = await resolveTerminalConfiguration(client, card.worker_id, event.occurredAt, event.acknowledgedAt);
        lifecycleEvidence = { ...lifecycleEvidence, ...resolved.evidence };
        if (resolved.outcome !== "accepted") {
          status = resolved.outcome;
          code = resolved.code;
        } else {
          const { configuration, interpretation } = resolved;
          eventInterpretation = interpretation;
          const applied = await applyAttendanceEvent(
            client,
            organizationId,
            card.worker_id,
            event,
            configuration,
            interpretation
          );
          status = applied.status;
          code = applied.code;
          attendanceDayId = applied.attendanceDayId;
          beforeDay = applied.beforeDay;
        }
      }

      lifecycleEvidence = {
        ...lifecycleEvidence,
        decision: status === "synced" ? "accepted" : status,
        code
      };
      if (!existingEvent) {
        const rawEvent = await client.query<{ id: string }>(
           `INSERT INTO attendance_events (
              organization_id, terminal_id, worker_id, effective_department_id, attendance_day_id,
              rfid_card_id, device_event_id, sequence, occurred_at, acknowledged_at, event_type,
              card_uid_hash, device_clock_offset_seconds, clock_status, acknowledgement_key_id,
              acknowledgement_key_version, acknowledgement_proof_status,
              acknowledgement_signature, event_fingerprint,
              processing_status, rejection_code, lifecycle_evidence, timezone_version_id,
              timezone_name, resolved_local_at, resolved_utc_offset_seconds
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,
              decode($12, 'hex'), $13, $14, $15, $16, $17, decode($18, 'hex'), $19,
              $20, $21, $22::jsonb, $23, $24, $25::timestamp, $26)
            RETURNING id`,
           [organizationId, terminalId, workerId, effectiveDepartmentId, attendanceDayId, card?.id ?? null,
             event.deviceEventId, event.sequence, event.occurredAt, event.acknowledgedAt, event.eventType,
             /^[a-f0-9]{64}$/.test(event.cardUidHash) ? event.cardUidHash : "0".repeat(64),
             event.deviceClockOffsetSeconds, event.clockStatus, event.acknowledgementKeyId,
             event.acknowledgementKeyVersion,
             lifecycleEvidence.acknowledgement.verified ? "verified" : "invalid",
             event.acknowledgementSignature, fingerprint,
             status === "synced" ? "accepted" : status === "reconciliation_required" ? status : "rejected",
             code, JSON.stringify(lifecycleEvidence),
             status === "synced" ? eventInterpretation?.timezoneVersionId ?? null : null,
             status === "synced" ? eventInterpretation?.timezone ?? null : null,
             status === "synced" ? eventInterpretation?.localTimestamp ?? null : null,
             status === "synced" ? eventInterpretation?.utcOffsetSeconds ?? null : null]
        );
        rawEventId = rawEvent.rows[0]!.id;
      }

      if (status === "synced" && attendanceDayId && rawEventId) {
        const afterResult = await client.query<AttendanceRow>(
          `${attendanceSelect} FROM attendance_days a WHERE a.id = $1`, [attendanceDayId]
        );
        const afterRow = afterResult.rows[0]!;
        const configuration = jsonObject<ConfigurationSnapshot>(afterRow.configuration_snapshot);
        if (configuration.provenanceStatus !== "complete") throw new Error("Accepted attendance day lacks complete configuration provenance");
        const sources = await client.query<{ id: string }>(
          `SELECT source.id FROM (
             SELECT e.id, e.occurred_at FROM attendance_events e
             WHERE e.attendance_day_id = $1 AND e.processing_status = 'accepted'
             UNION ALL
             SELECT r.attendance_event_id, e.occurred_at
             FROM terminal_event_reconciliations r
             JOIN attendance_events e ON e.id = r.attendance_event_id
             WHERE r.attendance_day_id = $1 AND r.resolution = 'accepted'
           ) source ORDER BY source.occurred_at, source.id`, [attendanceDayId]
        );
        const sourceEventIds = sources.rows.map((row) => row.id);
        const calculationId = randomUUID();
        const after = attendanceView(withCurrentCalculation(afterRow, calculationId, sourceEventIds));
        await insertCalculation(client, {
          id: calculationId,
          organizationId,
          attendanceDayId,
          configuration,
          sourceEventIds,
          before: beforeDay ? attendanceView(beforeDay) : null,
          after,
          reason: "terminal_event_ingested",
          actorType: "terminal",
          actorId: terminalId,
          supersedesId: afterRow.current_calculation_id,
          workDate: after.workDate,
          requestId
        });
      }

      await client.query(
        `INSERT INTO terminal_sync_events (
           organization_id, terminal_id, device_event_id, sequence, worker_id, effective_department_id,
           attendance_event_id, occurred_at, acknowledged_at, event_type, status, rejection_code,
           acknowledgement_key_id, acknowledgement_key_version, clock_status,
           acknowledgement_verified, lifecycle_evidence, request_id
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12,
           $13, $14, $15, $16, $17::jsonb, $18)`,
        [organizationId, terminalId, event.deviceEventId, event.sequence, workerId, effectiveDepartmentId,
          rawEventId, event.occurredAt, event.acknowledgedAt, event.eventType, status, code,
          event.acknowledgementKeyId, event.acknowledgementKeyVersion, event.clockStatus,
          lifecycleEvidence.acknowledgement.verified, JSON.stringify(lifecycleEvidence), requestId]
      );
      await client.query(
        `INSERT INTO audit_events (
           organization_id, actor_type, actor_id, action, entity_type, entity_id, request_id, metadata
        ) VALUES ($1, 'terminal', $2, $3, 'attendance_event', $4, $5, $6::jsonb)`,
        [organizationId, terminalId, `terminal_event.${status}`, event.deviceEventId, requestId,
          JSON.stringify({ module: "terminal", eventType: event.eventType, result: status, code,
            attendanceDayId, attendanceEventId: rawEventId, acknowledgedAt: event.acknowledgedAt,
            lifecycleEvidence })]
      );
      results.push({ deviceEventId: event.deviceEventId, status, code });
    }
    await client.query(
      `UPDATE terminals SET status = 'online', last_seen_at = clock_timestamp(), queue_depth = 0,
         last_sequence = GREATEST(last_sequence, $2), revision = revision + 1 WHERE id = $1`,
      [terminalId, lastSequence]
    );
    return { batchId: input.batchId, receivedAt, results };
  }

  async resolveTerminalEventReconciliation(
    actor: ActorContext,
    attendanceEventId: string,
    input: TerminalEventReconciliationWrite,
    requestId: string
  ): Promise<TerminalEventReconciliationView> {
    return resolveTerminalEventReconciliation(this.pool, actor, attendanceEventId, input, requestId);
  }

  async recalculateAttendanceDay(
    actor: ActorContext,
    attendanceDayId: string,
    input: AttendanceRecalculationWrite,
    revision: string,
    requestId: string
  ): Promise<AttendanceRecalculationView> {
    requireRole(actor, ["admin"]);
    if (input.calculationVersion !== ATTENDANCE_CALCULATION_VERSION) {
      throw new AppError("VALIDATION_FAILED", "Verzija izračuna nije podržana.");
    }
    if (input.reason.trim().length < 3) {
      throw new AppError("VALIDATION_FAILED", "Razlog ponovnog izračuna mora imati najmanje tri znaka.");
    }
    return withTenant(this.pool, actor, requestId, async (client) => {
      const periodResult = await client.query<{ work_date: string | Date }>(
        "SELECT work_date FROM attendance_days WHERE id = $1", [attendanceDayId]
      );
      const periodDay = periodResult.rows[0];
      if (!periodDay) throw new AppError("NOT_FOUND", "Evidencija rada nije pronađena.");
      const lockedWorkDate = dateOnly(periodDay.work_date);
      const period = attendancePeriodParts(lockedWorkDate);
      await lockAttendancePeriod(client, actor.organizationId, period.year, period.month);
      if (isAttendancePeriodLocked(await attendancePeriodState(client, period.year, period.month))) {
        throw new AppError("CONFLICT", "Zaključano razdoblje mora se prvo ovlašteno otvoriti.");
      }
      const dayResult = await client.query<AttendanceRow>(
        `${attendanceSelect} FROM attendance_days a WHERE a.id = $1 FOR UPDATE OF a`, [attendanceDayId]
      );
      const day = dayResult.rows[0];
      if (!day) throw new AppError("NOT_FOUND", "Evidencija rada nije pronađena.");
      if (String(day.revision) !== revision) throw new AppError("STALE_REVISION", "Evidencija je u međuvremenu promijenjena.");
      if (day.status === "corrected") throw new AppError("CONFLICT", "Odobrena korekcija ne može se prepisati ponovnim izračunom.");
      if (!day.current_calculation_id) throw new AppError("CONFLICT", "Naslijeđena evidencija nema dokazivu izvornu konfiguraciju.");
      const currentCalculation = await client.query<{ configuration_snapshot: ConfigurationSnapshot | string }>(
        "SELECT configuration_snapshot FROM attendance_calculations WHERE id = $1",
        [day.current_calculation_id]
      );
      if (!currentCalculation.rows[0]) throw new AppError("CONFLICT", "Trenutačni dokaz izračuna nije dostupan.");
      const configuration = jsonObject<ConfigurationSnapshot>(currentCalculation.rows[0].configuration_snapshot);
      if (configuration.provenanceStatus !== "complete") {
        throw new AppError("CONFLICT", "Evidencija nema potpunu povijesnu konfiguraciju.");
      }
      const workDate = dateOnly(day.work_date);
      const events = await client.query<RawEventRow>(
        `SELECT source.id, source.occurred_at, source.event_type, source.timezone_version_id,
           source.timezone_name,
           to_char(source.resolved_local_at, 'YYYY-MM-DD"T"HH24:MI:SS.MS') AS resolved_local_at,
           source.resolved_utc_offset_seconds
         FROM (
           SELECT e.id, e.occurred_at, e.event_type, e.timezone_version_id,
             e.timezone_name, e.resolved_local_at, e.resolved_utc_offset_seconds
           FROM attendance_events e
           WHERE e.attendance_day_id = $1 AND e.processing_status = 'accepted'
           UNION ALL
           SELECT e.id, e.occurred_at, e.event_type, r.timezone_version_id,
             r.timezone_name, r.resolved_local_at, r.resolved_utc_offset_seconds
           FROM terminal_event_reconciliations r
           JOIN attendance_events e ON e.id = r.attendance_event_id
           WHERE r.attendance_day_id = $1 AND r.resolution = 'accepted'
         ) source ORDER BY source.occurred_at, source.id`,
        [attendanceDayId]
      );
      const checkInEvent = events.rows.find((event) => event.event_type === "check_in");
      const checkOutEvent = events.rows.find((event) => event.event_type === "check_out");
      if (!checkInEvent && !checkOutEvent) throw new AppError("CONFLICT", "Izvorni prihvaćeni događaji nisu dostupni.");
      const interpretations = events.rows.map(persistedInterpretation);
      const checkIn = checkInEvent ? iso(checkInEvent.occurred_at) : null;
      const checkOut = checkOutEvent ? iso(checkOutEvent.occurred_at) : null;
      const businessEvent = checkInEvent ?? checkOutEvent!;
      const businessContext = eventBusinessContext(
        persistedInterpretation(businessEvent),
        configuration.shift.startTime,
        configuration.shift.endTime
      );
      if (businessContext.workDate !== workDate) {
        throw new AppError("CONFLICT", "Spremljena lokalna interpretacija ne odgovara poslovnom datumu evidencije.");
      }
      let worked = 0;
      let status: AttendanceStatus = "incomplete";
      if (checkIn) {
        const localMinutes = eventBusinessContext(
          persistedInterpretation(checkInEvent!),
          configuration.shift.startTime,
          configuration.shift.endTime
        ).localMinutes;
        const start = timeMinutes(configuration.shift.startTime);
        const late = localMinutes > start + configuration.shift.toleranceMinutes;
        status = late ? "late" : "active";
        if (checkOut) {
          const elapsed = new Date(checkOut).getTime() - new Date(checkIn).getTime();
          if (elapsed <= 0 || elapsed > 16 * 60 * 60 * 1000) {
            throw new AppError("CONFLICT", "Izvorni događaji ne tvore valjan interval do 16 sati.");
          }
          worked = Math.max(0, Math.floor(elapsed / 60_000) - configuration.shift.breakMinutes);
          status = late ? "late" : "complete";
        }
      }
      const before = attendanceView(day);
      await client.query(
        `UPDATE attendance_days SET check_in = $2, check_out = $3, shift_snapshot = $4::jsonb,
           break_minutes = $5, worked_minutes = $6, planned_minutes = $7, status = $8,
           calculation_version = $9, configuration_snapshot = $10::jsonb, revision = revision + 1
         WHERE id = $1`,
        [attendanceDayId, checkIn, checkOut, JSON.stringify(shiftSnapshot(configuration)),
          configuration.shift.breakMinutes, worked,
          plannedMinutes(configuration.shift.startTime, configuration.shift.endTime, configuration.shift.breakMinutes),
          status, ATTENDANCE_CALCULATION_VERSION, JSON.stringify(configuration)]
      );
      const updatedResult = await client.query<AttendanceRow>(
        `${attendanceSelect} FROM attendance_days a WHERE a.id = $1`, [attendanceDayId]
      );
      const sourceEventIds = events.rows.map((event) => event.id);
      const calculationId = randomUUID();
      const after = attendanceView({
        ...withCurrentCalculation(updatedResult.rows[0]!, calculationId, sourceEventIds),
        event_interpretations: interpretations.map((item) => ({
          ...item,
          utcEpochMilliseconds: new Date(item.utcInstant).getTime()
        }))
      });
      await insertCalculation(client, {
        id: calculationId,
        organizationId: actor.organizationId,
        attendanceDayId,
        configuration,
        sourceEventIds,
        before,
        after,
        reason: input.reason.trim(),
        actorType: "user",
        actorId: actor.userId,
        supersedesId: day.current_calculation_id,
        workDate,
        requestId
      });
      const audit = await client.query<{ id: string }>(
        `INSERT INTO audit_events (
           organization_id, actor_type, actor_id, actor_role, action, entity_type, entity_id,
           before_json, after_json, request_id, metadata
         ) VALUES ($1, 'user', $2, $3, 'attendance.recalculate', 'attendance_day', $4,
           $5::jsonb, $6::jsonb, $7, $8::jsonb) RETURNING id`,
        [actor.organizationId, actor.userId, actor.role, attendanceDayId, JSON.stringify(before), JSON.stringify(after),
          requestId, JSON.stringify({ module: "attendance", reason: input.reason.trim(), calculationVersion: ATTENDANCE_CALCULATION_VERSION,
            calculationId, supersedesCalculationId: day.current_calculation_id, affectedPeriod: { from: workDate, to: workDate } })]
      );
      return {
        calculationId,
        supersedesCalculationId: day.current_calculation_id,
        calculationVersion: ATTENDANCE_CALCULATION_VERSION,
        affectedPeriod: { from: workDate, to: workDate },
        reason: input.reason.trim(),
        before,
        after,
        auditEventId: audit.rows[0]!.id
      };
    });
  }
}
