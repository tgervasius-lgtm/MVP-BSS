import assert from "node:assert/strict";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import test from "node:test";
import { importRuntimeFixture } from "../helpers/import-runtime-fixture.js";
import { PgImportRuntime } from "../../src/imports/runtime.js";
import { WorkerImportApi } from "../../src/imports/api-service.js";
import { PgImportSourceStore } from "../../src/imports/pg-import-source-store.js";
import { IMPORT_POLICY } from "../../src/imports/model.js";
import { TABULAR_VERSION, type ParsedTable } from "../../src/imports/tabular-parser.js";
const url = process.env.BSS_TEST_DATABASE_URL;
const options = { skip: !url && process.env.BSS_REQUIRE_POSTGRES_TESTS !== "true", timeout: 15_000 };
const input = { format: "csv" as const, delimiter: "," as const, policyVersion: IMPORT_POLICY.version };
function table(bytes: Buffer): ParsedTable {
  return { version: TABULAR_VERSION, fileChecksum: createHash("sha256").update(bytes).digest("hex"),
    headers: ["Code", "Name", "Department", "Shift", "Days"], rows: [["A1", "Synthetic Person", "Department", "Day", "0"]] };
}
function gate() {
  let resolve!: () => void;
  const promise = new Promise<void>(r => { resolve = r; });
  return { promise, resolve };
}
test("expired or replaced admission cannot start a parser after reservation", options, async t => {
  assert.ok(url); const f = await importRuntimeFixture(url); t.after(() => f.dispose());
  let calls = 0;
  const api = new WorkerImportApi(new PgImportSourceStore(f.appPool), f.runtime, randomBytes(32), async bytes => { calls++; return table(bytes); });
  const old = await f.runtime.admit(f.first.actor, "create", "old");
  await f.owner.query("UPDATE worker_import_runtime SET lease_expires_at=clock_timestamp()-interval '1 second'");
  await assert.rejects(api.create(f.first.actor, Buffer.from("fixture"), input, randomUUID(), old, new AbortController().signal, "expired"), { code: "IMPORT_UNAVAILABLE" });
  assert.equal(calls, 0);
  const replacement = await f.runtime.admit(f.other.actor, "create", "replacement");
  await assert.rejects(api.create(f.first.actor, Buffer.from("fixture"), input, randomUUID(), old, new AbortController().signal, "replaced"), { code: "IMPORT_UNAVAILABLE" });
  assert.equal(calls, 0);
  assert.equal(await f.count("worker_import_staging"), 0);
  await f.runtime.release(f.other.actor, replacement, "done");
});
test("an expired in-flight parser retains the global mutex across independent instances", options, async t => {
  assert.ok(url); const f = await importRuntimeFixture(url);
  const other = new PgImportRuntime(f.appPool, () => {}); await other.start();
  const entered = gate(), close = gate();
  t.after(() => { close.resolve(); });
  const token = await f.runtime.admit(f.first.actor, "create", "first");
  const pending = f.runtime.parse(f.first.actor, token, new AbortController().signal, "parsing", async () => {
    entered.resolve(); await close.promise; return "closed";
  }).then(() => null, error => error.code);
  t.after(async () => { close.resolve(); await pending; await other.stop(); await f.dispose(); });
  await entered.promise;
  await f.owner.query("UPDATE worker_import_runtime SET lease_expires_at=clock_timestamp()-interval '1 second'");
  const replacement = await other.admit(f.other.actor, "create", "replacement");
  let replacementStarted = false;
  await assert.rejects(other.parse(f.other.actor, replacement, new AbortController().signal, "blocked",
    async () => { replacementStarted = true; }), { code: "IMPORT_UNAVAILABLE" });
  assert.equal(replacementStarted, false);
  close.resolve(); assert.equal(await pending, "IMPORT_UNAVAILABLE");
  assert.equal(await other.parse(f.other.actor, replacement, new AbortController().signal, "after-close", async () => "ok"), "ok");
  await other.release(f.other.actor, replacement, "done");
});
test("DB remaining budget aborts work but never unlocks before parser settlement", options, async t => {
  assert.ok(url); const f = await importRuntimeFixture(url);
  const entered = gate(), aborted = gate(), close = gate();
  const token = await f.runtime.admit(f.first.actor, "create", "budget");
  await f.owner.query("UPDATE worker_import_runtime SET lease_expires_at=clock_timestamp()+interval '1 second'");
  const pending = f.runtime.parse(f.first.actor, token, new AbortController().signal, "deadline", async signal => {
    signal.addEventListener("abort", aborted.resolve, { once: true }); entered.resolve();
    await close.promise; return "late";
  }).then(() => null, error => error.code);
  t.after(async () => { close.resolve(); await pending; await f.dispose(); });
  await entered.promise; await aborted.promise;
  // Conservative client deadline can precede DB expiry by the round trip.
  await f.owner.query("UPDATE worker_import_runtime SET lease_expires_at=clock_timestamp()-interval '1 second'");
  const replacement = await f.runtime.admit(f.other.actor, "create", "replacement");
  await assert.rejects(f.runtime.parse(f.other.actor, replacement, new AbortController().signal, "still-closing", async () => "unexpected"), { code: "IMPORT_UNAVAILABLE" });
  close.resolve(); assert.equal(await pending, "IMPORT_UNAVAILABLE");
  assert.equal(await f.runtime.parse(f.other.actor, replacement, new AbortController().signal, "closed", async () => "ok"), "ok");
  await f.runtime.release(f.other.actor, replacement, "done");
});
test("parser budget is private, tenant-bound and refuses non-Admin DB context", options, async t => {
  assert.ok(url); const f = await importRuntimeFixture(url); t.after(() => f.dispose());
  const token = await f.runtime.admit(f.first.actor, "create", "owner");
  const client = await f.appPool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT set_config('bss.organization_id',$1,true),set_config('bss.actor_role','admin',true)", [f.other.actor.organizationId]);
    assert.equal((await client.query("SELECT bss_import_parser_budget($1) AS budget", [token])).rows[0].budget, 0);
    await client.query("SELECT set_config('bss.actor_role','manager',true)");
    await assert.rejects(client.query("SELECT bss_import_parser_budget($1)", [token]), { code: "42501" });
  } finally { await client.query("ROLLBACK"); client.release(); }
  await f.runtime.release(f.first.actor, token, "done");
});

