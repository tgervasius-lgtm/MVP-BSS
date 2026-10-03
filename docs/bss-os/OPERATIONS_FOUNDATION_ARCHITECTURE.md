# BSS Operations Foundation Architecture v0.1

Status: **PROPOSED / OM-01 ARCHITECTURE REVIEW**

Owner: BSS founders  
Related: #59, #62, #75, #93, #95, #97, #124, #132, #133, #225

## 1. Purpose

OM-01 defines the minimum operational architecture BSS needs between the current repository/Preview state and **Production-like Staging**.

It does not add a customer-facing feature, change the frozen Product Contract, select a paid vendor, provision production, or prove Pilot/Production readiness.

The goal is to make later implementation and evidence work converge on one small operational foundation instead of creating parallel DevOps systems.

## 2. Status boundary

- Design Foundation v1.0: **ACCEPTED / HARDENED**.
- Frozen Product Contract v1.0 remains authoritative.
- Current repository checks, Preview deployments and merged UI/API work are software evidence only.
- Production-like Staging: **NOT PASS**.
- Pilot: **NOT PASS**.
- Commercial Production: **NOT PASS**.
- OM-01 itself is architecture/governance, not implementation proof.

## 3. CURRENT STATE vs TARGET STATE

| Area | CURRENT STATE | TARGET before Production-like Staging |
|---|---|---|
| Frontend/Preview | Cloudflare Pages Preview/main deployments with synthetic/demo use | Keep Preview isolated from real customer/employee data |
| Backend/API | Backend and frozen OpenAPI exist in protected main; repository CI exercises PostgreSQL/browser paths | One separately identified staging runtime with deployed SHA, configuration identity and health evidence |
| Database | PostgreSQL behavior is tested in CI; no Production-like Staging DB evidence is claimed | Separate staging PostgreSQL, migration-state evidence, tenant/RLS verification and restore target |
| Release identity | Git SHA, PR checks and deployment checks exist | Every staging candidate links SHA/artifact, environment, migration state, operator/automation and rollback reference |
| Observability | Repository/CI logs and provider deployment metadata exist | Runtime health, structured logs, error signal and defined alert delivery for staging |
| Backup/recovery | Governance/DR framework exists; repository checks do not prove staging DB recovery | Staging backup method + isolated restore drill + integrity/RLS/tenant validation evidence |
| Operations access | App RBAC/RLS and governance exist; no large support control plane | Minimal audited admin/support boundary with no arbitrary SQL/shell backdoor |
| Load/reliability | Unit/integration/browser checks exist | Representative staging load/soak harness with explicit pass criteria |
| Terminal | Architecture/reliability requirements exist; 9C remains evidence-gated | Staging integration path ready for terminal qualification; no Pilot pass until 9C critical scenarios pass |

## 4. Minimal operational capability set

Only the following capabilities are activated before Production-like Staging. Anything larger requires separate evidence.

### OM-02 — Runtime observability baseline

Minimum:
- public/application health signal for staging;
- structured backend logs with request/correlation identity and safe organization/tenant reference;
- no passwords, tokens, raw RFID identifiers or unnecessary personal data in logs;
- frontend/backend error signal;
- alert path for repeated 5xx, health failure, failed migration, backup failure and material terminal-sync backlog;
- clear environment label so Preview, staging and future production cannot be confused;
- named owner/recipient before an alert is called operational.

Evidence:
- known staging fault creates the expected signal;
- alert reaches the intended destination;
- sensitive-data redaction is verified;
- recovery/closure is recorded.

### OM-03 — Backup/restore and DR proof

Minimum:
- provider-native recovery where selected by #59;
- independent encrypted logical backup outside the primary database service before live Pilot;
- restore into an isolated target;
- schema/migration compatibility check;
- application smoke check;
- RBAC/RLS and tenant-isolation verification after restore;
- recorded source backup, target, operator, start/end, result and disposition.

A successful backup job alone is not PASS.

### OM-04 — Tenant-safe operational/admin boundary

Minimum:
- no generic multi-tenant super-admin data browser;
- no arbitrary SQL or remote shell in ordinary support UI;
- support/operator actions use named identity, least privilege and audit;
- app authorization remains server-authoritative;
- production/staging secrets stay in approved private stores;
- break-glass, if later needed, is separate, time-limited and audited;
- terminal credential actions remain Admin-only and governed by the frozen contract.

### OM-05 — Representative load and reliability harness

Minimum:
- repeatable synthetic tenant/worker/attendance dataset generator or fixture path;
- representative API/browser workload for the planned pilot envelope;
- attendance duplicate/loss invariants checked;
- latency/error/DB-resource measurements recorded;
- soak window and stop conditions defined before running;
- no Redis, Kafka, read replica or horizontal scale is introduced merely to make the test architecture look enterprise-grade.

Initial purpose is to discover the actual scaling trigger, not to pre-build one.

### Release/evidence linkage — required across OM-02..05

Each operational evidence record identifies at least:
- repository SHA/release candidate;
- environment;
- relevant configuration or migration version;
- operator or automation identity;
- date/time;
- result;
- evidence location;
- rollback/recovery reference;
- unresolved blockers.

## 5. Ownership map — do not duplicate existing issues

