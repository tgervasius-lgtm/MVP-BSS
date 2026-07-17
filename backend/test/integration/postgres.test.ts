import assert from "node:assert/strict";
import test from "node:test";
import pg from "pg";
import { migrateUp } from "../../src/db/migrate.js";
import { hashPassword } from "../../src/security/passwords.js";
import { createOpaqueToken, hashToken } from "../../src/security/tokens.js";
import { PgAuthService } from "../../src/services/pg-auth-service.js";
import { PgPhaseAService } from "../../src/services/pg-phase-a-service.js";

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
  await owner.query(`GRANT EXECUTE ON FUNCTION bss_auth_lookup(text), bss_session_lookup(bytea), bss_refresh_lookup(bytea), bss_invitation_lookup(bytea) TO ${role}`);

  const adminPassword = "Admin-secure-password-2026!";
  const managerPassword = "Manager-secure-password-2026!";
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

  const appPool = new Pool({ connectionString: appUrl.toString(), max: 3 });
  t.after(async () => {
    await appPool.end();
    await owner.query(`DROP OWNED BY ${role}`);
    await owner.query(`DROP ROLE IF EXISTS ${role}`);
    await owner.end();
  });
  const config = { accessTokenTtlSeconds: 900, refreshTokenTtlSeconds: 2_592_000 };
  const auth = new PgAuthService(appPool, config);
  const service = new PgPhaseAService(appPool, "integration-rfid-pepper-0123456789abcdef");

  const admin = await auth.login("admin-a@example.test", adminPassword, { requestId: "integration-login" });
  assert.equal(admin.context.organization.id, ids.org1);
  const adminWorkers = await service.listWorkers(admin.actor, { limit: 50 });
  assert.deepEqual(adminWorkers.items.map((item) => item.id), [ids.worker1]);

  const manager = await auth.login("manager-a@example.test", managerPassword, { requestId: "integration-manager" });
  assert.deepEqual(manager.actor.departmentIds, [ids.dep1]);
  const managerWorkers = await service.listWorkers(manager.actor, { limit: 50 });
  assert.deepEqual(managerWorkers.items.map((item) => item.id), [ids.worker1]);

  const department = await service.updateDepartment(
    admin.actor,
    ids.dep1,
    { name: "Operativa A" },
    "1",
    "integration-department"
  );
  assert.equal(department.name, "Operativa A");

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
    { uid: "04:A1:B2:C3" },
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

  const rls = await appPool.connect();
  try {
    await rls.query("BEGIN");
    await rls.query("SELECT set_config('bss.organization_id', $1, true)", [ids.org1]);
    const visible = await rls.query<{ id: string }>("SELECT id FROM workers ORDER BY id");
    assert.deepEqual(visible.rows.map((row) => row.id), [ids.worker1]);
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
