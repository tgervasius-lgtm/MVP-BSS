# H2-3a — resumable onboarding evidence foundation

Status: IMPLEMENTED FOR REVIEW / INACTIVE / PARTIAL H2-3. Issue #237 remains open.
Baseline: protected main a922080f456edf6737545ed545f75b05b7034271, reviewed17October2026.
Authority: frozen Product Contract11–12, accepted D1/D2/D3 framework and owner continuation17October.
Impact: backend/API, additive database/RLS, privacy and audit; no new customer role or operator identity.

## Narrow scope and authority

H2-1c2 #273 and Admin import UI #275 are merged/inactive. This slice supplies
three Admin-only operations for an already provisioned tenant/profile:
GET /onboarding, PATCH /onboarding/evidence and POST /onboarding/evaluate.
Default server.ts has no onboarding dependency. Missing composition returns
503 ONBOARDING_UNAVAILABLE; no environment switch, provisioning/approval route,
production grants or backend deployment is added. H2-4 UI is a separate slice.

The environment profile must be passed explicitly by the future reviewed
composition. There is no client profile/tenant/actor selector. Each organization
and profile has a distinct immutable onboarding identity; a missing identity is
404. Only synthetic migration-owner fixtures provision identities in this PR.
Actual operator attribution/authentication/provisioning stays blocked on D3,
#95/#59/#62. Do not use raw SQL/bootstrap as proof of a named person's approval.
No internal super-role or owner self-approval is inferred.

## Evidence and current prerequisites

References are opaque identifiers in an approved private register, with bounded
optional context. No file upload, automatic URL resolution or external fetch.
Do not submit passwords, tokens, recovery codes, raw worker/customer documents
or unnecessary personal data. References and notes are private tenant/Admin data;
ordinary request/audit logs contain neither their values nor configuration values.
There are at most100 retained references,20 per request,500 reference characters
and1000 note characters. Exact step/reference duplicates conflict; old records
remain immutable. Corrections use a distinct governed reference with context;
this API neither verifies nor deletes earlier evidence.

Every submitted entry stays UNVERIFIED and carries server-derived submitter/time,
session revision and configuration checksum. Client verified/approved/role/actor
fields are rejected. The checksum binds implementation/contract/profile to current
organization, departments, shifts, calendars/holidays, workers, user readiness,
invitations/scopes, terminal pairing and RFID metadata. Secrets/raw identity values
are not returned. One SQL statement observes one MVCC snapshot; sorted aggregates
produce bounded fingerprint results. Existing5-second tenant statement timeout
is preserved. Telemetry such as last-seen/queue depth does not prove readiness.

Company/people/access/terminal observations identify the earliest missing software
step. A nonempty workforce may be prepared through existing worker APIs or atomic
import; no forced import or hidden worker/account creation. A paired terminal and
card coverage are observations only; missing terminal evidence leaves applicability
unverified rather than inventing a web-only/terminal deployment policy. Holidays,
intended access coverage and physical applicability still require customer review.

Customer configuration, independent second-person dry run, operations/privacy/
recovery/physical evidence and named operator authority ALWAYS remain blocking.
DEMO/INTERNAL also have an explicit non-live-profile blocker. The response cannot
reach READY_FOR_GO_LIVE or GO_LIVE_APPROVED: both booleans are false and these stages
are absent from this implemented response schema. This is a partial foundation,
not the complete frozen onboarding workflow or a simulated approval mechanism.

## Revision, recovery and audit

Every mutation requires current If-Match AND the checksum the Admin reviewed.
The session lock serializes Admin edits. Configuration changes without a session
revision change still reject the stale reviewed checksum. GET re-observes current
prerequisites and marks old submitted references stale; it does not rewrite old
evidence or mutate state. Evidence append invalidates the persisted evaluation.
POST evaluate appends immutable blocker/checksum/actor evidence, advances revision
and remains blocked. A current evaluation may still have blockers; a false
revalidationRequired only means the stored evaluation matches the observed config.
Concurrent configuration changes after that observation require the next read/
review. This observation is never used for activation, approval or a worker write.

Progress survives service restart/relogin. Lost mutation response: GET the original
identity and evidence. Old-revision replay conflicts and cannot append again; a new
revision is not automatic retry permission. Audit failure rolls back evidence,
evaluation and session revision together. Audit stores session/revision/profile,
not reference/note values. There is no blind external action or new side effect.

## Storage, access and recovery

Additive migration018 creates onboarding_sessions/evidence/evaluations with FORCE
RLS, Admin-and-tenant policies, composite tenant foreign keys, immutable identity/
append-only history and a serialized100-reference bound. Existing migration files
and checksums remain unchanged. PUBLIC receives no access. A SELECT-only policy for the current separate table/migration
owner makes down guards see retained rows even under NOSUPERUSER/NOBYPASSRLS;
it follows role renames/table ownership and grants no customer/runtime identity
this role or cross-tenant access. The deployment grants
script explicitly revokes the new tables after its broad SELECT; nothing applies
those grants to a real environment in this change. Runtime stays non-owner,
NOSUPERUSER/NOBYPASSRLS. Existing ordinary Admin login does not provision identities.

Recovery disables/omits this optional service and preserves evidence/history.
018 down works only while all three tables are empty; populated state requires
reviewed forward recovery. Existing production down prohibition remains intact.
No worker/import history is deleted. Evidence retention, legal holds, lawful
offboarding, backup/restore quarantine and erasure need their separately approved
operating process before real data; append-only application controls do not claim
permanent legal retention or backup erasure. No customer data is authorized.

## Verification and remaining gates

Focused tests cover pure evaluation/forgery, HTTP denial/origin/errors/rate limits,
real PostgreSQL FORCE RLS/foreign keys/profile isolation, resume/current config
invalidation, stale concurrent Admin writes, immutable history/capacity, atomic
rollback on audit failure, clean upgrade/down/up and refusal to destroy evidence.
Real HTTP/PG recovery intentionally discards one response then reads the durable
state. Actual required CI/log counts belong in the final PR description. Native
PG is not assumed; an absent explicit disposable DB is UNAVAILABLE, never PASS.

Historical017/016 rollback tests explicitly step past the new empty018 layer
before exercising their original guards. The non-bypass migration-owner test
also covers018 with the narrowly required REFERENCES users permission. Original
parser/admission/lease guard assertions and security controls remain unchanged.

No browser UI is added, so this slice does not claim H2-4 browser/keyboard/axe or
complete-company dry-run acceptance. D3 trusted identities/verifiers and immutable
go-live decisions, H2-4, target-runtime/privacy/restore/customer acceptance and all
Staging/Hardware9C/Pilot/Commercial gates remain open. High-risk merge and any later
activation/deployment require their own concrete owner approval after review.
