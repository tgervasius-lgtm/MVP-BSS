# BSS OS Control Board

Last reviewed: 2026-08-08
Operating phase: `POST-CONSOLIDATION / BASELINE HARDENING`

## Executive state

| Workstream | Status | Priority | Exit criterion |
|---|---|---:|---|
| Stable software baseline | DONE | P0 | PR #99 merged into protected `main` with all required checks green and CodeQL `js/missing-rate-limiting = 0` |
| Repository governance | DONE / AUTOMATED | Maintain | Ruleset and required checks remain active and verified |
| Product feature registry | ACTIVE / EVIDENCE MAINTENANCE | P1 | Feature status stays aligned with merged code, API, data, security, tests and release evidence |
| Decision log | ACTIVE | P0 | Material decisions reflect the current merged baseline and later changes are versioned |
| Risk register | ACTIVE | P0 | Critical risks have owners, mitigation and measurable closure criteria |
| Codex operating instructions | OUTDATED / NEXT | P0 | `AGENTS.md v2` points to the current BSS OS sources of truth and correct deployment boundaries |
| Legacy PR retirement | OPEN | P0/P1 | PRs #28, #30 and #31 are safely split/reconstructed/superseded without losing useful work |
| Independent code analysis | NEXT | P1 | SonarQube Cloud and then Trivy analyze the authoritative `main` baseline |
| Preview Portal | OPEN / RECONSTRUCTION | P1 | Reconstructed from stable `main`, externally accessible and clearly isolated from production |
| Hardware prototype | PARTIAL / EXTERNAL | P1 | Physical component measurements confirmed and production CAD generated |
| Production infrastructure | OPEN / EXTERNAL | P0 before pilot | Hosting, secrets, monitoring, backup/PITR, incident response and staging proven |
| Pilot readiness | PARTIAL | P1 | Software, terminal, onboarding, support, legal and operational package proven end to end |

## Completed critical milestone — Phase 0 baseline consolidation

Backend MVP Phase B is now part of the authoritative protected `main` baseline.

Evidence:

- PR #99 `feat(backend): integrate MVP Phase B into current main` was squash-merged on 2026-08-08.
- Resulting `main` commit: `198b2ce9f1ad73b7b72058a930cf005cbb35a0da`.
- PR #27 was closed as superseded, not merged directly.
- Issue #55 was closed as completed after the integration evidence was verified.
- Required repository checks were green before merge.
- Direct CodeQL analysis and GitHub CodeQL completed successfully with `js/missing-rate-limiting = 0` after genuine route-level rate limits were added where required.
- Frontend, backend, PostgreSQL-backed, full-stack browser and accessibility checks used for the integration were green.
- OpenAPI now declares the implemented shared `429 RateLimited` response for rate-limited operations.
- No production deployment was performed by PR #99.

Phase 0 therefore has one authoritative merged software baseline in `main`. Production, staging, infrastructure, hardware and pilot readiness remain separate workstreams.

## Current critical path

### P0-1 — Synchronize BSS OS with the merged baseline

Required now:

1. Update Control Board, Decision Log, Risk Register, Product Feature Registry and Readiness Matrix to remove pre-merge Phase 0 wording.
2. Keep merged software readiness separate from production deployment readiness.
3. Record PR #99 and `198b2ce9...` as the baseline evidence.

### P0-2 — Refresh Codex operating instructions

After the truth sync:

1. create `AGENTS.md v2` from current `main`;
2. make the BSS OS sources of truth explicit;
3. remove the ambiguous statement that Cloudflare is the deployment platform for the whole system;
4. state the approved architecture boundary: Cloudflare Pages for frontend/Preview where applicable, Node/Fastify backend on the selected EU runtime/provider, with final runtime implementation still governed by infrastructure evidence;
5. keep one-PR/one-purpose, security, tenant-isolation, testing and no-false-readiness rules explicit.

### P0-3 — Retire obsolete stacked work safely

Now that issue #55 is complete:

- PR #31: perform final gap analysis and extract only still-useful controls, especially a recalibrated architecture budget, backend Dependabot coverage and any approved dependency-maintenance improvements;
- PR #28: split retained hardware/API/QA/container/handoff work into focused branches from current `main`;
- PR #30: reconstruct Preview Portal from current `main` instead of merging the old 146-commit branch wholesale.

## Active legacy pull request portfolio

| PR | Purpose | Current treatment |
|---:|---|---|
| #28 | Hardware, QA, API, operations and handoff | Split/retarget from current `main`; do not merge wholesale |
| #30 | Preview Portal release candidate | Reconstruct from current `main`; keep isolated from production |
| #31 | Continuous quality/security controls | Final gap analysis; extract only missing controls, then supersede |

PR #27 is closed as superseded by merged PR #99. It is no longer an active integration target.

## Sequence from the current baseline

1. Finish this post-Phase-0 truth sync.
2. Create and merge `AGENTS.md v2`.
3. Finish PR #31 gap analysis and extract only unique useful controls.
4. Connect SonarQube Cloud to the authoritative `main` baseline.
5. Add Trivy for dependency/container/IaC scanning where applicable.
6. Split/retarget the useful PR #28 deliverables.
7. Reconstruct Preview Portal from stable `main` and then establish the Figma/Storybook design workflow.
8. Define and provision production-like staging with observability, secrets and restore evidence.
9. Complete physical terminal metrology, CAD and prototype validation.
10. Complete independent review and the full pilot-readiness gate before live customer data.

## Management rule

The board tracks what BSS should do next. `BSS_READINESS_MATRIX.md` tracks whether each technical and operational capability has sufficient evidence. `PRODUCT_FEATURE_REGISTRY.md` tracks what the product actually implements. These documents must not contradict each other, and none of them may treat a merged software baseline as proof of production deployment.
