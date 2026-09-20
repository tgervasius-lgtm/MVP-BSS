# PostgreSQL integration fixture reliability (#173)

Baseline: protected main `ae25e2319786c377819a5e550339c803869ca96e`.

At the inspected baseline, `postgres.test.ts` and `attendance-periods.postgres.test.ts`
shared BSS_TEST_DATABASE_URL and mutate the same database/table ACLs with
GRANT, REVOKE and DROP OWNED. Distinct role names do not isolate these rows.
R34 CI recorded `tuple concurrently updated` at REVOKE INSERT and GRANT
CONNECT; the latter happened before cleanup registration and the job hung.

The documentation-only baseline commit `b1d9283` ran unchanged main code,
dependencies and integration tests in run `35520087701`. It passed the
period/migration suites but failed the existing RFID concurrent-assignment
assertion (`1 !== 2`, postgres.test.ts:1375). That is a separate
baseline finding, not a reproduction of the ACL error and not a PASS.
It was subsequently reproduced deterministically in #175; #176 contains the
focused RFID correction and its RED-to-GREEN evidence.

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

The fixture change itself leaves the migration-012 suite, product permissions,
migrations, endpoints, dependencies and application concurrency assertions unchanged. The RFID
assertion adds only failure diagnostics; it still requires two successes.

Regression checks exercise concurrent database/table grants and revokes,
independent data, restricted role attributes, removal of both fixture databases
and roles, CREATE ROLE denial after database creation, absence of leaked
connections, and disposal after a failed grant. Run `npm run test:integration`
with BSS_TEST_DATABASE_URL and BSS_REQUIRE_POSTGRES_TESTS=true. Node retains
its normal file concurrency; there are no assertion retries or exclusions.

PR #174 passed actual PostgreSQL 16 run 35521433179 (45 unit/contract and
6 integration tests), full-stack run 35521433094 (106 frontend and 6 browser/axe
cases), and required protected checks. It merged as
`290b0476e6f047a42bed72c4247d462d530fc607` on 20 September 2026.
Original R34 ACL failures remain recorded in #173. Independent clean-main ACL
reproduction was not obtained; the baseline comparison instead exposed #175.
Passing isolated fixture regressions and that limitation are separate evidence.

Recovery: revert only the fixture change if necessary and preserve failed CI
evidence in issue #173. This work does not authorize production deployment.
