# BSS GDPR & Data Governance Baseline

| Field | Value |
|---|---|
| Status | `PROPOSED / LIVE-PILOT BLOCKER` |
| Version | `0.1` |
| Date | `2026-08-05` |
| Owner | BSS Product Owner |
| Related issue | `#64` |
| Applies to | BSS MVP, Preview, staging, pilot production, terminal, exports, backups and support |
| Does not replace | Customer-specific legal advice, signed DPA, privacy notice, DPIA or employment-law review |

## 1. Purpose

This document establishes the minimum privacy and data-governance baseline required before BSS processes real worker data.

It converts privacy from a general promise into explicit roles, data categories, retention rules, access boundaries, processor duties, evidence and go-live blockers.

No live pilot may start merely because the software works. The privacy gates in this document must also be completed and evidenced.

## 2. Authoritative legal and product references

Primary external references:

- Regulation (EU) 2016/679 (GDPR), especially Articles 5, 6, 12–22, 25, 28, 30, 32–36 and 44–49;
- EDPB Guidelines 07/2020 on controller and processor concepts;
- Croatian `Pravilnik o sadržaju i načinu vođenja evidencije o radnicima zaposlenim kod poslodavca`, NN 55/2024;
- AZOP guidance on controller/processor roles, records of processing and DPIA;
- AZOP list of processing operations requiring a DPIA, including employee-data processing through systems used to monitor work.

Primary repository references:

- `BSS_MVP_SCOPE_FREEZE_V1.md`;
- `BACKEND_ARCHITECTURE.md`;
- `BSS_READINESS_MATRIX.md`;
- `docs/bss-os/PILOT_READINESS_PACKAGE.md`;
- `docs/bss-os/ADR-001-INFRASTRUCTURE-BASELINE.md`;
- issue `#55` for the authoritative backend baseline;
- issue `#59` for approved infrastructure;
- issue `#64` for privacy implementation and evidence.

Where this document conflicts with binding law, binding law prevails. Where customer-specific employment rules, collective agreements or sector rules require additional data or retention, the customer controller must document that requirement before configuration.

## 3. Role model

### 3.1 Customer as controller

For employee attendance, leave, corrections and employment reports, the customer/employer normally determines:

- why worker data is processed;
- which workers and locations are in scope;
- which attendance and absence categories are legally required;
- who may access the data;
- the applicable legal basis;
- retention and legal-hold requirements;
- whether and how employee representatives must be informed or consulted;
- how data-subject requests are decided;
- whether a record may be corrected, restricted, exported or deleted.

The customer is therefore normally the controller for customer worker data.

### 3.2 BSS as processor

BSS normally processes customer worker data only:

- on documented customer instructions;
- under an Article 28 data-processing agreement;
- for operation, maintenance, security, support, backup and customer-approved exports;
- with approved subprocessors;
- within the agreed region and transfer safeguards;
- without using customer worker data for advertising, unrelated analytics, model training or sale.

BSS must immediately flag an instruction that appears to violate data-protection law and must not independently expand the purpose of customer worker processing.

### 3.3 BSS as independent controller

BSS may separately be a controller for limited data relating to its own business, such as:

- customer decision-maker and administrator contact details;
- contract, invoicing and payment records;
- BSS account administration;
- security records needed to protect BSS services;
- support correspondence and incident coordination;
- sales leads and consented marketing preferences, outside the MVP product database.

These controller activities require their own privacy notice, legal basis, retention and record of processing. They must not be mixed with customer employee datasets.

### 3.4 Subprocessors

A provider is not approved merely because its service runs in the EU. BSS must record:

- legal entity and service;
- processing purpose;
- data categories;
- production and backup regions;
- support/administrative access locations;
- DPA status;
- subprocessor chain;
- transfer mechanism and supplementary safeguards where applicable;
- notice/change process;
- exit and deletion capability.

The initial register must cover at least hosting, managed PostgreSQL, DNS/CDN, monitoring/error tracking, transactional email, object storage/backup and customer-support tools.

## 4. Mandatory privacy gates

