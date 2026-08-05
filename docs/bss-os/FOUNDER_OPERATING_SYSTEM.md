# BSS Founder Operating System

Status: `PROPOSED v0.1 / FOUNDER APPROVAL REQUIRED / NOT A LEGAL AGREEMENT`

Owners: BSS founders

Related workstream: issue #85

## 1. Purpose

This document defines how the two BSS founders operate the company and project day to day before and after company formation.

It exists to prevent:

- decisions being remembered differently;
- one founder unintentionally committing the company to an unapproved cost or promise;
- critical systems being accessible by only one person;
- passwords, accounts or evidence being lost;
- product, technical and commercial work drifting without a named owner;
- 50/50 disagreement becoming silent project paralysis;
- vendors being paid without clear acceptance evidence;
- urgent action being blocked because one founder is temporarily unavailable.

This is an operational governance proposal. It is not a shareholder agreement, company articles, director resolution, employment agreement or legal opinion.

## 2. Status language

Every founder-governance item uses one of:

- `OPEN`: no founder decision exists yet.
- `PROPOSED`: a working rule is documented but not approved.
- `APPROVED`: both founders approved the rule in the Decision Log.
- `ACTIVE`: the approved rule is currently in use.
- `EXCEPTION`: a time-limited departure from an approved rule exists.
- `BLOCKED`: action cannot safely continue.
- `EXTERNAL REVIEW`: accountant, lawyer, bank, insurer or other qualified third party must validate the item.
- `RETIRED`: the rule was replaced and the replacement is referenced.

Chat messages do not create `APPROVED` status unless the decision is copied into the authoritative decision record.

## 3. Founder charter

Complete one charter for each founder.

### Founder A

| Field | Value |
|---|---|
| Legal name | `OPEN` |
| Working founder role | `OPEN` |
| Primary domains | `OPEN` |
| Backup domains | `OPEN` |
| Expected weekly availability | `OPEN` |
| Decision authority | Refer to approved matrix |
| Critical accounts owned | `OPEN` |
| Key deliverables | `OPEN` |
| Review date | `OPEN` |

### Founder B

| Field | Value |
|---|---|
| Legal name | `OPEN` |
| Working founder role | `OPEN` |
| Primary domains | `OPEN` |
| Backup domains | `OPEN` |
| Expected weekly availability | `OPEN` |
| Decision authority | Refer to approved matrix |
| Critical accounts owned | `OPEN` |
| Key deliverables | `OPEN` |
| Review date | `OPEN` |

No founder role should be defined only by a title. Each role must have measurable responsibilities and a backup owner.

## 4. Responsibility model

Each operating area must have:

- one `PRIMARY OWNER`;
- one `BACKUP OWNER`;
- an approval rule;
- an evidence location;
- a review frequency.

| Area | Primary owner | Backup owner | Approval rule | Evidence source | Status |
|---|---|---|---|---|---|
| Product scope | `OPEN` | `OPEN` | Decision matrix | Product scope and Decision Log | OPEN |
| UX/UI | `OPEN` | `OPEN` | Decision matrix | Design evidence and PRs | OPEN |
| Backend/API/database | `OPEN` | `OPEN` | GitHub governance | PRs, checks and contracts | OPEN |
| Hardware/CAD | `OPEN` | `OPEN` | Hardware acceptance | BOM, measurements and tests | OPEN |
| Infrastructure | `OPEN` | `OPEN` | Both for material changes | ADRs, provider records | OPEN |
| Security | `OPEN` | `OPEN` | Both for high risk | Security gates and risk register | OPEN |
| Privacy/legal operations | `OPEN` | `OPEN` | Both + external review | DPA/DPIA/ROPA evidence | OPEN |
| Sales | `OPEN` | `OPEN` | Approved messaging | Private CRM and sales OS | OPEN |
| Pricing | `OPEN` | `OPEN` | Both founders | Pricing baseline and offers | OPEN |
| Customer onboarding | `OPEN` | `OPEN` | Approved pilot scope | Pilot package | OPEN |
| Support/incident | `OPEN` | `OPEN` | Severity model | Support case register | OPEN |
| Finance/accounting | `OPEN` | `OPEN` | Financial matrix | Accounting system | OPEN |
| Grants/loans | `OPEN` | `OPEN` | Reserved decision | Application and adviser evidence | OPEN |
| Vendors/developers | `OPEN` | `OPEN` | Vendor rule | SOW, PR, acceptance | OPEN |
| Marketing/public claims | `OPEN` | `OPEN` | Public-claim approval | Approved copy and evidence | OPEN |
| Domains/email/accounts | `OPEN` | `OPEN` | Access register | Private access register | OPEN |

