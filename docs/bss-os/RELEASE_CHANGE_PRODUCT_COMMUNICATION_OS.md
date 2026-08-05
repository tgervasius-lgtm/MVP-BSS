# BSS Release, Change & Product Communication Operating System

Status: `PROPOSED v0.1 / FOUNDER AND TECHNICAL APPROVAL REQUIRED`

Owner: BSS founders

Related issues: #93, #55, #58, #59, #60, #62, #64, #66 and #75

## 1. Purpose

This document defines how BSS classifies, approves, prepares, tests, releases, communicates, observes and, when necessary, rolls back changes across:

- documentation;
- frontend applications;
- backend services;
- API contracts;
- database schemas and data migrations;
- infrastructure and configuration;
- security and privacy controls;
- terminal software, firmware and device configuration;
- customer-facing product behavior;
- support and training material.

The objective is to prevent:

- merged code being presented as a released product;
- Preview behavior being represented as production evidence;
- undocumented changes reaching a pilot or customer;
- a database migration being applied without backup and rollback evidence;
- customer communication promising a capability that is not `RELEASED`;
- a rollout continuing while critical data, security or tenant-isolation evidence is failing;
- an emergency fix bypassing all review and leaving no evidence;
- support, training and administration instructions becoming inconsistent with the deployed version;
- a release being impossible to reproduce or identify later;
- rollback being discussed only after a failure occurs.

This document is operational governance. It is not a guarantee of production readiness, a contractual service commitment or a substitute for technical, legal, privacy or security review.

## 2. Core rules

1. `MERGED`, `DEPLOYED`, `VERIFIED` and `RELEASED` are separate states.
2. A successful pull request does not prove that any environment contains the change.
3. A deployment does not become a release until the defined validation and approval evidence exists.
4. Preview and demo environments must never be represented as production.
5. Documentation that describes a capability is not implementation evidence.
6. Customer-facing statements must match the Product Feature Registry status.
7. No release proceeds with an unresolved critical security, privacy, tenant-isolation, data-integrity or rollback blocker.
8. Every release identifies the exact commit, tag or immutable artifact used.
9. Every release identifies the target environment and configuration version.
10. Database changes require explicit forward and rollback or recovery planning.
11. Rollback criteria are defined before rollout begins.
12. A release has a named decision owner, technical owner and communication owner.
13. Emergency changes use the smallest safe scope and still require retrospective review.
14. Real production secrets, credentials, customer identities and confidential incident details remain outside the public repository.
15. A customer notice must not describe payroll calculation, GPS tracking, biometrics, mobile applications, door access or another out-of-scope capability as available.
16. A release note must distinguish new capability, changed behavior, fixed defect, known limitation and operational-only change.
17. Green automated checks are necessary evidence but are not the only release evidence.
18. A release may be stopped or rolled back by an authorized owner when a hard-stop condition is met.
19. A rollback is not a failure of governance when it is the safest controlled response.
20. Release evidence must be sufficient for another qualified person to understand what changed and how to recover.

## 3. Status language

| Status | Meaning |
|---|---|
| `PROPOSED` | A change or release idea exists but is not approved. |
| `SCOPED` | Scope, exclusions, owner and impact are documented. |
| `APPROVED FOR IMPLEMENTATION` | Work may begin under the approved scope. |
| `IN DEVELOPMENT` | Implementation is active. |
| `IN REVIEW` | Pull request or equivalent review is open. |
| `MERGED` | Code or documentation is in the target repository branch. |
| `RELEASE CANDIDATE` | A specific immutable candidate has been assembled for release validation. |
| `DEPLOYMENT APPROVED` | Go/no-go decision allows deployment to the named environment. |
| `DEPLOYING` | Deployment is actively running. |
| `DEPLOYED` | Candidate is present in the named environment; validation may remain open. |
| `VALIDATING` | Functional and operational checks are running. |
| `VERIFIED` | Defined checks passed in the named environment. |
| `RELEASED` | Approved, verified version is declared available for its stated audience. |
| `PARTIAL RELEASE` | Released only to a named cohort, site or limited audience. |
| `ROLLOUT PAUSED` | Expansion stopped while evidence is reviewed. |
| `ROLLBACK APPROVED` | Authorized decision to revert or recover. |
| `ROLLED BACK` | Previous stable state or approved recovery state has been restored. |
| `WITHDRAWN` | Candidate or release is no longer approved for use. |
| `DEPRECATED` | Still supported temporarily but planned for removal or replacement. |
| `RETIRED` | No longer supported or available under the approved plan. |
| `BLOCKED` | A required dependency, decision or evidence item is missing. |

