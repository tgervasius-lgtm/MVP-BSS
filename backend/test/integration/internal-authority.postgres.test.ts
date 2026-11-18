import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import pg from "pg";
import { migrateUp } from "../../src/db/migrate.js";
import { InternalOidc } from "../../src/onboarding-authority/oidc.js";
import { PgInternalAuthority, internalScopeKey, type InternalEffect } from "../../src/onboarding-authority/registry.js";
import { buildInternalAuthorityApp } from "../../src/onboarding-authority/http.js";
import type { ResolvedAuthorityIntent } from "../../src/onboarding-authority/policy.js";
import { applyInternalDraftGrants } from "../helpers/internal-grants.js";
import { internalOidcFixture } from "../helpers/internal-oidc.js";
import { createPostgresFixture } from "../helpers/postgres-fixture.js";

const url = process.env.BSS_TEST_DATABASE_URL;
const options = { timeout: 30_000, skip: !url && process.env.BSS_REQUIRE_POSTGRES_TESTS !== "true" };
const origin = "https://internal.example.test";

async function fixture(t: test.TestContext, customize?: (effect: InternalEffect) => InternalEffect, disconnect = false) {
  assert.ok(url, "Explicit disposable BSS_TEST_DATABASE_URL required");
  const f = await createPostgresFixture(url, "internal_auth", 4);
  t.after(f.dispose);
  await migrateUp(f.owner);
  const privateSchema = await readFile(new URL("../../internal-authority-migrations/022_internal_authority_draft.up.sql", import.meta.url), "utf8");
  await f.owner.query("BEGIN;"+privateSchema+"COMMIT;");
  assert.equal((await f.owner.query("SELECT has_schema_privilege($1,'bss_internal','USAGE') AS allowed", [f.role])).rows[0].allowed, false);
  const ownerUrl = new URL(url); ownerUrl.pathname = "/"+f.databaseName;
  const applied = await applyInternalDraftGrants(ownerUrl.toString(), f.role);
  assert.equal(applied.code, 0, applied.stderr);
  await f.owner.query("CREATE TABLE synthetic_effects(id uuid PRIMARY KEY)");
  await f.owner.query(`GRANT INSERT ON synthetic_effects TO ${f.role}; GRANT USAGE ON SCHEMA public TO ${f.role}`);
  const person = randomUUID(), preparer = randomUUID(), grant = randomUUID();
  const scope: ResolvedAuthorityIntent["scope"] = {
    environmentId: "isolated-test", profile: "INTERNAL", kind: "TENANT", targetId: randomUUID()
  };
  const key = internalScopeKey(scope);
  const idp = internalOidcFixture();
  const now = Math.floor(Date.now() / 1000);
  await f.owner.query("INSERT INTO bss_internal.people(id) VALUES ($1),($2)", [person, preparer]);
  await f.owner.query("INSERT INTO bss_internal.identities VALUES($1,$2,$3,0)", [idp.config.issuer, "synthetic-reviewer", person]);
  await f.owner.query(
    "INSERT INTO bss_internal.targets(scope_key,scope,configuration_hash,evidence_hash,release_id,preparer_ids) VALUES($1,$2,$3,$3,'synthetic-release',$4)",
    [key, JSON.stringify(scope), "a".repeat(64), [preparer]]
  );
  await f.owner.query("INSERT INTO bss_internal.grants(id,person_id,action,scope_key,valid_from,expires_at) VALUES($1,$2,'VERIFY_ONBOARDING',$3,$4,$5)",
    [grant, person, key, now - 1, now + 1200]);
  const adapter = new PgInternalAuthority(f.appPool, new InternalOidc(idp.config, idp.request), {
    flowEncryptionKey: "synthetic-key-for-isolated-registry-test-12345", sessionSeconds: 600, confirmationSeconds: 120
  });
  const effect: InternalEffect = async (db, _intent, payload) => {
    const id = String(payload.marker);
    await db.query("INSERT INTO synthetic_effects(id) VALUES($1)", [id]);
    return { id };
  };
  const app = await buildInternalAuthorityApp(adapter, customize ? customize(effect) : effect, origin);
  if (disconnect) app.addHook("onSend", async (request, reply, body) => {
    if (request.method === "POST" && request.headers["x-synthetic-disconnect"] === "once" && reply.statusCode === 200) {
      request.raw.socket.destroy();
    }
    return body;
  });
  t.after(() => app.close());
  const callback = (state: string, cookie: string, code: string) => app.inject({
    method: "GET", url: "/internal/v1/callback?" + new URLSearchParams({ state, code }),
    cookies: { __Host_bss_unused: "", "__Host-bss_internal_flow": cookie }
  });
  async function login(claims: Record<string, unknown> = {}) {
    const start = await app.inject({ method: "GET", url: "/internal/v1/login" });
    const authorizationUrl = start.headers.location!;
    const cookie = start.cookies.find(c => c.name.includes("flow"))!.value;
    const complete = await callback(new URL(authorizationUrl).searchParams.get("state")!, cookie, idp.issue(authorizationUrl, claims));
    assert.equal(complete.statusCode, 200, complete.body);
    return complete;
  }
  const complete = await login();
  assert.equal(complete.cookies.find(c => c.name.includes("session"))!.secure, true);
  assert.equal(complete.cookies.find(c => c.name.includes("session"))!.httpOnly, true);
  const sessionToken = complete.cookies.find(c => c.name.includes("session"))!.value;
  const csrf = complete.json().csrfToken as string;
  const cookies = { "__Host-bss_internal_session": sessionToken };
  const headers = { origin, "x-csrf-token": csrf };
  const payload = { marker: randomUUID(), detail: { z: 2, a: 1 } };
  async function prepare() {
    const response = await app.inject({ method: "POST", url: "/internal/v1/operations", cookies, headers,
      payload: { action: "VERIFY_ONBOARDING", scope, payload } });
    assert.equal(response.statusCode, 201, response.body);
    return { ...response.json() as { operationId: string; authorizationUrl: string },
      flowCookie: response.cookies.find(c => c.name.includes("flow"))!.value };
  }
  async function confirm(op: Awaited<ReturnType<typeof prepare>>, claims: Record<string, unknown> = {}) {
    return callback(new URL(op.authorizationUrl).searchParams.get("state")!, op.flowCookie, idp.issue(op.authorizationUrl, claims));
  }
  const perform = (id: string, body = payload) => app.inject({
    method: "POST", url: "/internal/v1/operations/" + id, cookies, headers, payload: { payload: body }
  });
  const counts = async () => (await f.owner.query(
    "SELECT (SELECT count(*)::int FROM synthetic_effects) AS effects,(SELECT count(*)::int FROM bss_internal.receipts) AS receipts,(SELECT count(*)::int FROM bss_internal.audit) AS audit"
  )).rows[0];
  return { ...f, idp, person, preparer, grant, key, scope, adapter, app, callback, login,
    sessionToken, csrf, cookies, headers, payload, prepare, confirm, perform, counts };
}

