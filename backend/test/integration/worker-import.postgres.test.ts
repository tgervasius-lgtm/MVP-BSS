import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { setTimeout as delay } from "node:timers/promises";
import test from "node:test";
import { withTenant } from "../../src/db/tenant.js";
import { digest } from "../../src/imports/model.js";
import { PgWorkerImportStore } from "../../src/imports/pg-worker-import-store.js";
import { importFixture } from "../helpers/import-fixture.js";

const url = process.env.BSS_TEST_DATABASE_URL;
const required = process.env.BSS_REQUIRE_POSTGRES_TESTS === "true";
const options = { skip: !url && !required };

test("#237 PostgreSQL 1000-row atomic import, worker history/audit and durable exact replay", options, async (t) => {
  assert.ok(url, "BSS_TEST_DATABASE_URL is required");
  const f = await importFixture(url); t.after(f.dispose);
  const rows = Array.from({ length: 1000 }, (_, i) => f.worker(String(i).padStart(6, "0")));
  const createKey = randomUUID();
  const prepared = await f.store.prepare(f.first.actor, { fileChecksum: digest(rows), parserVersion: "synthetic-fixture-v1", rows }, createKey, "prepare-test");
  const s = prepared.session;
  assert.equal(s.state, "READY"); assert.equal(s.counts.total, 1000); assert.equal(await f.count("workers"), 0);
  assert.equal(new Date(s.expiresAt).valueOf() - new Date(s.createdAt).valueOf(), 86_400_000);
  const replayPrepare = await f.store.prepare(f.first.actor, { fileChecksum: digest(rows), parserVersion: "synthetic-fixture-v1", rows }, createKey, "retry-create");
  assert.equal(replayPrepare.replayed, true); assert.deepEqual(replayPrepare.session, s);
  await assert.rejects(f.store.prepare(f.first.actor, { fileChecksum: "f".repeat(64), parserVersion: "synthetic-fixture-v1", rows }, createKey, "changed"), { code: "CONFLICT" });
  const preview = await f.store.preview(f.first.actor, s.id, s.revision, 100, 100, "page");
  assert.equal(preview.rows.length, 100); assert.equal(preview.rows[0]?.code, "000100");
  const key = randomUUID();
  const result = await f.commit(s, key);
  assert.equal(result.createdCount, 1000); assert.equal(new Set(result.createdWorkerIds).size, 1000);
  assert.equal(await f.count("workers"), 1000); assert.equal(await f.count("worker_import_staging"), 0);
  assert.equal(await f.count("worker_import_commit_workers"), 1000);
  for (const table of ["worker_department_assignments", "worker_shift_assignments", "worker_status_versions"]) {
    assert.equal(Number((await f.owner.query(`SELECT count(*)::text FROM ${table}`)).rows[0].count), 1000);
  }
  const audits = await f.owner.query("SELECT action, count(*)::integer AS count FROM audit_events GROUP BY action");
  assert.equal(audits.rows.find((r) => r.action === "worker.create")?.count, 1000);
  assert.equal(audits.rows.find((r) => r.action === "worker_import.committed")?.count, 1);
  assert.equal((await f.owner.query("SELECT code, annual_leave_allowance FROM workers WHERE id=$1", [result.createdWorkerIds[0]])).rows[0].code, "000000");
  assert.equal((await f.owner.query("SELECT min(annual_leave_allowance)::integer AS allowance FROM workers")).rows[0].allowance, 0);
  await f.owner.query("UPDATE departments SET name='Changed after commit', revision=revision+1 WHERE id=$1", [f.first.department]);
  await f.age(s.id, "25 hours");
  const restarted = new PgWorkerImportStore(f.appPool);
  assert.deepEqual(await restarted.commit(f.first.actor, s.id, s.revision,
    { approved: true, previewChecksum: s.previewChecksum! }, key, "retry-after-restart"), result);
  assert.equal((await restarted.get(f.first.actor, s.id, "result")).session.state, "COMMITTED");
  await assert.rejects(f.commit(s, randomUUID()), { code: "CONFLICT" });
  await assert.rejects(restarted.commit(f.first.actor, s.id, "2", { approved: true, previewChecksum: s.previewChecksum! }, key, "changed-retry"), { code: "CONFLICT" });
  await assert.rejects(f.store.preview(f.first.actor, s.id, "2", 0, 10, "purged"), { code: "CONFLICT" });
  assert.equal(JSON.stringify(result).includes("Synthetic"), false);
  const importAudits = await f.owner.query("SELECT after_json FROM audit_events WHERE entity_type='worker_import'");
  assert.equal(JSON.stringify(importAudits.rows).includes("Synthetic"), false);
  await assert.rejects(f.owner.query("UPDATE worker_import_commits SET created_count=1"), /immutable/i);
  await assert.rejects(f.owner.query("DELETE FROM worker_import_commit_workers"), /immutable/i);
  await assert.rejects(f.owner.query("DELETE FROM worker_import_sessions WHERE id=$1", [s.id]), /immutable/i);
  assert.equal(await f.count("worker_import_commits"), 1);
});

