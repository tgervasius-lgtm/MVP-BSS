import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import pg from "pg";
import { migrateDown,migrateUp } from "../../src/db/migrate.js";
import { withTenant } from "../../src/db/tenant.js";
import { PgOnboardingStore } from "../../src/onboarding/pg-onboarding-store.js";
import { loadConfig } from "../../src/config.js";
import { buildApp } from "../../src/http/app.js";
import { FakeAuthService,FakePhaseAService } from "../helpers/fakes.js";
import { onboardingFixture } from "../helpers/onboarding-fixture.js";
import { createPostgresFixture } from "../helpers/postgres-fixture.js";
const url=process.env.BSS_TEST_DATABASE_URL;
const options={skip:!url&&process.env.BSS_REQUIRE_POSTGRES_TESTS!=="true"};

test("onboarding FORCE RLS, role separation, tenant-composite foreign keys and immutable identity",options,async t=>{
  assert.ok(url);const f=await onboardingFixture(url);t.after(()=>f.dispose());
  for(const table of ["onboarding_sessions","onboarding_evidence","onboarding_evaluations"]){
    const flags=(await f.owner.query("SELECT relrowsecurity,relforcerowsecurity FROM pg_class WHERE relname=$1",[table])).rows[0]!;
    assert.equal(flags.relrowsecurity,true);assert.equal(flags.relforcerowsecurity,true);
    assert.equal((await f.appPool.query(`SELECT * FROM ${table}`)).rows.length,0);
  }
  for(const role of ["manager","worker","accountant"] as const){
    const actor={...f.first.actor,role};
    await assert.rejects(f.store.get(actor,"denied"),{code:"FORBIDDEN"});
    await assert.rejects(f.store.record(actor,"1",f.input("a".repeat(64)),"denied"),{code:"FORBIDDEN"});
    assert.equal(await withTenant(f.appPool,actor,"rls",async client=>(await client.query("SELECT id FROM onboarding_sessions")).rowCount),0);
  }
  await assert.rejects(withTenant(f.appPool,f.first.actor,"cross-tenant",async client=>client.query(`INSERT INTO onboarding_evidence
    (organization_id,session_id,step,reference,submitted_by,submitted_revision,configuration_checksum)
    VALUES($1,$2,'DRY_RUN','foreign',$3,2,$4)`,[f.first.actor.organizationId,f.first.id,f.other.actor.userId,"a".repeat(64)])),{code:"23503"});
  await assert.rejects(withTenant(f.appPool,f.first.actor,"no-provision",async client=>client.query(`INSERT INTO onboarding_sessions
    (organization_id,profile,contract_version,provisioning_reference) VALUES($1,'PRODUCTION','BSS-v1.0','forged')`,[f.first.actor.organizationId])),{code:"42501"});
  await assert.rejects(f.owner.query("UPDATE onboarding_sessions SET profile='PRODUCTION',revision=revision+1 WHERE id=$1",[f.first.id]),/identity is immutable/);
  assert.notEqual((await f.store.get(f.first.actor,"first")).id,(await f.store.get(f.other.actor,"other")).id);
});

test("onboarding persists across fresh instances, attributes submitter and never trusts a reference",options,async t=>{
  assert.ok(url);const f=await onboardingFixture(url);t.after(()=>f.dispose());
  const before=await f.store.get(f.first.actor,"before");
  const written=await f.store.record(f.first.actor,before.revision,f.input(before.configurationChecksum),"record");
  assert.equal(written.revision,"2");assert.equal(written.submittedEvidence[0]!.submittedBy,f.first.actor.userId);
  assert.equal(written.submittedEvidence[0]!.verification,"UNVERIFIED");
  const fresh=new PgOnboardingStore(f.appPool,"INTERNAL");
  const read=await fresh.get({...f.first.actor,sessionId:randomUUID()},"relogin");assert.deepEqual(read,written);
  const evaluated=await fresh.evaluate(f.first.actor,read.revision,read.configurationChecksum,"evaluate");
  assert.equal(evaluated.revision,"3");assert.equal(evaluated.readyForGoLive,false);assert.equal(evaluated.goLiveApproved,false);
  assert.equal(evaluated.revalidationRequired,false);assert.ok(evaluated.blockers.length>=4);
  await assert.rejects(fresh.record(f.first.actor,before.revision,f.input(before.configurationChecksum,"repeat"),"old"),{code:"STALE_REVISION"});
  const audit=(await f.owner.query("SELECT after_json::text AS value FROM audit_events WHERE entity_type='onboarding'")).rows;
  assert.equal(audit.length,2);assert.ok(audit.every(row=>!row.value.includes("Synthetic proof note")&&!row.value.includes("register:")));
  assert.equal((await f.owner.query("SELECT count(*) FROM onboarding_evaluations")).rows[0].count,"1");
  await assert.rejects(f.owner.query("UPDATE onboarding_evidence SET reference='changed'"),/onboarding_evidence is append-only/);
  await assert.rejects(f.owner.query("DELETE FROM onboarding_evaluations"),/onboarding_evaluations is append-only/);
  assert.deepEqual(await fresh.get(f.first.actor,"unchanged-history"),evaluated);
});

