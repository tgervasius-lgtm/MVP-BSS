# BSS Backup, Disaster Recovery & Business Continuity Operating System

Status: `PROPOSED v0.1 / FOUNDER, TECHNICAL AND PRIVACY APPROVAL REQUIRED`

Owner: BSS founders

Related issues: #97, #55, #59, #62, #64, #66, #75, #85, #93 and #95

## 1. Purpose

This document defines how BSS protects, restores and continues critical software, data, infrastructure, documentation, hardware operations and company functions when a system, provider, account, device, location, supplier or key person becomes unavailable.

It establishes one operating model for:

- routine backups;
- point-in-time recovery;
- full restore from an independent copy;
- disaster declaration and technical recovery;
- customer continuity during service unavailability;
- founder and key-person continuity;
- provider, domain, email and repository loss;
- hardware spare and supplier continuity;
- return to normal operation;
- recovery evidence and post-event improvement.

This document is an operating framework. It does not prove that any backup, restore, failover or continuity capability is implemented. Actual readiness requires private provider configuration, named owners, monitored jobs and successful restore drills.

It does not create a contractual SLA, legal retention rule, insurance obligation or guarantee of uninterrupted service.

## 2. Core principles

1. A successful backup job is not proof that the backup can be restored.
2. A configured retention policy is not proof that the required recovery point exists.
3. Provider-native recovery is not the only recovery path for critical data.
4. Critical data requires an independent encrypted off-platform recovery copy before live-pilot approval.
5. Recovery credentials, backup data and encryption keys must not share one uncontrolled custody point.
6. Every critical system has a primary owner, backup owner, recovery method and evidence location.
7. Every restore identifies the source, target, authorization, operator, validation and final disposition.
8. Restored data is not trusted until integrity, migration state, application compatibility, RBAC, RLS and tenant isolation are verified.
9. Customer attendance continuity uses an approved manual fallback while the system is unavailable.
10. Reconciliation must preserve original records, reasons, approvals and audit evidence.
11. Personal data remains personal data while stored in backup media.
12. Customer enthusiasm, deadlines and revenue pressure do not override a failed recovery, privacy or integrity gate.
13. RPO and RTO figures are planning targets until measured in a successful drill.
14. A planning target is not a customer promise or contractual SLA.
15. Real customer data, provider identifiers, production URLs, keys, secrets and recovery codes remain outside the public repository.
16. Recovery steps must be executable by a trained backup owner, not only by the original developer.
17. Recovery from compromise requires clean credentials and a trusted target, not only restoration of old data.
18. A disaster is not closed until service, data integrity, access control, communication and follow-up evidence are complete.

## 3. Terminology

| Term | Meaning |
|---|---|
| `Backup` | A recoverable copy or recovery point created before a failure. |
| `Restore` | The act of recovering data, configuration or a system from a backup. |
| `PITR` | Point-in-time recovery to a selected timestamp or transaction point. |
| `Incident recovery` | Restoration from a limited fault while the normal operating model remains usable. |
| `Disaster recovery` | Recovery after a major loss of platform, data, provider, account or trusted environment. |
| `Business continuity` | Maintaining essential customer and company operations while normal systems or people are unavailable. |
| `RPO` | Maximum planned amount of data loss measured in time. |
| `RTO` | Maximum planned time to restore an essential service. |
| `MTPD` | Maximum tolerable period of disruption before business impact becomes unacceptable. |
| `Failover` | Moving service to an alternate environment or path. |
| `Failback` | Controlled return from an alternate environment to the normal environment. |
| `Restore drill` | A controlled exercise that restores data or service and validates the result. |
| `Tabletop` | A scenario exercise without necessarily executing the full technical recovery. |
| `Clean environment` | A trusted recovery target not assumed to share the cause of compromise. |
| `Manual fallback` | Approved temporary business process used while BSS is unavailable. |

## 4. Status language

### 4.1 Backup statuses

| Status | Meaning |
|---|---|
| `NOT CONFIGURED` | No approved backup exists. |
| `CONFIGURED` | Backup method is configured but restore is unproven. |
| `RUNNING` | Backup job is currently executing. |
| `SUCCESS` | Backup job reports success; restorability is still unproven. |
| `FAILED` | Backup job did not complete successfully. |
| `STALE` | Last successful recovery point exceeds the approved age. |
| `UNVERIFIED` | Backup exists but content or integrity has not been checked. |
| `VERIFIED COPY` | Copy passed the defined non-destructive verification. |
| `RESTORE PROVEN` | A representative restore succeeded and validation passed. |
| `EXPIRED` | Retention period ended and deletion is due. |
| `LEGAL HOLD` | Deletion is suspended under an authorized hold. |
| `QUARANTINED` | Copy is isolated due to suspected corruption or compromise. |
| `DESTROYED` | Copy was securely deleted with evidence. |

