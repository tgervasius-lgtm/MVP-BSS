# BSS External Developer & Vendor Management Pack

Status: `PROPOSED v0.1 / FOUNDER APPROVAL AND EXTERNAL LEGAL REVIEW REQUIRED`

Owner: BSS founders

Related issues: #87, #55, #57, #59, #60, #62, #66 and #85

## 1. Purpose

This document defines how BSS selects, engages, controls, accepts, pays and offboards external developers, hardware suppliers, industrial designers, manufacturers, installers, infrastructure providers and other professional vendors.

The objective is to prevent:

- unclear scope and uncontrolled cost growth;
- payment for activity without an accepted result;
- code, CAD or documentation remaining only on a vendor device;
- a vendor becoming the only person who can continue the project;
- unreviewed access to production, secrets or customer data;
- missing intellectual-property and license evidence;
- hidden subcontracting;
- verbal promises being treated as accepted deliverables;
- a founder being forced to pay a large amount merely to regain project continuity.

This pack is operational governance. It is not a signed contract and does not replace qualified Croatian legal, tax, accounting, employment, intellectual-property or data-protection advice.

## 2. Core rules

1. BSS-controlled systems are the source of truth.
2. Work is not accepted only because time was spent.
3. Every paid milestone requires predefined evidence and an acceptance decision.
4. Scope, exclusions, assumptions and dependencies must be written before work starts.
5. A change in scope requires a written change request before additional work begins.
6. No vendor receives production, banking or customer-data access by default.
7. Access is least-privilege, time-limited, named and revocable.
8. Source code, source CAD files, documentation, test evidence and credentials must not exist only with the vendor.
9. Open pull requests, screenshots, recordings, chat messages and demonstrations are not sufficient acceptance evidence unless the statement of work explicitly defines them as the deliverable.
10. Final liability, warranty, confidentiality, intellectual-property, data-processing, termination and dispute terms require signed documents reviewed where appropriate.
11. Real vendor identities, offers, contracts, bank details, credentials and confidential prices must not be committed to the public repository.
12. A vendor may recommend an approach, but BSS retains product, security, pricing, production and customer-promise authority.

## 3. Status language

| Status | Meaning |
|---|---|
| `CANDIDATE` | Identified but not reviewed. |
| `DUE DILIGENCE` | Identity, capability, references and risks are being checked. |
| `SHORTLISTED` | Suitable for a defined request or engagement. |
| `APPROVED VENDOR` | Approved for a specific category and risk level. |
| `ENGAGED` | Signed scope exists and work is active. |
| `DELIVERED` | Vendor submitted the agreed material; BSS has not yet accepted it. |
| `ACCEPTED` | Evidence passed the stated acceptance criteria. |
| `CONDITIONAL ACCEPTANCE` | Limited non-critical items remain with owner and due date. |
| `REJECTED` | Deliverable failed the acceptance criteria. |
| `SUSPENDED` | Work or access is temporarily stopped. |
| `OFFBOARDED` | Access removed and final evidence/assets returned. |
| `BLOCKED` | Work cannot safely continue because a required dependency or decision is missing. |

`DELIVERED` never automatically means `ACCEPTED`.

## 4. Vendor categories

| Code | Category | Examples | Typical risk |
|---|---|---|---|
| `SW` | Software development | frontend, backend, mobile, integrations | code quality, security, continuity, IP |
| `HW` | Hardware engineering | electronics, terminal integration, PCB | safety, reliability, component lifecycle |
| `CAD` | Industrial/mechanical design | enclosure, SolidWorks, STEP/STL, drawings | tolerances, manufacturability, source ownership |
| `MFG` | Manufacturing | CNC, sheet metal, 3D printing, assembly | quality, scrap, repeatability, tooling ownership |
| `OPS` | Infrastructure/operations | hosting, monitoring, backup, deployment | availability, secrets, data location, lock-in |
| `INSTALL` | Installation/service | wall mounting, cabling, field replacement | safety, site access, damage, evidence |
| `PROF` | Professional services | legal, accounting, privacy, grants | advice quality, confidentiality, jurisdiction |
| `DESIGN` | Brand/product design | UX/UI, visual identity, video | source files, usage rights, scope ambiguity |
| `SALES` | Sales/marketing support | outreach, campaigns, lead generation | claims, personal data, brand control |

A vendor may cover several categories, but each engagement must identify the exact category and risk.

## 5. Engagement risk tiers

### `V1 — Low risk`

Examples:

