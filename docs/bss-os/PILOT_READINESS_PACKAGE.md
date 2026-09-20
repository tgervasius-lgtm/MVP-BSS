# BSS Pilot Readiness Package

Status: `PROPOSED`
Last reviewed: 2026-09-20
Owner: BSS founders
Tracking issue: `#62`

## 1. Purpose

This document defines the minimum evidence required before BSS onboards the first company with real workers or real attendance data.

A pilot is not a production launch. It is a controlled validation with a frozen scope, named owners, explicit limitations, a rollback path and measurable success criteria.

No individual checklist line may be treated as complete without evidence. A general statement such as “the system works” is not acceptable evidence.

## 2. Status language

| Status | Meaning |
|---|---|
| `BLOCKED` | A prerequisite is missing and the next phase must not start. |
| `OPEN` | Work is defined but not completed. |
| `READY FOR DRY RUN` | Test-data rehearsal may start; real worker data is still prohibited. |
| `DRY RUN PASSED` | The full customer journey succeeded with test data and recorded evidence. |
| `READY FOR LIVE PILOT` | All mandatory technical, hardware, legal, privacy and operational gates are approved. |
| `PILOT ACTIVE` | The approved pilot is running within its agreed scope. |
| `PILOT CLOSED` | Data, equipment, results and commercial outcome are reconciled. |

Current overall status: `BLOCKED`.

The historical Phase B integration blocker is resolved: issue `#55` is CLOSED/COMPLETED and PR `#99` is MERGED. This establishes a repository baseline, not a pilot release or deployed environment.

Current blockers are the remaining accepted design/implementation gates, Production-like Staging / `AUDIT B`, deployed security and recovery evidence, Hardware 9C / `AUDIT C`, and customer-specific legal, operational and GO/NO-GO evidence. No live pilot is authorized.

### 2.1 Evidence snapshot and authority

This B2 documentation refresh was prepared from protected `main` at `88c1b8db99a930e87f27470c2c1c3ac393f5339c` on 2026-09-20, after governance PR `#170` merged and `#166` closed. That SHA is the source snapshot before this refresh, not an approved pilot release SHA.