### 4.2 Recovery statuses

| Status | Meaning |
|---|---|
| `NORMAL` | Service operates normally. |
| `DEGRADED` | Service is available with reduced capability or elevated risk. |
| `FALLBACK ACTIVE` | Approved manual or alternate process is in use. |
| `RECOVERY DECLARED` | Recovery process formally started. |
| `RESTORE IN PROGRESS` | Data or systems are being restored. |
| `VALIDATION IN PROGRESS` | Restored state is under technical and business validation. |
| `SERVICE RESTORED` | Essential service is functioning, observation remains open. |
| `PARTIAL RESTORE` | Some required components remain unavailable. |
| `FAILED RESTORE` | Restore attempt did not meet integrity or service criteria. |
| `ROLLED BACK` | Recovery or deployment was reversed to a known safe state. |
| `RETURN TO NORMAL` | Alternate or fallback operation is closed after controlled reconciliation. |
| `CLOSED` | Recovery evidence, communication and follow-up are complete. |

### 4.3 Continuity statuses

| Status | Meaning |
|---|---|
| `READY` | Required people, procedures and resources are privately proven. |
| `PARTIAL` | Some continuity controls exist but critical evidence is missing. |
| `BLOCKED` | Essential dependency or owner is unavailable. |
| `ACTIVATED` | Business continuity procedure is active. |
| `STABILIZED` | Essential operations are maintained at the agreed minimum level. |
| `RECOVERING` | Normal capabilities are being restored. |
| `STOOD DOWN` | Continuity mode ended after validation. |

## 5. Criticality model

### 5.1 Service tiers

| Tier | Description | Typical BSS examples |
|---|---|---|
| `C1 — Critical` | Loss blocks attendance integrity, customer access, security control or company custody. | production database, authentication, tenant isolation, domain/DNS, primary source repository, password manager custody |
| `C2 — Essential` | Loss materially disrupts operations but approved fallback may exist. | backend service, customer portal, monitoring, support email, terminal fleet records, customer configuration exports |
| `C3 — Important` | Loss delays work but does not immediately block essential service. | CRM, finance management workbook, vendor register, training materials, staging environment |
| `C4 — Replaceable` | Can be recreated with manageable effort and no critical data loss. | disposable Preview fixtures, generated build artifacts, local development caches |

A system is classified by business impact, not by technical complexity or purchase price.

### 5.2 Data classes for recovery

| Class | Content | Recovery expectation |
|---|---|---|
| `D1 — Authoritative regulated/customer data` | attendance records, approved corrections, leave records, audit evidence | strongest integrity, encryption, access and restore validation |
| `D2 — Security and operational evidence` | audit logs, incident evidence, access approvals, release records | protected retention and traceability |
| `D3 — Company operational records` | contracts index, finance records, CRM, asset records, vendor decisions | recoverable through private controlled systems |
| `D4 — Versioned product sources` | source code, OpenAPI, migrations, documentation, CAD/source files | multiple controlled copies and reproducible history |
| `D5 — Rebuildable/generated data` | caches, generated bundles, temporary exports | backup only where recovery benefit justifies cost |

## 6. Proposed RPO and RTO planning targets

All values in this section are `PROPOSED / UNPROVEN / NON-CONTRACTUAL`.

The infrastructure baseline currently uses a pilot planning target of:

- primary database RPO: `≤ 15 minutes`;
- essential platform RTO: `≤ 4 hours`.

These values are not approved SLA commitments and must not be published to customers until:

- provider configuration exists;
- monitoring proves the recovery-point cadence;
- an independent copy exists;
- a clean restore succeeds;
- end-to-end application validation succeeds;
- founders approve customer-facing terms;
- signed customer documents include the applicable commitment.

### 6.1 Planning table

