import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { loadConfig } from "../../src/config.js";
import { withTenant } from "../../src/db/tenant.js";
import { AppError } from "../../src/domain/errors.js";
import { buildApp } from "../../src/http/app.js";
import { MANAGE_LEAVE_EXCEPTION_GRANT } from "../../src/onboarding-authority/policy.js";
import {
  type ExceptionDate, PgAnnualLeaveExceptionProposalService
} from "../../src/services/annual-leave-exception-proposals.js";
import { coveredLeaveFixture } from "../helpers/covered-leave-fixture.js";
import { FakeAuthService } from "../helpers/fakes.js";

const url = process.env.BSS_TEST_DATABASE_URL;
const options = { timeout: 30_000, skip: !url && process.env.BSS_REQUIRE_POSTGRES_TESTS !== "true" };
const migration = (name: string) => readFile(new URL(`../../internal-authority-migrations/${name}.sql`, import.meta.url), "utf8");
const period = { startDate: "2030-01-07", endDate: "2030-01-15" };
const dates: ExceptionDate[] = ["07", "08", "09", "10", "11", "14", "15"].map((day, index) => ({
  date: `2030-01-${day}`, type: index < 5 ? "annual_leave" : "unpaid_leave"
}));
const proposal = { reason: "Ogledna osnova prema politici tvrtke", dates: [...dates].reverse() };

async function fixture(t: test.TestContext) {
  assert.ok(url, "Explicit disposable BSS_TEST_DATABASE_URL required");
  const f = await coveredLeaveFixture(url, true);
  t.after(f.dispose);
  const up = await migration("024_annual_leave_exception_proposals.up");
  const down = await migration("024_annual_leave_exception_proposals.down");
  for (const name of ["annual_leave_exception_proposals", "annual_leave_exception_confirmations"]) {
    assert.equal((await f.owner.query("SELECT to_regclass($1) AS name", [name])).rows[0].name, null);
  }
  await f.owner.query(await migration("022_internal_authority_draft.up"));
  await f.owner.query(await migration("023_annual_leave_exception_grants.up"));
  await f.owner.query("BEGIN;" + up + "COMMIT;");
  await f.owner.query("BEGIN;" + down + "COMMIT;");
  await f.owner.query("BEGIN;" + up + "COMMIT;");
  for (const name of ["annual_leave_exception_proposals", "annual_leave_exception_confirmations"]) {
    assert.equal((await f.owner.query(
      "SELECT has_table_privilege($1, $2, 'SELECT,INSERT,UPDATE') AS permitted", [f.role, name]
    )).rows[0].permitted, false);
  }

  // Provision only the isolated fixture privileges and an already executed authority operation.
  await f.owner.query(`GRANT SELECT ON annual_leave_exception_grants TO ${f.role};
    GRANT UPDATE(last_login_at) ON users TO ${f.role};
    GRANT SELECT (organization_id, request_id, proposal_revision, dates), INSERT ON annual_leave_exception_proposals TO ${f.role};
    GRANT SELECT (organization_id, request_id, proposal_revision, confirmation_revision), INSERT ON annual_leave_exception_confirmations TO ${f.role};`);
  const provisionGrant = async () => {
    const person = randomUUID();
    const operation = randomUUID();
    const identity = "https://issuer.example.test";
    const hash = "a".repeat(64);
    const scope = { kind: "TENANT", targetId: f.admin.organizationId };
    const intent = { action: MANAGE_LEAVE_EXCEPTION_GRANT, scope };
    await f.owner.query("INSERT INTO bss_internal.people(id) VALUES($1)", [person]);
    await f.owner.query("INSERT INTO bss_internal.identities(issuer,subject,person_id) VALUES($1,'synthetic',$2)", [identity, person]);
    await f.owner.query(
      "INSERT INTO bss_internal.sessions(token_hash,csrf_hash,person_id,issuer,subject,authenticated_at,expires_at) VALUES($1,$1,$2,$3,'synthetic',1,2)",
      [hash, person, identity]
    );
    await f.owner.query(
      "INSERT INTO bss_internal.targets(scope_key,scope,configuration_hash,evidence_hash,release_id,preparer_ids) VALUES($1,$2,$1,$1,'synthetic','{}')",
      [hash, JSON.stringify(scope)]
    );
    const grant = (await f.owner.query<{ id: string }>(
      "INSERT INTO bss_internal.grants(person_id,action,scope_key,valid_from,expires_at) VALUES($1,$2,$3,1,2) RETURNING id",
      [person, MANAGE_LEAVE_EXCEPTION_GRANT, hash]
    )).rows[0]!;
    await f.owner.query(
      `INSERT INTO bss_internal.operations
         (id,person_id,session_hash,grant_id,grant_revision,scope_key,target_revision,target_hash,intent,payload,fingerprint,used)
       VALUES($1,$2,$3,$4,1,$3,1,$3,$5,$6,$3,true)`,
      [operation, person, hash, grant.id, JSON.stringify(intent), JSON.stringify({ administratorId: f.admin.userId, decision: "grant" })]
    );
    await f.owner.query(
      `INSERT INTO annual_leave_exception_grants
         (organization_id,administrator_id,administrator_revision,active,changed_by,operation_id)
       SELECT organization_id,id,revision,true,$2,$3 FROM users WHERE id=$1`,
      [f.admin.userId, person, operation]
    );
  };
  const service = new PgAnnualLeaveExceptionProposalService(f.appPool,
    org => org === f.admin.organizationId ? ["unpaid_leave"] : []);
  return { ...f, provisionGrant, service };
}