| Gate | Requirement | Current status | Evidence required |
|---|---|---|---|
| P1 | Controller/processor roles approved | `OPEN` | responsibility matrix and signed DPA |
| P2 | Customer legal bases and purposes documented | `OPEN` | customer processing specification |
| P3 | Data inventory and ROPA completed | `OPEN` | versioned controller and processor records |
| P4 | Croatian pilot DPIA completed before processing | `OPEN / BLOCKING` | approved customer-specific DPIA |
| P5 | Worker privacy information ready | `OPEN` | approved notice and delivery evidence |
| P6 | Subprocessor register approved | `OPEN` | DPA, regions, transfer and change records |
| P7 | Retention/deletion/legal hold implemented | `OPEN` | configured policy plus automated test evidence |
| P8 | Rights-request assistance tested | `OPEN` | access/export/correction/restriction/deletion dry run |
| P9 | Breach process rehearsed | `OPEN` | tabletop report and notification contacts |
| P10 | Technical and organisational measures proven | `PARTIAL` | CI, access review, restore drill and production evidence |
| P11 | Tenant offboarding tested | `OPEN` | final export, revocation, deletion and backup-expiry evidence |
| P12 | Final Croatian legal/privacy review complete | `OPEN / EXTERNAL` | dated written approval or tracked required changes |

`READY FOR LIVE PILOT` is prohibited while any blocking gate is open.

## 5. Data minimisation rules

BSS MVP may process only data needed for frozen attendance, leave, correction, reporting, security and support purposes.

### 5.1 Data not collected by default

The MVP must not collect or require:

- OIB;
- home address;
- private bank-account data;
- identity-document copies;
- salary, tax or contribution calculations;
- medical diagnosis, medical documents or free-text health descriptions;
- fingerprint, face template, voiceprint or other biometric identifier;
- GPS coordinates, geofencing or continuous location data;
- private communications or web-usage monitoring;
- automated personality, productivity or disciplinary profiles.

A future request for any of these items is a material scope and privacy change requiring a new legal analysis, DPIA update, design review and Product Owner approval.

### 5.2 RFID/NFC rule

RFID/NFC card identifiers are identifiers, not biometric data.

BSS must:

- hash the UID with a protected server-side secret;
- display only a mask or operational label;
- prevent UID values from appearing in logs, exports and audit payloads;
- preserve assignment/block history without exposing the raw UID;
- allow card replacement without rewriting historical attendance evidence.

### 5.3 Absence and health-related information

The system may need a legally defined absence category or number of absence hours. It must not collect the diagnosis or underlying medical narrative.

Rules:

- use controlled codes, not unrestricted health free text;
- restrict health-revealing categories to roles that genuinely require access;
- exclude such details from dashboards, general activity feeds and support screenshots;
- treat any health-related absence data as elevated-risk data;
- document the Article 9 condition and Croatian employment-law basis where special-category data is processed.

### 5.4 Human decision rule

BSS may calculate or flag late, incomplete, duplicate or inconsistent records. It must not automatically issue disciplinary warnings, reduce pay, terminate employment or make another legally significant employment decision.

An authorised human must review the source data, correction history and context before acting.

## 6. Processing inventory

### 6.1 Organisation and workforce configuration

| Item | Examples | Purpose | Sensitivity |
|---|---|---|---|
| Organisation | name, timezone, holidays | tenant configuration and lawful time calculation | low/business |
| Department/job | department, position, manager assignment | scope, scheduling and authorisation | ordinary personal data when linked to a worker |
| Worker profile | name, internal identifier, work email, status | identity and employment-record operation | ordinary personal data |
| Work arrangement | shift, planned hours, tolerance, department | attendance and entitlement calculation | employment data |
| Leave allowance | annual allowance, used/planned balance | leave workflow | employment data |

No field from this category may silently become mandatory without a documented necessity assessment.

### 6.2 Authentication and account security

| Item | Processing rule |
|---|---|
| Email/account ID | used for account and invitation identity only |
| Password | Argon2id hash only; plaintext never stored or logged |
| Session/refresh token | hash only; rotation and revocation required |
| Invitation token | one-time hash, expiry and revocation |
| IP/user-agent | hash or minimise for security correlation; not employee location tracking |
| Login events | retain only what is needed for security, audit and incident investigation |

### 6.3 Attendance and terminal evidence

Data includes:

- worker reference;
- date and organisation timezone;
- device and server timestamps;
- clock-in/clock-out and derived daily duration;
- shift and relevant work-time classifications;
- event source;
- terminal/device event ID;
- sync/duplicate/rejected state;
- raw append-only evidence and derived attendance-day record;
- correction links and version history.

No GPS location is part of MVP attendance evidence.

### 6.4 Leave, absence and corrections

Data may include:

- requested dates;
- controlled absence type;
- requested and approved workdays/hours;
- status and decision timestamp;
- authorised decision-maker;
- minimum necessary reason;
- original and corrected attendance values;
- immutable decision/audit link.

Free-text reasons must have length limits, user warnings and role-restricted display. Customers should prefer controlled reason codes wherever feasible.

### 6.5 Reports and exports

Reports and exports replicate authorised source data and therefore inherit the same classification, tenant scope and retention obligations.

Every export must record:

- requester;
- tenant and scope;
- filter set;
- generation time;
- version/checksum;
- expiry or retention status;
- download/access events.

Exports must not be emailed as unprotected attachments by default.

### 6.6 Audit, logs and monitoring

Audit may include actor, role, action, entity, before/after values, request ID and time. It must exclude secrets, passwords, session tokens and raw RFID UIDs.

Operational logs must use data minimisation:

- no request/response body logging by default;
- no cookies, authorisation headers or export contents;
- pseudonymous identifiers where possible;
- role-limited production access;
- documented retention and deletion;
- incident-only elevated logging with approval and expiry.

### 6.7 Support data

Support staff must not request database dumps, raw identity documents, medical records or full exports through ordinary tickets.

Screenshots and attachments require:

- customer confirmation that they are necessary;
- redaction where possible;
- restricted access;
- ticket-level retention and deletion;
- prohibition on copying them into personal devices or informal chat channels.

### 6.8 Backups

Backups contain the same personal data as the source database.

They require:

- encryption;
- restricted restoration rights;
- documented region and provider;
- immutable or protected retention where appropriate;
- tested restore;
- expiry by rotation;
- a rule explaining that deleted live data may remain in backups until the documented backup-expiry date and may not be restored into normal service without reapplying deletions.

## 7. Purpose and lawful-basis matrix

The customer controller must approve a customer-specific version of this matrix.

| Purpose | Typical controller basis to assess | BSS role | Notes |
|---|---|---|---|
| statutory working-time record | legal obligation and employment law | processor | customer identifies exact provision and scope |
| scheduling and operational attendance | contract/legal obligation/legitimate interest as applicable | processor | necessity and proportionality required |
| leave and entitlement management | employment law and contract | processor | minimise absence/health details |
| correction and dispute evidence | legal obligation/claims/legitimate interest as applicable | processor | preserve original evidence and human review |
| accounting-ready report | legal obligation and customer operations | processor | BSS does not calculate payroll |
| account security and fraud prevention | legitimate interest/legal duty/contract as applicable | processor and, for BSS systems, possible controller | clearly separate roles |
| BSS billing and customer contacts | contract/legal obligation/legitimate interest | BSS controller | separate record and privacy notice |
| optional marketing | consent or legitimate interest after assessment | BSS controller | never use worker attendance data |

Employee consent is not the default basis for mandatory attendance processing. The customer must document a more appropriate employment/legal basis.

## 8. Croatian employment-record requirements

The current Croatian working-time rulebook permits paper or electronic records and requires records to reflect the actual state and be kept accurately and up to date.

For BSS design and configuration:

- the customer remains responsible for correctness;
- BSS must support timely correction without destroying original evidence;
- required fields must be configurable to match the customer’s legal/contractual setup;
- work-time records must support at least six years of retention calculated from the end of the year in which the documentation was created;
- a known relevant labour dispute triggers a legal hold until final resolution;
- worker access to their own records must be supportable;
- access must be limited to authorised persons with a valid basis.

This baseline does not claim that every other worker document has the same retention period. The customer’s full employment-record schedule requires separate Croatian legal validation.

## 9. Retention schedule

The values below are proposed technical defaults. Statutory/customer requirements prevail after approval.