test("#237 PostgreSQL validation, revisions, tenant/RBAC isolation and two-session admission", options, async (t) => {
  assert.ok(url, "BSS_TEST_DATABASE_URL is required");
  const f = await importFixture(url); t.after(f.dispose);
  const invalid = await f.prepare([f.worker("DUP", { email: "SAME@example.invalid" }), f.worker("dup", { email: "same@example.invalid" })]);
  assert.equal(invalid.state, "INVALID"); assert.equal(invalid.counts.blocked, 2);
  const preview = await f.store.preview(f.first.actor, invalid.id, invalid.revision, 0, 100, "preview");
  assert.equal(preview.issues.filter((i) => i.code === "DUPLICATE_IN_FILE").length, 4);
  await assert.rejects(f.commit(invalid), { code: "CONFLICT" });
  const outside = await f.prepare([f.worker("OUTSIDE", { departmentId: f.other.department, shiftId: f.other.shift })]);
  assert.equal(outside.counts.blocked, 1);
  await assert.rejects(f.prepare([f.worker("THIRD")]), { code: "CONFLICT" });
  for (const id of [invalid.id, outside.id]) {
    await assert.rejects(f.store.get(f.other.actor, id, "cross-tenant"), { code: "NOT_FOUND" });
    await assert.rejects(f.store.cancel(f.other.actor, id, "1", "cross-tenant"), { code: "NOT_FOUND" });
    await assert.rejects(f.store.commit(f.other.actor, id, "1", { approved: true, previewChecksum: "a".repeat(64) }, randomUUID(), "cross-tenant"), { code: "NOT_FOUND" });
  }
  assert.equal((await f.appPool.query("SELECT * FROM worker_import_staging")).rowCount, 0);
  await withTenant(f.appPool, { ...f.first.actor, role: "manager" }, "db-role-denied", async (client) => {
    assert.equal((await client.query("SELECT * FROM worker_import_sessions")).rowCount, 0);
    assert.equal((await client.query("SELECT * FROM worker_import_staging")).rowCount, 0);
  });
  await assert.rejects(withTenant(f.appPool, f.first.actor, "cross-insert", (client) => client.query(
    "INSERT INTO worker_import_staging(organization_id,session_id,rows_json) VALUES ($1,$2,'[{}]')", [f.other.actor.organizationId, randomUUID()])), { code: "42501" });
  const roleFlags = await f.owner.query("SELECT rolsuper,rolbypassrls FROM pg_roles WHERE rolname=$1", [f.role]);
  assert.deepEqual(roleFlags.rows[0], { rolsuper: false, rolbypassrls: false });
  const rls = await f.owner.query("SELECT relrowsecurity,relforcerowsecurity FROM pg_class WHERE relname LIKE 'worker_import_%' AND relkind='r'");
  assert.equal(rls.rowCount, 4); assert.ok(rls.rows.every((r) => r.relrowsecurity && r.relforcerowsecurity));
  await f.store.cancel(f.first.actor, outside.id, outside.revision, "cancel");
  const updated = await f.store.replace(f.first.actor, invalid.id, invalid.revision, [f.worker("VALID")], "replace");
  assert.equal(updated.state, "READY"); assert.equal(updated.revision, "2"); assert.equal(updated.expiresAt, invalid.expiresAt);
  await assert.rejects(f.commit(invalid), { code: "STALE_REVISION" });
  await assert.rejects(f.store.preview(f.first.actor, updated.id, "1", 0, 100, "stale-page"), { code: "STALE_REVISION" });
  await f.owner.query("UPDATE shifts SET status='blocked', revision=revision+1 WHERE id=$1", [f.first.shift]);
  await assert.rejects(f.commit(updated), { code: "STALE_REVISION" });
  assert.equal((await f.store.preview(f.first.actor, updated.id, updated.revision, 0, 100, "reference-changed")).requiresRefresh, true);
  const inactive = await f.store.replace(f.first.actor, updated.id, updated.revision, [f.worker("VALID")], "refresh");
  assert.equal(inactive.state, "INVALID");
  await f.store.cancel(f.first.actor, inactive.id, inactive.revision, "cancel");
  assert.equal(await f.count("workers"), 0); assert.equal(await f.count("worker_import_staging"), 0);
});

