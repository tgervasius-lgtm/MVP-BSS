import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import pg from "pg";
import { migrateUp } from "../../src/db/migrate.js";
import { withTenant } from "../../src/db/tenant.js";
import type { ActorContext } from "../../src/domain/types.js";
import { buildInternalAuthorityApp } from "../../src/onboarding-authority/http.js";
import { InternalOidc } from "../../src/onboarding-authority/oidc.js";
import { MANAGE_LEAVE_EXCEPTION_GRANT, type AuthorityScope } from "../../src/onboarding-authority/policy.js";
import { PgInternalAuthority, internalScopeKey } from "../../src/onboarding-authority/registry.js";
import { requireAnnualLeaveExceptionGrant } from "../../src/services/annual-leave-exception-grants.js";
import { createPostgresFixture } from "../helpers/postgres-fixture.js";
import { internalOidcFixture } from "../helpers/internal-oidc.js";

const url = process.env.BSS_TEST_DATABASE_URL;
const origin = "https://internal.example.test";
const migration = (name: string) => readFile(new URL(`../../internal-authority-migrations/${name}.sql`, import.meta.url), "utf8");

test("named leave exception authorization is scoped, audited, revocable and denied by default",
  { timeout: 30_000, skip: !url && process.env.BSS_REQUIRE_POSTGRES_TESTS !== "true" }, async t => {
    assert.ok(url, "Explicit disposable BSS_TEST_DATABASE_URL required");
    const f = await createPostgresFixture(url, "leave_exception");
    const tenantRole = `bss_fixture_tenant_${f.suffix}`;
    const tenantUrl = new URL(f.appUrl);
    tenantUrl.username = tenantRole;
    const tenantPool = new pg.Pool({ connectionString: tenantUrl.toString(), max: 2 });
    t.after(async () => {
      await tenantPool.end();
      await f.dispose();
      const admin = new pg.Client({ connectionString: url });
      await admin.connect();
      try { await admin.query(`DROP ROLE IF EXISTS ${tenantRole}`); } finally { await admin.end(); }
    });

    await migrateUp(f.owner);
    assert.equal((await f.owner.query("SELECT to_regclass('public.annual_leave_exception_grants') AS table_name")).rows[0].table_name, null);
    await f.owner.query(await migration("022_internal_authority_draft.up"));
    const up = await migration("023_annual_leave_exception_grants.up");
    const down = await migration("023_annual_leave_exception_grants.down");
    await f.owner.query("BEGIN;" + up + "COMMIT;");
    await f.owner.query("BEGIN;" + down + "COMMIT;");
    await f.owner.query("BEGIN;" + up + "COMMIT;");
    const table = "public.annual_leave_exception_grants";
    assert.equal((await f.owner.query("SELECT has_table_privilege($1,$2,'SELECT,INSERT,UPDATE') AS permitted", [f.role, table])).rows[0].permitted, false);

    // Disposable role grants for the synthetic operator and tenant pools only.
    await f.owner.query(`CREATE ROLE ${tenantRole} LOGIN PASSWORD '${tenantUrl.password}' NOSUPERUSER NOBYPASSRLS;
      GRANT USAGE ON SCHEMA bss_internal,public TO ${f.role};
      GRANT SELECT ON ALL TABLES IN SCHEMA bss_internal TO ${f.role};
      GRANT INSERT ON bss_internal.sessions,bss_internal.flows,bss_internal.operations,bss_internal.receipts,bss_internal.audit TO ${f.role};
      GRANT UPDATE(lock_marker) ON bss_internal.people,bss_internal.identities,bss_internal.sessions,bss_internal.targets,bss_internal.grants TO ${f.role};
      GRANT UPDATE(used,proof_authenticated_at,proof_expires_at) ON bss_internal.operations TO ${f.role};
      GRANT UPDATE(used,verifier_ciphertext,verifier_iv,verifier_tag) ON bss_internal.flows TO ${f.role};
      GRANT SELECT(id,organization_id,role,status,revision) ON users TO ${f.role};
      GRANT SELECT,INSERT,UPDATE ON ${table} TO ${f.role};
      GRANT USAGE ON SCHEMA public TO ${tenantRole};
      GRANT SELECT ON ${table},users TO ${tenantRole};
      GRANT UPDATE(last_login_at) ON users TO ${tenantRole};`);

    const { rows: [org, outside] } = await f.owner.query("INSERT INTO organizations(name) VALUES ('Fixture A'),('Fixture B') RETURNING id");
    const { rows: [named, ordinary, foreign] } = await f.owner.query(
      "INSERT INTO users(organization_id,email,role) VALUES ($1,'named@example.test','admin'),($1,'ordinary@example.test','admin'),($2,'foreign@example.test','admin') RETURNING id",
      [org.id, outside.id]
    );
    const scope: AuthorityScope = { environmentId: "isolated", profile: "INTERNAL", kind: "TENANT", targetId: org.id };
    const foreignScope = { ...scope, targetId: outside.id };
    for (const item of [scope, foreignScope]) {
      await f.owner.query(
        "INSERT INTO bss_internal.targets(scope_key,scope,configuration_hash,evidence_hash,release_id,preparer_ids) VALUES($1,$2,$3,$3,'fixture','{}')",
        [internalScopeKey(item), JSON.stringify(item), "a".repeat(64)]
      );
    }
    const person = randomUUID();
    const idp = internalOidcFixture();
    const now = Math.floor(Date.now() / 1000);
    await f.owner.query("INSERT INTO bss_internal.people(id) VALUES($1)", [person]);
    await f.owner.query("INSERT INTO bss_internal.identities(issuer,subject,person_id) VALUES($1,$2,$3)", [idp.config.issuer, "synthetic-reviewer", person]);
    await f.owner.query("INSERT INTO bss_internal.grants(person_id,action,scope_key,valid_from,expires_at) VALUES($1,$2,$3,$4,$5)",
      [person, MANAGE_LEAVE_EXCEPTION_GRANT, internalScopeKey(scope), now - 1, now + 1200]);

    const adapter = new PgInternalAuthority(f.appPool, new InternalOidc(idp.config, idp.request), {
      flowEncryptionKey: "synthetic-key-for-leave-exception-fixture-only", sessionSeconds: 600, confirmationSeconds: 120
    });
    const app = await buildInternalAuthorityApp(adapter, async () => { throw new Error("Dedicated action must use its own effect"); }, origin);
    t.after(() => app.close());
    const callback = (authorizationUrl: string, flow: string) => app.inject({
      method: "GET",
      url: "/internal/v1/callback?" + new URLSearchParams({ state: new URL(authorizationUrl).searchParams.get("state")!, code: idp.issue(authorizationUrl) }),
      cookies: { "__Host-bss_internal_flow": flow }
    });
    const start = await app.inject({ method: "GET", url: "/internal/v1/login" });
    const login = await callback(start.headers.location!, start.cookies.find(c => c.name.includes("flow"))!.value);
    assert.equal(login.statusCode, 200, login.body);
    const headers = { origin, "x-csrf-token": login.json().csrfToken as string };
    const cookies = { "__Host-bss_internal_session": login.cookies.find(c => c.name.includes("session"))!.value };
    const prepare = (payload: object, target = scope, authorized = true) => app.inject({
      method: "POST", url: "/internal/v1/operations", headers, cookies: authorized ? cookies : {},
      payload: { action: MANAGE_LEAVE_EXCEPTION_GRANT, scope: target, payload }
    });
    async function operation(payload: object, verifyUnconfirmed = false) {
      const prepared = await prepare(payload);
      assert.equal(prepared.statusCode, 201, prepared.body);
      const op = prepared.json<{ operationId: string; authorizationUrl: string }>();
      const apply = () => app.inject({ method: "POST", url: `/internal/v1/operations/${op.operationId}`, cookies, headers, payload: { payload } });
      if (verifyUnconfirmed) assert.equal((await apply()).statusCode, 401);
      const proof = await callback(op.authorizationUrl, prepared.cookies.find(c => c.name.includes("flow"))!.value);
      assert.equal(proof.statusCode, 200, proof.body);
      return apply;
    }

    function actor(userId: string, organizationId = org.id): ActorContext {
      return { userId, organizationId, role: "admin", selfWorkerId: null, departmentIds: [], sessionId: randomUUID() };
    }
    const permitted = (a: ActorContext) => withTenant(tenantPool, a, "fixture-read", db => requireAnnualLeaveExceptionGrant(db, a));
    const grant = { administratorId: named.id, decision: "grant", reason: "Odluka za imenovanog administratora", expectedRevision: "0" };
    await assert.rejects(permitted(actor(named.id)), { code: "FORBIDDEN" });
    assert.equal((await prepare(grant, foreignScope)).statusCode, 403);
    assert.equal((await prepare(grant, scope, false)).statusCode, 401);
    assert.equal((await prepare({ ...grant, reason: "  " })).statusCode, 422);
    const foreignAdmin = await operation({ ...grant, administratorId: foreign.id });
    assert.equal((await foreignAdmin()).statusCode, 403);

    const assignments = [await operation(grant, true), await operation(grant)];
    const replies = await Promise.all(assignments.map(apply => apply()));
    assert.deepEqual(replies.map(reply => reply.statusCode).sort(), [200, 409]);
    assert.equal(replies.find(reply => reply.statusCode === 409)!.json().code, "STALE_REVISION");
    const winner = replies.findIndex(reply => reply.statusCode === 200);
    const result = replies[winner]!;
    assert.deepEqual(result.json(), { organizationId: org.id, administratorId: named.id, active: true, revision: "1" });
    assert.deepEqual((await assignments[winner]!()).json(), result.json());
    assert.equal(await permitted(actor(named.id)), "1");
    await assert.rejects(permitted(actor(ordinary.id)), { code: "FORBIDDEN" });
    await assert.rejects(permitted(actor(named.id, outside.id)), { code: "FORBIDDEN" });
    await assert.rejects(permitted({ ...actor(named.id), role: "manager" }), { code: "FORBIDDEN" });
    await assert.rejects(withTenant(tenantPool, actor(named.id), "fixture-write",
      db => db.query("UPDATE annual_leave_exception_grants SET active=false")), { code: "42501" });

    const revoke = await operation({ ...grant, decision: "revoke", expectedRevision: "1", reason: "Opoziv iznimke" });
    await f.owner.query("ALTER TABLE bss_internal.audit ADD CONSTRAINT synthetic_leave_audit_failure CHECK (false) NOT VALID");
    assert.equal((await revoke()).statusCode, 503);
    assert.equal(await permitted(actor(named.id)), "1");
    await f.owner.query("ALTER TABLE bss_internal.audit DROP CONSTRAINT synthetic_leave_audit_failure");
    await f.owner.query("UPDATE users SET status='blocked',revision=revision+1 WHERE id=$1", [named.id]);
    await assert.rejects(permitted(actor(named.id)), { code: "FORBIDDEN" });
    await f.owner.query("UPDATE users SET status='active',revision=revision+1 WHERE id=$1", [named.id]);
    await assert.rejects(permitted(actor(named.id)), { code: "FORBIDDEN" });
    const revoked = await revoke();
    assert.equal(revoked.statusCode, 200, revoked.body);
    assert.deepEqual(revoked.json(), { ...result.json(), active: false, revision: "2" });
    await assert.rejects(permitted(actor(named.id)), { code: "FORBIDDEN" });
    const evidence = await f.owner.query(
      `SELECT a.original_person_id, o.intent->'scope'->>'targetId' AS organization, o.payload->>'reason' AS reason, r.result->>'revision' AS revision
       FROM bss_internal.audit a JOIN bss_internal.operations o ON o.id=a.operation_id
       JOIN bss_internal.receipts r ON r.operation_id=a.operation_id ORDER BY a.created_at`
    );
    assert.deepEqual(evidence.rows, [
      { original_person_id: person, organization: org.id, reason: grant.reason, revision: "1" },
      { original_person_id: person, organization: org.id, reason: "Opoziv iznimke", revision: "2" }
    ]);
    await assert.rejects(f.owner.query("BEGIN;" + down + "COMMIT;"), /requires forward recovery/);
    await f.owner.query("ROLLBACK");
  });
