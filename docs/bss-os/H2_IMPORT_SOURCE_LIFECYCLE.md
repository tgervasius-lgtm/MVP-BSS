# H2-1c1 — private source and mapping lifecycle

Status: **IMPLEMENTED FOR REVIEW / INACTIVE**. Owner: [#237](https://github.com/tgervasius-lgtm/MVP-BSS/issues/237).
Prepared 2026-10-09 from protected main `fa34ae3b0a4a653cc1d8aea690d2f257a2d4dbda`.
Central Board v175 / Map v58 are the last previously confirmed versions; current central freshness is `SOURCE_FRESHNESS_UNVERIFIED`.

## Purpose and scope

The merged parser returns source values, but the earlier store only persists canonical workers. Connecting those directly would lose reviewed mapping identity and could publish a parser result after cancellation. This focused migration/store slice makes source recovery and approval coherent before exposing an HTTP boundary.

The affected role is tenant Admin. Impact: database, backend, security/privacy. There is no new route, authoritative OpenAPI operation, runtime registration, grant, dependency, UI or activation. Existing runtime grants revoke all access to import tables. This is not the whole H2-1c, #237, staging proof or customer-data approval.

## Persisted invariants

- Migration 015 extends the four existing tables; Admin tenant FORCE RLS and composite foreign keys remain. Raw upload bytes are never stored. Bounded parsed cells, mapping and normalized rows share one staging row and one purge boundary.
- `reserve` binds the create key to raw checksum, format/delimiter, policy/schema/parser versions; the tenant advisory lock shares the existing two-session quota with canonical preparations. Completed identical retry returns the same identity; in-flight or changed-payload retry conflicts. Terminal replay never starts parsing again.
- `PARSING` has a random internal token and a nonrenewable ten-second publication lease from server creation time. This allows the existing three-second parser plus bounded persistence; it does not increase the parser deadline. Reserve is intended after bounded raw receipt and admission, before spawning. The token is not in public session/result/audit views.
- Publication checks tenant, session revision, token, raw checksum/parser version, state and database time. A second SQL clock predicate fences expiry during insertion. Invalid publication rolls back or atomically purges/terminates; cancellation/expiry/failure cannot be resurrected.
- `NEEDS_MAPPING` persists source without canonical rows. Mapping requires every column and explicit reference bindings; field errors remain recoverable with no partial canonical batch. Active same-tenant references and duplicates are checked by the shared validator.
- Every accepted mapping increments revision. Preview checksum also binds the mapping checksum, even where two mappings produce equal canonical rows. Reference revision changes require refresh. Direct canonical replacement refuses source sessions.
- Source/preview reads are paginated to 100 rows and revision-bound. They preserve the absolute 24-hour expiry. Counts/errors are bounded; audit metadata contains no source values. A same-tenant Admin can recover while original uploader/approver attribution survives.
- Existing commit/cancel transactions delete the entire staging row, including source and mapping. Committed metadata adds only the mapping checksum; existing durable result/replay and worker/history/audit remain intact. Tenant cleanup now also fails abandoned parsing and removes failed metadata after the existing 30-day policy.

The internal canonical/source accessors currently use the foundation's `CONFLICT` on unavailable staged data. H2-1c2 must define the external 410 `IMPORT_DATA_PURGED` adapter contract without treating this internal API as an implemented HTTP endpoint.

## Verification

Meaningful new checks cover 1,000-row source recovery through atomic commit, create/commit replay, wrong lease/checksum, in-flight and shared quota, missing/foreign bindings, mapping-only checksum differences, concurrent remapping, stale references, role/tenant denial, another Admin's recovery, cancellation/failure/crash/expiry purge, and guarded migration downgrade/upgrade with legacy data. Parser-output validation is repeated and detached before asynchronous persistence.

Local TypeScript and build pass. Focused import unit tests pass. The full unit/contract run is 81 PASS / 1 FAIL: the unchanged ClamAV socket fixture encounters local `listen EPERM`. Local PostgreSQL and PowerShell wrapper are unavailable. These are not PASS; CI must establish real PostgreSQL, socket, migration, parser and security evidence before merge. Exact head/check results belong to the PR.

The merged main Sonar gate already reports D Security/D Reliability; the preceding main reports the same ratings. Exact issue identity/delta is unavailable (Sonar access 403; main GitHub check has no annotations). No finding is suppressed and overall main quality is not labelled green.

## Recovery and next dependency

Migration 015 downgrade refuses every retained source session, including committed evidence, and checks across tenants even for a constrained migration owner. An empty-source installation can revert while preserving earlier canonical data. A refusal rolls back the temporary RLS change. Existing durable imports require reviewed forward recovery; never delete workers/history to undo an import.

Before customer upload, H2-1c2 must implement deployment-wide one-parser admission with a crash-expiring lease, durable tenant create/commit attempt limits, startup/recurring monitored cleanup with overdue fail-closed admission, authenticated bounded raw HTTP with upload/disconnect deadlines, stable external errors and matching OpenAPI. The per-session token here is **not** a deployment-wide semaphore, and tenant cleanup is **not** the required global five-minute cleanup guarantee. Then implement H2-2 Admin UI. Target-runtime containment/capacity, actual backup/restore/privacy lifecycle and operator/go-live gates remain independent. Explicit owner approval is required before high-risk merge/deploy.
