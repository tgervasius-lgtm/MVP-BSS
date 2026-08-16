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
  TerminalEventBatchWrite
} from "./contracts.js";

type EffectiveConfigurationRow = {
  shift_assignment_id: string;
  shift_assignment_effective_from: string | Date;
  shift_id: string;
  shift_version_id: string;
  shift_version: string | number;
  shift_name: string;
  start_time: string;
  end_time: string;
  break_minutes: number;
  tolerance_minutes: number;
  shift_effective_from: string | Date;
  timezone_version_id: string;
  timezone: string;
  timezone_effective_from: string | Date;
  resolved_local_at: string;
  resolved_utc_offset_seconds: number;
};

type RawEventRow = {
  id: string;
  occurred_at: string | Date;
  event_type: "check_in" | "check_out";
  timezone_version_id: string | null;
  timezone_name: string | null;
  resolved_local_at: string | null;
  resolved_utc_offset_seconds: number | null;
};

type ResolvedEventTime = Omit<AttendanceEventTimeInterpretation, "sourceEventId" | "eventType" | "utcInstant">;

function completeConfiguration(row: EffectiveConfigurationRow): CompleteConfigurationSnapshot {
  return {
    provenanceStatus: "complete",
    timezone: { versionId: row.timezone_version_id, name: row.timezone, effectiveFrom: iso(row.timezone_effective_from) },
    shiftAssignment: { id: row.shift_assignment_id, shiftId: row.shift_id, effectiveFrom: iso(row.shift_assignment_effective_from) },
    shift: {
      versionId: row.shift_version_id,
      version: String(row.shift_version),
      id: row.shift_id,
      name: row.shift_name,
      startTime: row.start_time.slice(0, 5),
      endTime: row.end_time.slice(0, 5),
      breakMinutes: row.break_minutes,
      toleranceMinutes: row.tolerance_minutes,
      effectiveFrom: iso(row.shift_effective_from)
    },
    businessDateRule: "overnight-end-inclusive-previous-date-v1"
  };
}