A change may be `MERGED` for weeks without being `RELEASED`.

## 4. Release objects and identifiers

Every controlled release uses a release record.

### 4.1 Release record minimum fields

| Field | Required content |
|---|---|
| Release ID | Unique internal identifier |
| Product/component | Frontend, backend, API, database, infrastructure, terminal, docs or combined |
| Release type | Normal, pilot, hotfix, emergency, rollback, documentation-only |
| Target audience | Internal, Preview, staging, pilot cohort, production customer cohort |
| Candidate commit | Exact SHA |
| Tag or artifact ID | Immutable identifier where applicable |
| Build identifier | Workflow run, artifact checksum or equivalent |
| Configuration version | Named configuration/environment baseline |
| Database migration set | Exact migration identifiers or `NONE` |
| Hardware/firmware scope | Exact device class/version or `NONE` |
| Product Feature Registry changes | Linked entries or `NONE` |
| Change owner | Named responsible person |
| Technical release owner | Named responsible person |
| Validation owner | Named responsible person |
| Communication owner | Named responsible person |
| Planned release window | Proposed date/time and timezone |
| Observation window | Proposed monitoring period |
| Rollback target | Last known stable release or recovery plan |
| Status | Current controlled state |
| Evidence location | Private or repository-controlled reference |

### 4.2 Release scope statement

The release scope states:

- what is included;
- what is explicitly excluded;
- which users or customers are affected;
- whether data schema or configuration changes;
- whether terminal behavior changes;
- whether training or support material changes;
- which known limitations remain;
- whether the release is reversible;
- whether downtime or degraded operation is expected;
- which claims are permitted after verification.

## 5. Change classes

### `CHG-0 — Documentation only`

Examples:

- internal operating document;
- typo correction;
- non-authoritative planning template;
- explanatory README update.

Minimum controls:

- review for accuracy;
- verify no product claim is created;
- repository checks;
- no automatic customer communication.

A documentation-only merge is not a product release.

### `CHG-1 — Low-risk product change`

Examples:

- visual adjustment without permission or data impact;
- text clarification in an already released screen;
- non-sensitive analytics or logging improvement;
- isolated defect fix with proven test coverage.

Minimum controls:

- change impact assessment;
- automated checks;
- targeted functional validation;
- rollback path;
- release note classification.

### `CHG-2 — Standard functional change`

Examples:

- new approved workflow;
- changed form validation;
- report/export behavior change;
- role-specific interface change;
- terminal interaction change without safety impact.

Additional controls:

- Product Feature Registry update;
- role/RBAC validation;
- customer/admin/support impact review;
- training or manual impact review;
- staged environment validation;
- progressive rollout where available.

### `CHG-3 — High-risk change`

Examples:

- authentication or session behavior;
- RBAC or tenant-isolation logic;
- database migration;
- API contract change;
- attendance calculation or correction logic;
- audit-log behavior;
- backup, restore or deployment architecture;
- privacy or retention behavior;
- terminal firmware/configuration affecting stored or transmitted data.

Additional controls:

- two-person technical review where available;
- explicit security/privacy impact assessment;
- migration rehearsal;
- backup and restore evidence;
- rollback or recovery test;
- limited initial cohort;
- enhanced observation window;
- explicit founder go/no-go.

### `CHG-4 — Critical/emergency change`

Examples:

- active security exposure;
- platform-wide outage;
- critical data-integrity failure;
- tenant-isolation concern;
- urgent credential or dependency remediation;
- release rollback.

Controls:

- named incident/change commander;
- smallest safe change;
- preserved logs and evidence;
- independent validation where feasible;
- explicit stop conditions;
- customer/privacy/legal escalation where applicable;
- mandatory retrospective review;
- follow-up normal PR and documentation when emergency process was abbreviated.

Emergency does not mean undocumented.

## 6. Change-impact assessment

Every `CHG-1` to `CHG-4` change completes the following assessment.

### 6.1 Product impact

