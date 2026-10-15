# H2-1c2 HTTP and runtime controls

Status: IMPLEMENTED FOR REVIEW / INACTIVE BY DEFAULT. Issue #237 remains open.
Baseline reviewed: 26d157d5fa2fc2ecf7e704f195244f061fa16ff1 (15 October 2026).
Product authority: frozen Product Contract sections 11-12 and accepted D1/D2/D3 framework.
This slice changes API, database and security/privacy controls; no UI, onboarding,
customer activation, infrastructure provisioning, runtime grants or deployment.

## Runtime boundary

Eight Admin-only HTTP operations are registered under the authoritative OpenAPI 1.6
contract. Default server composition supplies no WorkerImportApi: policy reports
uploadEnabled=false and data/mutation operations return 503 IMPORT_UNAVAILABLE.
There is deliberately no environment toggle that silently grants access or activates it.

Tests explicitly inject WorkerImportApi with a private source store, PgImportRuntime
and a separate stable cursor HMAC key (at least 32 bytes). Real activation needs an
independently reviewed composition and least-privilege grants, Linux containment,
privacy/backup/restore/offboarding proof, reporting/alerts and owner authorization.
A shared key across instances/restarts is required for cursor continuity; do not
reuse authentication, RFID or terminal secrets.

Creation authorizes verified session/Admin/origin before buffering. Only matching
raw text/csv or genuine XLSX MIME is accepted, with explicit CSV delimiter. The
scope-only stream parser counts actual bytes (including chunked transfer), caps
at 1,048,576 bytes and aborts at 15 seconds. JSON/base64/multipart are rejected.
Rejected uploads close their HTTP connection; abort/error/timeout paths release
admission, discard buffers and cannot stage late output. No raw bytes go to disk,
object storage, audit, errors or request logs. Other routes retain existing limits.

The existing secure parser remains mandatory by default: Linux x64 namespaces,
seccomp, no DB credentials/network/writes, 3-second wall time and hard limits.
Synthetic injected parsers in HTTP/PostgreSQL tests prove orchestration only,
not actual deployment sandbox availability. Windows intentionally fails closed.

## Durable coordination and cleanup

Migration 016 adds two private FORCE-RLS tables and global due-time indexes.
Each tenant has separate rolling-minute create and commit counters (10 each).
Authorized attempts after valid boundary headers consume attempts before work,
including replay, body rejection, busy admission or unhealthy cleanup. Refusals
are returned after committing the attempt transaction. No in-memory reset/bypass
occurs on process restart or a second application instance.

A deployment-wide DB-clock lease admits one raw upload/parser at a time. Its
20-second lifetime includes upload; it is never renewed by client reads. A slow
upload or exhausted persistence budget can fail closed rather than extending a
lease. A separate 10-second source session parse lease and source identity fences
remain unchanged. Publication locks and checks the global token plus tenant,
session revision, checksum, parser identity and server expiry. An expired or
foreign token cannot publish or release a replacement. These bounds are code
limits, not proven target-environment throughput/capacity.

PgImportRuntime runs a bounded cleanup batch at startup and every minute; startup
must complete successfully before local admission. A required reporting callback
receives cleanup_ok / cleanup_failed only, never values or DB exception details.
Health checks use durable heartbeat and oldest due session: after five minutes
without cleanup or with overdue data, admission returns 503 + Retry-After.
A locked/busy session is skipped, remains unhealthy when overdue, and is retried.
No external scheduler, cloud resource or scheduled model call is added.

Cleanup transitions/purges/audits up to 100 due sessions atomically per pass across
tenants, using a fixed system audit actor. Cancel and commit continue their atomic
purge. Absolute staging TTL remains 24 hours, failed/cancelled/expired metadata
30 days, and successful minimal results/worker IDs remain durable. Backups,
restore quarantine and erasure are separate unproven activation gates.

Cross-tenant maintenance uses narrow SECURITY DEFINER functions with fixed
search_path and PUBLIC execution revoked. Only the migration/function owner gets
explicit maintenance RLS policies on these import tables and a constrained system
audit insertion policy. Runtime roles do not become owners or receive BYPASSRLS.
No production role is granted execution/table access by this migration.
Before activation, review owner/role membership and grant each primitive only to
its intended backend/maintenance identity; do not grant these functions to users.

## HTTP transport and recovery

The older proposed import/onboarding YAML remains historical proposal material.
Implemented import transport follows the merged private source model: mapping
columns are an ordered field-name array, bindings are source/id pairs, and rows
return sourceRows, nullable canonicalRows, headers, mapping, totals, page-bounded
issues and requiresRefresh. This supports the pre-mapping preview as well as
normalized review. OpenAPI is updated for this actual transport; onboarding
proposal operations are not promoted.

List and preview pages are bounded to 100. HMAC cursors bind tenant/resource,
limit and preview revision; altered, foreign or differently scoped cursors are
422. Current revisions/ETags, original idempotency identity and explicit approved
checksum are mandatory for commit. Reads/replays reauthorize current Admin role.
Foreign session IDs are 404. Purged previews are 410 IMPORT_DATA_PURGED; GET keeps
minimal session/result metadata. New create returns 201; exact replay returns 200.
Uncertain commit: GET session or retry identical key/revision/approval/checksum.
Never start a new import or infer success from a lost HTTP response.

## Verification and rollback

Targeted real PostgreSQL covers cross-instance concurrency, rolling counters,
RLS/role/tenant denial, stale global fencing, source/map/preview/atomic commit,
durable replay, purge, startup/recurring cleanup and overdue locked rows.
Real HTTP covers auth before body, chunked byte limit, 15-second deadline and
disconnected upload recovery. Migration 016 up/down/up and cleanup are exercised
with a NOSUPERUSER/NOBYPASSRLS function owner, using the existing privileged
historical 001-015 migration path.

Native Windows broad backend checks currently fail existing Linux-only PDF
inspection tests; identical clean-main failures must be retained as baseline
evidence. Targeted H2 tests do not replace Linux CI or required repository checks.
See PR verification for exact commands/counts and final CI state.

Recovery first disables ingestion/composition, drains requests and waits for
parser/transaction closure. Keep cleanup running until source sessions have been
cancelled/expired and staging is purged. Preserve committed results and workers;
never undo a successful import by deleting workers. Stop cleanup before optional
016 down migration. Down refuses live global leases or nonterminal source imports.
Reapply 016 and restart monitored cleanup before any separately authorized resume.
Production down migrations remain blocked by existing migration controls.

Open: H2-2 complete Admin UI, H2-3/4 resumable onboarding/operator identity,
target-runtime containment/capacity/alerts, privacy and backup/restore erasure,
staging/customer acceptance and explicit activation. This PR grants none of them.

Native Windows baseline comparison also reproduces the existing date conversion
assertion at postgres.test.ts:799 (local timezone yields 2026-06-20 instead of
2026-06-21). Linux/UTC CI is authoritative for the full regression gate; no
unrelated date/PDF code or platform guard is changed by this import slice.
