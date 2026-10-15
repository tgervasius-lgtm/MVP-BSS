import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import pg from "pg";
import { importFixture } from "../helpers/import-fixture.js";
import { importRuntimeFixture } from "../helpers/import-runtime-fixture.js";
import { migrateUp, migrateDown } from "../../src/db/migrate.js";
import { PgImportRuntime } from "../../src/imports/runtime.js";
const url=process.env.BSS_TEST_DATABASE_URL;
const options={skip:!url&&process.env.BSS_REQUIRE_POSTGRES_TESTS!=="true"};
test("security-definer maintenance works with non-superuser owner, no PUBLIC execute, and reversible migration",options,async t=>{
  assert.ok(url);
  const f=await importFixture(url);
  const ddl=f.role+"_ddl";
  await f.owner.query(`CREATE ROLE ${ddl} NOLOGIN NOSUPERUSER NOBYPASSRLS`);
  t.after(async()=>{
    await f.owner.query("RESET ROLE").catch(()=>{});
    await f.dispose();
    const admin=new pg.Client({connectionString:url});await admin.connect();
    try{await admin.query(`DROP ROLE ${ddl}`);}finally{await admin.end();}
  });
  // Historical 001-015 use their existing privileged migration path. Only new
  // migration 016 and its definer functions are exercised under NOSUPER/NOBYPASS.
  const previousDown=process.env.BSS_ALLOW_DOWN_MIGRATIONS;
  process.env.BSS_ALLOW_DOWN_MIGRATIONS="true";
  try{await migrateDown(f.owner);}finally{if(previousDown===undefined)delete process.env.BSS_ALLOW_DOWN_MIGRATIONS;else process.env.BSS_ALLOW_DOWN_MIGRATIONS=previousDown;}
  const due=await f.prepare([f.worker("non-super")]);await f.age(due.id,"25 hours");
  await f.owner.query(`GRANT CREATE,USAGE ON SCHEMA public TO ${ddl}`);
  await f.owner.query(`GRANT REFERENCES ON organizations TO ${ddl}`);
  await f.owner.query(`GRANT SELECT,INSERT,DELETE ON bss_schema_migrations TO ${ddl}`);
  for(const table of ["worker_import_sessions","worker_import_staging","audit_events"])
    await f.owner.query(`ALTER TABLE ${table} OWNER TO ${ddl}`);
  await f.owner.query(`SET ROLE ${ddl}`);
  await migrateUp(f.owner);
  const flags=await f.owner.query("SELECT rolsuper,rolbypassrls FROM pg_roles WHERE rolname=current_user");
  assert.equal(flags.rows[0].rolsuper,false);assert.equal(flags.rows[0].rolbypassrls,false);
  assert.equal((await f.owner.query("SELECT relforcerowsecurity FROM pg_class WHERE relname='worker_import_runtime'")).rows[0].relforcerowsecurity,true);
  await f.owner.query("RESET ROLE");
  await f.owner.query(`GRANT USAGE ON SCHEMA public TO ${f.role}`);
  await assert.rejects(f.appPool.query("SELECT bss_import_cleanup()"),{code:"42501"});
  await f.owner.query(`GRANT EXECUTE ON FUNCTION bss_import_cleanup(),bss_import_healthy() TO ${f.role}`);
  assert.equal((await f.appPool.query("SELECT bss_import_cleanup() AS count")).rows[0].count,1);
  assert.equal(await f.count("worker_import_staging"),0);
  assert.equal((await f.appPool.query("SELECT bss_import_healthy() AS healthy")).rows[0].healthy,true);
  await f.owner.query(`SET ROLE ${ddl}`);
  const before=process.env.BSS_ALLOW_DOWN_MIGRATIONS;process.env.BSS_ALLOW_DOWN_MIGRATIONS="true";
  try{
    await migrateDown(f.owner);
    assert.equal((await f.owner.query("SELECT to_regclass('worker_import_runtime') AS relation")).rows[0].relation,null);
    await migrateUp(f.owner);
    assert.equal((await f.owner.query("SELECT count(*) FROM worker_import_runtime")).rows[0].count,"1");
  }finally{if(before===undefined)delete process.env.BSS_ALLOW_DOWN_MIGRATIONS;else process.env.BSS_ALLOW_DOWN_MIGRATIONS=before;await f.owner.query("RESET ROLE");}
});
test("overdue locked staging fails health closed; recurring cleanup recovers and purges tenant data",options,async t=>{
  assert.ok(url);const f=await importRuntimeFixture(url);t.after(()=>f.dispose());
  const session=await f.prepare([f.worker("expiry")]);
  await f.age(session.id,"25 hours");
  const blocker=await f.appPool.connect();
  try{
    await blocker.query("BEGIN");
    await blocker.query("SELECT set_config('bss.organization_id',$1,true),set_config('bss.actor_role','admin',true)",[f.first.actor.organizationId]);
    await blocker.query("SELECT id FROM worker_import_sessions WHERE id=$1 FOR UPDATE",[session.id]);
    await f.runtime.sweep();assert.equal(await f.runtime.healthy(),false);
    await assert.rejects(f.runtime.admit(f.first.actor,"create","overdue"),{code:"IMPORT_UNAVAILABLE"});
  }finally{await blocker.query("ROLLBACK");blocker.release();}
  t.mock.timers.enable({apis:["setInterval"]});
  // Start a fresh instance while an expired row exists: startup runs cleanup.
  const fresh=new PgImportRuntime(f.appPool,()=>{});await fresh.start();t.after(()=>fresh.stop());
  assert.equal(await f.count("worker_import_staging"),0);assert.equal(await fresh.healthy(),true);
  const next=await f.prepare([f.worker("recurring")]);
  await f.age(next.id,"25 hours");
  t.mock.timers.tick(60_000);await fresh.sweep();
  assert.equal(await f.count("worker_import_staging"),0);
  assert.equal((await f.store.get(f.first.actor,next.id,"read")).session.state,"EXPIRED");
  const audit=(await f.owner.query("SELECT after_json::text AS data FROM audit_events WHERE actor_type='system'")).rows;
  assert.ok(audit.length>=2);assert.ok(audit.every(row=>!row.data.includes("Synthetic")));
  await f.owner.query(`REVOKE EXECUTE ON FUNCTION bss_import_cleanup() FROM ${f.role}`);
  const failed=new PgImportRuntime(f.appPool,()=>{});await failed.start();t.after(()=>failed.stop());
  assert.equal(await failed.healthy(),false);await assert.rejects(failed.admit(f.first.actor,"create","failed-start"),{code:"IMPORT_UNAVAILABLE"});
});
test("concurrent tenant attempts and admissions serialize across independent coordinators",options,async t=>{
  assert.ok(url);const f=await importRuntimeFixture(url);t.after(()=>f.dispose());
  const other=new PgImportRuntime(f.appPool,()=>{});await other.start();t.after(()=>other.stop());
  const results=await Promise.allSettled(Array.from({length:15},(_,i)=>(i%2?f.runtime:other).admit(f.first.actor,"commit",randomUUID())));
  assert.equal(results.filter(r=>r.status==="fulfilled").length,10);
  assert.ok(results.filter(r=>r.status==="rejected").every(r=>r.status==="rejected"&&r.reason.code==="RATE_LIMITED"));
  const leases=await Promise.allSettled([f.runtime.admit(f.first.actor,"create","first"),other.admit(f.other.actor,"create","second")]);
  assert.equal(leases.filter(r=>r.status==="fulfilled").length,1);
});

