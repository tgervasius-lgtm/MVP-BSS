# BSS Operations Foundation v1

Status: **ACCEPTED / HARDENED — ARCHITECTURE ONLY**  
Date: 2026-10-03  
Revision: owner-accepted consolidated architecture (PR #229; useful additions from PR #231)
Tracking issue: #225  
Product authority: `BSS_V1_PRODUCT_CONTRACT.md` v1.0 — **ACCEPTED / FROZEN**  
Design authority: `BSS_DESIGN_FOUNDATION_V1.md` v1.0 — **ACCEPTED / HARDENED**  
Roadmap authority: `docs/bss-os/MASTER_ROADMAP.md` v4.9

## 1. Purpose

OM-01 defines the minimum operational architecture BSS needs between the accepted Design Foundation and Production-like Staging.

It does **not**:
- add customer-facing v1 scope;
- prove Staging, Pilot or Production readiness;
- activate a paid vendor;
- create a super-admin backdoor;
- require Kubernetes, Redis, Kafka, microservices or a separate worker without measured need;
- replace #59, #62, #75, #97 or #132.

Its job is to connect existing owners and evidence gates so implementation work is opened only where concrete evidence is required.

## 2. Strict status boundary

`ACCEPTED / HARDENED ARCHITECTURE`

!= IMPLEMENTED  
!= EVIDENCE PROVEN  
!= PRODUCTION-LIKE STAGING PASS  
!= AUDIT B PASS  
!= PILOT PASS  
!= PRODUCTION / COMMERCIAL PASS

A green repository, preview deploy or merged document is not environment evidence.

## 3. Current vs target environment map

| Environment | CURRENT | TARGET / gate |
|---|---|---|
| Local development | Node/PostgreSQL development and CI evidence exist; local setup is not shared environment evidence | Reproducible developer baseline with no production secrets and test-only data |
| Preview | Cloudflare-hosted synthetic/demo frontend exists | Sales/UX sandbox only; no production auth, personal data or Staging claims |
| Production-like Staging | **NOT IMPLEMENTED / NOT EVIDENCE PROVEN** | Separate runtime, PostgreSQL, secrets and configuration; release/migration/rollback/observability/restore evidence; AUDIT B |
| Pilot production | **NOT AUTHORIZED / NOT PILOT PASS** | Only after Staging/AUDIT B, contract gaps, deployed security, Hardware 9C, AUDIT C and customer GO/NO-GO |
| Commercial production | **NOT COMMERCIAL PASS** | Post-Pilot hardening, PRG GO and AUDIT D PASS |

Preview must never be promoted by terminology into Staging.

## 4. Operations Foundation capability map

### OM-02 equivalent — Runtime observability baseline

Primary owners:
- #59 infrastructure baseline;
- #75 Support & Incident OS;
- `ADR-001-INFRASTRUCTURE-BASELINE.md`;
- `SUPPORT_INCIDENT_OPERATING_SYSTEM.md`.

Minimum before Production-like Staging can be called DONE:
- structured backend logs with request/correlation identity;
- privacy-safe organization/tenant context where needed for diagnosis;
- health and external uptime evidence;
- actionable 5xx/runtime/database/migration/backup/terminal-sync alerts;
- named alert recipients and escalation owner;
- a controlled staging fault must produce the expected signal and reach the intended recipient;
- verify telemetry redaction and record recovery/closure of the fault;
- staging vs production separation in telemetry;
- alert-delivery test and incident-tabletop evidence.

OpenTelemetry remains the preferred portable architecture direction. A managed observability backend is a later vendor decision.

### OM-03 equivalent — Backup / restore & DR proof

Primary owners:
- #97 Backup/DR/Business Continuity OS;
- #59 infrastructure baseline;
- `BACKUP_DISASTER_RECOVERY_BUSINESS_CONTINUITY_OS.md`.

Minimum before Production-like Staging can be called DONE:
- provider recovery capability recorded;
- independent encrypted off-platform copy path;
- restore authorization and operator;
- isolated restore;
- schema/migration/application validation;
- RBAC/RLS/tenant-isolation validation after restore;
- measured restore duration and reconciliation;
- evidence identifier for backup, target environment, release and operator.

A successful backup job is not restore evidence.

Staging datasets must be synthetic or irreversibly anonymized; no real customer/employee production data may enter staging. Staging backend identity, database, secrets and configuration must be separate and explicitly labeled.

### OM-04 equivalent — Tenant-safe operational control boundary

No large new Control Plane is authorized.

The first BSS operational-control surface is the **smallest safe combination** of:
- provider-native environment controls;
- protected GitHub release evidence;
- existing BSS audit/security controls;
- explicit runbooks for allowed operations;
- narrowly defined BSS admin actions only when a real product/operations requirement cannot be met safely by existing controls.

Hard boundaries:
- no hidden cross-tenant bypass;
- no arbitrary SQL from ordinary support UI;
- no arbitrary remote shell from ordinary support UI;
- no universal support credential or service PIN;
- privileged operations require named actor, reason, scope and audit;
- secrets and device credentials remain outside ordinary support views;
- any future break-glass path requires separate approval, a time limit, named identity and audit;
- production database manual edits require an approved emergency procedure.

A standalone Control Plane implementation issue is **NOT ACTIVATED** by this document. Open one only if Staging evidence proves an actual missing operational capability.

### OM-05 equivalent — Tenant simulator + load/correctness harness

Primary owners:
- #59 performance/staging work;
- Product Contract acceptance limits;
- Tool/Service Cost Register (`k6 OSS` preferred evaluation direction).

Minimum target:
- representative tenant sizes and skew;
- concurrent attendance/API bursts;
- export/report workload;
- terminal retry/backlog recovery;
- database connection/query behavior;
- correctness reconciliation after load;
- explicit supported envelope and failure threshold;
- repeatable synthetic fixtures and recorded API/browser workload, latency, error and database-resource measurements;
- define the soak window and stop conditions before execution;
- no correctness loss under performance pressure.

Performance evidence may never trade off:
- zero lost USER_ACKNOWLEDGED attendance;
- zero incorrect attendance duplicates;
- tenant isolation;
- RBAC/RLS;
- audit integrity.

A focused harness implementation issue should be opened only when Production-like Staging activation is near enough that measured evidence is required.

## 5. Existing issue ownership — no duplication

| Capability | Existing owner | OM-01 treatment |
|---|---|---|
| Staging/runtime/PostgreSQL/network/secrets | #59 | Keep as infrastructure owner; refresh vendor/current facts at activation |
| Pilot entry/evidence package | #62 | Consume Staging, security, restore, 9C and dry-run evidence; do not implement here |
| Support/incident/fallback | #75 | Own incident process, alert response and customer fallback |
| Backup/DR/business continuity | #97 | Own backup architecture, restore drills and continuity evidence |
| Hardware/device reliability | #132 | Remains parallel; Hardware 9C blocks Pilot |
| Privacy/data governance | #64 / accepted privacy docs | Apply to telemetry, logs, backup and incident evidence |
| Release/change | #93 / release OS | Own release record, artifact identity, migration/rollback and communication |
| Identity/access/secrets | #95 / identity OS | Own secrets custody, rotation, admin access and recovery boundaries |
| Development execution/verification | #124 | Reuse existing CI/developer controls; do not substitute them for staging evidence |
| Global roadmap/governance | #133 | Own cross-program sequencing, status and change control |

OM-01 does not copy these backlogs.

## 6. Minimum evidence record

Every Production-like Staging evidence item must identify:

| Field | Required meaning |
|---|---|
| Capability | What was tested or operated |
| Environment | Exact staging/test environment, never just “cloud” |
| Release identity | Commit SHA plus immutable artifact/build identity where applicable |
| Configuration identity | Versioned config/ADR/revision relevant to the result |
| Data profile | Synthetic/anonymized dataset and scale |
| Operator | Named responsible operator |
| Started / finished | Timestamp and timezone |
| Result | PASS / FAIL / UNAVAILABLE / SKIPPED with reason |
| Evidence location | Repository/private controlled reference |
| Rollback/recovery boundary | What would be reverted or restored |
| Reviewer | Person/role that accepts the evidence |
| Expiry/recheck trigger | When evidence becomes stale |

Missing evidence = **NOT_PROVEN**.

## 7. Release-to-environment chain

The required evidence chain is:

`protected main -> reviewed release candidate -> immutable artifact -> Production-like Staging deploy -> migration evidence -> smoke/negative tests -> observability/alert test -> restore/recovery evidence -> rollback/release decision -> AUDIT B`

Rules:
- preview deployment is not part of this promotion chain;
- staging uses separate database/secrets from production;
- artifact identity must survive promotion without an unreviewed rebuild;
- migrations have explicit forward/rollback or forward-repair boundary;
- rollback must not create attendance loss or duplicate acceptance;
- a release record names operator, time, SHA/artifact, migrations and rollback target.

## 8. Security and privacy boundary

Non-negotiable:
- server-enforced tenant isolation;
- RBAC/RLS/data-scope enforcement;
- audit integrity;
- least-privilege runtime/database roles;
- separate secrets per environment;
- no secrets in repository, logs, screenshots, tickets or public docs;
- production telemetry minimizes employee-identifying data;
- backup copies retain the same privacy/security obligations as live data;
- privileged operational action is attributable and audited;
- device identity remains per-device; no fleet-wide shared production secret.

Operational convenience cannot convert a BLACK/GATE security or data-integrity requirement into accepted risk.

## 9. Vendor and cost decision

No new recurring paid service is authorized by OM-01.

Current governance direction:
- development: local/free/open-source first;
- frontend/Preview: existing Cloudflare path while sufficient;
- backend/PostgreSQL: Render Frankfurt remains **PREFERRED CANDIDATE**, not Vendor Lock;
- telemetry architecture: OpenTelemetry preferred;
- managed observability: Better Stack / Sentry / Grafana options remain candidates per Cost Register;
- independent recovery copy: Backblaze B2 EU / Cloudflare R2 alternative remain candidates;
- load testing: k6 OSS preferred evaluation direction.

Before any paid activation, reverify current price, limits, EU residency, DPA/SLA, security, scaling, lock-in and exit path. Record the paid trigger and owner decision.

## 10. Activation decisions after OM-01

### Activate now / near-active

1. **Contract-defined product gaps** continue in focused issues from the accepted Design Foundation.
2. **OM-01 architecture** — this issue/document.
3. **#59 Staging baseline review** may proceed as architecture/current-fact refresh, but provisioning or recurring spend still needs the applicable decision.
4. **#97 restore evidence planning** may proceed using synthetic data; real Staging restore evidence waits for a real Staging environment.

### Activate when Production-like Staging implementation begins

- runtime observability implementation/evidence;
- independent backup/restore implementation/evidence;
- tenant/load/correctness harness;
- minimal operational-control gaps that cannot be satisfied by existing provider/release/audit controls.

### Do not activate yet

- full Control Plane portal;
- SLO -> contractual SLA;
- product analytics/FinOps implementation;
- broad feature flags/canary platform;
- time-travel forensic capability;
- enterprise stack expansion without measured trigger.

## 11. AUDIT B entry checklist

AUDIT B is not ready until at least:

- contract-defined critical implementation gaps required for the release candidate are closed/evidenced;
- Production-like Staging exists with separate DB/secrets;
- release/artifact identity is reproducible;
- migration and rollback/forward-repair are rehearsed;
- deployed tenant/RBAC/RLS/auth negative tests pass;
- logs/health/alerts are operating and alert delivery is proven;
- provider recovery and independent restore are proven;
- representative load/correctness evidence exists;
- vendor/cost/residency/exit facts are current;
- no critical BLACK/GATE item is OPEN or NOT_PROVEN.

## 12. Next actions

After owner acceptance on 2026-10-03:

1. OM-01 architecture is ACCEPTED / HARDENED; merge PR #229 only after all applicable checks pass.
2. Close #225 only after that merge. This closes architecture scope, not operations implementation or readiness.
3. Continue focused frozen-contract implementation gaps independently where already authorized.
4. Refresh #59 against current vendor facts immediately before any Staging provisioning or spend.
5. Open separate implementation issues for OM-02/03/04/05 only when concrete Staging evidence work becomes near-active.

## 13. Consolidation record and OM-01 exit criteria

On 2026-10-03 the owner authorized consolidation of competing OM-01 proposals into PR #229, without authorizing its merge or architecture acceptance. PR #231 is superseded by this consolidated proposal; its source branch and history remain available.

Retained from #231: the #124/#133 ownership links, explicit staging environment/data boundaries, controlled fault and alert-delivery evidence, time-limited future break-glass boundary, and repeatable load/soak measurements and stop conditions. Its Control Board baseline correction is carried forward using the later merged PR #233 baseline.

The stricter #229 requirements remain: independent encrypted off-platform recovery and isolated restore before Production-like Staging passes, explicit reviewer/recheck metadata, immutable release/artifact linkage, and activation only when concrete staging work is near-active. The later-before-Pilot wording in #231 does not defer these staging gates. Vendor examples remain candidates, not new selections or current-price claims.

OM-01 closes only after explicit owner/BSS OS architecture acceptance and merge of this focused proposal, with current/target separation, existing ownership, OM-02..05 scope/evidence, reversible cost posture and all security boundaries retained. Green checks or merge alone do not automatically accept the architecture or prove Staging/Pilot/Production readiness. The owner acceptance recorded below supersedes the draft status; #225 remains open until the authorized merge completes. OM-12 time-travel forensics remains HOLD / DO NOT START.

## 14. Owner acceptance — 2026-10-03

At 22:16 CEST the BSS owner approved the next stated decision: acceptance of the consolidated OM-01 architecture and merge of PR #229. The approved basis was consolidated head `ffb0dbb5c5e447ab650a9831bfb9fe69547eaa33`, with 15/15 reported GitHub checks successful and no unresolved review threads. This status-only record implements that decision; its new commit must pass the applicable checks before merge.

Accepted: the architecture, existing ownership map, minimum OM-02..05 requirements/evidence, pre-Staging backup/restore gate, and activation discipline in this document. No Product Contract change, runtime implementation, infrastructure provisioning, paid service, live Pilot or Production release is authorized. Staging, Hardware 9C, Pilot and Commercial Production remain NOT PASS. Future implementation follows the existing scoped issue/review/release controls; this acceptance does not activate OM-06+ or OM-12.
