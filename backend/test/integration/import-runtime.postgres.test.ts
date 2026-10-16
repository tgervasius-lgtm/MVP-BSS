import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import test from "node:test";
import { importFixture } from "../helpers/import-fixture.js";
import { PgImportRuntime } from "../../src/imports/runtime.js";
import { WorkerImportApi } from "../../src/imports/api-service.js";
import { PgImportSourceStore } from "../../src/imports/pg-import-source-store.js";
import { IMPORT_POLICY } from "../../src/imports/model.js";
import { TABULAR_VERSION, type ParsedTable } from "../../src/imports/tabular-parser.js";

const url = process.env.BSS_TEST_DATABASE_URL;
const options = { skip: !url && process.env.BSS_REQUIRE_POSTGRES_TESTS !== "true" };
async function fixture() {
  assert.ok(url, "An explicit disposable PostgreSQL target is required");
  const f = await importFixture(url);
  await f.owner.query(`GRANT EXECUTE ON FUNCTION bss_import_healthy(),bss_import_admit(text,uuid),
    bss_import_lease(uuid,text),bss_import_cleanup(),bss_import_parser_budget(uuid) TO ${f.role}`);
  const events: string[] = [];
  const runtime = new PgImportRuntime(f.appPool, event => { events.push(event); });
  await runtime.start();
  return { ...f, runtime, events, dispose: async () => { await runtime.stop(); await f.dispose(); } };
}
test("deployment admission, durable separate rolling attempts and FORCE RLS deny runtime table access", options, async t => {
  const f = await fixture(); t.after(() => f.dispose());
  assert.equal(await f.runtime.healthy(), true); assert.deepEqual(f.events, ["cleanup_ok"]);
  const second = new PgImportRuntime(f.appPool, () => {}); await second.start(); t.after(() => second.stop());
  const token = await f.runtime.admit(f.first.actor, "create", "one");
  await assert.rejects(second.admit(f.other.actor, "create", "other"), { code: "IMPORT_UNAVAILABLE" });
  // Direct table grants do not defeat RLS; no rows/global ownership become visible.
  await f.owner.query(`GRANT SELECT,UPDATE ON worker_import_runtime TO ${f.role}`);
  assert.equal((await f.appPool.query("SELECT * FROM worker_import_runtime")).rowCount, 0);
  assert.equal((await f.appPool.query("UPDATE worker_import_runtime SET lease_token=NULL")).rowCount, 0);
  await assert.rejects(second.admit({ ...f.first.actor, role: "manager" }, "create", "role"), { code: "FORBIDDEN" });
  await f.runtime.release(f.other.actor, token, "foreign-release");
  await assert.rejects(second.admit(f.other.actor, "create", "still-busy"), { code: "IMPORT_UNAVAILABLE" });
  await f.runtime.release(f.first.actor, token, "release");
  const next = await second.admit(f.other.actor, "create", "next");
  await second.release(f.other.actor, next, "release-next");
  // A separate coordinator and restarts see the same tenant/operation attempts.
  for (let i=0;i<10;i++) await second.admit(f.first.actor, "commit", "attempt");
  await assert.rejects(f.runtime.admit(f.first.actor, "commit", "eleven"), { code: "RATE_LIMITED" });
  const create = await f.runtime.admit(f.first.actor, "create", "independent");
  await f.runtime.release(f.first.actor, create, "done");
  await f.owner.query("UPDATE worker_import_attempts SET attempts=ARRAY[clock_timestamp()-interval '61 seconds'],last_attempt_at=clock_timestamp()-interval '61 seconds' WHERE organization_id=$1 AND operation='commit'", [f.first.actor.organizationId]);
  await f.runtime.admit(f.first.actor, "commit", "window-reset");
});
test("expired global leases cannot publish or release a replacement; cleanup health fails closed", options, async t => {
  const f = await fixture(); t.after(() => f.dispose());
  const store = new PgImportSourceStore(f.appPool);
  const rows = [["A1","Synthetic Person","Department","Day","0"]];
  const bytes = Buffer.from("synthetic");
  const { createHash } = await import("node:crypto");
  const source: ParsedTable = { version: TABULAR_VERSION, fileChecksum: createHash("sha256").update(bytes).digest("hex"),
    headers: ["Code","Name","Department","Shift","Days"], rows };
  const token = await f.runtime.admit(f.first.actor, "create", "create");
  const reserved = await store.reserve(f.first.actor, { fileChecksum: source.fileChecksum, format: "csv", delimiter: ",", policyVersion: IMPORT_POLICY.version }, randomUUID(), "reserve");
  await f.owner.query("UPDATE worker_import_runtime SET lease_expires_at=clock_timestamp()-interval '1 second'");
  const replacement = await f.runtime.admit(f.other.actor, "create", "replacement");
  await assert.rejects(store.publish(f.first.actor, reserved.session.id, reserved.session.revision, reserved.lease!, source, "late", token), { code: "IMPORT_UNAVAILABLE" });
  await f.runtime.release(f.first.actor, token, "stale-release");
  await assert.rejects(f.runtime.admit(f.first.actor, "create", "held"), { code: "IMPORT_UNAVAILABLE" });
  await f.runtime.release(f.other.actor, replacement, "release");
  await f.age(reserved.session.id, "11 seconds");
  await f.owner.query("UPDATE worker_import_runtime SET cleaned_at=clock_timestamp()-interval '301 seconds'");
  assert.equal(await f.runtime.healthy(), false);
  await assert.rejects(f.runtime.admit(f.first.actor, "create", "unhealthy"), { code: "IMPORT_UNAVAILABLE" });
  await f.runtime.sweep();
  assert.equal((await store.get(f.first.actor, reserved.session.id, "get")).session.state, "FAILED");
  assert.equal(await f.runtime.healthy(), true);
  const audit = (await f.owner.query("SELECT actor_type,actor_id,after_json FROM audit_events WHERE action='worker_import.failed'")).rows;
  assert.equal(audit.length, 1); assert.equal(audit[0].actor_type, "system"); assert.equal(audit[0].actor_id, null);
});
test("API orchestration stages only parsed values, binds cursors and preserves atomic commit/replay after purge", options, async t => {
  const f = await fixture(); t.after(() => f.dispose());
  const store = new PgImportSourceStore(f.appPool);
  const parser = async (bytes: Buffer): Promise<ParsedTable> => {
    const { createHash } = await import("node:crypto");
    return { version: TABULAR_VERSION, fileChecksum: createHash("sha256").update(bytes).digest("hex"),
      headers: ["Code","Name","Department","Shift","Days"], rows: [["A1","Synthetic Person","Department","Day","0"],["A2","Synthetic Person","Department","Day","0"]] };
  };
  const api = new WorkerImportApi(store, f.runtime, randomBytes(32), parser);
  const token = await f.runtime.admit(f.first.actor, "create", "create");
  const created = await api.create(f.first.actor, Buffer.from("fixture"), { format: "csv", delimiter: ",", policyVersion: IMPORT_POLICY.version }, randomUUID(), token, new AbortController().signal, "create");
  await f.runtime.release(f.first.actor, token, "release");
  const initial = await api.rows(f.first.actor, created.session.id, created.session.revision, 1, undefined, "source");
  assert.ok(initial.nextCursor);
  await assert.rejects(api.rows(f.other.actor, created.session.id, created.session.revision, 1, initial.nextCursor!, "foreign"), { code: "VALIDATION_FAILED" });
  await assert.rejects(api.rows(f.first.actor, created.session.id, created.session.revision, 1, initial.nextCursor! + "x", "altered"), { code: "VALIDATION_FAILED" });
  assert.equal((await api.rows(f.first.actor, created.session.id, created.session.revision, 1, initial.nextCursor!, "next")).sourceRows.length, 1);
  const mapped = await store.map(f.first.actor, created.session.id, created.session.revision, {
    columns: ["code","name","department","shift","annualLeaveAllowance"], departments: [{source:"Department",id:f.first.department}],
    shifts: [{source:"Day",id:f.first.shift}] }, "map");
  await assert.rejects(api.rows(f.first.actor, mapped.id, mapped.revision, 1, initial.nextCursor!, "stale"), { code: "VALIDATION_FAILED" });
  assert.equal(mapped.state, "READY");
  const commitKey = randomUUID(), approval = { approved: true as const, previewChecksum: mapped.previewChecksum! };
  const result = await store.commit(f.first.actor, mapped.id, mapped.revision, approval, commitKey, "commit");
  assert.equal(result.createdCount, 2);
  assert.deepEqual(await store.commit(f.first.actor, mapped.id, mapped.revision, approval, commitKey, "replay"), result);
  assert.equal(await f.count("worker_import_staging"), 0);
  await assert.rejects(api.rows(f.first.actor, mapped.id, mapped.revision, 1, undefined, "purged"), { code: "IMPORT_DATA_PURGED" });
});

