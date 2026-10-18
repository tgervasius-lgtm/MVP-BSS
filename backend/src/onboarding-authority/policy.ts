import { PROFILES, type Profile } from "../onboarding/model.js";

export const INTERNAL_ACTIONS = ["PROVISION_TENANT", "VERIFY_ONBOARDING", "APPROVE_GO_LIVE"] as const;
type InternalAction = typeof INTERNAL_ACTIONS[number];
export type PrincipalBinding = Readonly<{ issuer: string; subject: string; personId: string }>;
export type AuthorityScope = Readonly<{
  environmentId: string; profile: Profile; kind: "PROVISIONING_REQUEST" | "TENANT"; targetId: string;
}>;
export type InternalGrant = Readonly<{
  id: string; revision: string; principal: PrincipalBinding; action: InternalAction;
  scope: AuthorityScope; validFrom: number; expiresAt: number; revoked: boolean;
}>;
export type ResolvedInternalAuthority = Readonly<{
  principal: PrincipalBinding; authenticatedAt: number; expiresAt: number; grant: InternalGrant | null;
}>;
export type ResolvedAuthorityIntent =
  | Readonly<{ action: "PROVISION_TENANT" | "APPROVE_GO_LIVE"; scope: AuthorityScope }>
  | Readonly<{ action: "VERIFY_ONBOARDING"; scope: AuthorityScope; preparerPersonIds: readonly string[] }>;
type Denial =
  | "AUTHORITY_UNAVAILABLE" | "INVALID_AUTHORITY_CONTEXT" | "INVALID_AUTHORITY_INTENT"
  | "INVALID_SERVER_TIME" | "AUTHENTICATION_INACTIVE" | "GRANT_UNAVAILABLE"
  | "GRANT_INACTIVE" | "GRANT_PRINCIPAL_MISMATCH" | "CAPABILITY_MISMATCH"
  | "SCOPE_MISMATCH" | "REVIEWER_NOT_INDEPENDENT" | "PROFILE_NOT_LIVE";
export type AuthorityAssessment =
  | Readonly<{ permitted: false; reason: Denial }>
  | Readonly<{ permitted: true; grantId: string; grantRevision: string }>;

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
function exact(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value);
  return actual.length === keys.length && actual.every(key => keys.includes(key));
}
function identifier(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.trim() === value
    && !/[\u0000-\u001f\u007f]/.test(value);
}
function timestamp(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}
function interval(start: unknown, end: unknown): boolean {
  return timestamp(start) && timestamp(end) && start < end;
}
function principal(value: unknown): value is PrincipalBinding {
  return record(value) && exact(value, ["issuer", "subject", "personId"])
    && identifier(value.issuer) && identifier(value.subject) && identifier(value.personId);
}
function scope(value: unknown): value is AuthorityScope {
  return record(value) && exact(value, ["environmentId", "profile", "kind", "targetId"])
    && identifier(value.environmentId) && identifier(value.targetId)
    && PROFILES.includes(value.profile as Profile)
    && (value.kind === "PROVISIONING_REQUEST" || value.kind === "TENANT");
}
function action(value: unknown): value is InternalAction {
  return INTERNAL_ACTIONS.includes(value as InternalAction);
}
function grant(value: unknown): value is InternalGrant {
  return record(value) && exact(value, ["id", "revision", "principal", "action", "scope", "validFrom", "expiresAt", "revoked"])
    && identifier(value.id) && typeof value.revision === "string" && /^[1-9]\d*$/.test(value.revision)
    && principal(value.principal) && action(value.action) && scope(value.scope)
    && interval(value.validFrom, value.expiresAt) && typeof value.revoked === "boolean";
}
function authority(value: unknown): value is ResolvedInternalAuthority {
  return record(value) && exact(value, ["principal", "authenticatedAt", "expiresAt", "grant"])
    && principal(value.principal) && interval(value.authenticatedAt, value.expiresAt)
    && (value.grant === null || grant(value.grant));
}
function preparerIdentities(value: unknown): value is readonly string[] {
  if (!Array.isArray(value) || value.length === 0) return false;
  for (let index = 0; index < value.length; index += 1) {
    if (!Object.hasOwn(value, index) || !identifier(value[index])) return false;
  }
  return true;
}
function intent(value: unknown): value is ResolvedAuthorityIntent {
  if (!record(value) || !action(value.action) || !scope(value.scope)) return false;
  if (value.action === "VERIFY_ONBOARDING") {
    return exact(value, ["action", "scope", "preparerPersonIds"]) && value.scope.kind === "TENANT"
      && preparerIdentities(value.preparerPersonIds);
  }
  return exact(value, ["action", "scope"])
    && value.scope.kind === (value.action === "PROVISION_TENANT" ? "PROVISIONING_REQUEST" : "TENANT");
}
function samePrincipal(left: PrincipalBinding, right: PrincipalBinding): boolean {
  return left.issuer === right.issuer && left.subject === right.subject && left.personId === right.personId;
}
function sameScope(left: AuthorityScope, right: AuthorityScope): boolean {
  return left.environmentId === right.environmentId && left.profile === right.profile
    && left.kind === right.kind && left.targetId === right.targetId;
}
function deny(reason: Denial): AuthorityAssessment {
  return { permitted: false, reason };
}

