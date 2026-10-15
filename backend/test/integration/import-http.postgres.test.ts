import assert from "node:assert/strict";
import { randomBytes, randomUUID, createHash } from "node:crypto";
import http from "node:http";
import test from "node:test";
import { importRuntimeFixture } from "../helpers/import-runtime-fixture.js";
import { FakeAuthService, FakePhaseAService } from "../helpers/fakes.js";
import { loadConfig } from "../../src/config.js";
import { buildApp } from "../../src/http/app.js";
import { WorkerImportApi } from "../../src/imports/api-service.js";
import { PgImportSourceStore } from "../../src/imports/pg-import-source-store.js";
import { IMPORT_POLICY } from "../../src/imports/model.js";
import { TABULAR_VERSION, type parseImportFile } from "../../src/imports/tabular-parser.js";
const url=process.env.BSS_TEST_DATABASE_URL;
const options={skip:!url&&process.env.BSS_REQUIRE_POSTGRES_TESTS!=="true",timeout:40_000};
const config=loadConfig({NODE_ENV:"test",PUBLIC_ORIGIN:"http://localhost:3000",DATABASE_URL:"postgres://unused",LOG_LEVEL:"silent"});
const path="/api/v1/worker-imports?format=csv&delimiter=%2C&policyVersion="+IMPORT_POLICY.version;
async function fixture(parser?: typeof parseImportFile) {
  assert.ok(url);
  const f=await importRuntimeFixture(url);
  const fake=new FakeAuthService();
  fake.resolveAccessToken=async token=>{
    const current=await FakeAuthService.prototype.resolveAccessToken.call(fake,token==="foreign"?"admin":token);
    return {...current,actor:{...(token==="foreign"?f.other.actor:f.first.actor),role:current.actor.role}};
  };
  const imports=new WorkerImportApi(new PgImportSourceStore(f.appPool),f.runtime,randomBytes(32),parser??(async bytes=>({
    version:TABULAR_VERSION,fileChecksum:createHash("sha256").update(bytes).digest("hex"),
    headers:["Code","Name","Department","Shift","Days"],rows:[["A1","Synthetic Person","Department","Day","0"],["A2","Synthetic Person","Department","Day","0"]]
  })));
  const app=await buildApp({config,authService:fake,phaseAService:new FakePhaseAService(),imports,logger:false});
  await app.ready();
  return {...f,app,imports,dispose:async()=>{await app.close();await f.dispose();}};
}
const headers={"content-type":"text/csv",origin:config.publicOrigin,"idempotency-key":"http-fixture-1"};
test("real PostgreSQL HTTP create/map/preview/atomic commit/result/replay and foreign tenant denial",options,async t=>{
  const f=await fixture();t.after(()=>f.dispose());
  const upload={method:"POST" as const,url:path,headers,cookies:{bss_session:"admin"},payload:Buffer.from("synthetic")};
  const created=await f.app.inject(upload);assert.equal(created.statusCode,201,created.body);
  const session=created.json();assert.equal(session.state,"NEEDS_MAPPING");assert.equal(created.headers.etag,'"'+session.revision+'"');
  const replay=await f.app.inject(upload);assert.equal(replay.statusCode,200);assert.deepEqual(replay.json(),session);
  const foreign=await f.app.inject({url:"/api/v1/worker-imports/"+session.id,cookies:{bss_session:"foreign"}});assert.equal(foreign.statusCode,404);
  const route="/api/v1/worker-imports/"+session.id;
  const mapping={columns:["code","name","department","shift","annualLeaveAllowance"],departments:[{source:"Department",id:f.first.department}],shifts:[{source:"Day",id:f.first.shift}]};
  const mapped=await f.app.inject({method:"PATCH",url:route+"/mapping",cookies:{bss_session:"admin"},headers:{origin:config.publicOrigin,"if-match":created.headers.etag!},payload:mapping});
  assert.equal(mapped.statusCode,200,mapped.body);assert.equal(mapped.json().state,"READY");
  const ready=mapped.json();
  const preview=await f.app.inject({url:route+"/rows?revision="+ready.revision+"&limit=1",cookies:{bss_session:"admin"}});
  assert.equal(preview.statusCode,200,preview.body);assert.equal(preview.json().sourceRows.length,1);assert.equal(preview.json().counts.total,2);assert.ok(preview.json().nextCursor);
  const commit={method:"POST" as const,url:route+"/commit",cookies:{bss_session:"admin"},headers:{origin:config.publicOrigin,"if-match":mapped.headers.etag!,"idempotency-key":"commit-http-1"},payload:{approved:true,previewChecksum:ready.previewChecksum}};
  assert.equal((await f.app.inject({...commit,payload:{...commit.payload,approved:false}})).statusCode,422);
  const result=await f.app.inject(commit);assert.equal(result.statusCode,200,result.body);assert.equal(result.json().createdCount,2);
  assert.deepEqual((await f.app.inject(commit)).json(),result.json());
  assert.equal(await f.count("workers"),2);assert.equal(await f.count("worker_import_staging"),0);
  assert.equal((await f.app.inject({url:route+"/rows?revision="+ready.revision,cookies:{bss_session:"admin"}})).statusCode,410);
  const recovered=await f.app.inject({url:route,cookies:{bss_session:"admin"}});
  assert.deepEqual(recovered.json().result,result.json());
  const changed=await f.app.inject({...upload,payload:Buffer.from("different")});assert.equal(changed.statusCode,409);
  const second=await f.app.inject({...upload,headers:{...headers,"idempotency-key":"http-fixture-2"}});assert.equal(second.statusCode,201);
  const cancelled=await f.app.inject({method:"POST",url:"/api/v1/worker-imports/"+second.json().id+"/cancel",cookies:{bss_session:"admin"},headers:{origin:config.publicOrigin,"if-match":second.headers.etag!}});
  assert.equal(cancelled.statusCode,200,cancelled.body);assert.equal(cancelled.json().state,"CANCELLED");assert.equal(await f.count("worker_import_staging"),0);
});
function request(port:number,requestHeaders:Record<string,string>,send:(req:http.ClientRequest)=>void):Promise<{status:number;body:string}>{
  return new Promise((resolve,reject)=>{
    const req=http.request({host:"127.0.0.1",port,path,method:"POST",headers:requestHeaders},res=>{
      let body="";res.setEncoding("utf8");res.on("data",chunk=>{body+=chunk;});res.on("end",()=>{req.end();resolve({status:res.statusCode!,body});});
    });
    req.setTimeout(20_000,()=>req.destroy(new Error("Test HTTP deadline")));req.on("error",reject);send(req);
  });
}
test("real chunked HTTP is bounded, authorizes before body and recovers after disconnected/slow uploads",options,async t=>{
  const f=await fixture();t.after(()=>f.dispose());
  await f.app.listen({host:"127.0.0.1",port:0});
  const address=f.app.server.address();assert.ok(address&&typeof address==="object");const port=address.port;
  const wire={...headers,cookie:"bss_session=admin","transfer-encoding":"chunked"};
  // Intentionally do not send a body: authorization must answer first.
  assert.equal((await request(port,{...wire,cookie:""},req=>req.flushHeaders())).status,401);
  const over=await request(port,wire,req=>{for(let i=0;i<17;i++)req.write(Buffer.alloc(65_536,65));req.end();});
  assert.equal(over.status,413,over.body);
  const slow=await request(port,{...wire,"idempotency-key":"slow-http-fixture"},req=>{req.write("unfinished");});
  assert.equal(slow.status,503,slow.body);assert.equal(JSON.parse(slow.body).code,"IMPORT_UNAVAILABLE");
  assert.equal((await f.owner.query("SELECT lease_token FROM worker_import_runtime")).rows[0].lease_token,null);
  await new Promise<void>(resolve=>{
    const req=http.request({host:"127.0.0.1",port,path,method:"POST",headers:{...wire,"idempotency-key":"aborted-fixture"}});
    req.on("error",()=>resolve());req.write("partial");setTimeout(()=>req.destroy(),50);
  });
  // Fence admission observes either released upload or a bounded DB release in flight.
  for(let i=0;i<20;i++){
    if((await f.owner.query("SELECT lease_token FROM worker_import_runtime")).rows[0].lease_token===null)break;
    await new Promise(resolve=>setTimeout(resolve,20));
  }
  assert.equal((await f.owner.query("SELECT lease_token FROM worker_import_runtime")).rows[0].lease_token,null);
  assert.equal(await f.count("worker_import_staging"),0);
  assert.equal((await f.app.inject({method:"POST",url:path,headers:{...headers,"idempotency-key":randomUUID()},cookies:{bss_session:"admin"},payload:Buffer.from("valid")})).statusCode,201);
});

