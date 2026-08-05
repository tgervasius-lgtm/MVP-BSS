# BSS Pilot Success & Post-Pilot Review Pack

Status: `PROPOSED v0.1 / NOT EXECUTED / CUSTOMER-SPECIFIC EVIDENCE REQUIRED`

Owner: BSS Product Owner

Related workstreams: issues #55, #59, #60, #62, #64, #66, #75, #77, #79, #81 and #83

## 1. Purpose

This pack defines how BSS evaluates a controlled 4–6 week pilot and makes an evidence-based decision after the pilot.

It prevents five common mistakes:

1. treating a successful demo as a successful pilot;
2. treating positive comments as proof of technical reliability;
3. ignoring privacy, security or data-integrity failures because the customer likes the product;
4. converting a customer using an unapproved price or unsupported delivery promise;
5. continuing a weak pilot without a defined reason, owner or deadline.

This document is a decision framework. It is not proof that a pilot has happened, that BSS is production-ready or that any target has been achieved.

## 2. Status and language rules

Every pilot fact must use one of the following statuses:

- `BASELINE NEEDED`: value must be recorded before the pilot starts.
- `NOT STARTED`: the pilot activity has not begun.
- `MEASURING`: evidence is currently being collected.
- `ON TARGET`: current evidence meets the approved pilot threshold.
- `AT RISK`: current evidence is below target but recoverable.
- `FAILED`: the approved threshold was not met.
- `BLOCKED`: no valid conclusion can be made because evidence or a dependency is missing.
- `NOT APPLICABLE`: formally excluded from the signed pilot scope.

Decision statuses:

- `CONVERT`: proceed to a paid customer agreement using separately approved commercial terms.
- `EXTEND`: continue the pilot for a fixed period to gather missing evidence, without changing the core scope.
- `REMEDIATE`: pause normal evaluation while BSS fixes a defined problem and then performs a controlled re-test.
- `PAUSE`: temporarily stop use because an external dependency or unresolved approval prevents safe continuation.
- `STOP`: terminate the pilot and execute exit, export, access-removal and device-return procedures.

## 3. Non-negotiable hard stops

A positive customer opinion must not override any of the following:

- unresolved cross-tenant access or tenant-isolation failure;
- unresolved critical authentication or authorization failure;
- confirmed or suspected uncontained personal-data breach;
- unexplained loss, duplication or silent modification of attendance evidence;
- failed critical installation or electrical/safety acceptance test;
- inability to produce required audit evidence for material corrections;
- unapproved processing of real employee data;
- unresolved critical vulnerability with realistic pilot exposure;
- no viable manual fallback for a material outage;
- no named BSS and customer owner for the pilot;
- customer request to use the system outside the signed scope without a controlled change decision.

When a hard stop is triggered, the default decision is `PAUSE`, `REMEDIATE` or `STOP`, never `CONVERT`.

## 4. Pilot scope header

Complete this record before any live pilot data is entered.

| Field | Required value |
|---|---|
| Pilot ID | Customer-specific identifier |
| Customer legal name | Private evidence store only |
| Location count | Approved scope |
| Terminal count | Approved scope |
| Worker count | Approved scope |
| Pilot start date | Approved date |
| Planned end date | Approved date |
| Evaluation window | 4–6 weeks unless separately approved |
| BSS owner | Named person |
| Customer executive owner | Named person |
| Customer operational owner | Named person |
| Customer privacy/legal contact | Named role or person |
| Support channel | Approved channel |
| Support hours | Approved internal operating window |
| Approved pilot functions | Reference to signed scope |
| Explicit exclusions | Reference to signed scope |
| Approved data categories | Reference to privacy/data inventory |
| Baseline completed | `YES / NO` |
| Pilot Readiness gates passed | Evidence references |

A pilot with an incomplete scope header is `BLOCKED`.

## 5. Baseline before go-live

The baseline allows BSS to compare the pilot against the customer's previous process instead of only reporting activity counts.

### 5.1 Customer process baseline

Record:

- current clock-in/out method;
- current correction method;
- current leave-request method;
- current report/export method;
- who reviews attendance;
- who prepares accounting handoff;
- approximate time spent per week on corrections;
- approximate time spent per month preparing reports;
- common error types;
- current unresolved-record rate, where measurable;
- current employee complaints or friction points;
- current dependency on paper, spreadsheets or manual messaging.

