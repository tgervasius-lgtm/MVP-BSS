import assert from "node:assert/strict";
import test from "node:test";
import { AppError } from "../../src/domain/errors.js";
import {
  attendanceTimezone,
  attendanceView,
  eventBusinessContext,
  plannedMinutes,
  previousDate,
  type AttendanceRow,
  type CompleteConfigurationSnapshot
} from "../../src/services/attendance-calculation.js";

const configuration: CompleteConfigurationSnapshot = {
  provenanceStatus: "complete",
  timezone: { versionId: "00000000-0000-4000-8000-000000000001", name: "Europe/Zagreb", effectiveFrom: "2025-01-01T00:00:00.000Z" },
  shiftAssignment: { id: "00000000-0000-4000-8000-000000000002", shiftId: "00000000-0000-4000-8000-000000000003", effectiveFrom: "2025-01-01T00:00:00.000Z" },
  shift: {
    versionId: "00000000-0000-4000-8000-000000000004",
    version: "1",
    id: "00000000-0000-4000-8000-000000000003",
    name: "Noćna",
    startTime: "22:00",
    endTime: "06:00",
    breakMinutes: 30,
    toleranceMinutes: 5,
    effectiveFrom: "2025-01-01T00:00:00.000Z"
  },
  businessDateRule: "overnight-end-inclusive-previous-date-v1"
};

function row(): AttendanceRow {
  return {
    id: "00000000-0000-4000-8000-000000000005",
    worker_id: "00000000-0000-4000-8000-000000000006",
    work_date: "2026-01-10",
    shift_snapshot: { id: configuration.shift.id, name: configuration.shift.name, startTime: "22:00", endTime: "06:00", breakMinutes: 30 },
    check_in: "2026-01-10T21:30:00.000Z",
    check_out: "2026-01-11T04:30:00.000Z",
    break_minutes: 30,
    worked_minutes: 390,
    planned_minutes: 450,
    status: "complete",
    calculation_version: "attendance-v1",
    configuration_snapshot: configuration,
    current_calculation_id: "00000000-0000-4000-8000-000000000007",
    source_event_ids: ["00000000-0000-4000-8000-000000000008", "00000000-0000-4000-8000-000000000009"],
    event_interpretations: [
      { sourceEventId: "00000000-0000-4000-8000-000000000008", eventType: "check_in", utcEpochMilliseconds: 1768080600000, timezoneVersionId: configuration.timezone.versionId, timezone: "Europe/Zagreb", localTimestamp: "2026-01-10T22:30:00.000", utcOffsetSeconds: 3600 },
      { sourceEventId: "00000000-0000-4000-8000-000000000009", eventType: "check_out", utcEpochMilliseconds: 1768105800000, timezoneVersionId: configuration.timezone.versionId, timezone: "Europe/Zagreb", localTimestamp: "2026-01-11T05:30:00.000", utcOffsetSeconds: 3600 }
    ],
    revision: "2"
  };
}

test("attendance-v1 keeps overnight planned minutes and business-date arithmetic deterministic", () => {
  assert.equal(plannedMinutes("22:00", "06:00", 30), 450);
  assert.equal(previousDate("2026-01-11"), "2026-01-10");
  assert.deepEqual(eventBusinessContext({ localTimestamp: "2026-01-11T05:30:00.000" }, "22:00", "06:00"), {
    workDate: "2026-01-10",
    localMinutes: 1770
  });
});

test("persisted event interpretations reproduce DST gap/fold and lateness without timezone rules", () => {
  const gap = { localTimestamp: "2026-03-29T03:30:00.000", timezone: "Rules/May-Change", utcOffsetSeconds: 7200 };
  assert.deepEqual(eventBusinessContext(gap, "03:00", "11:00"), { workDate: "2026-03-29", localMinutes: 210 });
  const firstFold = { localTimestamp: "2025-10-26T02:30:00.000", utcOffsetSeconds: 7200 };
  const secondFold = { localTimestamp: "2025-10-26T02:30:00.000", utcOffsetSeconds: 3600 };
  assert.deepEqual(eventBusinessContext(firstFold, "02:00", "10:00"), eventBusinessContext(secondFold, "02:00", "10:00"));
  assert.notEqual(firstFold.utcOffsetSeconds, secondFold.utcOffsetSeconds);
  assert.equal(eventBusinessContext({ localTimestamp: gap.localTimestamp }, "03:00", "11:00").localMinutes > 180, true);
});

test("attendance view exposes complete calculation and configuration provenance", () => {
  const view = attendanceView(row());
  assert.equal(view.provenance.status, "complete");
  assert.equal(view.provenance.timezone, "Europe/Zagreb");
  assert.equal(view.provenance.shiftVersionId, configuration.shift.versionId);
  assert.equal(view.provenance.shiftAssignmentId, configuration.shiftAssignment.id);
  assert.deepEqual(view.provenance.sourceEventIds, row().source_event_ids);
  assert.equal(view.provenance.eventTimeInterpretations[0]?.localTimestamp, "2026-01-10T22:30:00.000");
  assert.equal(view.provenance.eventTimeInterpretations[0]?.utcOffsetSeconds, 3600);
  assert.equal(attendanceTimezone(row()), "Europe/Zagreb");
});

test("legacy attendance fails closed when a historical timezone is required", () => {
  const legacy: AttendanceRow = {
    ...row(),
    calculation_version: "legacy-unversioned",
    configuration_snapshot: { provenanceStatus: "legacy_unavailable" },
    current_calculation_id: null,
    source_event_ids: [],
    event_interpretations: []
  };
  assert.equal(attendanceView(legacy).provenance.status, "legacy_unavailable");
  assert.deepEqual(attendanceView(legacy).provenance.eventTimeInterpretations, []);
  assert.throws(() => attendanceTimezone(legacy), AppError);
});
