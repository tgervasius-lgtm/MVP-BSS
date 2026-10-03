# H2-0 — employee import and onboarding decision proposal

Status: **PROPOSED / OWNER REVIEW REQUIRED / NO RUNTIME ACTIVATION**

Prepared: 2026-10-04 (Europe/Warsaw). Owner: [#237](https://github.com/tgervasius-lgtm/MVP-BSS/issues/237).

Reviewed software baseline: `600b6f8117f8392f519b2c1adbb7cbb4ecf5bf09` (merged #238).

Authority: [frozen Product Contract](../../BSS_V1_PRODUCT_CONTRACT.md), sections 11–12, and the [implementation plan](CUSTOMER_ONBOARDING_IMPORT_IMPLEMENTATION_PLAN.md).

This is a concrete recommendation for review, not an accepted policy or implemented API. A documentation merge does not approve D1/D2/D3. Record explicit owner acceptance and applicable technical/privacy review before the dependent runtime slice. No live records, infrastructure, new service, paid run, scheduled automation, production deployment or new customer role is introduced here.

## 1. Parallel work and scope

At preparation, the central R34 continuation owns the continuity/checkpoint work and PR #240, whose only changed file is `.github/dependabot.yml`. This package owns #237 and new import/onboarding proposal files. It does not edit the central uploaded control board, Dependabot settings, Design Foundation, video work, or runtime source. Re-read main and open changes before a future merge; this is a dated observation, not a global editing lock.

## 2. Decision summary

| Decision | Recommended choice | Approval and dependency |
|---|---|---|
| D1 — initial capacity | At most 1,000 data rows, six source columns and 1 MiB raw upload; synchronous HTTP response with parsing isolated from the API event loop; bounded archive inspection before materializing XLSX | Product/technical acceptance; synthetic deployment-runtime and PostgreSQL measurements must pass before enabling upload. These are candidate maxima, not proven service capacity. |
| D2 — data lifecycle | No intentional persistent raw upload; private staged values expire after 24 hours and are removed on terminal state, with a five-minute cleanup deadline for crash/expiry paths; keep minimal committed result/replay evidence with the approved worker/audit lifecycle | Product/privacy acceptance. Active-store deletion is distinct from backup erasure; backup/restore policy and enforcement remain required before customer data. |
| D3 — authority | Customer Admin manages the tenant's setup/import. Named, separately authorized BSS operator provisions a tenant and records final release approval, with customer acceptance and independent dry-run evidence | Owner assigns the actual identities through #95/#59/#62. No new super-admin customer role, no customer-callable tenant-create or go-live-approval endpoint. |

Accepting these recommendations is not approval of real Pilot use. D3 may remain blocked while D1/D2 and the import contract receive review; it does not prevent independent import work after its own prerequisites pass.

## 3. Measured evidence and its limits

Reproduce from the repository root after the existing backend dependencies are installed:

```sh
node backend/scripts/experiments/worker-import-capacity.mjs
```

The [raw observation record](evidence/H2_IMPORT_PARSER_EXPERIMENT_2026-10-04.json) contains script/lockfile hashes, 18 measurements, fixture hashes and runtime identity. All fixtures are generated synthetic employees at `example.invalid`; temporary files are removed. Three fresh child processes per row-count/format avoid counting fixture generation as parser memory. Parsing and scanning are measured after module loading; process wall time also includes child startup/module loading. Peak RSS is the whole child process, not an allocation delta or a hard memory bound. This single exploratory sample does not establish percentiles, sustained throughput or a service SLA.

| Format / data rows | Input bytes | Parse + scan range (ms) | Maximum process wall (ms) | Maximum peak RSS (MiB) |
|---|---:|---:|---:|---:|
| CSV / 100 | 7,637 | 12.15–14.74 | 201.64 | 59.59 |
| CSV / 1,000 | 77,839 | 20.73–29.74 | 221.19 | 71.07 |
| CSV / 5,000 | 397,839 | 83.35–99.71 | 306.09 | 100.36 |
| XLSX / 100 | 9,760 | 30.84–37.01 | 230.33 | 62.11 |
| XLSX / 1,000 | 38,388 | 64.02–73.97 | 282.16 | 70.49 |
| XLSX / 5,000 | 163,061 | 200.20–212.61 | 404.59 | 117.55 |

Runtime: Node `v24.19.0`, ExcelJS `4.4.0`, Linux x64, eight reported available CPUs. CI uses other Node versions; the deployment runtime/hardware was not exercised. Each exploratory child had a ten-second kill timeout and 128 MiB V8 old-space setting. **V8 old-space is not a total RSS limit.** This experiment is not the future upload sandbox.

Findings:

1. ExcelJS's default CSV mapping converts `000001` to numeric `1`. Explicit lexical mapping preserves it. Import must keep text identifiers as text, normalize deliberately and never reconstruct leading zeros heuristically. Existing worker code semantics remain unchanged.
2. XLSX returns a formula object with a cached result; accepting that result as an ordinary name would conceal a formula. Reject formula/shared-formula, hyperlink, error, rich-text and date cell types unless a separately reviewed rule explicitly supports them. Text fields must be stored as text in the source workbook; a number format such as `000000` is not authority to manufacture an identifier.
3. A corrupt XLSX fixture was rejected. This proves neither ZIP-bomb resistance nor prevention of XML/entity abuse or malicious relationships.
4. A 5,000-row happy-path sample fitting in a small file does not justify a 5,000-row policy. Actual validation, staging, indexes, row/history/audit writes, locks and concurrency were not measured.

**UNAVAILABLE:** target-runtime capacity, total-RSS containment, hostile archive limits, live HTTP rejection, PostgreSQL batch duration/atomicity, cleanup after restart and browser flows. No runtime feature is claimed PASS by these measurements.

## 4. D1 — recommended initial envelope

| Boundary | Candidate policy | Required implementation behavior |
|---|---|---|
| Raw request | 1,048,576 bytes, one file | Stream-count bytes, including chunked requests; reject overrun with 413 before uncontrolled buffering. No base64/JSON or multipart overhead in the proposed raw-body transport. Keep the existing global limit; do not raise other routes' limits. |
| Encoding/container | UTF-8 CSV with optional BOM; genuine unencrypted `.xlsx` | Explicit comma or semicolon CSV delimiter; RFC-style quotes/escaped quotes and quoted line breaks. Reject invalid UTF-8/NUL, legacy `.xls`, `.xlsm`, disguised/encrypted archives and unsupported content types. Extension/MIME alone is not format validation. |
| Source structure | 1–1,000 data records, five or six nonempty columns, one header row | Five required canonical fields, optional email. Every source column maps exactly once; no silent ignore/import of extra personal fields. Alternate header labels use explicit mapping. Reject duplicate/blank headers, ragged rows and a seventh nonempty column. Blank trailing records may be ignored; they never bypass physical scan limits. |
| XLSX structure | Exactly one worksheet; 10 MiB total uncompressed bytes, 5 MiB per ZIP entry, 100 entries, 100:1 maximum expansion ratio | Count actual decompressed bytes while streaming, not just advertised sizes. Reject duplicate/unsafe ZIP paths, traversal, unexpected embedded payloads, macros, external relationships, DTD/entities, sparse oversized coordinates and hidden rows/columns/sheets. Reject beyond the envelope before constructing the workbook. |
| Scan bounds | At most 1,001 physical worksheet rows, six columns, 6,006 cells including headers; 1,024 decoded characters per cell; headers at most 80 | Spreadsheet dimensions and shared strings are untrusted. Canonical field limits remain stricter: code 40, name 160, allowance explicit integer 0–366. Reject limit violations; do not truncate. |
| Parse time/memory | Three-second parse deadline; candidate 256 MiB total parser-process RSS ceiling | Abortable isolated parser with no database credentials, network access or public file writes. A promise timeout cannot stop event-loop work; V8 heap alone is insufficient. Containment must be proved on the chosen runtime. No separate queue/vendor is authorized. |
| Concurrency/storage | Two nonterminal sessions per tenant, one parser execution across the deployment; tenant create/commit admission ten attempts/minute each | Durable tenant quota/admission and crash-expiring parser lease; not only in-memory per-replica counters. Capacity exhaustion returns 429/503 with Retry-After. Keep authentication/origin checks. Multi-replica scaling requires a renewed capacity review. |
| Commit | Existing five-second PostgreSQL statement timeout retained; separate candidate five-second overall commit deadline and one-second lock wait | Statement timeout applies per statement, not to a whole multi-statement transaction. Prove whole-transaction cancellation/rollback and preserve atomicity. Never split a batch into partial commits to meet a timeout. |
| Preview/errors | At most 100 rows per response, revision-bound cursor; bounded row/field error codes | Return complete totals with pagination; never silently drop blocked rows. No values in logs or audit error details. |

The three-second parser budget excludes network upload and database commit. H2-1 must also set/test an upload deadline (candidate 15 seconds), ingress buffering bounds and disconnect cleanup. The existing error handler currently falls back to 500 for unrecognized framework errors: 413/415/503 must be deliberately mapped to the established `{code,message,requestId,fieldErrors?}` envelope when these routes are implemented, without altering unrelated routes silently.

Before activation, run boundary cases at limit and limit+1 (bytes, rows, columns, cells, entries, inflated bytes, ratio and time), hostile fixtures, two-tenant/role denial, target-runtime resource tests and real PostgreSQL contention/rollback tests. If 1,000 rows do not fit the deployment budget, lower the published limit through versioned review. Do not buy a larger tier or add a queue automatically.

## 5. D2 — lifecycle, replay and privacy

Proposed lifecycle policy identity: `worker-import-v1-proposed`. It is not an active policy. Future policy GET must publish approved values before upload; requests bind to the fetched version and conflict if it is no longer usable.

| Data | Proposed lifecycle | Evidence / restriction |
|---|---|---|
| Original file bytes | Request/parser memory only, released after bounded parse and staged-write completion or rejection; never intentionally stored on disk/object storage | Disable raw-body payload logs, dumps and recordings for this path. Runtime memory release does not certify byte-level erasure. Persist checksum/parser identity instead. |
| Staged source/normalized values | 24-hour absolute expiry from creation, not extended by reads/mapping | Private tenant-owned database rows; TLS and approved encrypted storage/backups required before real data. Only authorized tenant Admins access previews. No signed/public raw-file download URL. |
| Successful commit / cancellation | Delete staged values in the same transaction as the terminal state/result | Success audit/result survives; rollback preserves a recoverable pre-commit session until normal expiry. |
| Parse failure, expiry, process crash | Revoke access immediately when expired/failed; delete remaining values within five minutes | Cleanup on startup and recurring in-process maintenance, plus monitored overdue count. A cleanup failure blocks new ingestion when the approved deadline is exceeded. This document creates no scheduler/automation. |
| Committed result and replay identity | Retain minimum result with the approved worker/audit evidence lifecycle; no independent 24-hour/30-day purge | Checksum, policy/schema/parser version, creator/approver IDs, approval time, commit ID, counts and created worker IDs; no names/emails/raw rows. Original replay result remains available while its underlying authorized evidence is retained. |
| Failed/cancelled/expired session metadata and create replay keys | Candidate 30 days for counts/checksum/error codes, then delete under reviewed policy | There are no worker writes to re-execute. Purged session IDs return 404; commit never creates a session and therefore cannot recreate an import from a stale commit request. |

Commit replay is keyed by `(organization, operation, idempotency key)` and binds session ID, reviewed revision, preview checksum and canonical approval payload. The original approver remains in evidence even if another currently authorized Admin reads/retries it. Identical retry returns the original committed result before evaluating today's session revision; different payload conflicts. Recheck current authentication/tenant/role before any replay lookup. Cross-tenant keys reveal nothing.

Raw/staged-value deletion must not delete committed replay/result identity. Full tenant offboarding and lawful audit deletion remain governed by #64/#66/#97; do not invent permanent retention or apply an unrelated attendance retention period to an uploaded file. A purged resource fails closed and never recreates workers. Customer Admin cannot disable legal holds or extend the import lifetime ad hoc.

**Backups are a separate boundary:** SQL deletion does not erase older backups. The proposed staging policy describes active storage; its pre-upload notice must disclose the actually approved backup retention. A restored database remains quarantined until expiry/terminal-state cleanup has run and been verified. Backup exclusion or cryptographic erasure needs its own supported storage/key design; neither is claimed implemented. D2 cannot authorize customer processing until this lifecycle/restore evidence is accepted.

## 6. D3 — operator and go-live boundary

Recommend retaining the four frozen customer roles. Tenant Admin performs company setup, import, invitations and terminal actions through existing authorized operations. A named BSS operator obtains separately approved provisioning authority; operator access is neither a tenant role nor the automatic privilege of a founder or a support account.

The current bootstrap script is not sufficient attribution for that future workflow: it writes a system actor with no named operator ID. Do not expose it as an Admin endpoint or claim that its existing audit proves a person's go-live approval. #95/#59 must define operator authentication, named attribution, tenant-scoped invocation and approval enforcement before that mutation is built.

Final approval proposal:

1. Customer Admin confirms company configuration and intended usage; this is customer acceptance evidence, not BSS release authorization.
2. A distinct, identified second person completes the required dry run. The preparer cannot self-certify the independent check.
3. Authorized BSS release/operator identity records a decision linked to customer acceptance, dry-run and applicable AUDIT C/operations/privacy/hardware evidence, configuration hash, contract version, limitations and rollback contacts.
4. Server verifies that all evidence is current and that the approval identity has the separately assigned authority. A client-supplied `verified`, `approved`, `actorId` or role is never authority.

The owner still needs to assign actual operator/reviewer identities and approve this split; no identity has been invented or provisioned. The attached customer-facing candidate API intentionally has **no tenant-create or go-live-approve operation**. The eventual internal command/API needs a separate identity/security review. H2-3/H2-4 remain incomplete until that boundary exists.

## 7. Candidate API and state semantics

The [OpenAPI proposal](contracts/h2-import-onboarding.proposed.yaml) is a separate 3.1 review artifact. It is not referenced by runtime code or by the implemented API map. The authoritative `openapi/bss-mvp-api-v1.yaml` remains unchanged at 52 paths / 63 operations. Candidate operation IDs are reserved only in this proposal.

All candidate customer operations require an authenticated tenant Admin. Organization and role come from the verified session, never request fields. Existing same-origin mutation protection, no-store/private responses, rate controls and denial semantics apply. Any Admin of the same tenant may recover a session; the original uploader/approver remains attributable. Other roles are denied; foreign resource IDs return 404.

Import states: `PARSING`, `NEEDS_MAPPING`, `INVALID`, `READY`, `COMMITTED`, `CANCELLED`, `EXPIRED`, `FAILED`. A successful session creation returns 201 after bounded parsing/staging; field/mapping errors may leave a recoverable session but never create workers. Malformed/unsafe file rejection returns a 4xx and a minimal failed identity where reservation already occurred. Crash-interrupted PARSING becomes FAILED after its lease expires; raw bytes are not promised resumable.

Creation has its own scoped Idempotency-Key and fingerprint (raw checksum, format/delimiter and policy version). Same-key/same-input returns the original session; while creation is running return a documented conflict with retry guidance. Different content conflicts. Apply admission checks without charging a second session quota for a completed replay. A new upload requires a new key and explicit user intent; commit replay is separate.

Before publishing parsed rows, the staging transaction rechecks the parser lease, session revision/state and server expiry under lock. A parser finishing after cancellation, expiry or crash recovery must discard its output; it cannot resurrect a terminal session or retain newly staged values. Cleanup and quota release are coordinated with the same durable state.

Mapping increments revision and invalidates any prior preview approval. Every source column must map exactly once to an allowed canonical field; required fields cannot be omitted or defaulted. Department/shift values map through explicit source-value-to-active-tenant-ID bindings; missing/ambiguous references block the batch. Bindings may include only values present in the source and active IDs in the tenant.

Preview pages bind to one session revision and checksum. Checksum covers normalized rows, mapping, policy/schema/parser identity and relevant validated reference revisions; it is not merely the raw file checksum. Commit includes `If-Match`, Idempotency-Key, `approved: true` and the reviewed preview checksum. Revalidate against current database state. Changes to relevant reference revisions invalidate the preview even when the reference remains active, requiring a fresh validation/approval.

There is no visible independently committed COMMITTING state: one transaction locks the READY session and writes workers, existing worker history/audits, immutable result and terminal-state cleanup. Client timeout/connection loss is an uncertain result resolved by GET and same-key retry, never by a blind new commit key. Cancellation locks the same session: if commit won, return conflict without undoing workers; if cancellation won, commit cannot proceed. Expiry uses server time after lock acquisition.

GET on a terminal session returns metadata/result, never purged staged values. Row-preview access after purge returns 410 `IMPORT_DATA_PURGED`. Mutation of expired/cancelled/failed sessions returns 409. Successful replay retains its original result even if unrelated tenant configuration subsequently changes.

Onboarding GET returns persisted progress plus server-evaluated blockers, evidence revisions and profile. PATCH only records bounded evidence references/notes; it cannot set stage, readiness, verification or approval. Evaluation uses existing authoritative company/worker/user/terminal state. Submitted external references remain UNVERIFIED until checked through D3's future trusted path. Missing prerequisites stay blocking; an unsupported evidence verifier cannot default to PASS. Profile changes create a separately governed onboarding identity, never promote Preview data.

An existing go-live decision remains immutable history if configuration changes; expose `revalidationRequired` and current blockers separately. Historical `GO_LIVE_APPROVED` is not permission to ignore a newly failed prerequisite. The future approval path must capture a new evidence/configuration version under D3.

## 8. Proposed storage and transaction design

No SQL migration is included or applied. Suggested boundaries for review:

| Table/domain | Required constraints and ownership |
|---|---|
| `worker_import_sessions` | organization/uploader, source checksum, policy/schema/parser, bounded source headers, mapping, bigint revision, absolute expiry, state, preview checksum and counts; server-owned status; `(organization_id,id)` reference key |
| `worker_import_rows` | `(organization_id,session_id,row_number)` unique, tenant-composite FK, bounded private source/normalized values and structured error codes; cascade only for staging, never committed evidence |
| `worker_import_requests` | unique `(organization_id,operation,key)`, request fingerprint, session ID/status/result identity; preserve identity through staged-data cleanup |
| `worker_import_commits` and created-worker links | immutable commit/approval/checksum/count/version metadata and tenant-composite worker links; unique committed session; no cascading deletion from a session to audit/history |
| `onboarding_sessions`, evidence and decision records | organization/profile/contract/configuration/revision identity, submitted vs trusted evidence, immutable decision history; no client-writable computed readiness |

Every tenant table requires ENABLE and FORCE RLS, explicit tenant policy, constrained runtime grants and negative cross-tenant tests. New parent/child foreign keys include tenant identity; application checks alone are insufficient. Sensitive evidence is not a reason to expose all tenants through an ordinary support account.

Lock order for commit: reserve idempotency key, lock session, then department/shift rows in sorted order with a lock mode that conflicts with updates to relevant status/configuration, then perform worker writes in stable order. `FOR KEY SHARE` alone does not protect a mutable active flag. Unique indexes remain the final concurrent code/email guard. A losing key/unique/deadlock/timeout transaction rolls back every worker/history/success-audit/result change. Any diagnostic update afterward is separately revision-guarded and cannot convert a concurrent success into failure.

Extract only a narrowly reviewed transaction-level worker-write primitive if needed. Preserve existing createWorker API behavior and lifecycle/history triggers. A loop calling the current public createWorker method would commit per worker and is prohibited. Missing PostgreSQL evidence is a STOP for claiming H2-1 atomicity, not a reason to weaken or mock away the transaction.

Migration/recovery review must include clean installation and upgrade, all indexes/RLS/grants, quota/cleanup/replay races, trigger parity, invalid final-row rollback, duplicate imports racing with manual worker creation and configuration changes. Rollback before commit leaves no worker; after commit use a reviewed forward correction, never destructive deletion of imported identities/history.

## 9. Review and acceptance sequence

1. Owner records acceptance or alternatives for D1/D2 and assigns D3 responsibilities. Numeric values remain PROPOSED until that record exists.
2. Technical/privacy review settles total-memory containment, backup/staging lifecycle, actual identity boundary and target-runtime capacity. Missing deployment evidence is not replaced by this local benchmark.
3. Review candidate schemas, exact error/status behavior, cancellation/replay/expiry and table constraints. Then add implemented operations to authoritative OpenAPI alongside H2-1 runtime and meaningful contract/PG tests.
4. Implement H2-1 with synthetic fixtures; leave customer processing disabled until environment/privacy gates pass. H2-2 uses proven API; H2-3/H2-4 depend on D3.

The experiment and spec lint may pass while H2-0 is still **AWAITING DECISION REVIEW**. #237 stays open and onboarding/import stay unimplemented in the feature registry.

## 10. Sources and recovery

- [Frozen Product Contract](../../BSS_V1_PRODUCT_CONTRACT.md).
- [GDPR data governance baseline](GDPR_DATA_GOVERNANCE_BASELINE.md), section 9: existing retention values are proposed, not production approval.
- [Identity/access baseline](IDENTITY_ACCESS_SECRETS_MANAGEMENT_OS.md), #95; [implementation plan](CUSTOMER_ONBOARDING_IMPORT_IMPLEMENTATION_PLAN.md).
- Source at baseline: `backend/src/http/app.ts`, `backend/src/domain/errors.ts`, `backend/src/db/tenant.ts`, `backend/src/db/bootstrap.ts`, `backend/src/services/pg-phase-a-service.ts`, worker/history/RLS migrations and lockfile.
- Installed ExcelJS 4.4.0 source `lib/csv/csv.js` and observed fixtures establish the lexical-conversion finding; the experiment is the reproducible primary evidence.
- [Fastify bodyLimit](https://fastify.dev/docs/latest/Reference/Server/#bodylimit): framework request limit; not an archive-expansion limit.
- [Node child-process timeouts](https://nodejs.org/api/child_process.html#child_processspawnsynccommand-args-options): experiment isolation only; not a production sandbox.

Recovery for this preparation change is removal/revert of its proposal/experiment artifacts. It has no production data or migration to reverse. A future parser, storage or approval implementation requires its own reviewed recovery evidence.