| Capability | Primary existing owner | OM-01 relationship |
|---|---|---|
| Hosting, staging/production separation, provider/network baseline | #59 | #59 remains infrastructure decision/implementation owner |
| Pilot end-to-end readiness | #62 | consumes staging/operations evidence; does not own implementation |
| Support/incident workflow | #75 | consumes observability/incident evidence and defines operating response |
| Backup/DR/continuity | #97 | owns detailed recovery OS; OM-03 activates the minimum staging proof |
| Release/change/rollback governance | #93 | owns release process; OM foundation supplies environment evidence |
| Identity/access/secrets | #95 | owns private access/secrets governance; OM-04 consumes it |
| Development execution/verification | #124 | owns developer execution foundation; staging evidence must not duplicate CI logic |
| Terminal architecture/reliability | #132 | owns 9C/9D terminal qualification and fleet/productization |
| Global roadmap/governance | #133 | owns cross-program status and change control |
| OM-01 architecture | #225 | defines the minimum integration layer and activation order |

OM-01 must not create child issues for work already owned above unless a concrete missing implementation/evidence task cannot be represented by the existing owner.

## 6. Environment model

### Preview

Purpose: sales/demo/UX validation.  
Data: synthetic only.  
Authority: not production evidence.  
Operational expectations: lightweight; no claim of customer availability.

### Development / CI

Purpose: code validation, automated PostgreSQL/browser/security checks.  
Data: synthetic/test fixtures.  
Authority: repository quality/security evidence only.  
Operational expectations: disposable and reproducible.

### Production-like Staging

Purpose: rehearse the actual release, migration, runtime, monitoring, recovery and representative workload path before Pilot.

Must be separate from Preview and future production:
- separate backend identity;
- separate database;
- separate secrets;
- clear environment label;
- known release SHA and migration state;
- synthetic or irreversibly anonymized data only;
- no real customer/employee production data.

### Future Pilot Production

Not activated by OM-01. It requires all applicable Product, Security, Privacy, Staging/AUDIT B, Hardware 9C/AUDIT C and Pilot-readiness gates.

## 7. Security and data-integrity guardrails

The following are BLACK/GATE requirements:

- tenant isolation and RLS/RBAC may not be bypassed for operational convenience;
- support tooling must not become an unlogged cross-tenant backdoor;
- secrets/device credentials are never committed or copied into public evidence;
- raw attendance/terminal evidence remains immutable;
- zero lost USER_ACKNOWLEDGED attendance remains an absolute target;
- zero incorrect attendance duplicates remains an absolute target;
- restore validation must include tenant isolation, not only “application starts”;
- unresolved reconciliation evidence must not be promoted into confirmed attendance truth;
- a red critical security/data-integrity gate cannot become PASS WITH RISK because of schedule pressure.

## 8. Tool/vendor posture before company formation

Default: **FREE / local / open-source first** where it meets the requirement.

| Need | Free/local baseline | Paid trigger |
|---|---|---|
| CI/security evidence | Existing GitHub/CodeQL/Gitleaks/Trivy/Sonar setup | Only if retention, concurrency or required enterprise control is blocked |
| Runtime logs | Provider-native logs + structured application logging | Paid log platform when retention/search/alert needs exceed baseline |
| Error tracking | Free tier or provider-native error signal | Event volume, retention, privacy/data-residency or support needs justify it |
| Metrics/uptime | Provider/free endpoint checks or small self-hosted/open-source path | Operational burden or required alert reliability justifies managed service |
| Backup | Provider recovery + encrypted logical export to approved independent storage | Paid backup/storage when retention, automation or recovery objectives require it |
| Load testing | Local/CI open-source harness | External paid load platform only if reproducibility or scale cannot be achieved safely otherwise |

No Kubernetes, Redis, Kafka, read replica, separate worker or multi-region architecture is activated by OM-01. Their trigger is measured workload or a concrete frozen requirement.

## 9. Activation order

### Now / near-active

1. **OM-01 architecture** — this document / #225.
2. Continue frozen Product Contract implementation gaps in roadmap order.
3. Prepare #59 staging baseline for a current provider/cost recheck before any purchase.
4. Activate the minimum evidence design for **OM-02, OM-03, OM-04 and OM-05**.

### Before Production-like Staging can pass

Evidence required:
- staging environment identity and reproducible deployment;
- migration rehearsal;
- runtime observability signal and tested alert delivery;
- staging backup and successful isolated restore;
- post-restore RBAC/RLS/tenant verification;
- representative load/soak result;
- release/rollback identity record;
- no unresolved critical security/privacy/data-integrity blocker.

### Not activated by this document

- OM-06+ broad control-plane expansion;
- HA/multi-region;
- Kubernetes;
- distributed cache/queue;
- large internal super-admin;
- commercial production operations;
- OM-12 time-travel forensics.

## 10. Production-like Staging evidence record

For every staging candidate, record:

| Field | Required |
|---|---|
| Candidate ID | yes |
| Git SHA / release artifact | yes |
| Environment | yes |
| Backend/runtime identity | yes |
| DB/migration state | yes |
| Configuration identity | yes, secret values excluded |
| Test dataset classification | yes |
| CI/security gate references | yes |
| Observability test | yes |
| Backup source + restore drill reference | yes |
| Tenant/RLS verification | yes |
| Load/soak reference | yes |
| Rollback/forward-repair reference | yes |
| Operator/automation identity | yes |
| Open blockers | yes |
| Final gate result | yes |

A completed row is evidence metadata, not an automatic PASS. The applicable gate owner still decides status from the underlying evidence.

## 11. Exit criteria for OM-01

OM-01 may close when:
1. this architecture is reviewed and merged;
2. current vs target boundaries are explicit;
3. #59/#62/#75/#93/#95/#97/#124/#132 ownership is mapped without duplication;
4. OM-02..05 minimum scope and evidence are defined;
5. FREE/local/open-source-first posture and paid triggers are explicit;
6. no Product Contract, Pilot, Staging or Production status is falsely promoted.

After merge, status becomes **ACCEPTED/HARDENED architecture** only if explicitly accepted by BSS OS/owner review. Implementation and evidence statuses remain separate.
