# BSS Readiness Matrix

## Authoritative software baseline — 2026-09-04

Phase 0 baseline consolidation is complete and the protected `main` has continued through focused post-consolidation hardening and independent-analysis remediation.

Current protected `main` is `02a76abe48e750932fbf3002d1ef2dd10ed8881a`. Issues #143/#145/#144/#146 are merged, and issue #133 records a targeted AUDIT A recheck PASS on the historical `b904eca` implementation baseline. BSS v1 Product Contract v1.0 remains `ACCEPTED / FROZEN`; PR #155 integrated it at the historical freeze commit `29b00c0f63af0b3ffbd2d828550c882b9096fd05`, and issue #131 remains CLOSED/COMPLETED. Current `main` inherits that frozen contract plus the later merged security-maintenance PRs #160/#159 and the post-freeze governance/screen-map reconciliation from PR #158. #156 Phase A is complete; #157 is CLOSED/COMPLETED and PR #158 is merged. PR #161 is OPEN/DRAFT and proposal-only (`PROPOSED / NOT ACCEPTED`); the Visual Design Gate and explicit owner/BSS OS acceptance remain required before Design Foundation acceptance. Figma and Storybook remain `CANDIDATE / INACTIVE`, and no frontend implementation is authorized by proposal status. None of these facts upgrades implementation, Staging, Pilot, hardware, Production or Commercial readiness.

