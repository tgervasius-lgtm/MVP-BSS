# Backend dependency security candidate — 8 November 2026

Status: **PREPARED / NOT PUBLISHED / NOT MERGED / NOT DEPLOYED**.
Baseline: protected main `e076126879bf09cf0ead70391a34128d7b34af05`.

## Summary and boundary

The committed backend graph reports five MODERATE affected-package entries,
zero HIGH/CRITICAL. They represent three dependency paths, not five separate
BSS incidents. The prepared graph reports zero findings in both root/backend.
Only backend dependencies, focused tests and evidence change. Application
source, API/OpenAPI, authentication rules, proxy trust, database/RLS, attendance
and frontend assets are unchanged. This is not a backend deployment approval.

| Path | Locked baseline -> candidate | Applicability and evidence |
| --- | --- | --- |
| Static discovery/delivery | static 10.1.4 -> 10.1.10; send 4.1.0 -> 4.2.1; glob 13.0.6 -> 14.0.4; minimatch 10.2.5 -> 11.0.5; path-scurry 2.0.2 -> 3.0.0 | Supported upstream dependency ranges replace a forced override. Glob cancellation and minimatch preprocessing advisories apply to the graph. BSS uses default wildcard static serving, not user-supplied glob patterns or cancellation budgets. No BSS exploitation is claimed. |
| Schema URI handling | AJV's fast-uri 3.1.8 -> 3.1.9; fast-json-stringify's copy 4.2.1 -> 4.2.3 | Both supported major branches are patched. BSS application source has no direct fast-uri or suffix-mode calls; consumers use it for schema references. Tests resolve each consumer's actual copy. |
| Rate-limit IP parsing | ip-address 10.7.2 -> 10.7.6; rate-limit stays 11.2.0 | Patch remains in the existing ^10.2.0 range. An isolated bounded worker reproduces long IPv6-zone parsing cost on baseline and verifies prompt rejection on candidate. Existing BSS auth/rate-limit contract tests remain required. |

New nonrecursive-glob-match 1.1.0 has BlueOak-1.0.0; changed packages use
existing allowed MIT/BSD-3-Clause/BlueOak licences. Existing lru-cache 11.5.2
and argon2 platform/libc metadata are preserved. The now-unmatched
minimatch@10.2.5 -> brace-expansion override is removed; locked patched
brace-expansion and the other overrides remain. No new override/suppression,
license exception or lifecycle-install permission is introduced.

## Sources, compatibility and limits

Reviewed primary sources:

- [Glob cancellation GHSA-3g3m-2fjr-6pw4](https://github.com/advisories/GHSA-3g3m-2fjr-6pw4), patched >=14.0.2.
- [Minimatch GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249), patched >=11.0.1.
- [IPv6 parser GHSA-rxp7-6hxx-x8q5](https://github.com/advisories/GHSA-rxp7-6hxx-x8q5), patched >=10.7.4.
- Fast-uri advisories: [encoded scheme](https://github.com/advisories/GHSA-w74x-v6f9-j3xg), [relative paths](https://github.com/advisories/GHSA-xhq7-xmqj-769h), [host confusion](https://github.com/advisories/GHSA-wjr9-j795-jxcr), [suffix colon](https://github.com/advisories/GHSA-333x-w4r6-6crp). Patched branches 3.1.9 / 4.2.3.
- [Static upstream source comparison](https://github.com/fastify/fastify-static/compare/v10.1.4...v10.1.10) and [10.1.10 release](https://github.com/fastify/fastify-static/releases/tag/v10.1.10).

Static's patch sequence also authorizes the final selected index/file and
changes its internal forbidden-path error to FST_STATIC_FORBIDDEN_PATH with
statusCode. BSS's generic plugin error mapping remains unchanged. Existing
static contracts cover traversal, role/session boundaries, public asset bytes,
cache headers, relative/absolute sendFile and native case aliases. A new fixture
denies the final private index even when its directory passes allowedPath.
This reproduces an upstream boundary; BSS does not currently configure that
private-file policy. Static roots must contain public assets only.

URI normalization is not an arbitrary-input sanitizer. Inspection found that
normalize('javascript:alert(1)', {reference:'suffix'}) can return its original
input when suffix parsing rejects it as an authority. The advisory's short
normalization example therefore is not used to promise safe arbitrary output.
The test exercises the actual fixed schemeless-path serialization boundary;
it also verifies encoded-scheme rejection, host rejection and relative target
preservation. No BSS code enables suffix mode. Do not use normalized strings
as authorization/redirect decisions without validating the parse result and
intended scheme/host policy.

## Verification evidence

Linux Node 24.22.1: typechecks and backend build PASS. Full unit/contract run:
126 PASS / 1 FAIL / 0 skipped (127 total). The unchanged ClamAV stream adapter
cannot open its Unix socket here: listen EPERM. The same unchanged test and
file hash reproduce EPERM on baseline; it is environmental evidence, not PASS.
Baseline with the identical new security/static tests: 9 PASS / 8 expected FAIL
(17 total). Candidate's security cases pass within the wider run. The eight
baseline failures cover six URI cases, IPv6 worker timeout and final-index
authorization. Suffix serialization and already-aborted glob are compatibility
checks, not claimed baseline vulnerability reproductions.

Windows Node 22.23.2: typechecks, build, OpenAPI, audit and the 17 focused
security/static tests PASS. Static evidence requires and confirms win32 with
caseInsensitive=true. Full Quick/Backend wrapper remains FAIL: 120 PASS /
7 FAIL / 0 skipped. All seven are the existing PDF runtime fixture's six
subtests plus parent. The unchanged fixture also produces the same seven
failures on a clean main worktree using the same Node/tsx loader: Linux-only
/dev/shm/permission assumptions and process.geteuid unavailable on Windows.
No assertion was weakened or test excluded from that full-suite result.

Linux minimum Node 22.13, actual disposable PostgreSQL and all applicable
current-head GitHub checks remain pending. No local
PostgreSQL target is available; no implicit database is touched. Local evidence
does not replace those gates. On 8 November the owner approved publication
of this six-file package, merge only after all applicable checks pass, and
existing automatic frontend/demo deployments. Backend deployment, access
changes and bypass are outside that approval.

## Recovery and next step

Before merge, stop on unexplained compatibility/gate failures. Review any
subsequent main changes and refresh this candidate if needed. A reviewed revert
requires no migration but restores the five affected-package entries; prefer
a narrowly tested forward fix. Do not roll back auth protections or hide audit
findings. No readiness promotion, backend activation or production exposure is
established by this preparation.
