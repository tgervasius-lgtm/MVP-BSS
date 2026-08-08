# BSS Readiness Matrix

## Authoritative software baseline — 2026-08-08

Phase 0 baseline consolidation is complete.

- PR #99 `feat(backend): integrate MVP Phase B into current main` was squash-merged into protected `main`.
- Authoritative baseline commit: `198b2ce9f1ad73b7b72058a930cf005cbb35a0da`.
- PR #27 was closed as superseded rather than direct-merged.
- Issue #55 was closed as completed after final state/SHA verification.
- Required repository checks were green before merge.
- PostgreSQL-backed integration and full-stack browser/accessibility validation used for the integration were green.
- Direct CodeQL and GitHub CodeQL completed with `js/missing-rate-limiting = 0` after genuine runtime limits were added to the authorization-bearing routes identified by the audit.
- OpenAPI declares the shared `429 RateLimited` response for operations that implement runtime rate limiting.
- PR #99 did not deploy a production backend, provision staging, prove shared/distributed rate limiting, perform a production restore drill or validate physical hardware.

This document is the authoritative readiness view for BSS. Its purpose is not to claim that the system is error-free; it separates merged implementation evidence from deployment, operational, privacy, hardware and commercial readiness.

## Statuses

- `DONE` — completed for the stated scope with reproducible evidence
- `AUTOMATED` — continuously checked on PRs, `main` or a defined schedule
- `PARTIAL` — a real foundation exists but required evidence/layers remain
- `OPEN` — not complete; requires owner, evidence and closure plan
- `EXTERNAL` — depends on hosting, physical hardware, vendor, legal/business action or another non-repository system

## Update rule

Every material change affecting architecture, data, security, deployment, terminal behavior, privacy, hardware or developer handoff must update the relevant row and point to evidence. `MERGED`, `DONE`, `STAGING`, `PRODUCTION` and `RELEASED` are different states. A green PR must never be used as proof of infrastructure, legal or physical readiness.