- public research;
- non-confidential graphic work;
- one-off translation;
- test-data-only review without repository access.

Minimum controls:

- written deliverable;
- price and deadline;
- BSS acceptance;
- source-file delivery where applicable.

### `V2 — Moderate risk`

Examples:

- repository read access;
- UX/UI work;
- CAD concept;
- non-production infrastructure configuration;
- marketing material with product claims.

Additional controls:

- due diligence;
- confidentiality terms where needed;
- named access and MFA;
- milestone evidence;
- offboarding checklist.

### `V3 — High risk`

Examples:

- application code changes;
- database migrations;
- terminal electronics or mechanical manufacturing files;
- staging infrastructure administration;
- security testing;
- access to private customer evidence.

Additional controls:

- signed SOW and appropriate contract;
- security and data-access review;
- BSS-controlled repository/workspace;
- mandatory review and test gates;
- backup owner;
- IP/source/license checklist;
- staged payment and formal acceptance.

### `V4 — Critical risk`

Examples:

- production administration;
- production secrets;
- live employee data;
- legal representation or material contractual authority;
- bank/payment authority;
- sole custody of critical source files or signing keys.

Required controls:

- explicit two-founder approval unless a legally approved authority model says otherwise;
- external legal/privacy/accounting review where applicable;
- time-limited access;
- independent logs and monitoring;
- break-glass and revocation plan;
- no sole-vendor custody;
- documented emergency replacement plan.

## 6. Vendor intake record

Store real records in a private BSS-controlled system.

| Field | Required content |
|---|---|
| Vendor ID | Internal non-sensitive identifier |
| Legal/business identity | Verified privately |
| Category and risk tier | `SW`, `HW`, etc. plus `V1`–`V4` |
| Contact owner | Named BSS founder |
| Backup owner | Named BSS backup |
| Proposed work | One-sentence purpose |
| Data/access needed | None, repository, staging, production, customer data, other |
| Subcontractors | Named/declared privately or `NONE` |
| Conflict check | Pass/fail/unknown |
| References/portfolio | Evidence locations |
| Security/privacy review | Required/not required/status |
| Commercial status | Quote/SOW/contract/invoice status |
| Decision | Candidate, approved, rejected, blocked |
| Review date | Next review |

## 7. Request for quote / request for proposal

Every meaningful engagement should start with a consistent request.

### 7.1 RFQ header

- BSS request ID;
- request owner and backup;
- vendor category and risk tier;
- requested response date;
- desired start window;
- target completion window;
- confidentiality classification;
- whether subcontracting is permitted;
- required proposal validity period;
- currency and VAT treatment to be confirmed privately.

### 7.2 Problem statement

Describe:

- the current state;
- the business or technical problem;
- why it matters;
- what is already available;
- known blockers;
- what BSS is not asking the vendor to solve.

### 7.3 Mandatory proposal structure

The vendor should provide:

1. understanding of the objective;
2. proposed approach;
3. explicit deliverables;
4. explicit exclusions;
5. assumptions;
6. dependencies on BSS or third parties;
7. timeline and milestones;
8. named people and subcontractors;
9. evidence of relevant prior work;
10. testing and quality approach;
11. security and data-access needs;
12. handoff and documentation approach;
13. support/warranty/rework proposal;
14. price structure and payment schedule;
15. proposal validity;
16. identified risks and alternatives.

A proposal that hides exclusions or depends on unspecified later discovery is not automatically rejected, but it must be marked high uncertainty.

## 8. Statement of Work template

### 8.1 Identification

- SOW ID and version;
- vendor engagement ID;
- BSS owner and backup;
- vendor responsible person;
- effective date only after approval/signature;
- linked issue, project or decision record.

### 8.2 Objective

One measurable outcome, not a vague activity.

Bad:

> Improve the backend.

Better:

> Deliver the defined endpoint set, migrations, tests, OpenAPI updates and handoff evidence for the approved scope, passing the repository quality and security gates.

### 8.3 In scope

List every deliverable separately.

For each deliverable define:

| Field | Description |
|---|---|
| Deliverable ID | Stable identifier |
| Description | Exact output |
| Format/location | Repository path, CAD format, report, physical item, etc. |
| Acceptance criteria | Observable pass conditions |
| Evidence | Test run, dimensions, file hash, review, photo, measurement, etc. |
| Reviewer | BSS owner or independent reviewer |
| Due window | Agreed date/window |
| Payment link | Milestone, if applicable |

### 8.4 Out of scope

Examples:

- production deployment;
- payroll calculation;
- mobile application;
- legal compliance certification;
- hardware certification;
- customer support after a defined warranty period;
- features not in the approved scope.

### 8.5 Assumptions

Each assumption must have:

- owner;
- validation date;
- consequence if false;
- whether price/timeline may change.

### 8.6 Dependencies

Examples:

- stable `main` branch;
- access to a test environment;
- physical measurements;
- component delivery;
- BSS decision by a stated date;
- third-party API availability.

### 8.7 Acceptance period

The SOW should define a reasonable review period and what happens when:

- BSS accepts;
- BSS conditionally accepts;
- BSS rejects with evidence;
- BSS does not respond;
- the vendor disputes the rejection.

Exact contractual wording requires legal review.

## 9. Proposal comparison matrix

Use a 100-point model as a decision aid, not an automatic winner selector.

| Dimension | Working weight | Evidence examples |
|---|---:|---|
| Scope understanding | 15 | accurate risks, clear exclusions, useful questions |
| Technical/design capability | 15 | relevant work, architecture/CAD examples, test approach |
| Deliverable quality and acceptance clarity | 15 | measurable outputs and evidence |
| Security/privacy/access approach | 10 | least privilege, data minimization, subcontractor transparency |
| Handoff and continuity | 10 | source files, documentation, reproducibility, backup owner |
| Timeline credibility | 10 | dependency-aware plan and realistic milestones |
| Commercial clarity | 10 | transparent price, assumptions, change rules |
| Support/rework/warranty | 5 | defined correction process |
| Communication and reporting | 5 | cadence, named owner, escalation |
| Vendor/lock-in risk | 5 | open formats, BSS ownership, replaceability |

Hard blockers override the score.

### 9.1 Hard blockers

- refusal to deliver source files;
- demand for unlogged shared credentials;
- undisclosed subcontracting after being asked;
- production access as a default condition;
- refusal to define acceptance criteria;
- refusal to clarify intellectual-property or license status;
- major false claim or unverifiable identity;
- request to store real customer data in an uncontrolled system;
- payment of the full amount before any reviewable evidence without a separately approved justification.

## 10. Due diligence checklist

### Identity and business

- identity/entity checked privately;
- billing capability checked;
- references contacted where proportionate;
- portfolio relevance assessed;
- sanctions/conflict checks where applicable;
- insurance or certification requested where relevant.

### Capability

- named responsible person;
- actual people performing the work;
- skill match to the task;
- capacity and availability;
- dependency on one individual;
- ability to provide source and documentation.

### Security and privacy

- access requested and reason;
- device/account controls;
- MFA support;
- data storage and transfer locations;
- subcontractors/subprocessors;
- breach notification approach;
- deletion/return approach;
- security incidents or material concerns disclosed where appropriate.

### Commercial and continuity

- price basis understood;
- payment milestones linked to evidence;
- currency/VAT assumptions checked;
- warranty/rework understood;
- termination and handoff understood;
- vendor lock-in identified;
- alternative vendor or internal fallback considered.

## 11. Approval gates before start

### Gate A — Need approved

- problem is real and prioritized;
- internal solution/reuse considered;
- engagement owner and backup named;
- risk tier assigned.

### Gate B — Scope approved

- SOW complete;
- exclusions and assumptions clear;
- acceptance evidence defined;
- dependencies assigned;
- change process defined.

### Gate C — Commercial/legal approved

- quote comparison complete where required;
- budget and payment approach approved under Founder OS;
- legal/privacy/accounting review completed where applicable;
- no unapproved customer promise is embedded.

### Gate D — Access ready

- BSS-controlled accounts created;
- access least-privilege and time-limited;
- MFA enabled;
- logging available;
- offboarding date/trigger defined;
- secrets/customer data prohibited unless separately approved.

No work should start merely because the vendor is available.

## 12. Access and security controls

### 12.1 Prohibited defaults

Do not provide by default:

- personal founder passwords;
- shared administrator accounts;
- production database credentials;
- bank/payment access;
- domain registrar ownership;
- unrestricted cloud organization administration;
- real employee or prospect datasets;
- long-lived secrets through chat or email.

### 12.2 Required pattern

- named vendor user;
- role-based permissions;
- MFA;
- separate test data;
- shortest practical access duration;
- activity logs where available;
- BSS owner and backup;
- review date;
- immediate revocation trigger.

### 12.3 Access register fields

Store privately:

| Field | Content |
|---|---|
| Vendor ID | Internal reference |
| Person | Verified individual |
| System | GitHub, cloud, Figma, CAD storage, etc. |
| Role/permissions | Exact access |
| Purpose | Linked SOW/deliverable |
| Start/expiry | Dates |
| Approved by | Decision evidence |
| MFA | Yes/no/evidence |
| Data class | Test/confidential/live |
| Revoked | Date/evidence |

## 13. Software vendor requirements

Unless explicitly excluded, software delivery should include:

- branch from the current approved baseline;
- one reviewable PR per purpose;
- no direct push to protected `main`;
- tests for critical and changed flows;
- lint/build/type checks where applicable;
- security and dependency checks;
- migrations with rollback considerations;
- API/OpenAPI updates when contracts change;
- environment-variable documentation without secrets;
- README/handoff updates;
- known limitations and risks;
- reproducible setup steps;
- evidence that a second person can build/test the work;
- license/dependency inventory;
- no hidden code outside the BSS-controlled repository.

### 13.1 Software acceptance checklist

- agreed files and functionality delivered;
- PR diff matches scope;
- required checks green;
- unresolved review threads closed or explicitly accepted;
- tests cover acceptance criteria;
- no critical security finding open;
- migrations and data implications reviewed;
- documentation updated;
- release/deployment impact recorded;
- source and history remain in BSS control;
- handoff performed;
- independent review completed when required.

A merged PR is strong evidence of delivery, but production readiness still requires the relevant release and operational gates.

## 14. Hardware, CAD and manufacturing vendor requirements

Depending on scope, delivery should include:

- exact BOM with manufacturer part numbers and revision;
- component availability and approved alternatives;
- dimensioned drawings;
- native source files, not only screenshots or PDFs;
- STEP/STL/DXF and manufacturing exports where applicable;
- units, tolerances, materials and surface finish;
- fasteners, inserts, cables, clearances and service access;
- thermal/ventilation assumptions;
- RFID read-zone and antenna assumptions;
- display/opening dimensions;
- assembly sequence;
- manufacturing process and constraints;
- inspection points and measurement method;
- revision identifier on files and physical parts;
- prototype/test evidence;
- defect/rework process;
- tooling/jig ownership and storage terms where applicable.

### 14.1 Hardware acceptance checklist

- source files received and open successfully;
- drawings match the agreed revision;
- critical dimensions measured;
- components fit without forced modification;
- connectors, ventilation and serviceability verified;
- RFID/display/buzzer behavior tested where in scope;
- visible and structural defects recorded;
- photos and measurement evidence stored privately;
- BOM and alternatives validated;
- manufacturing repeatability risks recorded;
- physical item and digital source correspond;
- punch-list owner and re-test date defined.

A visually attractive enclosure is not accepted if critical dimensions, fit, thermal behavior, RFID performance or serviceability are unproven.

## 15. Milestones, acceptance and payment

Actual euro amounts and percentages remain `OPEN` until founder approval and professional review where needed.

### 15.1 Working milestone model

| Milestone | Typical evidence | Payment status |
|---|---|---|
| `M0 — Contract/start` | signed scope, access and plan | optional approved start payment |
| `M1 — Design/architecture` | reviewable design, risks, test plan | payable only if accepted |
| `M2 — First integrated delivery` | working branch/prototype and evidence | payable only if accepted/conditionally accepted |
| `M3 — Final delivery` | all deliverables, tests, source and docs | payable after acceptance |
| `M4 — Handoff/retention` | continuity test, access cleanup, defects closed | final retained amount if agreed |

### 15.2 Acceptance outcomes

#### `ACCEPTED`

All critical criteria pass. Non-critical observations do not prevent intended use.

#### `CONDITIONAL ACCEPTANCE`

Allowed only when:

- no critical criterion failed;
- remaining items are explicit;
- owner and due date exist;
- commercial consequence is recorded;
- BSS can safely use the deliverable for the accepted purpose.

#### `REJECTED`

Use when:

- a critical criterion fails;
- source/evidence is missing;
- delivered scope materially differs;
- tests do not support the claim;
- the result cannot be independently used or continued;
- a security/privacy/safety blocker exists.

### 15.3 Payment approval record

- engagement and milestone ID;
- invoice reference stored privately;
- deliverables submitted;
- acceptance result;
- evidence locations;
- open defects;
- change requests included/excluded;
- budget variance;
- approver(s);
- payment authorization date;
- accounting/tax review where applicable.

