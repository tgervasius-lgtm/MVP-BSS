# PostgreSQL integration fixture reliability (#173)

Baseline: protected main `ae25e2319786c377819a5e550339c803869ca96e`.

The current `postgres.test.ts` and `attendance-periods.postgres.test.ts`
share BSS_TEST_DATABASE_URL and mutate the same database/table ACLs with
GRANT, REVOKE and DROP OWNED. Distinct role names do not isolate these rows.
R34 CI recorded `tuple concurrently updated` at REVOKE INSERT and GRANT
CONNECT; the latter happened before cleanup registration and the job hung.

The documentation-only baseline commit `b1d9283` ran unchanged main code,
dependencies and integration tests in run `35520087701`. It passed the
period/migration suites but failed the existing RFID concurrent-assignment
assertion (`1 !== 2`, postgres.test.ts:1375). That is a separate unresolved
baseline finding, not a reproduction of the ACL error and not a PASS.

Each of those two suites now uses a random dedicated database created from
template0 and a NOSUPERUSER/NOBYPASSRLS application role. The explicit
BSS_TEST_DATABASE_URL must point to a disposable PostgreSQL test server;
its owner must be able to create databases/roles, as already required by
the migration-012 suite. Do not use production or customer databases.

Cleanup is registered before migrations, grants or seeding. Setup failures
also clean up; disposal closes the pool and owner, drops only resources
successfully created by that fixture, and closes the administrator connection.
Every cleanup step is attempted even if an earlier step fails; errors remain
visible. Repeated disposal returns the same promise. Connection/statement
timeouts bound connection and SQL waits; the existing CI timeout remains.

The migration-012 suite, product permissions, migrations, endpoints, runtime
dependencies and application concurrency assertions are unchanged. The RFID
assertion adds only failure diagnostics; it still requires two successes.

Regression checks exercise concurrent database/table grants and revokes,
independent data, restricted role attributes, removal of both fixture databases
and roles, CREATE ROLE denial after database creation, absence of leaked
connections, and disposal after a failed grant. Run `npm run test:integration`
with BSS_TEST_DATABASE_URL and BSS_REQUIRE_POSTGRES_TESTS=true. Node retains
its normal file concurrency; there are no assertion retries or exclusions.

Acceptance requires actual PostgreSQL integration and protected checks.
Local lint, 45 unit/contract cases and build pass; PostgreSQL CI evidence is
pending. A passing retry alone is insufficient. Original R34 ACL failures
remain recorded in issue #173, separately from the baseline RFID failure.

Recovery: revert only the fixture change if necessary and preserve failed CI
evidence in issue #173. This work does not authorize production deployment.
