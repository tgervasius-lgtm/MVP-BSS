# BSS OS Control Board

Last reviewed: 2026-08-11
Operating phase: `POST-CONSOLIDATION / INDEPENDENT ANALYSIS GOVERNANCE`

## Executive state

| Workstream | Status | Priority | Exit criterion |
|---|---|---:|---|
| Stable software baseline | DONE | P0 | PR #99 merged into protected `main` with required checks green and CodeQL `js/missing-rate-limiting = 0` |
| Repository governance | DONE / AUTOMATED | Maintain | Ruleset and required checks remain active and verified |
| Product feature registry | ACTIVE / EVIDENCE MAINTENANCE | P1 | Feature status stays aligned with merged code, API, data, security, tests and release evidence |
| Decision log | ACTIVE | P0 | Material decisions reflect the current merged baseline and later changes are versioned |
| Risk register | ACTIVE | P0 | Critical risks have owners, mitigation and measurable closure criteria |
| Codex operating instructions | DONE / EVOLVING | Maintain | `AGENTS.md v3` is authoritative after #130/PR #138 synchronized the proven automation foundation |
| Development automation foundation | DONE / EVOLVING | Maintain | #126/PR #134 preflight/verification, #125/PR #135 Playwright-mode reconciliation and #127/PR #137 issue-driven profiles are merged and proven; local wrappers complement rather than replace GitHub gates |
| PR #31 retirement | DONE | P1 | Unique useful controls extracted/rejected with evidence and historical PR #31 closed without merge |
| Dependabot repository security settings | OPEN / EXTERNAL | P1 | Dependabot alerts/security updates enabled and verified through issue #115 |
| Independent code analysis | ACTIVE / AUTOMATED | P1 | SonarQube Cloud governance closed through #117/PR #140; Trivy Phase 1 is merged and passing on protected `main` through #129/PR #141, and #139 remains a non-blocking parallel PowerShell follow-up |
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

Evidence from the 2026-08-11 analysis of protected `main` at `5843644d887d181ea4ce94d43c13036bce72377c`:

- initial Sonar baseline: **315** open/current-main issues;
- current Sonar API evidence: **306 overall open issues**, a net reduction of **9**, and **11 issues in the active New Code period**;
- the GitHub check summary labels its 306 count as “New issues”, but the Sonar measures/issues APIs distinguish 306 overall from 11 New Code issues;
- assigned Quality Gate: default **Sonar way**; current status: **PASS**;
- Security Hotspots: **0**;
- PR decoration/check behavior is working on focused pull requests;
- PRs #118–#120 hardened workflow/supply-chain findings without suppressing scanner output;
- PR #121 removed two focused reliability Blockers;
- PR #123 resolved the explicit weekly-attendance ISO date sort finding while preserving behavior;
- #139 owns non-blocking parallel review-first disposition of the 11 current PowerShell findings rather than mixing code changes into the completed #117 governance scope; #139 is not required for #129.

Observed New Code / Quality Gate policy:

- New Code definition: **Previous version**; the active period begins at `2026-08-08T13:39:15Z`, the initial analysis checkpoint;
- gate conditions apply to New Code and require reliability rating A, security rating A, maintainability rating A, duplication no greater than 3%, and 100% review of Security Hotspots;
- the current analysis reports A for all three ratings, 0.0% New Code duplication and 100% reviewed Security Hotspots;
- New Code coverage is displayed as 0.0% in the GitHub check, but it is not present among the observed gate conditions and must not be reported as passing coverage evidence;
- Sonar remains an additional independent opinion. Existing GitHub required checks, CodeQL Advanced, Gitleaks, dependency audits, SBOM, architecture and governance controls remain in force.

Finding treatment policy:

- actionable findings receive focused issues/PRs with exact rule, location, behavioral risk and verification evidence; historical debt is not a bulk-cleanup mandate;
- false-positive or non-applicable findings require recorded technical rationale and owner review before Sonar disposition; code behavior must not change solely to satisfy the scanner;
- accepted/disposed findings remain auditable and are not silently suppressed, and any external setting that cannot be read is reported `UNAVAILABLE` rather than inferred.

A green Sonar gate is scanner evidence only. It is not staging, production, security-audit, legal, operational, pilot or hardware evidence. PR #140 merged the focused governance sync and issue #117 is closed; Trivy issue #129 may therefore proceed from the resulting current `main` baseline.

The current baseline may advance beyond any historical SHA in this document. Protected `main`, not a historical commit listed here, is always the authoritative software state.

## Current critical path

### P1-1 — Development automation foundation

Issue #124 completed the evidence-only inventory/design gate. Its implementation split is now complete on protected `main`:

1. #126/PR #134 — non-destructive Windows preflight and thin verification wrappers;
2. #125/PR #135 — frontend-only Playwright harness/assertion reconciliation without weakening full-stack, request-error or axe evidence;
3. #127/PR #137 — issue-driven Codex execution-profile routing (`FAST`, `STANDARD`, `CRITICAL`, `AUDIT`);
4. #130/PR #138 — `AGENTS.md v3`, merged only after the mechanisms were proven.

`AGENTS.md v3` is now authoritative. Local automation must not clean/stash/reset user work, expose secrets, change PowerShell execution policy or duplicate GitHub governance/security gates.

### P1-2 — Sonar baseline governance loop (`DONE`)

Issue #117 closed after PR #140 merged the working baseline, evidence-backed Previous version / Sonar way policy and focused remediation history. Ongoing policy remains:

1. keep the 11 current PowerShell findings routed through #139 as a non-blocking parallel follow-up and route future actionable findings into similarly focused issues/PRs;
2. preserve accepted/non-applicable findings with evidence rather than changing product behavior solely for scanner cosmetics.

### P1-3 — Trivy filesystem/configuration baseline (`IMPLEMENTED / EVIDENCE PROVEN  PHASE 1`)

PR #141 was squash-merged into protected `main` as `3888fac174a4ae09ede056549e8443b3e892267e`. Push run `31533060983` passed on that exact commit and established the post-merge Phase 1 evidence:

- official Trivy `v0.73.0` release binaries are pinned and checksum-verified;
- the explicit filesystem scanners are `vuln,misconfig`, with root/backend development dependencies included and secret/image scanning excluded;
- the protected-main run recorded two npm dependency targets, zero vulnerability findings, zero supported configuration targets and zero misconfiguration findings, matching the earlier local and PR-level baselines;
- the protected-main run uploaded JSON and SARIF successfully as a 90-day workflow artifact with only `contents: read`; no code-scanning upload permission is requested;
- findings remain non-blocking (`exit-code 0`) during Phase 1, while scanner/integrity/execution failures still fail the job;
- no ignore file, accepted-debt suppression, container change, product-code change or required-ruleset change is included.

The local, PR-level and protected-main GitHub Actions evidence match. Zero supported configuration targets remains applicability evidence, not proof that BSS configuration or repository security is safe. Issue #129 is open only for this focused post-merge documentation synchronization. Phase 1 findings remain non-blocking; any Phase 2 blocking policy requires separate BSS OS approval and baseline-aware regression handling.

Detailed provenance, scan contract, counts, classification, evidence limits and rollback are recorded in `docs/security/TRIVY_BASELINE.md`.

### Accepted MASTER ROADMAP v4.9 continuation

This board records but does not redefine or supersede the accepted BSS MASTER ROADMAP v4.9 execution order:

1. AUDIT A;
2. #131 — freeze the BSS v1 Product Contract before Design Foundation.

### Parallel, non-blocking lanes

- #139 reviews and dispositions the 11 current PowerShell findings without blocking the mandatory critical path.
- Hardware 9A remains parallel and does not replace its required physical metrology, validation or acceptance evidence.

### Later routed work

- Trivy Phase 1 is merged and automated through #129/PR #141. It must continue to complement, not duplicate or replace, Sonar, CodeQL, Gitleaks, dependency audits or SBOM generation, with explicit severity/failure policy and no silent scanner suppression.
- #115 retains the repository-level Dependabot settings follow-up without being placed ahead of the accepted critical path.
- PR #28: compare against current `main`, split useful hardware/API/QA/container/handoff work into focused PRs and close the historical draft.
- PR #30: reconstruct Preview Portal from current `main`; do not merge the old 146-commit branch wholesale.
- Staging and later readiness work retain their existing evidence gates and are not placed ahead of `AUDIT A → #131` by this board.

## Active legacy pull request portfolio

| PR | Purpose | Current treatment |
|---:|---|---|
| #28 | Hardware, QA, API, operations and handoff | Split/retarget from current `main`; do not merge wholesale |
| #30 | Preview Portal release candidate | Reconstruct from current `main`; keep isolated from production |

PR #27 and PR #31 are closed as superseded. Neither is an active integration target.

## Sequence from the current baseline

Mandatory execution critical path under accepted BSS MASTER ROADMAP v4.9:

1. Complete AUDIT A.
2. Complete #131.

#139 and Hardware 9A remain parallel and non-blocking. Trivy Phase 1 is merged through #129/PR #141; #115, PR #28, Preview, staging, later hardware readiness and later readiness work retain their existing routing without being promoted ahead of the accepted `AUDIT A → #131` critical path.

## Management rule

The board tracks what BSS should do next. `BSS_READINESS_MATRIX.md` tracks whether each technical and operational capability has sufficient evidence. `PRODUCT_FEATURE_REGISTRY.md` tracks what the product actually implements. These documents must not contradict each other, and none of them may treat a merged software baseline or a green scanner as proof of production deployment.