test("#237 PostgreSQL expiry cleanup persists on refusal and terminal metadata expires without worker effects", options, async (t) => {
  assert.ok(url, "BSS_TEST_DATABASE_URL is required");
  const f = await importFixture(url); t.after(f.dispose);
  const s = await f.prepare([f.worker("EXPIRED")]);
  await assert.rejects(f.owner.query("UPDATE worker_import_sessions SET expires_at=expires_at+interval '1 day' WHERE id=$1", [s.id]), /immutable/i);
  await f.age(s.id, "25 hours");
  await assert.rejects(f.commit(s), { code: "CONFLICT" });
  assert.equal(await f.count("worker_import_staging"), 0);
  assert.equal((await f.store.get(f.first.actor, s.id, "expired-metadata")).session.state, "EXPIRED");
  await assert.rejects(f.store.replace(f.first.actor, s.id, s.revision, [f.worker("RESURRECT")], "late-result"), { code: "CONFLICT" });
  await f.age(s.id, "32 days", true);
  assert.deepEqual(await f.store.cleanupTenant(f.first.actor, "cleanup"), { expired: 0, removed: 1 });
  await assert.rejects(f.commit(s), { code: "NOT_FOUND" });
  assert.equal(await f.count("workers"), 0); assert.equal(await f.count("worker_import_commits"), 0);
  const due = await f.prepare([f.worker("DUE")]); await f.age(due.id, "25 hours");
  const other = await f.store.prepare(f.other.actor, { fileChecksum: "b".repeat(64), parserVersion: "test-v1",
    rows: [f.worker("OTHER", { departmentId: f.other.department, shiftId: f.other.shift })] }, randomUUID(), "other");
  await f.age(other.session.id, "25 hours");
  assert.deepEqual(await f.store.cleanupTenant(f.first.actor, "cleanup-own"), { expired: 1, removed: 0 });
  assert.equal(await f.count("worker_import_staging"), 1, "Tenant cleanup cannot reach the other tenant's staging");
});

