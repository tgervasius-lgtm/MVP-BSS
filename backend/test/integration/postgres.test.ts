import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import test from "node:test";
import ExcelJS from "exceljs";
import pg from "pg";
import { bootstrapOrganization } from "../../src/db/bootstrap.js";
import { migrateUp } from "../../src/db/migrate.js";
import { hashPassword } from "../../src/security/passwords.js";
import { signDeviceRequest } from "../../src/security/device-signature.js";
import { hashRfidUid } from "../../src/security/rfid.js";
import { createOpaqueToken, hashToken } from "../../src/security/tokens.js";
import { PgAuthService } from "../../src/services/pg-auth-service.js";
import { PgMvpService } from "../../src/services/pg-mvp-service.js";

const { Client, Pool } = pg;
const databaseUrl = process.env.BSS_TEST_DATABASE_URL;
const required = process.env.BSS_REQUIRE_POSTGRES_TESTS === "true";

test("PostgreSQL migrations, RLS isolation, auth and manager scope", { skip: !databaseUrl && !required }, async (t) => {
  assert.ok(databaseUrl, "BSS_TEST_DATABASE_URL is required when PostgreSQL tests are mandatory");
  const owner = new Client({ connectionString: databaseUrl });
  await owner.connect();
  await migrateUp(owner);

  const suffix = Math.random().toString(36).slice(2, 10);
  const role = `bss_test_${suffix}`;
  const password = `test-${suffix}-password`;
  const appUrl = new URL(databaseUrl);
  appUrl.username = role;
  appUrl.password = password;

  await owner.query(`CREATE ROLE ${role} LOGIN PASSWORD '${password}' NOSUPERUSER NOBYPASSRLS`);
  await owner.query(`GRANT CONNECT ON DATABASE ${appUrl.pathname.slice(1)} TO ${role}`);
  await owner.query(`GRANT USAGE ON SCHEMA public TO ${role}`);
  await owner.query(`GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ${role}`);
  await owner.query(`GRANT EXECUTE ON FUNCTION bss_auth_lookup(text), bss_session_lookup(bytea), bss_refresh_lookup(bytea), bss_invitation_lookup(bytea), bss_terminal_credential_lookup(uuid) TO ${role}`);

  const adminPassword = "Admin-secure-password-2026!";
  const managerPassword = "Manager-secure-password-2026!";
  const workerPassword = "Worker-secure-password-2026!";
  const [adminHash, managerHash] = await Promise.all([hashPassword(adminPassword), hashPassword(managerPassword)]);
  const seeded = await owner.query<{
    org1: string; org2: string; dep1: string; dep2: string; shift1: string; shift2: string; worker1: string; worker2: string;
    admin1: string; manager1: string;
  }>(`
    WITH
      o1 AS (INSERT INTO organizations(name) VALUES ('Tenant A') RETURNING id),
      o2 AS (INSERT INTO organizations(name) VALUES ('Tenant B') RETURNING id),
      d1 AS (INSERT INTO departments(organization_id, name) SELECT id, 'Operativa' FROM o1 RETURNING id, organization_id),
      d2 AS (INSERT INTO departments(organization_id, name) SELECT id, 'Skladište' FROM o2 RETURNING id, organization_id),
      s1 AS (INSERT INTO shifts(organization_id, name, start_time, end_time, break_minutes, tolerance_minutes)
             SELECT id, 'Jutarnja', '08:00', '16:00', 30, 5 FROM o1 RETURNING id, organization_id),
      s2 AS (INSERT INTO shifts(organization_id, name, start_time, end_time, break_minutes, tolerance_minutes)
             SELECT id, 'Noćna', '22:00', '06:00', 30, 5 FROM o2 RETURNING id, organization_id),
      w1 AS (INSERT INTO workers(organization_id, code, name, department_id, shift_id)
             SELECT d1.organization_id, 'A-1', 'Ana A', d1.id, s1.id FROM d1, s1 RETURNING id, organization_id),
      w2 AS (INSERT INTO workers(organization_id, code, name, department_id, shift_id)
             SELECT d2.organization_id, 'B-1', 'Boris B', d2.id, s2.id FROM d2, s2 RETURNING id, organization_id),
      u1 AS (INSERT INTO users(organization_id, email, password_hash, role, status)
             SELECT id, 'admin-a@example.test', $1, 'admin', 'active' FROM o1 RETURNING id, organization_id),
      u2 AS (INSERT INTO users(organization_id, email, password_hash, role, status)
             SELECT id, 'manager-a@example.test', $2, 'manager', 'active' FROM o1 RETURNING id, organization_id),
      scope AS (INSERT INTO user_department_scopes(organization_id, user_id, department_id)
                SELECT u2.organization_id, u2.id, d1.id FROM u2, d1)
    SELECT o1.id AS org1, o2.id AS org2, d1.id AS dep1, d2.id AS dep2,
           s1.id AS shift1, s2.id AS shift2, w1.id AS worker1, w2.id AS worker2,
           u1.id AS admin1, u2.id AS manager1
    FROM o1, o2, d1, d2, s1, s2, w1, w2, u1, u2
  `, [adminHash, managerHash]);
  const ids = seeded.rows[0];
  assert.ok(ids);
  const workerUser = await owner.query<{ id: string }>(
    `INSERT INTO users (organization_id, email, password_hash, role, status, worker_id)
     VALUES ($1, 'worker-a@example.test', $2, 'worker', 'active', $3) RETURNING id`,
    [ids.org1, await hashPassword(workerPassword), ids.worker1]
  );
  assert.ok(workerUser.rows[0]?.id);

  const appPool = new Pool({ connectionString: appUrl.toString(), max: 3 });
  t.after(async () => {
    await appPool.end();
    await owner.query(`DROP OWNED BY ${role}`);
    await owner.query(`DROP ROLE IF EXISTS ${role}`);
    await owner.end();
  });
  const config = { accessTokenTtlSeconds: 900, refreshTokenTtlSeconds: 2_592_000 };
  const auth = new PgAuthService(appPool, config);
  const rfidPepper = "integration-rfid-pepper-0123456789abcdef";
  const terminalActivationCode = "integration-terminal-activation-code";
  const service = new PgMvpService(appPool, {
    rfidUidPepper: rfidPepper,
    deviceCredentialEncryptionKey: "integration-device-encryption-key-0123456789abcdef",
    terminalActivationCode,
    publicOrigin: "https://bss.test"
  });

  const bootstrapPassword = "Bootstrap-secure-password-2026!";
  const bootstrapped = await bootstrapOrganization(owner, {
    BSS_BOOTSTRAP_ORGANIZATION_NAME: `Bootstrap ${suffix}`,
    BSS_BOOTSTRAP_ADMIN_EMAIL: `bootstrap-${suffix}@example.test`,
    BSS_BOOTSTRAP_ADMIN_PASSWORD: bootstrapPassword,
    BSS_BOOTSTRAP_TIMEZONE: "Europe/Zagreb"
  });
  const bootstrapSession = await auth.login(bootstrapped.email, bootstrapPassword, { requestId: "integration-bootstrap-login" });
  const bootstrapOrganizationView = await service.getOrganization(bootstrapSession.actor);
  assert.equal(bootstrapOrganizationView.id, bootstrapped.organizationId);
  const renamedBootstrapOrganization = await service.updateOrganization(
    bootstrapSession.actor,
    { name: `Bootstrap ${suffix} d.o.o.`, approvedLeaveVisibility: "organization" },
    bootstrapOrganizationView.revision,
    "integration-bootstrap-organization-update"
  );
  assert.equal(renamedBootstrapOrganization.approvedLeaveVisibility, "organization");

  const admin = await auth.login("admin-a@example.test", adminPassword, { requestId: "integration-login" });
  assert.equal(admin.context.organization.id, ids.org1);
  const adminWorkers = await service.listWorkers(admin.actor, { limit: 50 });
  assert.deepEqual(adminWorkers.items.map((item) => item.id), [ids.worker1]);

  const manager = await auth.login("manager-a@example.test", managerPassword, { requestId: "integration-manager" });
  assert.deepEqual(manager.actor.departmentIds, [ids.dep1]);
  const managerWorkers = await service.listWorkers(manager.actor, { limit: 50 });
  assert.deepEqual(managerWorkers.items.map((item) => item.id), [ids.worker1]);
  const workerSession = await auth.login("worker-a@example.test", workerPassword, { requestId: "integration-worker" });
  assert.equal(workerSession.actor.selfWorkerId, ids.worker1);

  const department = await service.updateDepartment(
    admin.actor,
    ids.dep1,
    { name: "Operativa A" },
    "1",
    "integration-department"
  );
  assert.equal(department.name, "Operativa A");

  const createdDepartment = await service.createDepartment(admin.actor, `Privremeni ${suffix}`, "integration-department-create");
  const blockedDepartment = await service.updateDepartment(
    admin.actor,
    createdDepartment.id,
    { name: `Arhiva ${suffix}`, status: "blocked" },
    createdDepartment.revision,
    "integration-department-block"
  );
  assert.equal(blockedDepartment.status, "blocked");

  const createdShift = await service.createShift(admin.actor, {
    name: `Testna ${suffix}`,
    startTime: "09:00",
    endTime: "17:00",
    breakMinutes: 30,
    toleranceMinutes: 10
  }, "integration-shift-create");
  const updatedShift = await service.updateShift(admin.actor, createdShift.id, {
    name: `Testna ${suffix} v2`,
    startTime: "09:15",
    endTime: "17:15",
    breakMinutes: 30,
    toleranceMinutes: 5
  }, createdShift.revision, "integration-shift-update");
  assert.equal(updatedShift.startTime, "09:15");

  const createdWorker = await service.createWorker(admin.actor, {
    code: `TMP-${suffix}`,
    name: "Privremeni Radnik",
    email: `worker-${suffix}@example.test`,
    departmentId: ids.dep1,
    shiftId: ids.shift1,
    annualLeaveAllowance: 20
  }, "integration-worker-create");
  const updatedWorker = await service.updateWorker(admin.actor, createdWorker.id, {
    code: `TMP-${suffix}`,
    name: "Privremeni Radnik Ažuriran",
    email: `worker-${suffix}@example.test`,
    departmentId: ids.dep1,
    shiftId: ids.shift1,
    annualLeaveAllowance: 22
  }, createdWorker.revision, "integration-worker-update");
  const deactivatedWorker = await service.deactivateWorker(admin.actor, updatedWorker.id, updatedWorker.revision, "integration-worker-deactivate");
  const reactivatedWorker = await service.activateWorker(admin.actor, deactivatedWorker.id, deactivatedWorker.revision, "integration-worker-activate");
  const archivedWorker = await service.deactivateWorker(admin.actor, reactivatedWorker.id, reactivatedWorker.revision, "integration-worker-archive");
  assert.equal(archivedWorker.status, "blocked");

  const calendar = await service.replaceHolidays(
    admin.actor,
    2026,
    [{ date: "2026-07-16", name: "Testni blagdan" }],
    "0",
    "integration-holidays"
  );
  assert.equal(calendar.revision, "1");
  const readCalendar = await service.listHolidays(admin.actor, 2026);
  assert.equal(readCalendar.items.length, 1);
  assert.equal(readCalendar.revision, "1");

  const card = await service.assignWorkerRfidCard(
    admin.actor,
    ids.worker1,
    { uid: "04:A1:B2:C3", validFrom: "2026-01-01T00:00:00.000Z" },
    "integration-rfid"
  );
  assert.equal(card.maskedUid, "****B2C3");
  const cards = await service.listWorkerRfidCards(manager.actor, ids.worker1);
  assert.equal(cards.length, 1);
  const storedCard = await owner.query<{ uid_hash: Buffer; masked_uid: string }>(
    "SELECT uid_hash, masked_uid FROM rfid_cards WHERE id = $1",
    [card.id]
  );
  assert.equal(storedCard.rows[0]?.masked_uid, "****B2C3");
  assert.notEqual(storedCard.rows[0]?.uid_hash.toString("utf8"), "04A1B2C3");

  const operational = await owner.query<{ terminal: string }>(
    `WITH attendance AS (
       INSERT INTO attendance_days (
         organization_id, worker_id, work_date, shift_snapshot, check_in, check_out,
         break_minutes, worked_minutes, planned_minutes, status
       ) VALUES ($1, $2, '2026-07-13', $3::jsonb, '2026-07-13T06:00:00Z', '2026-07-13T14:00:00Z', 30, 450, 450, 'complete')
       RETURNING id
     ), leave AS (
       INSERT INTO leave_requests (
         organization_id, worker_id, leave_type, start_date, end_date, working_days,
         status, decided_by, decided_at
       ) VALUES ($1, $2, 'annual_leave', '2026-07-14', '2026-07-15', 2, 'approved', $4, clock_timestamp())
       RETURNING id
     ), terminal AS (
       INSERT INTO terminals (organization_id, name, location, status)
       VALUES ($1, 'Ulaz A', 'Zagreb', 'offline') RETURNING id
     ), sync AS (
       INSERT INTO terminal_sync_events (
         organization_id, terminal_id, device_event_id, sequence, worker_id,
         occurred_at, event_type, status, request_id
       ) SELECT $1, terminal.id, gen_random_uuid(), 1, $2,
           '2026-07-13T06:00:00Z', 'check_in', 'synced', 'integration-sync' FROM terminal
     )
     SELECT terminal.id AS terminal FROM terminal`,
    [ids.org1, ids.worker1, JSON.stringify({ id: ids.shift1, name: "Jutarnja", startTime: "08:00", endTime: "16:00", breakMinutes: 30 }), ids.admin1]
  );
  const terminalId = operational.rows[0]?.terminal;
  assert.ok(terminalId);

  const balances = await service.listLeaveBalances(admin.actor, { year: 2026, limit: 50 });
  assert.equal(balances.items[0]?.approvedDays, 2);
  assert.equal(balances.items[0]?.availableDays, 18);
  assert.equal(balances.page.total, 1);

  const report = await service.createReportPreview(admin.actor, {
    reportType: "monthly_summary",
    periodFrom: "2026-07-01",
    periodTo: "2026-07-31"
  });
  assert.equal(report.totals.rowCount, 1);
  assert.equal(report.totals.workedMinutes, 450);
  assert.equal(report.rows[0]?.workerCode, "A-1");

  const dashboard = await service.getDashboardSummary(admin.actor, "2026-07-13");
  assert.ok(dashboard.kpis.length <= 4);
  assert.equal(dashboard.kpis.find((item) => item.id === "present")?.value, 1);

  const syncEvents = await service.listTerminalSyncEvents(admin.actor, terminalId, {
    from: "2026-07-01",
    to: "2026-07-31",
    limit: 50
  });
  assert.equal(syncEvents.items.length, 1);
  assert.equal(syncEvents.items[0]?.status, "synced");

  const paired = await service.pairTerminal(
    admin.actor,
    { activationCode: terminalActivationCode, name: "RFID ulaz 01", location: "Operativa A" },
    "integration-terminal-pair"
  );
  assert.equal(paired.terminal.status, "offline");
  assert.ok(paired.deviceCredential.length >= 32);

  const cardUidHash = hashRfidUid("04:A1:B2:C3", rfidPepper).toString("hex");
  const ingest = async (eventType: "check_in" | "check_out", deviceEventId: string, occurredAt: string, sequence: number, nonce: string) => {
    const body = {
      batchId: randomUUID(),
      sentAt: new Date().toISOString(),
      events: [{ deviceEventId, sequence, occurredAt, eventType, cardUidHash, deviceClockOffsetSeconds: 0 }]
    };
    const rawBody = Buffer.from(JSON.stringify(body), "utf8");
    const timestamp = new Date().toISOString();
    const path = "/api/v1/terminal/v1/events/batch";
    return service.ingestTerminalEventBatch({
      terminalId: paired.terminal.id,
      timestamp,
      nonce,
      signature: signDeviceRequest(paired.deviceCredential, { method: "POST", path, body: rawBody, timestamp, nonce }),
      method: "POST",
      path,
      rawBody
    }, body, `integration-terminal-${sequence}`);
  };

  const checkInEventId = randomUUID();
  const checkIn = await ingest("check_in", checkInEventId, "2026-07-17T06:00:00.000Z", 1, "integration-nonce-check-in-0001");
  assert.equal(checkIn.results[0]?.status, "synced");
  const duplicate = await ingest("check_in", checkInEventId, "2026-07-17T06:00:00.000Z", 1, "integration-nonce-duplicate-0002");
  assert.equal(duplicate.results[0]?.status, "duplicate");
  const checkOut = await ingest("check_out", randomUUID(), "2026-07-17T14:00:00.000Z", 2, "integration-nonce-check-out-0003");
  assert.equal(checkOut.results[0]?.status, "synced");
  const outOfOrder = await ingest("check_in", randomUUID(), "2026-07-18T06:00:00.000Z", 1, "integration-nonce-out-of-order-0004");
  assert.equal(outOfOrder.results[0]?.status, "rejected");
  assert.equal(outOfOrder.results[0]?.code, "SEQUENCE_OUT_OF_ORDER");

  const day = await service.getWorkerAttendance(workerSession.actor, ids.worker1, { from: "2026-07-17", to: "2026-07-17" });
  assert.equal(day.items.length, 1);
  assert.equal(day.items[0]?.workedMinutes, 450);
  assert.equal(day.items[0]?.status, "complete");

  const heartbeatBody = { sentAt: new Date().toISOString(), sequence: 3, queueDepth: 2, softwareVersion: "bss-terminal-1.0.0", deviceClockOffsetSeconds: 1 };
  const heartbeatRaw = Buffer.from(JSON.stringify(heartbeatBody), "utf8");
  const heartbeatTimestamp = new Date().toISOString();
  const heartbeatNonce = "integration-nonce-heartbeat-0005";
  const heartbeatPath = "/api/v1/terminal/v1/heartbeat";
  await service.terminalHeartbeat({
    terminalId: paired.terminal.id,
    timestamp: heartbeatTimestamp,
    nonce: heartbeatNonce,
    signature: signDeviceRequest(paired.deviceCredential, { method: "POST", path: heartbeatPath, body: heartbeatRaw, timestamp: heartbeatTimestamp, nonce: heartbeatNonce }),
    method: "POST",
    path: heartbeatPath,
    rawBody: heartbeatRaw
  }, heartbeatBody, "integration-heartbeat");
  const terminals = await service.listTerminals(admin.actor);
  assert.equal(terminals.find((item) => item.id === paired.terminal.id)?.queueDepth, 2);

  const nextCheckIn = await ingest("check_in", randomUUID(), "2026-07-18T06:00:00.000Z", 3, "integration-nonce-next-check-in-0006");
  assert.equal(nextCheckIn.results[0]?.status, "synced");
  const invalidCheckOut = await ingest("check_out", randomUUID(), "2026-07-18T05:59:00.000Z", 4, "integration-nonce-invalid-check-out-0007");
  assert.equal(invalidCheckOut.results[0]?.status, "rejected");
  assert.equal(invalidCheckOut.results[0]?.code, "CHECK_OUT_BEFORE_CHECK_IN");
  const nextCheckOut = await ingest("check_out", randomUUID(), "2026-07-18T14:00:00.000Z", 5, "integration-nonce-next-check-out-0008");
  assert.equal(nextCheckOut.results[0]?.status, "synced");

  const leave = await service.createLeaveRequest(workerSession.actor, {
    typeCode: "annual_leave",
    startDate: "2026-08-03",
    endDate: "2026-08-07",
    note: "Planirani godišnji"
  }, "integration-leave-create");
  assert.equal(leave.workingDays, 5);
  const approvedLeave = await service.approveLeaveRequest(manager.actor, leave.id, leave.revision, "Odobreno u planu", "integration-leave-approve");
  assert.equal(approvedLeave.status, "approved");
  const sharedLeave = await service.listApprovedLeaveCalendar(workerSession.actor, { from: "2026-01-01", to: "2026-12-31" });
  assert.ok(sharedLeave.items.some((item) => item.id === leave.id && item.employeeName === "Ana A"));
  assert.deepEqual(Object.keys(sharedLeave.items[0] ?? {}).sort(), ["employeeName", "endDate", "id", "startDate"]);

  const correction = await service.createCorrectionRequest(workerSession.actor, {
    attendanceDayId: day.items[0]!.id,
    newCheckIn: "2026-07-17T06:05:00.000Z",
    newCheckOut: "2026-07-17T14:05:00.000Z",
    reason: "Provjereno vrijeme terminala"
  }, "integration-correction-create");
  const correctionDecision = await service.approveCorrectionRequest(
    manager.actor,
    correction.id,
    correction.revision,
    "Provjereno prema terminalu",
    "integration-correction-approve"
  );
  assert.equal(correctionDecision.request.status, "approved");
  assert.equal(correctionDecision.attendanceDay.status, "corrected");
  assert.equal(correctionDecision.attendanceDay.source, "approved_correction");

  const rawEvent = await owner.query<{ id: string }>(
    "SELECT id FROM attendance_events WHERE terminal_id = $1 AND device_event_id = $2",
    [paired.terminal.id, checkInEventId]
  );
  assert.ok(rawEvent.rows[0]?.id);
  await assert.rejects(owner.query("UPDATE attendance_events SET rejection_code = 'tamper' WHERE id = $1", [rawEvent.rows[0]!.id]));

  for (const format of ["csv", "xlsx", "pdf"] as const) {
    const exported = await service.createReportExport(admin.actor, {
      reportType: "attendance_journal",
      format,
      periodFrom: "2026-07-01",
      periodTo: "2026-07-31"
    }, `integration-report-${format}`);
    assert.equal(exported.status, "ready");
    assert.ok(exported.rowCount && exported.rowCount >= 2);
    const artifact = await service.downloadReportExport(admin.actor, exported.id);
    assert.equal(createHash("sha256").update(artifact.content).digest("hex"), artifact.checksumSha256);
    if (format === "csv") assert.equal(artifact.content.subarray(0, 3).toString("hex"), "efbbbf");
    if (format === "pdf") assert.equal(artifact.content.subarray(0, 4).toString("ascii"), "%PDF");
    if (format === "xlsx") {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(artifact.content as never);
      assert.ok(workbook.worksheets[0]?.rowCount && workbook.worksheets[0].rowCount >= 2);
    }
  }

  const auditTrail = await service.listAuditEvents(admin.actor, { from: "2026-07-01", to: "2026-12-31", limit: 200 });
  for (const action of ["terminal.pair", "leave_request.approved", "correction_request.approve", "report_export.create"]) {
    assert.ok(auditTrail.items.some((item) => item.action === action), `Missing audit action: ${action}`);
  }

  const invitationToken = createOpaqueToken();
  const invited = await owner.query<{ id: string }>(
    `INSERT INTO users (organization_id, email, role, status)
     VALUES ($1, 'accountant-invited@example.test', 'accountant', 'blocked') RETURNING id`,
    [ids.org1]
  );
  const invitedUserId = invited.rows[0]?.id;
  assert.ok(invitedUserId);
  await owner.query(
    `INSERT INTO user_invitations (organization_id, email, role, token_hash, expires_at, invited_by)
     VALUES ($1, 'accountant-invited@example.test', 'accountant', $2, clock_timestamp() + interval '1 day', $3)`,
    [ids.org1, hashToken(invitationToken), ids.admin1]
  );
  const accepted = await auth.acceptInvitation(invitationToken, "Invitation-secure-password-2026!", {
    requestId: "integration-invitation"
  });
  assert.equal(accepted.context.user.id, invitedUserId);
  assert.equal(accepted.context.user.status, "active");
  assert.equal((await auth.resolveAccessToken(accepted.tokens.accessToken)).actor.userId, invitedUserId);
  const accountingLeave = await service.listLeaveRequests(accepted.actor, {
    from: "2026-01-01",
    to: "2026-12-31",
    limit: 200
  });
  assert.ok(accountingLeave.items.length >= 2);
  assert.ok(accountingLeave.items.every((item) => item.status === "approved" && item.note === "" && item.decisionNote === null));
  const accountingCalendar = await service.listApprovedLeaveCalendar(accepted.actor, { from: "2026-01-01", to: "2026-12-31" });
  assert.ok(accountingCalendar.items.length >= 2);

  const rls = await appPool.connect();
  try {
    await rls.query("BEGIN");
    await rls.query("SELECT set_config('bss.organization_id', $1, true)", [ids.org1]);
    const visible = await rls.query<{ id: string }>("SELECT id FROM workers ORDER BY id");
    assert.deepEqual(
      visible.rows.map((row) => row.id),
      [ids.worker1, createdWorker.id].sort()
    );
    await assert.rejects(
      rls.query(
        "INSERT INTO departments(organization_id, name) VALUES ($1, 'Cross tenant write')",
        [ids.org2]
      )
    );
    await rls.query("ROLLBACK");
  } finally {
    rls.release();
  }
});