- feature or workflow affected;
- user role affected;
- current Product Feature Registry status;
- proposed status after release;
- scope-freeze impact;
- customer promise impact;
- known limitation impact;
- accessibility impact;
- localization/text impact.

### 6.2 Data impact

- personal-data categories affected;
- employee attendance evidence affected;
- new fields or tables;
- migration or backfill;
- retention/deletion impact;
- export impact;
- audit-trail impact;
- data correction/reconciliation requirement;
- backup/restore impact.

### 6.3 Security and tenancy impact

- authentication impact;
- session impact;
- permission/RBAC impact;
- tenant-isolation impact;
- secret or credential impact;
- dependency impact;
- logging/monitoring impact;
- abuse/edge-case impact;
- required CodeQL/dependency/security evidence.

### 6.4 API and integration impact

- OpenAPI change;
- compatibility type: backward compatible, conditionally compatible or breaking;
- consumer impact;
- terminal sync impact;
- export/report consumer impact;
- versioning requirement;
- deprecation requirement.

### 6.5 Infrastructure impact

- environment affected;
- Cloudflare/Render/database impact;
- scaling impact;
- cost impact;
- environment-variable change;
- secret rotation;
- backup/restore impact;
- observability/alert impact;
- maintenance window requirement.

### 6.6 Hardware and field impact

- terminal model/configuration affected;
- firmware/software version affected;
- onsite action required;
- power/network/RFID impact;
- spare/replacement impact;
- installation/training impact;
- asset register/configuration update required;
- safe fallback available.

### 6.7 Operational impact

- support runbook change;
- incident classification change;
- customer admin manual change;
- demo/training change;
- pilot metric change;
- sales/offer wording change;
- legal/privacy documentation change;
- communication required before or after release.

### 6.8 Rollback impact

- reversible by application rollback;
- reversible only by database restore or forward fix;
- data created under new version compatible with old version;
- terminal/configuration downgrade possible;
- manual reconciliation needed;
- maximum acceptable rollback time;
- owner and decision path.

## 7. Versioning and release naming

BSS may use semantic versioning or another approved scheme after the release model is finalized. Until then:

- no first production version number is invented;
- repository tags are not treated as customer releases without a release record;
- Preview, staging and pilot builds include environment identity;
- build identifiers include an immutable commit or artifact reference;
- documentation versions use their own document status and do not imply software release status.

### 7.1 Candidate naming template

`BSS-<component>-<environment>-<date>-<short-sha>-RC<n>`

This template is proposed, not yet an approved customer versioning policy.

### 7.2 Release naming rules

A release name must not:

- imply production when it is Preview;
- imply general availability when limited to a pilot cohort;
- imply legal or GDPR certification;
- imply payroll functionality;
- imply completed hardware validation when hardware remains `PARTIAL`.

## 8. Release roles

| Role | Responsibility |
|---|---|
| Change owner | Defines scope, exclusions and business impact |
| Technical owner | Owns implementation and technical release plan |
| Release coordinator | Maintains checklist, evidence and sequence |
| Validation owner | Confirms required tests and environment checks |
| Database owner | Owns migration, backup and recovery evidence |
| Infrastructure owner | Owns deployment environment and observability |
| Security/privacy reviewer | Reviews high-risk security/privacy impact |
| Product owner | Confirms scope and allowed product claims |
| Support owner | Prepares support and fallback readiness |
| Communication owner | Prepares internal/customer messages |
| Go/no-go authority | Makes the authorized release decision |
| Rollback authority | May pause or reverse rollout under defined conditions |

Actual role assignments and signing authority remain `OPEN` until founder approval.

## 9. Release request

A release request includes:

- release ID;
- change class;
- target environment and audience;
- linked issues and pull requests;
- exact candidate SHA/artifact;
- impact assessment;
- test plan;
- migration plan;
- rollback plan;
- support/fallback plan;
- communication plan;
- known limitations;
- proposed observation window;
- requested go/no-go time;
- unresolved risks and exceptions.

A release request with unknown candidate SHA is `BLOCKED`.

## 10. Release candidate package

The release candidate package contains, as applicable:

1. exact commit SHA;
2. immutable build artifact reference;
3. dependency lockfiles;
4. automated quality-gate results;
5. security-gate results;
6. test summary;
7. browser E2E/accessibility evidence;
8. backend integration evidence;
9. API contract evidence;
10. migration files and rehearsal evidence;
11. backup/restore evidence;
12. configuration/environment diff;
13. Product Feature Registry diff;
14. release notes draft;
15. support/training/manual diff;
16. monitoring and alert plan;
17. rollback target and procedure;
18. open-risk list;
19. approval record;
20. post-deployment validation checklist.

