import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import test from "node:test";
import ExcelJS from "exceljs";
import pg from "pg";
import { loadConfig } from "../../src/config.js";
import { bootstrapOrganization } from "../../src/db/bootstrap.js";
import { migrateUp } from "../../src/db/migrate.js";
import { buildApp } from "../../src/http/app.js";
import { hashPassword } from "../../src/security/passwords.js";
import { signDeviceRequest } from "../../src/security/device-signature.js";
import { hashRfidUid } from "../../src/security/rfid.js";
import { signTerminalAcknowledgement } from "../../src/security/terminal-acknowledgement.js";
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
  await owner.query(`GRANT SELECT ON ALL TABLES IN SCHEMA public TO ${role}`);
  await owner.query(`GRANT INSERT ON departments, shifts, workers, holidays, rfid_cards,
    users, user_department_scopes, user_invitations, auth_sessions, terminals, terminal_credentials,
    attendance_events, attendance_days, leave_requests, correction_requests, report_exports, audit_events,
    holiday_calendars, terminal_request_nonces, terminal_sync_events, attendance_calculations,
    terminal_event_reconciliations TO ${role}`);
  await owner.query(`GRANT UPDATE ON organizations, departments, shifts, workers, holidays, rfid_cards,
    users, user_invitations, auth_sessions, terminals, terminal_credentials, attendance_days,
    leave_requests, correction_requests, report_exports, holiday_calendars TO ${role}`);
  await owner.query(`GRANT DELETE ON holidays, user_department_scopes, terminal_request_nonces TO ${role}`);
  await owner.query(`REVOKE ALL PRIVILEGES ON bss_schema_migrations FROM ${role}`);
  await owner.query(`GRANT EXECUTE ON FUNCTION bss_auth_lookup(text), bss_session_lookup(bytea), bss_refresh_lookup(bytea), bss_invitation_lookup(bytea), bss_terminal_credential_lookup(uuid) TO ${role}`);

  const adminPassword = "Admin-secure-password-2026!";
  const managerPassword = "Manager-secure-password-2026!";
  const workerPassword = "Worker-secure-password-2026!";
  const [adminHash, managerHash] = await Promise.all([hashPassword(adminPassword), hashPassword(managerPassword)]);
  const seeded = await owner.query<{
    org1: string; org2: string; dep1: string; dep2: string; dep3: string; shift1: string; shift2: string;
    worker1: string; worker2: string; worker3: string; admin1: string; manager1: string;
  }>(`
    WITH
      o1 AS (INSERT INTO organizations(name) VALUES ('Tenant A') RETURNING id),
      o2 AS (INSERT INTO organizations(name) VALUES ('Tenant B') RETURNING id),
      d1 AS (INSERT INTO departments(organization_id, name) SELECT id, 'Operativa' FROM o1 RETURNING id, organization_id),
      d2 AS (INSERT INTO departments(organization_id, name) SELECT id, 'Skladište' FROM o2 RETURNING id, organization_id),
      d3 AS (INSERT INTO departments(organization_id, name) SELECT id, 'Prodaja' FROM o1 RETURNING id, organization_id),
      s1 AS (INSERT INTO shifts(organization_id, name, start_time, end_time, break_minutes, tolerance_minutes)
             SELECT id, 'Jutarnja', '08:00', '16:00', 30, 5 FROM o1 RETURNING id, organization_id),
      s2 AS (INSERT INTO shifts(organization_id, name, start_time, end_time, break_minutes, tolerance_minutes)
             SELECT id, 'Noćna', '22:00', '06:00', 30, 5 FROM o2 RETURNING id, organization_id),
      w1 AS (INSERT INTO workers(organization_id, code, name, department_id, shift_id)
             SELECT d1.organization_id, 'A-1', 'Ana A', d1.id, s1.id FROM d1, s1 RETURNING id, organization_id),
      w2 AS (INSERT INTO workers(organization_id, code, name, department_id, shift_id)
             SELECT d2.organization_id, 'B-1', 'Boris B', d2.id, s2.id FROM d2, s2 RETURNING id, organization_id),
      w3 AS (INSERT INTO workers(organization_id, code, name, department_id, shift_id)
             SELECT d3.organization_id, 'A-2', 'Branko A', d3.id, s1.id FROM d3, s1 RETURNING id, organization_id),
      u1 AS (INSERT INTO users(organization_id, email, password_hash, role, status)
             SELECT id, 'admin-a@example.test', $1, 'admin', 'active' FROM o1 RETURNING id, organization_id),
      u2 AS (INSERT INTO users(organization_id, email, password_hash, role, status)
             SELECT id, 'manager-a@example.test', $2, 'manager', 'active' FROM o1 RETURNING id, organization_id),
      scope AS (INSERT INTO user_department_scopes(organization_id, user_id, department_id)
                SELECT u2.organization_id, u2.id, d1.id FROM u2, d1)
    SELECT o1.id AS org1, o2.id AS org2, d1.id AS dep1, d2.id AS dep2, d3.id AS dep3,
           s1.id AS shift1, s2.id AS shift2, w1.id AS worker1, w2.id AS worker2, w3.id AS worker3,
           u1.id AS admin1, u2.id AS manager1
    FROM o1, o2, d1, d2, d3, s1, s2, w1, w2, w3, u1, u2
  `, [adminHash, managerHash]);
  const ids = seeded.rows[0];
  assert.ok(ids);
  await owner.query("UPDATE organization_timezone_versions SET effective_from = '2020-01-01T00:00:00Z' WHERE organization_id = ANY($1::uuid[])", [[ids.org1, ids.org2]]);
  await owner.query("UPDATE shift_configuration_versions SET effective_from = '2020-01-01T00:00:00Z' WHERE shift_id = ANY($1::uuid[])", [[ids.shift1, ids.shift2]]);
  await owner.query("UPDATE worker_shift_assignments SET effective_from = '2020-01-01T00:00:00Z' WHERE worker_id = ANY($1::uuid[])", [[ids.worker1, ids.worker2, ids.worker3]]);
  await owner.query("UPDATE worker_department_assignments SET effective_from = '2020-01-01T00:00:00Z' WHERE worker_id = ANY($1::uuid[])", [[ids.worker1, ids.worker2, ids.worker3]]);
  await owner.query("UPDATE worker_status_versions SET effective_from = '2020-01-01T00:00:00Z' WHERE worker_id = ANY($1::uuid[])", [[ids.worker1, ids.worker2, ids.worker3]]);
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

  const blockedTenantPassword = "Blocked-tenant-password-2026!";
  await owner.query(
    `INSERT INTO users (organization_id, email, password_hash, role, status, worker_id)
     VALUES ($1, 'worker-b@example.test', $2, 'worker', 'active', $3)`,
    [ids.org2, await hashPassword(blockedTenantPassword), ids.worker2]
  );
  await owner.query("UPDATE organizations SET status = 'blocked' WHERE id = $1", [ids.org2]);
  await assert.rejects(
    auth.login("worker-b@example.test", blockedTenantPassword, { requestId: "integration-blocked-tenant-login" }),
    (error: unknown) => typeof error === "object" && error !== null && "code" in error && error.code === "UNAUTHENTICATED"
  );

  await assert.rejects(appPool.query("SELECT version FROM bss_schema_migrations"), /permission denied/i);
  await assert.rejects(appPool.query("DELETE FROM workers"), /permission denied/i);
  await assert.rejects(appPool.query("INSERT INTO organizations (name) VALUES ('Unauthorized tenant')"), /permission denied/i);
  await assert.rejects(
    owner.query("UPDATE users SET worker_id = $1 WHERE id = $2", [ids.worker1, ids.admin1]),
    /users_worker_role_consistency/i
  );

  const bootstrapPassword = "Bootstrap-secure-password-2026!";
  await owner.query(`GRANT INSERT ON organizations TO ${role}`);
  const bootstrapClient = new Client({ connectionString: appUrl.toString() });
  await bootstrapClient.connect();
  let bootstrapped: Awaited<ReturnType<typeof bootstrapOrganization>>;
  try {
    bootstrapped = await bootstrapOrganization(bootstrapClient, {
      BSS_BOOTSTRAP_ORGANIZATION_NAME: `Bootstrap ${suffix}`,
      BSS_BOOTSTRAP_ADMIN_EMAIL: `bootstrap-${suffix}@example.test`,
      BSS_BOOTSTRAP_ADMIN_PASSWORD: bootstrapPassword,
      BSS_BOOTSTRAP_TIMEZONE: "Europe/Zagreb"
    });
  } finally {
    await bootstrapClient.end();
    await owner.query(`REVOKE INSERT ON organizations FROM ${role}`);
  }
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
  const staleActiveInvitationToken = createOpaqueToken();
  await owner.query(
    `INSERT INTO user_invitations (organization_id, email, role, token_hash, expires_at, invited_by)
     VALUES ($1, 'admin-a@example.test', 'admin', $2, clock_timestamp() + interval '1 day', $3)`,
    [ids.org1, hashToken(staleActiveInvitationToken), ids.admin1]
  );
  await assert.rejects(
    auth.acceptInvitation(staleActiveInvitationToken, "Replacement-secure-password-2026!", {
      requestId: "integration-active-invitation-reject"
    }),
    (error: unknown) => typeof error === "object" && error !== null && "code" in error && error.code === "UNAUTHENTICATED"
  );
  await assert.rejects(
    service.updateUser(admin.actor, ids.admin1, { status: "blocked" }, admin.context.user.revision, "integration-last-admin"),
    (error: unknown) => typeof error === "object" && error !== null && "code" in error && error.code === "CONFLICT"
  );
  const adminWorkers = await service.listWorkers(admin.actor, { limit: 50 });
  assert.deepEqual(adminWorkers.items.map((item) => item.id).sort(), [ids.worker1, ids.worker3].sort());
  assert.equal(adminWorkers.page.total, 2);
  await assert.rejects(
    service.inviteUser(admin.actor, { email: `invalid-worker-${suffix}@example.test`, role: "worker" }, "integration-invalid-worker-invite"),
    (error: unknown) => typeof error === "object" && error !== null && "code" in error && error.code === "VALIDATION_FAILED"
  );
  const firstInvitation = await service.inviteUser(
    admin.actor,
    { email: `reinvite-${suffix}@example.test`, role: "accountant" },
    "integration-invite-first"
  );
  const replacementInvitation = await service.inviteUser(
    admin.actor,
    { email: `reinvite-${suffix}@example.test`, role: "accountant" },
    "integration-invite-replacement"
  );
  assert.equal(replacementInvitation.id, firstInvitation.id);
  assert.notEqual(replacementInvitation.invitationUrl, firstInvitation.invitationUrl);
  assert.notEqual(replacementInvitation.revision, firstInvitation.revision);
  const invitationStates = await owner.query<{ active: string; revoked: string }>(
    `SELECT COUNT(*) FILTER (WHERE revoked_at IS NULL)::text AS active,
       COUNT(*) FILTER (WHERE revoked_at IS NOT NULL)::text AS revoked
     FROM user_invitations WHERE lower(email) = lower($1)`,
    [`reinvite-${suffix}@example.test`]
  );
  assert.deepEqual(invitationStates.rows[0], { active: "1", revoked: "1" });
  await assert.rejects(
    service.inviteUser(admin.actor, { email: "admin-a@example.test", role: "accountant" }, "integration-active-user-reinvite"),
    (error: unknown) => typeof error === "object" && error !== null && "code" in error && error.code === "CONFLICT"
  );

  const manager = await auth.login("manager-a@example.test", managerPassword, { requestId: "integration-manager" });
  assert.deepEqual(manager.actor.departmentIds, [ids.dep1]);
  const managerWorkers = await service.listWorkers(manager.actor, { limit: 50 });
  assert.deepEqual(managerWorkers.items.map((item) => item.id), [ids.worker1]);
  await owner.query(
    `INSERT INTO users (organization_id, email, password_hash, role, status)
     VALUES ($1, 'manager-b@example.test', $2, 'manager', 'active'),
            ($1, 'manager-unassigned@example.test', $2, 'manager', 'active'),
            ($1, 'accountant-a@example.test', $2, 'accountant', 'active')`,
    [ids.org1, managerHash]
  );
  await owner.query(
    `INSERT INTO user_department_scopes (organization_id, user_id, department_id)
     SELECT $1, id, $2 FROM users WHERE email = 'manager-b@example.test'`,
    [ids.org1, ids.dep3]
  );
  const managerB = await auth.login("manager-b@example.test", managerPassword, { requestId: "integration-manager-b" });
  assert.deepEqual(managerB.actor.departmentIds, [ids.dep3]);
  const managerBWorkers = await service.listWorkers(managerB.actor, { limit: 50 });
  assert.deepEqual(managerBWorkers.items.map((item) => item.id), [ids.worker3]);
  assert.equal(managerBWorkers.page.total, 1);
  const unassignedManager = await auth.login("manager-unassigned@example.test", managerPassword, { requestId: "integration-manager-unassigned" });
  const accountant = await auth.login("accountant-a@example.test", managerPassword, { requestId: "integration-accountant" });
  assert.deepEqual(unassignedManager.actor.departmentIds, []);
  const workerSession = await auth.login("worker-a@example.test", workerPassword, { requestId: "integration-worker" });
  assert.equal(workerSession.actor.selfWorkerId, ids.worker1);
  await assert.rejects(
    service.createReportPreview(workerSession.actor, {
      reportType: "monthly_summary",
      periodFrom: "2026-07-01",
      periodTo: "2026-07-31"
    }),
    (error: unknown) => typeof error === "object" && error !== null && "code" in error && error.code === "FORBIDDEN"
  );
  await assert.rejects(
    service.pairTerminal(manager.actor, { activationCode: terminalActivationCode, name: "Nedopušten", location: "Test" }, "integration-manager-pair"),
    (error: unknown) => typeof error === "object" && error !== null && "code" in error && error.code === "FORBIDDEN"
  );

  const department = await service.updateDepartment(
    admin.actor,
    ids.dep1,
    { name: "Operativa A" },
    "1",
    "integration-department"
  );
  assert.equal(department.name, "Operativa A");
  await assert.rejects(
    service.updateDepartment(
      admin.actor,
      ids.dep1,
      { status: "blocked" },
      department.revision,
      "integration-department-active-workers"
    ),
    (error: unknown) => typeof error === "object" && error !== null && "code" in error && error.code === "CONFLICT"
  );

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

  await assert.rejects(
    service.createWorker(admin.actor, {
      code: `INVALID-${suffix}`,
      name: "Neispravna Dodjela",
      email: `invalid-assignment-${suffix}@example.test`,
      departmentId: blockedDepartment.id,
      shiftId: ids.shift1,
      annualLeaveAllowance: 20
    }, "integration-worker-blocked-department"),
    (error: unknown) => typeof error === "object" && error !== null && "code" in error && error.code === "VALIDATION_FAILED"
  );

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
    { uid: "04:A1:B2:C3", validFrom: "2025-01-01T00:00:00.000Z" },
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
         organization_id, terminal_id, device_event_id, sequence, worker_id, effective_department_id,
         occurred_at, received_at, event_type, status, request_id
       ) SELECT $1, terminal.id, gen_random_uuid(), 1, $2, $5,
           '2026-07-13T06:00:00Z', '2026-07-13T06:00:01Z',
           'check_in', 'synced', 'integration-sync' FROM terminal
     )
     SELECT terminal.id AS terminal FROM terminal`,
    [ids.org1, ids.worker1, JSON.stringify({ id: ids.shift1, name: "Jutarnja", startTime: "08:00", endTime: "16:00", breakMinutes: 30 }), ids.admin1, ids.dep1]
  );
  const terminalId = operational.rows[0]?.terminal;
  assert.ok(terminalId);
  const seedTerminalHistory = async (organizationId: string, name: string, workerIds: Array<string | null>, departmentIds: Array<string | null>) => {
    const seededTerminal = await owner.query<{ terminal: string }>(
      `WITH terminal AS (
         INSERT INTO terminals (organization_id, name, location, status)
         VALUES ($1, $2, 'Test', 'offline') RETURNING id
       )
       INSERT INTO terminal_sync_events (
         organization_id, terminal_id, device_event_id, sequence, worker_id, effective_department_id,
         occurred_at, received_at, event_type, status, request_id
       )
       SELECT $1, terminal.id, gen_random_uuid(), event.ordinality, event.worker_id, event.department_id,
         '2026-07-13T07:00:00Z'::timestamptz + event.ordinality * interval '1 minute',
         '2026-07-13T07:00:01Z'::timestamptz + event.ordinality * interval '1 minute',
         'check_in', 'synced', 'integration-scope-' || event.ordinality
       FROM terminal, unnest($3::uuid[], $4::uuid[]) WITH ORDINALITY AS event(worker_id, department_id, ordinality)
       RETURNING terminal_id AS terminal`,
      [organizationId, name, workerIds, departmentIds]
    );
    return seededTerminal.rows[0]!.terminal;
  };
  const outOfScopeTerminalId = await seedTerminalHistory(ids.org1, "Prodaja terminal", [ids.worker3], [ids.dep3]);
  const mixedScopeTerminalId = await seedTerminalHistory(ids.org1, "Zajednički terminal", [ids.worker1, ids.worker3, ids.worker1], [ids.dep1, ids.dep3, ids.dep1]);
  const unscopedTerminalId = await seedTerminalHistory(ids.org1, "Nepoznat opseg", [ids.worker1], [null]);
  const crossTenantTerminalId = await seedTerminalHistory(ids.org2, "Tenant B terminal", [ids.worker2], [ids.dep2]);

  const balances = await service.listLeaveBalances(admin.actor, { year: 2026, limit: 50 });
  const worker1Balance = balances.items.find((item) => item.workerId === ids.worker1);
  assert.equal(worker1Balance?.approvedDays, 2);
  assert.equal(worker1Balance?.availableDays, 18);
  const worker3Balance = balances.items.find((item) => item.workerId === ids.worker3);
  assert.equal(worker3Balance?.approvedDays, 0);
  assert.equal(worker3Balance?.availableDays, 20);
  assert.equal(balances.page.total, 2);

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

  const terminalHistoryFilters = { from: "2026-07-01", to: "2026-07-31", limit: 50 };
  const adminOutOfScopeHistory = await service.listTerminalSyncEvents(admin.actor, outOfScopeTerminalId, terminalHistoryFilters);
  assert.deepEqual(adminOutOfScopeHistory.items.map((item) => item.workerId), [ids.worker3]);
  const adminUnscopedHistory = await service.listTerminalSyncEvents(admin.actor, unscopedTerminalId, terminalHistoryFilters);
  assert.deepEqual(adminUnscopedHistory.items.map((item) => item.workerId), [ids.worker1]);
  const managerInScopeHistory = await service.listTerminalSyncEvents(manager.actor, terminalId, terminalHistoryFilters);
  assert.deepEqual(managerInScopeHistory.items.map((item) => item.workerId), [ids.worker1]);
  const managerOutOfScopeHistory = await service.listTerminalSyncEvents(manager.actor, outOfScopeTerminalId, terminalHistoryFilters);
  assert.deepEqual(managerOutOfScopeHistory, { items: [], page: { nextCursor: null, total: 0 } });
  const managerBHistory = await service.listTerminalSyncEvents(managerB.actor, outOfScopeTerminalId, terminalHistoryFilters);
  assert.deepEqual(managerBHistory.items.map((item) => item.workerId), [ids.worker3]);
  const managerMixedHistory = await service.listTerminalSyncEvents(manager.actor, mixedScopeTerminalId, terminalHistoryFilters);
  assert.deepEqual(managerMixedHistory.items.map((item) => item.workerId), [ids.worker1, ids.worker1]);
  assert.equal(managerMixedHistory.page.total, 2);
  const managerMixedFirstPage = await service.listTerminalSyncEvents(manager.actor, mixedScopeTerminalId, { ...terminalHistoryFilters, limit: 1 });
  assert.equal(managerMixedFirstPage.items.length, 1);
  assert.equal(managerMixedFirstPage.page.total, 2);
  assert.ok(managerMixedFirstPage.page.nextCursor);
  const managerMixedSecondPage = await service.listTerminalSyncEvents(manager.actor, mixedScopeTerminalId, {
    ...terminalHistoryFilters, limit: 1, cursor: managerMixedFirstPage.page.nextCursor
  });
  assert.equal(managerMixedSecondPage.items.length, 1);
  assert.equal(managerMixedSecondPage.page.total, 2);
  assert.equal(managerMixedSecondPage.page.nextCursor, null);
  const managerUnscopedHistory = await service.listTerminalSyncEvents(manager.actor, unscopedTerminalId, terminalHistoryFilters);
  assert.deepEqual(managerUnscopedHistory, { items: [], page: { nextCursor: null, total: 0 } });
  const unassignedManagerHistory = await service.listTerminalSyncEvents(unassignedManager.actor, terminalId, terminalHistoryFilters);
  assert.deepEqual(unassignedManagerHistory, { items: [], page: { nextCursor: null, total: 0 } });
  for (const deniedActor of [workerSession.actor, accountant.actor]) {
    await assert.rejects(
      service.listTerminalSyncEvents(deniedActor, terminalId, terminalHistoryFilters),
      (error: unknown) => typeof error === "object" && error !== null && "code" in error && error.code === "FORBIDDEN"
    );
    await assert.rejects(
      service.listTerminals(deniedActor),
      (error: unknown) => typeof error === "object" && error !== null && "code" in error && error.code === "FORBIDDEN"
    );
  }
  for (const tenantActor of [admin.actor, manager.actor, managerB.actor]) {
    await assert.rejects(
      service.listTerminalSyncEvents(tenantActor, crossTenantTerminalId, terminalHistoryFilters),
      (error: unknown) => typeof error === "object" && error !== null && "code" in error && error.code === "NOT_FOUND"
    );
  }
  const managerTerminals = await service.listTerminals(manager.actor);
  assert.deepEqual(
    managerTerminals.map((item) => item.id).sort(),
    [terminalId, outOfScopeTerminalId, mixedScopeTerminalId, unscopedTerminalId].sort()
  );

  const transferWorker = await service.createWorker(admin.actor, {
    code: `MOVE-${suffix}`,
    name: "PremjeĹˇteni Radnik",
    email: `transfer-${suffix}@example.test`,
    departmentId: ids.dep1,
    shiftId: ids.shift1,
    annualLeaveAllowance: 20
  }, "integration-transfer-worker-create");
  const initialAssignment = await owner.query<{ effective_from: string }>(
    "SELECT effective_from FROM worker_department_assignments WHERE worker_id = $1 AND effective_to IS NULL",
    [transferWorker.id]
  );
  const oldDepartmentOccurredAt = new Date(new Date(initialAssignment.rows[0]!.effective_from).getTime() + 1).toISOString();
  const transferCardUid = "04:F1:E2:D3";
  await service.assignWorkerRfidCard(
    admin.actor,
    transferWorker.id,
    { uid: transferCardUid, validFrom: oldDepartmentOccurredAt },
    "integration-transfer-rfid"
  );
  const movedWorker = await service.updateWorker(admin.actor, transferWorker.id, {
    code: transferWorker.code,
    name: transferWorker.name,
    email: transferWorker.email,
    departmentId: ids.dep3,
    shiftId: transferWorker.shiftId,
    annualLeaveAllowance: transferWorker.annualLeaveAllowance
  }, transferWorker.revision, "integration-transfer-worker-move");
  assert.equal(movedWorker.departmentId, ids.dep3);
  const assignmentHistory = await owner.query<{ department_id: string; effective_from: string; effective_to: string | null }>(
    `SELECT department_id, effective_from, effective_to FROM worker_department_assignments
     WHERE worker_id = $1 ORDER BY effective_from`,
    [transferWorker.id]
  );
  assert.deepEqual(assignmentHistory.rows.map((row) => row.department_id), [ids.dep1, ids.dep3]);
  assert.ok(assignmentHistory.rows[0]?.effective_to);
  assert.equal(assignmentHistory.rows[1]?.effective_to, null);
  const newDepartmentOccurredAt = new Date(new Date(assignmentHistory.rows[1]!.effective_from).getTime() + 1).toISOString();

  const paired = await service.pairTerminal(
    admin.actor,
    { activationCode: terminalActivationCode, name: "RFID ulaz 01", location: "Operativa A" },
    "integration-terminal-pair"
  );
  assert.equal(paired.terminal.status, "offline");
  assert.ok(paired.deviceCredential.length >= 32);
  let activeDeviceCredential = paired.deviceCredential;
  let activeAcknowledgementKey = paired.acknowledgementKey;
  const legacyEvent = await owner.query<{ id: string }>(
    `INSERT INTO attendance_events (
       organization_id, terminal_id, device_event_id, sequence, occurred_at, event_type,
       card_uid_hash, processing_status, rejection_code
     ) VALUES ($1, $2, $3, 999, '2025-12-31T08:00:00Z', 'check_in', decode($4, 'hex'),
       'reconciliation_required', 'LEGACY_EVIDENCE_UNAVAILABLE') RETURNING id`,
    [ids.org1, paired.terminal.id, randomUUID(), "0".repeat(64)]
  );
  const legacyProof = await owner.query<{
    acknowledgement_proof_status: string;
    acknowledged_at: string | null;
    acknowledgement_key_id: string | null;
    decision: string;
  }>(
    `SELECT acknowledgement_proof_status, acknowledged_at, acknowledgement_key_id,
       lifecycle_evidence->>'decision' AS decision
     FROM attendance_events WHERE id = $1`,
    [legacyEvent.rows[0]!.id]
  );
  assert.deepEqual(legacyProof.rows[0], {
    acknowledgement_proof_status: "unknown",
    acknowledged_at: null,
    acknowledgement_key_id: null,
    decision: "reconciliation_required"
  });
  await assert.rejects(
    service.resolveTerminalEventReconciliation(
      admin.actor,
      legacyEvent.rows[0]!.id,
      { resolution: "accepted", reason: "Legacy proof must not be fabricated" },
      "integration-legacy-reconciliation"
    ),
    (error: unknown) => typeof error === "object" && error !== null && "code" in error && error.code === "CONFLICT"
  );

  const cardUidHash = hashRfidUid("04:A1:B2:C3", rfidPepper).toString("hex");
  const ingest = async (
    eventType: "check_in" | "check_out",
    deviceEventId: string,
    occurredAt: string,
    sequence: number,
    nonce: string,
    eventCardUidHash = cardUidHash,
    acknowledgement?: {
      acknowledgedAt?: string;
      signature?: string;
      keyId?: string;
      keyVersion?: number;
      clockStatus?: "trusted" | "uncertain";
      receiptCredential?: string;
    }
  ) => {
    const acknowledgedAt = acknowledgement?.acknowledgedAt
      ?? new Date(Date.parse(occurredAt) + 1000).toISOString();
    const unsignedEvent = {
      acknowledgementKeyId: acknowledgement?.keyId ?? activeAcknowledgementKey.id,
      acknowledgementKeyVersion: acknowledgement?.keyVersion ?? activeAcknowledgementKey.version,
      deviceEventId,
      sequence,
      occurredAt,
      eventType,
      cardUidHash: eventCardUidHash,
      deviceClockOffsetSeconds: 0,
      clockStatus: acknowledgement?.clockStatus ?? "trusted" as const,
      acknowledgedAt
    };
    const body = {
      batchId: randomUUID(),
      sentAt: new Date(Math.max(Date.now(), Date.parse(acknowledgedAt))).toISOString(),
      events: [{
        ...unsignedEvent,
        acknowledgementSignature: acknowledgement?.signature
          ?? signTerminalAcknowledgement(acknowledgement?.receiptCredential ?? activeDeviceCredential, paired.terminal.id, unsignedEvent)
      }]
    };
    const rawBody = Buffer.from(JSON.stringify(body), "utf8");
    const timestamp = new Date().toISOString();
    const path = "/api/v1/terminal/v1/events/batch";
    return service.ingestTerminalEventBatch({
      terminalId: paired.terminal.id,
      timestamp,
      nonce,
      signature: signDeviceRequest(activeDeviceCredential, { method: "POST", path, body: rawBody, timestamp, nonce }),
      method: "POST",
      path,
      rawBody
    }, body, `integration-terminal-${sequence}`);
  };

  await owner.query(
    "UPDATE terminal_credentials SET valid_from = clock_timestamp() + interval '1 hour' WHERE terminal_id = $1",
    [paired.terminal.id]
  );
  await assert.rejects(
    ingest("check_in", randomUUID(), "2026-07-17T05:59:00.000Z", 1, "integration-nonce-future-credential-0000"),
    (error: unknown) => typeof error === "object" && error !== null && "code" in error && error.code === "UNAUTHENTICATED"
  );
  await owner.query(
    "UPDATE terminal_credentials SET valid_from = '2025-01-01T00:00:00Z' WHERE terminal_id = $1",
    [paired.terminal.id]
  );

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

  const day = await service.getWorkerAttendance(workerSession.actor, ids.worker1, { from: "2026-07-17", to: "2026-07-17", limit: 50 });
  assert.equal(day.items.length, 1);
  assert.equal(day.items[0]?.workedMinutes, 450);
  assert.equal(day.items[0]?.status, "complete");
  await assert.rejects(
    service.getWorkerAttendance(workerSession.actor, createdWorker.id, { from: "2026-07-17", to: "2026-07-17", limit: 50 }),
    (error: unknown) => typeof error === "object" && error !== null && "code" in error && error.code === "FORBIDDEN"
  );

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

  // Keep the valid sequence deterministic and safely in the past. The explicit
  // future-event assertion below owns the clock-skew boundary; using tomorrow's
  // date here made this otherwise valid scenario depend on the CI start time.
  const continuationDate = "2026-07-10";
  const nextCheckIn = await ingest("check_in", randomUUID(), `${continuationDate}T06:00:00.000Z`, 3, "integration-nonce-next-check-in-0006");
  assert.equal(nextCheckIn.results[0]?.status, "synced");
  const invalidCheckOut = await ingest("check_out", randomUUID(), `${continuationDate}T05:59:00.000Z`, 4, "integration-nonce-invalid-check-out-0007");
  assert.equal(invalidCheckOut.results[0]?.status, "rejected");
  assert.equal(invalidCheckOut.results[0]?.code, "CHECK_OUT_BEFORE_CHECK_IN");
  const nextCheckOut = await ingest("check_out", randomUUID(), `${continuationDate}T14:00:00.000Z`, 5, "integration-nonce-next-check-out-0008");
  assert.equal(nextCheckOut.results[0]?.status, "synced");
  const futureEvent = await ingest(
    "check_in",
    randomUUID(),
    new Date(Date.now() + 10 * 60_000).toISOString(),
    6,
    "integration-nonce-future-event-0009"
  );
  assert.equal(futureEvent.results[0]?.status, "reconciliation_required");
  assert.equal(futureEvent.results[0]?.code, "ACKNOWLEDGEMENT_CLOCK_AMBIGUOUS");

  const delayedCheckOut = await ingest("check_out", randomUUID(), "2026-07-12T14:00:00.000Z", 7, "integration-nonce-delayed-check-out-0010");
  assert.equal(delayedCheckOut.results[0]?.status, "synced");
  const delayedCheckIn = await ingest("check_in", randomUUID(), "2026-07-12T06:00:00.000Z", 8, "integration-nonce-delayed-check-in-0011");
  assert.equal(delayedCheckIn.results[0]?.status, "synced");
  const reconciledDay = await service.getWorkerAttendance(workerSession.actor, ids.worker1, { from: "2026-07-12", to: "2026-07-12", limit: 50 });
  assert.equal(reconciledDay.items[0]?.status, "complete");
  assert.equal(reconciledDay.items[0]?.workedMinutes, 450);

  const unmatchedCheckOut = await ingest("check_out", randomUUID(), "2026-07-11T14:00:00.000Z", 9, "integration-nonce-unmatched-check-out-0012");
  assert.equal(unmatchedCheckOut.results[0]?.status, "synced");
  const lateCheckIn = await ingest("check_in", randomUUID(), "2026-07-11T15:00:00.000Z", 10, "integration-nonce-late-check-in-0013");
  assert.equal(lateCheckIn.results[0]?.status, "rejected");
  assert.equal(lateCheckIn.results[0]?.code, "CHECK_IN_AFTER_CHECK_OUT");

  const transferCardUidHash = hashRfidUid(transferCardUid, rfidPepper).toString("hex");
  const oldDepartmentEventId = randomUUID();
  const oldDepartmentEvent = await ingest(
    "check_in", oldDepartmentEventId, oldDepartmentOccurredAt, 11,
    "integration-nonce-transfer-old-0014", transferCardUidHash
  );
  assert.equal(oldDepartmentEvent.results[0]?.status, "synced");
  const newDepartmentEventId = randomUUID();
  const newDepartmentEvent = await ingest(
    "check_out", newDepartmentEventId, newDepartmentOccurredAt, 12,
    "integration-nonce-transfer-new-0015", transferCardUidHash
  );
  assert.equal(newDepartmentEvent.results[0]?.status, "synced");
  const transferSnapshots = await owner.query<{ device_event_id: string; effective_department_id: string | null }>(
    `SELECT device_event_id, effective_department_id FROM attendance_events
     WHERE terminal_id = $1 AND device_event_id = ANY($2::uuid[]) ORDER BY occurred_at`,
    [paired.terminal.id, [oldDepartmentEventId, newDepartmentEventId]]
  );
  assert.deepEqual(transferSnapshots.rows, [
    { device_event_id: oldDepartmentEventId, effective_department_id: ids.dep1 },
    { device_event_id: newDepartmentEventId, effective_department_id: ids.dep3 }
  ]);
  const receivedDate = new Date().toISOString().slice(0, 10);
  const transferHistoryFilters = { from: receivedDate, to: receivedDate, limit: 50 };
  const adminTransferHistory = await service.listTerminalSyncEvents(admin.actor, paired.terminal.id, transferHistoryFilters);
  assert.ok(adminTransferHistory.items.some((item) => item.deviceEventId === oldDepartmentEventId));
  assert.ok(adminTransferHistory.items.some((item) => item.deviceEventId === newDepartmentEventId));
  const assertTerminalHistoryScope = async (
    items: typeof adminTransferHistory.items,
    expectedDepartmentId: string
  ) => {
    const rows = await owner.query<{
      id: string;
      terminal_id: string;
      device_event_id: string;
      received_at: string | Date;
      effective_department_id: string | null;
    }>(
      `SELECT id, terminal_id, device_event_id, received_at, effective_department_id
       FROM terminal_sync_events WHERE id = ANY($1::uuid[]) ORDER BY id`,
      [items.map((item) => item.id)]
    );
    assert.deepEqual(rows.rows.map((row) => row.id).sort(), items.map((item) => item.id).sort());
    for (const row of rows.rows) {
      const item = items.find((candidate) => candidate.id === row.id);
      assert.ok(item);
      assert.equal(row.terminal_id, paired.terminal.id);
      assert.equal(row.device_event_id, item.deviceEventId);
      assert.equal(new Date(row.received_at).toISOString().slice(0, 10), receivedDate);
      assert.equal(row.effective_department_id, expectedDepartmentId);
    }
  };
  const managerATransferHistory = await service.listTerminalSyncEvents(manager.actor, paired.terminal.id, transferHistoryFilters);
  assert.ok(managerATransferHistory.items.some((item) => item.deviceEventId === oldDepartmentEventId));
  assert.ok(!managerATransferHistory.items.some((item) => item.deviceEventId === newDepartmentEventId));
  await assertTerminalHistoryScope(managerATransferHistory.items, ids.dep1);
  assert.equal(managerATransferHistory.page.total, managerATransferHistory.items.length);
  const managerBTransferHistory = await service.listTerminalSyncEvents(managerB.actor, paired.terminal.id, transferHistoryFilters);
  assert.ok(managerBTransferHistory.items.some((item) => item.deviceEventId === newDepartmentEventId));
  assert.ok(!managerBTransferHistory.items.some((item) => item.deviceEventId === oldDepartmentEventId));
  await assertTerminalHistoryScope(managerBTransferHistory.items, ids.dep3);
  assert.equal(managerBTransferHistory.page.total, managerBTransferHistory.items.length);
  const unassignedTransferHistory = await service.listTerminalSyncEvents(unassignedManager.actor, paired.terminal.id, transferHistoryFilters);
  assert.deepEqual(unassignedTransferHistory, { items: [], page: { nextCursor: null, total: 0 } });

  const originalShift = (await service.listShifts(admin.actor)).find((item) => item.id === ids.shift1)!;
  await service.updateShift(admin.actor, ids.shift1, {
    name: "Jutarnja nova pravila",
    startTime: "10:00",
    endTime: "18:00",
    breakMinutes: 60,
    toleranceMinutes: 15
  }, originalShift.revision, "integration-historical-shift-version");
  const workerBeforeShiftMove = await service.getWorker(admin.actor, ids.worker1);
  await service.updateWorker(admin.actor, ids.worker1, {
    code: workerBeforeShiftMove.code,
    name: workerBeforeShiftMove.name,
    email: workerBeforeShiftMove.email,
    departmentId: workerBeforeShiftMove.departmentId,
    shiftId: updatedShift.id,
    annualLeaveAllowance: workerBeforeShiftMove.annualLeaveAllowance
  }, workerBeforeShiftMove.revision, "integration-historical-shift-assignment");
  const organizationBeforeTimezoneChange = await service.getOrganization(admin.actor);
  await service.updateOrganization(
    admin.actor,
    { timezone: "Europe/London" },
    organizationBeforeTimezoneChange.revision,
    "integration-historical-timezone-version"
  );

  const delayedHistoricalCheckInId = randomUUID();
  const delayedHistoricalCheckOutId = randomUUID();
  assert.equal((await ingest("check_in", delayedHistoricalCheckInId, "2026-06-20T22:30:00.000Z", 13, "integration-nonce-historical-in-0016")).results[0]?.status, "synced");
  assert.equal((await ingest("check_out", delayedHistoricalCheckOutId, "2026-06-21T05:30:00.000Z", 14, "integration-nonce-historical-out-0017")).results[0]?.status, "synced");
  const delayedHistorical = await service.getWorkerAttendance(workerSession.actor, ids.worker1, { from: "2026-06-21", to: "2026-06-21", limit: 50 });
  const delayedHistoricalDay = delayedHistorical.items[0]!;
  assert.equal(delayedHistoricalDay.workDate, "2026-06-21");
  assert.equal(delayedHistoricalDay.shift.id, ids.shift1);
  assert.equal(delayedHistoricalDay.shift.startTime, "08:00");
  assert.equal(delayedHistoricalDay.breakMinutes, 30);
  assert.equal(delayedHistoricalDay.workedMinutes, 390);
  assert.equal(delayedHistoricalDay.plannedMinutes, 450);
  assert.equal(delayedHistoricalDay.provenance.status, "complete");
  assert.equal(delayedHistoricalDay.provenance.calculationVersion, "attendance-v1");
  assert.equal(delayedHistoricalDay.provenance.timezone, "Europe/Zagreb");
  assert.equal(delayedHistoricalDay.provenance.sourceEventIds.length, 2);
  const historicalVersions = await owner.query<{
    timezone_version_id: string;
    shift_version_id: string;
    shift_assignment_id: string;
  }>(
    `SELECT otv.id AS timezone_version_id, scv.id AS shift_version_id, wsa.id AS shift_assignment_id
     FROM organization_timezone_versions otv
     JOIN worker_shift_assignments wsa ON wsa.organization_id = otv.organization_id
     JOIN shift_configuration_versions scv ON scv.shift_id = wsa.shift_id
     WHERE otv.organization_id = $1 AND wsa.worker_id = $2
       AND otv.effective_from <= $3 AND otv.effective_to > $3
       AND wsa.effective_from <= $3 AND wsa.effective_to > $3
       AND scv.effective_from <= $3 AND scv.effective_to > $3`,
    [ids.org1, ids.worker1, "2026-06-20T22:30:00.000Z"]
  );
  assert.equal(delayedHistoricalDay.provenance.timezoneVersionId, historicalVersions.rows[0]?.timezone_version_id);
  assert.equal(delayedHistoricalDay.provenance.shiftVersionId, historicalVersions.rows[0]?.shift_version_id);
  assert.equal(delayedHistoricalDay.provenance.shiftAssignmentId, historicalVersions.rows[0]?.shift_assignment_id);
  const linkedRawEvents = await owner.query<{
    device_event_id: string; attendance_day_id: string | null; timezone_version_id: string | null;
    timezone_name: string | null; resolved_local_at: string | null; resolved_utc_offset_seconds: number | null;
  }>(
    `SELECT device_event_id, attendance_day_id, timezone_version_id, timezone_name,
       to_char(resolved_local_at, 'YYYY-MM-DD"T"HH24:MI:SS.MS') AS resolved_local_at,
       resolved_utc_offset_seconds FROM attendance_events
     WHERE device_event_id = ANY($1::uuid[]) ORDER BY occurred_at`,
    [[delayedHistoricalCheckInId, delayedHistoricalCheckOutId]]
  );
  assert.deepEqual(linkedRawEvents.rows, [
    { device_event_id: delayedHistoricalCheckInId, attendance_day_id: delayedHistoricalDay.id, timezone_version_id: historicalVersions.rows[0]?.timezone_version_id, timezone_name: "Europe/Zagreb", resolved_local_at: "2026-06-21T00:30:00.000", resolved_utc_offset_seconds: 7200 },
    { device_event_id: delayedHistoricalCheckOutId, attendance_day_id: delayedHistoricalDay.id, timezone_version_id: historicalVersions.rows[0]?.timezone_version_id, timezone_name: "Europe/Zagreb", resolved_local_at: "2026-06-21T07:30:00.000", resolved_utc_offset_seconds: 7200 }
  ]);
  assert.deepEqual(delayedHistoricalDay.provenance.eventTimeInterpretations.map((item) => ({
    eventType: item.eventType, localTimestamp: item.localTimestamp, utcOffsetSeconds: item.utcOffsetSeconds
  })), [
    { eventType: "check_in", localTimestamp: "2026-06-21T00:30:00.000", utcOffsetSeconds: 7200 },
    { eventType: "check_out", localTimestamp: "2026-06-21T07:30:00.000", utcOffsetSeconds: 7200 }
  ]);

  const dstGapCheckInId = randomUUID();
  const dstGapCheckOutId = randomUUID();
  await ingest("check_in", dstGapCheckInId, "2026-03-29T00:30:00.000Z", 15, "integration-nonce-dst-gap-in-0018");
  await ingest("check_out", dstGapCheckOutId, "2026-03-29T02:30:00.000Z", 16, "integration-nonce-dst-gap-out-0019");
  const dstGapDay = await service.getWorkerAttendance(workerSession.actor, ids.worker1, { from: "2026-03-29", to: "2026-03-29", limit: 50 });
  assert.equal(dstGapDay.items[0]?.workedMinutes, 90);
  assert.equal(dstGapDay.items[0]?.provenance.timezone, "Europe/Zagreb");
  assert.deepEqual(dstGapDay.items[0]?.provenance.eventTimeInterpretations.map((item) => [item.utcInstant, item.localTimestamp, item.utcOffsetSeconds]), [
    ["2026-03-29T00:30:00.000Z", "2026-03-29T01:30:00.000", 3600],
    ["2026-03-29T02:30:00.000Z", "2026-03-29T04:30:00.000", 7200]
  ]);

  const dstFoldCheckInId = randomUUID();
  const dstFoldCheckOutId = randomUUID();
  await ingest("check_in", dstFoldCheckInId, "2025-10-26T00:30:00.000Z", 17, "integration-nonce-dst-fold-in-0020");
  await ingest("check_out", dstFoldCheckOutId, "2025-10-26T01:30:00.000Z", 18, "integration-nonce-dst-fold-out-0021");
  const dstFoldDay = await service.getWorkerAttendance(workerSession.actor, ids.worker1, { from: "2025-10-26", to: "2025-10-26", limit: 50 });
  assert.equal(dstFoldDay.items[0]?.workedMinutes, 30);
  assert.equal(dstFoldDay.items[0]?.provenance.timezone, "Europe/Zagreb");
  assert.deepEqual(dstFoldDay.items[0]?.provenance.eventTimeInterpretations.map((item) => [item.utcInstant, item.localTimestamp, item.utcOffsetSeconds]), [
    ["2025-10-26T00:30:00.000Z", "2025-10-26T02:30:00.000", 7200],
    ["2025-10-26T01:30:00.000Z", "2025-10-26T02:30:00.000", 3600]
  ]);

  const overnightShift = await service.createShift(admin.actor, {
    name: `Noćna povijesna ${suffix}`,
    startTime: "22:00",
    endTime: "06:00",
    breakMinutes: 30,
    toleranceMinutes: 5
  }, "integration-overnight-shift");
  const overnightWorker = await service.createWorker(admin.actor, {
    code: `NIGHT-${suffix}`,
    name: "Noćni Radnik",
    email: `night-${suffix}@example.test`,
    departmentId: ids.dep1,
    shiftId: overnightShift.id,
    annualLeaveAllowance: 20
  }, "integration-overnight-worker");
  await owner.query("UPDATE shift_configuration_versions SET effective_from = '2020-01-01T00:00:00Z' WHERE shift_id = $1", [overnightShift.id]);
  await owner.query("UPDATE worker_shift_assignments SET effective_from = '2020-01-01T00:00:00Z' WHERE worker_id = $1", [overnightWorker.id]);
  await owner.query("UPDATE worker_department_assignments SET effective_from = '2020-01-01T00:00:00Z' WHERE worker_id = $1", [overnightWorker.id]);
  await owner.query("UPDATE worker_status_versions SET effective_from = '2020-01-01T00:00:00Z' WHERE worker_id = $1", [overnightWorker.id]);
  const overnightCardUid = "04:99:88:77";
  await service.assignWorkerRfidCard(admin.actor, overnightWorker.id, { uid: overnightCardUid, validFrom: "2025-01-01T00:00:00.000Z" }, "integration-overnight-card");
  const overnightHash = hashRfidUid(overnightCardUid, rfidPepper).toString("hex");
  await ingest("check_in", randomUUID(), "2026-01-10T21:30:00.000Z", 19, "integration-nonce-overnight-in-0022", overnightHash);
  await ingest("check_out", randomUUID(), "2026-01-11T04:30:00.000Z", 20, "integration-nonce-overnight-out-0023", overnightHash);
  const overnightDay = await service.getWorkerAttendance(admin.actor, overnightWorker.id, { from: "2026-01-10", to: "2026-01-10", limit: 50 });
  assert.equal(overnightDay.items[0]?.workDate, "2026-01-10");
  assert.equal(overnightDay.items[0]?.workedMinutes, 390);

  const lifecycleWorker = await service.createWorker(admin.actor, {
    code: `LIFE-${suffix}`,
    name: "Lifecycle Radnik",
    email: `lifecycle-${suffix}@example.test`,
    departmentId: ids.dep1,
    shiftId: updatedShift.id,
    annualLeaveAllowance: 20
  }, "integration-lifecycle-worker");
  const lifecycleUid = "04:10:20:30";
  await service.assignWorkerRfidCard(
    admin.actor, lifecycleWorker.id, { uid: lifecycleUid }, "integration-lifecycle-card"
  );
  const lifecycleHash = hashRfidUid(lifecycleUid, rfidPepper).toString("hex");
  const preDeactivateEventId = randomUUID();
  const preDeactivateAt = new Date().toISOString();
  const deactivated = await service.deactivateWorker(
    admin.actor, lifecycleWorker.id, lifecycleWorker.revision, "integration-lifecycle-deactivate"
  );
  const preDeactivate = await ingest(
    "check_in", preDeactivateEventId, preDeactivateAt, 21,
    "integration-nonce-lifecycle-pre-deactivate-0024", lifecycleHash,
    { acknowledgedAt: preDeactivateAt }
  );
  assert.equal(preDeactivate.results[0]?.status, "synced");
  const blockedStatus = await owner.query<{ effective_from: string }>(
    `SELECT effective_from FROM worker_status_versions
     WHERE worker_id = $1 AND status = 'blocked' AND effective_to IS NULL`,
    [lifecycleWorker.id]
  );
  const blockedAt = new Date(blockedStatus.rows[0]!.effective_from).toISOString();
  const blockedEvent = await ingest(
    "check_out", randomUUID(), blockedAt, 22,
    "integration-nonce-lifecycle-blocked-0025", lifecycleHash,
    { acknowledgedAt: blockedAt }
  );
  assert.equal(blockedEvent.results[0]?.status, "rejected");
  assert.equal(blockedEvent.results[0]?.code, "WORKER_INACTIVE_AT_ACKNOWLEDGEMENT");
  const reactivated = await service.activateWorker(
    admin.actor, lifecycleWorker.id, deactivated.revision, "integration-lifecycle-reactivate"
  );
  const activeStatus = await owner.query<{ effective_from: string }>(
    `SELECT effective_from FROM worker_status_versions
     WHERE worker_id = $1 AND status = 'active' AND effective_to IS NULL`,
    [lifecycleWorker.id]
  );
  const reactivatedAt = new Date(activeStatus.rows[0]!.effective_from).toISOString();
  const postReactivationAt = new Date(Date.parse(reactivatedAt) + 1000).toISOString();
  const reactivatedEvent = await ingest(
    "check_out", randomUUID(), postReactivationAt, 23,
    "integration-nonce-lifecycle-reactivated-0026", lifecycleHash,
    { acknowledgedAt: postReactivationAt }
  );
  assert.equal(reactivatedEvent.results[0]?.status, "synced");
  assert.equal(reactivated.status, "active");

  const cardRaceWorker = await service.createWorker(admin.actor, {
    code: `CARD-${suffix}`,
    name: "Kartica Race Radnik",
    email: `card-race-${suffix}@example.test`,
    departmentId: ids.dep1,
    shiftId: updatedShift.id,
    annualLeaveAllowance: 20
  }, "integration-card-race-worker");
  const oldCardUid = "04:40:50:60";
  const oldCard = await service.assignWorkerRfidCard(admin.actor, cardRaceWorker.id, { uid: oldCardUid }, "integration-card-race-old");
  const oldCardHash = hashRfidUid(oldCardUid, rfidPepper).toString("hex");
  const preRevokeCardEventId = randomUUID();
  const lifecycleBlockedCard = await service.blockRfidCard(admin.actor, oldCard.id, "integration-card-race-revoke");
  assert.equal((await ingest(
    "check_in", preRevokeCardEventId, oldCard.validFrom, 24,
    "integration-nonce-card-pre-revoke-0027", oldCardHash,
    { acknowledgedAt: oldCard.validFrom }
  )).results[0]?.status, "synced");
  const revokedAt = lifecycleBlockedCard.validTo!;
  const postRevokeCard = await ingest(
    "check_out", randomUUID(), revokedAt, 25,
    "integration-nonce-card-post-revoke-0028", oldCardHash,
    { acknowledgedAt: revokedAt }
  );
  assert.equal(postRevokeCard.results[0]?.status, "rejected");
  assert.equal(postRevokeCard.results[0]?.code, "CARD_INACTIVE_AT_ACKNOWLEDGEMENT");
  const replacementUid = "04:40:50:61";
  const replacement = await service.assignWorkerRfidCard(admin.actor, cardRaceWorker.id, { uid: replacementUid }, "integration-card-race-replace");
  const replacementHash = hashRfidUid(replacementUid, rfidPepper).toString("hex");
  const replacementEventAt = new Date(Date.parse(replacement.validFrom) + 1000).toISOString();
  assert.equal((await ingest(
    "check_out", randomUUID(), replacementEventAt, 26,
    "integration-nonce-card-replacement-0029", replacementHash,
    { acknowledgedAt: replacementEventAt }
  )).results[0]?.status, "synced");

  const shiftRaceWorker = await service.createWorker(admin.actor, {
    code: `SHIFT-${suffix}`,
    name: "Smjena Race Radnik",
    email: `shift-race-${suffix}@example.test`,
    departmentId: ids.dep1,
    shiftId: ids.shift1,
    annualLeaveAllowance: 20
  }, "integration-shift-race-worker");
  const shiftRaceUid = "04:70:80:90";
  const shiftRaceCard = await service.assignWorkerRfidCard(admin.actor, shiftRaceWorker.id, { uid: shiftRaceUid }, "integration-shift-race-card");
  const shiftRaceHash = hashRfidUid(shiftRaceUid, rfidPepper).toString("hex");
  const shiftedWorker = await service.updateWorker(admin.actor, shiftRaceWorker.id, {
    code: shiftRaceWorker.code,
    name: shiftRaceWorker.name,
    email: shiftRaceWorker.email,
    departmentId: shiftRaceWorker.departmentId,
    shiftId: updatedShift.id,
    annualLeaveAllowance: shiftRaceWorker.annualLeaveAllowance
  }, shiftRaceWorker.revision, "integration-shift-race-reassign");
  const oldShiftEventId = randomUUID();
  assert.equal((await ingest(
    "check_in", oldShiftEventId, shiftRaceCard.validFrom, 27,
    "integration-nonce-shift-old-0030", shiftRaceHash,
    { acknowledgedAt: shiftRaceCard.validFrom }
  )).results[0]?.status, "synced");
  const currentShiftAssignment = await owner.query<{ effective_from: string }>(
    "SELECT effective_from FROM worker_shift_assignments WHERE worker_id = $1 AND effective_to IS NULL",
    [shiftRaceWorker.id]
  );
  const newShiftAt = new Date(currentShiftAssignment.rows[0]!.effective_from).toISOString();
  const newShiftEventAt = new Date(Date.parse(newShiftAt) + 1000).toISOString();
  const newShiftEventId = randomUUID();
  assert.equal((await ingest(
    "check_out", newShiftEventId, newShiftEventAt, 28,
    "integration-nonce-shift-new-0031", shiftRaceHash,
    { acknowledgedAt: newShiftEventAt }
  )).results[0]?.status, "synced");
  assert.equal(shiftedWorker.shiftId, updatedShift.id);
  const shiftEvidence = await owner.query<{ device_event_id: string; shift_assignment_id: string }>(
    `SELECT device_event_id, lifecycle_evidence->>'shiftAssignmentId' AS shift_assignment_id
     FROM attendance_events WHERE device_event_id = ANY($1::uuid[]) ORDER BY occurred_at`,
    [[oldShiftEventId, newShiftEventId]]
  );
  assert.equal(new Set(shiftEvidence.rows.map((row) => row.shift_assignment_id)).size, 2);

  const retryWorker = await service.createWorker(admin.actor, {
    code: `RETRY-${suffix}`,
    name: "Retry Radnik",
    email: `retry-${suffix}@example.test`,
    departmentId: ids.dep1,
    shiftId: updatedShift.id,
    annualLeaveAllowance: 20
  }, "integration-retry-worker");
  const retryUid = "04:A0:B0:C0";
  const retryCard = await service.assignWorkerRfidCard(admin.actor, retryWorker.id, { uid: retryUid }, "integration-retry-card");
  const retryHash = hashRfidUid(retryUid, rfidPepper).toString("hex");
  const retryEventId = randomUUID();
  const retries = await Promise.all([
    ingest("check_in", retryEventId, retryCard.validFrom, 29, "integration-nonce-retry-a-0032", retryHash, { acknowledgedAt: retryCard.validFrom }),
    ingest("check_in", retryEventId, retryCard.validFrom, 29, "integration-nonce-retry-b-0033", retryHash, { acknowledgedAt: retryCard.validFrom })
  ]);
  assert.deepEqual(retries.map((item) => item.results[0]?.status).sort(), ["duplicate", "synced"]);
  const retryRawCount = await owner.query<{ count: string }>(
    "SELECT COUNT(*)::text AS count FROM attendance_events WHERE terminal_id = $1 AND device_event_id = $2",
    [paired.terminal.id, retryEventId]
  );
  assert.equal(retryRawCount.rows[0]?.count, "1");
  const identityMismatchAt = new Date(Date.parse(retryCard.validFrom) + 1000).toISOString();
  const identityMismatch = await ingest(
    "check_in", retryEventId, identityMismatchAt, 29,
    "integration-nonce-retry-mismatch-0034", retryHash,
    { acknowledgedAt: identityMismatchAt }
  );
  assert.equal(identityMismatch.results[0]?.status, "rejected");
  assert.equal(identityMismatch.results[0]?.code, "EVENT_IDENTITY_MISMATCH");
  const identityMismatchEvidence = await owner.query<{ acknowledgement_verified: boolean }>(
    `SELECT acknowledgement_verified FROM terminal_sync_events
     WHERE terminal_id = $1 AND device_event_id = $2 AND rejection_code = 'EVENT_IDENTITY_MISMATCH'`,
    [paired.terminal.id, retryEventId]
  );
  assert.equal(identityMismatchEvidence.rows[0]?.acknowledgement_verified, false);

  const forgedEvent = await ingest(
    "check_in", randomUUID(), retryCard.validFrom, 30,
    "integration-nonce-forged-ack-0035", retryHash,
    { acknowledgedAt: retryCard.validFrom, signature: "0".repeat(64) }
  );
  assert.equal(forgedEvent.results[0]?.status, "rejected");
  assert.equal(forgedEvent.results[0]?.code, "INVALID_ACKNOWLEDGEMENT");

  const crossTenantUid = "04:D0:E0:F0";
  const crossTenantHash = hashRfidUid(crossTenantUid, rfidPepper).toString("hex");
  await owner.query(
    `INSERT INTO rfid_cards (organization_id, worker_id, uid_hash, masked_uid, valid_from)
     VALUES ($1, $2, decode($3, 'hex'), '****E0F0', clock_timestamp() - interval '1 minute')`,
    [ids.org2, ids.worker2, crossTenantHash]
  );
  const crossTenantEvent = await ingest(
    "check_in", randomUUID(), new Date().toISOString(), 31,
    "integration-nonce-cross-tenant-0036", crossTenantHash
  );
  assert.equal(crossTenantEvent.results[0]?.status, "rejected");
  assert.equal(crossTenantEvent.results[0]?.code, "CARD_NOT_ASSIGNED");

  const reconciliationWorker = await service.createWorker(admin.actor, {
    code: `RECON-${suffix}`,
    name: "Reconciliation Radnik",
    email: `reconciliation-${suffix}@example.test`,
    departmentId: ids.dep1,
    shiftId: updatedShift.id,
    annualLeaveAllowance: 20
  }, "integration-reconciliation-worker");
  const reconciliationUid = "04:11:22:33";
  const reconciliationCard = await service.assignWorkerRfidCard(
    admin.actor, reconciliationWorker.id, { uid: reconciliationUid }, "integration-reconciliation-card"
  );
  await owner.query("DELETE FROM worker_status_versions WHERE worker_id = $1", [reconciliationWorker.id]);
  const reconciliationHash = hashRfidUid(reconciliationUid, rfidPepper).toString("hex");
  const reconciliationEventId = randomUUID();
  const reconciliation = await ingest(
    "check_in", reconciliationEventId, reconciliationCard.validFrom, 32,
    "integration-nonce-reconciliation-0037", reconciliationHash,
    { acknowledgedAt: reconciliationCard.validFrom }
  );
  assert.equal(reconciliation.results[0]?.status, "reconciliation_required");
  assert.equal(reconciliation.results[0]?.code, "WORKER_STATUS_HISTORY_UNAVAILABLE");
  const reconciliationEvidence = await owner.query<{
    processing_status: string;
    acknowledged_at: string | null;
    acknowledgement_signature: Buffer | null;
    decision: string;
    audit_count: string;
  }>(
    `SELECT e.processing_status, e.acknowledged_at, e.acknowledgement_signature,
       e.lifecycle_evidence->>'decision' AS decision,
       (SELECT COUNT(*)::text FROM audit_events a
        WHERE a.entity_id = e.device_event_id::text
          AND a.action = 'terminal_event.reconciliation_required') AS audit_count
     FROM attendance_events e WHERE e.device_event_id = $1`,
    [reconciliationEventId]
  );
  assert.equal(reconciliationEvidence.rows[0]?.processing_status, "reconciliation_required");
  assert.ok(reconciliationEvidence.rows[0]?.acknowledged_at);
  assert.equal(reconciliationEvidence.rows[0]?.acknowledgement_signature?.length, 32);
  assert.equal(reconciliationEvidence.rows[0]?.decision, "reconciliation_required");
  assert.equal(reconciliationEvidence.rows[0]?.audit_count, "1");
  await assert.rejects(
    service.resolveTerminalEventReconciliation(
      manager.actor,
      (await owner.query<{ id: string }>("SELECT id FROM attendance_events WHERE device_event_id = $1", [reconciliationEventId])).rows[0]!.id,
      { resolution: "accepted", reason: "Nedopušten pokušaj voditelja" },
      "integration-manager-reconciliation"
    ),
    (error: unknown) => typeof error === "object" && error !== null && "code" in error && error.code === "FORBIDDEN"
  );
  const reconciliationRawId = (await owner.query<{ id: string }>(
    "SELECT id FROM attendance_events WHERE device_event_id = $1", [reconciliationEventId]
  )).rows[0]!.id;
  const acceptedReconciliation = await service.resolveTerminalEventReconciliation(
    admin.actor,
    reconciliationRawId,
    { resolution: "accepted", reason: "Administrator verified the missing worker-status boundary evidence" },
    "integration-admin-reconciliation"
  );
  assert.equal(acceptedReconciliation.resolution, "accepted");
  assert.ok(acceptedReconciliation.attendanceDayId);
  const reconciledRaw = await owner.query<{ processing_status: string; attendance_day_id: string | null }>(
    "SELECT processing_status, attendance_day_id FROM attendance_events WHERE id = $1", [reconciliationRawId]
  );
  assert.deepEqual(reconciledRaw.rows[0], { processing_status: "reconciliation_required", attendance_day_id: null });
  const reconciliationRecord = await owner.query<{ resolution: string; reason: string; before_json: unknown; after_json: unknown; provenance: unknown }>(
    "SELECT resolution, reason, before_json, after_json, provenance FROM terminal_event_reconciliations WHERE attendance_event_id = $1",
    [reconciliationRawId]
  );
  assert.equal(reconciliationRecord.rows[0]?.resolution, "accepted");
  assert.ok(reconciliationRecord.rows[0]?.before_json);
  assert.ok(reconciliationRecord.rows[0]?.after_json);
  assert.ok(reconciliationRecord.rows[0]?.provenance);
  const acceptedReconciliationRetry = await ingest(
    "check_in", reconciliationEventId, reconciliationCard.validFrom, 32,
    "integration-nonce-reconciliation-retry-0037b", reconciliationHash,
    { acknowledgedAt: reconciliationCard.validFrom }
  );
  assert.equal(acceptedReconciliationRetry.results[0]?.status, "duplicate");
  assert.equal(acceptedReconciliationRetry.results[0]?.code, null);
  assert.equal((await owner.query<{ count: string }>(
    "SELECT COUNT(*)::text AS count FROM terminal_event_reconciliations WHERE attendance_event_id = $1",
    [reconciliationRawId]
  )).rows[0]?.count, "1");

  const uncertainClockEvent = await ingest(
    "check_in", randomUUID(), new Date(Date.now() - 2000).toISOString(), 33,
    "integration-nonce-clock-uncertain-0038", reconciliationHash,
    { acknowledgedAt: new Date(Date.now() - 1000).toISOString(), clockStatus: "uncertain" }
  );
  assert.equal(uncertainClockEvent.results[0]?.status, "reconciliation_required");
  assert.equal(uncertainClockEvent.results[0]?.code, "DEVICE_CLOCK_HEALTH_UNCERTAIN");

  const historicalCredential = activeDeviceCredential;
  const historicalKey = activeAcknowledgementKey;
  const historicalOccurredAt = new Date(Date.now() - 4000).toISOString();
  const historicalAcknowledgedAt = new Date(Date.now() - 3000).toISOString();
  const terminalBeforeRotation = (await service.listTerminals(admin.actor)).find((item) => item.id === paired.terminal.id)!;
  const rotated = await service.rotateTerminalCredential(
    admin.actor, paired.terminal.id, { reason: "normal_rotation" }, terminalBeforeRotation.revision,
    "integration-terminal-credential-rotation"
  );
  activeDeviceCredential = rotated.deviceCredential;
  activeAcknowledgementKey = rotated.acknowledgementKey;
  assert.equal(rotated.acknowledgementKey.version, historicalKey.version + 1);
  const historicalReceiptAfterRotation = await ingest(
    "check_in", randomUUID(), historicalOccurredAt, 34,
    "integration-nonce-historical-key-0039", "c".repeat(64),
    { acknowledgedAt: historicalAcknowledgedAt, keyId: historicalKey.id, keyVersion: historicalKey.version,
      receiptCredential: historicalCredential }
  );
  assert.equal(historicalReceiptAfterRotation.results[0]?.code, "CARD_NOT_ASSIGNED");
  const postRotationOldKey = await ingest(
    "check_in", randomUUID(), new Date().toISOString(), 35,
    "integration-nonce-retired-key-0040", "c".repeat(64),
    { acknowledgedAt: new Date(Date.now() + 1).toISOString(), keyId: historicalKey.id,
      keyVersion: historicalKey.version, receiptCredential: historicalCredential }
  );
  assert.equal(postRotationOldKey.results[0]?.status, "rejected");
  assert.equal(postRotationOldKey.results[0]?.code, "ACKNOWLEDGEMENT_KEY_INACTIVE");
  const terminalBeforeRevocation = (await service.listTerminals(admin.actor)).find((item) => item.id === paired.terminal.id)!;
  await service.revokeTerminal(admin.actor, paired.terminal.id, terminalBeforeRevocation.revision, "integration-terminal-revoke");
  await assert.rejects(
    ingest("check_in", randomUUID(), new Date().toISOString(), 36, "integration-nonce-revoked-terminal-0041", "c".repeat(64)),
    (error: unknown) => typeof error === "object" && error !== null && "code" in error && error.code === "UNAUTHENTICATED"
  );
  assert.equal(overnightDay.items[0]?.plannedMinutes, 450);
  assert.deepEqual(overnightDay.items[0]?.provenance.eventTimeInterpretations.map((item) => item.localTimestamp), [
    "2026-01-10T22:30:00.000", "2026-01-11T05:30:00.000"
  ]);

  const rawBeforeRecalculation = await owner.query(
    `SELECT id, device_event_id, occurred_at, event_type, processing_status, attendance_day_id,
       timezone_version_id, timezone_name, resolved_local_at, resolved_utc_offset_seconds
     FROM attendance_events WHERE attendance_day_id = $1 ORDER BY occurred_at, id`,
    [delayedHistoricalDay.id]
  );
  const recalculation = await service.recalculateAttendanceDay(admin.actor, delayedHistoricalDay.id, {
    calculationVersion: "attendance-v1",
    reason: "Deterministična provjera povijesnog izračuna"
  }, delayedHistoricalDay.revision, "integration-attendance-recalculation");
  assert.equal(recalculation.supersedesCalculationId, delayedHistoricalDay.provenance.calculationId);
  assert.notEqual(recalculation.calculationId, recalculation.supersedesCalculationId);
  assert.deepEqual(recalculation.affectedPeriod, { from: "2026-06-21", to: "2026-06-21" });
  assert.equal(recalculation.after.workDate, recalculation.before.workDate);
  assert.deepEqual(recalculation.after.shift, recalculation.before.shift);
  assert.equal(recalculation.after.checkIn, recalculation.before.checkIn);
  assert.equal(recalculation.after.checkOut, recalculation.before.checkOut);
  assert.equal(recalculation.after.workedMinutes, recalculation.before.workedMinutes);
  assert.equal(recalculation.after.plannedMinutes, recalculation.before.plannedMinutes);
  assert.equal(recalculation.after.status, recalculation.before.status);
  assert.equal(recalculation.after.provenance.timezoneVersionId, recalculation.before.provenance.timezoneVersionId);
  assert.deepEqual(recalculation.after.provenance.sourceEventIds, recalculation.before.provenance.sourceEventIds);
  assert.deepEqual(recalculation.after.provenance.eventTimeInterpretations, recalculation.before.provenance.eventTimeInterpretations);
  assert.notEqual(recalculation.after.revision, recalculation.before.revision);
  const rawAfterRecalculation = await owner.query(
    `SELECT id, device_event_id, occurred_at, event_type, processing_status, attendance_day_id,
       timezone_version_id, timezone_name, resolved_local_at, resolved_utc_offset_seconds
     FROM attendance_events WHERE attendance_day_id = $1 ORDER BY occurred_at, id`,
    [delayedHistoricalDay.id]
  );
  assert.deepEqual(rawAfterRecalculation.rows, rawBeforeRecalculation.rows);
  const calculationHistory = await owner.query<{
    id: string;
    actor_type: string;
    actor_id: string;
    supersedes_id: string | null;
    reason: string;
    affected_from: string;
    affected_to: string;
    source_event_ids: string[];
    configuration_snapshot: { eventTimeInterpretations?: unknown[] };
  }>(
    `SELECT id, actor_type, actor_id, supersedes_id, reason, affected_from::text, affected_to::text,
       source_event_ids, configuration_snapshot
     FROM attendance_calculations WHERE attendance_day_id = $1 ORDER BY created_at, id`,
    [delayedHistoricalDay.id]
  );
  assert.equal(calculationHistory.rows.length, 3);
  assert.equal(calculationHistory.rows[2]?.id, recalculation.calculationId);
  assert.equal(calculationHistory.rows[2]?.actor_type, "user");
  assert.equal(calculationHistory.rows[2]?.actor_id, admin.actor.userId);
  assert.equal(calculationHistory.rows[2]?.supersedes_id, recalculation.supersedesCalculationId);
  assert.equal(calculationHistory.rows[2]?.reason, recalculation.reason);
  assert.equal(calculationHistory.rows[2]?.affected_from, "2026-06-21");
  assert.equal(calculationHistory.rows[2]?.affected_to, "2026-06-21");
  assert.deepEqual(calculationHistory.rows[2]?.source_event_ids, recalculation.after.provenance.sourceEventIds);
  assert.deepEqual(calculationHistory.rows[2]?.configuration_snapshot.eventTimeInterpretations, recalculation.after.provenance.eventTimeInterpretations);
  await assert.rejects(
    owner.query("UPDATE attendance_calculations SET reason = 'mutated' WHERE id = $1", [recalculation.calculationId]),
    /attendance_calculations is append-only/
  );
  const tenantProbe = await appPool.connect();
  try {
    await tenantProbe.query("BEGIN");
    await tenantProbe.query("SELECT set_config('bss.organization_id', $1, true)", [ids.org2]);
    const hiddenCalculation = await tenantProbe.query("SELECT id FROM attendance_calculations WHERE id = $1", [recalculation.calculationId]);
    const hiddenTimezoneVersion = await tenantProbe.query("SELECT id FROM organization_timezone_versions WHERE organization_id = $1", [ids.org1]);
    assert.equal(hiddenCalculation.rowCount, 0);
    assert.equal(hiddenTimezoneVersion.rowCount, 0);
  } finally {
    await tenantProbe.query("ROLLBACK");
    tenantProbe.release();
  }
  const recalculationAudit = await owner.query<{ before_json: unknown; after_json: unknown; metadata: { reason?: string; calculationId?: string } }>(
    "SELECT before_json, after_json, metadata FROM audit_events WHERE id = $1",
    [recalculation.auditEventId]
  );
  assert.ok(recalculationAudit.rows[0]?.before_json);
  assert.ok(recalculationAudit.rows[0]?.after_json);
  assert.equal(recalculationAudit.rows[0]?.metadata.reason, recalculation.reason);
  assert.equal(recalculationAudit.rows[0]?.metadata.calculationId, recalculation.calculationId);
  for (const deniedActor of [manager.actor, workerSession.actor, accountant.actor]) {
    await assert.rejects(
      service.recalculateAttendanceDay(deniedActor, delayedHistoricalDay.id, {
        calculationVersion: "attendance-v1",
        reason: "Nedopuštena provjera"
      }, recalculation.after.revision, "integration-attendance-recalculation-denied"),
      (error: unknown) => typeof error === "object" && error !== null && "code" in error && error.code === "FORBIDDEN"
    );
  }
  await assert.rejects(
    service.recalculateAttendanceDay({ ...admin.actor, organizationId: ids.org2 }, delayedHistoricalDay.id, {
      calculationVersion: "attendance-v1",
      reason: "Međutenantska provjera"
    }, recalculation.after.revision, "integration-attendance-recalculation-cross-tenant"),
    (error: unknown) => typeof error === "object" && error !== null && "code" in error && error.code === "NOT_FOUND"
  );
  await owner.query(
    `INSERT INTO attendance_month_locks (organization_id, year, month, locked_by)
     VALUES ($1, 2026, 6, $2)`,
    [ids.org1, ids.admin1]
  );
  await assert.rejects(
    service.recalculateAttendanceDay(admin.actor, delayedHistoricalDay.id, {
      calculationVersion: "attendance-v1",
      reason: "Zaključano razdoblje"
    }, recalculation.after.revision, "integration-attendance-recalculation-locked"),
    (error: unknown) => typeof error === "object" && error !== null && "code" in error && error.code === "CONFLICT"
  );
  await owner.query("DELETE FROM attendance_month_locks WHERE organization_id = $1 AND year = 2026 AND month = 6", [ids.org1]);

  const blockedCard = await service.blockRfidCard(admin.actor, card.id, "integration-rfid-block");
  const blockedCardAgain = await service.blockRfidCard(admin.actor, card.id, "integration-rfid-block-idempotent");
  assert.equal(blockedCard.status, "blocked");
  assert.equal(blockedCardAgain.revision, blockedCard.revision);

  const concurrentCardAssignments = await Promise.allSettled([
    service.assignWorkerRfidCard(admin.actor, ids.worker1, { uid: "04:A1:B2:C4" }, "integration-rfid-race-a"),
    service.assignWorkerRfidCard(admin.actor, ids.worker1, { uid: "04:A1:B2:C5" }, "integration-rfid-race-b")
  ]);
  assert.equal(concurrentCardAssignments.filter((result) => result.status === "fulfilled").length, 2);
  const activeCards = await owner.query<{ count: string }>(
    "SELECT COUNT(*)::text AS count FROM rfid_cards WHERE organization_id = $1 AND worker_id = $2 AND status = 'active'",
    [ids.org1, ids.worker1]
  );
  assert.equal(activeCards.rows[0]?.count, "1");

  const leave = await service.createLeaveRequest(workerSession.actor, {
    typeCode: "annual_leave",
    startDate: "2026-08-03",
    endDate: "2026-08-07",
    note: "Planirani godišnji"
  }, "integration-leave-create");
  assert.equal(leave.workingDays, 5);
  const approvedLeave = await service.approveLeaveRequest(manager.actor, leave.id, leave.revision, "Odobreno u planu", "integration-leave-approve");
  assert.equal(approvedLeave.status, "approved");

  // The yearly allowance is evaluated separately for each calendar year. Seven
  // days are already reserved in 2026, so this request fits a 12-day allowance
  // only when its four 2026 and six 2027 workdays are split correctly.
  await owner.query("UPDATE workers SET annual_leave_allowance = 12 WHERE id = $1", [ids.worker1]);
  const crossYearLeave = await service.createLeaveRequest(workerSession.actor, {
    typeCode: "annual_leave",
    startDate: "2026-12-28",
    endDate: "2027-01-08",
    note: "Prijelaz godine"
  }, "integration-leave-cross-year");
  assert.equal(crossYearLeave.workingDays, 10);

  const workerWithLeave = await service.getWorker(admin.actor, ids.worker1);
  await assert.rejects(
    service.updateWorker(admin.actor, ids.worker1, {
      code: workerWithLeave.code,
      name: workerWithLeave.name,
      email: workerWithLeave.email,
      departmentId: workerWithLeave.departmentId,
      shiftId: workerWithLeave.shiftId,
      annualLeaveAllowance: 0
    }, workerWithLeave.revision, "integration-allowance-below-commitments"),
    (error: unknown) => typeof error === "object" && error !== null && "code" in error && error.code === "CONFLICT"
  );

  const sharedLeave = await service.listApprovedLeaveCalendar(workerSession.actor, { from: "2026-01-01", to: "2026-12-31" });
  assert.ok(sharedLeave.items.some((item) => item.id === leave.id && item.employeeName === "Ana A"));
  assert.deepEqual(Object.keys(sharedLeave.items[0] ?? {}).sort(), ["employeeName", "endDate", "id", "startDate"]);

  await assert.rejects(
    service.createCorrectionRequest(workerSession.actor, {
      attendanceDayId: day.items[0]!.id,
      newCheckIn: "2026-07-18T06:05:00.000Z",
      newCheckOut: "2026-07-18T14:05:00.000Z",
      reason: "Pogrešan datum korekcije"
    }, "integration-correction-wrong-date"),
    (error: unknown) => typeof error === "object" && error !== null && "code" in error && error.code === "VALIDATION_FAILED"
  );

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
  await assert.rejects(
    service.recalculateAttendanceDay(admin.actor, correctionDecision.attendanceDay.id, {
      calculationVersion: "attendance-v1",
      reason: "Korekcija se ne smije prepisati"
    }, correctionDecision.attendanceDay.revision, "integration-recalculation-corrected-block"),
    (error: unknown) => typeof error === "object" && error !== null && "code" in error && error.code === "CONFLICT"
  );

  const staleCorrection = await service.createCorrectionRequest(workerSession.actor, {
    attendanceDayId: day.items[0]!.id,
    newCheckIn: "2026-07-17T06:10:00.000Z",
    newCheckOut: "2026-07-17T14:10:00.000Z",
    reason: "Provjera konkurentne promjene"
  }, "integration-correction-stale-create");
  await owner.query(
    `UPDATE attendance_days SET check_in = check_in + interval '1 minute',
       worked_minutes = GREATEST(0, worked_minutes - 1), revision = revision + 1
     WHERE id = $1`,
    [day.items[0]!.id]
  );
  await assert.rejects(
    service.approveCorrectionRequest(
      manager.actor,
      staleCorrection.id,
      staleCorrection.revision,
      "Zapis se promijenio",
      "integration-correction-stale-approve"
    ),
    (error: unknown) => typeof error === "object" && error !== null && "code" in error && error.code === "CONFLICT"
  );
  await service.cancelOwnCorrectionRequest(
    workerSession.actor,
    staleCorrection.id,
    staleCorrection.revision,
    "integration-correction-stale-cancel"
  );

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
  await assert.rejects(
    auth.acceptInvitation(invitationToken, "too-short", { requestId: "integration-invitation-password-policy" }),
    (error: unknown) => typeof error === "object" && error !== null && "code" in error && error.code === "VALIDATION_FAILED"
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

  const httpConfig = loadConfig({
    NODE_ENV: "test",
    PUBLIC_ORIGIN: "https://bss.test",
    DATABASE_URL: appUrl.toString(),
    DATABASE_SSL: "false",
    COOKIE_SECURE: "false",
    LOG_LEVEL: "silent",
    RFID_UID_PEPPER: rfidPepper,
    DEVICE_CREDENTIAL_ENCRYPTION_KEY: "integration-device-encryption-key-0123456789abcdef",
    TERMINAL_ACTIVATION_CODE: terminalActivationCode
  });
  const httpApp = await buildApp({ config: httpConfig, authService: auth, phaseAService: service, logger: false });
  try {
    const workerOrganizationAttendance = await httpApp.inject({
      method: "GET",
      url: "/api/v1/attendance?from=2026-07-01&to=2026-07-31",
      cookies: { bss_session: workerSession.tokens.accessToken }
    });
    assert.equal(workerOrganizationAttendance.statusCode, 403);
    const workerEscape = await httpApp.inject({
      method: "GET",
      url: `/api/v1/workers/${createdWorker.id}/attendance?from=2026-07-01&to=2026-07-31`,
      cookies: { bss_session: workerSession.tokens.accessToken }
    });
    assert.equal(workerEscape.statusCode, 403);
    const accountantCorrections = await httpApp.inject({
      method: "GET",
      url: "/api/v1/correction-requests?from=2026-07-01&to=2026-07-31",
      cookies: { bss_session: accepted.tokens.accessToken }
    });
    assert.equal(accountantCorrections.statusCode, 403);
    const managerTerminalPair = await httpApp.inject({
      method: "POST",
      url: "/api/v1/terminals/pair",
      headers: { origin: httpConfig.publicOrigin },
      cookies: { bss_session: manager.tokens.accessToken },
      payload: { activationCode: terminalActivationCode, name: "Nedopušten", location: "Integracija" }
    });
    assert.equal(managerTerminalPair.statusCode, 403);
  } finally {
    await httpApp.close();
  }

  const blockedAccount = await service.updateUser(admin.actor, accepted.context.user.id, { status: "blocked" }, accepted.context.user.revision, "integration-account-block");
  await assert.rejects(
    auth.resolveAccessToken(accepted.tokens.accessToken),
    (error: unknown) => typeof error === "object" && error !== null && "code" in error && error.code === "UNAUTHENTICATED"
  );
  const reactivatedAccount = await service.updateUser(admin.actor, accepted.context.user.id, { status: "active" }, blockedAccount.revision, "integration-account-reactivate");
  assert.equal(reactivatedAccount.status, "active");
  await assert.rejects(
    auth.resolveAccessToken(accepted.tokens.accessToken),
    (error: unknown) => typeof error === "object" && error !== null && "code" in error && error.code === "UNAUTHENTICATED"
  );

  const replaySession = await auth.login("worker-a@example.test", workerPassword, { requestId: "integration-refresh-login" });
  const concurrentRotations = await Promise.allSettled([
    auth.rotate(replaySession.tokens.refreshToken, { requestId: "integration-refresh-a" }),
    auth.rotate(replaySession.tokens.refreshToken, { requestId: "integration-refresh-b" })
  ]);
  assert.equal(concurrentRotations.filter((result) => result.status === "fulfilled").length, 1);
  assert.equal(concurrentRotations.filter((result) => result.status === "rejected").length, 1);
  const issuedAfterReplay = concurrentRotations.find((result) => result.status === "fulfilled");
  assert.ok(issuedAfterReplay?.status === "fulfilled");
  await assert.rejects(
    auth.resolveAccessToken(issuedAfterReplay.value.accessToken),
    (error: unknown) => typeof error === "object" && error !== null && "code" in error && error.code === "UNAUTHENTICATED"
  );
  const refreshReuseAudit = await owner.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM audit_events
     WHERE organization_id = $1 AND action = 'auth.refresh_reuse_detected'`,
    [ids.org1]
  );
  assert.equal(refreshReuseAudit.rows[0]?.count, "1");

  const explicitLogout = await auth.login("manager-a@example.test", managerPassword, { requestId: "integration-logout-login" });
  await auth.logoutByRefreshToken(explicitLogout.tokens.refreshToken, "integration-logout-refresh");
  await assert.rejects(
    auth.resolveAccessToken(explicitLogout.tokens.accessToken),
    (error: unknown) => typeof error === "object" && error !== null && "code" in error && error.code === "UNAUTHENTICATED"
  );

  const takeoverPassword = "Worker-takeover-password-2026!";
  const takeoverHash = await hashPassword(takeoverPassword);
  const takeoverUser = await owner.query<{ id: string }>(
    `INSERT INTO users (organization_id, email, password_hash, role, status, worker_id)
     VALUES ($1, 'created-worker@example.test', $2, 'worker', 'active', $3) RETURNING id`,
    [ids.org1, takeoverHash, createdWorker.id]
  );
  const takeoverSession = await auth.login("created-worker@example.test", takeoverPassword, { requestId: "integration-worker-login" });
  const currentCreatedWorker = await service.getWorker(admin.actor, createdWorker.id);
  await service.deactivateWorker(admin.actor, createdWorker.id, currentCreatedWorker.revision, "integration-worker-deactivate");
  await assert.rejects(
    auth.resolveAccessToken(takeoverSession.tokens.accessToken),
    (error: unknown) => typeof error === "object" && error !== null && "code" in error && error.code === "UNAUTHENTICATED"
  );
  const blockedIdentity = await owner.query<{ status: string; revoke_reason: string | null }>(
    `SELECT u.status, s.revoke_reason FROM users u
     JOIN auth_sessions s ON s.user_id = u.id WHERE u.id = $1 ORDER BY s.created_at DESC LIMIT 1`,
    [takeoverUser.rows[0]!.id]
  );
  assert.deepEqual(blockedIdentity.rows[0], { status: "blocked", revoke_reason: "worker_deactivated" });

  const rls = await appPool.connect();
  try {
    await rls.query("BEGIN");
    await rls.query("SELECT set_config('bss.organization_id', $1, true)", [ids.org1]);
    const visible = await rls.query<{ id: string }>("SELECT id FROM workers ORDER BY id");
    assert.deepEqual(
      visible.rows.map((row) => row.id),
      [ids.worker1, ids.worker3, createdWorker.id, transferWorker.id, overnightWorker.id].sort()
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
