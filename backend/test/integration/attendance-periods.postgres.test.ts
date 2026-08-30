import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import test from "node:test";
import ExcelJS from "exceljs";
import pg from "pg";
import { migrateUp } from "../../src/db/migrate.js";
import type { ActorContext, Role } from "../../src/domain/types.js";
import { PgMvpService } from "../../src/services/pg-mvp-service.js";

const { Client, Pool } = pg;
// Keep this #146 fixture on PostgreSQL's calendar-date representation so the
// separately tracked clean-main DATE parser defect does not become part of the
// locked-period acceptance evidence.
pg.types.setTypeParser(1082, (value: string) => value);
const databaseUrl = process.env.BSS_TEST_DATABASE_URL;
const required = process.env.BSS_REQUIRE_POSTGRES_TESTS === "true";

function hasCode(expected: string) {
  return (error: unknown): boolean =>
    typeof error === "object" && error !== null && "code" in error && error.code === expected;
}

test("#146 PostgreSQL period lifecycle, RLS and correction/finalization/export concurrency", { skip: !databaseUrl && !required }, async (t) => {
  assert.ok(databaseUrl, "BSS_TEST_DATABASE_URL is required when PostgreSQL tests are mandatory");
  const owner = new Client({ connectionString: databaseUrl });
  let appPool: InstanceType<typeof Pool> | undefined;
  let role: string | undefined;
  await owner.connect();
  t.after(async () => {
    if (appPool) await appPool.end();
    if (role) {
      await owner.query(`DROP OWNED BY ${role}`);
      await owner.query(`DROP ROLE IF EXISTS ${role}`);
    }
    await owner.end();
  });

  await migrateUp(owner);
  const suffix = randomUUID().replaceAll("-", "").slice(0, 12);
  role = `bss_period_${suffix}`;
  const password = `period-${suffix}-password`;
  const appUrl = new URL(databaseUrl);
  appUrl.username = role;
  appUrl.password = password;

  await owner.query(`CREATE ROLE ${role} LOGIN PASSWORD '${password}' NOSUPERUSER NOBYPASSRLS`);
  await owner.query(`GRANT CONNECT ON DATABASE ${appUrl.pathname.slice(1)} TO ${role}`);
  await owner.query(`GRANT USAGE ON SCHEMA public TO ${role}`);
  await owner.query(`GRANT SELECT ON ALL TABLES IN SCHEMA public TO ${role}`);
  await owner.query(`GRANT INSERT ON attendance_days, correction_requests, report_exports, audit_events,
    attendance_calculations, attendance_month_locks, attendance_period_versions,
    attendance_period_transitions TO ${role}`);
  await owner.query(`GRANT UPDATE ON attendance_days, correction_requests, attendance_month_locks TO ${role}`);
  await owner.query(`REVOKE ALL PRIVILEGES ON bss_schema_migrations FROM ${role}`);

  const seeded = await owner.query<{
    org1: string;
    org2: string;
    dep1: string;
    dep2: string;
    shift1: string;
    worker1: string;
    worker2: string;
    admin1: string;
    manager1: string;
    manager2: string;
    accountant1: string;
    worker_user1: string;
    admin2: string;
  }>(`
    WITH
      o1 AS (INSERT INTO organizations(name) VALUES ($1) RETURNING id),
      o2 AS (INSERT INTO organizations(name) VALUES ($2) RETURNING id),
      d1 AS (INSERT INTO departments(organization_id, name) SELECT id, 'Operations' FROM o1 RETURNING id, organization_id),
      d2 AS (INSERT INTO departments(organization_id, name) SELECT id, 'Warehouse' FROM o1 RETURNING id, organization_id),
      s1 AS (INSERT INTO shifts(organization_id, name, start_time, end_time, break_minutes, tolerance_minutes)
             SELECT id, 'Day shift', '08:00', '16:00', 30, 5 FROM o1 RETURNING id, organization_id),
      w1 AS (INSERT INTO workers(organization_id, code, name, department_id, shift_id)
             SELECT d1.organization_id, $3, 'Period Worker One', d1.id, s1.id FROM d1, s1 RETURNING id, organization_id),
      w2 AS (INSERT INTO workers(organization_id, code, name, department_id, shift_id)
             SELECT d2.organization_id, $4, 'Period Worker Two', d2.id, s1.id FROM d2, s1 RETURNING id, organization_id),
      ua AS (INSERT INTO users(organization_id, email, role) SELECT id, $5, 'admin' FROM o1 RETURNING id, organization_id),
      um1 AS (INSERT INTO users(organization_id, email, role) SELECT id, $6, 'manager' FROM o1 RETURNING id, organization_id),
      um2 AS (INSERT INTO users(organization_id, email, role) SELECT id, $7, 'manager' FROM o1 RETURNING id, organization_id),
      uac AS (INSERT INTO users(organization_id, email, role) SELECT id, $8, 'accountant' FROM o1 RETURNING id, organization_id),
      uw AS (INSERT INTO users(organization_id, email, role, worker_id)
             SELECT w1.organization_id, $9, 'worker', w1.id FROM w1 RETURNING id, organization_id),
      ua2 AS (INSERT INTO users(organization_id, email, role) SELECT id, $10, 'admin' FROM o2 RETURNING id, organization_id)
    SELECT o1.id AS org1, o2.id AS org2, d1.id AS dep1, d2.id AS dep2, s1.id AS shift1,
      w1.id AS worker1, w2.id AS worker2, ua.id AS admin1, um1.id AS manager1,
      um2.id AS manager2, uac.id AS accountant1, uw.id AS worker_user1, ua2.id AS admin2
    FROM o1, o2, d1, d2, s1, w1, w2, ua, um1, um2, uac, uw, ua2
  `, [
    `Period tenant ${suffix}`, `Other tenant ${suffix}`, `P1-${suffix}`, `P2-${suffix}`,
    `period-admin-${suffix}@example.test`, `period-manager-a-${suffix}@example.test`,
    `period-manager-b-${suffix}@example.test`, `period-accountant-${suffix}@example.test`,
    `period-worker-${suffix}@example.test`, `period-other-admin-${suffix}@example.test`
  ]);
  const ids = seeded.rows[0];
  assert.ok(ids);

  await owner.query("UPDATE organization_timezone_versions SET effective_from = '2020-01-01T00:00:00Z' WHERE organization_id = $1", [ids.org1]);
  await owner.query("UPDATE shift_configuration_versions SET effective_from = '2020-01-01T00:00:00Z' WHERE shift_id = $1", [ids.shift1]);
  await owner.query("UPDATE worker_shift_assignments SET effective_from = '2020-01-01T00:00:00Z' WHERE worker_id = ANY($1::uuid[])", [[ids.worker1, ids.worker2]]);
  await owner.query("UPDATE worker_department_assignments SET effective_from = '2020-01-01T00:00:00Z' WHERE worker_id = ANY($1::uuid[])", [[ids.worker1, ids.worker2]]);
  await owner.query("UPDATE worker_status_versions SET effective_from = '2020-01-01T00:00:00Z' WHERE worker_id = ANY($1::uuid[])", [[ids.worker1, ids.worker2]]);

  const configurationRows = await owner.query<{
    worker_id: string;
    timezone_version_id: string;
    timezone: string;
    timezone_effective_from: string | Date;
    shift_assignment_id: string;
    shift_id: string;
    shift_assignment_effective_from: string | Date;
    shift_version_id: string;
    shift_version: string | number;
    shift_name: string;
    start_time: string;
    end_time: string;
    break_minutes: number;
    tolerance_minutes: number;
    shift_effective_from: string | Date;
  }>(`
    SELECT wsa.worker_id, tz.id AS timezone_version_id, tz.timezone,
      tz.effective_from AS timezone_effective_from, wsa.id AS shift_assignment_id,
      wsa.shift_id, wsa.effective_from AS shift_assignment_effective_from,
      scv.id AS shift_version_id, scv.version AS shift_version, scv.name AS shift_name,
      scv.start_time::text, scv.end_time::text, scv.break_minutes, scv.tolerance_minutes,
      scv.effective_from AS shift_effective_from
    FROM worker_shift_assignments wsa
    JOIN organization_timezone_versions tz ON tz.organization_id = wsa.organization_id AND tz.effective_to IS NULL
    JOIN shift_configuration_versions scv ON scv.organization_id = wsa.organization_id
      AND scv.shift_id = wsa.shift_id AND scv.effective_to IS NULL
    WHERE wsa.worker_id = ANY($1::uuid[]) AND wsa.effective_to IS NULL
  `, [[ids.worker1, ids.worker2]]);
  const completeConfiguration = (workerId: string) => {
    const row = configurationRows.rows.find((item) => item.worker_id === workerId);
    assert.ok(row);
    return JSON.stringify({
      provenanceStatus: "complete",
      timezone: {
        versionId: row.timezone_version_id,
        name: row.timezone,
        effectiveFrom: new Date(row.timezone_effective_from).toISOString()
      },
      shiftAssignment: {
        id: row.shift_assignment_id,
        shiftId: row.shift_id,
        effectiveFrom: new Date(row.shift_assignment_effective_from).toISOString()
      },
      shift: {
        versionId: row.shift_version_id,
        version: String(row.shift_version),
        id: row.shift_id,
        name: row.shift_name,
        startTime: row.start_time,
        endTime: row.end_time,
        breakMinutes: row.break_minutes,
        toleranceMinutes: row.tolerance_minutes,
        effectiveFrom: new Date(row.shift_effective_from).toISOString()
      },
      businessDateRule: "overnight-end-inclusive-previous-date-v1"
    });
  };

  const completeDay = (await owner.query<{ id: string }>(`
    INSERT INTO attendance_days (
      organization_id, worker_id, work_date, shift_snapshot, check_in, check_out,
      break_minutes, worked_minutes, planned_minutes, status, calculation_version, configuration_snapshot
    ) VALUES ($1, $2, '2030-09-10', $3::jsonb, '2030-09-10T06:00:00Z', '2030-09-10T14:00:00Z',
      30, 450, 450, 'complete', 'attendance-v1', $4::jsonb)
    RETURNING id`, [ids.org1, ids.worker1,
      JSON.stringify({ id: ids.shift1, name: "Day shift", startTime: "08:00", endTime: "16:00", breakMinutes: 30 }),
      completeConfiguration(ids.worker1)]
  )).rows[0]!;
  const calculationSeed = await owner.query<{ calculation_id: string }>(`
    WITH terminal AS (
      INSERT INTO terminals (organization_id, name, location, status)
      VALUES ($1, 'Period calculation source', 'Synthetic', 'offline') RETURNING id
    ), source_events AS (
      INSERT INTO attendance_events (
        organization_id, terminal_id, worker_id, effective_department_id, attendance_day_id,
        device_event_id, sequence, occurred_at, event_type, card_uid_hash, processing_status,
        timezone_version_id, timezone_name, resolved_local_at, resolved_utc_offset_seconds
      )
      SELECT $1, terminal.id, $2, $3, $4, random_uuid, sequence, occurred_at, event_type,
        decode(repeat('a', 64), 'hex'), 'accepted', $5, 'Europe/Zagreb', resolved_local_at, 7200
      FROM terminal CROSS JOIN (VALUES
        (gen_random_uuid(), 1::bigint, '2030-09-10T06:00:00Z'::timestamptz, 'check_in'::varchar, '2030-09-10 08:00:00'::timestamp),
        (gen_random_uuid(), 2::bigint, '2030-09-10T14:00:00Z'::timestamptz, 'check_out'::varchar, '2030-09-10 16:00:00'::timestamp)
      ) source(random_uuid, sequence, occurred_at, event_type, resolved_local_at)
      RETURNING id
    ), calculation AS (
      INSERT INTO attendance_calculations (
        organization_id, attendance_day_id, calculation_version, configuration_snapshot,
        source_event_ids, after_json, reason, actor_type, actor_id, affected_from, affected_to, request_id
      ) SELECT $1, $4, 'attendance-v1', $6::jsonb, array_agg(id ORDER BY id),
        '{"seed":true}'::jsonb, 'Synthetic initial calculation', 'user', $7,
        '2030-09-10', '2030-09-10', 'period-initial-calculation'
      FROM source_events RETURNING id
    )
    SELECT id AS calculation_id FROM calculation
  `, [ids.org1, ids.worker1, ids.dep1, completeDay.id,
    configurationRows.rows.find((item) => item.worker_id === ids.worker1)!.timezone_version_id,
    completeConfiguration(ids.worker1), ids.admin1]);
  await owner.query("UPDATE attendance_days SET current_calculation_id = $2 WHERE id = $1",
    [completeDay.id, calculationSeed.rows[0]!.calculation_id]);
  const incompleteDay = (await owner.query<{ id: string }>(`
    INSERT INTO attendance_days (
      organization_id, worker_id, work_date, shift_snapshot, check_in,
      break_minutes, worked_minutes, planned_minutes, status, calculation_version, configuration_snapshot
    ) VALUES ($1, $2, '2030-09-10', $3::jsonb, '2030-09-10T06:00:00Z',
      30, 0, 450, 'incomplete', 'legacy-unversioned', $4::jsonb)
    RETURNING id`, [ids.org1, ids.worker2,
      JSON.stringify({ id: ids.shift1, name: "Day shift", startTime: "08:00", endTime: "16:00", breakMinutes: 30 }),
      completeConfiguration(ids.worker2)]
  )).rows[0]!;

  appPool = new Pool({ connectionString: appUrl.toString(), max: 4 });
  const service = new PgMvpService(appPool, {
    rfidUidPepper: "period-test-rfid-pepper-0123456789abcdef",
    deviceCredentialEncryptionKey: "period-test-device-key-0123456789abcdef",
    terminalActivationCode: "period-test-activation-code",
    publicOrigin: "https://bss.test"
  });
  const actor = (organizationId: string, userId: string, roleValue: Role, departmentIds: string[], selfWorkerId: string | null = null): ActorContext => ({
    organizationId, userId, role: roleValue, departmentIds, selfWorkerId, sessionId: randomUUID()
  });
  const admin = actor(ids.org1, ids.admin1, "admin", []);
  const managerA = actor(ids.org1, ids.manager1, "manager", [ids.dep1]);
  const managerB = actor(ids.org1, ids.manager2, "manager", [ids.dep2]);
  const accountant = actor(ids.org1, ids.accountant1, "accountant", []);
  const worker = actor(ids.org1, ids.worker_user1, "worker", [], ids.worker1);
  const otherTenantAdmin = actor(ids.org2, ids.admin2, "admin", []);

  const open = await service.getAttendancePeriod(admin, 2030, 9);
  assert.equal(open.status, "open");
  assert.equal(open.revision, "0");
  assert.equal(open.unresolved.incomplete, 1);
  assert.equal((await service.getAttendancePeriod(managerA, 2030, 9)).unresolved.total, 0);
  assert.equal((await service.getAttendancePeriod(managerB, 2030, 9)).unresolved.incomplete, 1);
  assert.equal((await service.getAttendancePeriod(accountant, 2030, 9)).unresolved.incomplete, 1);
  await assert.rejects(service.getAttendancePeriod(worker, 2030, 9), hasCode("FORBIDDEN"));

  const key = (label: string) => `period-${suffix}-${label}`;
  const review = await service.startAttendancePeriodReview(admin, 2030, 9,
    { reason: "Focused PostgreSQL review" }, "0", key("review-v1"), key("request-review-v1"));
  assert.equal(review.status, "review");
  const repeatedReview = await service.startAttendancePeriodReview(admin, 2030, 9,
    { reason: "Focused PostgreSQL review" }, "0", key("review-v1"), key("request-review-retry"));
  assert.equal(repeatedReview.revision, review.revision);
  await assert.rejects(service.finalizeAttendancePeriod(admin, 2030, 9,
    { reason: "Reject stale revision" }, "0", key("finalize-stale"), key("request-finalize-stale")), hasCode("STALE_REVISION"));
  await assert.rejects(service.finalizeAttendancePeriod(admin, 2030, 9,
    { reason: "Reject unresolved attendance" }, review.revision, key("finalize-blocked"), key("request-finalize-blocked")), hasCode("CONFLICT"));
  for (const unauthorized of [managerA, accountant, worker]) {
    await assert.rejects(service.finalizeAttendancePeriod(unauthorized, 2030, 9,
      { reason: "Reject unauthorized transition" }, review.revision,
      key(`finalize-${unauthorized.role}`), key(`request-finalize-${unauthorized.role}`)), hasCode("FORBIDDEN"));
  }

  await owner.query(`UPDATE attendance_days SET check_out = '2030-09-10T14:00:00Z', worked_minutes = 450,
    status = 'complete', revision = revision + 1 WHERE id = $1`, [incompleteDay.id]);
  const finalizedV1 = await service.finalizeAttendancePeriod(admin, 2030, 9,
    { reason: "All September records resolved" }, review.revision,
    key("finalize-v1"), key("request-finalize-v1"));
  assert.equal(finalizedV1.status, "finalized");
  assert.equal(finalizedV1.provenanceStatus, "complete");
  assert.ok(finalizedV1.datasetVersion);
  assert.match(finalizedV1.datasetChecksumSha256 ?? "", /^[a-f0-9]{64}$/);
  assert.deepEqual(finalizedV1.calculationVersions, ["attendance-v1", "legacy-unversioned"]);
  const repeatedFinalizeV1 = await service.finalizeAttendancePeriod(admin, 2030, 9,
    { reason: "All September records resolved" }, review.revision,
    key("finalize-v1"), key("request-finalize-v1-retry"));
  assert.equal(repeatedFinalizeV1.datasetVersion, finalizedV1.datasetVersion);
  assert.equal(repeatedFinalizeV1.revision, finalizedV1.revision);

  const snapshot = await owner.query<{ dataset_snapshot: { attendance: Array<{ status: string }> } }>(
    "SELECT dataset_snapshot FROM attendance_period_versions WHERE id = $1", [finalizedV1.datasetVersion]);
  assert.equal(snapshot.rows[0]?.dataset_snapshot.attendance.length, 2);
  assert.ok(snapshot.rows[0]?.dataset_snapshot.attendance.every((item) => !["active", "incomplete"].includes(item.status)));
  await assert.rejects(owner.query("UPDATE attendance_period_versions SET reason = 'tampered' WHERE id = $1", [finalizedV1.datasetVersion]), /append-only|immutable/i);
  await assert.rejects(owner.query("DELETE FROM attendance_period_transitions WHERE period_id = $1", [finalizedV1.id]), /append-only|immutable/i);

  const lockedArtifacts = new Map<string, { id: string; checksum: string }>();
  for (const format of ["csv", "xlsx", "pdf"] as const) {
    const exported = await service.createReportExport(admin, {
      reportType: "attendance_journal", format, periodFrom: "2030-09-01", periodTo: "2030-09-30",
      periodVersionId: finalizedV1.datasetVersion
    }, key(`export-v1-${format}`));
    assert.equal(exported.rowCount, 2);
    assert.equal(exported.datasetChecksumSha256, finalizedV1.datasetChecksumSha256);
    const artifact = await service.downloadReportExport(admin, exported.id);
    assert.equal(createHash("sha256").update(artifact.content).digest("hex"), artifact.checksumSha256);
    assert.equal((await service.verifyReportExport(admin, exported.id)).verified, true);
    if (format === "csv") assert.match(artifact.content.toString("utf8"), /# classification;NOT_PAYROLL/);
    if (format === "xlsx") {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(artifact.content as never);
      assert.equal(workbook.getWorksheet("Metapodaci")?.getCell("B2").value, finalizedV1.datasetChecksumSha256);
    }
    if (format === "pdf") assert.equal(artifact.content.subarray(0, 4).toString("ascii"), "%PDF");
    lockedArtifacts.set(format, { id: exported.id, checksum: artifact.checksumSha256 });
    await assert.rejects(owner.query("UPDATE report_exports SET file_name = 'tampered' WHERE id = $1", [exported.id]), /immutable/i);
  }

  const scopedExport = await service.createReportExport(managerA, {
    reportType: "monthly_summary", format: "csv", periodFrom: "2030-09-01", periodTo: "2030-09-30",
    periodVersionId: finalizedV1.datasetVersion
  }, key("manager-export"));
  assert.equal(scopedExport.rowCount, 1);
  await assert.rejects(service.createReportExport(managerA, {
    reportType: "monthly_summary", format: "csv", periodFrom: "2030-09-01", periodTo: "2030-09-30",
    departmentId: ids.dep2, periodVersionId: finalizedV1.datasetVersion
  }, key("manager-out-of-scope")), hasCode("FORBIDDEN"));
  await assert.rejects(service.getReportExport(managerB, scopedExport.id), hasCode("NOT_FOUND"));
  await assert.rejects(service.createReportExport(otherTenantAdmin, {
    reportType: "monthly_summary", format: "csv", periodFrom: "2030-09-01", periodTo: "2030-09-30",
    periodVersionId: finalizedV1.datasetVersion
  }, key("cross-tenant-export")), hasCode("NOT_FOUND"));

  const rls = await appPool.connect();
  try {
    await rls.query("BEGIN");
    await rls.query("SELECT set_config('bss.organization_id', $1, true)", [ids.org2]);
    assert.equal((await rls.query("SELECT id FROM attendance_period_versions WHERE id = $1", [finalizedV1.datasetVersion])).rowCount, 0);
    assert.equal((await rls.query("SELECT id FROM attendance_period_transitions WHERE period_id = $1", [finalizedV1.id])).rowCount, 0);
    await assert.rejects(rls.query("INSERT INTO attendance_period_versions (organization_id, period_id, year, month, period_revision, dataset_snapshot, dataset_checksum_sha256, calculation_versions, template_version, finalized_by, reason, request_id) VALUES ($1, $2, 2030, 9, 99, '{}'::jsonb, repeat('a', 64), '[]'::jsonb, 'test', $3, 'cross tenant', $4)",
      [ids.org1, finalizedV1.id, ids.admin1, key("cross-tenant-insert")]), /row-level security/i);
    await rls.query("ROLLBACK");
  } finally {
    rls.release();
  }

  await assert.rejects(service.createCorrectionRequest(worker, {
    attendanceDayId: completeDay.id, newCheckIn: "2030-09-10T06:05:00Z", newCheckOut: "2030-09-10T14:05:00Z",
    reason: "Locked period correction"
  }, key("locked-correction")), hasCode("CONFLICT"));
  await assert.rejects(service.recalculateAttendanceDay(admin, completeDay.id, {
    calculationVersion: "attendance-v1", reason: "Locked period recalculation"
  }, "1", key("locked-recalculation")), hasCode("CONFLICT"));

  const reopened = await service.reopenAttendancePeriod(admin, 2030, 9,
    { reason: "Approved late correction" }, finalizedV1.revision,
    key("reopen-v1"), key("request-reopen-v1"));
  const reviewV2 = await service.startAttendancePeriodReview(admin, 2030, 9,
    { reason: "Review after reopening" }, reopened.revision,
    key("review-v2"), key("request-review-v2"));
  const dayBeforeRecalculation = await owner.query<{ revision: string; current_calculation_id: string }>(
    "SELECT revision::text, current_calculation_id FROM attendance_days WHERE id = $1", [completeDay.id]);
  const recalculation = await service.recalculateAttendanceDay(admin, completeDay.id, {
    calculationVersion: "attendance-v1", reason: "Recalculate after authorized period reopen"
  }, dayBeforeRecalculation.rows[0]!.revision, key("recalculate-after-reopen"));
  assert.equal(recalculation.supersedesCalculationId, dayBeforeRecalculation.rows[0]!.current_calculation_id);
  assert.notEqual(recalculation.calculationId, recalculation.supersedesCalculationId);
  assert.equal(recalculation.reason, "Recalculate after authorized period reopen");
  assert.equal(recalculation.after.workDate, recalculation.before.workDate);
  const correctionInput = {
    attendanceDayId: completeDay.id, newCheckIn: "2030-09-10T06:05:00Z", newCheckOut: "2030-09-10T14:05:00Z",
    reason: "Serialized late correction"
  };
  const [finalizeRace, finalizeRetryRace, correctionRace, exportRace] = await Promise.allSettled([
    service.finalizeAttendancePeriod(admin, 2030, 9, { reason: "Concurrent finalization" }, reviewV2.revision,
      key("race-finalize"), key("request-race-finalize")),
    service.finalizeAttendancePeriod(admin, 2030, 9, { reason: "Concurrent finalization" }, reviewV2.revision,
      key("race-finalize"), key("request-race-finalize-retry")),
    service.createCorrectionRequest(worker, correctionInput, key("race-correction")),
    service.createReportExport(admin, {
      reportType: "attendance_journal", format: "csv", periodFrom: "2030-09-01", periodTo: "2030-09-30",
      periodVersionId: finalizedV1.datasetVersion
    }, key("race-export-v1"))
  ]);
  assert.equal(exportRace.status, "fulfilled", "export of an immutable version must remain consistent during the race");
  assert.equal(finalizeRace.status, finalizeRetryRace.status,
    "concurrent retries of one finalization key must have the same outcome");
  const finalizationWon = finalizeRace.status === "fulfilled";
  assert.equal(correctionRace.status, finalizationWon ? "rejected" : "fulfilled",
    "correction and finalization must serialize to one mutation outcome");
  if (finalizeRace.status === "fulfilled" && finalizeRetryRace.status === "fulfilled") {
    assert.equal(finalizeRetryRace.value.datasetVersion, finalizeRace.value.datasetVersion);
    assert.equal(finalizeRetryRace.value.revision, finalizeRace.value.revision);
  }
  assert.equal(exportRace.value.periodVersionId, finalizedV1.datasetVersion);
  assert.equal(exportRace.value.datasetChecksumSha256, finalizedV1.datasetChecksumSha256);
  const concurrentArtifact = await service.downloadReportExport(admin, exportRace.value.id);
  assert.equal((await service.verifyReportExport(admin, exportRace.value.id)).verified, true);
  await assert.rejects(owner.query("UPDATE report_exports SET file_name = 'race-tamper' WHERE id = $1",
    [exportRace.value.id]), /immutable/i);
  assert.equal((await owner.query(
    "SELECT id FROM attendance_period_transitions WHERE idempotency_key = $1", [key("race-finalize")]
  )).rowCount, finalizationWon ? 1 : 0);

  let correction;
  if (correctionRace.status === "fulfilled") {
    correction = correctionRace.value;
  } else {
    assert.equal(finalizeRace.status, "fulfilled");
    const reopenedAfterRace = await service.reopenAttendancePeriod(admin, 2030, 9,
      { reason: "Correction lost finalization race" }, finalizeRace.value.revision,
      key("race-reopen"), key("request-race-reopen"));
    correction = await service.createCorrectionRequest(worker, correctionInput, key("correction-after-race"));
    await service.startAttendancePeriodReview(admin, 2030, 9,
      { reason: "Review correction after race" }, reopenedAfterRace.revision,
      key("review-v3"), key("request-review-v3"));
  }
  await service.approveCorrectionRequest(managerA, correction.id, correction.revision,
    "Verified after serialization", key("approve-correction"));
  const beforeRelock = await service.getAttendancePeriod(admin, 2030, 9);
  const finalizedV2 = await service.finalizeAttendancePeriod(admin, 2030, 9,
    { reason: "Relock corrected dataset" }, beforeRelock.revision,
    key("finalize-v2"), key("request-finalize-v2"));
  assert.notEqual(finalizedV2.datasetVersion, finalizedV1.datasetVersion);
  assert.notEqual(finalizedV2.datasetChecksumSha256, finalizedV1.datasetChecksumSha256);
  const expectedVersionCount = finalizationWon ? 3 : 2;
  assert.equal((await owner.query("SELECT id FROM attendance_period_versions WHERE period_id = $1", [finalizedV2.id])).rowCount, expectedVersionCount);
  assert.equal((await service.downloadReportExport(admin, exportRace.value.id)).checksumSha256, concurrentArtifact.checksumSha256);
  const transitions = await owner.query<{
    idempotency_key: string; actor_id: string; reason: string; created_at: string | Date;
    before_dataset_version: string | null; after_dataset_version: string | null;
    before_dataset_checksum_sha256: string | null; after_dataset_checksum_sha256: string | null;
  }>(
    `SELECT idempotency_key, actor_id, reason, created_at, before_dataset_version, after_dataset_version,
       before_dataset_checksum_sha256, after_dataset_checksum_sha256
     FROM attendance_period_transitions WHERE period_id = $1 AND idempotency_key = ANY($2::text[])`,
    [finalizedV2.id, [key("reopen-v1"), key("finalize-v2")]]);
  const reopenTransition = transitions.rows.find((row) => row.idempotency_key === key("reopen-v1"));
  const relockTransition = transitions.rows.find((row) => row.idempotency_key === key("finalize-v2"));
  assert.ok(reopenTransition);
  assert.equal(reopenTransition.actor_id, admin.userId);
  assert.equal(reopenTransition.reason, "Approved late correction");
  assert.equal(reopenTransition.before_dataset_version, finalizedV1.datasetVersion);
  assert.equal(reopenTransition.after_dataset_version, finalizedV1.datasetVersion);
  assert.equal(reopenTransition.before_dataset_checksum_sha256, finalizedV1.datasetChecksumSha256);
  assert.equal(reopenTransition.after_dataset_checksum_sha256, finalizedV1.datasetChecksumSha256);
  assert.ok(Number.isFinite(new Date(reopenTransition.created_at).getTime()));
  assert.ok(reopened.reopenedAt && Number.isFinite(new Date(reopened.reopenedAt).getTime()));
  assert.ok(relockTransition);
  assert.equal(relockTransition.actor_id, admin.userId);
  assert.equal(relockTransition.reason, "Relock corrected dataset");
  assert.equal(relockTransition.before_dataset_version, beforeRelock.datasetVersion);
  assert.equal(relockTransition.after_dataset_version, finalizedV2.datasetVersion);
  assert.equal(relockTransition.before_dataset_checksum_sha256, beforeRelock.datasetChecksumSha256);
  assert.equal(relockTransition.after_dataset_checksum_sha256, finalizedV2.datasetChecksumSha256);
  assert.ok(Number.isFinite(new Date(relockTransition.created_at).getTime()));
  assert.ok(finalizedV2.finalizedAt && Number.isFinite(new Date(finalizedV2.finalizedAt).getTime()));

  const calculationEvidence = await owner.query<{
    id: string; actor_id: string; reason: string; supersedes_id: string; created_at: string | Date;
    source_event_ids: string[]; before_json: Record<string, unknown>; after_json: Record<string, unknown>;
  }>(
    `SELECT id, actor_id, reason, supersedes_id, created_at, source_event_ids, before_json, after_json
     FROM attendance_calculations WHERE id = $1`, [recalculation.calculationId]);
  assert.equal(calculationEvidence.rows[0]?.actor_id, admin.userId);
  assert.equal(calculationEvidence.rows[0]?.reason, recalculation.reason);
  assert.equal(calculationEvidence.rows[0]?.supersedes_id, recalculation.supersedesCalculationId);
  assert.deepEqual(calculationEvidence.rows[0]?.source_event_ids, recalculation.after.provenance.sourceEventIds);
  assert.ok(calculationEvidence.rows[0]?.before_json);
  assert.ok(calculationEvidence.rows[0]?.after_json);
  assert.ok(Number.isFinite(new Date(calculationEvidence.rows[0]!.created_at).getTime()));
  const recalculationAudit = await owner.query<{
    actor_id: string; occurred_at: string | Date; before_json: Record<string, unknown>;
    after_json: Record<string, unknown>; metadata: { reason: string; calculationId: string; supersedesCalculationId: string };
  }>(
    `SELECT actor_id, occurred_at, before_json, after_json, metadata FROM audit_events
     WHERE request_id = $1 AND action = 'attendance.recalculate'`, [key("recalculate-after-reopen")]);
  assert.equal(recalculationAudit.rows[0]?.actor_id, admin.userId);
  assert.equal(recalculationAudit.rows[0]?.metadata.reason, recalculation.reason);
  assert.equal(recalculationAudit.rows[0]?.metadata.calculationId, recalculation.calculationId);
  assert.equal(recalculationAudit.rows[0]?.metadata.supersedesCalculationId, recalculation.supersedesCalculationId);
  assert.ok(recalculationAudit.rows[0]?.before_json);
  assert.ok(recalculationAudit.rows[0]?.after_json);
  assert.ok(Number.isFinite(new Date(recalculationAudit.rows[0]!.occurred_at).getTime()));
  const periodAudits = await owner.query<{
    request_id: string; actor_id: string; occurred_at: string | Date;
    before_json: { datasetVersion: string | null }; after_json: { datasetVersion: string | null };
    metadata: { reason: string };
  }>(
    `SELECT request_id, actor_id, occurred_at, before_json, after_json, metadata FROM audit_events
     WHERE request_id = ANY($1::text[]) AND action IN ('attendance_period.open', 'attendance_period.finalized')`,
    [[key("request-reopen-v1"), key("request-finalize-v2")]]);
  const reopenAudit = periodAudits.rows.find((row) => row.request_id === key("request-reopen-v1"));
  const relockAudit = periodAudits.rows.find((row) => row.request_id === key("request-finalize-v2"));
  assert.equal(reopenAudit?.actor_id, admin.userId);
  assert.equal(reopenAudit?.metadata.reason, "Approved late correction");
  assert.equal(reopenAudit?.before_json.datasetVersion, finalizedV1.datasetVersion);
  assert.equal(reopenAudit?.after_json.datasetVersion, finalizedV1.datasetVersion);
  assert.ok(reopenAudit && Number.isFinite(new Date(reopenAudit.occurred_at).getTime()));
  assert.equal(relockAudit?.actor_id, admin.userId);
  assert.equal(relockAudit?.metadata.reason, "Relock corrected dataset");
  assert.equal(relockAudit?.before_json.datasetVersion, beforeRelock.datasetVersion);
  assert.equal(relockAudit?.after_json.datasetVersion, finalizedV2.datasetVersion);
  assert.ok(relockAudit && Number.isFinite(new Date(relockAudit.occurred_at).getTime()));
  const oldCsv = lockedArtifacts.get("csv")!;
  assert.equal((await service.downloadReportExport(admin, oldCsv.id)).checksumSha256, oldCsv.checksum);
  assert.equal((await service.verifyReportExport(admin, oldCsv.id)).verified, true);

  const closed = await service.closeAttendancePeriod(admin, 2030, 9,
    { reason: "Close verified September period" }, finalizedV2.revision,
    key("close"), key("request-close"));
  assert.equal(closed.status, "closed");
});
