# H2-1a — private staging and atomic employee creation

Owner: [#237](https://github.com/tgervasius-lgtm/MVP-BSS/issues/237). Baseline: merged #241, `b260428c34143db1cd0b17b1ec214a2fa64e2fed`. Status: **IMPLEMENTED ON CHANGE BRANCH / NOT MERGED / INACTIVE**.

## Scope and acceptance

The owner accepted the [D1/D2/D3 framework](H2_IMPORT_ONBOARDING_DECISION_PROPOSAL.md) on 2026-10-04 (Europe/Warsaw), approved merge #241 and authorized backend work. This first H2-1 PR implements a dedicated PostgreSQL persistence boundary. It accepts only internal, already mapped canonical worker values, validates them again, and creates the complete batch in one transaction after explicit approval. It does not accept a file or expose an HTTP endpoint.

Affected role: tenant Admin. Manager, Worker and Accountant are denied before acquiring a DB connection. Organization/actor scope comes from the existing trusted `ActorContext`. No user, password, RFID credential, attendance event or historical record can be imported. Existing single-worker service/API behavior is unchanged.

Acceptance for this slice: 1–1,000 canonical workers; two nonterminal sessions per tenant; explicit allowance including zero; no guessed defaults; case-insensitive uniqueness using PostgreSQL's own collation; active same-tenant department/shift references; fixed 24-hour expiry; whole-batch validation and atomic commit; immutable minimal result; authorization before replay; terminal purge; real PostgreSQL RLS/history/rollback/concurrency/deadline/recovery evidence. Missing PostgreSQL evidence blocks a merge recommendation.

## Implementation boundary

`PgWorkerImportStore` is not constructed by `server.ts` and has no registered route, feature toggle or customer activation path. The authoritative OpenAPI remains unchanged (52 paths / 63 operations). The proposed H2 HTTP artifact remains a design contract, not a claim of implementation. Complete import/onboarding remain incomplete in the product registry and API/screen map.

| Primitive | Behavior |
|---|---|
| `prepare` | Normalizes bounded canonical rows, reserves create-key identity, validates the whole batch and privately stores READY/INVALID preparation. A tenant advisory lock serializes the two-session admission across app instances. Exact key/payload replay returns the original session; changed payload conflicts. |
| `preview` | Revision-checked pages up to 100 rows; complete counts and page issues. Fresh reference/uniqueness checks can require refresh. A read does not extend expiry or silently update approval. |
| `replace` | Replaces canonical values after the future mapping adapter runs, revalidates all rows, increments revision and changes the preview checksum. Absolute expiry and original file identity remain fixed. |
| `commit` | Locks the session, handles exact prior success, checks revision/approval/checksum, locks reference rows in stable order with `FOR SHARE`, revalidates against current data, and inserts workers/history/audit/result/worker links while deleting staging in one transaction. |
| `cancel` / `get` | Cancel and expiry purge staging atomically with state/audit. Reads retain non-PII session/result metadata; terminal preparations have no preview. Expiry cleanup is committed even when an attempted action is refused. |
| `cleanupTenant` | Admin-scoped bounded primitive for expired staging and 30-day cancelled/expired metadata. Does not remove committed evidence. It is not a deployed scheduler or proof of the five-minute global cleanup objective. |

The internal checksum binds normalized values, file digest, parser/schema/policy versions and department/shift revisions. The future source-mapping adapter must also bind and retain the reviewed mapping/source-header identity when it implements the public contract. File digest/parser-version arguments are trusted internal outputs, not proof that an untrusted file was inspected.

No raw upload bytes are persisted. Staging contains private normalized worker values. Import audit entries contain only IDs, revision/counts/checksums; existing `worker.create` audit keeps its existing worker-record semantics and retention. Committed replay retains worker IDs and provenance independently of staging and requires the exact original key/revision/checksum/approval identity. Losing races do not change a successful result.

The SQL transaction has a five-second remaining-work budget, a one-second lock timeout and a five-second idle transaction timeout. Each awaited statement receives the remaining budget; cancellation is PostgreSQL-side and rollback is awaited. There is no detached writer or `Promise.race` timeout. Pool acquisition and network transport/commit acknowledgement are not an end-to-end five-second HTTP SLA. A lost acknowledgement is resolved through durable replay identity.

## Data, privileges and recovery

Migration 013 is additive. All four tables use ENABLE/FORCE RLS with both tenant and Admin predicates. Composite foreign keys bind session, uploader, approver, commit and worker to the same tenant. Existing worker triggers create department/shift/status history; unique worker indexes are the final conflict guard. Commit/result links and committed session identity are immutable. Existing migrations/checksums are untouched.

The deployment grants script explicitly revokes all access to the inactive import tables after its general SELECT grant. No production runtime capability is activated by merely migrating. Integration fixtures grant only the privileges needed for the tested store and use NOSUPERUSER/NOBYPASSRLS roles that do not own the tables. Before activation, reviewed runtime grants must be paired with authenticated routes, bounded ingestion and the monitored cleanup path; do not run the fixture grants against customer environments.

Before data exist, 013 down is allowed. Once any import session/result exists, down refuses, including when other tenants are hidden from a production-like migration owner. Its transactional FORCE-RLS changes roll back on refusal. Use reviewed forward recovery when data/evidence exist. Reverting application code does not delete workers, history or committed evidence. Correcting imported workers is a separate governed operation.

The 012 recovery test now rolls back later additive migrations before exercising the original 012 guard, preserving its original evidence assertions instead of accidentally testing the latest migration.

## Verification and remaining gates

Local: backend typecheck, 65 unit/contract tests (zero skipped), build and architecture budgets pass. Local PowerShell wrapper and PostgreSQL are unavailable; existing GitHub backend CI provides the explicit disposable PostgreSQL 16 service and mandatory integration mode. CI/real-DB outcomes are recorded in the PR, tied to its exact head; this document does not convert pending evidence into PASS.

Added PostgreSQL scenarios cover 1,000 rows, lexical IDs/zero allowance, audit/history parity, exact replay after service recreation and staging purge, cross-tenant/RBAC/RLS denial, two-session quota, stale revisions/references, late uniqueness conflicts, concurrent commits/cancel, transaction/audit failure rollback, reference locking, SQL timeout, expiry/retention and migration recovery. Only generated synthetic values are used.

Still required before enabling file ingestion: bounded hostile CSV/XLSX parsing, hard total-RSS containment with no DB credentials/network/public filesystem writes, raw-upload timeout, distributed parser admission/lease recovery, tenant attempt limits, source-column/value mapping, full public contract and HTTP tests, startup/recurring monitored cleanup with fail-closed overdue handling, backup/restore quarantine/privacy review and target-runtime capacity evidence. UI/onboarding, named D3 approval actors and real go-live are separate later slices. No production, staging, Pilot, Hardware 9C or legal readiness status is upgraded.