### 5.2 Volume baseline

| Metric | Baseline value | Source | Owner |
|---|---:|---|---|
| Active workers in scope |  | Customer roster | Customer admin |
| Expected workdays |  | Pilot calendar | Customer admin |
| Expected daily attendance events |  | Worker count and shift plan | BSS analyst |
| Expected leave requests |  | Historical estimate | Customer admin |
| Expected corrections |  | Historical estimate | Customer manager |
| Expected monthly exports |  | Accounting process | Accounting contact |
| Expected terminal operating hours |  | Location schedule | Customer owner |

### 5.3 Baseline quality status

- `STRONG`: source data is documented and repeatable.
- `USABLE`: approximate historical data exists and limitations are recorded.
- `WEAK`: baseline is mostly subjective.
- `MISSING`: no comparison is possible.

A missing baseline does not automatically stop a pilot, but it limits claims about improvement and may force `EXTEND` or a narrower conclusion.

## 6. Metric record standard

Every metric must contain:

| Field | Requirement |
|---|---|
| Metric ID | Unique identifier |
| Name | Clear business name |
| Definition | Exact numerator, denominator and exclusions |
| Source | System, support log, survey or interview |
| Owner | Person responsible for collection |
| Frequency | Daily, weekly, mid-pilot or final |
| Working target | Proposed threshold approved for this pilot |
| Hard floor | Point below which the metric is failed |
| Evidence reference | Link or private record identifier |
| Status | Pilot status language |
| Notes | Known limitations and interpretation |

No metric may be reported without a defined source.

## 7. Proposed core pilot metrics

The following values are `PROPOSED WORKING TARGETS`. They must be approved for each pilot and are not contractual SLA commitments.

### 7.1 Adoption and usage

#### PSM-001 Worker activation coverage

Definition: activated in-scope workers divided by all in-scope workers.

- proposed target: `>= 95%` by the end of onboarding week;
- proposed hard floor: `< 85%` without an approved exclusion;
- source: tenant worker registry and approved pilot roster;
- frequency: onboarding completion and weekly.

#### PSM-002 Attendance-use coverage

Definition: in-scope workers who produced at least one valid pilot attendance event during an expected work period divided by workers expected to work.

- proposed target: `>= 90%`;
- proposed hard floor: `< 75%` for two consecutive weeks;
- exclusions: approved leave, sickness, off-site assignment and other documented non-attendance;
- source: attendance records plus approved schedule.

#### PSM-003 Role adoption

Definition: required customer roles that completed their planned weekly tasks.

- proposed target: Uprava, Voditelj and Knjigovodstvo each complete at least one relevant validated workflow;
- source: audit evidence and training/competency records;
- frequency: weekly.

### 7.2 Attendance completeness and data quality

#### PSM-004 Complete attendance-day rate

Definition: worker-days with a complete, reviewable attendance record divided by worker-days expected in scope.

- proposed target: `>= 98%` after the first stabilization week;
- proposed hard floor: `< 95%` after stabilization;
- source: attendance review dataset;
- frequency: daily and weekly.

#### PSM-005 Unresolved irregularity rate

Definition: unresolved missing or inconsistent attendance records older than the approved review window divided by expected worker-days.

- proposed target: `<= 2%`;
- proposed hard floor: `> 5%`;
- source: irregularity review queue or equivalent evidence;
- frequency: weekly.

#### PSM-006 Correction rate

Definition: attendance records requiring manual correction divided by attendance records created.

- proposed target: `<= 5%` after stabilization;
- interpretation: a higher rate can indicate user confusion, terminal placement issues, schedule configuration errors or product defects;
- source: audit log and correction records;
- frequency: weekly.

#### PSM-007 Correction audit completeness

Definition: material corrections containing actor, reason, original evidence, changed value and timestamp divided by all material corrections.

- required target: `100%`;
- hard floor: any unexplained material correction is a critical investigation item;
- source: audit log and correction evidence.

### 7.3 Terminal and synchronization reliability

#### PSM-008 Terminal operating-window availability