A vendor timesheet may support an invoice but does not replace acceptance evidence.

## 16. Change-request control

No silent scope expansion.

Every change request records:

- CR ID and date;
- requester;
- original scope reference;
- requested change;
- reason and business value;
- effect on architecture/design;
- security/privacy/data impact;
- timeline impact;
- price impact;
- acceptance impact;
- dependencies;
- options: accept, reject, defer, split;
- founder approval required under the decision class;
- updated SOW version.

Emergency work may begin only under a documented emergency rule and must be regularized immediately afterward.

## 17. Delivery cadence and reporting

For active V2–V4 engagements, use a defined cadence.

### Minimum status record

- completed since last update;
- evidence/links;
- next work;
- blockers and owner;
- scope/change warning;
- timeline confidence;
- budget/milestone status;
- security/privacy concerns;
- decisions required from BSS.

Avoid reports that only state hours worked or percentages complete without evidence.

## 18. Defects, rework and warranty

Each defect record includes:

- defect ID;
- linked deliverable and revision;
- severity;
- reproduction or measurement evidence;
- expected versus actual result;
- responsibility assessment;
- workaround;
- remediation owner/date;
- re-test evidence;
- commercial treatment under the signed terms.

### Working severity

| Severity | Meaning |
|---|---|
| `D1 Critical` | security, safety, data loss, tenant isolation, unusable core deliverable |
| `D2 High` | major required function/fit fails; no reasonable workaround |
| `D3 Medium` | limited impact; workaround available |
| `D4 Low` | cosmetic, documentation or minor improvement |

Contractual warranty and liability language requires legal review.

## 19. Vendor scorecard

Review at milestone, end of engagement and periodically for recurring vendors.

Score 1–5 with evidence:

- quality of deliverables;
- acceptance pass rate;
- security/privacy discipline;
- scope control;
- timeline reliability;
- commercial transparency;
- communication quality;
- documentation/handoff;
- defect/rework burden;
- independence/replaceability;
- treatment of BSS/customer data;
- responsiveness after delivery.

### Decision outcomes

- `CONTINUE`;
- `CONTINUE WITH CONDITIONS`;
- `RESTRICT SCOPE`;
- `REMEDIATE`;
- `SUSPEND`;
- `REPLACE`;
- `DO NOT RE-ENGAGE`.

A low price does not override critical security, source-ownership or continuity failures.

## 20. Offboarding and termination

### 20.1 Trigger examples

- engagement completed;
- vendor replaced;
- material breach or security concern;
- project paused;
- vendor unavailable;
- repeated rejected delivery;
- contract terminated;
- access no longer needed.

### 20.2 Offboarding checklist

- stop or confirm final work boundary;
- collect all source files and latest revisions;
- collect documentation, tests and evidence;
- confirm repository/CAD/cloud ownership;
- export relevant tickets and decisions;
- rotate shared or exposed secrets;
- revoke user, token, VPN and cloud access;
- remove device/site access;
- recover BSS assets, prototypes, cards and equipment;
- identify outstanding defects and obligations;
- confirm data return/deletion under signed terms;
- record legal hold where applicable;
- settle only accepted/authorized commercial items;
- update vendor scorecard;
- assign continuity owner;
- test that BSS or replacement vendor can continue.

### 20.3 Continuity test

A different qualified person should be able to:

- locate the current source;
- build/open the deliverable;
- run the required checks or inspect the design;
- understand known limitations;
- identify credentials without exposing them;
- continue from the latest accepted state.

Failure means handoff is incomplete.

## 21. Intellectual property and license checklist

Subject to qualified legal review and signed terms:

- pre-existing vendor IP identified;
- new deliverables identified;
- ownership/license rights defined;
- right to modify and engage another vendor clarified;
- source-file delivery required;
- third-party libraries/assets/fonts/models listed;
- open-source licenses reviewed;
- commercial-license obligations identified;
- stock media and design asset rights recorded;
- subcontractor contributions covered;
- employee/contractor author rights handled by the vendor;
- use of BSS confidential information restricted;
- portfolio/publicity rights require BSS approval;
- customer data and personal data excluded or governed separately;
- return/deletion and survival obligations defined.

Do not assume that paying an invoice automatically transfers every right.

## 22. External professional review backlog

Before material engagements, obtain appropriate advice on:

- contract form and signing authority;
- IP assignment/license wording;
- confidentiality and trade secrets;
- data-processing roles and subprocessors;
- liability, indemnity and insurance;
- warranty and acceptance;
- payment, VAT, withholding and invoicing;
- termination and dispute resolution;
- governing law and jurisdiction;
- consumer/employment classification risks where applicable;
- physical product safety, certification and installer obligations.

