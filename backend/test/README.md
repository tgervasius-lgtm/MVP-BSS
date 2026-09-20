# PostgreSQL integration fixture reliability (#173)

Baseline: protected main `ae25e2319786c377819a5e550339c803869ca96e`.

The current `postgres.test.ts` and `attendance-periods.postgres.test.ts`
share BSS_TEST_DATABASE_URL and mutate the same database/table ACLs with
GRANT, REVOKE and DROP OWNED. Distinct role names do not isolate these rows.
R34 CI recorded `tuple concurrently updated` at REVOKE INSERT and GRANT
CONNECT; the latter happened before cleanup registration and the job hung.

This initial documentation-only commit triggers existing CI with unchanged
main application, dependencies and integration tests to preserve a separate
baseline observation before the focused harness change.

Scope: give each of those two suites a disposable database, register cleanup
before setup can fail, retain real PostgreSQL and all role/RLS/concurrency
assertions. The migration-012 suite keeps its dedicated database model.
No product permission, migration, endpoint or dependency change is intended.

Acceptance: actual PostgreSQL integration passes; focused regression evidence
covers independent fixtures and cleanup after setup failures. A passing retry
alone is insufficient evidence. Existing required checks remain enforced.

Recovery: revert only the fixture change if necessary and preserve failed CI
evidence in issue #173. This work does not authorize production deployment.
