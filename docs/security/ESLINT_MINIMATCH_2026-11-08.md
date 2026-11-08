# ESLint minimatch security candidate — 8 November 2026

Status: **PREPARED / LOCAL VERIFICATION; NOT MERGED OR DEPLOYED**.
Baseline: protected main `52382e2f1a764974e7a78fcb5fc58553cacdb8da`.

## Problem and chosen boundary

Root development tooling contains `eslint 10.11.0` and
`@eslint/config-array 0.23.5`, both requesting minimatch 10. The reviewed
[GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249)
affects minimatch `>=7.0.0 <11.0.1`. The root audit reports four MODERATE
affected packages through these edges, with no HIGH/CRITICAL findings.
No BSS exploitation or production exposure is claimed.

Registry metadata checked on 8 November still has minimatch 10 ranges in
ESLint 10.14.0 and config-array 0.23.5. Dependabot's automatic solution would
downgrade ESLint/@eslint/js to 9.39.5. This candidate preserves all existing
direct dependency versions and restricts two exact `11.0.5` overrides to the
ESLint subtree. It does not override minimatch in the backend or globally.

The lockfile changes only minimatch 10.2.5 -> 11.0.5 and its new development
dependency `@isaacs/nonrecursive-glob-match 1.1.0`. Both use BlueOak-1.0.0,
already present in the repository's dependency-review license allowlist.
The existing patched brace-expansion version is preserved. Registry integrity
hashes are locked; no lifecycle scripts were enabled during installation.

## Compatibility, not an assumed drop-in upgrade

The [minimatch 11 changelog](https://github.com/isaacs/minimatch/blob/v11.0.5/changelog.md)
documents a matcher rewrite and removed APIs including `makeRe`, AST and
regexp internals. Inspected ESLint/config-array consumers use `Minimatch`
construction and `match`, including partial directory matching. Their normal
options do not opt into optimization level 2. This limits current exposure;
it does not erase the vulnerable committed dependency or prove every external
ESLint integration compatible with the new major.

`tests/eslint-minimatch-compat.test.mjs` exercises the actual current checkout:
existing strict/ignored paths, browser/node globals, denial of undefined names
and eval, filesystem discovery, globstar/brace/extglob/dotfile selection, and
bounded rejection of adversarial preprocessing. The new test runs before the
unchanged `eslint .` command in `npm run lint`; no rule or gate is relaxed.

The identical 23 tests on clean baseline main produced **22 PASS / 1 expected
FAIL**: the isolated adversarial worker reached its five-second timeout.
The candidate produced **23 PASS**, including explicit `RangeError` rejection.
The child has a bounded heap, output and execution time; the main test process
does not run an unbounded adversarial pattern.

## Verification and readiness

Linux Node 24 local checks: root audit zero findings, ESLint, the 23 compatibility
tests, 227 existing frontend tests, build and existing audit/workflow regression
controls. Baseline and candidate build outputs contain the same 77 files with
identical SHA-256 values. Windows on the owner's Bognar laptop, Node 22.23.2 /
npm 10.9.8: clean install without lifecycle scripts, Quick/Frontend wrapper,
full `npm run check:frontend` (23 compatibility + 227 existing tests, ESLint,
77-file build) and committed-graph audit all passed. Root audit is zero;
backend retains five lower-severity findings, with HIGH/CRITICAL both zero.

GitHub PR checks must be established on the published candidate. Before merge,
require current-head quality, Dependency audit, CodeQL
analysis, Validate PR governance, Validate change impact and Gitleaks full-history
scan, plus every other applicable repository gate. Local PASS does not replace
that evidence or approve a merge/deployment.
Backend runtime, PostgreSQL, API/RBAC/RLS, attendance and deployment code are
unchanged. No Staging/Pilot/production readiness upgrade follows from this fix.

## Exit condition and recovery

This is a temporary compatibility override, requiring review whenever ESLint,
config-array, minimatch or its new matcher dependency changes. Remove the
override when upstream declarations support an audited patched matcher, then
regenerate the lockfile and rerun the compatibility suite and required checks.
Do not add suppressions, force an unreviewed downgrade or weaken the audit.

Before merge, stop if compatibility or required checks fail. A later reviewed
revert can restore the old graph but also restores the MODERATE finding;
prefer a focused compatible forward fix. No data migration is involved.
The owner approved this focused package's publication and conditional merge,
including existing automatic Cloudflare demo deployments, on 8 November 2026.
That approval does not cover backend deployment, access changes or gate bypass.
