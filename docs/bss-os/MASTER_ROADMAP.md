# BSS Master Roadmap v4.9

Status: `ACCEPTED GOVERNANCE / REPOSITORY CODIFICATION`
Roadmap version date: 2026-08-11
Repository codification scope: GitHub issue #133
Owner: Tomislav Bognar / BSS

## Purpose and evidence boundary

This roadmap is the global governance layer above existing BSS phases, issues and domain documents. It controls sequencing, gates, decision maturity, evidence and reopening. It does not replace the Product Contract, OpenAPI contract, migrations, readiness evidence, BSS OS registers or detailed workstream documents.

`H1-H11 = HARDENED v1` means that each workstream has an accepted architecture, governance and evidence path. It does not mean that the workstream is implemented, deployed, recovery-proven, Pilot-ready, Commercial-ready or production-ready.

The accepted source for this version is issue #133 and its owner-reviewed H1-H11 checkpoints. This repository document makes that reviewed governance discoverable without relying on chat history. Later implementation claims require merged code or documents and evidence appropriate to the claimed state.

## Roadmap invariants

1. Protected `main` is the software baseline, but `main != production`.
2. Merged, checks green, deployed, environment-verified, released, Pilot-accepted and production-ready are separate states.
3. Existing phases and issue ownership remain in force. This layer routes work; it does not erase or silently replace it.
4. H1-H11 did not reorder the accepted software path `#126 -> #125 -> #127 -> #130 -> #117 -> #129 -> AUDIT A -> #131`. After the earlier nodes completed, Roadmap v4.9 therefore originally routed the live sequence through `AUDIT A -> #131`. AUDIT A subsequently found four concrete BLACK/GATE defects, so the accepted gap-audit/reopen rule inserted focused blockers before a targeted AUDIT A recheck; this does not rewrite the original roadmap history.
5. Hardware 9A-9D under #132 remains a parallel workstream. Critical 9C evidence blocks Pilot; applicable 9D productization and compliance evidence blocks Commercial Rollout.
6. Preview is synthetic sales/UX evidence only. Production-like Staging, real Pilot use and Commercial Production require their own gates.
7. No #133 hardening checkpoint authorizes recurring spend, production deployment, a Vendor Lock or child-issue spam.

## Decision maturity and review outcome

Every material technology, service, library, framework, hardware or vendor decision must record its maturity:

| Maturity | Meaning | Evidence required to advance |
|---|---|---|
| `REQUIREMENT LOCK` | The outcome BSS must achieve is fixed. | Approved requirement, owner, affected gates and acceptance evidence. |
| `ARCHITECTURE LOCK` | The conceptual design and non-negotiable boundaries are fixed. | Alternatives and security, privacy, reliability, portability and recovery analysis. |
| `PREFERRED CANDIDATE` | Current best option for evaluation; not a production commitment. | POC or comparison using current pricing, limits, residency, support, integration and exit evidence. |
| `IMPLEMENTATION / VENDOR LOCK` | Final selection approved for the stated environment and envelope. | Gate review, owner approval, proven operation, cost/contract record and migration or exit path. |

The review outcome is recorded separately as one of `CANDIDATE`, `POC REQUIRED`, `APPROVED`, `APPROVED WITH LIMITATIONS`, `DEFERRED` or `REJECTED`. `PREFERRED CANDIDATE` must never be reported as Vendor Lock.

## Reversibility classes

| Class | Meaning | Change control |
|---|---|---|
| `GREEN` | Easily reversible with low migration cost. | Normal focused review and rollback note. |
| `YELLOW` | Reversible with material engineering, data, operational or customer work. | Explicit impact, migration and exit analysis. |
| `RED` | Foundational architecture or high lock-in decision. | Strong architecture review and evidence before Freeze. |
| `BLACK / GATE` | Legal, security, privacy, integrity, reliability or commercial requirement that cannot be bypassed. | Must PASS with applicable evidence; schedule pressure cannot convert it to accepted risk. |

## Cost timing and option analysis

Before formal company formation, BSS authorizes no new recurring paid service when an adequate free or local option supports development, testing or pre-production. An exception requires an explicit BSS OS decision with owner, reason, current price, activation date, duration and exit path.

Material choices compare, where practical, free, paid, premium/enterprise and open-source/self-hosted options. The comparison covers capability gaps, current and scaled cost, paid-versus-free benefit, engineering and operations workload, security, reliability, support/SLA, privacy/residency, BSS integration, lock-in, export/migration path, migration cost, reversibility and recheck gate.

Free tier and credits are not permanent COGS. Open source and self-hosting include operational TCO. Current plans, prices, limits, commercial-use terms, region/residency and SLAs are mutable and must be reverified immediately before purchase, activation or Vendor Lock.