A screenshot of a working screen is not a complete release candidate package.

## 11. Release gates

### Gate R1 — Scope and authority

Pass when:

- scope and exclusions are written;
- change class is assigned;
- owners are named;
- Product Feature Registry impact is known;
- customer claims are controlled;
- no unauthorized scope expansion exists.

### Gate R2 — Repository and build integrity

Pass when:

- candidate is built from an identifiable commit;
- required PR checks pass;
- dependencies are locked;
- build is reproducible enough for the current stage;
- artifact or deployment input is preserved.

### Gate R3 — Functional quality

Pass when:

- required unit/integration/E2E tests pass;
- role-specific critical workflows pass;
- edge cases are reviewed;
- accessibility checks pass where applicable;
- known limitations are recorded.

### Gate R4 — Security, privacy and tenancy

Pass when:

- security gate passes;
- no unresolved critical vulnerability exists;
- RBAC and tenant isolation are validated where affected;
- personal-data impact is reviewed;
- logging and secrets are appropriate;
- privacy/legal escalation is complete where required.

### Gate R5 — Data and migration safety

Pass when:

- migration ordering is known;
- backup exists where required;
- restore or recovery path is tested to the required stage;
- compatibility assumptions are documented;
- reconciliation plan exists;
- data-integrity stop conditions are defined.

### Gate R6 — Infrastructure and observability

Pass when:

- target environment is identified;
- configuration and secrets are ready;
- monitoring and alerts are ready;
- capacity/cost impact is accepted;
- deployment and rollback permissions are available;
- dependency status is known.

### Gate R7 — Operations and customer readiness

Pass when:

- support knows what changed;
- manual fallback is available where required;
- admin/manual/training material is aligned;
- customer communication is approved if needed;
- pilot/customer timing is coordinated;
- escalation contacts are available.

### Gate R8 — Go/no-go

Pass when:

- R1–R7 are passed or an explicitly authorized non-critical exception exists;
- no hard blocker remains;
- release and rollback owners are available;
- observation window is staffed;
- decision is recorded.

## 12. Hard blockers

A release is `NO-GO` when any applicable condition exists:

- unresolved critical security vulnerability;
- unresolved tenant-isolation concern;
- known critical attendance data corruption risk;
- missing rollback/recovery path for a high-risk change;
- unknown migration state;
- required backup or restore evidence missing;
- candidate SHA/artifact cannot be identified;
- required secrets or environment configuration unknown;
- release would misrepresent Preview as production;
- customer communication claims an unreleased function;
- hardware deployment depends on unvalidated physical assumptions;
- required support fallback is unavailable;
- required owner is unavailable and no approved delegate exists;
- legal/privacy hard stop is open;
- required release gate failed.

A deadline or customer enthusiasm does not override a hard blocker.

## 13. Go/no-go decision record

| Field | Required content |
|---|---|
| Release ID | Controlled identifier |
| Candidate | SHA/artifact |
| Target | Environment and cohort |
| Gate results | R1–R8 |
| Exceptions | Owner, reason, expiry and residual risk |
| Known limitations | Customer/internal wording |
| Rollback trigger | Measurable condition |
| Rollback target | Known stable state |
| Decision | `GO`, `CONDITIONAL GO`, `NO-GO`, `PAUSE` |
| Decision owner | Authorized person |
| Timestamp | Date/time/timezone |
| Communication approved | Yes/no/not required |
| Observation owner | Named person |

`CONDITIONAL GO` is not allowed for an unresolved critical hard blocker.

## 14. Environment sequence

The proposed environment sequence is:

1. local/isolated development;
2. pull-request validation;
3. Preview or ephemeral validation;
4. controlled staging/pilot environment;
5. limited pilot cohort;
6. broader production cohort after evidence.

Actual environments remain subject to ADR-001 and infrastructure implementation.

### 14.1 Preview rules

- synthetic or approved non-personal test data only;
- clearly labelled Preview;
- no production claim;
- no production secrets;
- no automatic customer use;
- behavior may be incomplete or simulated;
- release notes must not call Preview a production release.