| Service/data | Criticality | Proposed RPO | Proposed RTO | Proof required |
|---|---|---:|---:|---|
| Primary customer database | C1 / D1 | ≤15 min | ≤4 h | PITR and independent logical restore drill |
| Authentication and tenant access | C1 | configuration-defined | ≤4 h | clean environment recovery and RBAC/RLS validation |
| Source code and migrations | C1 / D4 | last pushed commit | ≤4 h | alternate clone and build from controlled account |
| Domain and DNS | C1 | last approved config change | OPEN | recovery or transfer procedure test |
| Secrets metadata and access inventory | C1 / D2 | last approved update | OPEN | password-manager recovery drill without exposing values |
| Customer portal/backend | C2 | last deployable release | ≤4 h planning target | reproducible deploy and smoke validation |
| Monitoring and alerting | C2 | last approved config | OPEN | independent alert path test |
| Support communication | C2 | last synchronized mailbox state | OPEN | alternate channel activation test |
| Terminal configuration register | C2 / D3 | last approved change | OPEN | export and reconstruction test |
| CRM and finance operations | C3 / D3 | business-defined | OPEN | private export and recovery test |
| Preview fixtures | C4 / D5 | none required | rebuild | deterministic rebuild from repository |

Any `OPEN` value remains undecided and must not be invented during sales, contracting or incident communication.

## 7. Authoritative continuity inventory

The real inventory is private. The public repository contains only the template and required fields.

### 7.1 System inventory fields

| Field | Required content |
|---|---|
| System ID | Non-sensitive internal identifier |
| System name | Service or capability |
| Criticality tier | C1–C4 |
| Data class | D1–D5 |
| Primary owner | Named private record |
| Backup owner | Named private record |
| Provider | Private inventory reference |
| Region | Approved region or `OPEN` |
| Authoritative source | Exact system of record |
| Backup method | Snapshot, PITR, export, replica, repository or rebuild |
| Independent copy | Yes/no and private reference |
| Encryption | At rest/in transit and owner |
| Recovery credential owner | Private IAM reference |
| Proposed RPO/RTO | Approved planning values |
| Last successful backup | Private timestamp |
| Last restore drill | Private timestamp and evidence ID |
| Known gaps | Explicit blockers |
| Recovery runbook | Versioned path or private reference |

### 7.2 Minimum inventory scope

The inventory must cover at least:

- GitHub repository and release artifacts;
- backend hosting;
- managed PostgreSQL;
- independent logical database backup;
- domain registration and DNS;
- Cloudflare or equivalent edge configuration;
- monitoring and error tracking;
- support and company email;
- password manager;
- infrastructure configuration;
- secrets metadata;
- customer and pilot configuration exports;
- audit and incident evidence;
- CRM;
- finance/accounting exports;
- legal and signed-document storage;
- hardware BOM, CAD/source and asset registers;
- terminal configuration and recovery media where applicable.

## 8. Backup architecture requirements

### 8.1 Recovery layers

Critical data should have multiple recovery layers with different failure assumptions:

1. **Versioned primary source** — normal authoritative system.
2. **Provider-native recovery** — PITR, snapshots or provider-managed history.
3. **Independent encrypted copy** — copy stored outside the primary failure domain.
4. **Reproducible configuration** — code, migrations, infrastructure documentation and manifests.
5. **Human continuity evidence** — runbooks, owners, recovery access and decision records.

One layer must not be represented as all five layers.

### 8.2 Separation requirements

For C1 systems:

- primary data and independent backup must not rely on one provider account only;
- backup access should be more restricted than ordinary application access;
- backup deletion authority should be separated where practical;
- encryption-key custody must have a recovery path;
- the same compromised credential must not control production, backup and deletion without additional controls;
- monitoring should detect stale or failed backup jobs;
- backup evidence must not contain secret values.

### 8.3 Backup-copy record

| Field | Required content |
|---|---|
| Backup ID | Unique non-sensitive ID |
| Source system | Inventory system ID |
| Backup type | PITR, snapshot, logical export, repository mirror, configuration export |
| Start/end time | Timestamp |
| Recovery point | Timestamp or commit/tag |
| Result | success, failed, partial, stale |
| Encryption status | Evidence without key value |
| Storage class | Provider-native or independent |
| Retention class | Approved category |
| Integrity check | Method and result |
| Monitoring evidence | Job or alert reference |
| Restore eligibility | eligible, quarantined, expired, legal hold |
| Owner | Private identity reference |

## 9. Backup schedules and retention

Actual schedules and retention values remain `OPEN` until infrastructure, customer instructions, statutory requirements, costs and privacy review are finalized.

The schedule must distinguish:

- database PITR window;
- recurring logical full export;
- configuration and infrastructure export;
- repository and release source history;
- signed/legal records;
- finance/accounting records;
- CRM and customer configuration;
- terminal and asset registers;
- audit and incident evidence;
- temporary exports and generated reports.

### 9.1 Retention rules