Definition: time the terminal is usable during the approved pilot operating window divided by total approved operating-window time, excluding approved planned maintenance.

- proposed target: `>= 98%`;
- proposed hard floor: `< 95%`;
- source: device health, monitoring and incident records;
- frequency: daily and weekly.

This is a pilot evaluation metric, not a contractual SLA.

#### PSM-009 Valid event processing rate

Definition: valid submitted terminal events processed exactly once into the intended attendance outcome divided by all valid submitted terminal events.

- proposed target: `>= 99.5%`;
- critical rule: unexplained duplication or loss triggers data-integrity investigation;
- source: terminal event evidence, sync timeline and attendance result;
- frequency: daily and weekly.

#### PSM-010 Offline/retry recovery

Definition: tested offline events that synchronize correctly after connectivity returns.

- proposed target: `100%` for the approved test scenarios;
- source: controlled offline test evidence;
- frequency: installation acceptance, mid-pilot and after relevant changes.

### 7.4 Leave and administrative workflow

#### PSM-011 Leave workflow completion

Definition: in-scope leave requests that reach an authorized, auditable final state within the approved decision window.

- proposed target: `>= 95%`;
- source: leave-request and audit records;
- frequency: weekly.

#### PSM-012 Admin task completion

Definition: planned daily, weekly and monthly admin routines completed with evidence.

- proposed target: `>= 90%`;
- source: Customer Admin Manual routine log;
- frequency: weekly.

### 7.5 Reporting and accounting usefulness

#### PSM-013 Report preview correctness

Definition: sampled report rows and totals verified against authoritative pilot attendance data.

- required target: no unexplained material mismatch;
- source: report verification worksheet;
- frequency: at least weekly and final.

#### PSM-014 Export usability

Definition: accounting contact can open, understand and use the approved XLSX/CSV export for the agreed handoff process without manual reconstruction.

- proposed outcome: `PASS / CONDITIONAL PASS / FAIL`;
- source: accounting validation session;
- frequency: mid-pilot and final.

BSS MVP does not calculate payroll. Export usefulness must not be described as payroll calculation.

#### PSM-015 Administrative time impact

Definition: weekly time spent on attendance review, corrections and reporting compared with the usable baseline.

- proposed target: measurable reduction or clear process-quality improvement;
- no public percentage claim may be made from a single pilot;
- source: customer time log and interview;
- frequency: baseline, mid-pilot and final.

### 7.6 Support and operational burden

#### PSM-016 Support case volume

Definition: support cases per 100 in-scope workers per week, separated by user question, configuration, defect, incident and training gap.

- target: customer-specific working band;
- source: Support & Incident OS case log;
- frequency: weekly.

#### PSM-017 Repeat issue rate

Definition: cases caused by a previously identified unresolved root cause divided by total cases.

- proposed target: declining trend after week one;
- source: problem and incident records;
- frequency: weekly.

#### PSM-018 Critical incident status

- required target: zero unresolved SEV-1 or critical security/privacy/data-integrity incidents at final review;
- source: incident register;
- frequency: continuous and final.

### 7.7 User confidence and commercial signal

#### PSM-019 Role confidence score

Each trained role answers: "I can complete my normal BSS tasks without direct BSS assistance."

- scale: 1–5;
- proposed target: average `>= 4.0`, with no critical role below 3;
- source: named role survey or interview;
- frequency: mid-pilot and final.

#### PSM-020 Executive value assessment

Customer executive evaluates:

- visibility;
- control;
- reduction in manual work;
- trust in records;
- implementation effort;
- willingness to continue.

Outcome: `STRONG / MODERATE / WEAK / NEGATIVE` with written reasons.

#### PSM-021 Willingness to proceed

Outcome:

- `YES, SUBJECT TO APPROVED OFFER`;
- `YES, AFTER SPECIFIC REMEDIATION`;
- `UNDECIDED`;
- `NO`.

This is a commercial signal, not proof of product readiness.

## 8. Weekly evidence cadence

### Daily

- terminal availability;
- sync or processing failures;
- unresolved irregularities;
- critical incidents;
- manual fallback usage;
- customer-blocking issues.

### Weekly