| Area | Exit criterion | Current status | Evidence / next evidence |
|---|---|---:|---|
| Authoritative software baseline | One protected `main` contains the reviewed frontend/backend baseline with no unresolved Phase B integration fork | DONE | PR #99 → `198b2ce9f1ad73b7b72058a930cf005cbb35a0da`; PR #27 superseded; issue #55 completed |
| MVP scope | All functions have clear `in scope`, `out of scope` and acceptance criteria | PARTIAL | Scope freeze, OpenAPI, feature registry and screen map exist; final pilot feature freeze remains before live pilot |
| Architecture | Frontend/backend/terminal/database boundaries are documented and the merged code has no hidden integration fork | PARTIAL | Backend architecture + merged Phase B are authoritative; final hosting/network/shared-service topology remains infrastructure work |
| Codex operating instructions | Codex instructions name current BSS OS truth sources and correct runtime/deployment boundaries | PARTIAL | Current `AGENTS.md` is pre-Phase-0 and must be replaced by `AGENTS.md v2` after this truth sync |
| Frontend quality | Lint, tests, build, accessibility and key E2E flows pass | AUTOMATED | BSS quality gate and Playwright/axe coverage |
| Backend quality | TypeScript, build, unit/contract/integration tests and PostgreSQL flows pass | AUTOMATED | Backend quality gate plus full-stack quality gate; PR #99 passed integration acceptance |
| API contract — structure | OpenAPI is syntactically/structurally valid with stable operation IDs, parameters and references | AUTOMATED | Redocly + API/dependency governance gate |
| API-runtime alignment | Implemented endpoints, statuses and response schemas match OpenAPI including rate-limit semantics | PARTIAL | Contract tests exist and `429 RateLimited` drift guard was added through PR #99; expand automated drift coverage to all operations |
| Database and migrations | Clean database migrates from zero and application invariants/RLS work in PostgreSQL | PARTIAL | PostgreSQL CI proves migrations/integration on repository changes; real staging upgrade/rollback/recovery rehearsal remains open |
| Tenant isolation | Cross-tenant access is technically blocked and regression tested | AUTOMATED | `FORCE ROW LEVEL SECURITY`, `NOBYPASSRLS`, tenant-scoped transactions and cross-tenant CI tests merged through PR #99 |
| Authentication and sessions | Login, refresh, logout, invitation and revocation have tested security/concurrency boundaries | PARTIAL | Strong merged auth/concurrency coverage; staging configuration and independent security review remain before production |
| RBAC | Every operation has approved allowed roles and negative tests | PARTIAL | Service guards, OpenAPI role declarations and negative coverage exist; final authoritative role-operation matrix still required before pilot |
| Audit log | Critical operations leave tenant-scoped, understandable and protected evidence | PARTIAL | Audit implementation and append-only database controls exist; production retention/access/export policy remains open |
| Secrets and keys | No secrets in Git history; secure custody, rotation and recovery are defined and proven | PARTIAL | Gitleaks full-history automated; production secret store/KMS, rotation, recovery and break-glass drills remain EXTERNAL |
| Static security | CodeQL and dependency security checks continuously pass | AUTOMATED | Security workflow; PR #99 final CodeQL `js/missing-rate-limiting = 0` |
| Secret scanning | Current code and available Git history block leaked credentials without exposing values | AUTOMATED | Gitleaks full-history scan with verified binary/checksum and redaction |
| CI/CD workflow correctness | Workflow YAML, expressions and embedded shell are validated | AUTOMATED | Workflow static validation/actionlint gate |
| GitHub Actions supply chain | Remote actions use immutable full commit SHAs | AUTOMATED | SHA-pinning policy and current workflows |
| Dependency maintenance | Dependency updates and new vulnerabilities/licences are continuously reviewed | PARTIAL / AUTOMATED | Root npm + GitHub Actions Dependabot and dependency review exist; `/backend` Dependabot entry and final policy for full dev-dependency audit are post-Phase-0 gaps |
| SBOM | Frontend and backend CycloneDX inventories are generated/validated/archiveable | AUTOMATED | BSS dependency inventory workflow |
| PR size and risk | Large/multi-domain PRs receive automatic warning/classification | AUTOMATED | PR risk/size guardrails |
| PR documentation | Goal, risk, validation and rollback evidence are required | AUTOMATED | BSS PR governance gate |
| Code ownership | Critical repository areas have formal owner patterns | DONE | `.github/CODEOWNERS` |
| Branch protection | `main` requires PR workflow, current branch, resolved conversations and required checks; force/deletion/bypass controls remain active | AUTOMATED | Active repository ruleset; squash-only operating practice retained |
| Unit tests | Core business rules have stable fast tests | PARTIAL | Strong current suite; formal coverage thresholds remain optional/open |
| Integration tests | API/database/migrations/RLS execute against real PostgreSQL in CI | AUTOMATED | PostgreSQL 16 backend and full-stack CI |
| E2E tests | Main role flows work through browser and backend | PARTIAL | PR #99 proved current integrated flows; expand/rebaseline after Preview reconstruction and later release-candidate changes |
| Accessibility | Critical WCAG regressions are blocked automatically | AUTOMATED | Playwright + axe quality checks |
| Performance | SLOs, load/soak tests and query plans exist for critical flows | OPEN | Requires realistic tenant sizes and production-like staging |
| Rate limiting and abuse protection | Sensitive endpoints have real limits and the intended multi-instance/shared policy is proven | PARTIAL / EXTERNAL | Genuine route limits merged and CodeQL-clean; production WAF/shared-store/proxy and multi-process behavior still require staging evidence |
| RFID listing capacity | Worker/RFID hydration remains usable at the approved maximum tenant size without arbitrary throttling or request explosion | OPEN | No authoritative maximum workforce size is approved; define capacity or introduce batched tenant-scoped RFID hydration, then load test |
| Backup | Automated encrypted backup, retention and ownership are implemented | EXTERNAL | Provider selection/configuration and independent encrypted copy remain before live use |
| Restore/PITR | Restore is actually executed and measured | OPEN | Mandatory real restore/PITR drill before first paid/live production customer |
| Disaster recovery | RTO/RPO, command roles, continuity and recovery communications are proven | OPEN | DR/continuity OS exists; real provider/account/founder recovery drills remain |
| Deployment packaging | Reproducible build/image, healthcheck and rollback path exist | PARTIAL | Backend build is reproducible; hardened container work from legacy PR #28 must be rebuilt/retargeted from current `main` and scanned |
| Staging environment | Production-like backend/database/network/secrets configuration exists separately from Preview | OPEN / EXTERNAL | Infrastructure issue #59; provision only from authoritative post-Phase-0 baseline |
| Production deployment | Controlled production environment is provisioned and release-gated | OPEN / EXTERNAL | No production backend deployment was performed by PR #99 |
| Cloud configuration | DNS, TLS, WAF, network, secrets and account ownership are inventoried | EXTERNAL | Complete after staging/provider selection; public Preview configuration remains a separate concern |
| Observability | Structured logs, metrics/traces, alerts and dashboards are operational | OPEN | Introduce during staging; Sentry/monitoring stack follows runtime environment selection |
| Error tracking | Runtime errors have grouping, release and owner context | OPEN | Introduce in staging before pilot |
| Uptime and health | External health checks detect service unavailability | OPEN | Add after staging/public service endpoint exists |
| Privacy/GDPR | Purposes, roles, data map, retention, DPA, rights and incident handling are approved | OPEN | Governance/templates exist; customer-specific/legal review and live processing gates remain |
| Data minimization | Unnecessary personal/device data are excluded and retention remains controlled | PARTIAL | Strong minimization baseline exists; final production retention and support-access decisions remain |
| Production/customer-data access | Admin/support access is least-privilege, reviewed and audited | OPEN | Identity/access/secrets OS exists; actual account inventory, MFA, break-glass and access-review evidence remain private/external |
| Terminal security | Device identity, signing, nonce/replay, revocation and credential validity are tested | PARTIAL | Software contracts are merged; real provisioning, secret custody and physical device tests remain |
| Offline terminal | Queue, idempotency, clock drift and recovery are defined and verified on real device | PARTIAL | API/software invariants exist; physical offline/recovery test remains |
| Hardware BOM | Exact SKUs, dimensions, compatibility and substitution policy are confirmed | EXTERNAL | Physical metrology and frozen prototype BOM required |
| Enclosure and thermals | Final CAD/tolerances/ventilation/mounting are proven by prototype | EXTERNAL | SolidWorks/STEP/manufacturing package after exact measurements |
| RFID physical reliability | Read range/orientation/metal interference/false reads are measured | OPEN | Bench and installed-environment tests on real prototype |
| Developer onboarding | A new developer can clean-clone and work from documentation without founder memory | PARTIAL | Developer guide/backend handoff exist; independent clean-room takeover test remains and legacy PR #28 handoff should be deduplicated |
| Operational documentation | Deploy/rollback/backup/restore/incident/troubleshooting procedures exist and match real infrastructure | PARTIAL | BSS OS coverage is broad; provider-specific operational evidence waits for staging |
| Frontend handoff artifact | Immutable frontend package/release asset is reproducibly verified | AUTOMATED | Existing frontend handoff/release workflows |
| Whole-system handoff | Code, API, DB, tests, architecture, risks, operations and ownership are sufficient for independent continuation | PARTIAL | Strong documentation foundation; finalize after legacy PR retirement, staging and clean-room takeover |
| Vendor lock-in | Repo/domain/cloud/secrets/billing/admin control remain with BSS | OPEN | Complete private access/ownership register before external developer/provider dependency grows |
| Licenses | New dependencies are automatically reviewed against approved licence policy | AUTOMATED | GitHub dependency review and SPDX allowlist |
| Release versioning | Code, migrations, artifacts, changelog and environment release state are traceable | PARTIAL | Frontend process exists; whole-system release process and staging deployment remain |
| Independent code analysis | An external static-analysis baseline exists in addition to GitHub/Codex checks | OPEN | Next tooling sequence: SonarQube Cloud, then Trivy after `AGENTS.md v2`/legacy-control cleanup as appropriate |
| Independent senior audit | Qualified reviewer inspects architecture, auth, RLS, privacy and operations | OPEN | Plan after stabilization/feature freeze and before paid production rollout |
| Penetration test | External testing targets the real staging/production attack surface | OPEN | OWASP ZAP/independent testing only after network-accessible staging exists |
| Analytics/pilot telemetry | Product usage evidence is collected with privacy-safe masking and approved purpose | OPEN | PostHog or equivalent only near pilot; no real employee/session replay data without explicit privacy controls |

## Non-negotiable production/live-pilot blockers

BSS must not be labelled `production ready` merely because Phase 0 is complete. At minimum, the following still require their own evidence before live production claims:

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

## Immediate post-Phase-0 sequence

1. Synchronize BSS OS truth documents to PR #99 / `198b2ce9...`.
2. Replace stale root Codex instructions with `AGENTS.md v2`.
3. Finalize PR #31 gap analysis and extract only the remaining useful controls.
4. Add SonarQube Cloud, then Trivy, against the authoritative baseline.
5. Split/retarget retained PR #28 work.
6. Reconstruct Preview Portal from current `main`, then establish Figma/Storybook as the design workflow.
7. Build production-like staging and attach observability, secrets, backup/restore and performance evidence.
8. Complete physical terminal and independent review before real pilot data.

## Working without blind spots

For every new module/service or external platform, record the owner, threat model, data processed, contract/API impact, tests, dependency/SBOM coverage, deployment/rollback, observability, privacy implications and handoff evidence. Functionality is not complete merely because it works locally or because a PR merged.