test("internal HTTP adapter creates one audited effect, recovers and enforces current revocation", options, async t => {
  const f = await fixture(t);
  const op = await f.prepare();
  assert.equal((await f.perform(op.operationId)).statusCode, 401);
  assert.equal((await f.confirm(op)).statusCode, 200);
  const replies = await Promise.all([f.perform(op.operationId), f.perform(op.operationId)]);
  for (const response of replies) assert.equal(response.statusCode, 200, response.body);
  assert.deepEqual(await f.counts(), { effects: 1, receipts: 1, audit: 1 });
  const reordered = { detail: { a: 1, z: 2 }, marker: f.payload.marker };
  assert.equal((await f.perform(op.operationId, reordered)).statusCode, 200);
  const read = await f.app.inject({ method: "GET", url: "/internal/v1/operations/" + op.operationId, cookies: f.cookies });
  assert.equal(read.statusCode, 200);
  assert.equal((await f.perform(op.operationId, { ...f.payload, marker: randomUUID() })).statusCode, 409);
  await f.owner.query("UPDATE bss_internal.grants SET revoked=true,revision=revision+1 WHERE id=$1", [f.grant]);
  assert.equal((await f.perform(op.operationId)).statusCode, 403);
  assert.equal((await f.app.inject({ method: "GET", url: "/internal/v1/operations/" + op.operationId, cookies: f.cookies })).statusCode, 403);
  assert.deepEqual(await f.counts(), { effects: 1, receipts: 1, audit: 1 });
});

