import assert from "node:assert/strict";
import test from "node:test";
import pg from "pg";
import { migrateUp } from "../../src/db/migrate.js";
import { hashPassword } from "../../src/security/passwords.js";
import { PgAuthService } from "../../src/services/pg-auth-service.js";
import { PgPhaseAService } from "../../src/services/pg-phase-a-service.js";

const { Client, Pool } = pg;
const databaseUrl = process.env.BSS_TEST_DATABASE_URL;
const required = process.env.BSS_REQUIRE_POSTGRES_TESTS === "true";

test("PostgreSQL migrations, RLS isolation, auth and manager scope", { skip: !databaseUrl && !required }, async (t) => {
  assert.ok(databaseUrl, "BSS_TEST_DATABASE_URL is required when PostgreSQL tests are mandatory");
  const owner = new Client({ connectionString: databaseUrl });
  await owner.connect();
  t.after(async () => owner.end());
  await migrateUp(owner);

  const suffix = Math.random().toString(36).slice(2, 10);
  const role = `bss_test_${suffix}`;
  const password = `test-${suffix}-password`;
  const appUrl = new URL(databaseUrl);
  appUrl.username = role;
  appUrl.password = password;

  await owner.query(`CREATE ROLE ${role} LOGIN PASSWORD '${password}' NOSUPERUSER NOBYPASSRLS`);
  t.after(async () => {
    await owner.query(`DROP OWNED BY ${role}`);
    await owner.query(`DROP ROLE IF EXISTS ${role}`);
  });
  await owner.query(`GRANT CONNECT ON DATABASE ${appUrl.pathname.slice(1)} TO ${role}`);
  await owner.query(`GRANT USAGE ON SCHEMA public TO ${role}`);
  await owner.query(`GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ${role}`);
  await owner.query(`GRANT EXECUTE ON FUNCTION bss_auth_lookup(text), bss_session_lookup(bytea), bss_refresh_lookup(bytea) TO ${role}`);

  const adminPassword = "Admin-secure-password-2026!";
  const managerPassword = "Manager-secure-password-2026!";
  const [adminHash, managerHash] = await Promise.all([hashPassword(adminPassword), hashPassword(managerPassword)]);
  const seeded = await owner.query<{
    org1: string; org2: string; dep1: string; dep2: string; shift1: string; shift2: string; worker1: string; worker2: string;
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
           s1.id AS shift1, s2.id AS shift2, w1.id AS worker1, w2.id AS worker2
    FROM o1, o2, d1, d2, s1, s2, w1, w2
  `, [adminHash, managerHash]);
  const ids = seeded.rows[0];
  assert.ok(ids);

  const appPool = new Pool({ connectionString: appUrl.toString(), max: 3 });
  t.after(async () => appPool.end());
  const config = { accessTokenTtlSeconds: 900, refreshTokenTtlSeconds: 2_592_000 };
  const auth = new PgAuthService(appPool, config);
  const service = new PgPhaseAService(appPool);

  const admin = await auth.login("admin-a@example.test", adminPassword, { requestId: "integration-login" });
  assert.equal(admin.context.organization.id, ids.org1);
  const adminWorkers = await service.listWorkers(admin.actor, { limit: 50 });
  assert.deepEqual(adminWorkers.items.map((item) => item.id), [ids.worker1]);

  const manager = await auth.login("manager-a@example.test", managerPassword, { requestId: "integration-manager" });
  assert.deepEqual(manager.actor.departmentIds, [ids.dep1]);
  const managerWorkers = await service.listWorkers(manager.actor, { limit: 50 });
  assert.deepEqual(managerWorkers.items.map((item) => item.id), [ids.worker1]);

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