1. Retention must have a documented purpose.
2. Personal-data backups must not be retained indefinitely by default.
3. Legal hold must be explicitly authorized and logged.
4. Customer offboarding must define active deletion, backup expiry and certificate evidence.
5. Deleting active data does not necessarily remove it immediately from immutable recovery media; the expiry process must be documented.
6. Backup retention must align with customer instructions, statutory obligations and the GDPR baseline.
7. A longer retention period requires a reason, owner and review date.
8. Expired backups must be securely destroyed through the approved provider or media process.
9. Destruction evidence must not reveal sensitive paths, secrets or customer data.

## 10. Backup monitoring

Backup monitoring must detect:

- failed jobs;
- missed schedules;
- stale recovery points;
- storage exhaustion;
- encryption failure;
- incomplete uploads;
- invalid or zero-byte exports;
- checksum mismatch;
- unexpected deletion;
- disabled backup configuration;
- retention-policy drift;
- owner or notification-channel failure.

### 10.1 Alert record

| Field | Required content |
|---|---|
| Alert ID | Unique identifier |
| System/backup | Affected inventory item |
| Trigger time | Timestamp |
| Detected condition | Failure or drift |
| Current recovery-point age | Measured age |
| RPO impact | within target, at risk, exceeded, unknown |
| Owner | Assigned responder |
| Immediate action | Retry, investigate, isolate or escalate |
| Resolution evidence | Job result or corrective action |
| Follow-up | Preventive improvement |

Backup-alert silence is not proof that backups are healthy.

## 11. Restore authorization

### 11.1 Restore request fields

| Field | Required content |
|---|---|
| Restore ID | Unique identifier |
| Reason | Drill, incident, investigation, customer request or migration |
| Source system | Inventory ID |
| Requested recovery point | Timestamp, backup ID or commit |
| Target environment | Clean test, staging, isolated recovery or production |
| Data scope | Full, tenant, table, object or configuration |
| Personal-data impact | Yes/no and category |
| Authorization | Required owner approval |
| Operator | Named authorized person |
| Validation owner | Separate reviewer where practical |
| Customer/controller instruction | Required where applicable |
| Security assessment | Required for compromise scenarios |
| Deletion plan | Treatment of temporary restored data |

### 11.2 Hard blockers

A restore must not begin when:

- the source backup identity is unknown;
- the backup is suspected compromised and no isolation plan exists;
- the operator lacks approved access;
- the target environment is not isolated as required;
- encryption/recovery credentials cannot be verified;
- the requested customer-data restore lacks authority;
- legal hold or deletion conflict is unresolved;
- restore may overwrite authoritative evidence without an approved plan;
- rollback or stop conditions are missing for a production restore.

## 12. Standard restore workflow

1. Confirm incident or drill scope.
2. Assign recovery lead and technical operator.
3. Record authorization.
4. Identify required recovery point.
5. Confirm backup integrity and eligibility.
6. Prepare isolated or clean target.
7. Protect current evidence before overwrite.
8. Restore data or system.
9. Apply the correct application and migration version.
10. Validate database schema and migration history.
11. Validate row counts, constraints and representative records.
12. Validate authentication and session behavior.
13. Validate RBAC and least privilege.
14. Validate RLS and cross-tenant isolation.
15. Validate audit and correction history.
16. Validate reporting/export behavior.
17. Validate terminal sync and idempotency where applicable.
18. Run security and smoke tests.
19. Obtain technical and business validation.
20. Decide go-live, continue investigation, retry or abort.
21. Communicate status.
22. Dispose of temporary recovery data according to the approved plan.
23. Record actual RPO, RTO, gaps and corrective actions.

## 13. Database recovery validation

A database restore is not complete when PostgreSQL starts successfully.

Minimum validation includes:

- expected database and schema exist;
- migration table matches the intended application version;
- required extensions exist;
- constraints and indexes exist;
- no migration remains partially applied;
- representative tenant rows exist;
- tenant A cannot access tenant B data;
- role and permission mappings are correct;
- session and invitation states are consistent;
- RFID assignments are unique and valid;
- attendance events remain ordered and attributable;
- corrections preserve original values and reasons;
- vacation balances and approvals remain consistent;
- audit entries remain available and immutable under the model;
- export totals reconcile with known fixtures;
- backup timestamp and measured data loss are recorded.

### 13.1 Restore result

| Result | Meaning |
|---|---|
| `PASS` | All critical validation checks passed. |
| `CONDITIONAL PASS` | Non-critical gaps have owners and due dates; production use requires explicit approval. |
| `FAIL` | Integrity, security, isolation or application validation failed. |
| `BLOCKED` | Required evidence, access or dependency is unavailable. |

A failed tenant-isolation, security or data-integrity check is always a restore `FAIL`.

