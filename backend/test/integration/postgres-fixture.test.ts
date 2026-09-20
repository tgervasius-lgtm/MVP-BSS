import assert from "node:assert/strict";
import test from "node:test";
import pg from "pg";
import { createPostgresFixture } from "../helpers/postgres-fixture.js";

const databaseUrl = process.env.BSS_TEST_DATABASE_URL;
const required = process.env.BSS_REQUIRE_POSTGRES_TESTS === "true";
const options = { skip: !databaseUrl && !required, timeout: 60_000 };

test("parallel fixtures isolate database/table ACLs and clean up their own resources", options, async (t) => {
  assert.ok(databaseUrl, "BSS_TEST_DATABASE_URL is required");
  const observer = new pg.Client({ connectionString: databaseUrl, connectionTimeoutMillis: 5_000, statement_timeout: 30_000 });
  t.after(() => observer.end());
  await observer.connect();
  const results = await Promise.allSettled([
    createPostgresFixture(databaseUrl, "parallel_a"),
    createPostgresFixture(databaseUrl, "parallel_b")
  ]);
  const fixtures = results.flatMap((result) => {
    if (result.status !== "fulfilled") return [];
    t.after(result.value.dispose);
    return [result.value];
  });
  for (const result of results) {
    if (result.status === "rejected") throw result.reason;
  }
  assert.equal(new Set(fixtures.map((fixture) => fixture.databaseName)).size, 2);
  await Promise.all(fixtures.map(async (fixture, index) => {
    await fixture.owner.query("CREATE TABLE fixture_marker (id integer)");
    await fixture.owner.query("INSERT INTO fixture_marker VALUES ($1)", [index]);
    // These are the shared-catalog operations which collided in the old harness.
    for (let round = 0; round < 10; round += 1) {
      await fixture.owner.query(`GRANT CONNECT ON DATABASE ${fixture.databaseName} TO ${fixture.role}`);
      await fixture.owner.query(`GRANT SELECT ON fixture_marker TO ${fixture.role}`);
      await fixture.owner.query(`REVOKE SELECT ON fixture_marker FROM ${fixture.role}`);
    }
    await fixture.owner.query(`GRANT SELECT ON fixture_marker TO ${fixture.role}`);
    const marker = await fixture.appPool.query("SELECT id, current_database() AS database FROM fixture_marker");
    assert.deepEqual(marker.rows, [{ id: index, database: fixture.databaseName }]);
    const role = await fixture.appPool.query("SELECT rolsuper, rolbypassrls, rolcreatedb, rolcreaterole FROM pg_roles WHERE rolname = current_user");
    assert.deepEqual(role.rows, [{ rolsuper: false, rolbypassrls: false, rolcreatedb: false, rolcreaterole: false }]);
  }));
  await Promise.all(fixtures.map((fixture) => fixture.dispose()));
  const databases = await observer.query("SELECT datname FROM pg_database WHERE datname = ANY($1::text[])", [fixtures.map((fixture) => fixture.databaseName)]);
  const roles = await observer.query("SELECT rolname FROM pg_roles WHERE rolname = ANY($1::text[])", [fixtures.map((fixture) => fixture.role)]);
  assert.equal(databases.rowCount, 0);
  assert.equal(roles.rowCount, 0);
});

test("fixture setup failure removes the already-created database and closes its connection", options, async (t) => {
  assert.ok(databaseUrl, "BSS_TEST_DATABASE_URL is required");
  const parent = await createPostgresFixture(databaseUrl, "setup_failure");
  t.after(parent.dispose);
  // A disposable fault-injection role may create a database, but cannot create roles.
  await parent.owner.query(`ALTER ROLE ${parent.role} CREATEDB`);
  const query = "SELECT datname FROM pg_database WHERE datname LIKE 'bss_fixture_denied_%' ORDER BY datname";
  const before = await parent.owner.query(query);
  await assert.rejects(createPostgresFixture(parent.appUrl.toString(), "denied"), { code: "42501" });
  const after = await parent.owner.query(query);
  assert.deepEqual(after.rows, before.rows);
  const connections = await parent.owner.query("SELECT pid FROM pg_stat_activity WHERE usename = $1", [parent.role]);
  assert.equal(connections.rowCount, 0);
});

test("fixture disposal works after a failing grant and is idempotent", options, async (t) => {
  assert.ok(databaseUrl, "BSS_TEST_DATABASE_URL is required");
  const fixture = await createPostgresFixture(databaseUrl, "failed_grant");
  t.after(fixture.dispose);
  await assert.rejects(fixture.owner.query(`GRANT SELECT ON missing_${fixture.suffix} TO ${fixture.role}`), { code: "42P01" });
  const first = fixture.dispose();
  assert.equal(fixture.dispose(), first);
  await first;
});
