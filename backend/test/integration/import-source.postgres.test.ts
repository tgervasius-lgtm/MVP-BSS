import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { withTenant } from "../../src/db/tenant.js";
import { IMPORT_POLICY } from "../../src/imports/model.js";
import { PgImportSourceStore } from "../../src/imports/pg-import-source-store.js";
import { importSourceFixture } from "../helpers/import-source-fixture.js";

const url = process.env.BSS_TEST_DATABASE_URL;
const options = { skip: !url && process.env.BSS_REQUIRE_POSTGRES_TESTS !== "true" };

test("#237 source reservation, recovery, mapping identity and atomic committed replay", options, async t => {
  assert.ok(url, "BSS_TEST_DATABASE_URL is required");
  const f = await importSourceFixture(url); t.after(f.dispose);
  const p = await f.parsed(f.source("000001", 1000));
  const s = p.session;
  assert.equal(s.state, "NEEDS_MAPPING"); assert.equal(s.revision, "2");
  const restarted = new PgImportSourceStore(f.appPool);
  const page = await restarted.source(f.first.actor, s.id, s.revision, 100, 100, "resume");
  assert.equal(page.sourceRows.length, 100); assert.equal(page.sourceRows[0]?.[0], "000001-100");
  assert.equal(page.canonicalRows, null); assert.equal(page.counts.total, 1000);
  const identity = { fileChecksum: p.table.fileChecksum, format: "csv" as const, delimiter: "," as const, policyVersion: IMPORT_POLICY.version };
  const replay = await restarted.reserve(f.first.actor, identity, p.key, "replay");
  assert.equal(replay.replayed, true); assert.equal(replay.lease, null); assert.deepEqual(replay.session, s);
  await assert.rejects(restarted.reserve(f.first.actor, { ...identity, delimiter: ";" }, p.key, "different"), { code: "CONFLICT" });
  await assert.rejects(restarted.reserve(f.first.actor, { ...identity, policyVersion: "old" }, randomUUID(), "old-policy"), { code: "CONFLICT" });
  await assert.rejects(f.store.replace(f.first.actor, s.id, s.revision, [f.worker("BYPASS")], "bypass"), { code: "CONFLICT" });
  const mapped = await restarted.map(f.first.actor, s.id, s.revision, f.mapping, "map");
  assert.equal(mapped.state, "READY"); assert.equal(mapped.revision, "3"); assert.ok(mapped.mappingChecksum);
  assert.equal(mapped.expiresAt, s.expiresAt);
  const preview = await restarted.source(f.first.actor, s.id, mapped.revision, 0, 100, "preview");
  assert.equal(preview.requiresRefresh, false); assert.equal(preview.canonicalRows?.[0]?.code, "000001-0");
  assert.equal(preview.canonicalRows?.[0]?.annualLeaveAllowance, 0);
  const approvalKey = randomUUID();
  const result = await f.commit(mapped, approvalKey);
  assert.equal(result.createdCount, 1000); assert.equal(result.mappingChecksum, mapped.mappingChecksum);
  assert.equal(await f.count("worker_import_staging"), 0); assert.equal(await f.count("workers"), 1000);
  assert.deepEqual(await restarted.commit(f.first.actor, mapped.id, mapped.revision,
    { approved: true, previewChecksum: mapped.previewChecksum! }, approvalKey, "replay-commit"), result);
  await assert.rejects(restarted.source(f.first.actor, s.id, "4", 0, 10, "purged"), { code: "CONFLICT" });
  assert.equal((await restarted.reserve(f.first.actor, identity, p.key, "replay-after-commit")).session.state, "COMMITTED");
  assert.equal(JSON.stringify(result).includes("Synthetic Person"), false);
  const audit = await f.owner.query("SELECT after_json, metadata FROM audit_events WHERE entity_type='worker_import'");
  assert.equal(JSON.stringify(audit.rows).includes("Synthetic Person"), false);
});