test("internal confirmations reject wrong cookie, nonce, password method, stale revision and CSRF", options, async t => {
  const f = await fixture(t);
  const op = await f.prepare();
  assert.equal((await f.callback(new URL(op.authorizationUrl).searchParams.get("state")!, "wrong-cookie", f.idp.issue(op.authorizationUrl))).statusCode, 401);
  assert.equal((await f.confirm(op, { nonce: "wrong-nonce" })).statusCode, 401);
  assert.equal((await f.confirm(op, { amr: ["pwd"] })).statusCode, 401);
  assert.equal((await f.confirm(op)).statusCode, 200);
  await f.owner.query("UPDATE bss_internal.targets SET configuration_hash=$2,revision=revision+1 WHERE scope_key=$1", [f.key, "b".repeat(64)]);
  assert.equal((await f.perform(op.operationId)).statusCode, 409);
  await assert.rejects(f.owner.query("UPDATE bss_internal.targets SET revision=revision-1 WHERE scope_key=$1", [f.key]), { code: "23514" });
  assert.equal((await f.app.inject({ method: "POST", url: "/internal/v1/operations/" + op.operationId,
    cookies: f.cookies, headers: { ...f.headers, origin: "https://foreign.example.test" }, payload: { payload: f.payload } })).statusCode, 403);
  assert.deepEqual(await f.counts(), { effects: 0, receipts: 0, audit: 0 });
});

test("internal audit failure rolls back effect and proof consumption; runtime cannot grant authority", options, async t => {
  const f = await fixture(t);
  const op = await f.prepare();
  assert.equal((await f.confirm(op)).statusCode, 200);
  await f.owner.query("ALTER TABLE bss_internal.audit ADD CONSTRAINT synthetic_audit_outage CHECK (false) NOT VALID");
  assert.equal((await f.perform(op.operationId)).statusCode, 503);
  assert.deepEqual(await f.counts(), { effects: 0, receipts: 0, audit: 0 });
  assert.equal((await f.owner.query("SELECT used FROM bss_internal.operations WHERE id=$1", [op.operationId])).rows[0].used, false);
  await f.owner.query("ALTER TABLE bss_internal.audit DROP CONSTRAINT synthetic_audit_outage");
  assert.equal((await f.perform(op.operationId)).statusCode, 200);
  await assert.rejects(f.appPool.query("UPDATE bss_internal.grants SET revoked=false,revision=revision+1"), { code: "42501" });
  await assert.rejects(f.appPool.query("UPDATE bss_internal.targets SET configuration_hash=$1,revision=revision+1", ["c".repeat(64)]), { code: "42501" });
  assert.equal((await f.appPool.query("SELECT * FROM bss_internal.sessions")).rowCount, 0);
  const down = await readFile(new URL("../../internal-authority-migrations/022_internal_authority_draft.down.sql", import.meta.url), "utf8");
  const migrator = "bss_d3_owner_"+f.suffix;
  const owner = (await f.owner.query("SELECT current_user AS name")).rows[0].name as string;
  assert.match(owner,/^[a-zA-Z_][a-zA-Z0-9_]*$/);
  await f.owner.query(`CREATE ROLE ${migrator} NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE`);
  try {
    await f.owner.query(`GRANT CREATE ON DATABASE ${f.databaseName} TO ${migrator}; ALTER SCHEMA bss_internal OWNER TO ${migrator}`);
    for (const relation of ["people","identities","sessions","targets","grants","operations","flows","receipts","audit"]) {
      await f.owner.query(`ALTER TABLE bss_internal.${relation} OWNER TO ${migrator}`);
    }
    await f.owner.query(`SET ROLE ${migrator}`);
    assert.equal((await f.owner.query("SELECT rolbypassrls FROM pg_roles WHERE rolname=current_user")).rows[0].rolbypassrls,false);
    await assert.rejects(f.owner.query("BEGIN;" + down), /Preserve internal authority history/);
  } finally {
    await f.owner.query(`ROLLBACK; RESET ROLE; REASSIGN OWNED BY ${migrator} TO ${owner}; DROP OWNED BY ${migrator}; DROP ROLE ${migrator}`);
  }
});


