import assert from "node:assert/strict";
import test from "node:test";
import { assessInternalAuthority, INTERNAL_ACTIONS, type AuthorityScope, type ResolvedInternalAuthority,
  type ResolvedAuthorityIntent } from "../../src/onboarding-authority/policy.js";

const NOW = 1_800_000_000_000;
function fixture(action: typeof INTERNAL_ACTIONS[number] = "VERIFY_ONBOARDING") {
  const scope: AuthorityScope = { environmentId: "synthetic-eu", profile: "PILOT",
    kind: action === "PROVISION_TENANT" ? "PROVISIONING_REQUEST" : "TENANT", targetId: "synthetic-target-a" };
  const principal = { issuer: "synthetic-issuer", subject: "synthetic-reviewer-account", personId: "synthetic-reviewer-person" };
  const context: ResolvedInternalAuthority = { principal, authenticatedAt: NOW - 1_000, expiresAt: NOW + 10_000,
    grant: { id: "synthetic-grant", revision: "1", principal: { ...principal }, action, scope: { ...scope },
      validFrom: NOW - 1_000, expiresAt: NOW + 10_000, revoked: false } };
  const request: ResolvedAuthorityIntent = action === "VERIFY_ONBOARDING"
    ? { action, scope, preparerPersonIds: ["synthetic-preparer-person"] } : { action, scope };
  return { context, request };
}
function denied(context: unknown, request: unknown, reason: string, time = NOW) {
  assert.deepEqual(assessInternalAuthority(context, request, time), { permitted: false, reason });
}
test("inactive policy permits each separately assigned action only for its exact target", () => {
  for (const action of INTERNAL_ACTIONS) {
    const { context, request } = fixture(action);
    assert.deepEqual(assessInternalAuthority(context, request, NOW),
      { permitted: true, grantId: "synthetic-grant", grantRevision: "1" });
  }
});
test("customer actor shapes and extra caller authority fields are invalid policy context", () => {
  const { context, request } = fixture();
  for (const missing of [null, undefined]) denied(missing, request, "AUTHORITY_UNAVAILABLE");
  for (const forged of [
    { userId: "customer-admin", role: "admin", organizationId: "synthetic-target-a" },
    { ...context, approved: true }, { ...context, actorId: "founder" },
    { ...context, principal: { ...context.principal, role: "admin" } },
    { ...context, principal: { ...context.principal, personId: "" } }
  ]) denied(forged, request, "INVALID_AUTHORITY_CONTEXT");
});
test("authentication is current at the start boundary and denied exactly at expiry", () => {
  const { context, request } = fixture();
  assert.equal(assessInternalAuthority(context, request, context.authenticatedAt).permitted, true);
  denied(context, request, "AUTHENTICATION_INACTIVE", context.authenticatedAt - 1);
  denied(context, request, "AUTHENTICATION_INACTIVE", context.expiresAt);
  denied({ ...context, expiresAt: context.authenticatedAt }, request, "INVALID_AUTHORITY_CONTEXT");
});
test("missing, revoked, future and expired grants stay denied after an earlier permitted assessment", () => {
  const { context, request } = fixture();
  assert.equal(assessInternalAuthority(context, request, NOW).permitted, true);
  denied({ ...context, grant: null }, request, "GRANT_UNAVAILABLE");
  for (const patch of [{ revoked: true }, { validFrom: NOW + 1 }, { expiresAt: NOW }]) {
    denied({ ...context, grant: { ...context.grant, ...patch } }, request, "GRANT_INACTIVE");
  }
  denied({ ...context, grant: { ...context.grant, validFrom: NOW, expiresAt: NOW } }, request, "INVALID_AUTHORITY_CONTEXT");
});
test("issuer, subject and stable person binding must all match the granted identity", () => {
  const { context, request } = fixture();
  for (const key of ["issuer", "subject", "personId"] as const) {
    const changed = { ...context, principal: { ...context.principal, [key]: "synthetic-other" } };
    denied(changed, request, "GRANT_PRINCIPAL_MISMATCH");
  }
});
test("one internal capability never implies either of the other capabilities", () => {
  for (const assigned of INTERNAL_ACTIONS) {
    for (const requested of INTERNAL_ACTIONS) {
      if (assigned === requested) continue;
      denied(fixture(assigned).context, fixture(requested).request, "CAPABILITY_MISMATCH");
    }
  }
});
test("organization, environment and profile changes cannot reuse an otherwise valid grant", () => {
  const { context, request } = fixture();
  for (const patch of [{ targetId: "synthetic-target-b" }, { environmentId: "synthetic-other-environment" },
    { profile: "PRODUCTION" }]) {
    denied(context, { ...request, scope: { ...request.scope, ...patch } }, "SCOPE_MISMATCH");
  }
});
test("provisioning is bound to an approved request identity, not an arbitrary tenant target", () => {
  const { context, request } = fixture("PROVISION_TENANT");
  denied(context, { ...request, scope: { ...request.scope, targetId: "synthetic-other-request" } }, "SCOPE_MISMATCH");
  denied(context, { ...request, scope: { ...request.scope, kind: "TENANT" } }, "INVALID_AUTHORITY_INTENT");
  denied(fixture().context, { ...fixture().request, scope: request.scope }, "INVALID_AUTHORITY_INTENT");
});
test("a second login for the preparer's same person cannot certify independence", () => {
  const { context, request } = fixture();
  const alias = { issuer: "synthetic-other-issuer", subject: "synthetic-other-login", personId: "synthetic-preparer-person" };
  denied({ ...context, principal: alias, grant: { ...context.grant, principal: alias } },
    request, "REVIEWER_NOT_INDEPENDENT");
  denied(context, { ...request, preparerPersonIds: ["someone-else", context.principal.personId] },
    "REVIEWER_NOT_INDEPENDENT");
});
test("unknown preparation identity and caller-added approval or profile switches are invalid intents", () => {
  const { context, request } = fixture();
  for (const patch of [{ preparerPersonIds: [] }, { preparerPersonIds: [null] },
    { preparerPersonIds: [" "] }, { approved: true }, { actorId: "other" }, { profile: "PRODUCTION" }]) {
    denied(context, { ...request, ...patch }, "INVALID_AUTHORITY_INTENT");
  }
});
test("Demo and Internal profiles cannot receive live-approval permission even with a matching grant", () => {
  const { context, request } = fixture("APPROVE_GO_LIVE");
  for (const profile of ["DEMO", "INTERNAL"] as const) {
    const scope = { ...request.scope, profile };
    denied({ ...context, grant: { ...context.grant, scope } }, { ...request, scope }, "PROFILE_NOT_LIVE");
  }
});
test("malformed ranges, revisions, unknown actions and invalid server time fail closed", () => {
  const { context, request } = fixture();
  for (const serverTime of [NaN, Infinity, -1, NOW + 0.5])
    denied(context, request, "INVALID_SERVER_TIME", serverTime);
  for (const patch of [{ revision: "0" }, { revision: "01" }, { revision: "1.2" },
    { revision: " " }, { validFrom: NaN }, { expiresAt: Infinity }, { revoked: "false" },
    { action: "admin" }, { unexpected: true }])
    denied({ ...context, grant: { ...context.grant, ...patch } }, request, "INVALID_AUTHORITY_CONTEXT");
  for (const bad of [null, [], { ...request, action: "admin" },
    { ...request, scope: { ...request.scope, environmentId: "" } },
    { ...request, scope: { ...request.scope, profile: "UNVERIFIED" } }])
    denied(context, bad, "INVALID_AUTHORITY_INTENT");
});
test("policy evaluation preserves its inputs and requires a current grant revision on each call", () => {
  const { context, request } = fixture();
  const before = structuredClone({ context, request });
  assert.equal(assessInternalAuthority(context, request, NOW).permitted, true);
  assert.deepEqual({ context, request }, before);
  const next = { ...context, grant: { ...context.grant, revision: "2" } };
  assert.deepEqual(assessInternalAuthority(next, request, NOW), { permitted: true, grantId: "synthetic-grant", grantRevision: "2" });
});