test("a named Admin proposes exact terms, and only the submitting worker can confirm the current revision", options, async t => {
  const f = await fixture(t);
  const created = await f.reserve.submit(f.worker, period, "mixed-proposal-http", "submit");
  assert.deepEqual(created.years, [{ year: 2030, requestedDays: 7, reservedDays: 5 }]);
  const users = new Map([
    ["admin", f.admin], ["worker", f.worker], ["manager", f.manager], ["foreign", f.other.worker],
    ["outside", { ...f.manager, departmentIds: [] }], ["different-user", { ...f.worker, userId: randomUUID() }]
  ]);
  class Auth extends FakeAuthService {
    override async resolveAccessToken(token: string) {
      const actor = users.get(token);
      if (!actor) throw new AppError("UNAUTHENTICATED", "Synthetic session required.");
      const { context } = await super.resolveAccessToken(actor.role);
      return { actor, context };
    }
  }
  const dependencies = {
    config: loadConfig({ NODE_ENV: "test", PUBLIC_ORIGIN: "https://bss.test", DATABASE_URL: url, LOG_LEVEL: "silent" }),
    authService: new Auth(), phaseAService: f.legacy, logger: false
  };
  const baseApp = await buildApp({ ...dependencies, coveredLeaveDecisions: f.reserve });
  const app = await buildApp({ ...dependencies, coveredLeaveDecisions: f.reserve, annualLeaveExceptionProposals: f.service });
  t.after(async () => { await app.close(); await baseApp.close(); });
  const req = `/api/v1/leave-requests/${created.requestId}`;
  const path = req + "/exception-proposal";
  const get = (seat: string) => app.inject({ url: path, cookies: { bss_session: seat } });
  const post = (target: string, seat: string, version: string, payload?: object) =>
    app.inject({ method: "POST", url: target, cookies: { bss_session: seat },
      headers: { origin: "https://bss.test", "if-match": version }, ...(payload ? { payload } : {}) });

  assert.equal((await baseApp.inject({ url: path, cookies: { bss_session: "worker" } })).statusCode, 404);
  assert.equal((await post(path, "admin", '"1"', proposal)).statusCode, 403);
  await f.provisionGrant();
  assert.equal((await post(path, "manager", '"1"', proposal)).statusCode, 403);
  assert.equal((await post(path, "admin", '"1"', { ...proposal, reason: "  " })).statusCode, 422);
  const posted = await post(path, "admin", '"1"', proposal);
  assert.equal(posted.statusCode, 201, posted.body);
  assert.equal(posted.headers.etag, '"2"');
  assert.equal(posted.headers["cache-control"], "no-store, private");
  assert.deepEqual(posted.json(), { requestId: created.requestId, revision: "2", proposalRevision: "2", confirmed: false, dates });
  assert.deepEqual((await get("worker")).json(), posted.json());
  assert.deepEqual((await get("manager")).json(), posted.json());
  assert.equal((await get("outside")).statusCode, 403);
  assert.equal((await get("foreign")).statusCode, 404);
  assert.equal((await get("different-user")).statusCode, 404);

  const replacedDates = dates.map((item, idx) => idx === 4 ? { ...item, type: "unpaid_leave" } as const
    : idx === 5 ? { ...item, type: "annual_leave" } as const : item);
  const replacement = await post(path, "admin", '"2"', { ...proposal, dates: replacedDates });
  assert.equal(replacement.statusCode, 201, replacement.body);
  assert.deepEqual((await get("worker")).json(), replacement.json());
  assert.equal((await post(path + "/confirm", "worker", '"2"', { dates })).json().code, "STALE_REVISION");
  assert.equal((await post(path + "/confirm", "worker", '"3"', { dates })).json().code, "CONFLICT");
  assert.equal((await post(path + "/confirm", "manager", '"3"', { dates: replacedDates })).statusCode, 403);
  assert.equal((await post(path + "/confirm", "different-user", '"3"', { dates: replacedDates })).statusCode, 403);

  const concurrent = await Promise.all(Array.from({ length: 2 }, () =>
    post(path + "/confirm", "worker", '"3"', { dates: [...replacedDates].reverse() })));
  assert.deepEqual(concurrent.map(r => r.statusCode).sort(), [200, 409]);
  const confirmed = concurrent.find(r => r.statusCode === 200)!;
  assert.equal(confirmed.headers.etag, '"4"');
  assert.deepEqual(confirmed.json(), {
    requestId: created.requestId, revision: "4", proposalRevision: "3", confirmed: true, dates: replacedDates
  });
  assert.deepEqual((await get("worker")).json(), confirmed.json());
  assert.equal((await post(req + "/covered-dates/approve", "manager", '"4"')).json().code, "CONFLICT");
  await assert.rejects(f.legacy.approveLeaveRequest(f.admin, created.requestId, "4", undefined, "legacy"), { code: "CONFLICT" });
  assert.deepEqual((await f.reserve.readCoveredDecision(f.worker, created.requestId, "pending")).years, created.years);

  const afterConfirmation = await post(path, "admin", '"4"', proposal);
  assert.equal(afterConfirmation.statusCode, 201, afterConfirmation.body);
  assert.deepEqual((await get("worker")).json(), afterConfirmation.json());
  assert.equal(afterConfirmation.json().confirmed, false);
  assert.equal((await post(path + "/confirm", "worker", '"4"', { dates: replacedDates })).json().code, "STALE_REVISION");
  assert.equal((await post(path + "/confirm", "worker", '"5"', { dates: replacedDates })).json().code, "CONFLICT");
  const fresh = await post(path + "/confirm", "worker", '"5"', { dates });
  assert.equal(fresh.statusCode, 200, fresh.body);
  assert.equal(fresh.headers.etag, '"6"');

  const audit = await f.owner.query(
    `SELECT action, actor_id, after_json FROM audit_events WHERE entity_id=$1
     AND action IN ('leave_request.propose_exception','leave_request.confirm_exception')
     ORDER BY (after_json->>'revision')::bigint`, [created.requestId]
  );
  assert.equal(audit.rows.length, 5);
  assert.equal(audit.rows[1].actor_id, f.admin.userId);
  assert.equal(audit.rows[1].after_json.reason, proposal.reason);
  assert.equal(audit.rows[1].after_json.grantRevision, "1");
  assert.equal(audit.rows[2].actor_id, f.worker.userId);
  assert.deepEqual(audit.rows[2].after_json, confirmed.json());
  assert.deepEqual(audit.rows[4].after_json, fresh.json());
  assert.equal((await f.owner.query("SELECT count(*)::integer AS n FROM annual_leave_decision_dates")).rows[0].n, 0);
  assert.equal((await f.owner.query("SELECT count(*)::integer AS n FROM annual_leave_exception_confirmations")).rows[0].n, 2);
  const outsideScope = await withTenant(f.appPool, f.other.admin, "isolation", db => db.query(
    "SELECT dates FROM annual_leave_exception_proposals WHERE request_id=$1", [created.requestId]
  ));
  assert.equal(outsideScope.rowCount, 0);
  await assert.rejects(f.owner.query("BEGIN;" + await migration("024_annual_leave_exception_proposals.down") + "COMMIT;"), /preserve history/);
  await f.owner.query("ROLLBACK");

  await f.owner.query("UPDATE annual_leave_exception_grants SET active=false,revision=revision+1");
  assert.equal((await post(path, "admin", '"6"', proposal)).statusCode, 403);
  const shorter = await post(req + "/covered-dates/confirm", "worker", '"6"', { dates: dates.slice(0, 5) });
  assert.equal(shorter.statusCode, 200, shorter.body);
  assert.equal((await get("worker")).statusCode, 404);
  assert.equal((await post(req + "/covered-dates/approve", "manager", '"7"')).statusCode, 200);
});