test("#237 invalid mappings remain recoverable; mapping and reference changes invalidate approval", options, async t => {
  assert.ok(url, "BSS_TEST_DATABASE_URL is required");
  const f = await importSourceFixture(url); t.after(f.dispose);
  const p = await f.parsed();
  const invalid = await f.sourceStore.map(f.first.actor, p.session.id, p.session.revision,
    { ...f.mapping, departments: [] }, "missing-binding");
  assert.equal(invalid.state, "INVALID"); assert.equal(invalid.previewChecksum, null);
  const page = await f.sourceStore.source(f.first.actor, invalid.id, invalid.revision, 0, 100, "invalid-preview");
  assert.equal(page.canonicalRows, null); assert.equal(page.counts.blocked, 1);
  assert.equal(page.issues[0]?.code, "REFERENCE_MAPPING_REQUIRED");
  const foreign = await f.sourceStore.map(f.first.actor, invalid.id, invalid.revision,
    { ...f.mapping, departments: [{ source: "Department", id: f.other.department }] }, "foreign-ref");
  assert.equal(foreign.state, "INVALID");
  assert.equal((await f.sourceStore.source(f.first.actor, foreign.id, foreign.revision, 0, 100, "foreign-preview")).issues[0]?.code, "REFERENCE_MISSING");
  const ready = await f.sourceStore.map(f.first.actor, foreign.id, foreign.revision, f.mapping, "correct");
  assert.equal(ready.state, "READY");
  const remapped = await f.sourceStore.map(f.first.actor, ready.id, ready.revision, f.mapping, "refresh");
  assert.equal(remapped.mappingChecksum, ready.mappingChecksum);
  await assert.rejects(f.commit(ready), { code: "STALE_REVISION" });
  await assert.rejects(f.sourceStore.source(f.first.actor, ready.id, ready.revision, 0, 10, "stale-page"), { code: "STALE_REVISION" });
  await f.owner.query("UPDATE shifts SET name='New name',revision=revision+1 WHERE id=$1", [f.first.shift]);
  assert.equal((await f.sourceStore.source(f.first.actor, remapped.id, remapped.revision, 0, 100, "stale-ref")).requiresRefresh, true);
  await assert.rejects(f.commit(remapped), { code: "STALE_REVISION" });
  const refreshed = await f.sourceStore.map(f.first.actor, remapped.id, remapped.revision, f.mapping, "refresh-ref");
  assert.notEqual(refreshed.previewChecksum, remapped.previewChecksum);
  assert.equal((await f.commit(refreshed)).createdCount, 1);
});

test("#237 parsing fences cancellation, failure, crash, quota and late publication", options, async t => {
  assert.ok(url, "BSS_TEST_DATABASE_URL is required");
  const f = await importSourceFixture(url); t.after(f.dispose);
  const a = await f.reserve();
  const identity = { fileChecksum: a.table.fileChecksum, format: "csv" as const, delimiter: "," as const, policyVersion: IMPORT_POLICY.version };
  await assert.rejects(f.sourceStore.reserve(f.first.actor, identity, a.key, "in-flight"), { code: "CONFLICT" });
  await assert.rejects(f.sourceStore.publish(f.first.actor, a.session.id, a.session.revision, randomUUID(), a.table, "wrong-lease"), { code: "CONFLICT" });
  await assert.rejects(f.sourceStore.publish(f.first.actor, a.session.id, a.session.revision, a.lease,
    { ...a.table, fileChecksum: "f".repeat(64) }, "wrong-file"), { code: "CONFLICT" });
  const b = await f.reserve(f.source("SECOND"));
  await assert.rejects(f.reserve(f.source("THIRD")), { code: "CONFLICT" });
  await assert.rejects(f.prepare([f.worker("LEGACY_QUOTA")]), { code: "CONFLICT" });
  await f.sourceStore.cancel(f.first.actor, a.session.id, a.session.revision, "cancel-parsing");
  await assert.rejects(f.sourceStore.publish(f.first.actor, a.session.id, a.session.revision, a.lease, a.table, "late"), { code: "CONFLICT" });
  await assert.rejects(f.sourceStore.fail(f.first.actor, a.session.id, a.session.revision, a.lease, "late-failure"), { code: "CONFLICT" });
  await f.age(b.session.id, "11 seconds");
  await assert.rejects(f.sourceStore.publish(f.first.actor, b.session.id, b.session.revision, b.lease, b.table, "after-crash"), { code: "CONFLICT" });
  assert.equal((await f.sourceStore.get(f.first.actor, b.session.id, "failed-readback")).session.state, "FAILED");
  const c = await f.reserve(f.source("REJECTED"));
  assert.equal((await f.sourceStore.fail(f.first.actor, c.session.id, c.session.revision, c.lease, "rejected")).state, "FAILED");
  assert.equal(await f.count("worker_import_staging"), 0); assert.equal(await f.count("workers"), 0);
  await f.age(c.session.id, "32 days", true); await f.sourceStore.cleanupTenant(f.first.actor, "retention");
  await assert.rejects(f.sourceStore.get(f.first.actor, c.session.id, "purged-metadata"), { code: "NOT_FOUND" });
});