test("global admission expiry during a staged write rolls back publication",options,async t=>{
  const f=await fixture();t.after(()=>f.dispose());
  const store=new PgImportSourceStore(f.appPool);
  const table:ParsedTable={version:TABULAR_VERSION,fileChecksum:"a".repeat(64),headers:["Code","Name","Department","Shift","Days"],rows:[["A1","Synthetic Person","Department","Day","0"]]};
  const token=await f.runtime.admit(f.first.actor,"create","delayed-global");
  const reserved=await store.reserve(f.first.actor,{fileChecksum:table.fileChecksum,format:"csv",delimiter:",",policyVersion:IMPORT_POLICY.version},randomUUID(),"reserve");
  await f.owner.query(`CREATE FUNCTION fixture_global_insert_delay() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN PERFORM pg_sleep(1.5);RETURN NEW;END $$;
    CREATE TRIGGER fixture_global_insert BEFORE INSERT ON worker_import_staging FOR EACH ROW EXECUTE FUNCTION fixture_global_insert_delay()`);
  await f.owner.query("UPDATE worker_import_runtime SET lease_expires_at=clock_timestamp()+interval '500 milliseconds'");
  await assert.rejects(store.publish(f.first.actor,reserved.session.id,reserved.session.revision,reserved.lease!,table,"during-expiry",token),{code:"IMPORT_UNAVAILABLE"});
  assert.equal(await f.count("worker_import_staging"),0);
  assert.equal((await store.get(f.first.actor,reserved.session.id,"unpublished")).session.state,"PARSING");
});
