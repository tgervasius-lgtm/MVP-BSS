import { AppError } from "../domain/errors.js";
import type {
  AttendanceCalculationVersion,
  AttendanceDayView,
  AttendanceEventTimeInterpretation,
  AttendanceStatus
} from "./contracts.js";

export const ATTENDANCE_CALCULATION_VERSION: AttendanceCalculationVersion = "attendance-v1";

export type CompleteConfigurationSnapshot = {
  provenanceStatus: "complete";
  timezone: { versionId: string; name: string; effectiveFrom: string };
  shiftAssignment: { id: string; shiftId: string; effectiveFrom: string };
  shift: {
    versionId: string;
    version: string;
    id: string;
    name: string;
    startTime: string;
    endTime: string;
    breakMinutes: number;
    toleranceMinutes: number;
    effectiveFrom: string;
  };
  businessDateRule: "overnight-end-inclusive-previous-date-v1";
};

type LegacyConfigurationSnapshot = { provenanceStatus: "legacy_unavailable" };
export type ConfigurationSnapshot = CompleteConfigurationSnapshot | LegacyConfigurationSnapshot;

export type AttendanceRow = {
  id: string;
  worker_id: string;
  work_date: string | Date;
  shift_snapshot: AttendanceDayView["shift"] | string;
  check_in: string | Date | null;
  check_out: string | Date | null;
  break_minutes: number;
  worked_minutes: number;
  planned_minutes: number;
  status: AttendanceStatus;
  calculation_version: AttendanceCalculationVersion | "legacy-unversioned";
  configuration_snapshot: ConfigurationSnapshot | string;
  current_calculation_id: string | null;
  source_event_ids?: string[] | null;
  event_interpretations?: Array<Omit<AttendanceEventTimeInterpretation, "utcInstant"> & { utcEpochMilliseconds: number | string }> | string | null;
  revision: string | number;
};

export const attendanceSelect = `SELECT a.id, a.worker_id, a.work_date, a.shift_snapshot, a.check_in, a.check_out,
  a.break_minutes, a.worked_minutes, a.planned_minutes, a.status, a.calculation_version,
  a.configuration_snapshot, a.current_calculation_id, a.revision,
  COALESCE((SELECT c.source_event_ids FROM attendance_calculations c
    WHERE c.id = a.current_calculation_id), ARRAY[]::uuid[]) AS source_event_ids,
  COALESCE((SELECT jsonb_agg(jsonb_build_object(
    'sourceEventId', e.id,
    'eventType', e.event_type,
    'utcEpochMilliseconds', (extract(epoch FROM e.occurred_at) * 1000)::bigint,
    'timezoneVersionId', e.timezone_version_id,
    'timezone', e.timezone_name,
    'localTimestamp', to_char(e.resolved_local_at, 'YYYY-MM-DD"T"HH24:MI:SS.MS'),
    'utcOffsetSeconds', e.resolved_utc_offset_seconds
  ) ORDER BY e.occurred_at, e.id)
    FROM attendance_events e
    WHERE e.attendance_day_id = a.id
      AND e.processing_status = 'accepted'
      AND e.timezone_version_id IS NOT NULL
      AND e.resolved_local_at IS NOT NULL), '[]'::jsonb) AS event_interpretations`;

export function iso(value: string | Date): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

export function dateOnly(value: string | Date): string {
  return value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10);
}

export function jsonObject<T>(value: T | string): T {
  return typeof value === "string" ? JSON.parse(value) as T : value;
}

export function timeMinutes(value: string): number {
  const [hours = 0, minutes = 0] = value.slice(0, 5).split(":").map(Number);
  return hours * 60 + minutes;
}