- PR #99 `feat(backend): integrate MVP Phase B into current main` was squash-merged into protected `main`.
- Phase-0 merge commit: `198b2ce9f1ad73b7b72058a930cf005cbb35a0da`.
- PR #27 was closed as superseded rather than direct-merged.
- Issue #55 was closed as completed after final state/SHA verification.
- Required repository checks were green before merge.
- PostgreSQL-backed integration and full-stack browser/accessibility validation used for the integration were green.
- Direct CodeQL and GitHub CodeQL completed with `js/missing-rate-limiting = 0` after genuine runtime limits were added to the authorization-bearing routes identified by the audit.
- OpenAPI declares the shared `429 RateLimited` response for operations that implement runtime rate limiting.
- Post-Phase-0 focused work synchronized the BSS OS (#101), merged `AGENTS.md v2` (#102), expanded dependency maintenance (#103), restored committed-graph audit integrity and remediated `brace-expansion` to 5.0.9 (#113), and added the current-main architecture growth guard (#114).
- Historical PR #31 is closed as superseded after all unique useful controls were extracted, superseded, rejected with rationale or moved to repository-setting issue #115.
- SonarQube Cloud was established through issue #117 as an additional independent analyzer. PRs #118–#120 hardened CI/supply-chain findings, PR #121 removed two focused reliability Blockers, and PR #123 resolved the weekly-attendance ISO sorting finding without behavior drift.
- Current Sonar evidence on authoritative `main` at `5843644d887d181ea4ce94d43c13036bce72377c`: default **Sonar way** Quality Gate PASS, 306 overall open issues versus the initial 315 baseline, 11 issues in the active New Code period, and 0 Security Hotspots. This is static-analysis evidence, not production-readiness evidence.
- The observed Sonar New Code definition is **Previous version**, with the active period starting at the initial 2026-08-08 analysis. The gate checks new-code reliability, security and maintainability ratings, duplication and reviewed Security Hotspots; coverage is displayed but is not an observed gate condition.
- Issues #125, #126, #127 and #130 are closed through merged PRs #135, #134, #137 and #138 respectively. The preflight/verification wrappers, local Playwright-mode reconciliation, issue-driven execution profiles and `AGENTS.md v3` are therefore implemented on protected `main`.
- Issue #117 closed after PR #140 merged the Sonar governance synchronization into protected `main` as `daf1434c0bd751b4558e4fc34fac3ca924b55861`.
- PR #141 was squash-merged into protected `main` as `3888fac174a4ae09ede056549e8443b3e892267e`, establishing the Trivy `v0.73.0` Phase 1 filesystem/configuration workflow. Push run `31533060983` passed on that exact commit with two npm dependency targets, zero vulnerability findings, zero supported configuration targets and zero misconfiguration findings; the JSON/SARIF artifact uploaded successfully with 90-day retention and only `contents: read` permission.
- Current authoritative software state is always protected `main`. The earlier local baseline remains tied to `daf1434c0bd751b4558e4fc34fac3ca924b55861`; the post-merge evidence is the protected-main commit/run above. Zero supported configuration targets is applicability evidence, not proof that BSS configuration or repository security is safe. Phase 1 finding presence remains non-blocking, scanner/integrity/execution failures remain blocking, and no Phase 2 blocking policy is approved. Issue #129 is open only for this focused post-merge documentation synchronization.
- None of these repository changes deploys a production backend, provisions staging, proves shared/distributed rate limiting, performs a production restore drill or validates physical hardware.

This document is the authoritative readiness view for BSS. Its purpose is not to claim that the system is error-free; it separates merged implementation evidence from deployment, operational, privacy, hardware and commercial readiness.

## Statuses

- `DONE` — completed for the stated scope with reproducible evidence
- `AUTOMATED` — continuously checked on PRs, `main` or a defined schedule
- `PARTIAL` — a real foundation exists but required evidence/layers remain
- `OPEN` — not complete; requires owner, evidence and closure plan
- `EXTERNAL` — depends on hosting, physical hardware, vendor, legal/business action or another non-repository system

## Update rule

Every material change affecting architecture, data, security, deployment, terminal behavior, privacy, hardware or developer handoff must update the relevant row and point to evidence. `MERGED`, `DONE`, `STAGING`, `PRODUCTION` and `RELEASED` are different states. A green PR or scanner must never be used as proof of infrastructure, legal or physical readiness.

| Area | Exit criterion | Current status | Evidence / next evidence |
|---|---|---:|---|
| Authoritative software baseline | One protected `main` contains the reviewed frontend/backend baseline with no unresolved Phase B integration fork | DONE | PR #99 established the baseline; PR #27 superseded; issue #55 completed; later focused hardening continues from current `main` |
| MVP scope | All functions have clear `in scope`, `out of scope` and acceptance criteria | ACCEPTED / FROZEN CONTRACT | `BSS_V1_PRODUCT_CONTRACT.md` v1.0 is the owner-approved scope authority; contract freeze does not change implementation or readiness evidence |
| Architecture | Frontend/backend/terminal/database boundaries are documented and the merged code has no hidden integration fork | PARTIAL | Backend architecture + merged Phase B are authoritative; PR #114 prevents silent growth of known legacy modules; final hosting/network/shared-service topology remains infrastructure work |
| Codex operating instructions | Codex instructions name current BSS OS truth sources and correct runtime/deployment boundaries | DONE / EVOLVING | `AGENTS.md v3` merged through PR #138 after #126/#127 automation was implemented and proven; future operating changes remain evidence-controlled |
| Developer automation | Local BSS work starts from a verified baseline, routes checks consistently and chooses Codex effort from explicit task risk without destructive automation | DONE / EVOLVING | #124 design is implemented through #126/PR #134 and #127/PR #137; #125/PR #135 reconciled local Playwright modes; wrappers remain thin local orchestration and do not replace GitHub gates |
| Frontend quality | Lint, tests, build, accessibility and key E2E flows pass | AUTOMATED | BSS quality gate and Playwright/axe coverage |
| Backend quality | TypeScript, build, unit/contract/integration tests and PostgreSQL flows pass | AUTOMATED | Backend quality gate plus full-stack quality gate; PR #99 passed integration acceptance |
| API contract — structure | OpenAPI is syntactically/structurally valid with stable operation IDs, parameters and references | AUTOMATED | Redocly + API/dependency governance gate |
| API-runtime alignment | Implemented endpoints, statuses and response schemas match OpenAPI including rate-limit semantics | PARTIAL | Contract tests exist and `429 RateLimited` drift guard was added through PR #99; expand automated drift coverage to all operations |
| Database and migrations | Clean database migrates from zero and application invariants/RLS work in PostgreSQL | PARTIAL | PostgreSQL CI proves migrations/integration on repository changes; real staging upgrade/rollback/recovery rehearsal remains open |
| Tenant isolation | Cross-tenant access is technically blocked and regression tested | AUTOMATED | `FORCE ROW LEVEL SECURITY`, `NOBYPASSRLS`, tenant-scoped transactions and cross-tenant CI tests merged through PR #99 |
| Authentication and sessions | Login, refresh, logout, invitation and revocation have tested security/concurrency boundaries | PARTIAL | Strong merged auth/concurrency coverage; staging configuration and independent security review remain before production |
| RBAC | Every operation has approved allowed roles and negative tests | CONTRACT FROZEN / IMPLEMENTATION PARTIAL | Service guards, OpenAPI role declarations and negative coverage exist; the frozen role-operation matrix still requires implementation alignment where identified and later staging revalidation |
| Audit log | Critical operations leave tenant-scoped, understandable and protected evidence | PARTIAL | Audit implementation and append-only database controls exist; production retention/access/export policy remains open |
| Secrets and keys | No secrets in Git history; secure custody, rotation and recovery are defined and proven | PARTIAL | Gitleaks full-history automated; production secret store/KMS, rotation, recovery and break-glass drills remain EXTERNAL |
| Static security | CodeQL and dependency security checks continuously pass | AUTOMATED | Security workflow; PR #99 final CodeQL `js/missing-rate-limiting = 0`; root/backend high-severity audits include development dependencies after PRs #103/#113; Sonar is tracked separately as independent analysis |
| Secret scanning | Current code and available Git history block leaked credentials without exposing values | AUTOMATED | Gitleaks full-history scan with verified binary/checksum and redaction |
| CI/CD workflow correctness | Workflow YAML, expressions and embedded shell are validated | AUTOMATED | Workflow static validation/actionlint gate |
| GitHub Actions supply chain | Remote actions use immutable full commit SHAs and dependency lifecycle execution is constrained | AUTOMATED | SHA-pinning policy plus PRs #118–#120 supply-chain hardening; explicit required lifecycle rebuilds remain reviewed rather than globally enabled |
| Dependency maintenance | Dependency updates and new vulnerabilities/licences are continuously reviewed | PARTIAL / AUTOMATED | Root npm, `/backend` npm and GitHub Actions Dependabot version-update streams exist; root/backend full high-severity committed-graph audits are active; repository-level Dependabot alerts/security updates remain issue #115 |
| SBOM | Frontend and backend CycloneDX inventories are generated/validated/archiveable | AUTOMATED | BSS dependency inventory workflow |
| PR size and risk | Large/multi-domain PRs receive automatic warning/classification | AUTOMATED | PR risk/size guardrails |
| PR documentation | Goal, risk, validation and rollback evidence are required | AUTOMATED | BSS PR governance gate |
| Code ownership | Critical repository areas have formal owner patterns | DONE | `.github/CODEOWNERS` |
| Branch protection | `main` requires PR workflow, current branch, resolved conversations and required checks; force/deletion/bypass controls remain active | AUTOMATED | Active repository ruleset and squash-only operating practice |
| Architecture growth | Known oversized modules do not silently grow and new source modules stay reviewable | AUTOMATED | PR #114 freezes `app.js` 2105, `phase-a.ts` 614, `pg-mvp-service.ts` 1419 and `pg-phase-a-service.ts` 1377; other backend TS max 600 and frontend `src` JS max 400 |
| Unit tests | Core business rules have stable fast tests | PARTIAL | Strong current suite; formal coverage thresholds remain optional/open |
| Integration tests | API/database/migrations/RLS execute against real PostgreSQL in CI | AUTOMATED | PostgreSQL 16 backend and full-stack CI |
| E2E tests | Main role flows work through browser and backend and local verification modes have documented semantics | AUTOMATED | Full-stack CI/browser/axe remains active; #125/PR #135 reconciled the frontend-only harness and stale assertion while preserving console/request-failure and axe checks; frontend-only and full-stack evidence remain distinct |
| Accessibility | Critical WCAG regressions are blocked automatically | AUTOMATED | Playwright + axe quality checks |
| Performance | SLOs, load/soak tests and query plans exist for critical flows | OPEN | Requires realistic tenant sizes and production-like staging |
| Rate limiting and abuse protection | Sensitive endpoints have real limits and the intended multi-instance/shared policy is proven | PARTIAL / EXTERNAL | Genuine route limits merged and CodeQL-clean; production WAF/shared-store/proxy and multi-process behavior still require staging evidence |
| RFID listing capacity | Worker/RFID hydration remains usable at the approved maximum tenant size without arbitrary throttling or request explosion | OPEN | No authoritative maximum workforce size is approved; define capacity or introduce batched tenant-scoped RFID hydration, then load test |
| Backup | Automated encrypted backup, retention and ownership are implemented | EXTERNAL | Provider selection/configuration and independent encrypted copy remain before live use |
| Restore/PITR | Restore is actually executed and measured | OPEN | Mandatory real restore/PITR drill before first paid/live production customer |
| Disaster recovery | RTO/RPO, command roles, continuity and recovery communications are proven | OPEN | DR/continuity OS exists; real provider/account/founder recovery drills remain |
| Deployment packaging | Reproducible build/image, healthcheck and rollback path exist | PARTIAL | Backend build is reproducible; hardened container work from legacy PR #28 must be rebuilt/retargeted from current `main` and scanned |
| Staging environment | Production-like backend/database/network/secrets configuration exists separately from Preview | OPEN / EXTERNAL | Infrastructure issue #59; provision only from the authoritative current baseline |
| Production deployment | Controlled production environment is provisioned and release-gated | OPEN / EXTERNAL | No production backend deployment has been performed by the consolidation/hardening PRs |
| Cloud configuration | DNS, TLS, WAF, network, secrets and account ownership are inventoried | EXTERNAL | Complete after staging/provider selection; public Preview configuration remains a separate concern |
| Observability | Structured logs, metrics/traces, alerts and dashboards are operational | OPEN | Introduce during staging; Sentry/monitoring stack follows runtime environment selection |
| Error tracking | Runtime errors have grouping, release and owner context | OPEN | Introduce in staging before pilot |
| Uptime and health | External health checks detect service unavailability | OPEN | Add after staging/public service endpoint exists |
| Privacy/GDPR | Purposes, roles, data map, retention, DPA, rights and incident handling are approved | OPEN | Governance/templates exist; customer-specific/legal review and live processing gates remain |
| Data minimization | Unnecessary personal/device data are excluded and retention remains controlled | PARTIAL | Strong minimization baseline exists; final production retention and support-access decisions remain |
| Production/customer-data access | Admin/support access is least-privilege, reviewed and audited | OPEN | Identity/access/secrets OS exists; actual account inventory, MFA, break-glass and access-review evidence remain private/external |
| Terminal security | Device identity, signing, nonce/replay, revocation and credential validity are tested | PARTIAL | Software contracts are merged; real provisioning, secret custody and physical device tests remain |
| Offline terminal | Queue, idempotency, clock drift and recovery are defined and verified on real device | PARTIAL | #144/DEC-025 software implementation and fresh PostgreSQL evidence passed with the targeted AUDIT A recheck on `b904eca`; physical durable-commit, feedback, power-loss, offline and recovery testing remains separate under #132/AUDIT C. |
| Hardware BOM | Exact SKUs, dimensions, compatibility and substitution policy are confirmed | EXTERNAL | Physical metrology and frozen prototype BOM required |
| Enclosure and thermals | Final CAD/tolerances/ventilation/mounting are proven by prototype | EXTERNAL | SolidWorks/STEP/manufacturing package after exact measurements |
| RFID physical reliability | Read range/orientation/metal interference/false reads are measured | OPEN | Bench and installed-environment tests on real prototype |
| Developer onboarding | A new developer can clean-clone and work from documentation without founder memory | PARTIAL | `AGENTS.md v3`, Developer Guide/backend handoff, CODEOWNERS, BSS OS and the #126/#127 local startup/routing tools exist; independent clean-room takeover remains required |
| Operational documentation | Deploy/rollback/backup/restore/incident/troubleshooting procedures exist and match real infrastructure | PARTIAL | BSS OS coverage is broad; provider-specific operational evidence waits for staging |
| Frontend handoff artifact | Immutable frontend package/release asset is reproducibly verified | AUTOMATED | Existing frontend handoff/release workflows |
| Whole-system handoff | Code, API, DB, tests, architecture, risks, operations and ownership are sufficient for independent continuation | PARTIAL | Strong documentation foundation; finalize after PR #28 retirement, staging and clean-room takeover |
| Vendor lock-in | Repo/domain/cloud/secrets/billing/admin control remain with BSS | OPEN | Complete private access/ownership register before external developer/provider dependency grows |
| Licenses | New dependencies are automatically reviewed against approved licence policy | AUTOMATED | GitHub dependency review and SPDX allowlist |
| Release versioning | Code, migrations, artifacts, changelog and environment release state are traceable | PARTIAL | Frontend process exists; whole-system release process and staging deployment remain |
| Independent code analysis | External analysis baselines exist in addition to GitHub/Codex checks and findings are handled without weakening existing gates | PARTIAL / AUTOMATED | SonarQube Cloud governance closed through #117/PR #140 and remains active with the recorded Sonar way/Previous version evidence; #139 owns non-blocking review of the 11 PowerShell findings; Trivy Phase 1 is merged and automated through #129/PR #141, with passing protected-main run `31533060983` and evidence boundaries recorded in `docs/security/TRIVY_BASELINE.md`; Phase 2 blocking policy remains unapproved |
| Independent senior audit | Qualified reviewer inspects architecture, auth, RLS, privacy and operations | OPEN | Plan after stabilization/feature freeze and before paid production rollout |
| Penetration test | External testing targets the real staging/production attack surface | OPEN | OWASP ZAP/independent testing only after network-accessible staging exists |
| Analytics/pilot telemetry | Product usage evidence is collected with privacy-safe masking and approved purpose | OPEN | PostHog or equivalent only near pilot; no real employee/session replay data without explicit privacy controls |

## Non-negotiable production/live-pilot blockers

BSS must not be labelled `production ready` merely because Phase 0, repository hardening and static-analysis gates are green. At minimum, the following still require their own evidence before live production claims:

1. production-like staging and controlled release process;
2. real encrypted backup plus successful restore/PITR drill;
3. monitoring, error tracking, uptime alerting and incident rehearsal;
4. shared/distributed abuse protection appropriate to the selected deployment topology;
5. GDPR/customer-specific data map, DPA/DPIA/notice/retention and qualified review where required;
6. load/soak tests and query-plan evidence at approved workforce/tenant volumes;
7. physical terminal provisioning, RFID, thermal, offline and recovery validation;
8. production secrets/KMS/access ownership and rotation/recovery drills;
9. independent senior security/architecture review and later network-facing security test;
10. clean-room developer takeover and private ownership/access register for critical accounts;
11. pilot installation, support, training, acceptance and fallback evidence.

## Immediate sequence from the current baseline

The accepted BSS MASTER ROADMAP v4.9 in `docs/bss-os/MASTER_ROADMAP.md` controls execution order. This readiness view records evidence and does not redefine or supersede that roadmap.

Mandatory execution critical path:

1. Review PR #161 as a Design Foundation proposal only; it remains OPEN/DRAFT and `PROPOSED / NOT ACCEPTED`.
2. Complete the Visual Design Gate using representative frozen BSS workflows; Figma and Storybook remain `CANDIDATE / INACTIVE` until separately accepted.
3. Require explicit owner/BSS OS Design Foundation acceptance before ACCEPTED status or frontend implementation authorization.
4. Activate roadmap-ordered contract-defined implementation gaps only after Design Foundation acceptance and the applicable BSS OS decision.
5. Proceed to Production-like Staging and `AUDIT B` without treating repository work as environment evidence.
6. Reach Pilot readiness only with applicable software evidence plus Hardware 9C and `AUDIT C`.
7. Run a controlled Pilot.
8. After Pilot, perform Post-Pilot hardening, require `PRG GO`, then `AUDIT D PASS`.
9. Commercial Production remains blocked until the accepted Commercial gate is satisfied.

The targeted AUDIT A recheck is `PASS` on the historical `b904eca` implementation baseline; #143/#145/#144/#146 are closed with implementation evidence on that baseline. BSS v1 Product Contract v1.0 is `ACCEPTED / FROZEN`, integrated by PR #155 at historical freeze commit `29b00c0f63af0b3ffbd2d828550c882b9096fd05` and inherited by current protected `main`; #131 is CLOSED/COMPLETED. #156 Phase A and #157 reconciliation are complete, and PR #158 is merged into current protected `main` `02a76abe48e750932fbf3002d1ef2dd10ed8881a`. PR #161 remains proposal-only and does not promote any implementation/readiness state. Onboarding/import, the reconciled screen/workflow gaps and other identified contract gaps remain implementation work.

Parallel, non-blocking work:

- #139 — review-first disposition of the 11 PowerShell New Code findings without bulk cleanup or behavior changes made solely for scanner cosmetics; #139 is not a blocker for the mandatory path.
- Hardware #132 remains parallel and non-blocking and retains its existing physical-evidence boundaries.

Trivy Phase 1 is merged and automated through #129/PR #141. #115, PR #28 retirement, Preview reconstruction, staging, later hardware readiness and later readiness work remain tracked; Product Contract freeze and Design Foundation proposal status do not promote any of them to implemented or evidence-proven status.

## Working without blind spots

For every new module/service or external platform, record the owner, threat model, data processed, contract/API impact, tests, dependency/SBOM coverage, deployment/rollback, observability, privacy implications and handoff evidence. Functionality is not complete merely because it works locally, because a PR merged or because a static analyzer reports a green gate.