test("internal registry rejects aliases of the preparer, foreign scope, stale sessions and consumed flows", options, async t => {
  const f = await fixture(t);
  const op = await f.prepare();
  const state = new URL(op.authorizationUrl).searchParams.get("state")!;
  assert.equal((await f.confirm(op, { auth_time: Math.floor(Date.now()/1000)-60 })).statusCode, 401);
  assert.equal((await f.confirm(op)).statusCode, 200);
  assert.equal((await f.callback(state, op.flowCookie, f.idp.issue(op.authorizationUrl))).statusCode, 401);
  assert.equal((await f.app.inject({ method: "HEAD", url: "/internal/v1/callback?" + new URLSearchParams({ state, code: "unused" }) })).statusCode, 404);
  assert.equal((await f.app.inject({ method: "POST", url: "/internal/v1/operations", cookies: f.cookies, headers: f.headers,
    payload: { action: "VERIFY_ONBOARDING", scope: { ...f.scope, environmentId: "other-environment" }, payload: f.payload } })).statusCode, 403);
  await f.owner.query("INSERT INTO bss_internal.identities VALUES($1,'preparer-alias',$2,0)", [f.idp.config.issuer, f.preparer]);
  await f.owner.query("INSERT INTO bss_internal.grants(id,person_id,action,scope_key,valid_from,expires_at) SELECT $1,$2,action,scope_key,valid_from,expires_at FROM bss_internal.grants WHERE id=$3", [randomUUID(),f.preparer,f.grant]);
  const alias = await f.login({ sub: "preparer-alias" });
  assert.equal((await f.app.inject({ method: "POST", url: "/internal/v1/operations",
    cookies: { "__Host-bss_internal_session": alias.cookies.find(c=>c.name.includes("session"))!.value },
    headers: { origin, "x-csrf-token": alias.json().csrfToken },
    payload: { action: "VERIFY_ONBOARDING", scope: f.scope, payload: f.payload } })).statusCode, 403);
  await f.owner.query("UPDATE bss_internal.sessions SET revoked=true");
  assert.equal((await f.perform(op.operationId)).statusCode, 401);
  assert.deepEqual(await f.counts(), { effects: 0, receipts: 0, audit: 0 });
});

test("new authorized session recovers a completed result without changing its original attribution", options, async t => {
  const f = await fixture(t);
  const op = await f.prepare();
  await f.confirm(op);
  const other = randomUUID();
  await f.owner.query("INSERT INTO bss_internal.people(id) VALUES($1)", [other]);
  await f.owner.query("INSERT INTO bss_internal.identities VALUES($1,'replacement-reviewer',$2,0)", [f.idp.config.issuer,other]);
  await f.owner.query("INSERT INTO bss_internal.grants(id,person_id,action,scope_key,valid_from,expires_at) SELECT $1,$2,action,scope_key,valid_from,expires_at FROM bss_internal.grants WHERE id=$3", [randomUUID(),other,f.grant]);
  const login = await f.login({ sub: "replacement-reviewer" });
  const cookies = { "__Host-bss_internal_session": login.cookies.find(c=>c.name.includes("session"))!.value };
  const headers = { origin, "x-csrf-token": login.json().csrfToken };
  const post = () => f.app.inject({ method: "POST", url: "/internal/v1/operations/"+op.operationId, cookies, headers, payload: { payload: f.payload } });
  assert.equal((await post()).statusCode, 403);
  const result = await f.perform(op.operationId);
  assert.equal(result.statusCode, 200);
  assert.deepEqual((await post()).json(), result.json());
  assert.equal((await f.owner.query("SELECT original_person_id FROM bss_internal.audit WHERE operation_id=$1",[op.operationId])).rows[0].original_person_id, f.person);
  assert.deepEqual(await f.counts(), { effects: 1, receipts: 1, audit: 1 });
});

