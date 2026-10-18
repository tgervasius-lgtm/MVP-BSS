# D3 — internal onboarding authority and complete rehearsal proposal

Status: **OWNER-ACCEPTED RULES / INACTIVE POLICY FOUNDATION FOR REVIEW / TRUST TRANSPORT OPEN**

Prepared: 17 October 2026 (Europe/Warsaw). Tracking: [#237](https://github.com/tgervasius-lgtm/MVP-BSS/issues/237).
Reviewed protected main: `57d1cf88d28f837af5ecb4a2d5f6629ac283c7be`, tree `1a2922e5958bae788a5c3f06a4ba8e278a6d0d32`; #277 is merged.

On 18 October 2026 at 11:44:14 CEST the owner accepted the seven rules in the Croatian review summary as a basis for further technical elaboration and testing. The approved direction covers customer/internal separation, scoped internal permissions, a distinct independent reviewer, attributable evidence, separate readiness/approval, revalidation and a synthetic full journey. It does not appoint a person, provision an account, assign an operational grant, accept an authentication transport, authorize merge/deployment/live data, or prove implementation. #237, full H2-3/D3 and H2-4 remain open.

## 1. Problem and authority

The accepted [Product Contract, section 11](../../BSS_V1_PRODUCT_CONTRACT.md#11-customer-onboarding-contract) requires resumable tenant onboarding, computed readiness, an independent second-person dry run and an explicit authorized go-live decision. The accepted [D3 framework](H2_IMPORT_ONBOARDING_DECISION_PROPOSAL.md#6-d3--operator-and-go-live-boundary) separates customer Admin actions from named BSS provisioning and release authority.

Current software can record private Admin references and re-observe configuration. It cannot authenticate an internal operator, verify external evidence or approve go-live. A submitted reference is not a verified fact. Completing screens, a CI result, a founder title or repository access does not supply the missing authority.

The source hierarchy remains [AGENTS.md](../../AGENTS.md). [OM-01](OPERATIONS_FOUNDATION_V1.md) is accepted architecture only. The [Identity OS](IDENTITY_ACCESS_SECRETS_MANAGEMENT_OS.md) and [Pilot Readiness package](PILOT_READINESS_PACKAGE.md) retain their own proposal/evidence boundaries; this document does not silently accept them.

## 2. Verified baseline and scope

| Current source | Observed boundary |
| --- | --- |
| [bootstrap.ts](../../backend/src/db/bootstrap.ts) | Creates organization/default references/Admin with a system audit actor and NULL actor ID. It is not named-person D3 attribution and must not be exposed as a customer operation. |
| [onboarding/model.ts](../../backend/src/onboarding/model.ts) | All submitted evidence is UNVERIFIED; both live booleans are literal false. |
| [onboarding/evaluation.ts](../../backend/src/onboarding/evaluation.ts) | Customer acceptance, independent dry run, operations/privacy and unavailable operator authority always block readiness. |
| [pg-onboarding-store.ts](../../backend/src/onboarding/pg-onboarding-store.ts) | Admin-only existing-tenant/profile evidence and evaluation, revision/checksum checks, append-only history and transactional audit. |
| [server.ts](../../backend/src/server.ts) | Default composition does not register import or onboarding services. |
| [Admin UI](../ux/H2_ADMIN_ONBOARDING_UI_2026-10-17.md) | Existing setup navigation, private evidence, review and recovery; no internal authority or approval control. |

This candidate adds an isolated [policy calculation](../../backend/src/onboarding-authority/policy.ts) and [synthetic unit tests](../../backend/test/unit/onboarding-authority.test.ts). It evaluates exact server-resolved principal/grant/action/target bindings, authentication/grant time windows and revocation, and independent-person separation. It performs no credential/signature/MFA verification, issues no authority token, writes no data and computes no readiness/go-live approval. Inputs must come from a future reviewed authentication/private-registry adapter and server-owned preparation history; the calculation is not an authentication boundary. There is no application/route/service composition. Existing onboarding blockers and literal false live flags remain unchanged. No current API/schema/migration/deployment grant/workflow/secret/access control or UI behavior changes.

## 3. Responsibilities and tentative staffing

These are functions, not a requirement to employ five people.

| Function | Responsibility | Source of authority |
| --- | --- | --- |
| Customer Admin | Prepare/review own company's settings and data; confirm intended usage | Existing authenticated tenant Admin plus recorded customer acceptance |
| BSS provisioner | Execute the approved, scoped creation/preparation request | Separately approved internal identity and provisioning grant |
| Independent reviewer | Personally review the specified rehearsal and attest its result/limits | Separately authorized reviewer, distinct from the preparer |
| BSS release approver | Record a reasoned go/no-go after current prerequisites and evidence pass | Separately approved release grant; founder status alone grants nothing |
| Developer/maintainer | Implement, test, document and repair software | Repository/development access; no automatic production or release authority |

A person may hold multiple expressly approved functions where accepted separation permits. Multiple accounts for the same person do not make a check independent. The preparer cannot certify their own independent rehearsal. This proposal does not add a universal requirement that the reviewer and final release approver be different people; the applicable release/access policy must settle any further separation.

No actual operator/reviewer identity, engagement, budget, schedule or review outcome is assigned by this proposal. Real names/accounts belong in a private BSS register, not this public repository. Naming them is an activation prerequisite, not a prerequisite for synthetic design/testing.

A product-wide technical review and each company's setup acceptance are separate evidence. A historical product audit cannot approve later code/configuration changes or every future customer. Automated tests and AI assistance do not impersonate the independent human reviewer.

## 4. Internal boundary — accepted direction, transport review open

Recommended direction: a dedicated server-side onboarding authority module with a trusted internal invocation adapter, a private scoped grant registry and append-only decision evidence. Retain the four customer roles unchanged.

| Concern | Proposed enforcement |
| --- | --- |
| Authenticated principal | Adapter supplies a verified issuer/subject, private stable person identity, workload identity where applicable and authentication evidence. Caller body/CLI arguments cannot choose the authenticated actor. |
| Authorization | Server resolves active grants for an exact action, environment/profile and target organization/request. Scope, expiry, suspension/revocation and grant revision are checked on every operation, including replay. |
| Separate capabilities | Model provisioning, verification and release as distinct internal capabilities. Possession of one does not imply the others. Capability names/schema remain part of the later reviewed contract. |
| New organization | Authorize against a pre-approved provisioning request before an organization exists. Persist the request-to-created-organization link; prohibit arbitrary cross-tenant targets and silent duplicate creation. |
| Human attribution | Preserve both the authenticated human and any executing workload. A machine identity or a system audit row cannot substitute for a person's approval. |
| Reviewer independence | Resolve preparer and reviewer to approved private person identities. Reject the same person even through different logins; unknown identity linkage remains unproven. |
| Customer boundary | Customer session/tenant Admin, request headers, client role fields, evidence URLs and repository membership cannot establish internal grants. |
| DB boundary | Internal runtime remains non-owner, NOSUPERUSER/NOBYPASSRLS. Customer runtime gets no internal grant/verification/approval writes. Narrow tenant-scoped policies or reviewed procedures must enforce attribution and atomic audit; do not reuse blanket system/bootstrap access. |
| Missing trust | Absent/unverifiable principal, unavailable grant source or invalid scope denies the mutation. No environment flag, local-owner fallback or test principal in production. |

Authentication transport is a real unresolved technical decision. The later security review must select an existing controlled operator/release entry point or a separately justified internal command/API and specify issuer/audience/key validation, MFA/fresh human approval, replay protection, revocation, private custody and recovery. Repository access, a locally supplied actor ID or possession of a DB password is insufficient.

**Do not build or expose provisioning/verification/approval mutations until that adapter/trust contract and exact actor/evidence/enforcement are accepted under #95/#59/#62.** A synthetic test adapter may exercise an isolated domain in tests; it must not become a production composition option or prove production authentication.

This proposal creates no workflow, IdP, control plane, paid vendor, operational access grant or public internal endpoint.

## 5. Evidence and decision records

Keep submitted customer references immutable and UNVERIFIED. A later trusted verification appends a separate record; it never overwrites the original into a different claim.

Proposed verification identity binds organization, environment/profile, onboarding identity, step, submitted evidence IDs, current configuration checksum, contract version, software/release identity, preparer/reviewer identities, method, result, server timestamp and bounded private evidence references. Preserve limitations and correction/supersession history. Do not fetch arbitrary submitted URLs, ingest customer documents, store credentials or copy raw evidence into logs.

Evidence must establish, as applicable:

1. Customer acceptance of company settings, intended usage, workforce/reference mappings, permissions and terminal applicability.
2. An independent rehearsal with actual observations and explicit limitations.
3. Applicable environment, operations/privacy, recovery and physical evidence, with their proper owners and current artifact/configuration linkage.
4. Required global AUDIT C and customer GO/NO-GO evidence before live Pilot use; a synthetic rehearsal cannot issue these approvals.

The server computes readiness only when the accepted profile-specific prerequisites and applicable verified evidence are current. Missing/unknown applicability remains blocking. Neither DEMO nor INTERNAL becomes a live-approved profile. No web-only/terminal policy or missing report requirement is invented here.

A separate immutable go-live decision binds the authorized approver, decision/time/reason, exact tenant/profile, onboarding revision, configuration/evidence/contract/release identities, limitations and rollback contacts. A denial is retained as evidence, not an approval. An open critical blocker cannot be hidden as an accepted limitation.

Readiness, approval and deployment remain separate. A go-live record does not itself deploy software, grant DB access, start customer processing or automatically enable every feature. Runtime activation remains a separately reviewed step.

## 6. Transactions, concurrency and recovery

- Re-authenticate/authorize before read-back or idempotent replay. Persist original actor attribution even when a different currently authorized actor reads a result.
- Bind each mutation to expected onboarding revision, configuration checksum, evidence-set identity and an idempotency/request identity. An exact completed replay returns the original result; different payload with the same key conflicts.
- Re-observe current prerequisites in the same controlled decision transaction. Configuration/evidence writers and decision writers need a common serialized revision/locking mechanism; the current GET snapshot alone cannot fence a concurrent approval race. Prove both lock orders with real PostgreSQL.
- Commit records, revision and audit atomically. A failed audit or partial verification cannot leave an approval or partially provisioned tenant.
- Resolve unknown responses through the original request/result identity; do not issue a new provisioning or release command blindly.
- Changed relevant settings, evidence, release identity or expired/revoked authority require defined revalidation. Preserve old decisions as historical facts while clearly separating their current applicability.
- This proposal does not introduce an automatic tenant-wide shutdown, attendance deletion or a new emergency bypass. Operational suspension/incident action needs its own accepted procedure.
- Recovery disables the new invocation/composition and preserves customer/import/decision history. An applied migration with records requires reviewed forward recovery, not destructive rollback.

The exact migration/policy/audit representation, identity lifecycle and concurrency protocol must be reviewed before persistence implementation. No existing migration checksum may be rewritten.

## 7. Complete synthetic-company rehearsal — required evidence plan

The following is a plan, **not an executed test or PASS**. Use only synthetic people and `example.invalid` identifiers, an explicit disposable PostgreSQL database and separately labeled test environment.

| Stage | Required execution/evidence |
| --- | --- |
| Controlled creation | Approved synthetic provisioning request through the eventual internal service; atomic organization/Admin/onboarding creation, named synthetic attribution and exact retry. Owner SQL/bootstrap seeding alone is not complete creation proof. |
| Customer access | Real customer authentication/session and existing tenant-scoped APIs with synthetic accounts; verify tenant/role denial, logout/relogin and persisted progress. Label any substituted auth adapter. |
| Company setup | Real organization, departments, shifts, holidays/calendars and required allowance operations; verify actual persisted state. Navigation or a fake facade is insufficient. |
| People preparation | Actual import orchestration/store/PG and existing worker invariants; whole-batch validation/commit/recovery. Separate deterministic browser fixtures from actual hostile parser/isolation evidence. |
| Access and terminal | Existing invitations/scopes/RFID/pairing operations as applicable; record unproven applicability and physical limits. Simulated terminal behavior is not installation/power-loss/RFID proof. |
| Rehearsal | Exercise supported arrival/departure, review/correction and report paths with the same company; identify independently owned gaps, including explicit locked report-version selection. Do not silently mark them complete. |
| Trusted verification | Second synthetic person distinct from the preparer; verify current evidence and negative/stale/identity cases through the isolated authority boundary. Synthetic trust is not actual human acceptance. |
| Decision and recovery | Readiness distinct from approval; allowed/denied decisions, concurrent edits, audit rollback, uncertain-result recovery and replay, service restart and evidence invalidation. No live profile authorization inferred from this rehearsal. |

The #277 browser evidence remains useful for its owning UI scope. Its synthetic auth, known-byte parser, fake reference-screen facade and owner fixture provisioning do not prove this complete journey. Existing passing evidence is retained with those limits.

## 8. Verification requirements for later implementation

| Layer | Required positive and negative evidence |
| --- | --- |
| Domain | Exact capability/scope/profile, expiry/revocation, missing trust, same person through two accounts, preparer/reviewer separation, forged actor/approval, missing/failed/stale evidence and non-live profiles |
| PostgreSQL | Fresh/upgrade migrations, FORCE RLS, customer runtime denied internal writes, non-bypass internal role, cross-tenant/profile isolation, append-only attribution, atomic provision/verify/decision/audit, both concurrency orders and guarded recovery |
| Invocation | Real selected authentication verifier, untrusted issuer/audience/key/request rejection, replay/expiry/revocation, no client-selected actor, production refusal of test adapters and no customer route escalation |
| Browser/full journey | Real existing setup APIs and customer auth, persistence/relogin, concurrent edits, denied roles, unknown response recovery, keyboard/axe/responsive behavior; fixture substitutions labeled |
| Release/operations | Actual named private assignments, verified access/custody, current evidence, deployment/backup/restore/physical/legal/Pilot gates as applicable; unavailable evidence is not PASS |

Do not repeat unrelated suites for this documentation-only change. Run the existing Docs verification wrapper and focused link/diff review; subsequent runtime changes require their own relevant tests, real PG evidence and required CI.

## 9. Delivery and decision sequence

1. The owner accepted the seven-rule responsibility/permission/evidence direction on 18 October. Continue scoped technical elaboration under #237 with #95/#59/#62 ownership. Exact transport and implementation contracts still need review; no actual person need be appointed for synthetic design.
2. Resolve the internal authentication/invocation trust contract before dependent mutations. Re-read current main/OpenAPI/RLS/audit/release contracts and prepare one focused implementation scope with acceptance/recovery.
3. The current candidate supplies only isolated policy validation and synthetic tests. Then build reviewed persistence/invocation slices after their prerequisites are accepted. Keep production composition/grants absent and test adapters test-only. Each slice gets its own review/checks; owner approval remains required before high-risk merge/deploy.
4. Extend the full synthetic-company journey against real existing services. Synchronize any changed OpenAPI and the frontend schemas that currently reject authority-promoting responses.
5. Appoint actual private identities and verify environment/security/privacy/recovery/physical/Pilot gates before separately authorized activation. Full H2-3/H2-4 and #237 remain partial until their evidence exists.

Review questions concern the technical trust path and policy, not a request to hire or name somebody now. A later contractor/auditor may fulfil separately approved functions; no future engagement is treated as available evidence.

## 10. Verification record for this proposal

Implementation status: isolated policy foundation for review. The synthetic tests exercise separate capabilities, exact tenant/request/environment/profile and principal binding, grant revocation/expiry, authentication windows, same-person aliases, malformed/forged shapes and non-live profile denial. They do not verify a real credential, private registry, RLS, mutation, complete company journey or independent human acceptance. Applicable native lint/build/Docs/Backend checks and exact-head CI results belong in the PR description and continuation checkpoint. No new DB/RLS/persistence code is added; existing PostgreSQL regression evidence is distinct from this policy's unit evidence.

Recovery removes the isolated module/tests and proposal/link, or keeps the optional boundary uncomposed; no retained business evidence is touched. No high-risk merge, deployment, provider change, customer data, additional paid model run or operational access change is authorized by this candidate.