The operational register is [`TOOL_SERVICE_COST_REGISTER.md`](TOOL_SERVICE_COST_REGISTER.md). An entry does not authorize procurement.

## Complete domain ownership A-V

Every domain must maintain requirements, acceptance/evidence and release-gate relationships appropriate to its risk. Missing evidence is `NOT_PROVEN`, not PASS.

| Domain | Owning path | Required evidence or gate relationship |
|---|---|---|
| A Product / MVP | Scope Freeze, AUDIT A, #131 | Approved v1 scope, roles, workflows, edge cases, data needs and Product Contract. |
| B UX / Frontend | Product Contract, design system, Design Foundation | Role-purposeful accessible flows, responsive/error/empty states and contract-aligned E2E evidence. |
| C Backend / API | OpenAPI, backend architecture and focused issues | Server-side RBAC/data scope, stable errors, audit/concurrency/idempotency and contract tests. |
| D Database / Data | Versioned migrations and PostgreSQL evidence | Tenant/RLS isolation, constraints, indexes, migration/recovery and real PostgreSQL tests. |
| E Security | H4, identity/secrets OS and security gates | Threat/control evidence, least privilege, rotation/revocation, tenant isolation and incident handling. |
| F Quality / Testing | Verification wrappers and GitHub checks | Focused tests, broader applicable gates, failure classification and production-like evidence where required. |
| G Release Engineering | H1 / Phase 6B and release OS | Immutable artifact promotion, manifest, compatibility, migration rehearsal, rollback/hotfix and release evidence. |
| H Infrastructure | Phase 6A, #59 and infrastructure ADR | Isolated Staging/Production, configuration source, networking, secrets and approved provider evidence. |
| I Observability | H3 and support/incident OS | Logs/metrics/traces/events, external uptime, actionable alerts, privacy-safe telemetry and incident drills. |
| J Backup / Recovery / DR | H5 / #97 | PITR plus independent encrypted copy, successful restore, reconciliation and measured RPO/RTO. |
| K Performance | H6 / #59 | Representative skewed data, load/burst/backlog/soak, correctness reconciliation and supported limits. |
| L Customer Onboarding | H2 and #62/#68 | Resumable state, explicit go-live approval, dry run, second-person execution and audit snapshot. |
| M Data Import | H2 and Product Contract | Canonical schema, validation/preview/approval/commit, idempotency, privacy lifecycle and capacity evidence. |
| N Integrations | Product Contract plus focused future issue | Explicit purpose, data/contract/security ownership, failure handling, portability and vendor review. |
| O Hardware | #132 phases 9A-9D | Physical metrology, RF/thermal/fit, terminal integration, 9C qualification and 9D production evidence. |
| P Privacy / Data Lifecycle | H4, #64 and #66 | Role classification, DPA/DPIA as applicable, retention/deletion/offboarding, support access and breach workflow. |
| Q Billing / Commercial Logic | H8, #71 and #89 | Auditable quantity/version, pricing authorization, margin/cash evidence and accounting/eInvoice routing. |
| R Support | H9 / #75 | BSS-controlled intake, owned cases, safe support grants, runbooks, escalation, fallback and tested operations. |
| S Documentation / Installation | H9 / #77/#79 | Versioned audience-specific docs, site survey, install acceptance, training and drift review. |
| T Pilot | H7 / #62/#83 and AUDIT C | Global and customer GO/NO-GO, controlled waves, stable evidence window, exit state and findings history. |
| U Commercial Readiness | H8, PRG and AUDIT D | Pilot findings, legal/privacy, support/RMA, COGS, capacity, claims and explicit Commercial Authorization. |
| V Vendor / Tool Management | H10 and Cost Register | Current option/cost review, maturity/reversibility, owner, trigger, exit and recheck evidence. |

H11 found 22/22 domains routed, zero orphan domains and zero orphan findings at architecture/governance level. That finding is not implementation or evidence closure; later gaps use the reopen rule below.

## H1-H11 hardening map