### 14.2 Staging/pilot rules

- environment separated from production where implemented;
- approved test/pilot data only;
- migration and restore rehearsal where applicable;
- support and fallback readiness;
- access controlled and logged;
- release candidate version visible.

### 14.3 Production rules

Production release remains blocked until production infrastructure, privacy/legal, software, hardware and pilot-readiness gates are proven.

## 15. Database migration process

### 15.1 Migration package

- exact migration IDs;
- required application version;
- expected duration;
- lock/downtime risk;
- forward migration command/process;
- pre-migration validation;
- backup evidence;
- restore/recovery procedure;
- post-migration validation;
- reconciliation query/check;
- rollback or forward-fix decision rule;
- owner and observer.

### 15.2 Migration rehearsal

High-risk migration rehearsal should include:

- representative schema and data volume;
- timing measurement;
- failure injection where practical;
- restore or recovery test;
- old/new application compatibility review;
- repeated-run/idempotency review where relevant;
- audit and data-integrity validation.

### 15.3 Migration stop conditions

- unexpected schema state;
- migration duration exceeds approved limit;
- integrity check fails;
- tenant boundary check fails;
- application cannot start safely;
- rollback/recovery materials unavailable;
- backup verification fails.

## 16. Rollout strategies

### 16.1 Internal-only rollout

Use for:

- documentation;
- internal admin tooling;
- operational rehearsal;
- synthetic-data validation.

### 16.2 Single-cohort pilot rollout

Use for:

- first controlled customer/site;
- high-observation product changes;
- terminal/configuration changes;
- changes requiring human feedback.

Controls:

- named cohort;
- defined start/end;
- support owner available;
- fallback active;
- enhanced monitoring;
- stop/rollback thresholds.

### 16.3 Progressive rollout

Potential stages:

- internal users;
- one pilot tenant/site;
- limited percentage or named cohort;
- remaining approved cohort.

Progression requires evidence from the previous stage.

### 16.4 Big-bang rollout

Avoid unless:

- progressive rollout is technically impossible;
- risk is understood;
- rollback/recovery is proven;
- impact window is approved;
- required owners are present.

## 17. Deployment checklist

Before deployment:

- candidate and target confirmed;
- release record open;
- required gates passed;
- current state captured;
- backup/recovery ready where required;
- monitoring dashboard ready;
- support notified;
- customer notice sent if required;
- rollback owner available;
- change freeze conflicts checked.

During deployment:

- start time recorded;
- commands/actions logged;
- unexpected warnings recorded;
- migration state observed;
- health checks monitored;
- no unapproved manual changes;
- stop condition applied immediately when met.

After deployment:

- deployed version confirmed;
- environment/configuration confirmed;
- migrations confirmed;
- smoke tests run;
- critical workflows run;
- monitoring reviewed;
- customer-impact checks run;
- release state remains `DEPLOYED` until validation completes.

## 18. Post-deployment validation

Validation should cover, as applicable:

- login/session flow;
- tenant selection/isolation;
- role access boundaries;
- worker attendance check-in/out;
- correction workflow;
- leave request/decision flow;
- report preview/export;
- audit-log evidence;
- terminal sync behavior;
- error logging;
- monitoring/alerts;
- backup/migration state;
- page performance and accessibility;
- customer-specific critical path;
- manual fallback readiness.

### 18.1 Validation result

| Result | Meaning |
|---|---|
| `PASS` | Required checks passed. |
| `CONDITIONAL PASS` | Only approved non-critical items remain. |
| `FAIL` | Release cannot be declared verified. |
| `BLOCKED` | Required validation could not be performed. |

A `BLOCKED` critical validation is not a pass.

## 19. Observation window

The observation window is release-specific and remains an approved proposal until operating data exists.

Monitor:

- error rate;
- failed logins;
- terminal sync failures;
- attendance-write failures;
- correction anomalies;
- tenant-isolation indicators;
- database health;
- infrastructure resource use;
- support volume;
- customer-reported regressions;
- response latency;
- audit-log continuity;
- backup/replication status where applicable.

Observation must identify:

- owner;
- duration;
- dashboards/log sources;
- thresholds;
- escalation path;
- release closure criteria.

## 20. Rollback planning

### 20.1 Rollback plan fields