| Data category | Proposed baseline | Deletion/hold rule |
|---|---|---|
| attendance records and source events | minimum statutory period; initial Croatian baseline six years from end of creation year | extend for documented dispute/legal hold |
| correction/decision evidence supporting attendance | align with attendance record | append-only evidence; restrict rather than erase where legally required |
| audit events affecting statutory records or access | align with supported record unless approved shorter schedule exists | legal/security hold supported |
| active worker master | employment duration | move to restricted inactive state at termination |
| inactive worker master | customer legal schedule | minimise fields; delete/anonymise when no longer required |
| leave/absence records | customer employment-law schedule | health-revealing detail minimised and more tightly restricted |
| generated report files | 30 days by default unless customer explicitly archives | metadata/checksum may follow evidence schedule |
| invitations | 7 days by default | revoke immediately when replaced or account activated |
| active sessions | maximum 30 days refresh lifetime | immediate revocation on logout, role change or incident |
| revoked-session security evidence | 90 days proposed | extend only for incident/legal hold |
| operational logs | 30–90 days according to log class | no payload logging; extend only for incident |
| support tickets | 24 months after closure proposed | earlier removal of unnecessary attachments |
| production backups | 35-day rolling baseline proposed | deletion becomes final after rotation unless legal hold applies |
| sales leads/business contacts | separate BSS controller schedule | not stored in customer employee database |

Retention configuration must not allow an ordinary tenant administrator to bypass mandatory legal holds without a separately authorised process.

## 10. Records of processing activities

BSS must maintain at least:

1. a processor ROPA for customer-hosted BSS service processing;
2. a controller ROPA for BSS account, contract, billing, security, support and business-contact processing;
3. a customer-facing template to help each pilot controller document its BSS attendance processing.

Each entry must cover:

- controller/processor and contact details;
- purpose;
- data subjects;
- data categories;
- recipients/subprocessors;
- third-country transfer details;
- deletion periods;
- technical and organisational measures;
- system/environment owner;
- approved legal basis where the organisation is controller;
- version and last review date.

The ROPA is maintained internally and made available to the supervisory authority when lawfully requested; it is not treated as a one-time registration submission.

## 11. DPIA gate

For the first Croatian live pilot, DPIA is mandatory as a BSS go-live rule.

The customer controller owns and approves the DPIA. BSS supplies accurate technical information and mitigation evidence.

The DPIA must include:

- processing description and data flow;
- purposes and legal basis;
- necessity and proportionality;
- worker expectations and power imbalance;
- data minimisation;
- role and department access;
- terminal/RFID operation;
- absence and potential health-data risk;
- raw evidence, correction and audit design;
- export and insider-risk scenarios;
- hosting, support access, backups and transfers;
- data-subject rights;
- automated flagging and human decision controls;
- security, outage and breach scenarios;
- residual-risk decision;
- consultation with DPO, worker representatives or AZOP where required;
- approval before any real worker record is entered.

A generic BSS template cannot replace the customer-specific DPIA because risk depends on workforce size, collective arrangements, use of reports, access roles, absence categories and employment decisions.

## 12. Transparency and worker information

Before live activation, the customer must provide workers with clear information covering at least:

- controller identity and contact;
- DPO/contact where applicable;
- purposes and legal bases;
- data categories and sources, including RFID terminal events;
- recipients and BSS/subprocessor role;
- regions and international transfers where applicable;
- retention periods or criteria;
- worker rights and complaint route;
- correction workflow;
- whether any automated flags are used and confirmation that significant decisions require human review;
- contact for questions and requests.

BSS should provide a reviewed template, but the customer controller must adapt and issue it.

## 13. Data-subject request workflow

### 13.1 Intake

The customer controller is the primary decision-maker for worker requests. BSS must not independently decide whether statutory employment records should be erased.

BSS must provide a secure channel for controller requests and internally record:

- request ID;
- customer/tenant;
- data subject identity as confirmed by the controller;
- request type;
- scope and deadline;
- actions/evidence;
- outcome and legal-hold conflict.

### 13.2 Internal service target

BSS should acknowledge the controller within one business day and provide the required assistance within five business days where technically feasible, leaving sufficient time for the controller’s statutory response obligations.

### 13.3 Supported outcomes

The product/operations process must support:

- scoped access report;
- structured export;
- correction through the approved workflow;
- restriction/locking where data must be preserved but not normally used;
- deletion/anonymisation where law and instructions permit;
- documented refusal or partial fulfilment decided by the controller;
- audit evidence of all operations.

Identity verification must not require BSS to collect unnecessary identity-document copies.

## 14. Controller–processor agreement requirements

Before live processing, the DPA must specify at least:

- subject matter, duration, nature and purpose;
- data types and data subjects;
- customer rights and instructions;
- confidentiality obligations;
- technical and organisational measures;
- subprocessors and change notice;
- assistance with rights requests, DPIA, security and breach duties;
- deletion/return at termination;
- audit/information rights;
- transfer safeguards;
- incident contacts and notification process;
- prohibition on unrelated use;
- conflict/escalation process for unlawful instructions.

Commercial terms and DPA obligations may be in related documents, but they must remain contractually consistent.

## 15. Technical and organisational measures

Minimum pre-live controls:

### Identity and access

- server-side authentication and session revocation;
- RBAC plus department/self scope;
- FORCE RLS and tenant-scoped transactions;
- least privilege for runtime, migration, support and backup roles;
- MFA for privileged BSS provider/production access;
- quarterly access review and immediate leaver revocation;
- no shared administrator accounts.

### Data protection

- TLS in transit;
- provider encryption at rest;
- secret store/KMS for database, RFID pepper, device and storage secrets;
- hashed/masked RFID UID;
- no private API cache in the service worker;
- controlled exports with expiry and access logging;
- production data prohibited from developer laptops and Preview.

### Integrity and accountability

- append-only raw terminal and audit evidence;
- checksum/versioned reports;
- optimistic concurrency and transaction boundaries;
- migrations with review and recovery point;
- accurate UTC/device/server timestamps and organisation timezone conversion;
- correction rather than silent overwrite.

### Availability

- encrypted backups;
- tested restore/PITR;
- monitoring and alerting;
- incident owner and escalation;
- terminal offline queue and idempotent sync;
- documented RPO/RTO after successful drill.

### Secure development

- protected `main` and PR-only changes;
- required quality/security/governance checks;
- CodeQL, dependency audit, secret scanning and SBOM;
- vulnerability patch policy;
- production change and rollback evidence;
- independent security review before broad production use.

## 16. Personal-data breach process

A security event is not automatically a personal-data breach, but every suspected confidentiality, integrity or availability incident involving personal data must be assessed and recorded.

### 16.1 BSS processor duties

BSS must:

1. contain the incident and preserve evidence;
2. identify affected tenants, systems, dates and data categories;
3. avoid exposing personal data in incident channels;
4. notify the affected controller without undue delay;
5. provide facts, likely consequences and mitigation as they become available;
6. support the controller’s risk assessment and notifications;
7. keep an incident record and post-incident actions.

Operational target: initial controller notification within 12 hours of confirming a likely personal-data breach, even if the investigation is incomplete. This is an internal target, not a replacement for legal wording.

### 16.2 Controller decisions

The customer controller decides, with legal/DPO support, whether notification to AZOP is required and whether affected workers must be informed. The controller’s potential 72-hour authority-notification clock must be protected by rapid BSS escalation.

BSS must not make public statements or contact workers directly unless contractually instructed or legally required.

## 17. International transfer and provider review

EU data-region selection is preferred, but it is not the only transfer question.

For each provider, BSS must determine:

- where primary and backup data resides;
- whether support or corporate personnel outside the EEA may access data;
- which subprocessors are used;
- whether adequacy, SCCs or another mechanism applies;
- whether a transfer impact assessment and supplementary controls are needed;
- how government-access requests are handled;
- how provider changes are communicated to customers.

No provider is approved based only on a marketing statement such as `EU region` or `GDPR compliant`.

## 18. Tenant offboarding and deletion

A customer exit must follow a controlled sequence:

1. confirm authorised customer instruction;
2. identify legal hold or unresolved dispute;
3. freeze new terminal ingestion at the agreed time;
4. produce and validate final export;
5. revoke user, terminal and integration access;
6. delete or anonymise live tenant data according to the instruction and legal schedule;
7. remove generated exports/object-storage files;
8. record backup-expiry date;
9. prevent deleted data from returning during ordinary restore;
10. issue an evidence-based deletion/return confirmation;
11. retain only data BSS independently must keep as controller, separated from worker records.