export function previousDate(value: string): string {
  const date = new Date(`${value}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

export function plannedMinutes(startTime: string, endTime: string, breakMinutes: number): number {
  const start = timeMinutes(startTime);
  let end = timeMinutes(endTime);
  if (end <= start) end += 24 * 60;
  return Math.max(0, end - start - breakMinutes);
}

export function eventBusinessContext(
  interpretation: Pick<AttendanceEventTimeInterpretation, "localTimestamp">,
  startTime: string,
  endTime: string
): { workDate: string; localMinutes: number } {
  const match = /^(\d{4}-\d{2}-\d{2})T((?:[01]\d|2[0-3])):([0-5]\d)(?::[0-5]\d(?:\.\d{1,6})?)?$/.exec(interpretation.localTimestamp);
  if (!match) throw new AppError("CONFLICT", "Spremljena lokalna interpretacija događaja nije valjana.");
  let workDate = match[1]!;
  let localMinutes = Number(match[2]) * 60 + Number(match[3]);
  const start = timeMinutes(startTime);
  const end = timeMinutes(endTime);
  if (end <= start && localMinutes <= end) {
    workDate = previousDate(workDate);
    localMinutes += 24 * 60;
  }
  return { workDate, localMinutes };
}

export function shiftSnapshot(configuration: CompleteConfigurationSnapshot): AttendanceDayView["shift"] {
  return {
    id: configuration.shift.id,
    name: configuration.shift.name,
    startTime: configuration.shift.startTime,
    endTime: configuration.shift.endTime,
    breakMinutes: configuration.shift.breakMinutes
  };
}

export function attendanceView(row: AttendanceRow): AttendanceDayView {
  const shift = jsonObject<AttendanceDayView["shift"]>(row.shift_snapshot);
  const configuration = jsonObject<ConfigurationSnapshot>(row.configuration_snapshot);
  const complete = configuration.provenanceStatus === "complete";
  const storedInterpretations = jsonObject<NonNullable<AttendanceRow["event_interpretations"]>>(row.event_interpretations ?? []);
  const eventTimeInterpretations: AttendanceEventTimeInterpretation[] = Array.isArray(storedInterpretations)
    ? storedInterpretations.map((item) => ({
        sourceEventId: item.sourceEventId,
        eventType: item.eventType,
        utcInstant: new Date(Number(item.utcEpochMilliseconds)).toISOString(),
        timezoneVersionId: item.timezoneVersionId,
        timezone: item.timezone,
        localTimestamp: item.localTimestamp,
        utcOffsetSeconds: Number(item.utcOffsetSeconds)
      }))
    : [];
  return {
    id: row.id,
    workerId: row.worker_id,
    workDate: dateOnly(row.work_date),
    shift,
    checkIn: row.check_in ? iso(row.check_in) : null,
    checkOut: row.check_out ? iso(row.check_out) : null,
    breakMinutes: row.break_minutes,
    workedMinutes: row.worked_minutes,
    plannedMinutes: row.planned_minutes,
    balanceMinutes: row.worked_minutes - row.planned_minutes,
    status: row.status,
    source: row.status === "corrected" ? "approved_correction" : "terminal",
    provenance: {
      status: complete ? "complete" : "legacy_unavailable",
      calculationId: row.current_calculation_id,
      calculationVersion: row.calculation_version,
      timezone: complete ? configuration.timezone.name : null,
      timezoneVersionId: complete ? configuration.timezone.versionId : null,
      shiftVersionId: complete ? configuration.shift.versionId : null,
      shiftAssignmentId: complete ? configuration.shiftAssignment.id : null,
      sourceEventIds: row.source_event_ids ?? [],
      eventTimeInterpretations
    },
    revision: String(row.revision)
  };
}

export function attendanceTimezone(row: AttendanceRow): string {
  const configuration = jsonObject<ConfigurationSnapshot>(row.configuration_snapshot);
  if (configuration.provenanceStatus !== "complete") {
    throw new AppError("CONFLICT", "Evidencija nema dokazivu povijesnu vremensku zonu.");
  }
  return configuration.timezone.name;
}