## 14. Clean recovery after compromise

When compromise is suspected:

1. do not assume the existing environment is trustworthy;
2. preserve forensic evidence where authorized;
3. revoke or rotate affected credentials;
4. identify the earliest trusted recovery point;
5. prepare a clean target using trusted source and configuration;
6. validate dependencies and build artifacts;
7. scan restored code and configuration;
8. restore data under controlled credentials;
9. verify no unauthorized identity, key or persistence remains;
10. validate logs, IAM, RBAC and tenant isolation;
11. reissue service and device credentials as needed;
12. return service progressively;
13. monitor for recurrence;
14. complete security and privacy incident review.

Restoring a compromised snapshot without removing the cause is not recovery.

## 15. Scenario runbooks

### 15.1 Primary database unavailable

Immediate actions:

- declare severity under Support & Incident OS;
- stop unsafe writes or place service in controlled degraded mode;
- activate customer manual fallback if attendance recording is affected;
- confirm provider status and latest valid recovery point;
- decide provider-native restore, failover or clean restore;
- preserve current evidence;
- restore and validate;
- communicate measured data-loss window;
- reconcile manual records after approval.

### 15.2 Accidental destructive database change

- stop additional writes where safe;
- identify exact change time;
- preserve logs and current state;
- select PITR point before the destructive event;
- restore into isolation first;
- compare lost and subsequent legitimate writes;
- define approved merge/reconciliation plan;
- validate tenant isolation and audit evidence;
- obtain go/no-go decision.

### 15.3 Hosting provider outage

- confirm provider incident and scope;
- activate incident command;
- determine whether waiting remains within planning RTO;
- prepare alternate deployment only from approved release evidence;
- restore database through the approved recovery path;
- update DNS only under authorized change control;
- validate service before customer traffic;
- monitor and decide failback later.

### 15.4 Hosting account compromised

- invoke IAM compromise process;
- revoke sessions, tokens and service credentials;
- protect backup deletion authority;
- isolate affected resources;
- use a clean BSS-controlled recovery account/path;
- restore from trusted source;
- rotate customer-facing and terminal credentials where applicable;
- complete breach assessment.

### 15.5 Domain or DNS control lost

- invoke registrar/DNS recovery procedure;
- use private account and ownership evidence;
- activate alternate customer communication channel;
- do not send customers unverified emergency links;
- restore known approved DNS configuration;
- validate TLS, redirects, API endpoints and email records;
- rotate relevant credentials after account compromise.

### 15.6 GitHub repository unavailable or account lost

- use alternate authorized founder account and recovery process;
- restore access through organization custody;
- use an approved local/off-platform clone where necessary;
- verify commit history and signatures;
- compare against last known release SHA;
- rebuild in an isolated environment;
- revoke compromised tokens and deploy keys;
- confirm branch protection and required checks after recovery.

### 15.7 Company email unavailable

- activate approved alternate communication route;
- prevent unauthorized password-reset use;
- restore domain/email control;
- verify forwarding, aliases, recovery addresses and MFA;
- communicate only through pre-agreed channels;
- preserve support-case continuity.

### 15.8 Monitoring unavailable

- declare observability degradation;
- use provider-native and manual checks;
- increase controlled verification cadence;
- avoid high-risk releases while blind;
- restore alerting before declaring full recovery.

### 15.9 Password manager or recovery access unavailable

- invoke break-glass process;
- require two-person verification where practical;
- restore custody without exposing values in chat or repository;
- rotate credentials whose secrecy is uncertain;
- review why normal recovery failed.

### 15.10 Terminal unavailable at customer site

- activate manual attendance fallback;
- record outage start and affected workers;
- use an accepted spare or replacement only;
- preserve terminal asset and configuration evidence;
- repair or replace through Asset Management OS;
- reconcile records after supervisor approval;
- do not silently fabricate missing clock events.

## 16. Customer manual fallback

The customer fallback package must include:

- outage start time;
- affected location and terminal;
- named customer supervisor;
- approved paper or controlled digital template;
- worker identifier minimization;
- clock-in/out or absence fields;
- correction reason;
- supervisor signature/approval;
- safe storage during outage;
- transfer to BSS after restoration;
- reconciliation owner;
- audit evidence;
- fallback close time.

### 16.1 Reconciliation rules

1. Original system events remain preserved.
2. Manual records are entered as corrections or approved supplemental events.
3. Each correction records source, reason, actor and approver.
4. Duplicate events are detected before import.
5. Conflicts are escalated to the customer decision owner.
6. BSS does not make disciplinary or payroll decisions.
7. Final export is reviewed by the customer.
8. Fallback records are retained or deleted according to the approved legal/privacy process.