| Workstream | Accepted scope | Status and primary routing |
|---|---|---|
| H1 Release Engineering & Compatibility | Phase 6A Production-like Staging; Phase 6B immutable release, migration and compatibility path. | `HARDENED v1 / FUTURE`; #59, release OS, AUDIT B. |
| H2 Customer Onboarding & Data Import | Resumable onboarding, explicit go-live approval and staged/idempotent import. | `HARDENED v1 / FUTURE`; AUDIT A/#131 plus #62/#68. |
| H3 Observability & Incident Response | Privacy-minimized signals, terminal/business health, event/alert/incident separation and drills. | `HARDENED v1 / FUTURE`; H3 evidence at AUDIT B/C and #75. |
| H4 Security / Privacy / Data Lifecycle | Classification, customer/internal identity separation, support grants, secrets/device identity and privacy lifecycle. | `HARDENED v1 / FUTURE`; #64/#66/#95/#132, AUDIT B/C/D. |
| H5 Backup / Recovery / DR | PITR, independent copy, recovery ledger, terminal reconciliation, restore and continuity evidence. | `HARDENED v1 / FUTURE`; #97, AUDIT B/C/D. |
| H6 Performance & Capacity | Pilot/growth/saturation profiles, skew, burst/backlog/soak and evidence-triggered scaling. | `HARDENED v1 / FUTURE`; #59, AUDIT B/C/D. |
| H7 Pilot Architecture + Exit | Controlled waves, global and customer gates, hypercare/stability and exit decisions. | `HARDENED v1 / FUTURE`; #62/#83 and AUDIT C. |
| H8 Commercial Readiness | Supported sales envelope, pricing/economics, claims, commercial capacity and authorization. | `HARDENED v1 / FUTURE`; #71/#89, PRG and AUDIT D. |
| H9 Support / Documentation / Installation | Safe support, audience-specific docs, site/install acceptance, training, RMA and fallback. | `HARDENED v1 / FUTURE`; #75/#77/#79/#91 and AUDIT C/D. |
| H10 Tool / Vendor / Cost Audit | Dependency lifecycle, option/cost/TCO, repository visibility, vendor exit and regulatory dependencies. | `HARDENED v1 / FUTURE`; Cost Register and gate-time reviews. |
| H11 Final Complete Roadmap Gap Audit | A-V routing plus legal/lifecycle/IP/continuity/financial controls and scoped evidence invalidation. | `HARDENED v1 / FUTURE EVIDENCE`; no H12 by default. |

No H1-H11 mega-issue or speculative child issue is opened by default. Create a focused issue only when an implementation or evidence task becomes near-active, or a concrete `NEW TASK`, `CHANGE`, `BLOCKER` or `RISK` needs an owner.

## Execution horizons

The H1-H11 numbering records the completed governance-hardening order; it is not permission to implement eleven workstreams in parallel or to bypass the owning phases. Work is activated by the next blocking gate:

| Horizon | Ordered focus | Hardening consumed |
|---|---|---|
| Current | `#143 -> #145 -> #144 -> #146 -> targeted AUDIT A recheck -> #131` | AUDIT A is `BLOCKED`. The four BLACK/GATE defects must be resolved in this order and the targeted recheck must pass before #131 is authorized to Freeze. Remaining AUDIT A contract decisions stay as #131 inputs and create no child issues by default. |
| Before Production-like Staging can be DONE | Focused 6A/6B activation and `AUDIT B` | H1 release/compatibility plus H3-H6 and H10 infrastructure, security, recovery, observability, capacity and vendor evidence. |
| Before real-customer Pilot | `AUDIT C`, then customer-specific GO/NO-GO | H2-H7 and H9 evidence plus Hardware 9C, source/IP decision, privacy/legal and operational readiness. |
| After Pilot, before Commercial Rollout | Post-Pilot hardening -> `PRG GO` -> `AUDIT D PASS` | H8/H10/H11, resolved Pilot findings, Hardware 9D where applicable, production DR/security/capacity, support and commercial evidence. |

Parallel work remains permitted only where the Control Board says it is non-blocking and ownership does not create unsafe overlap. A later horizon must not be promoted ahead of an unmet earlier BLACK/GATE dependency.

## Formal blocking audits

| Audit | Timing | Minimum decision scope | Blocking rule |
|---|---|---|---|
| `AUDIT A` Product / Design Freeze | Before #131 and Design Foundation | v1 workflows, roles/permissions, edge cases, terminal interaction, onboarding/import, reporting, statutory/product scope, missing UX states and data requirements. | Product/Design Freeze is blocked unless critical items PASS or are explicitly resolved in the Product Contract. |
| `AUDIT B` Production-like Staging | Before 6A/6B DONE and serious Staging activation | Hosting/DB/pooling/RLS, environment and secrets separation, deploy/migrations/rollback, immutable artifacts, monitoring/logs, independent backup/restore, costs/lock-in/residency and drift. | Production-like Staging is not DONE while any critical item is missing or `NOT_PROVEN`. |
| `AUDIT C` Pilot Readiness | Before any real-customer Pilot and per-customer go-live | Product, security/privacy, performance, restore, observability, onboarding/import, H9 operations, source/IP decision, terminal 9C, release process and Pilot measurement. | Any BLACK/GATE failure blocks Pilot. Global PASS does not replace customer-specific GO/NO-GO. |
| `AUDIT D` Commercial Readiness | After Pilot and PRG GO, before Commercial Rollout | Pilot findings, production security/infra/DR, 9D/compliance, legal/privacy, pricing/billing/contracts, support/RMA/install/docs, COGS, vendor cost and capacity. | Commercial Rollout and first paying-customer authorization remain blocked until critical items PASS. |

