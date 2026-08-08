# BSS OS Control Board

Last reviewed: 2026-08-08
Operating phase: `POST-CONSOLIDATION / AUTOMATION FOUNDATION + INDEPENDENT ANALYSIS`

## Executive state

| Workstream | Status | Priority | Exit criterion |
|---|---|---:|---|
| Stable software baseline | DONE | P0 | PR #99 merged into protected `main` with required checks green and CodeQL `js/missing-rate-limiting = 0` |
| Repository governance | DONE / AUTOMATED | Maintain | Ruleset and required checks remain active and verified |
| Product feature registry | ACTIVE / EVIDENCE MAINTENANCE | P1 | Feature status stays aligned with merged code, API, data, security, tests and release evidence |
| Decision log | ACTIVE | P0 | Material decisions reflect the current merged baseline and later changes are versioned |
| Risk register | ACTIVE | P0 | Critical risks have owners, mitigation and measurable closure criteria |
| Codex operating instructions | DONE / EVOLVING | Maintain | `AGENTS.md v2` remains authoritative until implemented automation is proven and later reflected in `AGENTS.md v3` |
| Development automation foundation | ACTIVE | P1 | #126 preflight/verification and #127 issue-driven execution-profile routing are merged and proven; #125 reconciles the local Playwright baseline independently |
| PR #31 retirement | DONE | P1 | Unique useful controls extracted/rejected with evidence and historical PR #31 closed without merge |
| Dependabot repository security settings | OPEN / EXTERNAL | P1 | Dependabot alerts/security updates enabled and verified through issue #115 |
| Independent code analysis | ACTIVE | P1 | SonarQube Cloud baseline/governance is completed through #117, then Trivy is added against authoritative `main` |
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

The authoritative `main` continued forward through focused current-main PRs:

- PR #101 synchronized post-merge BSS OS truth and exact Gitleaks fixture fingerprints.
- PR #102 merged `AGENTS.md v2` with the current source-of-truth hierarchy and Cloudflare/frontend versus Node/Fastify backend boundary.
- PR #103 extracted backend Dependabot and full root/backend high-severity dependency auditing from historical PR #31.
- PR #113 corrected the intermediate audit implementation, persisted `brace-expansion` 5.0.9 and proved CI audits the committed dependency graph rather than an ephemeral runner-side fix.
- PR #114 merged the recalibrated architecture growth guard from current `main`.
- Historical PR #31 was then closed as superseded, not merged wholesale.

### SonarQube Cloud baseline and focused remediation

Issue #117 established SonarQube Cloud as an additional independent static-analysis layer without replacing GitHub/Codex/CodeQL controls.

Evidence through current `main` after PR #123:

- initial Sonar baseline: **315** open/current-main issues;
- current GitHub Sonar check: **295** issues, a net reduction of **20**;
- Sonar Quality Gate on current `main`: **PASS**;
- Security Hotspots: **0**;
- PR decoration/check behavior is working on focused pull requests;
- PRs #118–#120 hardened workflow/supply-chain findings without suppressing scanner output;
- PR #121 removed two focused reliability Blockers;
- PR #123 resolved the explicit weekly-attendance ISO date sort finding while preserving behavior.

A green Sonar gate is scanner evidence only. It is not staging, production, security-audit, pilot or hardware evidence. Issue #117 remains open only for final New Code/Quality Gate governance documentation and BSS OS readiness synchronization before Trivy becomes the next scanner layer.

The current baseline may advance beyond any historical SHA in this document. Protected `main`, not a historical commit listed here, is always the authoritative software state.

## Current critical path

### P1-1 — Development automation foundation

Issue #124 completed the evidence-only inventory/design gate and locked the implementation split:

1. #126 — add non-destructive Windows preflight and thin verification wrappers;
2. #125 — reconcile the local frontend-only Playwright baseline with the full-stack CI mode without weakening error/axe checks;
3. #127 — add issue-driven Codex execution-profile routing (`FAST`, `STANDARD`, `CRITICAL`, `AUDIT`) after #126;
4. only after those mechanisms are proven, update `AGENTS.md` to v3 so documentation describes actual behavior rather than planned behavior.

Until the implementation is merged, `AGENTS.md v2` remains authoritative. Local automation must not clean/stash/reset user work, expose secrets, change PowerShell execution policy or duplicate GitHub governance/security gates.

### P1-2 — Close the Sonar baseline governance loop

Issue #117 has a working baseline and focused remediation evidence. Remaining closure work is governance/evidence rather than bulk code cleanup:

1. explicitly document the BSS Sonar New Code / Quality Gate policy;
2. keep the Readiness Matrix / Control Board synchronized with current Sonar evidence;
3. route future actionable findings into focused issues/PRs rather than mass-fixing historical debt;
4. preserve accepted/non-applicable findings with evidence rather than changing product behavior solely for scanner cosmetics.

### P1-3 — Complete repository security setting follow-up

Issue #115 tracks repository-level Dependabot controls that cannot be expressed only by `.github/dependabot.yml`:

1. enable Dependabot alerts;
2. enable Dependabot security updates where supported;
3. verify the setting without weakening existing full root/backend CI audits.

### P1-4 — Add Trivy after Sonar governance and automation foundation

Trivy is the next independent security/container/filesystem/IaC layer. It must complement, not duplicate or replace, Sonar, CodeQL, Gitleaks, dependency audits or SBOM generation. The first Trivy PR should be a focused CI/security-tooling change from current `main` with explicit severity/failure policy and no silent scanner suppression.

### P1-5 — Retire remaining historical stacked work safely

- PR #28: compare against current `main`, split useful hardware/API/QA/container/handoff work into focused PRs and close the historical draft.
- PR #30: reconstruct Preview Portal from current `main`; do not merge the old 146-commit branch wholesale.

## Active legacy pull request portfolio

| PR | Purpose | Current treatment |
|---:|---|---|
| #28 | Hardware, QA, API, operations and handoff | Split/retarget from current `main`; do not merge wholesale |
| #30 | Preview Portal release candidate | Reconstruct from current `main`; keep isolated from production |

PR #27 and PR #31 are closed as superseded. Neither is an active integration target.

## Sequence from the current baseline

1. Implement and verify #126 local preflight/verification wrappers.
2. Reconcile #125 local Playwright baseline independently from product behavior.
3. Implement #127 issue-driven Codex execution-profile routing.
4. After the automation mechanisms are proven, update `AGENTS.md` to v3.
5. Complete #117 Sonar New Code/Quality Gate governance and keep focused Sonar cleanup evidence-based.
6. Add Trivy and define how its findings interact with existing BSS security gates.
7. Complete/verify issue #115 repository security settings if still external/open.
8. Split/retarget useful PR #28 deliverables.
9. Reconstruct Preview Portal from stable `main`, then establish the Figma/Storybook design workflow.
10. Define and provision production-like staging with observability, secrets and restore evidence.
11. Complete physical terminal metrology, CAD and prototype validation.
12. Complete independent review and the full pilot-readiness gate before live customer data.

## Management rule

The board tracks what BSS should do next. `BSS_READINESS_MATRIX.md` tracks whether each technical and operational capability has sufficient evidence. `PRODUCT_FEATURE_REGISTRY.md` tracks what the product actually implements. These documents must not contradict each other, and none of them may treat a merged software baseline or a green scanner as proof of production deployment.