## 5. Decision classes

### D0 — Routine execution

Characteristics:

- inside approved scope and budget;
- reversible;
- no material customer, legal, security or privacy impact;
- no new external commitment.

Proposed rule: domain owner may execute and record evidence.

Examples:

- scheduling an approved internal meeting;
- updating a non-material project checklist;
- responding to a customer using approved wording;
- merging a low-risk PR after all required GitHub controls pass, when the founder is authorized for that domain.

### D1 — Reversible operating decision

Characteristics:

- limited impact;
- can be rolled back at low cost;
- does not change signed scope or legal commitments.

Proposed rule: primary owner decides, informs the other founder and records the decision.

Examples:

- trial of an internal non-production tool;
- rearranging a weekly workflow;
- selecting between two already-approved design variants for an internal prototype.

### D2 — Material decision

Characteristics:

- meaningful cost, customer impact, roadmap impact or vendor dependency;
- requires coordinated execution;
- may be difficult or expensive to reverse.

Proposed rule: both founders approve before action.

Examples:

- new paid vendor outside an approved budget;
- material product scope change;
- customer-specific development promise;
- infrastructure provider commitment;
- manufacturing order above the routine threshold;
- public pricing or discount exception.

### D3 — Reserved/high-risk decision

Characteristics:

- legal ownership, debt, security, privacy, production, employment, public reputation or business survival impact.

Required rule: both founders approve, required external review is complete and signed evidence exists before action.

Examples:

- company ownership or share changes;
- director/signing-authority change;
- taking debt, guarantee or material financial liability;
- signing a material customer, employment or supplier contract;
- live processing of employee data;
- production go-live;
- disclosure of a security or privacy incident;
- sale or licensing of core IP;
- changing the public product promise materially;
- closing the company or stopping the BSS project.

## 6. Decision-rights matrix

`A` = may approve alone under an approved D0/D1 rule.

`BOTH` = both founders must approve.

`EXTERNAL` = both founders plus required qualified external validation.

The matrix below is proposed and remains `OPEN` until the founders assign roles.

| Decision | Proposed class | Approval |
|---|---:|---|
| Internal task priority within approved plan | D0 | Domain owner |
| Low-risk documentation PR with green checks | D0 | Authorized repo owner |
| Application code PR to main | D1/D2 | GitHub controls + authorized technical owner |
| Security/RLS/auth material change | D3 | BOTH + security evidence |
| MVP scope addition | D2 | BOTH |
| Remove approved MVP feature | D2 | BOTH |
| Preview-only visual experiment | D1 | Product/design owner |
| Production deployment | D3 | BOTH + readiness evidence |
| Hardware prototype purchase within approved budget | D1 | Hardware owner |
| Hardware manufacturing batch | D2/D3 | BOTH |
| Standard customer discovery call | D0 | Sales owner |
| Send approved standard offer | D1 | Commercial owner under approved price |
| New price or discount exception | D2 | BOTH |
| Promise custom functionality | D2 | BOTH before promise |
| Sign pilot agreement | D3 | BOTH + legal readiness |
| Add subprocessor/provider handling personal data | D3 | BOTH + privacy review |
| Hire employee or contractor | D3 | BOTH + external review where required |
| Start grant application | D2 | BOTH |
| Submit grant/loan with obligations | D3 | BOTH + accountant/adviser review |
| Public press release or major claim | D2 | BOTH |
| Security incident customer notice | D3 | BOTH + incident/privacy process |
| Emergency credential revocation | D1/D3 | Authorized security owner; immediate record and founder notification |