Current AUDIT A verdict: `BLOCKED`. Under the accepted gap-audit/reopen rule, its four concrete BLACK/GATE findings are owned by #143 manager terminal-history department scope, #145 historical attendance calculation reproducibility, #144 delayed/offline `USER_ACKNOWLEDGED` attendance integrity and #146 deterministic locked-period/reporting correctness. #131 remains `NOT AUTHORIZED TO FREEZE` until all four blockers are resolved and the targeted AUDIT A recheck passes. Hardware #132 remains parallel and non-blocking to this software sequence.

Applicable regulatory uncertainty is `NOT_PROVEN`. If qualified review establishes a pre-Pilot conformity requirement for the finished terminal, #132/H7/AUDIT C is reopened. The Legal/Regulatory Live Register must track review owner, jurisdiction, trigger, status, evidence, expiry and recheck date; it does not convert planning notes into legal advice.

## Production Readiness Evidence Track

`FUNCTIONALLY COMPLETE != PRODUCTION READY`.

The Production Readiness Evidence Track (PRG) aggregates, without duplicating, evidence from architecture, security/privacy, data integrity, terminal/failure testing, load/concurrency, observability, backup/DR, deployment/rollback, incident operations and independent review.

The post-Pilot sequence is:

`AUDIT C -> Pilot -> Post-Pilot Production Hardening -> PRG GO/NO-GO -> AUDIT D -> Commercial Rollout`

Commercial Production requires both `PRG GO` and `AUDIT D PASS`. Any unresolved production-blocking critical or BLACK/GATE item means `PRG NO-GO`.

## Evidence-based DONE and invalidation

Evidence must match the claimed layer:

- security requires security-test and control-operation evidence;
- backup/DR requires successful restore and reconciliation evidence;
- performance requires measured representative load/capacity evidence;
- hardware reliability requires physical qualification evidence;
- release engineering requires identified artifact, staging/release/rollback evidence;
- Pilot requires entry, operation, stable-period and exit evidence.

Every material evidence record states scope, environment, version/SHA or artifact, configuration, data profile, operator, date, result and limitations. A material change invalidates only affected evidence when impact can be bounded; systemic or high-risk change can require broader revalidation. Rollback artifacts and the credentials/instructions needed to use them must survive for the approved rollback window.

## Forgotten requirement and reopen rule

`FORGOTTEN` never means outside the roadmap. For each later finding:

1. classify it as `NEW TASK`, `CHANGE`, `BLOCKER` or `RISK`;
2. assess product, user, API/data, security/privacy, operational, hardware, legal and cost impact as applicable;
3. route it to the owning phase/domain and gate;
4. reopen a previously DONE phase as `ACTIVE / REOPENED` when its evidence or contract is no longer sufficient;
5. update dependencies, decision/risk/cost records and evidence validity;
6. create a focused issue only when concrete action needs tracking;
7. close it only with evidence appropriate to the affected layer.

## Cross-cutting H11 controls

The roadmap also requires lifecycle/expiry tracking for certificates, domains, dependencies/runtimes, secrets/keys, vendor plans, legal reviews and evidence; IP/asset chain-of-title and company-account transition; provider hard-limit visibility; customer identity recovery separate from Support Grant and Break-glass; founder/key-person continuity and Joiner-Mover-Leaver controls; and financial readiness including receivables, customer concentration and explicit STOP-SELL/STOP-ONBOARD authority.

The current repository visibility state remains `KEEP PUBLIC TEMPORARILY`, not an open-source license decision. The earlier claim that SonarQube Cloud Free necessarily requires public source is superseded by the accepted H10 review. Any visibility change requires current GitHub/Sonar/security/deployment capability and cost verification, workflow smoke evidence and an explicit decision before AUDIT C.

## Change control

Update this roadmap only through an explicitly reviewed change. Preserve prior decisions by marking them superseded rather than deleting history. A roadmap version bump is warranted for a material gate, ownership, dependency, maturity, regulatory or execution-order change; ordinary evidence refresh belongs in the Readiness Matrix or owning register.

Before merge, reconcile this roadmap with the Control Board, Decision Log, Risk Register, Product Feature Registry, Readiness Matrix and affected detailed source. If they conflict materially, stop and resolve the conflict rather than choosing a convenient interpretation.