async function resolveConfiguration(
  client: TenantTransaction,
  workerId: string,
  occurredAt: string
): Promise<{ configuration: CompleteConfigurationSnapshot; interpretation: ResolvedEventTime }> {
  const result = await client.query<EffectiveConfigurationRow>(
    `SELECT wsa.id AS shift_assignment_id, wsa.effective_from AS shift_assignment_effective_from,
       wsa.shift_id, scv.id AS shift_version_id, scv.version AS shift_version,
       scv.name AS shift_name, scv.start_time::text, scv.end_time::text,
       scv.break_minutes, scv.tolerance_minutes, scv.effective_from AS shift_effective_from,
       otv.id AS timezone_version_id, otv.timezone, otv.effective_from AS timezone_effective_from,
       to_char(interpreted.local_at, 'YYYY-MM-DD"T"HH24:MI:SS.MS') AS resolved_local_at,
       extract(epoch FROM (
         interpreted.local_at - ($2::timestamptz AT TIME ZONE 'UTC')
       ))::integer AS resolved_utc_offset_seconds
     FROM worker_shift_assignments wsa
     JOIN shift_configuration_versions scv
       ON scv.shift_id = wsa.shift_id
      AND scv.effective_from <= $2
      AND (scv.effective_to IS NULL OR scv.effective_to > $2)
     JOIN organization_timezone_versions otv
        ON otv.organization_id = wsa.organization_id
       AND otv.effective_from <= $2
       AND (otv.effective_to IS NULL OR otv.effective_to > $2)
     CROSS JOIN LATERAL (
       SELECT $2::timestamptz AT TIME ZONE otv.timezone AS local_at
     ) interpreted
     WHERE wsa.worker_id = $1
       AND wsa.effective_from <= $2
       AND (wsa.effective_to IS NULL OR wsa.effective_to > $2)
       AND scv.status = 'active'`,
    [workerId, occurredAt]
  );
  const row = result.rows[0];
  if (!row) throw new AppError("CONFLICT", "Povijesna konfiguracija za vrijeme događaja nije dostupna.");
  const configuration = completeConfiguration(row);
  return {
    configuration,
    interpretation: {
      timezoneVersionId: row.timezone_version_id,
      timezone: row.timezone,
      localTimestamp: row.resolved_local_at,
      utcOffsetSeconds: row.resolved_utc_offset_seconds
    }
  };
}

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
  constructor(private readonly pool: pg.Pool) {}

  async ingestVerifiedTerminalBatch(
    client: TenantTransaction,
    organizationId: string,
    terminalId: string,
    input: TerminalEventBatchWrite,
    requestId: string
  ): Promise<TerminalEventBatchView> {
    const receivedAt = new Date().toISOString();
    const results: TerminalEventBatchView["results"] = [];
    await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1::text, 0))", [organizationId]);
    const terminalState = await client.query<{ last_sequence: string | number }>(
      "SELECT last_sequence FROM terminals WHERE id = $1 FOR UPDATE", [terminalId]
    );
    let lastSequence = Number(terminalState.rows[0]?.last_sequence ?? 0);
    for (const event of input.events) {
      let status: "synced" | "duplicate" | "rejected" = "synced";
      let code: string | null = null;
      let workerId: string | null = null;
      let effectiveDepartmentId: string | null = null;
      let attendanceDayId: string | null = null;
      let beforeDay: AttendanceRow | null = null;
      let eventInterpretation: ResolvedEventTime | null = null;
      if (Date.parse(event.occurredAt) > Date.now() + 5 * 60_000) {
        status = "rejected";
        code = "EVENT_IN_FUTURE";
      } else if (!/^[a-f0-9]{64}$/i.test(event.cardUidHash)) {
        status = "rejected";
        code = "INVALID_CARD_HASH";
      }
      const existing = await client.query<{ worker_id: string | null; effective_department_id: string | null }>(
        "SELECT worker_id, effective_department_id FROM attendance_events WHERE terminal_id = $1 AND device_event_id = $2",
        [terminalId, event.deviceEventId]
      );
      if (existing.rows[0]) {
        status = "duplicate";
        code = null;
        workerId = existing.rows[0].worker_id;
        effectiveDepartmentId = existing.rows[0].effective_department_id;
      } else if (event.sequence <= lastSequence) {
        status = "rejected";
        code = "SEQUENCE_OUT_OF_ORDER";
      } else {
        lastSequence = event.sequence;
      }

      let card: { id: string; worker_id: string; effective_department_id: string | null } | undefined;
      if (status === "synced") {
        const cardResult = await client.query<{ id: string; worker_id: string }>(
          `SELECT c.id, c.worker_id FROM rfid_cards c JOIN workers w ON w.id = c.worker_id
           WHERE c.uid_hash = decode($1, 'hex') AND c.status = 'active' AND w.status = 'active'
             AND c.valid_from <= $2 AND (c.valid_to IS NULL OR c.valid_to >= $2) FOR UPDATE OF w`,
          [event.cardUidHash, event.occurredAt]
        );
        const assignedCard = cardResult.rows[0];
        if (!assignedCard) {
          status = "rejected";
          code = "CARD_NOT_ASSIGNED";
        } else {
          const assignment = await client.query<{ department_id: string }>(
            `SELECT department_id FROM worker_department_assignments
             WHERE worker_id = $1 AND effective_from <= $2 AND (effective_to IS NULL OR effective_to > $2)`,
            [assignedCard.worker_id, event.occurredAt]
          );
          card = { ...assignedCard, effective_department_id: assignment.rows[0]?.department_id ?? null };
          workerId = card.worker_id;
          effectiveDepartmentId = card.effective_department_id;
        }
      }

      if (status === "synced" && card) {
        try {
          const resolved = await resolveConfiguration(client, card.worker_id, event.occurredAt);
          const { configuration, interpretation } = resolved;
          eventInterpretation = interpretation;
          const { workDate, localMinutes } = eventBusinessContext(
            interpretation,
            configuration.shift.startTime,
            configuration.shift.endTime
          );
          const snapshot = shiftSnapshot(configuration);
          const day = await client.query<AttendanceRow>(
            `${attendanceSelect} FROM attendance_days a WHERE a.worker_id = $1 AND a.work_date = $2::date FOR UPDATE OF a`,
            [card.worker_id, workDate]
          );
          const current = day.rows[0];
          beforeDay = current ?? null;
          if (event.eventType === "check_in") {
            if (current?.check_in) {
              status = "rejected";
              code = "ALREADY_CHECKED_IN";
            } else {
              const late = localMinutes > timeMinutes(configuration.shift.startTime) + configuration.shift.toleranceMinutes;
              if (current?.check_out) {
                const elapsed = new Date(current.check_out).getTime() - new Date(event.occurredAt).getTime();
                if (elapsed <= 0) {
                  status = "rejected";
                  code = "CHECK_IN_AFTER_CHECK_OUT";
                } else if (elapsed > 16 * 60 * 60 * 1000) {
                  status = "rejected";
                  code = "SHIFT_DURATION_EXCEEDED";
                } else {
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
                }
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
                  [organizationId, card.worker_id, workDate, JSON.stringify(snapshot), event.occurredAt,
                    configuration.shift.breakMinutes,
                    plannedMinutes(configuration.shift.startTime, configuration.shift.endTime, configuration.shift.breakMinutes),
                    late ? "late" : "active", ATTENDANCE_CALCULATION_VERSION, JSON.stringify(configuration)]
                );
                attendanceDayId = inserted.rows[0]!.id;
              }
            }
          } else if (current?.check_out) {
            status = "rejected";
            code = "ALREADY_CHECKED_OUT";
          } else if (current?.check_in) {
            const elapsed = new Date(event.occurredAt).getTime() - new Date(current.check_in).getTime();
            if (elapsed <= 0) {
              status = "rejected";
              code = "CHECK_OUT_BEFORE_CHECK_IN";
            } else if (elapsed > 16 * 60 * 60 * 1000) {
              status = "rejected";
              code = "SHIFT_DURATION_EXCEEDED";
            } else {
              const worked = Math.max(0, Math.floor(elapsed / 60_000) - current.break_minutes);
              await client.query(
                `UPDATE attendance_days SET check_out = $2, worked_minutes = $3,
                   status = CASE WHEN status = 'late' THEN 'late' ELSE 'complete' END,
                   revision = revision + 1 WHERE id = $1`,
                [current.id, event.occurredAt, worked]
              );
              attendanceDayId = current.id;
            }
          } else {
            const inserted = await client.query<{ id: string }>(
              `INSERT INTO attendance_days (
                 organization_id, worker_id, work_date, shift_snapshot, check_out, break_minutes,
                 worked_minutes, planned_minutes, status, calculation_version, configuration_snapshot
               ) VALUES ($1, $2, $3, $4::jsonb, $5, $6, 0, $7, 'incomplete', $8, $9::jsonb)
               ON CONFLICT (organization_id, worker_id, work_date) DO UPDATE
                 SET check_out = EXCLUDED.check_out, status = 'incomplete', revision = attendance_days.revision + 1
               RETURNING id`,
              [organizationId, card.worker_id, workDate, JSON.stringify(snapshot), event.occurredAt,
                configuration.shift.breakMinutes,
                plannedMinutes(configuration.shift.startTime, configuration.shift.endTime, configuration.shift.breakMinutes),
                ATTENDANCE_CALCULATION_VERSION, JSON.stringify(configuration)]
            );
            attendanceDayId = inserted.rows[0]!.id;
          }
        } catch (error) {
          if (error instanceof AppError && error.code === "CONFLICT") {
            status = "rejected";
            code = "HISTORICAL_CONFIGURATION_UNAVAILABLE";
          } else {
            throw error;
          }
        }
      }

      let rawEventId: string | null = null;
      if (status !== "duplicate") {
        const rawEvent = await client.query<{ id: string }>(
           `INSERT INTO attendance_events (
              organization_id, terminal_id, worker_id, effective_department_id, attendance_day_id,
              rfid_card_id, device_event_id, sequence, occurred_at, event_type, card_uid_hash,
              device_clock_offset_seconds, processing_status, rejection_code, timezone_version_id,
              timezone_name, resolved_local_at, resolved_utc_offset_seconds
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, decode($11, 'hex'), $12, $13, $14,
              $15, $16, $17::timestamp, $18)
            RETURNING id`,
           [organizationId, terminalId, workerId, effectiveDepartmentId, attendanceDayId, card?.id ?? null,
             event.deviceEventId, event.sequence, event.occurredAt, event.eventType,
             /^[a-f0-9]{64}$/i.test(event.cardUidHash) ? event.cardUidHash : "0".repeat(64),
             event.deviceClockOffsetSeconds ?? 0, status === "synced" ? "accepted" : "rejected", code,
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
          `SELECT id FROM attendance_events WHERE attendance_day_id = $1 AND processing_status = 'accepted'
           ORDER BY occurred_at, id`, [attendanceDayId]
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
           occurred_at, event_type, status, rejection_code, request_id
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [organizationId, terminalId, event.deviceEventId, event.sequence, workerId, effectiveDepartmentId,
          event.occurredAt, event.eventType, status, code, requestId]
      );
      await client.query(
        `INSERT INTO audit_events (
           organization_id, actor_type, actor_id, action, entity_type, entity_id, request_id, metadata
         ) VALUES ($1, 'terminal', $2, $3, 'attendance_event', $4, $5, $6::jsonb)`,
        [organizationId, terminalId, `terminal_event.${status}`, event.deviceEventId, requestId,
          JSON.stringify({ module: "terminal", eventType: event.eventType, result: status, code, attendanceDayId })]
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
      const [year, month] = workDate.split("-").map(Number);
      const locked = await client.query(
        "SELECT 1 FROM attendance_month_locks WHERE year = $1 AND month = $2", [year, month]
      );
      if (locked.rows[0]) throw new AppError("CONFLICT", "Zaključano razdoblje mora se prvo ovlašteno otvoriti.");
      const events = await client.query<RawEventRow>(
        `SELECT id, occurred_at, event_type, timezone_version_id, timezone_name,
           to_char(resolved_local_at, 'YYYY-MM-DD"T"HH24:MI:SS.MS') AS resolved_local_at,
           resolved_utc_offset_seconds FROM attendance_events
         WHERE attendance_day_id = $1 AND processing_status = 'accepted' ORDER BY occurred_at, id`,
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