## 7. Spending and commitment bands

Actual euro values are intentionally not invented.

Both founders must approve the thresholds before this section becomes `ACTIVE`.

| Band | Threshold | Proposed rule |
|---|---:|---|
| S0 — routine | `OPEN: T0` | Domain owner may spend inside an approved budget and category |
| S1 — controlled | `OPEN: T1` | Primary owner approves; other founder is notified before commitment |
| S2 — material | `OPEN: T2` | Both founders approve before order or subscription |
| S3 — strategic/high-risk | `OPEN: T3` | Both founders + external review where relevant |

Regardless of amount, both founders must approve:

- debt, credit, guarantees or leasing commitments;
- recurring contracts longer than the approved maximum term;
- customer refunds outside an approved policy;
- purchases from a founder, family member or related party;
- commitments containing IP transfer, exclusivity or broad indemnity;
- employee/contractor engagement;
- payment before acceptance when no protection exists;
- any expense outside company purpose or without valid evidence.

## 8. Financial control record

Every material commitment must include:

| Field | Requirement |
|---|---|
| Commitment ID | Unique identifier |
| Supplier/customer | Private business record |
| Purpose | Business reason |
| Amount | Net, VAT and gross where relevant |
| One-time/recurring | Explicit |
| Contract term | Explicit |
| Cancellation terms | Explicit |
| Budget line | Approved category |
| Decision class | D0–D3 |
| Approvers | Named founders |
| Evidence | Quote, contract or invoice |
| Acceptance owner | Named person |
| Payment status | Planned, approved, paid or disputed |

No payment approval should rely only on a chat screenshot.

## 9. Pricing, discounts and customer commitments

Founders must not:

- send an `ASSUMPTION` or `WORKING BAND` as an approved customer price;
- promise a go-live date without readiness evidence;
- promise 24/7 support without an approved operational model;
- describe Preview as production;
- promise payroll calculation, GPS, biometrics, door access or other excluded functions as delivered;
- accept custom work without scope, owner, cost, deadline and acceptance criteria;
- agree to unlimited liability or material legal language without review.

Customer commitment record:

| Field | Value |
|---|---|
| Customer/opportunity ID |  |
| Commitment requested |  |
| Product status evidence |  |
| Cost and delivery impact |  |
| Decision class |  |
| Founder approvals |  |
| External review needed |  |
| Approved wording |  |
| Expiry/review date |  |

## 10. Product and repository governance

The repository remains the source of truth for implementation.

Founder rules:

1. No direct unreviewed changes to protected `main`.
2. Required CI/security/governance checks must not be bypassed for convenience.
3. A merged document is not implementation evidence.
4. An open PR is not a released function.
5. Code work uses one PR/one purpose when practical.
6. Large legacy PRs are reconciled rather than blindly merged.
7. Production secrets never enter GitHub.
8. External developers receive least-privilege access.
9. Payment for development work uses defined milestones and acceptance evidence.
10. A founder disagreement does not justify bypassing security or branch protection.

## 11. Vendor and developer engagement

Before work starts:

- define scope and exclusions;
- define deliverables;
- define repository/branch strategy;
- define acceptance tests;
- define security/privacy obligations;
- define IP and confidentiality requirements for legal review;
- define milestones and payment conditions;
- define who may approve change requests;
- define handoff documentation;
- define termination and access-removal steps.

### Acceptance rule

A vendor invoice or milestone is accepted only when the stated deliverable has evidence.

Possible evidence:

- merged PR with green checks;
- reproducible build;
- passed acceptance test;
- hardware measurement and inspection record;
- delivered source/CAD files in approved formats;
- documentation and credential handoff;
- removal of vendor access where the milestone ends.