test("#237 PostgreSQL commit races, cancellation and late uniqueness/audit failure roll back the whole batch", options, async (t) => {
  assert.ok(url, "BSS_TEST_DATABASE_URL is required");
  const f = await importFixture(url); t.after(f.dispose);
  const same = await f.prepare([f.worker("SAME")]); const key = randomUUID();
  const results = await Promise.all([f.commit(same, key), f.commit(same, key)]);
  assert.deepEqual(results[0], results[1]); assert.equal(await f.count("workers"), 1);
  const first = await f.prepare([f.worker("RACE")]); const second = await f.prepare([f.worker("race")]);
  const raced = await Promise.allSettled([f.commit(first), f.commit(second)]);
  assert.equal(raced.filter((r) => r.status === "fulfilled").length, 1);
  const losing = (await f.store.get(f.first.actor, first.id, "first")).session.state === "READY" ? first : second;
  await f.store.cancel(f.first.actor, losing.id, losing.revision, "cancel-loser");
  const cancelled = await f.prepare([f.worker("CANCELRACE")]);
  const cancelRace = await Promise.allSettled([f.store.cancel(f.first.actor, cancelled.id, cancelled.revision, "cancel"), f.commit(cancelled)]);
  assert.equal(cancelRace.filter((r) => r.status === "fulfilled").length, 1);
  const final = (await f.store.get(f.first.actor, cancelled.id, "final")).session.state;
  assert.ok(final === "CANCELLED" || final === "COMMITTED");
  const before = await f.count("workers");
  const conflict = await f.prepare([f.worker("BEFORE_CONFLICT"), f.worker("LATE_CONFLICT")]);
  await f.owner.query(`INSERT INTO workers(organization_id,code,name,department_id,shift_id,annual_leave_allowance)
    VALUES ($1,'late_conflict','External worker',$2,$3,10)`, [f.first.actor.organizationId, f.first.department, f.first.shift]);
  await assert.rejects(f.commit(conflict), { code: "CONFLICT" });
  assert.equal(await f.count("workers"), before + 1);
  assert.equal((await f.owner.query("SELECT 1 FROM workers WHERE code='BEFORE_CONFLICT'")).rowCount, 0);
  await f.store.cancel(f.first.actor, conflict.id, conflict.revision, "cancel-conflict");
  const rollback = await f.prepare([f.worker("ROLLBACK_ONE"), f.worker("ROLLBACK_TWO")]);
  await f.owner.query(`CREATE FUNCTION fixture_fail_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
    IF NEW.action='worker_import.committed' THEN RAISE EXCEPTION 'fixture audit failure'; END IF; RETURN NEW; END $$;
    CREATE TRIGGER fixture_audit_failure BEFORE INSERT ON audit_events FOR EACH ROW EXECUTE FUNCTION fixture_fail_audit()`);
  const commitsBefore = await f.count("worker_import_commits");
  await assert.rejects(f.commit(rollback), /fixture audit failure/);
  assert.equal(await f.count("workers"), before + 1); assert.equal(await f.count("worker_import_commits"), commitsBefore);
  assert.equal((await f.owner.query("SELECT 1 FROM audit_events WHERE after_json->>'code' LIKE 'ROLLBACK_%'")).rowCount, 0);
  assert.equal((await f.store.get(f.first.actor, rollback.id, "read-back")).session.state, "READY");
  assert.equal(await f.count("worker_import_staging"), 1);
  await f.owner.query("DROP TRIGGER fixture_audit_failure ON audit_events; DROP FUNCTION fixture_fail_audit()");
});

