import assert from "node:assert/strict";
import test from "node:test";
import { loadConfig } from "../../src/config.js";
import { buildApp } from "../../src/http/app.js";
import { FakeAuthService, FakePhaseAService, IDS } from "../helpers/fakes.js";
const config = loadConfig({ NODE_ENV: "test", PUBLIC_ORIGIN: "http://localhost:3000", DATABASE_URL: "postgres://unused", LOG_LEVEL: "silent" });
test("inactive import HTTP exposes limits but denies uploads, roles, origin and unexpected formats before body", async t => {
  const app = await buildApp({config,authService:new FakeAuthService(),phaseAService:new FakePhaseAService(),logger:false});
  t.after(() => app.close());
  assert.equal((await app.inject({url:"/api/v1/worker-import-policy"})).statusCode,401);
  for(const role of ["worker","manager","accountant"])
    assert.equal((await app.inject({url:"/api/v1/worker-import-policy",cookies:{bss_session:role}})).statusCode,403);
  const policy = await app.inject({url:"/api/v1/worker-import-policy",cookies:{bss_session:"admin"}});
  assert.equal(policy.statusCode,200); assert.equal(policy.json().uploadEnabled,false);
  assert.equal(policy.headers["cache-control"],"no-store, private");
  const upload={method:"POST" as const,url:"/api/v1/worker-imports?format=csv&delimiter=%2C&policyVersion=h2-import-2026-10-04",cookies:{bss_session:"admin"},headers:{origin:config.publicOrigin,"content-type":"text/csv","idempotency-key":"fixture-123"},payload:Buffer.alloc(1_048_577,65)};
  assert.equal((await app.inject({...upload,headers:{...upload.headers,origin:"http://foreign.invalid"}})).statusCode,403);
  assert.equal((await app.inject({...upload,cookies:{bss_session:"worker"}})).statusCode,403);
  assert.equal((await app.inject({...upload,headers:{...upload.headers,"content-type":"application/json"}})).statusCode,415);
  assert.equal((await app.inject(upload)).statusCode,413);
  assert.equal((await app.inject({...upload,url:upload.url.replace("h2-import-2026-10-04","old-policy"),payload:Buffer.from("x")})).statusCode,409);
  assert.equal((await app.inject({...upload,url:upload.url.replace("csv","xlsx"),headers:{...upload.headers,"content-type":"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"},payload:Buffer.from("x")})).statusCode,422);
  assert.equal((await app.inject({...upload,url:"/api/v1/worker-imports/"+IDS.export+"/mapping",method:"PATCH",payload:Buffer.from("x")})).statusCode,415);
  const disabled = await app.inject({...upload,payload:Buffer.from("fixture")});
  assert.equal(disabled.statusCode,503);assert.equal(disabled.json().code,"IMPORT_UNAVAILABLE");assert.equal(disabled.headers["retry-after"],"60");
  assert.equal((await app.inject({url:"/api/v1/worker-imports/"+IDS.export,cookies:{bss_session:"admin"}})).statusCode,503);
});

test("import route preserves Fastify rate-limit status and retry contract", async t => {
  const app = await buildApp({ config, authService: new FakeAuthService(), phaseAService: new FakePhaseAService(), logger: false });
  t.after(() => app.close());
  for (let i = 0; i < 60; i++)
    assert.equal((await app.inject({ url: "/api/v1/worker-import-policy", cookies: { bss_session: "admin" } })).statusCode, 200);
  const limited = await app.inject({ url: "/api/v1/worker-import-policy", cookies: { bss_session: "admin" } });
  assert.equal(limited.statusCode, 429);
  assert.equal(limited.json().code, "RATE_LIMITED");
  assert.equal(limited.headers["retry-after"], "60");
  assert.equal(limited.headers["cache-control"], "no-store, private");
});