Emergency termination must not destroy evidence needed for wages, worker rights or an active dispute.

## 19. Preview, staging and production separation

### Preview

- fictional and aggregate data only;
- no worker import;
- no production accounts, tokens or API;
- no claim that Preview proves legal production readiness.

### Staging

- synthetic test data by default;
- production-like security and migration process;
- copied production data prohibited unless formally approved, minimised/pseudonymised and governed by a specific procedure.

### Pilot production

- real data only after P1–P12 gates are satisfied;
- customer-specific tenant, DPA, DPIA and notice;
- approved subprocessors and region;
- monitoring, backup and incident contacts active.

## 20. Evidence index

| Evidence ID | Required artifact | Status |
|---|---|---|
| PRIV-001 | approved role/responsibility matrix | `OPEN` |
| PRIV-002 | signed pilot DPA | `OPEN` |
| PRIV-003 | BSS processor ROPA | `OPEN` |
| PRIV-004 | BSS controller ROPA | `OPEN` |
| PRIV-005 | customer processing specification/legal bases | `OPEN` |
| PRIV-006 | customer-specific DPIA | `OPEN / BLOCKING` |
| PRIV-007 | worker privacy notice and delivery evidence | `OPEN` |
| PRIV-008 | subprocessor and transfer register | `OPEN` |
| PRIV-009 | retention/legal-hold configuration | `OPEN` |
| PRIV-010 | rights-request dry run | `OPEN` |
| PRIV-011 | tenant offboarding/deletion dry run | `OPEN` |
| PRIV-012 | breach tabletop exercise | `OPEN` |
| PRIV-013 | production access review | `OPEN` |
| PRIV-014 | backup/restore and deletion-reapplication evidence | `OPEN` |
| PRIV-015 | final Croatian legal/privacy review | `OPEN / EXTERNAL` |

## 21. Implementation backlog after issue #55

The following are technical work items, not completed claims:

- retention-policy representation per tenant/data class;
- legal-hold state and protected authorisation flow;
- report/export expiry and deletion job;
- rights-request scoped export tooling;
- account/worker restriction state;
- tenant offboarding command/runbook;
- deletion/anonymisation evidence;
- backup restore procedure that reapplies deletion tombstones where required;
- privileged-access audit and review;
- support attachment controls;
- subprocessor/region configuration inventory;
- incident evidence template and contact routing;
- automated tests for retention, legal hold and cross-tenant privacy boundaries.

No implementation begins by modifying the conflicted PR #27 branch. It must start from the authoritative post-issue-#55 `main` baseline.

## 22. Approval rule

This document may move from `PROPOSED` to `APPROVED BASELINE` only when:

- Product Owner approves product and operational constraints;
- technical owners confirm implementability;
- selected infrastructure/subprocessors are known;
- a qualified Croatian privacy/employment-law reviewer resolves or records all legal changes;
- issue #64 links the evidence.

Approval of this baseline does not by itself authorise live processing. The customer-specific DPA, DPIA, notice, configuration, technical evidence and go-live approval remain separate mandatory gates.

## 23. Source links

- GDPR: `https://eur-lex.europa.eu/eli/reg/2016/679/oj`
- EDPB Guidelines 07/2020: `https://www.edpb.europa.eu/documents/guideline/guidelines-072020-on-the-concepts-of-controller-and-processor-in-the-gdpr_en`
- Croatian Rulebook NN 55/2024: `https://narodne-novine.nn.hr/clanci/sluzbeni/2024_05_55_969.html`
- AZOP controller/processor guidance: `https://azop.hr/voditelj-i-izvrsitelj-obrade/`
- AZOP records-of-processing guidance: `https://azop.hr/evidencija-aktivnosti-obrade/`
- AZOP DPIA overview: `https://azop.hr/procjena-ucinka-na-zastitu-podataka-eng-data-protection-impact-assessment-dpia/`
- AZOP mandatory-DPIA processing list: `https://azop.hr/odluka-o-uspostavi-i-javnoj-objavi-popisa-vrsta-postupaka-obrade-koje-podlijezu-zahtjevu-za-procjenu-ucinka-na-zastitu-podataka/`