- adoption coverage;
- complete attendance-day rate;
- correction rate;
- leave completion;
- admin routine completion;
- support case categories;
- current risks and actions;
- customer owner confirmation.

### Mid-pilot

- baseline comparison;
- role confidence check;
- report/export validation;
- known limitations review;
- scope adherence;
- decision whether the pilot remains valid.

### Final

- complete metric table;
- unresolved incidents and risks;
- stakeholder interviews;
- commercial signal;
- final decision and rationale;
- exit or conversion evidence.

## 9. Weekly review template

| Field | Value |
|---|---|
| Pilot week |  |
| Evidence cut-off |  |
| Overall status | `ON TARGET / AT RISK / FAILED / BLOCKED` |
| Metrics on target |  |
| Metrics at risk |  |
| Failed metrics |  |
| Hard stops triggered |  |
| Open incidents |  |
| Manual fallback use |  |
| Customer feedback themes |  |
| Product defects |  |
| Training gaps |  |
| Configuration gaps |  |
| Owner actions |  |
| Due dates |  |
| Scope-change request | `YES / NO` |
| Continue next week | `YES / CONDITIONAL / NO` |

## 10. Mid-pilot review

The mid-pilot review occurs after enough normal operations exist to distinguish onboarding friction from recurring failure.

Required participants:

- BSS Product Owner;
- BSS operational/technical owner;
- customer executive owner;
- customer operational owner;
- customer privacy/legal contact when relevant.

Required outputs:

1. current metric summary;
2. unresolved hard stops;
3. root-cause classification for major problems;
4. approved corrective actions;
5. scope-change decisions;
6. updated risk assessment;
7. decision: continue, remediate, pause or stop.

A pilot must not silently expand at mid-point. New locations, worker groups, integrations or functions require explicit scope approval.

## 11. Corrective-action record

| Field | Requirement |
|---|---|
| Action ID | Unique identifier |
| Problem | Evidence-based description |
| Classification | Product, configuration, training, hardware, infrastructure, privacy, customer process or external |
| Root cause | Known, suspected or unknown |
| Owner | Named person |
| Due date | Fixed date |
| Success test | Observable result |
| Risk while open | Low, medium, high or critical |
| Status | Open, testing, complete, rejected or deferred |
| Evidence | Private evidence reference |

## 12. Final stakeholder interviews

### 12.1 Uprava

Ask:

- What became more visible or controllable?
- Which previous manual steps remained?
- Which result do you trust most and least?
- Which limitation prevents wider adoption?
- What would make continuation worthwhile?
- Would you approve a paid continuation subject to a formal offer?

### 12.2 Voditelj

Ask:

- How often did you review irregular records?
- Were corrections understandable and auditable?
- Which task caused the most repeated effort?
- Did worker questions decrease after training?
- Which alert or view was missing?
- Could another manager operate the process without BSS present?

### 12.3 Radnik

Ask:

- Was clock-in/out clear and predictable?
- Did you understand confirmation and error states?
- What happened when you made a mistake?
- Was the leave-request flow understandable?
- Did you feel appropriately informed about data use?
- What would make daily use easier?

### 12.4 Knjigovodstvo

Ask:

- Could you access only the information needed for your role?
- Were report filters and totals understandable?
- Could you use the export without rebuilding it manually?
- Which fields or formats were missing?
- Were corrections and final values traceable?
- Is the handoff usable while recognizing that BSS does not calculate payroll?

## 13. Scoring model

Use five evaluation domains:

| Domain | Weight | Minimum condition |
|---|---:|---|
| Product workflow value | 25% | Core scoped workflow completed |
| Data quality and correctness | 25% | No unexplained material mismatch |
| Technical and terminal reliability | 20% | No unresolved critical failure |
| Operations, support and training | 15% | Customer can operate normal tasks |
| Commercial willingness and fit | 15% | Clear continuation signal |

Suggested scoring per domain:

- `5`: clearly exceeds the approved pilot target;
- `4`: meets the target with minor non-blocking limitations;
- `3`: partial success requiring defined remediation;
- `2`: materially below target;
- `1`: failed or not credible;
- `0`: blocked or critical failure.

The weighted score is supporting information only. Hard stops always override the numeric result.

## 14. Decision rules

### 14.1 CONVERT

Allowed only when:

- no hard stop is open;
- data quality and correctness pass;
- core scoped workflows pass;
- customer operational owners can use the system;
- support and incident ownership are proven;
- customer expresses willingness to continue;
- pricing and commercial terms are separately approved;
- production/live-use gates required for the next phase are satisfied.

### 14.2 EXTEND

Allowed when:

- there is no open critical risk;
- missing evidence can reasonably be collected in a fixed period;
- the core scope does not materially change;
- extension has a maximum end date;
- extension success criteria and owner are written before continuation.

Extension is not a default way to avoid a decision.

### 14.3 REMEDIATE

Use when:

- a defined product, configuration, training, hardware or infrastructure issue invalidates normal evaluation;
- a fix and re-test can be safely isolated;
- the customer agrees to the controlled remediation window.

### 14.4 PAUSE

Use when:

- a legal, privacy, security, infrastructure, site or customer dependency prevents safe continuation;
- evidence cannot currently be collected;
- normal operation would create avoidable risk.

### 14.5 STOP

Use when:

- the customer withdraws;
- a hard stop cannot be remediated in the approved window;
- the product does not solve the agreed problem;
- support or implementation burden is unsustainable;
- required legal/privacy conditions cannot be satisfied;
- the customer refuses required operating controls.

## 15. Final decision record

| Field | Value |
|---|---|
| Pilot ID |  |
| Review date |  |
| Participants |  |
| Baseline quality |  |
| Overall metric status |  |
| Hard stops |  |
| Weighted score | Supporting only |
| Customer outcome |  |
| BSS outcome |  |
| Final decision | `CONVERT / EXTEND / REMEDIATE / PAUSE / STOP` |
| Decision rationale | Evidence-based summary |
| Conditions |  |
| Owner |  |
| Deadline |  |
| Evidence package |  |
| Product Owner approval |  |
| Customer acknowledgement |  |

## 16. Paid-conversion handoff

A `CONVERT` decision does not itself create a contract.

Before a paid continuation:

- confirm the approved product scope;
- confirm all known limitations;
- select an `INTERNAL APPROVED` price from the Pricing Baseline;
- produce a customer-specific margin check;
- confirm VAT/accounting treatment;
- confirm device ownership and return rules;
- confirm support scope and hours;
- confirm data-processing terms and subprocessors;
- confirm production environment and backup/restore evidence;
- confirm customer and BSS owners;
- sign the commercial and legal documents;
- define the effective start date;
- preserve the pilot evidence separately from the production customer record.

No historical working price band may be presented as the approved offer.

## 17. Testimonial, logo and reference permission

Service consent, DPA acceptance or pilot participation does not authorize marketing use.

Separate explicit permission is required for:

- customer name;
- customer logo;
- written testimonial;
- performance or savings quote;
- case study;
- customer reference call;
- photos of the location or terminal;
- worker or staff quotes.

Permission record:

| Field | Value |
|---|---|
| Material approved |  |
| Exact wording/assets |  |
| Channels |  |
| Territory |  |
| Duration |  |
| Approval owner |  |
| Revocation process |  |
| Evidence |  |

## 18. Exit and offboarding

For `STOP`, `PAUSE`, non-conversion or end of pilot:

1. freeze the end-of-pilot evidence cut-off;
2. provide the approved customer export;
3. record unresolved corrections and incidents;
4. disable pilot access according to the agreed date;
5. revoke terminal and user credentials;
6. remove or collect the terminal;
7. update device chain-of-custody;
8. apply retention, deletion and legal-hold decisions;
9. schedule backup-expiry confirmation where required;
10. issue an offboarding/deletion evidence certificate when applicable;
11. close support cases or transfer them to an approved follow-up plan;
12. document product learnings without copying real personal data into GitHub.

## 19. Product-learning backlog

Every learning item must include:

| Field | Requirement |
|---|---|
| Learning ID | Unique identifier |
| Evidence | Metric, interview, incident or observation |
| Problem statement | User or operational problem, not a guessed feature |
| Affected role | Uprava, Voditelj, Radnik, Knjigovodstvo or BSS |
| Frequency | One-time, repeated or systemic |
| Impact | Low, medium, high or critical |
| Workaround | Current safe workaround |
| Proposed response | Research, design, fix, documentation or rejection |
| Product owner decision | Accepted, deferred, rejected or needs evidence |
| Linked issue | GitHub issue when approved |