- rollback authority;
- rollback trigger;
- target stable version;
- application rollback steps;
- configuration rollback steps;
- database recovery strategy;
- terminal/firmware downgrade strategy where applicable;
- expected duration;
- user/customer impact;
- manual fallback;
- validation after rollback;
- communication template;
- data reconciliation owner.

### 20.2 Rollback triggers

Examples of proposed trigger categories:

- critical security/privacy finding;
- tenant-isolation failure;
- attendance data corruption;
- material increase in failed writes;
- authentication failure affecting approved users;
- database instability;
- terminal fleet cannot sync safely;
- required fallback unavailable;
- monitoring blind spot during high-risk rollout;
- customer-critical workflow unavailable;
- migration/post-migration validation failure.

Actual numeric thresholds remain `OPEN` until evidence exists.

### 20.3 Rollback decision options

- `PAUSE ROLLOUT` — stop expansion, keep current cohort under observation;
- `DISABLE FEATURE` — use approved feature flag/configuration where implemented;
- `APPLICATION ROLLBACK` — redeploy known stable version;
- `CONFIGURATION ROLLBACK` — restore previous approved configuration;
- `DATABASE RECOVERY` — restore or execute approved forward recovery;
- `TERMINAL ROLLBACK` — revert approved terminal/firmware configuration;
- `MANUAL FALLBACK` — customer temporarily records attendance using approved process;
- `FORWARD FIX` — only when safer than reversal and explicitly approved.

## 21. Release closure

A release may be closed when:

- deployment and validation evidence are complete;
- observation window completed or explicitly transferred to normal monitoring;
- customer/internal communication completed;
- known limitations and follow-up issues recorded;
- Product Feature Registry updated accurately;
- support/training/manual updates merged where required;
- rollback materials preserved;
- release decision and final state recorded.

Closure outcomes:

- `RELEASED`;
- `PARTIAL RELEASE`;
- `ROLLOUT PAUSED`;
- `ROLLED BACK`;
- `WITHDRAWN`.

## 22. Internal technical changelog

Each release changelog should include:

- release ID and date;
- candidate SHA/tag/artifact;
- environment/cohort;
- included PRs/issues;
- functional changes;
- API/database changes;
- infrastructure/configuration changes;
- security/privacy changes;
- terminal/hardware changes;
- tests/evidence;
- migrations;
- known limitations;
- support impact;
- rollback target;
- follow-up actions.

The technical changelog may contain internal references that are not appropriate for customer communication.

## 23. Customer-facing release notes

Customer release notes should be understandable and truthful.

### 23.1 Standard structure

**What changed**

- concise capability or behavior statement;

**Who is affected**

- roles, site or cohort;

**What the customer needs to do**

- no action, refresh, training, configuration or scheduled action;

**Known limitations**

- explicit relevant limits;

**Support**

- approved support channel and operating terms;

**Release status**

- pilot, partial rollout or general release wording approved for the actual state.

### 23.2 Prohibited wording

Do not claim:

- “fully GDPR certified”;
- “100% secure”;
- “zero downtime guaranteed”;
- “payroll is calculated” when only attendance export exists;
- “works offline” without verified scope and limitations;
- “production ready” based only on Preview;
- “all workers and companies supported” without evidence;
- “automatic legal compliance”;
- “hardware validated” before physical evidence.

## 24. Product communication types

### `COMM-1 — Informational`

No customer action required; low-risk clarification.

### `COMM-2 — Feature or behavior change`

Explain affected roles, expected result and required action.

### `COMM-3 — Maintenance or limited availability`

Use only approved timing and service-impact language.

### `COMM-4 — Known limitation or defect`

Explain impact, workaround, affected scope and follow-up without minimizing risk.

### `COMM-5 — Rollback or withdrawal`

Explain that the change was reversed/withdrawn, current stable state, customer action and support path.

### `COMM-6 — Security/privacy-sensitive communication`

Coordinate through security/privacy/legal process; do not improvise regulatory conclusions.

## 25. Communication timeline template

| Stage | Audience | Message |
|---|---|---|
| Before release | Internal owners | Scope, timing, risk, rollback, support |
| Before release if needed | Customer admins | Planned impact and required action |
| Deployment start | Internal | Release ID, target and owner |
| Deployment complete | Internal | Deployed state; validation open |
| Verified | Internal/customer as approved | Released capability and limits |
| Issue detected | Internal/customer as required | Impact, workaround and next update |
| Rollback | Internal/customer | Reverted state and next steps |
| Closure | Internal | Final evidence and follow-ups |