test("#237 source privacy, tenant/Admin recovery and absolute staged-value expiry", options, async t => {
  assert.ok(url, "BSS_TEST_DATABASE_URL is required");
  const f = await importSourceFixture(url); t.after(f.dispose);
  const p = await f.parsed();
  for (const role of ["manager", "accountant", "worker"] as const) {
    const actor = { ...f.first.actor, role };
    await assert.rejects(f.sourceStore.source(actor, p.session.id, p.session.revision, 0, 100, "denied"), { code: "FORBIDDEN" });
    await assert.rejects(f.sourceStore.map(actor, p.session.id, p.session.revision, f.mapping, "denied"), { code: "FORBIDDEN" });
    await withTenant(f.appPool, actor, "rls", async client => {
      assert.equal((await client.query("SELECT source_json FROM worker_import_staging")).rowCount, 0);
    });
  }
  await assert.rejects(f.sourceStore.source(f.other.actor, p.session.id, p.session.revision, 0, 100, "foreign"), { code: "NOT_FOUND" });
  await assert.rejects(f.sourceStore.map(f.other.actor, p.session.id, p.session.revision, f.mapping, "foreign"), { code: "NOT_FOUND" });
  const admin = (await f.owner.query<{ id: string }>("INSERT INTO users(organization_id,email,role) VALUES ($1,$2,'admin') RETURNING id",
    [f.first.actor.organizationId, `${randomUUID()}@example.invalid`])).rows[0]!.id;
  const actor = { ...f.first.actor, userId: admin };
  const mapped = await f.sourceStore.map(actor, p.session.id, p.session.revision, f.mapping, "other-admin");
  assert.equal(mapped.uploaderId, f.first.actor.userId);
  await f.age(mapped.id, "25 hours");
  await assert.rejects(f.sourceStore.source(actor, mapped.id, mapped.revision, 0, 100, "expired"), { code: "CONFLICT" });
  assert.equal(await f.count("worker_import_staging"), 0);
  assert.equal((await f.sourceStore.get(actor, mapped.id, "expired-state")).session.state, "EXPIRED");
  assert.equal(await f.count("workers"), 0);
});

test("#237 equal canonical rows retain distinct mapping identity; concurrent remapping has one winner", options, async t => {
  assert.ok(url, "BSS_TEST_DATABASE_URL is required");
  const f = await importSourceFixture(url); t.after(f.dispose);
  const table = f.source(); table.rows[0]![0] = "Same Value"; table.rows[0]![1] = "Same Value";
  const p = await f.parsed(table);
  const ready = await f.sourceStore.map(f.first.actor, p.session.id, p.session.revision, f.mapping, "first-map");
  const swapped = { ...f.mapping, columns: ["name", "code", "department", "shift", "annualLeaveAllowance"] as typeof f.mapping.columns };
  const results = await Promise.allSettled([
    f.sourceStore.map(f.first.actor, ready.id, ready.revision, swapped, "map-a"),
    f.sourceStore.map(f.first.actor, ready.id, ready.revision, swapped, "map-b")
  ]);
  const winners = results.filter(r => r.status === "fulfilled");
  const losers = results.filter(r => r.status === "rejected");
  assert.equal(winners.length, 1); assert.equal(losers.length, 1);
  assert.equal(losers[0]!.reason.code, "STALE_REVISION");
  const winner = winners[0]!.value;
  assert.notEqual(winner.mappingChecksum, ready.mappingChecksum);
  assert.notEqual(winner.previewChecksum, ready.previewChecksum);
  await assert.rejects(f.store.commit(f.first.actor, winner.id, winner.revision,
    { approved: true, previewChecksum: ready.previewChecksum! }, randomUUID(), "old-checksum"), { code: "CONFLICT" });
  await f.sourceStore.cancel(f.first.actor, winner.id, winner.revision, "cancel-mapped");
  assert.equal(await f.count("worker_import_staging"), 0); assert.equal(await f.count("workers"), 0);
});

test("#237 migration 015 preserves legacy data and refuses source loss under a constrained owner", options, async t => {
  assert.ok(url, "BSS_TEST_DATABASE_URL is required");
  const f = await importSourceFixture(url); t.after(f.dispose);
  const down = await readFile(new URL("../../migrations/015_worker_import_source.down.sql", import.meta.url), "utf8");
  const up = await readFile(new URL("../../migrations/015_worker_import_source.up.sql", import.meta.url), "utf8");
  const legacy = await f.prepare([f.worker("LEGACY")]);
  await f.owner.query("BEGIN"); await f.owner.query(down); await f.owner.query("COMMIT");
  assert.equal((await f.owner.query("SELECT state FROM worker_import_sessions WHERE id=$1", [legacy.id])).rows[0].state, "READY");
  await f.owner.query("BEGIN"); await f.owner.query(up); await f.owner.query("COMMIT");
  assert.equal((await f.commit(legacy)).createdCount, 1);
  const p = await f.parsed();
  await f.owner.query(`GRANT CREATE ON SCHEMA public TO ${f.role}`);
  for (const table of ["worker_import_sessions", "worker_import_staging"])
    await f.owner.query(`ALTER TABLE ${table} OWNER TO ${f.role}`);
  await f.owner.query(`ALTER FUNCTION bss_protect_worker_import_session() OWNER TO ${f.role}`);
  await f.owner.query("BEGIN"); await f.owner.query(`SET LOCAL ROLE ${f.role}`);
  assert.equal((await f.owner.query("SELECT 1 FROM worker_import_sessions")).rowCount, 0);
  await assert.rejects(f.owner.query(down), /Refusing to remove source import data/);
  await f.owner.query("ROLLBACK");
  assert.equal((await f.owner.query("SELECT relforcerowsecurity FROM pg_class WHERE relname='worker_import_sessions'")).rows[0].relforcerowsecurity, true);
  assert.equal((await f.sourceStore.source(f.first.actor, p.session.id, p.session.revision, 0, 10, "preserved")).sourceRows.length, 1);
});