test("017 rollback refuses a still-running parser even after admission expires", options, async t => {
  assert.ok(url); const f = await importRuntimeFixture(url);
  const entered = gate(), close = gate();
  let pending: Promise<unknown> | undefined;
  t.after(async () => { close.resolve(); await pending; await f.dispose(); });
  const token = await f.runtime.admit(f.first.actor, "create", "rollback");
  pending = f.runtime.parse(f.first.actor, token, new AbortController().signal, "held", async () => {
    entered.resolve(); await close.promise;
  }).catch(error => error.code);
  await entered.promise;
  await f.owner.query("UPDATE worker_import_runtime SET lease_expires_at=clock_timestamp()-interval '1 second'");
  const { migrateDown, migrateUp } = await import("../../src/db/migrate.js");
  const before = process.env.BSS_ALLOW_DOWN_MIGRATIONS; process.env.BSS_ALLOW_DOWN_MIGRATIONS = "true";
  try {
    // 018 is empty here; then exercise the original held-parser 017 guard.
    await migrateDown(f.owner);
    await assert.rejects(migrateDown(f.owner), /Stop imports and purge/);
    close.resolve(); assert.equal(await pending, "IMPORT_UNAVAILABLE");
    await migrateDown(f.owner);
    assert.equal((await f.owner.query("SELECT to_regprocedure('bss_import_parser_budget(uuid)') AS fn")).rows[0].fn, null);
    await migrateUp(f.owner);
  } finally {
    if (before === undefined) delete process.env.BSS_ALLOW_DOWN_MIGRATIONS; else process.env.BSS_ALLOW_DOWN_MIGRATIONS = before;
  }
});