test("1,000 invalid CSV/XLSX rows persist complete bounded field diagnostics and never commit", options, async t => {
  // Controlled adapter isolates HTTP/mapping persistence; actual Linux format
  // parsing and sandbox/child-close behavior have their separate CI proof.
  const f = await fixture(async (bytes, format) => ({
    version: TABULAR_VERSION, fileChecksum: createHash("sha256").update(bytes).digest("hex"),
    headers: ["Code", "Name", "Email", "Department", "Shift", "Days"],
    rows: Array.from({ length: 1000 }, () => ["", "", format === "xlsx" ? 0 : "", "", "", "invalid"])
  }));
  t.after(() => f.dispose());
  const mapping = { columns: ["code", "name", "email", "department", "shift", "annualLeaveAllowance"], departments: [], shifts: [] };
  for (const format of ["csv", "xlsx"] as const) {
    const raw = format === "csv" ? Buffer.from("Code,Name,Email,Department,Shift,Days\n" + ",,,,,invalid\n".repeat(1000))
      : Buffer.from("controlled XLSX parser fixture");
    const uploadUrl = format === "csv" ? path : "/api/v1/worker-imports?format=xlsx&policyVersion=" + IMPORT_POLICY.version;
    const created = await f.app.inject({ method: "POST", url: uploadUrl, cookies: { bss_session: "admin" },
      headers: { ...headers, "idempotency-key": randomUUID(), "content-type": format === "csv" ? "text/csv"
        : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }, payload: raw });
    assert.equal(created.statusCode, 201, created.body);
    const route = "/api/v1/worker-imports/" + created.json().id;
    const mapped = await f.app.inject({ method: "PATCH", url: route + "/mapping", cookies: { bss_session: "admin" },
      headers: { origin: config.publicOrigin, "if-match": created.headers.etag! }, payload: mapping });
    assert.equal(mapped.statusCode, 200, mapped.body);
    assert.equal(mapped.json().state, "INVALID");
    assert.equal(mapped.json().counts.blocked, 1000);
    const expectedFields = format === "csv" ? 5 : 6, observed = new Set<string>();
    let next: string | null = null, pages = 0;
    do {
      const previewUrl: string = route + "/rows?revision=" + mapped.json().revision + "&limit=100"
        + (next ? "&cursor=" + encodeURIComponent(next) : "");
      const preview = await f.app.inject({ url: previewUrl, cookies: { bss_session: "admin" } });
      assert.equal(preview.statusCode, 200, preview.body);
      const page = preview.json(); assert.equal(page.sourceRows.length, 100);
      assert.equal(page.issues.length, expectedFields * 100);
      for (const issue of page.issues) {
        const field = issue.rowNumber + ":" + issue.field;
        assert.equal(observed.has(field), false); observed.add(field);
      }
      next = page.nextCursor; pages++;
      assert.ok(pages <= 10);
    } while (next);
    assert.equal(pages, 10); assert.equal(observed.size, 1000 * expectedFields);
    const commit = await f.app.inject({ method: "POST", url: route + "/commit", cookies: { bss_session: "admin" },
      headers: { origin: config.publicOrigin, "if-match": mapped.headers.etag!, "idempotency-key": randomUUID() },
      payload: { approved: true, previewChecksum: "a".repeat(64) } });
    assert.equal(commit.statusCode, 409); assert.equal(await f.count("workers"), 0);
    const cancelled = await f.app.inject({ method: "POST", url: route + "/cancel", cookies: { bss_session: "admin" },
      headers: { origin: config.publicOrigin, "if-match": mapped.headers.etag! } });
    assert.equal(cancelled.statusCode, 200); assert.equal(await f.count("worker_import_staging"), 0);
  }
});

