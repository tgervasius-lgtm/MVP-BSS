import type { TenantTransaction } from "../db/tenant.js";
import {
  iso,
  type CompleteConfigurationSnapshot
} from "./attendance-calculation.js";
import type {
  AttendanceEventTimeInterpretation,
  TerminalLifecycleEvidence
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
  shift_status: "active" | "blocked";
  shift_effective_from: string | Date;
  timezone_version_id: string;
  timezone: string;
  timezone_effective_from: string | Date;
  resolved_local_at: string;
  resolved_utc_offset_seconds: number;
};

export type ResolvedEventTime = Omit<
  AttendanceEventTimeInterpretation,
  "sourceEventId" | "eventType" | "utcInstant"
>;

export type TerminalConfigurationResolution =
  | {
    outcome: "accepted";
    code: null;
    configuration: CompleteConfigurationSnapshot;
    interpretation: ResolvedEventTime;
    evidence: Partial<TerminalLifecycleEvidence>;
  }
  | {
    outcome: "rejected" | "reconciliation_required";
    code: "SHIFT_INACTIVE_AT_ACKNOWLEDGEMENT" | "HISTORICAL_CONFIGURATION_UNAVAILABLE";
    evidence: Partial<TerminalLifecycleEvidence>;
  };

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

export async function resolveTerminalConfiguration(
  client: TenantTransaction,
  workerId: string,
  occurredAt: string,
  acknowledgedAt: string
): Promise<TerminalConfigurationResolution> {
  const result = await client.query<EffectiveConfigurationRow>(
    `SELECT wsa.id AS shift_assignment_id, wsa.effective_from AS shift_assignment_effective_from,
       wsa.shift_id, scv.id AS shift_version_id, scv.version AS shift_version,
       scv.name AS shift_name, scv.start_time::text, scv.end_time::text,
       scv.break_minutes, scv.tolerance_minutes, scv.status AS shift_status,
       scv.effective_from AS shift_effective_from,
       otv.id AS timezone_version_id, otv.timezone, otv.effective_from AS timezone_effective_from,
       to_char(interpreted.local_at, 'YYYY-MM-DD"T"HH24:MI:SS.MS') AS resolved_local_at,
       extract(epoch FROM (
         interpreted.local_at - ($2::timestamptz AT TIME ZONE 'UTC')
       ))::integer AS resolved_utc_offset_seconds
     FROM worker_shift_assignments wsa
     JOIN shift_configuration_versions scv
       ON scv.shift_id = wsa.shift_id
      AND scv.effective_from <= $2
      AND (scv.effective_to IS NULL OR scv.effective_to > $3)
     JOIN organization_timezone_versions otv
        ON otv.organization_id = wsa.organization_id
       AND otv.effective_from <= $2
       AND (otv.effective_to IS NULL OR otv.effective_to > $3)
     CROSS JOIN LATERAL (
       SELECT $2::timestamptz AT TIME ZONE otv.timezone AS local_at
     ) interpreted
     WHERE wsa.worker_id = $1
       AND wsa.effective_from <= $2
       AND (wsa.effective_to IS NULL OR wsa.effective_to > $3)
     ORDER BY wsa.effective_from DESC, scv.effective_from DESC, otv.effective_from DESC
     LIMIT 2`,
    [workerId, occurredAt, acknowledgedAt]
  );
  if (result.rows.length !== 1) {
    return { outcome: "reconciliation_required", code: "HISTORICAL_CONFIGURATION_UNAVAILABLE", evidence: {} };
  }
  const row = result.rows[0]!;
  const evidence = {
    shiftAssignmentId: row.shift_assignment_id,
    shiftConfigurationVersionId: row.shift_version_id,
    timezoneVersionId: row.timezone_version_id
  };
  if (row.shift_status !== "active") {
    return { outcome: "rejected", code: "SHIFT_INACTIVE_AT_ACKNOWLEDGEMENT", evidence };
  }
  return {
    outcome: "accepted",
    code: null,
    configuration: completeConfiguration(row),
    interpretation: {
      timezoneVersionId: row.timezone_version_id,
      timezone: row.timezone,
      localTimestamp: row.resolved_local_at,
      utcOffsetSeconds: row.resolved_utc_offset_seconds
    },
    evidence
  };
}
