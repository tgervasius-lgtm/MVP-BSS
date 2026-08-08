# BSS OS Control Board

Last reviewed: 2026-08-08
Operating phase: `POST-CONSOLIDATION / EXTERNAL ANALYSIS PREP`

## Executive state

| Workstream | Status | Priority | Exit criterion |
|---|---|---:|---|
| Stable software baseline | DONE | P0 | PR #99 merged into protected `main` with required checks green and CodeQL `js/missing-rate-limiting = 0` |
| Repository governance | DONE / AUTOMATED | Maintain | Ruleset and required checks remain active and verified |
| Product feature registry | ACTIVE / EVIDENCE MAINTENANCE | P1 | Feature status stays aligned with merged code, API, data, security, tests and release evidence |
| Decision log | ACTIVE | P0 | Material decisions reflect the current merged baseline and later changes are versioned |
| Risk register | ACTIVE | P0 | Critical risks have owners, mitigation and measurable closure criteria |
| Codex operating instructions | DONE | Maintain | `AGENTS.md v2` points to current BSS OS truth sources and correct deployment/runtime boundaries |
| PR #31 retirement | DONE | P1 | Unique useful controls extracted/rejected with evidence and historical PR #31 closed without merge |
| Dependabot repository security settings | OPEN / EXTERNAL | P1 | Dependabot alerts/security updates enabled and verified through issue #115 |
| Independent code analysis | NEXT | P1 | SonarQube Cloud and then Trivy analyze the authoritative `main` baseline |
| PR #28 retirement | OPEN | P1 | Hardware/API/QA/container/handoff work split from current `main` without wholesale merge |
| Preview Portal | OPEN / RECONSTRUCTION | P1 | Reconstructed from stable `main`, externally accessible and clearly isolated from production |
| Hardware prototype | PARTIAL / EXTERNAL | P1 | Physical component measurements confirmed and production CAD generated |
| Production infrastructure | OPEN / EXTERNAL | P0 before pilot | Hosting, secrets, monitoring, backup/PITR, incident response and staging proven |
| Pilot readiness | PARTIAL | P1 | Software, terminal, onboarding, support, legal and operational package proven end to end |

## Completed milestones

### Phase 0 — baseline consolidation

Backend MVP Phase B is part of the authoritative protected `main` baseline.

Evidence:

- PR #99 was squash-merged on 2026-08-08 as `198b2ce9f1ad73b7b72058a930cf005cbb35a0da`.
- PR #27 was closed as superseded, not merged directly.
- Issue #55 was closed as completed after state/SHA verification.
- Required repository checks, PostgreSQL/full-stack checks and CodeQL were green before merge.
- No production deployment was performed by PR #99.

### Post-Phase-0 hardening

The authoritative `main` has continued forward through focused current-main PRs:

- PR #101 synchronized post-merge BSS OS truth and exact Gitleaks fixture fingerprints.
- PR #102 merged `AGENTS.md v2` with the current source-of-truth hierarchy and Cloudflare/frontend versus Node/Fastify backend boundary.
- PR #103 extracted backend Dependabot and full root/backend high-severity dependency auditing from historical PR #31.
- PR #113 corrected the intermediate audit implementation, persisted `brace-expansion` 5.0.9 and proved CI audits the committed dependency graph rather than an ephemeral runner-side fix.
- PR #114 merged the recalibrated architecture growth guard from current `main`.
- Historical PR #31 was then closed as superseded, not merged wholesale.

The current baseline may advance beyond the original Phase-0 merge SHA. The protected `main` branch, not a historical SHA in this document, is the authoritative software state.

## Current critical path

### P1-1 — Complete repository security setting follow-up

Issue #115 tracks the repository-level Dependabot controls that cannot be expressed by `.github/dependabot.yml`:

1. enable Dependabot alerts;
2. enable Dependabot security updates where supported;
3. verify the setting without weakening the existing full root/backend CI audits.

### P1-2 — Independent static analysis baseline

After the internal baseline/historical-control cleanup:

1. connect SonarQube Cloud to the authoritative `main`;
2. establish a reviewable baseline and Quality Gate without weakening existing GitHub checks;
3. then add Trivy for dependency/container/filesystem/IaC scanning where applicable.

### P1-3 — Retire remaining historical stacked work safely

- PR #28: compare against current `main`, split useful hardware/API/QA/container/handoff work into focused PRs and close the historical draft.
- PR #30: reconstruct Preview Portal from current `main`; do not merge the old 146-commit branch wholesale.

## Active legacy pull request portfolio

| PR | Purpose | Current treatment |
|---:|---|---|
| #28 | Hardware, QA, API, operations and handoff | Split/retarget from current `main`; do not merge wholesale |
| #30 | Preview Portal release candidate | Reconstruct from current `main`; keep isolated from production |

PR #27 and PR #31 are closed as superseded. Neither is an active integration target.

## Sequence from the current baseline

1. Complete/verify issue #115 repository security settings.
2. Connect SonarQube Cloud to the authoritative `main` baseline.
3. Add Trivy and define how its findings interact with existing BSS security gates.
4. Split/retarget useful PR #28 deliverables.
5. Reconstruct Preview Portal from stable `main`, then establish the Figma/Storybook design workflow.
6. Define and provision production-like staging with observability, secrets and restore evidence.
7. Complete physical terminal metrology, CAD and prototype validation.
8. Complete independent review and the full pilot-readiness gate before live customer data.

## Management rule

The board tracks what BSS should do next. `BSS_READINESS_MATRIX.md` tracks whether each technical and operational capability has sufficient evidence. `PRODUCT_FEATURE_REGISTRY.md` tracks what the product actually implements. These documents must not contradict each other, and none of them may treat a merged software baseline as proof of production deployment.