## 17. Disaster declaration

A disaster may be declared when one or more of the following occurs:

- primary platform and normal recovery path are unavailable;
- authoritative customer data is lost or suspected corrupted;
- provider or account control is lost;
- normal RTO is likely to be exceeded;
- a compromise makes the existing environment untrusted;
- multiple critical systems fail together;
- both founders cannot access a critical company system;
- domain/email loss blocks secure customer communication;
- the first recovery attempt fails a critical validation check.

### 17.1 Declaration record

| Field | Required content |
|---|---|
| Event ID | Incident/disaster identifier |
| Declaration time | Timestamp |
| Declared by | Authorized owner |
| Trigger | Observed condition |
| Affected systems | Inventory IDs |
| Customer impact | Known scope |
| Data impact | Known or suspected |
| Current RPO/RTO risk | Within, at risk, exceeded, unknown |
| Incident commander | Named private record |
| Technical recovery lead | Named private record |
| Customer communication lead | Named private record |
| Privacy/security lead | Named private record |
| Continuity mode | Manual fallback or alternate operation |
| Next decision time | Timestamp |

## 18. Recovery roles

| Role | Responsibility |
|---|---|
| Incident commander | Owns coordination, priorities and decision cadence. |
| Recovery lead | Owns technical recovery plan and execution. |
| Database owner | Owns backup selection, restore and integrity validation. |
| Infrastructure owner | Owns provider, network, DNS and deployment recovery. |
| Security owner | Owns compromise containment, credential rotation and trusted-state review. |
| Privacy lead | Coordinates personal-data assessment and controller notification workflow. |
| Customer communication owner | Sends approved, factual updates. |
| Business continuity owner | Maintains minimum customer and company operations. |
| Evidence recorder | Maintains timestamps, decisions, actions and artifacts. |
| Founder decision owner | Approves material cost, customer promise and return-to-service decisions. |

One person may temporarily hold more than one role in the two-founder stage, but roles and decisions must still be recorded distinctly.

## 19. Recovery priorities

Default recovery order:

1. safety and security containment;
2. control of identities, domain, credentials and backups;
3. preservation of evidence;
4. customer manual fallback and communication;
5. authoritative database recovery;
6. authentication, RBAC and tenant isolation;
7. essential backend and customer access;
8. monitoring and alerting;
9. terminal synchronization and reporting;
10. support, CRM, finance and secondary operations;
11. return to normal and cleanup.

A different order requires a documented reason.

## 20. Communication

### 20.1 Internal update template

- Event ID:
- Current status:
- Confirmed impact:
- Unknowns:
- Recovery action in progress:
- Manual fallback status:
- RPO/RTO status:
- Security/privacy status:
- Next decision time:
- Owner:

### 20.2 Customer acknowledgement template

> BSS is investigating an interruption affecting [confirmed capability]. The approved fallback process should be used until further notice. We will provide the next factual update at [time]. We will not speculate about data loss until recovery validation is complete.

### 20.3 Restoration template

> The affected capability has been restored and is under observation. BSS and the customer owner must complete the agreed validation and reconciliation steps before the event is considered closed.

### 20.4 Prohibited wording

Do not state:

- “no data was lost” before measured validation;
- “everything is fixed” while observation remains open;
- “zero downtime” or “guaranteed recovery”;
- “backup is safe” without restore evidence;
- “GDPR compliant” as a blanket certification;
- “customer action is not required” when manual reconciliation remains open;
- unsupported blame of a provider or individual.

## 21. Business continuity for founder unavailability

### 21.1 Trigger examples

- one founder is unexpectedly unavailable;
- both founders lose devices or account access;
- illness or travel prevents normal approvals;
- critical knowledge exists with only one founder;
- one founder cannot be contacted during an incident;
- legal authority or company-signing capability is unclear.

### 21.2 Minimum continuity controls

- every critical area has a primary and backup owner;
- critical systems use company-controlled custody;
- password-manager recovery is tested privately;
- domain, GitHub, hosting and email have a backup admin;
- active customer and vendor commitments are visible in private registers;
- current release and environment state are documented;
- payment and spending authority is documented;
- emergency decisions are limited to the minimum safe scope;
- unavailable founder access is suspended where compromise is possible;
- temporary authority has an expiry and review.

### 21.3 Founder-unavailability checklist

1. Confirm expected duration and security status.
2. Activate backup owner.
3. Review open customer, incident, finance and vendor commitments.
4. Verify critical access and recovery methods.
5. Freeze high-risk changes if required.
6. Notify only parties who need operational information.
7. Record temporary decisions.
8. Review decisions with both founders when normal operation resumes.