test("016 rollback refuses live leases and nonterminal source imports",options,async t=>{
  assert.ok(url);const f=await importRuntimeFixture(url);t.after(()=>f.dispose());
  const before=process.env.BSS_ALLOW_DOWN_MIGRATIONS;process.env.BSS_ALLOW_DOWN_MIGRATIONS="true";
  try{
    const token=await f.runtime.admit(f.first.actor,"create","guard");
    await assert.rejects(migrateDown(f.owner),/Stop imports and purge/);
    await f.runtime.release(f.first.actor,token,"release");
    const {PgImportSourceStore}=await import("../../src/imports/pg-import-source-store.js");
    const {IMPORT_POLICY}=await import("../../src/imports/model.js");
    const store=new PgImportSourceStore(f.appPool);
    const pending=await store.reserve(f.first.actor,{format:"csv",delimiter:",",policyVersion:IMPORT_POLICY.version,fileChecksum:"a".repeat(64)},randomUUID(),"reserve");
    await assert.rejects(migrateDown(f.owner),/Stop imports and purge/);
    assert.equal((await store.get(f.first.actor,pending.session.id,"kept")).session.state,"PARSING");
    await store.cancel(f.first.actor,pending.session.id,pending.session.revision,"cancel");
    await f.runtime.stop();await migrateDown(f.owner);
  }finally{if(before===undefined)delete process.env.BSS_ALLOW_DOWN_MIGRATIONS;else process.env.BSS_ALLOW_DOWN_MIGRATIONS=before;}
});
test("global cleanup audit failure rolls back purge, state and heartbeat; next pass recovers",options,async t=>{
  assert.ok(url);const f=await importRuntimeFixture(url);t.after(()=>f.dispose());
  const session=await f.prepare([f.worker("audit-atomic")]);await f.age(session.id,"25 hours");
  await f.owner.query(`CREATE FUNCTION fixture_global_audit_failure() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN IF NEW.actor_type='system' THEN RAISE EXCEPTION 'Synthetic audit failure'; END IF; RETURN NEW; END $$;
    CREATE TRIGGER fixture_global_audit BEFORE INSERT ON audit_events FOR EACH ROW EXECUTE FUNCTION fixture_global_audit_failure()`);
  const stamp=(await f.owner.query("SELECT cleaned_at::text FROM worker_import_runtime")).rows[0].cleaned_at;
  await f.runtime.sweep();
  assert.equal(await f.count("worker_import_staging"),1);
  assert.equal((await f.owner.query("SELECT state FROM worker_import_sessions WHERE id=$1",[session.id])).rows[0].state,"READY");
  assert.equal((await f.owner.query("SELECT cleaned_at::text FROM worker_import_runtime")).rows[0].cleaned_at,stamp);
  assert.equal(await f.runtime.healthy(),false);assert.equal(f.events.at(-1),"cleanup_failed");
  await f.owner.query("DROP TRIGGER fixture_global_audit ON audit_events");
  await f.runtime.sweep();assert.equal(await f.count("worker_import_staging"),0);assert.equal(await f.runtime.healthy(),true);
});