A customer request is not automatically a roadmap commitment.

## 20. Fictional four-week pilot dry run

All names and values below are fictional.

### 20.1 Pilot header

- customer: `Fiktivna Proizvodnja d.o.o.`;
- one location;
- one simulated/accepted pilot terminal;
- 30 in-scope workers;
- four-week evaluation;
- baseline quality: `USABLE`.

### 20.2 Baseline

- paper attendance plus spreadsheet consolidation;
- approximately 3.5 hours weekly spent resolving attendance questions;
- monthly accounting file prepared manually;
- frequent missing departure times;
- no consistent correction reason log.

### 20.3 Final fictional evidence

| Metric | Result | Status |
|---|---:|---|
| Worker activation coverage | 100% | ON TARGET |
| Attendance-use coverage | 93% | ON TARGET |
| Complete attendance-day rate | 98.4% | ON TARGET |
| Unresolved irregularity rate | 1.6% | ON TARGET |
| Correction rate | 6.2% | AT RISK |
| Correction audit completeness | 100% | ON TARGET |
| Terminal availability | 98.7% | ON TARGET |
| Valid event processing | 99.8% | ON TARGET |
| Offline recovery test | 100% | ON TARGET |
| Leave workflow completion | 100% | ON TARGET |
| Export usability | CONDITIONAL PASS | AT RISK |
| Weekly admin time | 2.2 hours | IMPROVED, LIMITED BASELINE |
| Critical incidents open | 0 | ON TARGET |
| Average role confidence | 4.1/5 | ON TARGET |
| Willingness to proceed | After export remediation | CONDITIONAL |

### 20.4 Findings

- correction rate remained above the working target because several workers forgot the first-week process;
- repeated training reduced the rate in weeks three and four;
- accounting requested one additional agreed export field;
- no data-integrity or tenant-isolation failure was observed in the fictional scenario;
- customer would continue after export remediation and an approved offer.

### 20.5 Fictional decision

Decision: `REMEDIATE`, then re-test export and one week of correction-rate trend.

Conversion is not yet approved because:

- pricing is not approved in this fictional example;
- the export condition must be re-tested;
- production-readiness evidence remains outside this fictional dry run.

## 21. Evidence index

| Evidence ID | Evidence |
|---|---|
| PSP-001 | Approved pilot scope header |
| PSP-002 | Customer process baseline |
| PSP-003 | Volume baseline |
| PSP-004 | Metric catalogue and approved thresholds |
| PSP-005 | Daily reliability evidence |
| PSP-006 | Weekly review records |
| PSP-007 | Mid-pilot review |
| PSP-008 | Corrective-action register |
| PSP-009 | Final metric table |
| PSP-010 | Stakeholder interview records |
| PSP-011 | Final decision record |
| PSP-012 | Commercial conversion checklist |
| PSP-013 | Testimonial/reference permission, when applicable |
| PSP-014 | Exit/offboarding evidence |
| PSP-015 | Product-learning backlog |

## 22. Approval gates

### Gate A — Template ready

- metric definitions reviewed;
- hard-stop logic reviewed;
- fictional dry run complete;
- no real customer data in the repository.

### Gate B — Customer-specific pilot criteria approved

- scope signed;
- baseline recorded;
- targets approved;
- owners named;
- evidence sources available.

### Gate C — Final review valid

- full evidence period completed;
- missing evidence disclosed;
- hard stops evaluated;
- stakeholder review completed;
- final decision signed.

### Gate D — Conversion valid

- `CONVERT` decision allowed by hard-stop rules;
- commercial price approved;
- legal/privacy and production gates complete;
- customer agreement signed;
- operational ownership accepted.

## 23. Definition of done for this document

This document is complete as a `PROPOSED v0.1` planning package when:

- it is merged through the required repository gates;
- metrics, thresholds, sources and owners are defined as templates;
- hard-stop and decision logic are explicit;
- the fictional dry run is preserved as fictional;
- no target is represented as a contractual promise;
- issue #83 remains open until customer-specific execution evidence exists.