function grantDenial(
  assigned: InternalGrant, actor: PrincipalBinding, requested: ResolvedAuthorityIntent, serverTime: number
): Denial | null {
  if (assigned.revoked || serverTime < assigned.validFrom || serverTime >= assigned.expiresAt) return "GRANT_INACTIVE";
  if (!samePrincipal(actor, assigned.principal)) return "GRANT_PRINCIPAL_MISMATCH";
  if (assigned.action !== requested.action) return "CAPABILITY_MISMATCH";
  if (!sameScope(assigned.scope, requested.scope)) return "SCOPE_MISMATCH";
  return null;
}
function intentDenial(actor: PrincipalBinding, requested: ResolvedAuthorityIntent): Denial | null {
  if (requested.action === "APPROVE_GO_LIVE" && (requested.scope.profile === "DEMO" || requested.scope.profile === "INTERNAL"))
    return "PROFILE_NOT_LIVE";
  if (requested.action === "VERIFY_ONBOARDING" && requested.preparerPersonIds.includes(actor.personId))
    return "REVIEWER_NOT_INDEPENDENT";
  return null;
}

/**
 * Inactive policy calculation only. Inputs must be resolved by a future reviewed
 * authentication/private-registry adapter and server-owned preparation history.
 * This function verifies no credential/signature/MFA, mints no authority token,
 * performs no mutation and establishes neither readiness nor go-live approval.
 * Never pass a client body, tenant session or decoded unverified token as context.
 */
export function assessInternalAuthority(
  resolved: unknown, requested: unknown, serverTime: number
): AuthorityAssessment {
  if (!timestamp(serverTime)) return deny("INVALID_SERVER_TIME");
  if (resolved === null || resolved === undefined) return deny("AUTHORITY_UNAVAILABLE");
  if (!authority(resolved)) return deny("INVALID_AUTHORITY_CONTEXT");
  if (serverTime < resolved.authenticatedAt || serverTime >= resolved.expiresAt)
    return deny("AUTHENTICATION_INACTIVE");
  if (!intent(requested)) return deny("INVALID_AUTHORITY_INTENT");
  const assigned = resolved.grant;
  if (assigned === null) return deny("GRANT_UNAVAILABLE");
  const reason = grantDenial(assigned, resolved.principal, requested, serverTime) ?? intentDenial(resolved.principal, requested);
  if (reason !== null) return deny(reason);
  return { permitted: true, grantId: assigned.id, grantRevision: assigned.revision };
}
