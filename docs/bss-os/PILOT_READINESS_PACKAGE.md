# BSS Pilot Readiness Package

Status: `PROPOSED`
Last reviewed: 2026-08-05
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

Primary blocker: one authoritative software baseline is not yet present in `main` because issue `#55` remains open.

## 3. Recommended first-pilot envelope

This is the recommended starting boundary, not a contractual commitment:

- one customer company;
- one physical location;
- one BSS terminal;
- one primary customer administrator and one backup contact;
- approximately 10–50 workers;
- one or two shift patterns;
- four weeks of live operation after onboarding;
- one week of preparation and test-data rehearsal before go-live;
- no payroll calculation or payroll submission;
- no door-access control;
- no unsupported third-party integrations;
- no custom feature development during the active pilot unless required to correct a verified defect or security issue.

Expanding beyond this envelope requires a new risk review and updated acceptance criteria.

## 4. Mandatory go-live gates

| Gate | Requirement | Current status | Evidence required |
|---|---|---|---|
| G1 — Software baseline | Backend Phase B safely integrated into current `main` | `BLOCKED` | Issue `#55` closed; integration PR merged; all required checks green |
| G2 — Staging | Staging environment represents the approved release candidate | `OPEN` | Deployment record, environment inventory, smoke test and version identifier |
| G3 — Infrastructure | Approved EU hosting, private database path, secrets, monitoring, backup and rollback | `OPEN` | Approved ADR, provider configuration evidence, alert test, restore drill |
| G4 — Tenant security | RLS, RBAC, authentication, audit and cross-tenant isolation proven in deployed environment | `OPEN` | Automated and manual test reports tied to release commit |
| G5 — Hardware | Exact terminal BOM, physical fit, RFID read-zone and installation acceptance proven | `OPEN` | Issue `#60` evidence, photos, serial/version record and signed checklist |
| G6 — Legal/privacy | Pilot agreement, DPA, worker notice, retention and subprocessor information approved | `OPEN` | Signed/approved documents and version numbers |
| G7 — Operations | Named owners, support channel, severity levels, incident process and rollback procedure | `OPEN` | Contact sheet, runbook and alert/escalation rehearsal |
| G8 — Dry run | Full onboarding-to-export journey succeeds with test data | `OPEN` | Completed dry-run record with screenshots/log references and defects resolved |
| G9 — Customer acceptance | Customer confirms scope, location, workers, responsibilities and go-live date | `OPEN` | Signed pilot order/acceptance record |

Live worker data is prohibited until G1–G9 are complete.

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

The final included set must be verified against the post-issue-`#55` Product Feature Registry. The intended pilot scope includes:

- tenant and organization setup;
- user invitation, login, refresh and logout;
- supported roles and permissions;
- worker, department and shift administration;
- RFID assignment and replacement;
- terminal clock-in/clock-out events;
- attendance review and bounded administrative corrections;
- employee time overview;
- leave request and approval flow;
- approved shared leave visibility where authorized;
- audit history for critical actions;
- supported report preview and CSV/XLSX export where implemented and tested;
- terminal synchronization, retry and idempotency behavior;
- backup, monitoring and operational support.

### Explicitly excluded unless separately approved

- payroll calculation or tax/legal payroll determination;
- automated payroll submission;
- biometric identification;
- door access or physical security control;
- geofencing or continuous employee location tracking;
- native mobile application;
- unsupported custom integrations;
- unlimited historical retention;
- contractual high-availability or response guarantees not backed by evidence;
- production use of the Preview Portal;
- functionality that exists only in a demo fixture or unmerged PR.

## 8. Data preparation and minimization

Before live onboarding, BSS and the customer must agree the exact data fields required.

Minimum expected setup data:

- organization name and internal identifier;
- location and department structure;
- worker internal identifier;
- worker display name only where required for the agreed workflow;
- work email only for users who require portal access;
- assigned role;
- shift assignment;
- RFID credential association;
- approved leave balance/configuration where part of the pilot.

Data not required for the pilot must not be collected merely because the customer has it available.

Do not import:

- health diagnoses or medical documents;
- salary or bank details;
- tax identifiers unless a later approved function strictly requires them;
- copies of identity documents;
- private notes unrelated to attendance;
- biometric templates;
- personal location history outside the approved attendance event context.

The approved import template, field definitions, retention period and deletion/export process must be versioned before real data is received.

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

- [ ] Issue `#55` is closed and one authoritative baseline exists in `main`.
- [ ] Release commit SHA is recorded.
- [ ] Frontend and backend artifacts are reproducible from the release commit.
- [ ] Dependency and secret/security gates are green.
- [ ] Database migrations are tested forward and through the documented rollback boundary.
- [ ] Deployment procedure is executed in staging by someone following the runbook.
- [ ] Rollback procedure is rehearsed without data loss beyond the approved recovery objective.

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
- [ ] Duplicate events do not create duplicate attendance results.
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

The full dry run uses fictional test data and must be completed by following written instructions rather than relying on developer memory.

Required journey:

1. create the pilot organization and one location;
2. create departments, shifts and role assignments;
3. invite the customer administrator and supervisor;
4. add/import test workers;
5. assign and replace an RFID credential;
6. perform terminal clock-in and clock-out;
7. interrupt network access and verify recovery/synchronization;
8. review attendance as supervisor;
9. create and approve a leave request;
10. perform an authorized correction and confirm audit history;
11. generate the supported report preview and export;
12. confirm tenant isolation with a second test tenant;
13. trigger and acknowledge a test alert;
14. restore data into an isolated environment;
15. execute the documented release rollback boundary;
16. export and delete the test organization according to the documented procedure.

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

Final targets must be agreed with the customer. Recommended metric categories:

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
- attendance data cannot be reconciled and the error source is unknown;
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
| Software baseline | `BLOCKED` | Complete issue `#55` |
| Infrastructure architecture | `PROPOSED` | Approve ADR-001 and provision staging |
| Preview/sales sandbox | `IN REVIEW` | Reconstruct through issue `#58` |
| Hardware | `PARTIAL` | Complete issue `#60` |
| Legal/privacy | `OPEN` | Prepare and review agreement, DPA, notice and retention package |
| Support/incident operations | `OPEN` | Assign owners and rehearse alerts/escalation |
| Dry run | `BLOCKED` | Requires staging release, accepted hardware and documented procedures |
| Live pilot | `BLOCKED` | Requires G1–G9 complete |

## 20. Approval record

This package remains `PROPOSED` until approved by the BSS founders.

Approval of this document does not approve live data by itself. A separate per-customer go/no-go record must confirm all mandatory gates immediately before onboarding.
