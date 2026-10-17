# H2-4a — Admin onboarding status and evidence UI

Status: **IMPLEMENTED FOR REVIEW / INACTIVE BY DEFAULT / PARTIAL H2-4**.
Owner: #237. Baseline: protected main `bd376510d6bd11b588b65c8e37b3146d5de6ef2b`.
The owner authorized the next independent implementation step on17October2026.
H2-1c2 #273, Admin import UI #275 and onboarding evidence backend #276 are merged
and inactive. Frozen Product Contract11–12 and the accepted D1/D2/D3 boundaries
remain unchanged. This slice does not implement trusted operator authority.

## Owning screen and user flow

Authenticated, non-demo tenant Admin opens **Priprema tvrtke** (`onboarding`).
Preview/demo and the other three customer roles have no navigation or allowed
screen. Every existing onboarding API operation still reauthorizes server-side.
The screen owns GET onboarding, PATCH evidence and POST evaluation under existing
OpenAPI1.7; no API/schema/migration/runtime grant or production composition changes.

A successful, structurally valid GET is required before any form or evaluation.
Missing provisioned identity404 and inactive/unavailable service503 show an
actionable status without a form. The tenant/profile/actor are supplied by the
server; there is no client identity/profile selector, tenant creation, promotion,
operator assignment or approval button.

The five steps show observed software prerequisites, submitted references and
current server blockers. Existing company/department/shift/holiday, worker/import,
access and terminal screens remain their owners. Following those links never
creates evidence or marks a step complete. Import is optional: existing worker
operations remain available. No default leave allowance or forced account/worker
creation is introduced.

All references remain UNVERIFIED. Observed prerequisites, a current evaluation
and completed screens are distinct from verified evidence and go-live approval.
The UI always states that live work is not approved. It cannot consume a response
that promotes readyForGoLive/goLiveApproved or a READY/APPROVED stage under this
partial contract. D3/customer/independent/operations/privacy/physical gates remain
visible. A production-named profile does not confer production readiness.

## Review, mutation and recovery

One reference is submitted at a time, within the existing100-total/500-character
reference/1000-character-note limits. Reference identifiers are escaped text, not
links, uploads or fetch targets. The form warns against credentials, documents
and unnecessary personal data. Existing immutable evidence is not edited/deleted.

An unchecked review confirmation binds the current identity/revision/configuration
checksum and exact reference draft. Editing any field, new read-back or successful
mutation clears that confirmation. PATCH sends only the existing checksum/items
body and current If-Match. Pending work blocks double submission. The backend is
the final concurrency, validation, capacity and audit authority.

Evaluation first rereads the current server state. If revision or configuration
changed, it presents that new state for review without posting an evaluation.
Otherwise the explicit evaluation request uses the current revision/checksum.
It records a blocked evaluation; it never verifies a reference or approves live use.

A stale409 clears the form/confirmation and requires read-back. An unknown
network/5xx/malformed mutation response reports uncertainty and exposes only the
GET recovery action. It never reports success, automatically replays, invents a
new mutation identity or retries with a new revision. Read-back clears drafts;
the Admin must inspect retained evidence before any fresh, explicitly reviewed
submission. A changed session/profile identity fails closed within the same
authenticated scope.

## Private browser state

History, references, notes, review confirmation and drafts stay in memory only.
No values are persisted to local/session storage, URLs, logs, service-worker
responses or test recordings. Leaving the owning screen, logout, role/tenant/user
change or a401/403 clears private state; identity/navigation change aborts scoped
requests and fences late responses. Reopening/relogin requires a new GET from
durable server state. Unknown dependency messages are not rendered.

Static cache r15 adds only the new domain/view/controller/CSS assets. Existing
API-cache exclusion remains intact. The old synthetic design-only preview stays
separate; it is not used as a source of runtime progress or authority.

## Verification and limits

-19 focused domain/controller/transport cases and224 total root tests pass after
  replacing lint-rejected control-character regexes with equivalent codepoint
  checks and adding exact boundary coverage. Initial18/223 and the2 lint failures
  remain preserved. Backend test TypeScript and108-source architecture pass;
  final lint/build and official Quick Frontend pass. Actual browser/CI/Sonar
  outcomes belong in the final PR receipt.
- The existing guarded import browser proof invokes an additional onboarding
  proof at1440px/390px, serially. It follows existing step navigation and actual
  worker import, submits unverified references, deliberately loses one mutation
  response then GETs durable state, reloads/logs out/in, tests a separate Admin's
  concurrent edit, invalidates configuration, records blocked evaluation and
  checks tenant/denied-role boundaries, keyboard, axe and both themes.
- That isolated loopback fixture uses real onboarding routes, PostgreSQL store,
  FORCE RLS/revisions/history and real import orchestration. Its known synthetic
  auth adapter and exact-byte controlled import parser remain test boundaries.
  The login HTTP entry is exercised; production password/session security and
  actual hostile-parser containment have their own existing independent proofs.
- Fixture-only grants/provisioning/configuration mutation never enter the default
  server, deployment SQL or production identity model. The helper refuses startup
  without the existing explicit synthetic-test flag and disposable DB URL.
- Pure-template visual QA with built CSS is layout evidence, not HTTP/PG proof.
  Synthetic internal screenshots are not customer-data or acceptance evidence.
  Actual CI proves PG where the16GB laptop deliberately runs no native database.

No test timeout, assertion, role gate, workflow parallelism, analyzer gate or
security control is weakened. Native tests use one CPU/serial workloads; browser
work must use one worker on this laptop. Final skipped/unavailable/failed evidence
must remain separate from PASS.

## Remaining work and recovery

H2-3/D3 trusted operator provisioning/verification, immutable authorized go-live
decision, complete customer/independent company dry run and all target-runtime,
capacity/containment/network/monitoring/privacy/backup/restore/erasure proofs remain
open. Full H2/#237, Staging/9C/Pilot/Commercial are not closed by this partial UI.

The default server still composes neither onboarding nor import. No deployment,
real grants, customer data or activation is performed. A reviewed frontend revert
can remove this owning screen; it cannot undo imports or delete evidence/workers/
audit. Existing018 populated-state down refusal and reviewed forward recovery
remain authoritative. High-risk merge and any later activation/deployment require
their separate concrete owner decision after final review.

## Initial PR verification follow-up

Initial headfedaa807 retained: backend101unit/contractPASS/1FAIL because the
backend screen-map regression still expected the earlier backend-review baseline
and19screens. It now asserts the actual UI-review baseline/20screens, exact
Admin-only onboarding operations and the explicitly retained full-workflow gap.
No API/role or substantive assertion is removed.

Initial general CI reached full-stack navigation, then rejected the expected503
from the deliberately inactive onboarding service. The browser test now explicitly
waits for that one exact GET, asserts503/ONBOARDING_UNAVAILABLE/no-store, an
actionable status and no form, and requires the complete error list to equal
that one proven response. Every other network/console/5xx failure remains a failure.
Additional login failures were observed in that failed run; auth/retry/timeouts
are unchanged and the new exact-head run must independently resolve them.

The application router now passes its active route directly to the controller;
this avoids the browser Window.screen typing ambiguity in a different classic
script and provides an explicit lifecycle boundary, with a dedicated regression.
Rendering helpers replace nested templates; braces and explicit actor selection
clarify the fixture orchestration. No Sonar finding is suppressed/accepted. Final
new-code findings and actual browser/PG outcomes belong in the PR receipt.