test("live prerequisite edits invalidate evaluation and submitted evidence without rewriting history",options,async t=>{
  assert.ok(url);const f=await onboardingFixture(url);t.after(()=>f.dispose());
  const before=await f.store.get(f.first.actor,"before"),write=await f.store.record(f.first.actor,before.revision,f.input(before.configurationChecksum),"record");
  const evaluated=await f.store.evaluate(f.first.actor,write.revision,write.configurationChecksum,"evaluate");
  await f.owner.query("UPDATE shifts SET status='blocked',revision=revision+1 WHERE id=$1",[f.first.shift]);
  const after=await f.store.get(f.first.actor,"changed");
  assert.equal(after.revision,evaluated.revision);assert.notEqual(after.configurationChecksum,evaluated.configurationChecksum);
  assert.equal(after.revalidationRequired,true);assert.equal(after.submittedEvidence[0]!.stale,true);assert.equal(after.stage,"COMPANY_SETUP");
  assert.equal(after.submittedEvidence[0]!.configurationChecksum,before.configurationChecksum);
  await assert.rejects(f.store.evaluate(f.first.actor,after.revision,evaluated.configurationChecksum,"stale-config"),{code:"CONFLICT"});
  assert.equal((await f.owner.query("SELECT count(*) FROM onboarding_evaluations")).rows[0].count,"1");
  const next=await f.store.record(f.first.actor,after.revision,f.input(after.configurationChecksum,"register:new-configuration"),"new-ref");
  assert.equal(next.evaluatedAt,null);assert.equal(next.revalidationRequired,true);
});

test("concurrent Admin writes have one winner and bounded evidence never partially appends",options,async t=>{
  assert.ok(url);const f=await onboardingFixture(url);t.after(()=>f.dispose());
  const before=await f.store.get(f.first.actor,"before");
  const results=await Promise.allSettled([f.store.record(f.first.actor,before.revision,f.input(before.configurationChecksum,"race:a"),"a"),
    new PgOnboardingStore(f.appPool,"INTERNAL").record(f.first.actor,before.revision,f.input(before.configurationChecksum,"race:b"),"b")]);
  assert.equal(results.filter(value=>value.status==="fulfilled").length,1);
  assert.ok(results.some(value=>value.status==="rejected"&&value.reason.code==="STALE_REVISION"));
  let current=await f.store.get(f.first.actor,"after-race");
  for(let start=1;start<100;start+=20){
    const items=Array.from({length:Math.min(20,100-start)},(_,i)=>({step:"DRY_RUN" as const,reference:"cap:"+(start+i)}));
    current=await f.store.record(f.first.actor,current.revision,{configurationChecksum:current.configurationChecksum,items},"fill");
  }
  assert.equal(current.submittedEvidence.length,100);
  await assert.rejects(f.store.record(f.first.actor,current.revision,f.input(current.configurationChecksum,"overflow"),"overflow"),{code:"CONFLICT"});
  const final=await f.store.get(f.first.actor,"final");assert.equal(final.revision,current.revision);assert.equal(final.submittedEvidence.length,100);
});