## 12. Weekly founder operating meeting

Recommended duration: 45–60 minutes.

Required agenda:

1. decisions since last meeting;
2. current BSS OS control board;
3. top three blockers;
4. code/PR status;
5. product and hardware status;
6. sales pipeline and customer commitments;
7. money spent, committed and expected;
8. legal/privacy/infrastructure risks;
9. founder capacity and availability;
10. decisions required before next meeting;
11. owners and due dates.

### Meeting record

| Field | Value |
|---|---|
| Date |  |
| Participants |  |
| Decisions approved |  |
| Decisions open |  |
| New risks |  |
| Commitments approved |  |
| Actions | Owner + due date |
| Next review |  |

A meeting without written actions is a discussion, not an operating record.

## 13. Founder metrics

Suggested internal indicators:

- overdue founder actions;
- decisions waiting longer than the agreed window;
- critical systems without backup access;
- expenses without complete evidence;
- open customer commitments without owner;
- open high risks without mitigation;
- PRs blocked by founder decision;
- vendor milestones waiting for acceptance;
- number of undocumented exceptions;
- founder workload concentration.

Targets remain `OPEN` until approved.

## 14. Conflict and 50/50 deadlock process

This operational process does not replace legal deadlock provisions.

### Step 1 — Write the disagreement

Each founder records:

- decision required;
- preferred option;
- evidence;
- cost and risk;
- reversible or irreversible nature;
- latest safe decision date.

### Step 2 — Classify

- D0/D1: domain owner may proceed if the matrix clearly grants authority.
- D2/D3: no unilateral commitment while deadlocked.

### Step 3 — Cooling and review

Proposed working rule:

- pause argument-driven decisions;
- review evidence after a defined cooling period;
- identify assumptions that can be tested;
- avoid personal accusations in the decision record.

Exact time window: `OPEN`.

### Step 4 — Reversible experiment

When safe, run a small time-boxed test with:

- maximum cost;
- success criteria;
- stop condition;
- owner;
- decision date.

A reversible experiment is not allowed for legal, security, privacy, debt, ownership or live-data decisions without required approvals.

### Step 5 — Neutral adviser

For unresolved material decisions, use a pre-approved neutral adviser category:

- accountant;
- lawyer;
- technical reviewer;
- product/business adviser;
- mediator.

The adviser provides input. Formal authority depends on signed company/legal documents, not this template.

### Step 6 — Hold state

When no safe agreement exists:

- preserve the current approved state;
- stop new material commitments;
- continue only routine obligations necessary to protect the company, customers and data;
- record the blocker and next review date.

## 15. Emergency action

Emergency action may be required to:

- revoke compromised credentials;
- stop a data leak;
- take a vulnerable service offline;
- preserve logs/evidence;
- prevent unsafe hardware use;
- meet an urgent legal or regulatory instruction;
- prevent unauthorized payment.

Emergency rule:

1. authorized owner takes the minimum necessary protective action;
2. no new commercial advantage is pursued under the emergency exception;
3. the other founder is notified as soon as practical;
4. evidence and timeline are recorded;
5. normal approval resumes after containment.

## 16. Account and access register

The public repository stores only the template, never secrets.

Maintain the real register in a restricted system.