test("#237 PostgreSQL reference locks, commit SQL deadline and rollback preserve a reusable connection", options, async (t) => {
  assert.ok(url, "BSS_TEST_DATABASE_URL is required");
  const f = await importFixture(url); t.after(f.dispose);
  const s = await f.prepare([f.worker("TIMEOUT")]);
  await f.owner.query("BEGIN");
  await f.owner.query("UPDATE departments SET status='blocked', revision=revision+1 WHERE id=$1", [f.first.department]);
  try { await assert.rejects(f.commit(s), { code: "CONFLICT" }); }
  finally { await f.owner.query("ROLLBACK"); }
  assert.equal(await f.count("workers"), 0);
  // Hold a worker insert inside PostgreSQL after the service has locked its
  // references, then prove an active->blocked update cannot pass FOR SHARE.
  await f.owner.query(`CREATE FUNCTION fixture_pause_worker() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
    PERFORM pg_advisory_xact_lock(237013); RETURN NEW; END $$;
    CREATE TRIGGER fixture_pause BEFORE INSERT ON workers FOR EACH ROW EXECUTE FUNCTION fixture_pause_worker()`);
  await f.owner.query("SELECT pg_advisory_lock(237013)");
  const pending = f.commit(s);
  let waiting = false;
  try {
    for (let i = 0; i < 40; i++) {
      waiting = (await f.owner.query("SELECT 1 FROM pg_stat_activity WHERE datname=current_database() AND wait_event='advisory'")).rowCount! > 0;
      if (waiting) break;
      await delay(20);
    }
    assert.equal(waiting, true, "Commit must reach the PostgreSQL barrier");
    await withTenant(f.appPool, f.first.actor, "reference-writer", async (client) => {
      await client.query("SET LOCAL lock_timeout='100ms'");
      await assert.rejects(client.query("UPDATE shifts SET status='blocked' WHERE id=$1", [f.first.shift]), { code: "55P03" });
    });
  } finally { await f.owner.query("SELECT pg_advisory_unlock(237013)"); }
  await pending;
  await f.owner.query("DROP TRIGGER fixture_pause ON workers; DROP FUNCTION fixture_pause_worker()");
  const slow = await f.prepare([f.worker("SLOW")]);
  await f.owner.query(`CREATE FUNCTION fixture_slow_worker() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
    PERFORM pg_sleep(6); RETURN NEW; END $$;
    CREATE TRIGGER fixture_slow BEFORE INSERT ON workers FOR EACH ROW EXECUTE FUNCTION fixture_slow_worker()`);
  const started = Date.now();
  await assert.rejects(f.commit(slow), { code: "CONFLICT" });
  assert.ok(Date.now() - started < 6000, "Remaining transaction budget must cancel the six-second SQL operation");
  assert.equal((await f.owner.query("SELECT 1 FROM workers WHERE code='SLOW'")).rowCount, 0);
  assert.equal((await f.store.get(f.first.actor, slow.id, "after-timeout")).session.state, "READY");
  await f.owner.query("DROP TRIGGER fixture_slow ON workers; DROP FUNCTION fixture_slow_worker()");
  await f.commit(slow);
  assert.equal(await f.count("workers"), 2);
});

test("#237 migration 013 down guard sees hidden tenant data under NOSUPERUSER/NOBYPASSRLS owner", options, async (t) => {
  assert.ok(url, "BSS_TEST_DATABASE_URL is required");
  const f = await importFixture(url); t.after(f.dispose);
  const s = await f.prepare([f.worker("GUARD")]);
  const sql = await readFile(new URL("../../migrations/013_worker_import_foundation.down.sql", import.meta.url), "utf8");
  await f.owner.query(`GRANT CREATE ON SCHEMA public TO ${f.role}`);
  for (const table of ["worker_import_sessions", "worker_import_staging", "worker_import_commits", "worker_import_commit_workers"])
    await f.owner.query(`ALTER TABLE ${table} OWNER TO ${f.role}`);
  await f.owner.query(`ALTER FUNCTION bss_protect_worker_import_session() OWNER TO ${f.role}`);
  await f.owner.query("BEGIN");
  await f.owner.query(`SET LOCAL ROLE ${f.role}`);
  assert.equal((await f.owner.query("SELECT 1 FROM worker_import_sessions")).rowCount, 0);
  await assert.rejects(f.owner.query(sql), /Refusing to remove worker import data/);
  await f.owner.query("ROLLBACK");
  const state = await f.owner.query("SELECT relforcerowsecurity FROM pg_class WHERE relname='worker_import_sessions'");
  assert.equal(state.rows[0].relforcerowsecurity, true);
  assert.equal((await f.store.get(f.first.actor, s.id, "preserved")).session.id, s.id);
  // Empty-install rollback remains possible after authorized fixture-only purge.
  await f.store.cancel(f.first.actor, s.id, s.revision, "cancel");
  await f.age(s.id, "32 days", true); await f.store.cleanupTenant(f.first.actor, "purge");
  await f.owner.query("BEGIN"); await f.owner.query(`SET LOCAL ROLE ${f.role}`);
  await f.owner.query(sql); await f.owner.query("COMMIT");
  assert.equal((await f.owner.query("SELECT to_regclass('worker_import_sessions') AS relation")).rows[0].relation, null);
});