test("audit failure rolls back evidence, evaluation and revision atomically",options,async t=>{
  assert.ok(url);const f=await onboardingFixture(url);t.after(()=>f.dispose());
  const before=await f.store.get(f.first.actor,"before");
  await f.owner.query(`REVOKE INSERT ON audit_events FROM ${f.role}`);
  await assert.rejects(f.store.record(f.first.actor,before.revision,f.input(before.configurationChecksum),"failed-record"),{code:"42501"});
  await assert.rejects(f.store.evaluate(f.first.actor,before.revision,before.configurationChecksum,"failed-evaluation"),{code:"42501"});
  const after=await f.store.get(f.first.actor,"after");assert.deepEqual(after,before);
  assert.equal((await f.owner.query("SELECT count(*) FROM onboarding_evaluations")).rows[0].count,"0");
});

test("profile-specific identity cannot promote internal data and missing provisioning is 404",options,async t=>{
  assert.ok(url);const f=await onboardingFixture(url);t.after(()=>f.dispose());
  const pilot=new PgOnboardingStore(f.appPool,"PILOT");await assert.rejects(pilot.get(f.first.actor,"missing"),{code:"NOT_FOUND"});
  await f.owner.query(`INSERT INTO onboarding_sessions(organization_id,profile,contract_version,provisioning_reference)
    VALUES($1,'PILOT','BSS-v1.0','SYNTHETIC-SEPARATE-IDENTITY')`,[f.first.actor.organizationId]);
  const internal=await f.store.get(f.first.actor,"internal");
  await f.store.record(f.first.actor,internal.revision,f.input(internal.configurationChecksum),"internal-evidence");
  const read=await pilot.get(f.first.actor,"pilot");assert.notEqual(read.id,internal.id);
  assert.notEqual(read.configurationChecksum,internal.configurationChecksum);assert.equal(read.submittedEvidence.length,0);
  assert.equal(read.readyForGoLive,false);
});

test("018 clean upgrade/down/up is reversible only before durable onboarding exists",options,async t=>{
  assert.ok(url);const f=await createPostgresFixture(url,"onboard_down");t.after(()=>f.dispose());
  await migrateUp(f.owner);
  const before=process.env.BSS_ALLOW_DOWN_MIGRATIONS;process.env.BSS_ALLOW_DOWN_MIGRATIONS="true";
  try{
    await migrateDown(f.owner);assert.equal((await f.owner.query("SELECT to_regclass('onboarding_sessions') AS value")).rows[0].value,null);
    await migrateUp(f.owner);
    const org=(await f.owner.query("INSERT INTO organizations(name) VALUES('Synthetic down fixture') RETURNING id")).rows[0].id;
    await f.owner.query(`INSERT INTO onboarding_sessions(organization_id,profile,contract_version,provisioning_reference)
      VALUES($1,'INTERNAL','BSS-v1.0','SYNTHETIC')`,[org]);
    await assert.rejects(migrateDown(f.owner),/Preserve onboarding evidence/);
    assert.equal((await f.owner.query("SELECT count(*) FROM onboarding_sessions")).rows[0].count,"1");
  }finally{if(before===undefined)delete process.env.BSS_ALLOW_DOWN_MIGRATIONS;else process.env.BSS_ALLOW_DOWN_MIGRATIONS=before;}
});

test("HTTP onboarding real PG survives lost response/relogin, denies foreign roles and cannot approve",options,async t=>{
  assert.ok(url);const f=await onboardingFixture(url);t.after(()=>f.dispose());
  class FixtureAuth extends FakeAuthService {
    override async resolveAccessToken(token:string){const base=await super.resolveAccessToken(token==="other"?"admin":token);
      return {...base,actor:{...(token==="other"?f.other.actor:f.first.actor),role:base.actor.role}};}
  }
  const config=loadConfig({NODE_ENV:"test",PUBLIC_ORIGIN:"http://localhost:3000",DATABASE_URL:"postgres://unused",LOG_LEVEL:"silent"});
  const app=await buildApp({config,authService:new FixtureAuth(),phaseAService:new FakePhaseAService(),onboarding:f.store,logger:false});t.after(()=>app.close());
  const get={url:"/api/v1/onboarding",cookies:{bss_session:"admin"}};
  const current=await app.inject(get);assert.equal(current.statusCode,200);
  const body=current.json(),write={method:"PATCH" as const,url:"/api/v1/onboarding/evidence",cookies:get.cookies,
    headers:{origin:config.publicOrigin,"if-match":current.headers.etag as string},payload:f.input(body.configurationChecksum)};
  await app.inject(write); // deliberately ignore the successful response
  const resumed=await app.inject(get);assert.equal(resumed.json().submittedEvidence.length,1);assert.equal(resumed.headers.etag,'"2"');
  assert.equal((await app.inject(write)).statusCode,409);
  assert.equal((await app.inject({...get,cookies:{bss_session:"other"}})).json().submittedEvidence.length,0);
  for(const role of ["worker","manager","accountant"])assert.equal((await app.inject({...get,cookies:{bss_session:role}})).statusCode,403);
  assert.equal((await app.inject({...write,headers:{...write.headers,"if-match":'"2"'},payload:{...write.payload,approved:true}})).statusCode,422);
  assert.equal((await app.inject({...write,url:"/api/v1/onboarding/approve",method:"POST",payload:{approved:true}})).statusCode,404);
  assert.equal(resumed.json().goLiveApproved,false);assert.equal(resumed.headers["cache-control"],"no-store, private");
});


