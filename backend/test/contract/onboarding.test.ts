import assert from "node:assert/strict";
import test from "node:test";
import { loadConfig } from "../../src/config.js";
import { buildApp } from "../../src/http/app.js";
import type { Onboarding, OnboardingService } from "../../src/onboarding/model.js";
import { AppError } from "../../src/domain/errors.js";
import { FakeAuthService, FakePhaseAService } from "../helpers/fakes.js";
const config=loadConfig({NODE_ENV:"test",PUBLIC_ORIGIN:"http://localhost:3000",DATABASE_URL:"postgres://unused",LOG_LEVEL:"silent"});
const paths=[{method:"GET" as const,url:"/api/v1/onboarding"},{method:"PATCH" as const,url:"/api/v1/onboarding/evidence"},
  {method:"POST" as const,url:"/api/v1/onboarding/evaluate"}];
const checksum="a".repeat(64),headers={origin:config.publicOrigin,"if-match":'"1"'};
const payload={configurationChecksum:checksum,items:[{step:"DRY_RUN",reference:"fixture:proof"}]};
const state:Onboarding={id:"2aa7bca0-965e-47c8-bef6-e21a2d7debe2",revision:"1",profile:"INTERNAL",contractVersion:"BSS-v1.0",
  stage:"DRY_RUN",configurationChecksum:checksum,evaluatedConfigurationChecksum:null,evaluatedAt:null,revalidationRequired:true,
  readyForGoLive:false,goLiveApproved:false,softwarePrerequisites:{company:true,people:true,access:true,terminal:true},
  blockers:[{step:"DRY_RUN",code:"OPERATOR_AUTHORITY_UNAVAILABLE",message:"Nije dostupno."}],submittedEvidence:[]};
test("all onboarding routes authenticate and deny roles/origins before disabled service or body",async t=>{
  const app=await buildApp({config,authService:new FakeAuthService(),phaseAService:new FakePhaseAService(),logger:false});t.after(()=>app.close());
  for(const path of paths){
    const request={...path,headers,...(path.method==="GET"?{}:{payload:path.method==="PATCH"?payload:{configurationChecksum:checksum}})};
    assert.equal((await app.inject(request)).statusCode,401);
    for(const role of ["worker","manager","accountant"])assert.equal((await app.inject({...request,cookies:{bss_session:role}})).statusCode,403);
    const disabled=await app.inject({...request,cookies:{bss_session:"admin"}});
    assert.equal(disabled.statusCode,503);assert.equal(disabled.json().code,"ONBOARDING_UNAVAILABLE");
    assert.equal(disabled.headers["cache-control"],"no-store, private");assert.equal(disabled.headers["retry-after"],"60");
    if(path.method!=="GET")assert.equal((await app.inject({...request,cookies:{bss_session:"admin"},headers:{...headers,origin:"https://foreign.invalid"}})).statusCode,403);
  }
  assert.equal((await app.inject({method:"PATCH",url:paths[1]!.url,cookies:{bss_session:"worker"},headers:{...headers,"content-type":"application/json"},payload:"{bad"})).statusCode,403);
  assert.equal((await app.inject({method:"POST",url:"/api/v1/onboarding/approve",cookies:{bss_session:"admin"},headers,payload:{approved:true}})).statusCode,404);
});
test("onboarding API binds verified actor, revision and reviewed checksum; no client authority accepted",async t=>{
  let calls=0;
  const service:OnboardingService={
    async get(actor){assert.equal(actor.role,"admin");calls++;return state;},
    async record(actor,revision,input){assert.equal(actor.role,"admin");assert.equal(revision,"1");assert.deepEqual(input,payload);calls++;return {...state,revision:"2"};},
    async evaluate(actor,revision,value){assert.equal(actor.role,"admin");assert.equal(revision,"1");assert.equal(value,checksum);calls++;return {...state,revision:"2"};}
  };
  const app=await buildApp({config,authService:new FakeAuthService(),phaseAService:new FakePhaseAService(),onboarding:service,logger:false});t.after(()=>app.close());
  const read=await app.inject({...paths[0]!,cookies:{bss_session:"admin"}});assert.equal(read.statusCode,200);assert.equal(read.headers.etag,'"1"');
  const write={...paths[1]!,cookies:{bss_session:"admin"},headers,payload};
  assert.equal((await app.inject(write)).headers.etag,'"2"');
  assert.equal((await app.inject({...paths[2]!,cookies:{bss_session:"admin"},headers,payload:{configurationChecksum:checksum}})).statusCode,200);
  assert.equal(calls,3);
  for(const changed of [{...payload,approved:true},{...payload,profile:"PRODUCTION"},{...payload,tenantId:"other"},
    {...payload,items:[{...payload.items[0],verified:true}]}])assert.equal((await app.inject({...write,payload:changed})).statusCode,422);
  assert.equal((await app.inject({...write,headers:{origin:config.publicOrigin}})).statusCode,422);
  assert.equal((await app.inject({...write,url:write.url+"?actorId=forged"})).statusCode,422);
  assert.equal(calls,3);
});
test("unexpected onboarding dependency errors remain private and rate limits retain retry guidance",async t=>{
  const service:OnboardingService={get:()=>Promise.reject(new Error("PRIVATE_REFERENCE_AND_DATABASE_DETAILS")),
    record:()=>Promise.reject(new AppError("STALE_REVISION","Obnovite.")),evaluate:()=>Promise.reject(new Error("private"))};
  const app=await buildApp({config,authService:new FakeAuthService(),phaseAService:new FakePhaseAService(),onboarding:service,logger:false});t.after(()=>app.close());
  for(let i=0;i<60;i++){
    const read=await app.inject({...paths[0]!,cookies:{bss_session:"admin"}});assert.equal(read.statusCode,503);
    assert.ok(!read.body.includes("PRIVATE_REFERENCE"));
  }
  const limited=await app.inject({...paths[0]!,cookies:{bss_session:"admin"}});assert.equal(limited.statusCode,429);
  assert.equal(limited.json().code,"RATE_LIMITED");assert.ok(Number(limited.headers["retry-after"])>0);
  assert.equal((await app.inject({...paths[1]!,cookies:{bss_session:"admin"},headers,payload})).statusCode,409);
});
