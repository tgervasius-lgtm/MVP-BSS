# Remaining Sonar findings — contextual review and control hardening

## Completion readback — 2026-10-12

Status: **PR267 MERGED VERIFIED / TWO MAIN DISPOSITIONS VERIFIED / MAIN QUALITY GATE OK**, scoped to protected-main implementation `441b902c07972bdaf20355a4b46c4690c731a24f`, reviewed source tree `ea86cfc4141dc014cf71d2f712daecdd50417565`. Original preparation text below is dated history, not current status.

PR #267 merged at `2026-10-11T22:00:04Z`. Actual-main quality job `114586280618` and mailbox/scanner/synthetic-restore job `114586280707` proved the unsafe-parent rejection, non-sticky cross-UID rename negative control, sticky rename/private-input read denial, qpdf/ClamAV and actual Docker>=28 loopback binding. Existing main evidence: 92 backend unit/contract +28 PostgreSQL PASS and six operational synthetic checks PASS, zero failures/skips. These immutable jobs are CI proof; they are not staging, customer-data, physical-device, real PITR or RPO/RTO proof.

With separate explicit owner authorization, main issue `AaEdGENiSplG0XCcTnBj` was resolved FALSE POSITIVE with its approved contextual comment at `2026-10-11T22:28:46Z`. Main issue `AaEdGEklSplG0XCcTnBo` was ACCEPTED, legacy WONTFIX resolution, with its approved comment at `2026-10-11T22:30:14Z`. The CI password is genuinely hard-coded; it was not called FIXED or FALSE POSITIVE. The approval is only for that disposable synthetic CI fixture, never a production credential. One exact approved comment per issue and status/gate readbacks were verified. No NOSONAR, exclusions, rule reduction, permission expansion or weakening of runtime controls.

Analysis `6050da28-5801-4147-8bbd-7c49dfe6cf64` remains tied to this main implementation. Quality Gate OK, same-head GitHub Sonar check `114586589950` SUCCESS. Full New Code OPEN/CONFIRMED issue inventory read `2026-10-12T08:40:35Z`: 262 distinct CODE_SMELL / MAINTAINABILITY findings, including 30 HIGH /202 MEDIUM /30 LOW. GitHub's same-head summary still displays 575; cause remains unverified. These counts are not evidence that 262 findings were fixed or all historical/accepted/hotspot alerts were reviewed. The two PR267-only synthetic Python dispositions belong to their PR context and are not automatic cross-branch authorization or synchronization.

Mailbox remains DISABLED BY DEFAULT; actual staging tmpfs/swap/crash cleanup, hostile root/same-UID threat boundaries, runtime scanner/key custody and customer privacy/backup controls remain separate. H2 stays inactive. Staging/Pilot/Commercial Production remain NOT PASS. Rollback would require a separately reviewed revert preserving the controls and explicit evidence; this documentation refresh changes no executable behavior.

Evidence: [merged PR267](https://github.com/tgervasius-lgtm/MVP-BSS/pull/267), [main checks](https://github.com/tgervasius-lgtm/MVP-BSS/commit/441b902c07972bdaf20355a4b46c4690c731a24f/checks), [Sonar main issues](https://sonarcloud.io/project/issues?id=tgervasius-lgtm_MVP-BSS&branch=main). Re-read live state before another implementation or disposition; this is dated scoped proof.

## Historical preparation — before merge and owner dispositions

Historical status: IMPLEMENTED FOR REVIEW / NOT MERGED / NO SONAR DISPOSITION.
Baseline: protected main `e1f5b0133e1b57e0022117e5c509ea7dd8bef714`,
Sonar analysis `5fc18b93-847d-442d-b2e8-4e0a59178dc6`.
Canonical coordination inputs read: Board v213, Source Map v58.

## PDF temporary directory — S5443 / AaEdGENiSplG0XCcTnBj

The official SonarJS implementation reports directory literals matching
`/dev/shm/`; it does not analyze atomic creation, effective owner, POSIX mode or
sticky-bit enforcement. This supports contextual review, not automatic closure.

Existing controls: unpredictable atomic mkdtemp, child0700, exclusive input0600,
tmpfs-only, verified child owner/type/mode, bounded parser with restricted
environment, cleanup on success/error and fail-closed503 on infrastructure fault.

The reviewed code did not verify the parent protection. An externally writable
non-sticky parent lets a different UID rename even a0700 child. The new guard
requires a real directory owned by root or the application UID; if group/other
write is allowed, sticky protection is mandatory. Reject before creating any
input. Trusted private parents remain supported; no disk fallback or hidden path.
Parent mutation by root or a compromised same-UID process is outside this guard;
private deployment/host/swap/crash cleanup remain mandatory independent evidence.

Meaningful tests cover unsafe parent modes, foreign owner, non-directory,
unchanged private-child controls and accepted private/sticky parents. A separate
synthetic CI proof drops only its child-process UID to65534 to reproduce the
non-sticky rename, then verifies sticky rename denial and private-file read denial.
It creates/removes only its own random tmpfs fixture, never customer data.
Local cross-UID execution is UNAVAILABLE: sandbox denies identity change.

Proposed disposition after fresh CI and owner review: FALSE POSITIVE for the
specific ordinary cross-UID temporary-file access/replacement warning, with these
compensating controls linked. This is not acceptance of missing deployment or
crash/privacy evidence. Do not use NOSONAR, exclusions or lower the quality gate.

## Synthetic CI database credential — S2068 / AaEdGEklSplG0XCcTnBo

The literal is an actual password for a disposable CI PostgreSQL service, not a
production credential. No real customer data or production key is used. It is
not honest to claim that no hard-coded credential exists.

The prior mapping5432:5432 did not explicitly restrict the Docker host interface.
Both backend CI jobs and the related frontend/full-stack fixture now bind
127.0.0.1:5432:5432. Before checkout or fixture use, CI checks the actual Docker
binding and requires Docker>=28 because older versions have a known localhost
publish isolation gap. Failed or unavailable proof stops the job. This does not
claim isolation from privileged processes or other containers on the CI bridge.
The password, health check and existing database URLs remain mutually consistent;
no production secret store, new persistent credential or authentication bypass.

Proposed disposition after fresh CI and owner review: ACCEPTED, strictly scoped
to this disposable synthetic CI fixture. The credential is genuinely hard-coded,
so FALSE POSITIVE would misstate the finding. Acceptance is not permission to use
the same password in staging/production or to expose customer data. Keep the
issue's evidence and explicit accepted count visible. If local project policy
requires removing all test literals,
prepare generated per-job credentials separately; do not disguise literals with
renamed labels or deterministic run IDs to evade scanning. No disposition applied.

## Acceptance, recovery and readiness

Changes are internal PDF prerequisite checks and CI network restrictions only.
No HTTP/OpenAPI, database/schema, RBAC/RLS, audit or feature activation change.
Both remaining scanner findings stay OPEN until explicitly reviewed/disposed.
The current main gate remains FAIL. CI success alone is not staging/Pilot PASS.
Rollback is a reviewed revert; no durable data or environment migration.

Primary references:
- https://sonarcloud.io/api/rules/show?key=typescript%3AS5443&organization=tgervasius-lgtm
- https://sonarcloud.io/api/rules/show?key=yaml%3AS2068&organization=tgervasius-lgtm
- https://github.com/SonarSource/SonarJS/blob/master/packages/analysis/src/jsts/rules/S5443/rule.ts
- https://docs.docker.com/engine/network/port-publishing/
- https://nodejs.org/docs/latest-v22.x/api/fs.html#fspromisesmkdtempprefix-options