| Source / fact | Verified state and limit |
|---|---|
| [Issue #55](https://github.com/tgervasius-lgtm/MVP-BSS/issues/55) / [PR #99](https://github.com/tgervasius-lgtm/MVP-BSS/pull/99) | CLOSED/COMPLETED / MERGED; historical integration commit `198b2ce9f1ad73b7b72058a930cf005cbb35a0da`. Does not prove deployed readiness. |
| [Readiness Matrix](../../BSS_READINESS_MATRIX.md) | Current readiness and missing evidence; Production-like Staging is NOT IMPLEMENTED / NOT EVIDENCE PROVEN, Hardware 9C and Pilot remain NOT PASS. |
| [Master Roadmap v4.9](MASTER_ROADMAP.md) | Owns the sequence below and AUDIT A-D / PRG; local G1-G9 rows collect evidence and do not replace those gates. |
| [Product Contract v1.0](../../BSS_V1_PRODUCT_CONTRACT.md) / DEC-027 | ACCEPTED / FROZEN; controls product scope, roles, onboarding/import and exclusions. Supersedes the old scope freeze for product scope. |
| [Design Foundation](../../BSS_DESIGN_FOUNDATION_V1.md) / #156 | PR #161 MERGED; proposal remains PROPOSED / NOT ACCEPTED and #156 OPEN. Figma/Storybook remain CANDIDATE / INACTIVE. |
| [Decision Log](DECISION_LOG.md), DEC-025/026 | Historical targeted AUDIT A PASS is tied to `b904eca`; software acknowledgement evidence does not prove real-device durable write/feedback or a fresh release audit. |
| [Product Feature Registry](PRODUCT_FEATURE_REGISTRY.md) | Implementation inventory; any older product-scope wording must be reconciled to the frozen contract, not used to invent a new pilot capability. |

Accepted execution route: Visual Design Gate -> explicit owner/BSS OS Design Foundation acceptance -> roadmap-ordered contract-defined implementation gaps -> Production-like Staging / AUDIT B -> Pilot readiness + Hardware 9C / AUDIT C -> controlled Pilot -> Post-Pilot hardening / PRG / AUDIT D -> Commercial Production.

This document refresh implements none of those capabilities and declares no general development restart. Issue `#62` remains OPEN until its full evidence and second-person dry-run requirements are met.

## 3. Recommended first-pilot envelope

This is the recommended starting boundary, not a contractual commitment:

- one customer company;
- one physical location;
- one BSS terminal;
- one primary customer administrator and one backup contact;
- worker count explicitly approved against H6 capacity and H7 pilot evidence before customer commitment;
- one or two shift patterns;
- four weeks of live operation after onboarding;
- one week of preparation and test-data rehearsal before go-live;
- no payroll calculation or payroll submission;
- no door-access control;
- no unsupported third-party integrations;
- no custom feature development during the active pilot unless required to correct a verified defect or security issue.

The earlier package suggested 10–50 workers, while the historical scope document described 10–30. This refresh does not approve either a customer count or a capacity increase. Record the agreed count, capacity-test evidence and owner decision in the customer-specific pilot record. Other scheduling estimates above remain proposed planning values.

Expanding beyond the approved envelope requires a new risk review and updated acceptance criteria.

## 4. Mandatory go-live gates

| Gate | Requirement | Current status | Evidence required | Responsible role |
|---|---|---|---|---|
| G1 — Software baseline | Phase B integrated into protected main | `REPOSITORY BASELINE VERIFIED` | #55 CLOSED/COMPLETED and #99 MERGED; source snapshot in section 2.1. Fresh release checks remain required in section 10. | BSS technical owner |
| G2 — Staging | Production-like environment for the approved release candidate | `BLOCKED / NOT PROVEN` | #59; deployment/version record, environment inventory, smoke, migration/rollback and AUDIT B evidence | BSS technical owner |
| G3 — Infrastructure | Approved EU hosting, private database path, secrets, monitoring, backup and rollback | `OPEN / NOT PROVEN` | Approved ADR, provider configuration evidence, alert test and isolated restore drill | BSS technical owner |
| G4 — Tenant security | RLS, RBAC, authentication, audit and cross-tenant isolation in the deployed environment | `OPEN / NOT PROVEN` | Release-specific dependency/security review, automated/independent security evidence and deployed negative tests; scanner success alone is insufficient | BSS technical owner |
| G5 — Hardware | Qualified terminal configuration, physical fit, RFID, durable offline/recovery and installation acceptance | `BLOCKED / 9C NOT PASS` | #60 metrology and #132 critical 9C results, traceable hardware/software revisions, photos and installation record | BSS hardware owner |
| G6 — Legal/privacy | Pilot agreement, DPA, worker notice, retention and subprocessors approved | `OPEN / NOT PROVEN` | Qualified review and signed/approved versions for the actual customer and jurisdiction | BSS privacy contact |
| G7 — Operations | Named owners, support, severity, incident and rollback procedures | `OPEN / NOT PROVEN` | Contact/runbook records, alert/escalation rehearsal and applicable H9 operational evidence | BSS technical and commercial owners |
| G8 — Dry run | Full onboarding-to-offboarding journey succeeds with fictional data | `BLOCKED / NOT RUN` | Second-person dry-run record tied to release, environment and qualified terminal; blocking defects resolved | BSS technical owner and independent operator |
| G9 — Customer acceptance | Global AUDIT C PASS plus explicit customer GO/NO-GO | `BLOCKED / NOT APPROVED` | Scope/count/site, named owners, release/configuration, evidence, limitations, rollback and signed GO_LIVE_APPROVED record | BSS commercial and customer executive owners |

`REPOSITORY BASELINE VERIFIED` closes only the old integration prerequisite. No G2-G9 evidence is supplied by this refresh. Live worker data remains prohibited until G1-G9, applicable AUDIT C requirements and customer-specific approval are complete. Hardware 9C blocks Pilot; applicable 9D, PRG and AUDIT D remain later Commercial gates.

For every checklist item below, the execution record must contain the named responsible person, status, evidence link/version, tested release/environment, verification date and reviewer. The role column does not assign a person. Missing or inaccessible evidence is UNAVAILABLE / NOT PROVEN, never PASS; skipped checks remain explicitly SKIPPED. An agent summary, green PR or successful export is not a substitute for the underlying evidence.

## 5. Pilot roles and ownership

Every pilot must name a person for each role. One person may hold multiple roles during the founder phase, but responsibilities must remain explicit.

| Role | Minimum responsibility |
|---|---|
| BSS commercial owner | Scope, pricing, customer communication and final go/no-go decision |
| BSS technical owner | Release, infrastructure, security, backup and defect decisions |
| BSS hardware owner | Terminal version, delivery, installation, replacement and return |
| BSS privacy contact | DPA, subprocessors, retention, access/export/deletion requests and incidents |
| Customer executive owner | Authorizes pilot scope and internal participation |
| Customer administrator | Provides approved setup data and manages daily business use |
| Customer privacy/HR contact | Confirms employee notice and lawful internal process |
| Customer technical contact | Power, network, installation location and local troubleshooting |

No pilot starts if a critical owner is unnamed or unavailable during the go-live window.

## 6. Customer qualification

A candidate is suitable for the first pilot only when:

- decision-makers understand that this is a controlled pilot;
- the company accepts the frozen pilot scope;
- one location and one terminal can represent the intended workflow;
- worker and shift data can be prepared in a structured form;
- the customer can name business, privacy and technical contacts;
- internet, power and mounting conditions can be confirmed;
- the company accepts a fallback attendance process during outages;
- the company agrees to report defects and participate in weekly reviews;
- the company does not require payroll integration, access control or custom features as a condition of starting;
- the company will not upload real data before BSS confirms the live-data gate.

The first pilot should favor a cooperative organization with a clear process over the largest or most complex prospect.

## 7. Frozen pilot product scope

### Included capabilities

The accepted BSS v1 Product Contract v1.0 defines required product behavior. The list below summarizes that scope; it does not claim implementation or readiness. Onboarding/import and other gaps remain tracked implementation work. Verify every pilot capability against the contract, merged implementation, Readiness Matrix and its release/environment evidence before go-live. BSS retains the narrow Croatian attendance/time-capture claim, not a payroll, accounting or complete statutory employee-record claim.

Required scope includes:

- governed tenant/organization onboarding with one timezone and one single-site business context; no separate site entity;
- user invitation, login, refresh and logout;
- the frozen Admin, Voditelj, Radnik and Knjigovodstvo role-operation matrix;
- worker, department, shift and holiday administration; Admin-only initial CSV/XLSX employee import with explicit preview/approval and atomic all-or-nothing commit;
- RFID assignment and replacement;
- terminal clock-in/clock-out events;
- attendance review and bounded administrative corrections;
- employee time overview;
- leave request and approval flow;
- approved shared leave visibility where authorized;
- audit history for critical actions;
- governed monthly review/finalize/close/reopen, immutable report snapshots, and CSV/XLSX/PDF exports under Product Contract section 9;
- terminal synchronization, retry and idempotency behavior;
- backup, monitoring and operational support as separate evidenced go-live requirements.

### Explicitly excluded unless separately approved

- payroll calculation or tax/legal payroll determination;
- automated payroll submission;
- biometric identification;
- door access or physical security control;
- geofencing or continuous employee location tracking;
- native mobile application;
- unsupported custom integrations;
- historical attendance/leave/correction migration, partial/update/merge employee import or a separate site/job-position entity;
- self-service full-tenant portability, PDF/A certification or electronic signing;
- offline browser business mutations or general workflow email/SMS/push;
- unlimited historical retention;
- contractual high-availability or response guarantees not backed by evidence;
- production use of the Preview Portal;
- functionality that exists only in a demo fixture or unmerged PR.

## 8. Data preparation and minimization

Before live onboarding, BSS and the customer must agree the exact data fields required.

Minimum expected setup data:

- organization name and internal identifier;
- one single-site business context and department structure; site is not a separate persisted v1 entity;
- worker internal identifier;
- one required canonical worker `name`, as defined in Product Contract section 4;
- optional worker contact email, separate from login-user identity; portal access uses the explicit invitation workflow;
- assigned role;
- shift assignment;
- RFID credential association;
- explicit `annualLeaveAllowance` for every worker create/import; missing values block import rather than silently defaulting.

Data not required for the pilot must not be collected merely because the customer has it available.

Do not import:

- health diagnoses or medical documents;
- salary or bank details;
- tax identifiers unless a later approved function strictly requires them;
- copies of identity documents;
- private notes unrelated to attendance;
- biometric templates;
- personal location history outside the approved attendance event context.

The approved import template, field definitions, retention period and deletion/export process must be versioned before real data is received. Product Contract section 12 fixes the create-only CSV/XLSX import columns and all-or-nothing behavior; employment dates, historical attendance, login provisioning and RFID secrets are not import columns. Ordinary CSV/XLSX/PDF reports do not constitute complete tenant offboarding/data return (contract section 13).

## 9. Environment separation

The pilot uses three distinct contexts:

### Preview

- sales and product exploration only;
- deterministic fictional data;
- no production authentication, database or employee records;
- clearly labeled as a demo.

### Staging

- release rehearsal and test data;
- same critical service topology and security controls as the approved production baseline where practical;
- used for migration, rollback, alert, restore and onboarding dry runs;
- no real worker data unless explicitly approved under the same protections and documents as production.

### Pilot production

- only approved release commit and migrations;
- real pilot data only after all go-live gates pass;
- separate secrets, database and access controls from Preview and staging;
- named incident and backup owners;
- no direct manual database edits outside an approved emergency procedure.

## 10. Technical acceptance checklist

### Release and deployment

- [x] Historical Phase B integration is complete: #55 CLOSED/COMPLETED, #99 MERGED; repository evidence in section 2.1. This is not release or deployment acceptance.
- [ ] All applicable frozen-contract implementation and design acceptance prerequisites are evidenced.
- [ ] Approved pilot release commit SHA, artifact identity and fresh checks are recorded.
- [ ] Frontend and backend artifacts are reproducible from the release commit.
- [ ] Dependency and secret/security gates are green for the release; known applicable security findings are resolved and documented before Production-like Staging, without treating a non-blocking scanner as security acceptance.
- [ ] Database migrations are tested forward and through the documented rollback boundary.
- [ ] Deployment procedure is executed in staging by someone following the runbook.
- [ ] Rollback and recovery procedures are rehearsed; recovery objectives never permit loss of USER_ACKNOWLEDGED attendance or incorrect attendance duplicates.

### Authentication and authorization

- [ ] Login, refresh, logout, session expiry and account revocation are tested.
- [ ] Invitation acceptance and reinvitation boundaries are tested.
- [ ] Each role has a documented allowed-action matrix.
- [ ] Negative authorization tests prove forbidden actions fail.
- [ ] Disabled users and organizations cannot receive new valid sessions.

### Tenant and database isolation

- [ ] Runtime database role is `NOBYPASSRLS` or equivalent approved control.
- [ ] Cross-tenant reads and writes fail in automated tests.
- [ ] Background/terminal paths respect tenant scope.
- [ ] Administrative corrections and exports remain tenant-scoped.
- [ ] Database grants are limited to documented runtime needs.

### Terminal behavior

- [ ] Device identity and credential validity are tested.
- [ ] Replay protection and request signing behavior are tested where applicable.
- [ ] Zero lost `USER_ACKNOWLEDGED` attendance and zero incorrect attendance duplicates are proven across retry/restart/power-loss scenarios under DEC-025 and Product Contract section 10.
- [ ] Real-device durable local commit occurs before worker feedback; software HMAC receipts alone do not prove that physical behavior.
- [ ] Offline queue and retry behavior are bounded and documented.
- [ ] Clock drift and server time handling are tested.
- [ ] Terminal state is recoverable after power or network interruption.
- [ ] Failed sync is visible to BSS and the customer administrator.

### Observability and recovery

- [ ] Health checks are active.
- [ ] Application errors reach the approved error-tracking channel.
- [ ] Availability and database alerts reach the named on-call owner.
- [ ] A test alert is acknowledged.
- [ ] Automated backups are active.
- [ ] A real restore/PITR drill succeeds in an isolated environment.
- [ ] Recovery time and recovery point results are recorded, not assumed.
- [ ] Audit and operational logs have retention and access controls.

## 11. Hardware and installation acceptance

Hardware remains PARTIAL / EXTERNAL until measured and tested. #60 supplies metrology/fit work; #132 owns critical 9C reliability qualification before Pilot and later 9D productization before Commercial Rollout. A CAD drawing, software test, heartbeat or this checklist is not physical qualification evidence.

The terminal delivered to the customer must have a traceable configuration:

- device identifier and serial number;
- enclosure/CAD revision;
- Raspberry Pi model and storage image/version;
- display SKU and firmware/configuration;
- RFID reader revision and placement;
- power supply model;
- backend/API target environment;
- date of assembly and acceptance test.

### Site survey

Before installation confirm:

- wall or desk mounting location;
- stable power source;
- network type and signal quality;
- cable route and strain relief;
- worker approach and screen visibility;
- RFID read zone and metal/interference conditions;
- environmental conditions;
- service access;
- customer approval for drilling/mounting where relevant.

### Installation acceptance

- [ ] Terminal powers on reliably.
- [ ] Correct environment and tenant are configured.
- [ ] Time synchronization is correct.
- [ ] Test card can clock in and out.
- [ ] Event appears in the correct tenant and worker record.
- [ ] Sound/display feedback is understandable.
- [ ] Network interruption and recovery are tested.
- [ ] Photos document placement and cable routing.
- [ ] Customer administrator signs the installation record.
- [ ] Replacement and return procedure is explained.

Fallback during terminal outage must be defined before go-live; it may not be invented during an incident.

## 12. Legal and privacy package

Before live data, the approved package must include at minimum:

- pilot service agreement or order form;
- clear pilot duration, price and post-pilot terms;
- controller/processor responsibility statement;
- data processing agreement between customer and BSS where applicable;
- approved subprocessor list and hosting regions;
- worker-facing privacy information supplied through the customer's lawful process;
- data categories, purposes and retention periods;
- access, correction, export and deletion procedure;
- security incident and personal-data breach escalation path;
- end-of-pilot data return/deletion rules;
- confidentiality and access restrictions;
- separate permission process for testimonial, logo or case-study use.

Marketing/reference permission must never be bundled as a hidden condition of receiving the service.

Legal documents require qualified review before use. This checklist does not replace legal advice.

## 13. Support and incident model

### Support channel

Before go-live define:

- primary support email or ticket channel;
- emergency phone/contact route for severe incidents;
- supported service hours;
- customer contacts authorized to open incidents;
- information required in every report;
- where incident records are stored.

### Proposed severity model

| Severity | Example | Initial BSS target during pilot |
|---|---|---|
| S1 Critical | Cross-tenant exposure, suspected credential compromise, broad inability to record attendance with no safe fallback | Immediate acknowledgement when received; activate incident process |
| S2 High | Terminal or portal unavailable for the customer, major data inconsistency, failed backup/restore control | Same business day acknowledgement and workaround plan |
| S3 Medium | One workflow degraded, report/export defect, limited user issue | Next business day acknowledgement |
| S4 Low | Cosmetic issue, question or enhancement request | Logged for scheduled review |

These are operational targets for the pilot, not contractual SLAs, until BSS formally approves and can sustain them.

### Incident requirements

- one incident commander;
- one timestamped record;
- affected customer/tenant identified;
- containment before speculative repair;
- no deletion of evidence;
- customer communication owner;
- privacy escalation where personal data may be affected;
- recovery verification;
- root-cause and corrective-action record for significant incidents.

## 14. Dry-run scenario

The full dry run uses fictional test data and must be completed by a second person following written instructions rather than relying on developer memory. Current state: NOT RUN; this refresh provides no dry-run result.

Required journey:

1. create the pilot organization with one timezone and one single-site context, without creating a separate site entity;
2. create departments, shifts and role assignments;
3. invite the customer administrator and supervisor;
4. as Admin, stage/validate/preview/approve the initial CSV/XLSX worker import; prove all-or-nothing commit, required allowance, conflict and retry behavior;
5. assign and replace an RFID credential;
6. perform terminal clock-in and clock-out;
7. interrupt network access and verify recovery/synchronization;
8. review attendance as supervisor;
9. create and approve a leave request;
10. perform an authorized correction, verify role-negative cases and audit, then exercise the governed finalize/reopen/recalculate/relock boundary without rewriting raw events or issued exports;
11. generate preview and CSV/XLSX/PDF exports from the same authorized dataset; verify period-version reproducibility and Knjigovodstvo privacy minimization;
12. confirm tenant isolation with a second test tenant;
13. trigger and acknowledge a test alert;
14. restore data into an isolated environment;
15. execute the documented release rollback boundary;
16. execute the controlled complete data-return/retention/deletion procedure for the test organization; ordinary reports are insufficient and self-service tenant portability is not a v1 capability.

Every defect is assigned a severity and disposition. The dry run fails if a critical step is skipped, manually patched without documentation or completed only through direct database manipulation.

## 15. Customer onboarding sequence

### D-14 to D-7 — Qualification and scope

- approve customer and pilot envelope;
- name all owners;
- sign commercial and privacy documents;
- confirm location, worker count, shifts and terminal quantity;
- agree success metrics and fallback process;
- prohibit premature live-data transfer.

### D-7 to D-3 — Preparation

- complete site survey;
- verify hardware version and staging release;
- validate import template with fictional or minimized test data;
- conduct customer administrator training in staging;
- complete full dry run and resolve blocking defects.

### D-2 to D-1 — Final gate

- confirm release SHA and migration set;
- confirm backups, monitoring and support contacts;
- confirm installation and worker communication;
- record go/no-go decision signed by BSS and customer owners.

### D0 — Installation and go-live

- install terminal;
- execute installation acceptance;
- activate only approved users and workers;
- observe first real clock events;
- confirm supervisor review and fallback readiness;
- start heightened monitoring.

### D1 to D5 — Stabilization

- daily health review;
- reconcile attendance totals with the customer's fallback/source record;
- prioritize defects over feature requests;
- document every manual intervention.

### Weekly

- review adoption, data consistency, incidents and open risks;
- compare metrics with agreed success criteria;
- approve any scope change in writing.

### Pilot close

- final data and incident reconciliation;
- customer feedback interview;
- approve production continuation, extension or shutdown;
- export/retain/delete data according to agreement;
- retrieve or convert terminal ownership according to contract;
- separate testimonial/reference decision from technical acceptance.

## 16. Pilot success metrics

Customer-specific targets require approval, but the accepted attendance invariant is non-negotiable: **zero lost `USER_ACKNOWLEDGED` attendance / zero incorrect attendance duplicates** (DEC-025, Product Contract section 10, #132). A percentage target or backup recovery objective cannot relax it. Other recommended metric categories:

### Reliability

- percentage of expected terminal events successfully received;
- number and duration of terminal/network outages;
- duplicate or missing event count;
- successful backup and restore evidence;
- unresolved S1/S2 incidents.

### Data quality

- difference between BSS attendance records and the agreed validation source;
- number of manual corrections;
- correction reasons and recurrence;
- report/export acceptance by the customer owner.

### Usability and adoption

- percentage of workers successfully clocking without assistance after onboarding;
- administrator and supervisor task completion;
- support requests by category;
- training gaps or repeated confusion.

### Business validation

- time saved compared with the previous process;
- customer willingness to continue on paid terms;
- accepted price range;
- features truly required for purchase versus merely requested;
- willingness to act as a reference, evaluated separately.

No single vanity metric may override a critical security, privacy or data-integrity failure.

## 17. Stop and rollback conditions

BSS must pause or stop the pilot when:

- suspected cross-tenant access occurs;
- credentials or secrets may be compromised;
- USER_ACKNOWLEDGED attendance is lost, an incorrect attendance duplicate occurs, or attendance cannot be reconciled and the error source is unknown;
- backups or restore controls are unavailable;
- hardware presents an electrical, thermal or physical safety concern;
- the customer expands usage outside the approved scope without review;
- legal/privacy prerequisites are withdrawn or found invalid;
- the customer has no usable fallback during a prolonged outage;
- an S1 incident cannot be contained;
- continued operation would create misleading payroll or legal conclusions.

Stopping the pilot is a controlled safety decision, not a commercial failure.

## 18. Evidence index

Each pilot must maintain an evidence folder or register containing:

- signed scope and agreements;
- approved privacy documents and subprocessor list;
- release SHA, build and migration identifiers;
- environment and access inventory;
- dry-run report;
- security and tenant-isolation test evidence;
- backup/restore evidence;
- hardware BOM, serial and installation acceptance;
- training and onboarding records;
- incident and support log;
- weekly health reviews;
- final metrics and customer decision;
- data export/deletion confirmation at close.

Evidence may link to controlled external systems, but the BSS OS record must identify where it is stored, who owns it and which version applies.

## 19. Current readiness summary

| Area | Status | Next required evidence |
|---|---|---|
| Software baseline | `REPOSITORY BASELINE VERIFIED` | #55/#99 integration resolved; select and independently verify the actual release candidate later |
| Design and contract gaps | `BLOCKED / PARTIAL` | #156 acceptance and roadmap-ordered implementation, including onboarding/import; contract freeze and proposal merge do not prove completion |
| Production-like Staging / AUDIT B | `NOT IMPLEMENTED / NOT EVIDENCE PROVEN` | #59 environment, deployed security, load, migration/rollback and restore evidence |
| Infrastructure architecture | `PROPOSED` | Approve ADR-001 and provision staging |
| Preview/sales sandbox | `SEPARATE / NOT LIVE EVIDENCE` | #58 reconstruction remains separate from staging and real-customer readiness |
| Hardware | `PARTIAL / 9C NOT PASS` | #60 metrology plus #132 real-device critical 9C qualification |
| Legal/privacy | `OPEN` | Prepare and review agreement, DPA, notice and retention package |
| Support/incident operations | `OPEN` | Assign owners and rehearse alerts/escalation |
| Dry run | `BLOCKED / NOT RUN` | Qualified staging release/terminal and second-person completion of the written journey |
| Live pilot | `BLOCKED / NOT APPROVED` | G1-G9 evidence, global AUDIT C PASS and separate customer GO/NO-GO |

## 20. Approval record

This package remains `PROPOSED` until approved by the BSS founders.

Approval or merge of this document does not approve live data by itself. A separate per-customer go/no-go record must confirm all mandatory gates immediately before onboarding. `READY_FOR_GO_LIVE` and `GO_LIVE_APPROVED` remain distinct under the frozen Product Contract.

| Decision/evidence | Current record |
|---|---|
| Package approval | PROPOSED; no founder approval recorded by this refresh |
| Named pilot owners / customer / worker count | NOT ASSIGNED / NOT APPROVED here |
| Approved pilot release and configuration | NOT SELECTED here |
| Second-person dry run | NOT RUN here |
| Global AUDIT C / customer GO_LIVE_APPROVED | NOT PROVEN / NOT APPROVED |
| Issue #62 completion | OPEN; this evidence refresh is only part of the package work |