Actual customer notice periods remain `OPEN` until commercial and support terms are approved.

## 26. Known limitation register

Each active known limitation records:

- limitation ID;
- affected release/component;
- user/customer impact;
- workaround;
- severity;
- owner;
- target decision/date;
- customer wording;
- support instruction;
- retirement/fix status.

A limitation must not be hidden because the release otherwise looks successful.

## 27. Deprecation and retirement

A deprecation plan should include:

- capability/API/version to be deprecated;
- replacement path;
- affected customers/integrations;
- proposed notice period;
- data migration/export path;
- support period;
- final removal gate;
- rollback/exception handling;
- customer communication.

No notice period is approved by this document.

## 28. Emergency change process

### 28.1 Entry criteria

Use only when delay materially increases:

- security exposure;
- privacy risk;
- outage duration;
- data-integrity risk;
- tenant-isolation risk;
- customer operational harm.

### 28.2 Minimum emergency record

- incident/change ID;
- reason normal process is insufficient;
- exact scope;
- owner;
- candidate SHA/change reference;
- immediate risks;
- validation performed;
- rollback/recovery path;
- deployment actions;
- communication actions;
- post-change monitoring;
- required follow-up PR/review;
- retrospective due date.

### 28.3 Emergency retrospective

Review:

- why the emergency occurred;
- whether scope remained minimal;
- what validation was skipped;
- whether customer/data impact occurred;
- whether rollback was available;
- permanent corrective actions;
- documentation/test improvements;
- whether access or authority was excessive.

## 29. Hardware and terminal release control

A terminal-related release additionally records:

- exact asset/model scope;
- terminal software/firmware/config version;
- compatible BOM/configuration versions;
- installation or remote-update method;
- power/network/RFID implications;
- field validation result;
- spare/replacement readiness;
- downgrade/recovery process;
- asset register updates;
- customer site/cohort;
- physical safety/certification dependencies where applicable.

Hardware remains `PARTIAL` until physical validation evidence exists.

## 30. Support and training handoff

Before a customer-affecting release:

- support receives release summary;
- support receives known limitations;
- support receives workaround and escalation path;
- Customer Admin Manual impact is reviewed;
- Demo & Training Playbook impact is reviewed;
- installation/terminal instructions are updated where needed;
- customer-facing screenshots/click paths are revalidated;
- outdated material is marked or withdrawn.

## 31. Release metrics

Potential internal metrics:

- releases by change class;
- release success rate;
- rollback rate;
- change failure rate;
- time from merge to verified release;
- escaped critical defects;
- incidents by release;
- migration duration variance;
- validation failures;
- communication corrections;
- releases with complete evidence;
- emergency changes and overdue retrospectives;
- support volume after release;
- time to restore.

No target values are approved by this document.

## 32. Operating cadence

### Per change

- classify;
- assess impact;
- approve scope;
- implement/review;
- assemble candidate;
- go/no-go;
- deploy/validate;
- observe/close.

### Weekly during active release work

- review upcoming candidates;
- review blockers and dependencies;
- review migration/rollback readiness;
- review customer communication needs;
- review stale release records.

### Monthly

- review release metrics;
- review emergency changes;
- review repeated rollback causes;
- review known limitations;
- review deprecated versions;
- review evidence completeness.

### Before pilot/production expansion

- review all hard blockers;
- verify support/monitoring coverage;
- verify infrastructure/restore evidence;
- verify Product Feature Registry truth;
- verify customer messaging.

## 33. Private release-system requirements

Real operational records may include sensitive information and should be stored in an approved private system.

Minimum controls:

- named access;
- MFA;
- least privilege;
- change history;
- backup/export;
- customer/secrets separation;
- retention rules;
- founder continuity access;
- evidence links without exposing secrets;
- ability to export a release package.

## 34. Fictional normal release dry run

All data in this scenario is fictional.

### Scenario

A fictional pilot environment receives an approved correction-review usability improvement. No database schema or API contract changes.

### Classification

- change class: `CHG-2`;
- audience: one fictional pilot cohort;
- candidate: fictional SHA `abc1234`;
- risk: role behavior and support wording;
- rollback: previous application artifact.