| System | Business purpose | Primary owner | Backup owner | MFA | Recovery method | Billing owner | Last review |
|---|---|---|---|---|---|---|---|
| GitHub | Source and governance | OPEN | OPEN | Required | Private recovery process | OPEN | OPEN |
| Domain registrar | Domain ownership | OPEN | OPEN | Required | Private recovery process | OPEN | OPEN |
| DNS/CDN | Routing/security | OPEN | OPEN | Required | Private recovery process | OPEN | OPEN |
| Business email | Communication | OPEN | OPEN | Required | Private recovery process | OPEN | OPEN |
| Password manager | Secret custody | OPEN | OPEN | Required | Break-glass process | OPEN | OPEN |
| Cloud hosting | Application | OPEN | OPEN | Required | Provider recovery | OPEN | OPEN |
| Database | Customer data | OPEN | OPEN | Required | Backup/restore process | OPEN | OPEN |
| Monitoring | Operations | OPEN | OPEN | Required | Provider recovery | OPEN | OPEN |
| Banking | Finance | OPEN | OPEN | Required | Bank process | OPEN | OPEN |
| Accounting | Statutory records | OPEN | OPEN | Required | Accountant/provider process | OPEN | OPEN |
| CRM | Prospects/customers | OPEN | OPEN | Required | Provider recovery | OPEN | OPEN |
| Hardware inventory | Devices | OPEN | OPEN | As applicable | Chain-of-custody | OPEN | OPEN |

## 17. Access-control rules

- unique personal accounts; no shared daily-use login where avoidable;
- MFA on all critical systems;
- recovery codes stored in an approved restricted location;
- least privilege;
- production access separated from Preview where possible;
- no secrets in chat, GitHub issues or public documents;
- access reviewed at least on the approved cadence;
- vendor access expires or is removed after the engagement;
- lost device or suspected compromise triggers immediate review;
- emergency access is logged and reviewed.

## 18. Break-glass and continuity plan

Every critical system needs:

- primary owner;
- backup owner;
- documented recovery path;
- verified contact information;
- billing visibility;
- export/backup capability;
- last successful recovery test.

### Break-glass test

At an approved frequency:

1. choose one non-production critical account;
2. confirm backup owner can identify the recovery process;
3. do not expose secrets in the test record;
4. record pass/fail and remediation;
5. rotate or reseal recovery material when required.

## 19. Temporary founder unavailability

Founder unavailability statuses:

- `PLANNED`: holiday or known absence;
- `SHORT UNPLANNED`: temporary illness or emergency;
- `EXTENDED`: absence affecting key responsibilities;
- `INCAPACITY/LEGAL EVENT`: external legal process required.

Before planned absence:

- list open commitments;
- delegate routine approvals;
- identify prohibited decisions;
- confirm backup access;
- schedule check-in only when necessary;
- preserve customer/support coverage.

During unplanned absence:

- use the approved backup owner;
- act only within delegated authority;
- avoid D2/D3 commitments unless emergency protection requires action;
- document all exceptions.

Legal authority during incapacity must be handled by qualified legal advice and formal company documents.

## 20. Information and evidence ownership

BSS must know where authoritative evidence lives.

| Evidence | Authoritative location |
|---|---|
| Code and technical docs | GitHub |
| Decisions | BSS OS Decision Log |
| Customer personal/commercial data | Private CRM/customer store |
| Signed contracts | Restricted legal document store |
| Accounting/invoices | Approved accounting system |
| Passwords and recovery material | Approved password manager/restricted recovery store |
| Hardware identity and custody | Private inventory register |
| Incident evidence | Restricted incident system |
| Legal/privacy evidence | Restricted compliance store |

Public GitHub must not contain signed contracts, identity documents, bank details, passwords, customer data or private incident evidence.

## 21. Intellectual-property evidence checklist

Operational evidence should show:

- who created the work;
- under which engagement;
- repository/commit or file delivery;
- accepted formats;
- third-party dependencies/licenses;
- acceptance date;
- access removal after completion;
- legal assignment/license documents where required.

This checklist does not create or transfer legal IP ownership. Qualified legal review and signed agreements are required.

## 22. Founder onboarding and offboarding

### Onboarding

- approve role charter;
- approve decision rights;
- create unique accounts;
- enable MFA;
- grant least privilege;
- review security/privacy duties;
- review financial controls;
- review conflicts and related-party disclosures;
- confirm evidence locations;
- complete recovery/access dry run.

### Offboarding or role change

