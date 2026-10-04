# Customer onboarding and employee import — implementation preparation

Status: **PROPOSED / PREPARED / RUNTIME NOT IMPLEMENTED**

Reviewed: 2026-10-04 (Europe/Warsaw)

Implementation owner: [#237](https://github.com/tgervasius-lgtm/MVP-BSS/issues/237)

Source baseline: `e6d191c0933d3e32dce68ef874a9b8af722a64d8`

Authority: frozen `BSS_V1_PRODUCT_CONTRACT.md` sections 11–12; accepted Master Roadmap v4.9

The owner authorized status synchronization and preparation of this package. This document records an implementation proposal and acceptance plan. It does not implement endpoints, migrations or screens, approve a retention/capacity value, authorize customer data, approve a go-live actor, change the frozen scope, or authorize merge/deploy.

## 1. Current implementation and dependencies

| Available on the source baseline | Use and limit |
|---|---|
| Organization, department, shift, holiday, worker and user APIs | Reuse existing business rules and role boundaries; these operations do not constitute a resumable onboarding workflow. |
| `PgPhaseAService.createWorker`, `requireActiveWorkerAssignment`, audit and `withTenant` | Current worker creation opens its own tenant transaction. Repeating the public method per row would violate atomic batch commit. Reuse a reviewed transaction-level primitive instead. |
| Worker lifecycle/department history triggers and unique indexes | Imported workers must preserve the same history and uniqueness invariants; do not bypass triggers or fabricate historical effective dates. |
| `backend/src/db/bootstrap.ts` | Existing operator bootstrap is a reference for controlled tenant creation, not permission to expose owner credentials or tenant creation to every customer Admin. |
| ExcelJS in the backend dependency graph | Existing export dependency is only a parser candidate. Its presence does not prove hostile XLSX ingestion safety; bounded archive/parsing behavior requires separate review and evidence. |
| Period/report/terminal UI from #228/#233/#235/#236 | May supply onboarding checks; a terminal pairing or displayed success does not prove physical installation, durable offline behavior or Pilot readiness. |
| OM-01 architecture (#229; #225 completed) | Defines minimum operations boundaries. It has not provisioned staging, monitoring, backup/restore or a generic control plane. |

The API map still correctly marks onboarding/import as `contract-defined-gap`. The frozen workflow requires new API/data ownership, not a UI wrapper around individual worker creates. Explicit locked report-version selection remains a separate reporting gap and is not silently absorbed into #237.

## 2. Proposed delivery slices

| Slice | Reviewable output | Exit evidence / dependency |
|---|---|---|
| H2-0 — contract and decision review | Approved decision record for section 3; candidate OpenAPI operations, errors, revisions, data lifecycle and migration/recovery design | No unresolved authority or policy contradiction for the dependent slice. Existing Product Contract remains unchanged. |
| H2-1 — atomic import backend | Dedicated domain/routes, bounded parsing, private staging, validation, preview, commit/cancel/read-back and cleanup | Real PostgreSQL atomicity/RLS/race evidence and API contract tests; no production credentials or worker data. |
| H2-2 — import UI | Admin upload, mapping, errors/preview, explicit approval, result, expiry/cancel and recovery | Browser/keyboard/axe/responsive tests against H2-1; other roles denied server-side. |
| H2-3 — onboarding evidence backend | Resumable tenant-scoped steps, prerequisite evaluation and separate authorized approval record | Real PostgreSQL role/revision/invalidation tests. Internal provisioning/approval authority must be resolved before exposing those mutations. |
| H2-4 — onboarding UI and complete dry run | Evidence-driven steps using existing APIs plus import; complete synthetic-company journey | Persist/relogin/concurrent-edit/recovery/browser evidence, visible limitations and no automatic live approval. |

Keep each slice in a focused PR from then-current main. Prefer dedicated import/onboarding services to growth of `PgPhaseAService`/`PgMvpService`; a small shared transaction helper extraction is allowed only when needed and independently verified. This plan does not authorize a queue platform, separate worker service, new vendor or speculative bulk refactor.

## 3. Decisions before dependent runtime activation

These are implementation choices explicitly left open by the frozen contract. Preparation can finish with them visible; production parsing/storage/go-live must not use guessed defaults. The implementation author prepares measured options; BSS technical/product/privacy owners accept the applicable policy in a versioned record.

| Decision | Prepared recommendation / alternative | Required evidence and stop boundary |
|---|---|---|
| D1 — ingestion capacity | Start with a bounded synchronous path if measured CPU/memory/database behavior permits it; use a deferred path only if measured workload requires one. Define accepted CSV dialect/encoding, XLSX sheet selection, byte/row/cell/column/archive-expansion limits, parse/transaction timeout, concurrent-session and tenant request limits together. | Use synthetic valid and adversarial files on the target runtime. Publish numeric limits and rejection behavior before upload. Limits absent or exceeded must fail closed before uncontrolled allocation/writes. Existing `withTenant` uses a 5-second statement timeout; do not silently raise it for imports. |
| D2 — private lifecycle and replay retention | Minimize raw-file retention; prefer discarding raw bytes after a persisted checksum and validated staged representation are safely recorded. Retain private staging only until a terminal state or configured expiry. Keep a separate minimal result/idempotency record for the approved replay/audit period. | Set numeric expiry/purge deadlines and storage/access/encryption controls before activation. Demonstrate cleanup after success, cancellation, failure, expiry and process restart. Purging staging must not allow the same commit identity to create workers again. An expired replay record must yield a documented fail-closed outcome, not silent re-execution. |
| D3 — tenant creation and go-live authority | Retain controlled, named BSS operator provisioning separately from customer Admin actions. Record explicit go-live approval through the accepted internal release/operational authority; do not infer an internal super-role from the four customer roles. | #95/#59 own the internal identity/provisioning boundary; #62 and AUDIT C own customer go-live acceptance. Define exact authorized actor, evidence and enforcement before building the approval mutation. Customer Admin must not grant cross-tenant authority or bypass BSS/customer approval. |

Until D1/D2 are accepted, parser prototypes may use synthetic in-memory fixtures with explicit test-only limits; they must not be represented as the upload feature. D3 does not block independent import work once D1/D2 and its own API/data review are resolved. No new paid model run or automation is needed to decide these policies.

## 4. Import contract to implement

Canonical flow: `UPLOAD -> PARSE -> NORMALIZE/STAGE -> MAP -> VALIDATE -> PREVIEW -> APPROVE -> COMMIT -> RESULT/AUDIT`. Mapping/validation errors return an actionable state; an invalid preview is never committable.

| Field | Required | Frozen rule |
|---|---:|---|
| `code` | yes | Trimmed, 1–40 characters, case-insensitive tenant uniqueness. |
| `name` | yes | One trimmed name, 2–160 characters; no invented split-name model. |
| `email` | no | Valid, lowercase normalized, case-insensitive tenant uniqueness when present; does not create login access. |
| `department` | yes | Unambiguous mapping to an existing active tenant department. |
| `shift` | yes | Unambiguous mapping to an existing active tenant shift. |
| `annualLeaveAllowance` | yes | Explicit integer 0–366; missing value blocks the row and batch. |

Unsupported fields include employment dates, historical attendance/leave/corrections, user roles/accounts/passwords and RFID secrets. Reject unsupported mappings visibly; do not import or log forbidden columns. Initial imports are create-only: no implicit update, merge, deactivate or delete, and no partial valid-row commit.

Candidate API ownership, subject to H2-0 review (not existing endpoints):

| Operation family | Candidate resource | Required behavior |
|---|---|---|
| Published policy | `GET /worker-import-policy` | Authorized pre-upload view of current limits, supported format/schema and lifecycle; no secrets or cross-tenant metadata. |
| Session creation | `POST /worker-imports` | Authenticated Admin-only, bounded upload, checksum/parser/schema identity and private tenant ownership. |
| Session/read-back | `GET /worker-imports/{id}` | Stable state/revision, redacted validation summary and paged authorized preview; no public raw-file URL. |
| Mapping/validation | `PATCH /worker-imports/{id}/mapping` | Reviewed revision; recompute validation, invalidate prior approval when input/mapping changes. |
| Commit | `POST /worker-imports/{id}/commit` | Explicit approval, expected revision and documented idempotency identity; one atomic transaction, no automatic blind retry. |
| Cancellation | `POST /worker-imports/{id}/cancel` | Revision-aware, terminal-state-safe cleanup; cannot undo an already committed batch. |

Reuse the existing error envelope and header conventions after explicitly adding the new operations to OpenAPI. Document unauthorized/forbidden/not-found handling, invalid data, stale state, duplicate/conflict, too-large and rate-limited behavior. Do not invent automatic session replay semantics for a new mutation.

Suggested data boundaries (names remain proposals): private `worker_import_sessions` and staged rows, plus a minimal immutable commit/result identity. Sessions include organization, uploader, file checksum, parser/schema version, mapping, revision, expiry and state. New tenant-owned tables require FORCE RLS, explicit policies and non-bypass runtime credentials. Raw files/staging belong outside public static assets and ordinary logs; storage choice follows D2.

The commit path must:

1. Authenticate/re-authorize the caller, lock the session, verify tenant/revision/state/expiry/approval and resolve an already committed idempotent result.
2. Revalidate every staged row against current database state, including uniqueness and active department/shift references under a concurrency strategy that prevents validation-to-insert races.
3. Create every worker with the existing canonical validation, lifecycle/history and audit semantics in **one** tenant transaction. Database uniqueness must remain the final concurrency guard.
4. Persist commit identity, created worker IDs, counts and success audit atomically with the worker changes. Any failed row rolls back the entire batch and its success result/audit.
5. Return the durable result; a lost response is resolved by authorized read-back. Same identity/same content returns the original result; different content conflicts.
6. Purge private staging under D2 without deleting the durable evidence needed to prevent duplicate execution. Failure diagnostics contain row numbers/codes and authorized UI context, not raw uploaded values in logs/audit.

Do not call `createWorker` once per row and claim atomicity: that method currently commits per invocation. Preserve its public behavior when extracting any shared transaction-level write primitive.

## 5. Onboarding contract to implement

Canonical states: `DRAFT -> COMPANY_SETUP -> PEOPLE_IMPORT -> ACCESS_SETUP -> TERMINAL_SETUP -> DRY_RUN -> READY_FOR_GO_LIVE -> GO_LIVE_APPROVED`.

An onboarding session/evidence model must bind organization, environment/profile, product-contract version, current step/revision and evidence references. Reuse organization/timezone/departments/shifts/holidays, invitations, RFID and terminal APIs; do not create hidden variants with weaker authorization. Explain applicability of each step; never mark a required step complete merely because its screen was visited or a single API returned success.

Proposed API families are authorized status/read-back, explicit step evidence updates, readiness evaluation and a **separate** go-live decision. Their exact routes and internal/customer permissions belong in H2-0. Preserve Admin/customer and BSS internal service/support identity separation.

- Recompute readiness from current prerequisites and versioned evidence; stale configuration or missing/invalidated evidence prevents a new approval.
- Persist progress across refresh/relogin and process restart, handle concurrent administrators with revisions, and resume at the last proven step.
- Keep Demo/Internal/Pilot/Production profiles separate. Never promote Preview credentials or data into a live tenant.
- Store a go-live decision with authorized actor/time, contract/configuration snapshot, evidence links, open limitations and rollback contacts. The initial approval remains auditable if prerequisites later change; changed evidence requires the defined revalidation/approval process.
- `READY_FOR_GO_LIVE` is computed readiness, not approval. Neither a green UI nor this implementation establishes AUDIT C or customer GO/NO-GO.
- Second-person dry run, legal/privacy, qualified physical terminal and operational evidence remain external gates under their existing owners.

## 6. Verification matrix

| Evidence | Required cases |
|---|---|
| Parser/unit | Genuine CSV/XLSX, BOM/dialect decisions, empty/corrupt/wrong-format/encrypted or unsupported workbook, duplicate headers, length/normalization, missing allowance, bad references; formula/macro/external-link execution prohibited, spreadsheet-injection-safe display/export, bounded archive expansion and time/memory use. |
| API/roles | Every operation Admin-only where required; Manager/Worker/Accountant denied; unauthenticated denied; no cross-tenant IDs/preview/raw file leakage; stable error codes and current OpenAPI alignment. |
| PostgreSQL | Migrations from zero/upgrade, FORCE RLS, case-insensitive uniqueness, lifecycle/history preservation, all-or-nothing writes, concurrent conflicting imports/manual edits, stale mapping/reference changes, same/different idempotency identity, cancel/expiry/commit races and no duplicate workers after retry. |
| Lifecycle/recovery | Cleanup after every terminal state and expiry/restart, minimal audit/result retention, lost HTTP response after commit, full rollback before commit, explicit recovery if committed data need correction. |
| UI/browser | Mapping and paged preview, clear counts/errors, disabled commit when blocked, confirmation invalidation, pending/empty/error/expiry states, no double submission, read-back after uncertainty, focus/keyboard/axe/mobile, refresh/relogin and denied-role routes. |
| Onboarding | Resume, concurrent edit, evidence invalidation, profile separation, server-computed readiness, exact approval authority, immutable decision and no go-live shortcut. |
| Capacity/security | Synthetic measured envelope under D1, privacy-safe test artifacts, no secrets/file contents in recordings/logs, dependency/security gates and no weakened rate limits. |

Tests use explicit disposable databases and synthetic workers/files only. PostgreSQL evidence is mandatory for new data/atomicity/RLS behavior: no database means UNAVAILABLE/STOP, not PASS. Local PowerShell/browser unavailability must be distinguished from passing CI evidence. Existing frontend-only and full-stack browser modes retain their distinct meanings.

## 7. Recovery and definition of done

Uncommitted sessions can be cancelled/expired and purged under D2. A committed import has durable worker identities and lifecycle/audit history; reverting UI or a release does not delete those workers or roll back history. Corrective operations need their own governed review. Migration recovery must preserve committed import/onboarding evidence; do not promise destructive down-migration as a universal rollback.

Each slice is complete only with reviewed contract/data/code/UI ownership as applicable, passing focused and required checks, updated feature/API map/readiness evidence, documented limits/recovery and the necessary explicit merge authorization. Keep an unfinished slice visibly PARTIAL. #237 closes only when the complete frozen onboarding/import behavior is implemented and verified; it does not close #62 or establish Staging, Hardware 9C, Pilot or Commercial Production readiness.

## 8. Prepared next action

H2-0 begins with measured D1 options and the D2/D3 decision record, followed by the proposed API/schema review. Preserve #68 sales, #62 Pilot, #59 infrastructure, #64/#66 privacy/legal, #95 identity, #97 recovery, #132 hardware and #133 roadmap ownership. Runtime work, customer-data processing and policy acceptance remain separate from this preparation PR.

The [H2-0 decision proposal](H2_IMPORT_ONBOARDING_DECISION_PROPOSAL.md) now provides synthetic parser measurements, concrete candidate D1/D2 values, the D3 authority boundary and a separate proposed OpenAPI artifact. Its status is **AWAITING DECISION REVIEW**, not an accepted policy or implementation. Target-runtime, PostgreSQL, hostile-file and cleanup evidence remain required before the dependent runtime activation.