test("disconnect during admission releases the eventual token before the next upload", options, async t => {
  let continueAdmission!: () => void, admissionReady!: () => void, socketAborted!: () => void, released!: () => void;
  const blocked = new Promise<void>(resolve => { continueAdmission = resolve; });
  const admitted = new Promise<void>(resolve => { admissionReady = resolve; });
  const aborted = new Promise<void>(resolve => { socketAborted = resolve; });
  const releaseDone = new Promise<void>(resolve => { released = resolve; });
  const f = await fixture();
  let req: http.ClientRequest | undefined;
  t.after(async () => { continueAdmission(); req?.destroy(); await f.dispose(); });
  const realAdmit = f.runtime.admit.bind(f.runtime), realRelease = f.runtime.release.bind(f.runtime);
  let first = true, releaseCalls = 0;
  f.runtime.admit = async (actor, operation, requestId) => {
    const token = await realAdmit(actor, operation, requestId);
    if (first) { first = false; admissionReady(); await blocked; }
    return token;
  };
  f.runtime.release = async (actor, token, requestId) => {
    await realRelease(actor, token, requestId); releaseCalls++; released();
  };
  f.app.server.once("request", raw => { raw.once("aborted", socketAborted); });
  await f.app.listen({ host: "127.0.0.1", port: 0 });
  const address = f.app.server.address(); assert.ok(address && typeof address === "object");
  req = http.request({ host: "127.0.0.1", port: address.port, path, method: "POST",
    headers: { ...headers, cookie: "bss_session=admin", "transfer-encoding": "chunked" } });
  req.on("error", () => {}); req.flushHeaders();
  await admitted; req.destroy(); await aborted;
  continueAdmission(); await releaseDone;
  assert.equal(releaseCalls, 1);
  assert.equal((await f.owner.query("SELECT lease_token FROM worker_import_runtime")).rows[0].lease_token, null);
  const retry = await f.app.inject({ method: "POST", url: path, cookies: { bss_session: "admin" },
    headers: { ...headers, "idempotency-key": randomUUID() }, payload: Buffer.from("valid") });
  assert.equal(retry.statusCode, 201, retry.body);
});