- external legal/accounting review where ownership/director status changes;
- revoke or change access;
- rotate secrets;
- transfer domains, billing and vendor contacts;
- transfer open customer commitments;
- transfer device and document custody;
- confirm company data return/deletion;
- preserve legal/accounting records;
- update decision matrix and public representation;
- document final handoff.

## 23. External legal/accounting review backlog

The following remain `EXTERNAL REVIEW`:

- shareholder agreement and deadlock clauses;
- ownership percentages and capital contributions;
- director/signing authority;
- vesting or founder departure treatment;
- share transfer, pre-emption and valuation;
- incapacity, death and inheritance handling;
- non-compete, confidentiality and IP assignment;
- salaries, reimbursements and related-party transactions;
- tax/VAT/accounting treatment;
- debt, guarantees and grants;
- employment/contractor terms;
- dispute resolution and governing law.

## 24. Fictional founder decision dry run

All people, values and systems below are fictional.

### Scenario

Founder A wants to order a small manufacturing batch before physical RFID and thermal tests are complete. Founder B wants to wait for measurements.

### Classification

- decision: manufacturing batch;
- class: D2 or D3 depending on cost/liability;
- evidence gap: physical metrology, RFID performance and thermal test;
- current status: `BLOCKED`.

### Process

1. Both founders write the expected benefit, cost and risk.
2. The batch is not ordered while critical physical evidence is missing.
3. They approve a reversible prototype-only experiment inside the approved prototype budget.
4. Success criteria are defined: fit, mounting, temperature and RFID performance.
5. A review date is set.
6. Batch decision remains blocked until evidence is attached.

### Result

- no unilateral purchase;
- prototype work continues;
- the project avoids premature manufacturing cost;
- the decision record identifies exactly what unblocks the next step.

## 25. Fictional emergency-access dry run

Scenario: the primary domain owner is unavailable and a DNS configuration error blocks the Preview site.

Process:

1. backup owner uses their own MFA-protected account;
2. confirms the change is limited to restoring the last approved configuration;
3. records the before/after reference without exposing credentials;
4. restores service;
5. notifies the other founder;
6. reviews why the configuration failed;
7. updates the access/recovery record.

Outcome: `PASS` only when backup access works without sharing a password or bypassing controls.

## 26. Evidence index

| Evidence ID | Evidence |
|---|---|
| FOS-001 | Approved founder charters |
| FOS-002 | Responsibility matrix |
| FOS-003 | Decision-rights matrix |
| FOS-004 | Approved spending thresholds |
| FOS-005 | Financial commitment register |
| FOS-006 | Weekly meeting records |
| FOS-007 | Deadlock records and outcomes |
| FOS-008 | Private account/access register |
| FOS-009 | Break-glass test evidence |
| FOS-010 | Temporary-unavailability handoff |
| FOS-011 | Vendor/developer acceptance evidence |
| FOS-012 | IP evidence checklist and legal documents |
| FOS-013 | Founder onboarding/offboarding evidence |
| FOS-014 | External legal/accounting review evidence |
| FOS-015 | Annual or major-change founder governance review |

## 27. Approval gates

### Gate A — Template merged

- document passes repository checks;
- no secrets or private founder documents are included;
- open decisions remain marked `OPEN`.

### Gate B — Founder operating approval

- both founder charters approved;
- decision rights approved;
- spending thresholds approved;
- primary/backup ownership approved;
- weekly meeting cadence approved.

### Gate C — Access continuity proven

- critical systems inventoried privately;
- MFA and backup ownership confirmed;
- break-glass dry run passed;
- vendor access review completed.

### Gate D — Legal/company alignment

- relevant operational rules aligned with signed company/legal documents;
- accountant and lawyer review completed where required;
- contradictions resolved in favor of formal legal/company authority.

## 28. Definition of done for this document

This document is complete as `PROPOSED v0.1` when:

- merged through repository controls;
- all operating domains and decision classes are documented;
- no actual role, spending limit or legal authority is invented;
- fictional dry runs are complete;
- issue #85 remains open until both founders approve actual assignments, limits and continuity evidence.