test("exception terms obey company policy and each year's reservation, and audit failure rolls back", options, async t => {
  const f = await fixture(t);
  await f.provisionGrant();
  await f.legacy.createLeaveRequest(f.worker,
    { typeCode: "annual_leave", startDate: "2030-12-23", endDate: "2030-12-25" }, "prior");
  const created = await f.reserve.submit(f.worker,
    { startDate: "2030-12-26", endDate: "2031-01-03" }, "mixed-cross-year", "submit");
  assert.deepEqual(created.years, [
    { year: 2030, requestedDays: 4, reservedDays: 2 }, { year: 2031, requestedDays: 3, reservedDays: 3 }
  ]);
  const mixed: ExceptionDate[] = ["2030-12-26", "2030-12-27", "2030-12-30", "2030-12-31", "2031-01-01", "2031-01-02", "2031-01-03"]
    .map((date, index) => ({ date, type: index === 2 || index === 3 ? "unpaid_leave" : "annual_leave" }));
  const write = (selection: ExceptionDate[]) => f.service.propose(f.admin, created.requestId, "1", {
    reason: proposal.reason, dates: selection
  }, "propose");
  await assert.rejects(write(mixed.map(item => ({ ...item, type: "annual_leave" }))), { code: "CONFLICT" });
  await assert.rejects(write(mixed.map((item, idx) => idx === 2 ? { ...item, type: "paid_leave" } : item)), { code: "VALIDATION_FAILED" });
  await assert.rejects(write(mixed.map((item, idx) => idx === 2 ? { ...item, date: "2030-12-29" } : item)), { code: "VALIDATION_FAILED" });
  await assert.rejects(write(mixed.map((item, idx) => idx === 2 ? { ...item, type: "annual_leave" }
    : idx === 4 ? { ...item, type: "unpaid_leave" } : item)), { code: "CONFLICT" });
  await f.owner.query(`ALTER TABLE audit_events ADD CONSTRAINT fixture_audit_failure
    CHECK (action <> 'leave_request.propose_exception') NOT VALID`);
  await assert.rejects(write(mixed), { code: "23514" });
  assert.equal((await f.reserve.readCoveredDecision(f.worker, created.requestId, "unchanged")).revision, "1");
  assert.equal((await f.owner.query("SELECT count(*)::integer AS n FROM annual_leave_exception_proposals")).rows[0].n, 0);
  await f.owner.query("ALTER TABLE audit_events DROP CONSTRAINT fixture_audit_failure");
  assert.equal((await write(mixed)).revision, "2");

  const policyRemoved = new PgAnnualLeaveExceptionProposalService(f.appPool, () => []);
  await assert.rejects(policyRemoved.confirm(f.worker, created.requestId, "2", mixed, "policy-changed"), { code: "VALIDATION_FAILED" });
  await f.owner.query("INSERT INTO holidays(organization_id,holiday_date,name) VALUES($1,'2030-12-30','Fixture holiday')",
    [f.worker.organizationId]);
  await assert.rejects(f.service.confirm(f.worker, created.requestId, "2", mixed, "calendar-changed"), { code: "VALIDATION_FAILED" });
  assert.equal((await f.service.read(f.worker, created.requestId, "pending")).confirmed, false);
});