test("018 non-bypass migration owner sees retained rows and cannot down-migrate them",options,async t=>{
  assert.ok(url);const f=await createPostgresFixture(url,"onboard_owner");
  const ddl=f.role+"_ddl";let created=false,ownerName=ddl;
  t.after(async()=>{
    await f.owner.query("RESET ROLE").catch(()=>{});await f.dispose();
    if(created){const admin=new pg.Client({connectionString:url});await admin.connect();
      try{await admin.query(`DROP ROLE ${ownerName}`);}finally{await admin.end();}}
  });
  await migrateUp(f.owner);
  const before=process.env.BSS_ALLOW_DOWN_MIGRATIONS;process.env.BSS_ALLOW_DOWN_MIGRATIONS="true";
  try{
    await migrateDown(f.owner);
    await f.owner.query(`CREATE ROLE ${ddl} NOLOGIN NOSUPERUSER NOBYPASSRLS`);created=true;
    await f.owner.query(`GRANT CREATE,USAGE ON SCHEMA public TO ${ddl}`);
    await f.owner.query(`GRANT REFERENCES ON organizations,users TO ${ddl}`);
    await f.owner.query(`GRANT SELECT,INSERT,DELETE ON bss_schema_migrations TO ${ddl}`);
    await f.owner.query(`SET ROLE ${ddl}`);await migrateUp(f.owner);
    const flags=(await f.owner.query("SELECT rolsuper,rolbypassrls FROM pg_roles WHERE rolname=current_user")).rows[0];
    assert.equal(flags.rolsuper,false);assert.equal(flags.rolbypassrls,false);
    await f.owner.query("RESET ROLE");
    const org=(await f.owner.query("INSERT INTO organizations(name) VALUES('Synthetic guarded down') RETURNING id")).rows[0].id;
    await f.owner.query(`INSERT INTO onboarding_sessions(organization_id,profile,contract_version,provisioning_reference)
      VALUES($1,'INTERNAL','BSS-v1.0','SYNTHETIC-RETAINED')`,[org]);
    await f.owner.query(`SET ROLE ${ddl}`);
    assert.equal((await f.owner.query("SELECT count(*) FROM onboarding_sessions")).rows[0].count,"1");
    await assert.rejects(migrateDown(f.owner),/Preserve onboarding evidence/);
    assert.equal((await f.owner.query("SELECT count(*) FROM onboarding_sessions")).rows[0].count,"1");
    await f.owner.query("RESET ROLE");
    const renamed=ddl+"_new";await f.owner.query(`ALTER ROLE ${ddl} RENAME TO ${renamed}`);ownerName=renamed;
    await f.owner.query(`SET ROLE ${renamed}`);
    assert.equal((await f.owner.query("SELECT count(*) FROM onboarding_sessions")).rows[0].count,"1");
    await assert.rejects(migrateDown(f.owner),/Preserve onboarding evidence/);
  }finally{
    await f.owner.query("RESET ROLE");
    if(before===undefined)delete process.env.BSS_ALLOW_DOWN_MIGRATIONS;else process.env.BSS_ALLOW_DOWN_MIGRATIONS=before;
  }
});
