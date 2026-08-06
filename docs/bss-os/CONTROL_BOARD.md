# BSS OS Control Board

Last reviewed: 2026-08-06
Operating phase: `BASELINE CONSOLIDATION`

## Executive state

| Workstream | Status | Priority | Exit criterion |
|---|---|---:|---|
| Stable software baseline | IN REVIEW | P0 | Integration PR from current `main` has green required checks and owner approval |
| Repository governance | DONE / AUTOMATED | Maintain | Ruleset and required checks remain active and verified |
| Product feature registry | IN PROGRESS | P1 | MVP features mapped to code, API, data, security, tests and release evidence |
| Decision log | IN PROGRESS | P0 | All material current decisions recorded with implementation status |
| Risk register | IN PROGRESS | P0 | Critical risks have owners, mitigation and measurable closure criteria |
| Preview Portal | IN REVIEW | P1 | Rebased/reconstructed from stable `main`, externally accessible and clearly isolated from production |
| Hardware prototype | PARTIAL / EXTERNAL | P1 | Physical component measurements confirmed and production CAD generated |
| Production infrastructure | OPEN / EXTERNAL | P0 before pilot | Hosting, secrets, monitoring, backup/PITR, incident response and staging proven |
| Pilot readiness | PARTIAL | P1 | Software, terminal, onboarding, support, legal and operational package proven end to end |

## Current critical path

### P0-1 — Integrate Backend MVP Phase B

Current evidence:

- Original PR: `#27` — Backend MVP Phase B and production-readiness audit.
- Security/dependency repair PR: `#53` — merged into the PR #27 branch.
- PR #27 remains open and conflicted with the current `main`.

Integration evidence on 2026-08-06:

- branch `integration/issue-55-pr27-into-main-2026-08-06` was created from verified `origin/main` `331c8c1fd66b6683b4afdbcc9bf9f623b6eadce3`;
- verified Phase B head `388f96d76dbef7facab78aeae97cfc88a58f724e` was merged and seven conflicts were resolved file by file;
- local frontend and backend gates pass, including OpenAPI, TypeScript, unit/contract tests and builds;
- production dependency audits report zero vulnerabilities;
- PostgreSQL-backed and full-stack checks require CI because Docker/PostgreSQL is unavailable locally;
- local Playwright/axe execution is inconclusive because the Windows runner did not terminate with a final result.

Required next action:

1. Review the draft integration PR and its file-by-file conflict decisions.
2. Require green PostgreSQL, migration, RLS, cross-tenant, full-stack, Playwright and axe CI checks.
3. Resolve any CI-only failures without weakening security or coverage.
4. Merge only after green required checks and explicit owner approval.

### P0-2 — Freeze new core divergence

Until P0-1 is complete:

- do not add unrelated core backend features on PR #27;
- do not stack additional long-lived branches on PR #27;
- documentation and planning work may continue independently from current `main`;
- urgent security fixes must remain narrowly scoped and proven by CI.

## Active pull request portfolio

| PR | Purpose | Current treatment |
|---:|---|---|
| #27 | Backend MVP Phase B and deep audit | P0 integration target; do not direct-merge while conflicted |
| #28 | Hardware, QA, API, operations and handoff | Wait for stable baseline; retarget or split by workstream |
| #30 | Preview Portal release candidate | Reconstruct/rebase after stable baseline; keep isolated from production |
| #31 | Continuous quality/security controls | Perform gap analysis; most controls already exist in `main` |

## Sequence after baseline consolidation

1. Close or supersede PR #27 after successful integration into `main`.
2. Perform PR #31 gap analysis and extract only missing controls.
3. Split or retarget PR #28 into reviewable hardware, operations and handoff changes.
4. Rebuild the Preview Portal branch from stable `main` and rerun complete validation.
5. Complete the product feature registry.
6. Define staging and production infrastructure architecture.
7. Complete physical hardware metrology and production CAD.
8. Assemble the pilot-readiness package.

## Management rule

The board tracks what BSS should do next. `BSS_READINESS_MATRIX.md` tracks whether each technical and operational capability has sufficient evidence. These documents must not contradict each other.
