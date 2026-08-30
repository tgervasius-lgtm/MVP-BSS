# Issue #146 deterministic attendance-period recovery

Status: PROPOSED — BSS OS review required before merge, rollout, or use in an environment.

## Scope and invariants

Migration `012_deterministic_attendance_periods` adds the tenant-scoped `OPEN → REVIEW → FINALIZED → CLOSED` lifecycle, append-only transition evidence, immutable finalized dataset versions, and provenance-linked report artifacts. `FINALIZED` and `CLOSED` block attendance correction approval, new correction requests, recalculation, and accepted delayed terminal mutations for that month.

Transition idempotency stores and returns the original transition result even if the period later advances. Manager reads and locked exports are filtered by event-effective or effective assignment department; unknown historical scope remains manager-invisible. Accountants retain report read/export access but cannot perform lifecycle transitions.

Existing month-lock rows are retained as `FINALIZED` with `legacy_unavailable` provenance. The migration does not invent snapshots, checksums, calculation versions, or template provenance for historical locks.

## Forward recovery

- Treat a failed migration as a `STOP`. Preserve the exact database error and migration transaction evidence.
- Do not delete a period version, transition, locked report, raw terminal event, correction, calculation, or audit event to make a retry pass.
- Correct migration or application defects with a reviewed forward migration from the authoritative protected `main` baseline.
- A legacy lock that needs reproducible reporting must be reopened by an Administrator with a reason, reviewed, and finalized again. That creates the first complete immutable version while preserving the fact that the earlier lock had unavailable provenance.
- A delayed accepted event or correction affecting a finalized month requires an audited reopen, correction/reconciliation and recalculation as applicable, review, and relock. Previously issued artifacts continue to reference their original immutable period version.

## Application rollback boundary

Rolling the application back while leaving migration 012 applied is fail-closed: the earlier application treats any materialized lifecycle row as a month lock. It may therefore block changes to `OPEN` or `REVIEW` rows, but it must not mutate finalized data or erase provenance. Restore the issue-146 application before resuming period work.

The down migration is permitted only before any new transition, finalized period version, provenance-linked report, or #146 lifecycle/export audit evidence exists. Once deterministic-period evidence exists, the down migration raises an exception. Removing that evidence requires a separately reviewed recovery decision and is not an ordinary rollback.

Migration 012 is designed for the separate table-owning migrator role while that role remains `NOSUPERUSER NOBYPASSRLS`. Its global legacy backfill and down guard temporarily remove `FORCE RLS` inside the migration transaction because FORCE RLS otherwise hides other tenants even from the table owner. Successful up/down paths restore FORCE before commit; a refused or failed down rolls the transaction back, including the temporary RLS setting, and retains the migration ledger plus period/version/export/audit evidence.

## Verification required before rollout

- Run migration 012 and the PostgreSQL integration suite against an explicit disposable `BSS_TEST_DATABASE_URL` with `BSS_REQUIRE_POSTGRES_TESTS=true`.
- Confirm RLS isolation and runtime grants for lifecycle rows, versions, transitions, and exports.
- Confirm migration/backfill and both allowed/refused down paths through a fresh database owned by a `NOSUPERUSER NOBYPASSRLS` migrator; do not substitute a superuser migration run.
- Confirm unresolved attendance blocks finalization and close, concurrent correction/finalization has one serialized outcome, and repeated idempotency keys do not create duplicate versions.
- Confirm reopen/relock retains old versions and CSV/XLSX/PDF artifacts, while verification recomputes both artifact and dataset checksums.
- Record database backup/restore and environment rollout evidence separately. Repository checks alone do not prove operational recovery.