### Gate result

- R1 scope: pass;
- R2 repository/build: pass;
- R3 quality: pass;
- R4 security/privacy: pass;
- R5 data/migration: not applicable, no schema change;
- R6 infrastructure: pass;
- R7 operations/customer: pass;
- R8 go/no-go: `GO`.

### Deployment

- deployed to fictional pilot environment;
- smoke test passed;
- manager role reviewed flagged entry;
- worker role remained unable to approve correction;
- audit evidence remained present;
- no monitoring anomaly detected.

### Communication

Customer note states that the review screen is clearer. It does not claim new payroll or automated decision functionality.

### Outcome

`PARTIAL RELEASE` to the named fictional cohort. Wider rollout remains a separate decision.

## 35. Fictional rollback dry run

All data in this scenario is fictional.

### Scenario

A fictional report-export release causes an unexpected increase in failed export jobs after deployment to one pilot cohort.

### Trigger

- defined failure threshold is exceeded;
- data writes remain intact;
- manual export fallback exists;
- wider rollout has not started.

### Decision

- rollout status set to `ROLLOUT PAUSED`;
- release owner reviews evidence;
- rollback authority approves application rollback;
- previous stable artifact identified;
- no database rollback required.

### Actions

1. customer informed of temporary export issue and workaround;
2. deployment reverted to previous artifact;
3. deployed version verified;
4. critical report workflow retested;
5. monitoring confirms error rate returned to baseline;
6. release marked `ROLLED BACK`;
7. defect issue opened;
8. root-cause and test-gap review scheduled.

### Customer wording

The change was withdrawn after validation identified an export reliability issue. Attendance records were not reported as lost because the fictional evidence showed they remained intact.

### Outcome

Rollback is successful. The candidate is not re-released until a new release record and evidence package exist.

## 36. Evidence index

| Evidence ID | Evidence |
|---|---|
| `REL-001` | Approved release scope and change class |
| `REL-002` | Change-impact assessment |
| `REL-003` | Candidate SHA/tag/artifact |
| `REL-004` | Quality-gate evidence |
| `REL-005` | Security/privacy/tenancy evidence |
| `REL-006` | Migration and recovery evidence |
| `REL-007` | Infrastructure/configuration evidence |
| `REL-008` | Go/no-go decision |
| `REL-009` | Deployment log |
| `REL-010` | Post-deployment validation |
| `REL-011` | Observation-window summary |
| `REL-012` | Customer/internal communication |
| `REL-013` | Rollback/recovery evidence |
| `REL-014` | Product Feature Registry and documentation update |
| `REL-015` | Final release closure record |

## 37. Approval gates for this operating system

### OS Gate O1 — Framework review

- founders review release states and role model;
- technical reviewer checks feasibility;
- no production claim is created.

### OS Gate O2 — Environment alignment

- actual Preview/staging/production model is confirmed;
- deployment tooling and permissions are known;
- monitoring and backup systems are known.

### OS Gate O3 — Operational rehearsal

- one real non-production release rehearsal completed;
- one rollback or recovery rehearsal completed;
- evidence gaps recorded.

### OS Gate O4 — Production activation

- production authority approved;
- hard-blocker process tested;
- customer notice/support process approved;
- issue #55 and applicable readiness dependencies resolved;
- release evidence is sufficient for qualified review.

Merging this document passes none of O2–O4 automatically.

## 38. Open decisions

The following remain `OPEN`:

- final release/versioning scheme;
- actual environment names and release sequence;
- release authority and delegates;
- maintenance windows;
- customer notice periods;
- observation-window duration;
- numeric rollback thresholds;
- approved progressive-rollout tooling;
- feature-flag strategy;
- supported-version policy;
- deprecation periods;
- emergency access model;
- production tagging and artifact-retention policy;
- customer release-note channel;
- release cadence.

## 39. Completion boundary

This document is complete for `PROPOSED v0.1` when:

- status model exists;
- change classes exist;
- impact assessment exists;
- release candidate and gates exist;
- go/no-go, rollout, validation and rollback processes exist;
- communication templates and prohibited claims exist;
- normal release and rollback dry runs exist;
- evidence and approval gates exist;
- real production procedures remain explicitly unapproved until proven.

It does not prove that BSS currently has a production environment, a verified release pipeline or a production-ready product.
