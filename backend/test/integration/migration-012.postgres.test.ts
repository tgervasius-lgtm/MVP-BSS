import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { migrateDown, migrateUp } from "../../src/db/migrate.js";

const { Client } = pg;
const databaseUrl = process.env.BSS_TEST_DATABASE_URL;
const required = process.env.BSS_REQUIRE_POSTGRES_TESTS === "true";
const migrationsDir = join(dirname(fileURLToPath(import.meta.url)), "../../migrations");

type Harness = {
  client: InstanceType<typeof Client>;
  databaseName: string;
  roleName: string;
  organizationId: string;
  adminId: string;
};

function checksum(sql: string): string {
  return createHash("sha256").update(sql).digest("hex");
}

async function applyThrough011(client: InstanceType<typeof Client>): Promise<void> {
  await client.query(`CREATE TABLE bss_schema_migrations (
    version text PRIMARY KEY,
    checksum char(64) NOT NULL,
    applied_at timestamptz NOT NULL DEFAULT clock_timestamp()
  )`);
  const files = (await readdir(migrationsDir))
    .filter((name) => name.endsWith(".up.sql") && name < "012_")
    .sort();
  for (const file of files) {
    const sql = await readFile(join(migrationsDir, file), "utf8");
    const version = file.slice(0, -".up.sql".length);
    await client.query("BEGIN");
    try {
      await client.query(sql);
      await client.query("INSERT INTO bss_schema_migrations(version, checksum) VALUES ($1, $2)", [version, checksum(sql)]);
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  }
}

async function withTenant<T>(
  client: InstanceType<typeof Client>,
  organizationId: string,
  operation: () => Promise<T>
): Promise<T> {
  await client.query("BEGIN");
  try {
    await client.query("SELECT set_config('bss.organization_id', $1, true)", [organizationId]);
    const result = await operation();
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
}

async function tenantQuery<T extends pg.QueryResultRow>(
  client: InstanceType<typeof Client>,
  organizationId: string,
  sql: string,
  parameters: unknown[] = []
): Promise<pg.QueryResult<T>> {
  return withTenant(client, organizationId, () => client.query<T>(sql, parameters));
}

async function createHarness(admin: InstanceType<typeof Client>, label: string): Promise<Harness> {
  const suffix = randomUUID().replaceAll("-", "").slice(0, 12);
  const roleName = `bss_migrator_${suffix}`;
  const bootstrapRoleName = `bss_bootstrap_${suffix}`;
  const databaseName = `bss_migration_012_${label}_${suffix}`;
  const password = `migrator-${suffix}`;
  const bootstrapPassword = `bootstrap-${suffix}`;
  await admin.query(`CREATE ROLE ${roleName} LOGIN PASSWORD '${password}' NOSUPERUSER NOBYPASSRLS`);
  await admin.query(`CREATE ROLE ${bootstrapRoleName} LOGIN PASSWORD '${bootstrapPassword}' NOSUPERUSER BYPASSRLS`);
  try {
    // Historical migrations 008 and earlier predate the production migrator
    // role contract and contain global FORCE-RLS backfills. Build only that
    // prerequisite schema with a disposable bootstrap owner, then transfer the
    // fresh database objects to the migration role that has never had BYPASSRLS.
    await admin.query(`CREATE DATABASE ${databaseName} OWNER ${bootstrapRoleName}`);
  } catch (error) {
    await admin.query(`DROP ROLE ${bootstrapRoleName}`);
    await admin.query(`DROP ROLE ${roleName}`);
    throw error;
  }
  const bootstrapUrl = new URL(databaseUrl!);
  bootstrapUrl.username = bootstrapRoleName;
  bootstrapUrl.password = bootstrapPassword;
  bootstrapUrl.pathname = `/${databaseName}`;
  try {
    const bootstrap = new Client({ connectionString: bootstrapUrl.toString() });
    await bootstrap.connect();
    try {
      await applyThrough011(bootstrap);
    } finally {
      await bootstrap.end();
    }
    const adminDatabaseUrl = new URL(databaseUrl!);
    adminDatabaseUrl.pathname = `/${databaseName}`;
    const adminDatabase = new Client({ connectionString: adminDatabaseUrl.toString() });
    await adminDatabase.connect();
    try {
      await adminDatabase.query(`REASSIGN OWNED BY ${bootstrapRoleName} TO ${roleName}`);
    } finally {
      await adminDatabase.end();
    }
    await admin.query(`ALTER DATABASE ${databaseName} OWNER TO ${roleName}`);
    await admin.query(`DROP ROLE ${bootstrapRoleName}`);
  } catch (error) {
    await admin.query("SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1", [databaseName]);
    await admin.query(`DROP DATABASE IF EXISTS ${databaseName}`);
    await admin.query(`DROP ROLE IF EXISTS ${bootstrapRoleName}`);
    await admin.query(`DROP ROLE IF EXISTS ${roleName}`);
    throw error;
  }
  const roleUrl = new URL(databaseUrl!);
  roleUrl.username = roleName;
  roleUrl.password = password;
  roleUrl.pathname = `/${databaseName}`;
  const client = new Client({ connectionString: roleUrl.toString() });
  await client.connect();
  try {
    const role = await client.query<{ rolsuper: boolean; rolbypassrls: boolean; current_user: string }>(
      `SELECT r.rolsuper, r.rolbypassrls, current_user
       FROM pg_roles r WHERE r.rolname = current_user`
    );
    assert.deepEqual(role.rows[0], { rolsuper: false, rolbypassrls: false, current_user: roleName });
    const organizationId = randomUUID();
    const adminId = randomUUID();
    await tenantQuery(client, organizationId,
      "INSERT INTO organizations(id, name) VALUES ($1, 'Migration 012 Evidence')", [organizationId]);
    await tenantQuery(client, organizationId,
      "INSERT INTO users(id, organization_id, email, role) VALUES ($1, $2, $3, 'admin')",
      [adminId, organizationId, `${label}-${suffix}@migration.invalid`]);
    return { client, databaseName, roleName, organizationId, adminId };
  } catch (error) {
    await client.end();
    await admin.query("SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1", [databaseName]);
    await admin.query(`DROP DATABASE ${databaseName}`);
    await admin.query(`DROP ROLE ${roleName}`);
    throw error;
  }
}

async function destroyHarness(admin: InstanceType<typeof Client>, harness: Harness): Promise<void> {
  await harness.client.end();
  await admin.query("SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1", [harness.databaseName]);
  await admin.query(`DROP DATABASE ${harness.databaseName}`);
  await admin.query(`DROP ROLE ${harness.roleName}`);
}

async function forceRlsState(client: InstanceType<typeof Client>): Promise<Record<string, boolean>> {
  const result = await client.query<{ relname: string; relforcerowsecurity: boolean }>(
    `SELECT relname, relforcerowsecurity FROM pg_class
     WHERE relname IN ('attendance_month_locks', 'report_exports', 'audit_events')`
  );
  return Object.fromEntries(result.rows.map((row) => [row.relname, row.relforcerowsecurity]));
}

test("#146 migration 012 is safe under the production-like migrator role", { skip: !databaseUrl && !required }, async () => {
  assert.ok(databaseUrl, "BSS_TEST_DATABASE_URL is required when PostgreSQL tests are mandatory");
  const admin = new Client({ connectionString: databaseUrl });
  await admin.connect();
  const previousAllowDown = process.env.BSS_ALLOW_DOWN_MIGRATIONS;
  process.env.BSS_ALLOW_DOWN_MIGRATIONS = "true";
  try {
    const beforeEvidence = await createHarness(admin, "before");
    try {
      const legacyVersion = randomUUID();
      await tenantQuery(beforeEvidence.client, beforeEvidence.organizationId,
        `INSERT INTO attendance_month_locks (organization_id, year, month, locked_by, dataset_version)
         VALUES ($1, 2029, 12, $2, $3)`,
        [beforeEvidence.organizationId, beforeEvidence.adminId, legacyVersion]);
      await migrateUp(beforeEvidence.client);
      const legacy = await tenantQuery<{
        status: string; provenance_status: string; transition_reason: string; dataset_version: string;
      }>(beforeEvidence.client, beforeEvidence.organizationId,
      `SELECT status, provenance_status, transition_reason, dataset_version
       FROM attendance_month_locks WHERE year = 2029 AND month = 12`);
      assert.deepEqual(legacy.rows[0], {
        status: "finalized",
        provenance_status: "legacy_unavailable",
        transition_reason: "Legacy month lock retained without reproducible dataset provenance.",
        dataset_version: legacyVersion
      });
      assert.equal((await beforeEvidence.client.query("SELECT 1 FROM attendance_month_locks")).rowCount, 0,
        "FORCE RLS must be restored after the global legacy backfill");
      assert.deepEqual(await forceRlsState(beforeEvidence.client), {
        attendance_month_locks: true, audit_events: true, report_exports: true
      });

      await migrateDown(beforeEvidence.client);
      assert.equal((await beforeEvidence.client.query(
        "SELECT 1 FROM bss_schema_migrations WHERE version = '012_deterministic_attendance_periods'"
      )).rowCount, 0);
      assert.equal((await beforeEvidence.client.query("SELECT to_regclass('attendance_period_versions') AS relation")).rows[0]?.relation, null);
      const restored = await tenantQuery<{ dataset_version: string }>(beforeEvidence.client, beforeEvidence.organizationId,
        "SELECT dataset_version FROM attendance_month_locks WHERE year = 2029 AND month = 12");
      assert.equal(restored.rows[0]?.dataset_version, legacyVersion);
      assert.deepEqual(await forceRlsState(beforeEvidence.client), {
        attendance_month_locks: true, audit_events: true, report_exports: true
      });
    } finally {
      await destroyHarness(admin, beforeEvidence);
    }

    for (const evidence of ["transition", "version", "locked-export", "audit"] as const) {
      const harness = await createHarness(admin, evidence.replace("-", ""));
      try {
        await migrateUp(harness.client);
        const periodId = randomUUID();
        const versionId = randomUUID();
        const exportId = randomUUID();
        await withTenant(harness.client, harness.organizationId, async () => {
          if (evidence === "audit") {
            await harness.client.query(
              `INSERT INTO audit_events (organization_id, actor_type, actor_id, actor_role, action,
                 entity_type, entity_id, request_id, metadata)
               VALUES ($1, 'user', $2, 'admin', 'attendance_period.reopen',
                 'attendance_period', $3, 'migration-audit-evidence', '{"module":"reports"}'::jsonb)`,
              [harness.organizationId, harness.adminId, periodId]);
            return;
          }
          await harness.client.query(
            `INSERT INTO attendance_month_locks (
               id, organization_id, year, month, status, revision, review_started_by,
               review_started_at, transition_reason, provenance_status
             ) VALUES ($1, $2, 2029, 11, 'review', 1, $3, clock_timestamp(), 'Migration evidence', 'none')`,
            [periodId, harness.organizationId, harness.adminId]);
          if (evidence === "transition") {
            await harness.client.query(
              `INSERT INTO attendance_period_transitions (
                 organization_id, period_id, from_status, to_status, resulting_revision, actor_id,
                 reason, idempotency_key, request_id, result_json
               ) VALUES ($1, $2, 'open', 'review', 1, $3, 'Migration evidence',
                 'migration-transition-evidence', 'migration-transition-request', '{}'::jsonb)`,
              [harness.organizationId, periodId, harness.adminId]);
          }
          if (evidence === "version" || evidence === "locked-export") {
            await harness.client.query(
              `INSERT INTO attendance_period_versions (
                 id, organization_id, period_id, year, month, period_revision, dataset_snapshot,
                 dataset_checksum_sha256, calculation_versions, template_version, finalized_by,
                 reason, request_id
               ) VALUES ($1, $2, $3, 2029, 11, 2, '{}'::jsonb, repeat('a', 64),
                 '["attendance-v1"]'::jsonb, 'bss-report-v1.2', $4, 'Migration evidence',
                 'migration-version-request')`,
              [versionId, harness.organizationId, periodId, harness.adminId]);
          }
          if (evidence === "locked-export") {
            await harness.client.query(
              `INSERT INTO report_exports (
                 id, organization_id, created_by, report_type, filters, format, status,
                 dataset_version, template_version, period_version_id, dataset_checksum_sha256,
                 calculation_versions, scope_department_ids, row_count, total_minutes,
                 storage_key, checksum_sha256, completed_at, content, mime_type, file_name
               ) VALUES ($1, $2, $3, 'monthly_summary', '{}'::jsonb, 'csv', 'ready',
                 $4::text, 'bss-report-v1.2', $4::uuid, repeat('a', 64), '["attendance-v1"]'::jsonb,
                 ARRAY[]::uuid[], 0, 0, 'postgres:report_exports', repeat('b', 64),
                 clock_timestamp(), 'BSS'::bytea, 'text/csv', 'locked.csv')`,
              [exportId, harness.organizationId, harness.adminId, versionId]);
          }
        });

        await assert.rejects(migrateDown(harness.client), /Refusing to remove deterministic attendance-period provenance/);
        assert.equal((await harness.client.query(
          "SELECT 1 FROM bss_schema_migrations WHERE version = '012_deterministic_attendance_periods'"
        )).rowCount, 1);
        assert.deepEqual(await forceRlsState(harness.client), {
          attendance_month_locks: true, audit_events: true, report_exports: true
        });
        const preserved = await tenantQuery<{ count: string }>(harness.client, harness.organizationId,
          evidence === "transition"
            ? "SELECT COUNT(*)::text AS count FROM attendance_period_transitions WHERE period_id = $1"
            : evidence === "version"
              ? "SELECT COUNT(*)::text AS count FROM attendance_period_versions WHERE id = $1"
              : evidence === "locked-export"
                ? "SELECT COUNT(*)::text AS count FROM report_exports WHERE id = $1 AND period_version_id IS NOT NULL"
                : "SELECT COUNT(*)::text AS count FROM audit_events WHERE action = 'attendance_period.reopen'",
          evidence === "transition" ? [periodId] : evidence === "version" ? [versionId] : evidence === "locked-export" ? [exportId] : []);
        assert.equal(preserved.rows[0]?.count, "1", `${evidence} evidence must survive a refused down migration`);
      } finally {
        await destroyHarness(admin, harness);
      }
    }
  } finally {
    if (previousAllowDown === undefined) delete process.env.BSS_ALLOW_DOWN_MIGRATIONS;
    else process.env.BSS_ALLOW_DOWN_MIGRATIONS = previousAllowDown;
    await admin.end();
  }
});
