import assert from "node:assert/strict";
import test from "node:test";
import type pg from "pg";
import { PgOnboardingStore } from "../../src/onboarding/pg-onboarding-store.js";
import type { EvidenceWrite } from "../../src/onboarding/model.js";
import { evaluateSnapshot, type Snapshot } from "../../src/onboarding/evaluation.js";
import { normalizeWrite, PROFILES } from "../../src/onboarding/model.js";

function complete(): Snapshot {
  return { organization:{configured:true,timezone:"Europe/Zagreb",fingerprint:"org"},
    departments:{active:1,fingerprint:"d"},shifts:{active:1,fingerprint:"s"},holidays:{fingerprint:"h"},calendars:{fingerprint:"cal"},
    workers:{active:2,invalid:0,fingerprint:"w"},users:{admins:1,fingerprint:"u"},
    invitations:{pending:1,fingerprint:"i"},scopes:{fingerprint:"sc"},terminals:{paired:1,fingerprint:"t"},
    credentials:{fingerprint:"cr"},cards:{covered:2,fingerprint:"rf"} };
}
test("software completeness and every profile remain blocked on trusted external authority",()=>{
  const hashes=new Set<string>();
  for(const profile of PROFILES){
    const result=evaluateSnapshot(profile,complete()); hashes.add(result.configurationChecksum);
    assert.equal(result.stage,"DRY_RUN"); assert.equal(result.readyForGoLive,false);assert.equal(result.goLiveApproved,false);
    assert.deepEqual(result.softwarePrerequisites,{company:true,people:true,access:true,terminal:true});
    for(const code of ["OPERATOR_AUTHORITY_UNAVAILABLE","INDEPENDENT_DRY_RUN_UNVERIFIED","CUSTOMER_CONFIGURATION_UNVERIFIED","OPERATIONS_PRIVACY_UNVERIFIED"])
      assert.ok(result.blockers.some(value=>value.code===code));
  }
  assert.equal(hashes.size,4);
});
test("current prerequisite changes invalidate checksum and regress to the earliest missing software step",()=>{
  const original=complete(),first=evaluateSnapshot("PILOT",original);
  for(const mutate of [(s:Snapshot)=>{s.shifts.active=0;},(s:Snapshot)=>{s.workers.invalid=1;},
    (s:Snapshot)=>{s.users.admins=0;},(s:Snapshot)=>{s.cards.covered=1;},
    (s:Snapshot)=>{s.credentials.fingerprint="rotated";},(s:Snapshot)=>{s.holidays.fingerprint="changed";},(s:Snapshot)=>{s.invitations.pending=0;}]){
    const changed=structuredClone(original);mutate(changed);
    assert.notEqual(evaluateSnapshot("PILOT",changed).configurationChecksum,first.configurationChecksum);
  }
  const bad=complete();bad.organization!.timezone="Invalid/Timezone";
  assert.equal(evaluateSnapshot("PILOT",bad).stage,"COMPANY_SETUP");
  bad.organization=null;assert.equal(evaluateSnapshot("PILOT",bad).stage,"DRAFT");
});
test("evidence accepts bounded opaque references and rejects forged authority and duplicates",()=>{
  const valid={configurationChecksum:"a".repeat(64),items:[{step:"DRY_RUN",reference:" register:synthetic-1 ",note:"context"}]};
  assert.equal(normalizeWrite(valid).items[0]!.reference,"register:synthetic-1");
  for(const input of [{...valid,verified:true},{...valid,profile:"PRODUCTION"},{...valid,actorId:"fake"},
    {...valid,items:[{...valid.items[0],verification:"VERIFIED"}]},{...valid,items:[{...valid.items[0],step:"GO_LIVE_APPROVED"}]},
    {...valid,items:[{...valid.items[0],reference:"\u0000"}]},{...valid,items:[{...valid.items[0],reference:"x".repeat(501)}]},
    {...valid,items:[{...valid.items[0],note:"x".repeat(1001)}]},{...valid,items:[]},
    {...valid,items:Array.from({length:21},(_,i)=>({...valid.items[0],reference:String(i)}))},
    {...valid,items:[valid.items[0],valid.items[0]]},{...valid,configurationChecksum:"wrong"}])
    assert.throws(()=>normalizeWrite(input),{code:"VALIDATION_FAILED"});
});


test("every onboarding public entry rejects unauthorized roles as a Promise before DB or input work",async()=>{
  let connections=0;
  const pool={connect(){connections++;throw new Error("Unexpected database access");}} as unknown as pg.Pool;
  const store=new PgOnboardingStore(pool,"INTERNAL");
  const calls=(["worker","manager","accountant"] as const).flatMap(role=>{
    const actor={organizationId:"synthetic",userId:"synthetic",role,departmentIds:[],selfWorkerId:null,sessionId:"synthetic"};
    return [()=>store.get(actor,"denied"),()=>store.record(actor,"invalid",null as unknown as EvidenceWrite,"denied"),
      ()=>store.evaluate(actor,"invalid","invalid","denied")];
  });
  await Promise.all(calls.map(async call=>{
    const pending=call();assert.ok(pending instanceof Promise);await assert.rejects(pending,{code:"FORBIDDEN"});
  }));
  assert.equal(connections,0);
});