This operating process does not replace legal documents for incapacity, inheritance, director authority or ownership transfer.

## 22. Supplier and hardware continuity

Continuity planning must cover:

- unavailable component model;
- discontinued component revision;
- sole-source enclosure or display;
- delayed manufacturer;
- unavailable installer;
- failed spare terminal;
- unknown asset location;
- loss of CAD/BOM source files;
- warranty or repair provider failure.

### 22.1 Controls

- exact approved parts and revisions are documented;
- substitute parts require compatibility review and retest;
- accepted spare policy is defined before live pilot;
- source CAD/BOM files remain BSS-controlled;
- vendor contact and alternate paths exist privately;
- customer manual fallback does not depend on spare delivery;
- asset custody and return paths remain current;
- critical tools and fixtures have owners and verification status.

Actual minimum stock and reorder levels remain `OPEN` until real pilot data exists.

## 23. Continuity for company records

Critical company records include:

- company formation and ownership documents;
- signed customer and vendor agreements;
- accounting and tax records;
- grant/subsidy evidence;
- insurance records where applicable;
- IP/source ownership evidence;
- access and decision registers;
- customer configuration and support evidence;
- asset and serial records.

These records must have:

- an authoritative private location;
- access owner and backup owner;
- backup/export path;
- retention category;
- recovery test appropriate to criticality;
- no dependence on one founder’s personal device or private mailbox only.

## 24. Return to normal operation

Return to normal requires:

- essential service validation passed;
- manual fallback closed or controlled;
- data reconciliation complete or tracked;
- customer communication sent;
- security and privacy actions complete or assigned;
- monitoring restored;
- alternate credentials reviewed;
- temporary access revoked;
- recovered environment documented;
- backup protection resumed;
- failback risk assessed;
- decision record approved.

### 24.1 Failback rules

- do not fail back only because the original provider is available again;
- compare configurations and data states;
- define synchronization direction;
- preserve evidence before destructive changes;
- perform progressive traffic transfer where possible;
- keep rollback path until observation succeeds;
- close temporary environments and credentials safely.

## 25. Post-recovery review

The review must capture:

- what failed;
- first detection time;
- declaration time;
- fallback activation time;
- recovery point used;
- measured data loss;
- measured restoration time;
- validation failures;
- customer impact;
- security/privacy impact;
- communication quality;
- manual reconciliation volume;
- backup or runbook gaps;
- access or key-person gaps;
- cost and vendor impact;
- corrective actions, owners and deadlines.

The purpose is system improvement, not unsupported blame.

## 26. Drill programme

### 26.1 Drill types

| Drill | Purpose |
|---|---|
| Backup verification | Confirm expected copy exists and is readable. |
| Logical database restore | Restore full database to isolated environment. |
| PITR drill | Restore to a precise pre-event point. |
| Clean-environment rebuild | Recreate service from trusted sources. |
| Domain/DNS tabletop | Test ownership and communication recovery. |
| GitHub custody drill | Confirm alternate owner can clone and build. |
| IAM recovery drill | Test controlled account and recovery access. |
| Manual fallback drill | Test customer attendance continuity and reconciliation. |
| Founder unavailability tabletop | Test backup ownership and decision continuity. |
| Full disaster simulation | Combine provider loss, data restore and customer communication. |

### 26.2 Suggested planning cadence

Cadence remains `PROPOSED` until approved:

- backup-job review: recurring operational review;
- representative restore: before live pilot and after material architecture change;
- full database restore: periodically based on risk;
- PITR test: before production approval and after provider changes;
- continuity tabletop: before first pilot and after role changes;
- full disaster simulation: before claiming mature production readiness.

No cadence is considered implemented until scheduled ownership and evidence exist.

## 27. Fictional dry run A — database loss and restore

All names, data and times are fictional.

### 27.1 Scenario

A fictional pilot database receives an accidental destructive migration at 10:20. Writes are stopped at 10:24. The last valid PITR point is 10:19.

### 27.2 Process

1. Incident `DRY-DB-001` declared.
2. Customer fallback activated at 10:28.
3. Existing database preserved for evidence.
4. Restore authorized to isolated recovery environment.
5. PITR performed to 10:19.
6. Correct application release and migrations applied.
7. Fixture tenant counts reconciled.
8. RBAC test passed.
9. Cross-tenant RLS test passed.
10. Attendance and correction audit test passed.
11. Report export reconciled.
12. Recovery approved for controlled return.
13. Five minutes of fictional manual records entered as approved corrections.
14. Observation completed.