## 23. Fictional software-vendor dry run

All names and figures are fictional.

### Scenario

BSS seeks a vendor to integrate a stable backend branch into current `main`, resolve conflicts, run tests and produce a clean handoff.

### Intake

- category: `SW`;
- risk: `V3`;
- production access: not required;
- real customer data: prohibited;
- BSS owner and backup: fictional placeholders.

### RFQ outcome

Three proposals are reviewed.

- Vendor A is cheapest but refuses repository-based work and proposes sending a ZIP.
- Vendor B defines milestones, PR evidence and handoff, with a higher price.
- Vendor C requests unrestricted production access despite no production task.

Result:

- Vendor A fails continuity/source-of-truth requirements.
- Vendor C fails access minimization.
- Vendor B is shortlisted subject to due diligence and approved commercial terms.

### SOW deliverables

- dedicated integration branch from current `main`;
- conflict-resolution record;
- all relevant frontend/backend/database/security checks;
- PR to `main` without direct merge;
- updated documentation and known risks;
- reproducible local handoff.

### Milestone decision

Vendor submits a PR with green frontend checks, but backend integration tests were not run.

Outcome: `REJECTED` for final milestone, not because the work has no value, but because a critical acceptance criterion is missing.

After tests and evidence pass, BSS records `ACCEPTED`, authorizes the linked milestone and performs offboarding/access review.

## 24. Fictional hardware-supplier dry run

All names and figures are fictional.

### Scenario

BSS requests one CNC-machined terminal enclosure based on SolidWorks source and dimensioned drawings.

### Intake

- categories: `CAD` and `MFG`;
- risk: `V3`;
- critical dependencies: measured components, RFID antenna position, display opening and service access.

### Proposal comparison

- Supplier X provides only a rendered image and estimated outer dimensions.
- Supplier Y provides native files, drawings, tolerances, material, finish, inspection points and a prototype rework process.

Supplier Y is shortlisted even though price is higher because source, inspection and repeatability evidence are stronger.

### Acceptance

The prototype looks correct, but the display opening is outside the accepted tolerance and the rear service panel cannot be removed after installation.

Outcome: `REJECTED` for final acceptance. A photo of an attractive prototype does not override failed critical fit/service criteria.

A change/rework record is opened. Payment follows the signed milestone and defect terms, not an improvised verbal compromise.

## 25. Evidence index

| ID | Evidence |
|---|---|
| `VND-001` | Approved vendor intake record |
| `VND-002` | Risk-tier decision |
| `VND-003` | RFQ/RFP and proposal set |
| `VND-004` | Proposal comparison and hard-blocker review |
| `VND-005` | Due-diligence evidence |
| `VND-006` | Approved SOW and versions |
| `VND-007` | Commercial/legal approval record |
| `VND-008` | Access register and MFA evidence |
| `VND-009` | Milestone delivery evidence |
| `VND-010` | Acceptance/conditional/rejection record |
| `VND-011` | Change-request register |
| `VND-012` | Defect/rework evidence |
| `VND-013` | Vendor scorecard |
| `VND-014` | Offboarding and access-revocation evidence |
| `VND-015` | Continuity/handoff test |

## 26. Approval gates for this pack

### Internal template approval

Requires:

- founder review;
- no invented euro thresholds;
- alignment with Founder OS and repository governance;
- private-record storage location selected.

### Use for a real vendor request

Requires:

- engagement owner and backup;
- risk tier;
- approved scope and budget path;
- confidential fields kept outside the public repository.

### Contract/signature approval

Requires:

- authorized founder/director decision;
- legal/accounting/privacy review where applicable;
- final commercial terms;
- signed evidence stored privately.

### Production/customer-data access approval

Requires:

- explicit need;
- V4 controls;
- production and privacy readiness;
- time-limited least-privilege access;
- monitoring and immediate revocation capability.

## 27. Definition of done for a vendor engagement

An engagement is not `DONE` until:

- all accepted deliverables are in BSS control;
- required tests/measurements/evidence pass;
- final source and documentation are received;
- known defects and obligations are recorded;
- authorized invoices are reconciled with acceptance;
- access is reduced or revoked;
- secrets are rotated where required;
- the vendor scorecard is completed;
- continuity/handoff is proven;
- legal, data and asset return/deletion obligations are completed.