async function waitForLock(owner: { query: (sql: string) => Promise<{ rows: { waiting: boolean }[] }> }) {
  const until = Date.now()+3000;
  while (Date.now()<until) {
    if ((await owner.query("SELECT EXISTS(SELECT 1 FROM pg_stat_activity WHERE datname=current_database() AND wait_event_type='Lock') AS waiting")).rows[0]!.waiting) return;
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  assert.fail("Expected authority row-lock contention was not observed");
}

test("revocation and mutation serialize in both row-lock orders", options, async t => {
  let enter!: () => void, release!: () => void;
  const entered = new Promise<void>(resolve=>{enter=resolve;});
  const released = new Promise<void>(resolve=>{release=resolve;});
  const first = await fixture(t);
  const op = await first.prepare(); await first.confirm(op);
  const write = first.adapter.perform(first.sessionToken, first.csrf, op.operationId, first.payload, async (...args) => { enter(); await released; await args[0].query("INSERT INTO synthetic_effects(id) VALUES($1)",[first.payload.marker]); return {id:first.payload.marker}; }).then(result=>({ statusCode:200, body:JSON.stringify(result) }));
  await Promise.race([entered, write.then(response=>assert.fail("Effect never entered: "+response.statusCode+" "+response.body))]);
  const revoker = new pg.Client({ connectionString: new URL("/"+first.databaseName, url!).toString() });
  await revoker.connect();
  const revoke = revoker.query("UPDATE bss_internal.grants SET revoked=true,revision=revision+1 WHERE id=$1",[first.grant]);
  try { await waitForLock(first.owner); } finally { release(); }
  assert.equal((await write).statusCode,200); await revoke; await revoker.end();
  assert.equal((await first.perform(op.operationId)).statusCode,403);
  assert.deepEqual(await first.counts(),{effects:1,receipts:1,audit:1});

  const second = await fixture(t);
  const pending = await second.prepare(); await second.confirm(pending);
  const writer = new pg.Client({ connectionString: new URL("/"+second.databaseName, url!).toString() });
  await writer.connect();
  try {
    await writer.query("BEGIN");
    await writer.query("UPDATE bss_internal.grants SET revoked=true,revision=revision+1 WHERE id=$1",[second.grant]);
    const request = Promise.resolve(second.perform(pending.operationId));
    await waitForLock(second.owner);
    await writer.query("COMMIT");
    assert.equal((await request).statusCode,403);
    assert.deepEqual(await second.counts(),{effects:0,receipts:0,audit:0});
  } finally { await writer.query("ROLLBACK"); await writer.end(); }
});

test("TCP disconnect after commit recovers through GET and two exact POST retries", options, async t => {
  const f = await fixture(t, undefined, true);
  const op = await f.prepare(); await f.confirm(op);
  const address = await f.app.listen({host:"127.0.0.1",port:0});
  const endpoint = address+"/internal/v1/operations/"+op.operationId;
  const headers = { ...f.headers, cookie: "__Host-bss_internal_session="+f.sessionToken, "content-type":"application/json" };
  await assert.rejects(fetch(endpoint,{method:"POST",headers:{...headers,"x-synthetic-disconnect":"once"},body:JSON.stringify({payload:f.payload})}), /fetch failed/);
  const read = await fetch(endpoint,{headers});
  assert.equal(read.status,200); const result = await read.json();
  for (let i=0;i<2;i++) {
    const retry = await fetch(endpoint,{method:"POST",headers,body:JSON.stringify({payload:f.payload})});
    assert.equal(retry.status,200); assert.deepEqual(await retry.json(),result);
  }
  assert.deepEqual(await f.counts(),{effects:1,receipts:1,audit:1});
  assert.equal((await f.owner.query("SELECT used FROM bss_internal.operations WHERE id=$1",[op.operationId])).rows[0].used,true);
});