### 27.3 Fictional result

- measured RPO: 5 minutes;
- measured technical restore: 1 hour 12 minutes;
- full service restoration: 1 hour 46 minutes;
- result: `PASS` for the fictional scenario;
- production evidence: none;
- customer SLA claim: none.

The fictional result must never be presented as actual BSS recovery performance.

## 28. Fictional dry run B — provider and founder unavailability

All names and conditions are fictional.

### 28.1 Scenario

The primary hosting provider is unavailable while the founder who normally manages infrastructure cannot be contacted for one day.

### 28.2 Process

1. Backup founder activates continuity mode.
2. Private access inventory confirms alternate hosting, DNS and repository custody.
3. High-risk releases are frozen.
4. Customer communication owner activates the fallback message.
5. Approved release candidate is rebuilt from GitHub.
6. Independent fictional database backup is restored to an isolated alternate environment.
7. DNS change is prepared but not published before validation.
8. Authentication, RLS, exports and monitoring checks pass.
9. Controlled DNS cutover is approved.
10. Temporary access is time-limited.
11. Original founder returns and reviews all decisions.
12. Temporary credentials are revoked.

### 28.3 Fictional result

- essential customer operations maintained through manual fallback;
- alternate environment restored within the fictional planning target;
- no real provider configuration or evidence exists;
- result: `TABLETOP PASS / IMPLEMENTATION UNPROVEN`.

## 29. Recovery evidence index

| Evidence ID | Required proof |
|---|---|
| `BCP-001` | Private critical-service inventory |
| `BCP-002` | Approved owner and backup-owner matrix |
| `BCP-003` | Backup architecture and failure-domain map |
| `BCP-004` | Database PITR configuration evidence |
| `BCP-005` | Independent encrypted backup evidence |
| `BCP-006` | Backup monitoring and alert evidence |
| `BCP-007` | Successful logical restore report |
| `BCP-008` | Successful PITR report |
| `BCP-009` | RBAC/RLS/tenant-isolation validation report |
| `BCP-010` | Domain/DNS and email recovery evidence |
| `BCP-011` | GitHub and source rebuild evidence |
| `BCP-012` | Customer manual fallback drill |
| `BCP-013` | Founder/key-person continuity tabletop |
| `BCP-014` | Disaster communication and decision log |
| `BCP-015` | Post-recovery corrective-action record |

Evidence values, locations, customer identities and credentials remain private.

## 30. Approval gates

### Gate B1 — Framework

Required:

- document merged;
- criticality, statuses and templates defined;
- responsibilities linked to related BSS OS documents.

### Gate B2 — Private implementation

Required:

- actual inventory completed;
- primary and backup owners assigned;
- provider-native recovery configured;
- independent encrypted copy configured;
- monitoring and alert routing configured;
- recovery access and key custody privately documented.

### Gate B3 — Restore proof

Required:

- logical database restore passes;
- PITR restore passes;
- application and migration validation passes;
- RBAC/RLS and tenant-isolation tests pass;
- measured RPO/RTO recorded;
- temporary restored data securely handled.

### Gate B4 — Business continuity proof

Required:

- customer manual fallback drill passes;
- reconciliation drill passes;
- domain/email/GitHub custody tabletop passes;
- founder unavailability tabletop passes;
- hardware spare and supplier continuity gaps reviewed.

### Gate B5 — Live-pilot approval

Required:

- issues #55 and #59 readiness dependencies satisfied;
- Pilot Readiness critical gates satisfied;
- GDPR/legal requirements satisfied;
- support and incident ownership active;
- release and IAM controls implemented;
- no critical recovery blocker open;
- founder go/no-go recorded.

Merging this document completes only Gate B1.

## 31. Open decisions

The following remain `OPEN`:

- final RPO and RTO by service;
- customer-facing SLA commitments;
- provider-native PITR retention;
- independent backup provider and region;
- encryption-key custody model;
- backup deletion separation;
- exact backup cadence and retention;
- legal-hold authorization process;
- customer offboarding backup-expiry period;
- recovery communication channels;
- alternate hosting/failover strategy;
- minimum hardware spare stock;
- drill cadence and owners;
- insurance or contractual requirements;
- final cost approval.

Open values must not be silently converted into assumed policy.

## 32. Final operating rule

A backup configuration, green backup job, provider promise, document or fictional drill is not recovery readiness.

BSS may claim recovery readiness only for the exact systems and scenarios for which a controlled restore, integrity validation, access-control validation, continuity exercise and evidence package have actually succeeded.