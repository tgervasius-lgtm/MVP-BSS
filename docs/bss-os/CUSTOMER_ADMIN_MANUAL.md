# BSS Customer Admin Manual

Status: `PROPOSED v0.1`
Owner: BSS Product Owner
Operational owner: customer-appointed BSS administrator
Last reviewed: 2026-08-05
Related issues: #81, #62, #55, #58

## 1. Purpose

This manual defines the safe and repeatable business procedure for administering BSS during internal rehearsal, controlled Preview demonstrations, dry runs and future customer pilots.

It is not proof that the corresponding software capability is production-ready. The current Product Feature Registry shows that most authoritative backend capabilities remain `IN REVIEW` and `NOT DEPLOYED` until issue #55 is complete.

Exact screenshots, button labels and click paths are intentionally marked `BLOCKED` until:

1. PR #27 is safely consolidated through issue #55;
2. the Preview Portal is reconstructed through issue #58;
3. the Product Feature Registry is updated with final evidence;
4. the instructions are tested against the authoritative interface.

## 2. Intended audience

This manual is for:

- the customer employee appointed as BSS administrator;
- customer management responsible for attendance and leave decisions;
- managers who review attendance exceptions and leave requests;
- accounting users who review and export approved data;
- BSS support personnel assisting with setup or incidents;
- trainers validating that customer users can perform approved tasks safely.

It is not a worker privacy notice, legal contract, payroll manual, technical deployment runbook or hardware installation guide.

## 3. Document status language

| Status | Meaning |
|---|---|
| `AVAILABLE IN AUTHORITATIVE BASELINE` | Merged and evidenced in the current authoritative product baseline. |
| `IN REVIEW` | Implementation exists in an unmerged or not-yet-consolidated branch. |
| `PREVIEW ONLY` | Demonstrable with fictional data but not evidence of production capability. |
| `PROCEDURE DEFINED` | The business process is documented, but exact UI instructions are not final. |
| `BLOCKED` | Must not be used for live customer operations yet. |
| `NOT IN MVP` | Explicitly excluded from the current MVP. |

At the time of this version, the procedures below are primarily `PROCEDURE DEFINED`, while exact UI navigation is `BLOCKED` by issues #55 and #58.

## 4. Fundamental administration rules

1. Use the least-privileged role required for the task.
2. Never share accounts, passwords, invitations or recovery links.
3. Never enter real employee data into a public Preview or public repository fixture.
4. Never silently overwrite original attendance evidence.
5. Every correction requires a reason, actor, timestamp and audit trail.
6. RFID identifiers are personal-data-linked credentials and must be handled accordingly.
7. Accounting access is not general administration access.
8. BSS does not calculate payroll in the MVP.
9. Exports must be reviewed before they are handed to payroll or accounting systems.
10. A successful demo, training or checklist does not authorize live processing.
11. If a critical action does not behave as documented, stop and follow the Support & Incident OS.
12. Customer administrators may not bypass privacy, retention, legal-hold or audit requirements.

## 5. Role model

The final role-operation matrix must be revalidated after issue #55. The following is the proposed customer operating model.

### 5.1 Uprava

Primary purpose:

- company-level oversight;
- organization and policy ownership;
- access approval;
- pilot and operational decisions;
- review of high-level attendance, leave and exception indicators.

Expected permitted activities:

- approve organization-level settings and policy decisions;
- appoint or remove customer administrators;
- approve sensitive role assignments;
- review company-wide dashboards and evidence where allowed;
- approve pilot go/no-go and major corrective actions.

Prohibited or restricted activities:

- routine editing of individual attendance records without documented operational reason;
- using broad access for normal worker or accounting tasks;
- presenting dashboard indicators as payroll calculations;
- overriding failed technical, privacy or acceptance gates.

### 5.2 Voditelj

Primary purpose:

- manage assigned workers, departments or teams;
- review attendance irregularities;
- decide approved leave requests within delegated authority;
- ensure manual fallback records are reconciled.

Expected permitted activities:

- view assigned team data;
- review missing or irregular events;
- propose or approve corrections within delegated rules;
- approve or reject leave requests;
- monitor approved leave visibility for the permitted group.

Prohibited or restricted activities:

- company-wide access unless separately authorized;
- changing another department's workers without authority;
- assigning high-privilege roles;
- viewing accounting exports without the appropriate role;
- approving their own correction or leave where segregation of duties is required.

### 5.3 Radnik

Primary purpose:

- clock in and out;
- view their own relevant information;
- submit leave or correction requests where supported;
- report card loss or incorrect attendance.

Expected permitted activities:

- use the assigned RFID credential;
- view own attendance and approved leave information;
- submit a leave request;
- report an incorrect or missing attendance event;
- follow manual fallback instructions during an outage.

Prohibited activities:

- editing authoritative attendance records directly;
- viewing another worker's detailed records;
- assigning or replacing RFID cards;
- approving leave or corrections;
- exporting company reports.

### 5.4 Knjigovodstvo

Primary purpose:

- preview approved report data;
- export validated XLSX or CSV datasets;
- perform accounting handoff.

Expected permitted activities:

- select approved report types and filters;
- preview bounded data;
- export approved datasets;
- identify inconsistencies for customer review.

Prohibited or restricted activities:

- general worker administration;
- changing attendance evidence;
- approving leave or corrections unless separately assigned another role;
- treating BSS export as final payroll without customer validation;
- accessing unnecessary personal data outside the reporting purpose.

## 6. Administration process template

Every procedure in this manual uses the same evidence model.

| Field | Required content |
|---|---|
| Procedure ID | Stable manual reference. |
| Owner | Role responsible for execution. |
| Preconditions | What must already be approved or available. |
| Input | Minimum required data. |
| Procedure | Business steps without unstable click-path assumptions. |
| Expected result | Observable outcome. |
| Evidence | What proves the procedure was completed. |
| Failure path | Safe response when the result is not achieved. |
| Audit/privacy note | Required accountability or minimization control. |

## 7. Company and organization setup

### ADM-ORG-01 — Confirm company profile

Owner: Uprava or approved customer administrator.

Preconditions:

- customer identity and contractual scope confirmed;
- tenant creation authorized;
- live data prohibited until Pilot Readiness gates permit it.

Required inputs:

- legal company name;
- display name;
- approved operational timezone;
- permitted location and department structure;
- named customer owner;
- named BSS owner.

Procedure:

1. Confirm the tenant corresponds to the intended customer.
2. Verify the approved display name and timezone.
3. Confirm the tenant is active only in the permitted environment.
4. Record the named customer and BSS owners.
5. Compare configured fields with the approved onboarding record.
6. Do not add unnecessary personal or legal-identification data.

Expected result:

- correct organization identity and timezone;
- no cross-customer information visible;
- responsible owners documented.

Evidence:

- tenant setup record;
- environment identifier;
- owner approval;
- fictional dry-run screenshot after UI validation.

Failure path:

- stop onboarding;
- do not add workers;
- raise a support case with `TENANT` and possible `SECURITY` labels if cross-tenant data is suspected.

UI status: `BLOCKED` pending #55/#58.

### ADM-ORG-02 — Create or update a department

Owner: approved customer administrator.

Preconditions:

- organization confirmed;
- department name and responsible manager approved.

Procedure:

1. Confirm the department is operationally required.
2. Use a clear, non-sensitive name.
3. Assign the responsible manager only after role authorization.
4. Apply effective-date or revision controls where supported.
5. Review the worker impact before blocking or renaming a department.
6. Record the change reason.

Expected result:

- department visible only within the correct tenant;
- assigned manager and effective status are correct;
- audit evidence exists.

Failure path:

- do not create duplicate departments to work around a conflict;
- preserve the existing record;
- escalate revision or validation errors.

Registry reference: `ORG-002` is currently `IN REVIEW`, `NOT DEPLOYED`.

## 8. Worker lifecycle

### 8.1 Worker status model

Proposed operational states:

| State | Meaning |
|---|---|
| `DRAFT` | Prepared but not invited or activated. |
| `INVITED` | Activation invitation issued. |
| `ACTIVE` | Authorized for approved use. |
| `SUSPENDED` | Temporarily blocked from access or clocking where policy allows. |
| `ARCHIVED` | Employment or pilot access ended; retained according to policy. |

The actual implemented status names must be validated after issue #55.

### ADM-WRK-01 — Create a worker record

Owner: customer administrator.

Preconditions:

- lawful purpose and data-minimization rules confirmed;
- worker is in scope for the customer tenant;
- required privacy information provided by the customer;
- role and department decision available.

Minimum inputs:

- approved worker identifier;
- name fields required by the product;
- employment or operational status;
- department where needed;
- role assignment where authorized;
- start date or effective date where supported.

Do not enter by default:

- OIB;
- home address;
- bank data;
- identity-document copies;
- medical documentation;
- biometric data;
- private communications.

Procedure:

1. Check that the worker does not already exist.
2. Confirm the correct tenant and department.
3. Enter only approved minimum data.
4. Assign the least-privileged role.
5. Review all values before activation or invitation.
6. Record the creation evidence.

Expected result:

- one worker record in the correct tenant;
- correct status, department and role;
- no duplicate or unnecessary data.

Failure path:

- do not create a second record to bypass validation;
- investigate duplicates or tenant mismatch;
- escalate suspected cross-tenant visibility immediately.

Registry reference: `ORG-003` is `IN REVIEW`, `NOT DEPLOYED`.

### ADM-WRK-02 — Invite and activate a user

Owner: customer administrator.

Preconditions:

- worker record reviewed;
- login access genuinely required;
- correct recipient contact confirmed through an approved private channel.

Procedure:

1. Confirm the intended role before sending the invitation.
2. Generate a one-time activation invitation through the approved system.
3. Send only to the confirmed recipient.
4. Do not forward or reuse activation links.
5. Confirm activation outcome without requesting the user's password.
6. Revoke and replace a suspected exposed invitation.

Expected result:

- one activated user with the approved role;
- one-time invitation cannot be reused;
- no password is known to the administrator.

Failure path:

- expired invitation: issue a new one after revalidation;
- wrong recipient: revoke immediately and open a security/privacy assessment;
- reused or suspicious token: stop activation and escalate.

Registry reference: `IAM-003` is `IN REVIEW`, `NOT DEPLOYED`.

### ADM-WRK-03 — Suspend or archive a worker

Owner: customer administrator with customer authorization.

Preconditions:

- documented reason and effective time;
- retention and legal-hold requirements reviewed;
- open attendance, leave, card and export tasks identified.

Procedure:

1. Confirm whether temporary suspension or archive is appropriate.
2. Record the effective date and reason.
3. Revoke or deactivate access as required.
4. Revoke the RFID credential or prevent future use.
5. Preserve historical attendance and audit evidence.
6. Complete outstanding corrections or document why they remain open.
7. Verify the user can no longer access prohibited functions.

Expected result:

- future access removed at the intended time;
- historical evidence remains available according to policy;
- card and invitation state are aligned.

Failure path:

- if access persists, treat as an access-control incident;
- if historical data disappears unexpectedly, stop and escalate as a data-integrity incident.

## 9. Role assignment

### ADM-RBAC-01 — Assign or change a role

Owner: customer administrator; high-privilege assignments require Uprava approval.

Preconditions:

- business need documented;
- least-privilege review completed;
- incompatible role combinations reviewed.

Procedure:

1. Identify the exact tasks the user must perform.
2. Select the narrowest role that supports those tasks.
3. Obtain required approval for Uprava or administrator-level access.
4. Apply the role change.
5. Test a permitted action and a prohibited action using a fictional or approved test account.
6. Record the role, approver, effective date and test evidence.

Expected result:

- permitted functions available;
- prohibited functions unavailable;
- no cross-tenant or unnecessary access.

Failure path:

- remove or roll back the role if excessive access appears;
- escalate any authorization inconsistency as a security defect.

Registry reference: `IAM-004` and `REPORT-005` remain `IN REVIEW`, `NOT DEPLOYED`.

## 10. Shift and schedule administration

### ADM-SHF-01 — Create or update a shift definition

Owner: customer administrator or delegated manager.

Preconditions:

- approved shift name and working-time rules;
- timezone confirmed;
- change effective date agreed;
- impact on attendance interpretation understood.

Procedure:

1. Confirm the shift does not duplicate an existing definition.
2. Record start, end and applicable break assumptions supported by the product.
3. Confirm overnight-shift handling where relevant.
4. Set an effective date rather than rewriting historical interpretation where supported.
5. Assign the shift only to approved workers.
6. Validate one normal, one late and one overnight example using fictional data.

Expected result:

- future attendance is interpreted against the intended schedule;
- historical records are not silently reinterpreted;
- assigned workers and effective dates are correct.

Failure path:

- stop rollout if timezone or overnight behavior is unclear;
- do not manually alter attendance records to compensate for a broken shift definition;
- escalate schedule edge cases.

Registry reference: `ORG-004` is `IN REVIEW`, `NOT DEPLOYED`.

### ADM-SHF-02 — Maintain holiday calendar

Owner: customer administrator.

Procedure:

1. Confirm the applicable tenant/region holiday.
2. Check for duplicates and date accuracy.
3. Apply revision/effective-date controls.
4. Verify the effect on leave calculation with fictional examples.
5. Record the source and approver.

Expected result:

- holiday affects only the correct tenant;
- leave calculations follow the approved calendar.

Registry references: `ORG-005` and `LEAVE-005` are `IN REVIEW`, `NOT DEPLOYED`.

## 11. RFID credential administration

### 11.1 Credential rules

- Treat every card as a revocable credential.
- Never store a raw RFID UID in screenshots, chat, support tickets or public repositories.
- Display and support tooling should use masked identifiers only.
- A card must be assigned to only one intended worker at a time.
- Lost, stolen or exposed cards must be revoked promptly.

### ADM-RFID-01 — Assign a card

Owner: customer administrator.

Preconditions:

- worker identity confirmed;
- card physically available;
- card not assigned elsewhere;
- terminal propagation path available for the relevant environment.

Procedure:

1. Confirm the worker and tenant.
2. Read or enter the credential only through the approved secure flow.
3. Verify the displayed identifier is masked.
4. Assign the card to the worker.
5. Test one clock-in and one clock-out using the approved test context.
6. Verify the event appears for the correct worker only.
7. Record assignment and test evidence.

Expected result:

- credential assigned to the correct worker;
- raw UID not exposed;
- terminal and administration views agree.

Failure path:

- duplicate assignment: stop and investigate;
- wrong worker event: revoke immediately and treat as a data-integrity/security incident;
- propagation failure: follow terminal/support procedures.

Registry references: `RFID-001` and `RFID-003` are `IN REVIEW`, `NOT DEPLOYED`.

### ADM-RFID-02 — Replace, revoke or report a lost card

Owner: customer administrator.

Procedure:

1. Confirm the worker and reason.
2. Revoke the old credential before activating the replacement where possible.
3. Record loss, damage, compromise or replacement reason.
4. Assign and test the replacement card.
5. Confirm the old card is rejected.
6. Preserve the audit trail linking the state transitions.

Expected result:

- replacement works for the intended worker;
- old credential cannot be used;
- audit evidence exists.

Registry reference: `RFID-002` is `IN REVIEW`, `NOT DEPLOYED`.

## 12. Attendance administration

### 12.1 Attendance evidence model

An attendance record may include:

- original clock events;
- calculated or displayed attendance period;
- irregularity flag;
- correction request;
- correction decision;
- reason and actor;
- audit entry.

The original event must remain distinguishable from a later correction.

### ADM-TIME-01 — Daily attendance review

Owner: Voditelj or customer administrator.

Procedure:

1. Review current presence and the irregular-event queue.
2. Filter to the permitted department, worker or date range.
3. Identify missing clock-in, missing clock-out, duplicate or implausible events.
4. Compare with approved manual fallback records or manager evidence.
5. Do not edit the record without a documented correction process.
6. Assign an owner and due date for unresolved exceptions.

Expected result:

- every critical irregularity has a status, owner and evidence path;
- no silent correction occurs.

Registry references: `TIME-002`, `TIME-003` and `TIME-005` are `IN REVIEW`, `NOT DEPLOYED`.

### ADM-TIME-02 — Process an attendance correction

Owner: delegated manager or administrator according to customer policy.

Preconditions:

- original event identified;
- worker or manager explanation available;
- supporting evidence available;
- approver is authorized and not prohibited by segregation rules.

Procedure:

1. Record the requested correction.
2. Record the reason and supporting evidence reference.
3. Compare the request with original events and shift rules.
4. Approve, reject or request clarification.
5. Apply the correction through the approved correction flow.
6. Verify the original evidence remains traceable.
7. Verify the report preview reflects the authorized result.
8. Record the decision actor and timestamp.

Expected result:

- authorized corrected value visible;
- original evidence and reason preserved;
- report and audit views are consistent.

Failure path:

- inconsistent report: stop export and raise a data-integrity support case;
- missing audit entry: treat correction as failed;
- unauthorized self-approval: revert or escalate according to policy.

Registry reference: `TIME-004` and `AUDIT-001/002` are `IN REVIEW`, `NOT DEPLOYED`.

### ADM-TIME-03 — Reconcile manual fallback attendance

Owner: customer administrator with manager review.

Preconditions:

- approved manual fallback form exists;
- outage window and affected workers identified;
- terminal/platform recovery confirmed.

Procedure:

1. Preserve the original manual form.
2. Confirm worker identity, date, time, direction and witness where required.
3. Enter reconciliation through the authorized correction flow.
4. Use a consistent outage reason reference.
5. Have the delegated approver review the reconciliation.
6. Confirm audit evidence and report consistency.
7. Link the reconciliation to the incident record.

Expected result:

- fallback events reconciled without hiding the outage;
- incident, correction and report evidence are linked.

## 13. Leave and absence administration

### ADM-LEAVE-01 — Set or review leave allowance

Owner: customer administrator with customer HR/accounting policy approval.

Procedure:

1. Confirm the applicable allowance source and period.
2. Confirm carryover or special rules externally with the customer advisor.
3. Enter only the approved authoritative allowance.
4. Verify approved, planned, remaining and available calculations.
5. Record the source and approver.

Expected result:

- allowance matches approved customer policy;
- calculations are explainable and testable.

Failure path:

- calculation disagreement: do not manually force a result without evidence;
- escalate business-rule ambiguity before live use.

Registry reference: `LEAVE-003` is `IN REVIEW`, `NOT DEPLOYED`.

### ADM-LEAVE-02 — Process a leave request

Owner: worker submits; delegated Voditelj decides.

Procedure:

1. Worker selects the intended dates and submits the request.
2. System validates basic date rules where supported.
3. Manager reviews staffing, entitlement and policy evidence.
4. Manager approves, rejects or requests clarification.
5. Decision reason is recorded where required.
6. Approved leave appears only to the permitted audience.
7. Remaining allowance is verified.

Expected result:

- one clear final status;
- decision actor and timestamp recorded;
- privacy-minimized calendar visibility;
- allowance totals remain consistent.

Failure path:

- duplicate request: do not approve both;
- incorrect visibility: treat as privacy/access incident;
- calculation mismatch: stop and escalate before further approvals.

Registry references: `LEAVE-001` to `LEAVE-005` are `IN REVIEW` or `PARTIAL / IN REVIEW`, `NOT DEPLOYED`.

## 14. Reports and accounting handoff

### 14.1 Payroll boundary

BSS MVP supports attendance review, report preview and export. It does not calculate final payroll, statutory deductions, tax, contributions or salary payments.

### ADM-REP-01 — Preview a report

Owner: Knjigovodstvo or another authorized reporting role.

Procedure:

1. Select an approved report type.
2. Select the intended organization scope and date range.
3. Confirm filters are bounded and appropriate.
4. Generate the preview.
5. Review totals, irregularities, corrections and leave effects.
6. Record the preview dataset/version reference where supported.
7. Resolve open critical inconsistencies before export.

Expected result:

- bounded preview with expected workers, dates and totals;
- no unauthorized department or tenant data;
- unresolved issues clearly identified.

Failure path:

- unexpected worker or tenant data: stop and escalate as security incident;
- stale or inconsistent preview: regenerate according to supported workflow or escalate;
- more than the supported preview limit: narrow filters rather than bypass controls.

Registry reference: `REPORT-001/002` are `IN REVIEW`, `NOT DEPLOYED`.

### ADM-REP-02 — Export XLSX or CSV

Owner: authorized Knjigovodstvo user.

Preconditions:

- preview reviewed;
- critical attendance corrections resolved or documented;
- export purpose and recipient approved.

Procedure:

1. Confirm the final filters and date range.
2. Generate the approved format.
3. Verify file name, period, worker count and totals.
4. Open the file in the intended accounting environment.
5. Verify characters, date/time format, decimal format and delimiters.
6. Transfer only through an approved private channel.
7. Apply retention and deletion rules to local copies.
8. Record handoff evidence without committing the export publicly.

Expected result:

- readable and internally consistent export;
- recipient and purpose recorded;
- no claim that payroll is calculated.

Failure path:

- encoding or totals mismatch: stop handoff and raise a reporting defect;
- wrong recipient: follow privacy incident assessment;
- unexpected personal data: stop and review minimization.

Registry references: `REPORT-003/004/005` are `IN REVIEW`, `NOT DEPLOYED`.

## 15. Audit-log review

### ADM-AUD-01 — Review critical changes

Owner: customer administrator or authorized auditor.

Review at minimum:

- worker creation, suspension and archive;
- role changes;
- RFID assignment and revocation;
- attendance corrections;
- leave decisions;
- organization and shift changes;
- report/export activity where available;
- failed or suspicious access events where available.

Procedure:

1. Define the permitted date, actor and action scope.
2. Review actor, action, entity and timestamp context.
3. Investigate unexplained or unauthorized changes.
4. Preserve necessary evidence without copying excessive personal data.
5. Escalate suspected tampering, missing events or cross-tenant exposure.

Expected result:

- critical changes traceable to authorized actors;
- anomalies have an incident or corrective-action owner.

Registry references: `AUDIT-001/002` are `IN REVIEW`, `NOT DEPLOYED`.

## 16. Standard operating routines

### 16.1 Daily routine

Customer administrator or delegated manager:

- review current presence and critical irregularities;
- review failed or delayed terminal sync where available;
- review urgent leave requests;
- confirm unresolved manual fallback records have owners;
- review new support or access issues;
- do not export data while critical inconsistencies remain unexplained.

### 16.2 Weekly routine

- review open attendance corrections;
- review workers without valid card assignment where needed;
- review upcoming leave and staffing conflicts;
- review invitation, suspended-user and access anomalies;
- review terminal and sync health evidence;
- review support cases and corrective actions;
- document unresolved business-rule questions.

### 16.3 Monthly routine

- review active users and roles;
- remove unnecessary privilege;
- review archived/suspended worker access;
- validate a sample report against source records;
- review audit-log anomalies;
- review export handling and local-copy deletion;
- review unresolved incidents, problem records and training needs;
- confirm customer and BSS ownership contacts remain current.

### 16.4 Before payroll/accounting handoff

- close or document critical attendance irregularities;
- confirm authorized corrections;
- verify leave effects;
- preview report with final filters;
- validate sample workers and totals;
- export and inspect the file;
- record recipient, purpose and transfer method;
- state explicitly that BSS did not calculate payroll.

## 17. Common errors and safe recovery

| Situation | Safe response |
|---|---|
| Worker already exists | Stop; search and reconcile rather than create a duplicate. |
| Wrong role assigned | Remove excessive role, preserve evidence and test permissions. |
| Invitation sent to wrong person | Revoke immediately and assess security/privacy impact. |
| Card clocks for wrong worker | Revoke card, stop use and open security/data-integrity incident. |
| Missing clock-out | Use documented correction request and approval process. |
| Leave balance appears wrong | Stop approval where material; verify allowance, holidays and rules. |
| Report contains unexpected worker | Stop export and investigate tenant/filter/RBAC boundaries. |
| Export totals differ from preview | Stop handoff and raise reporting/data-integrity case. |
| Terminal unavailable | Activate approved manual fallback and link reconciliation to incident. |
| Cross-tenant data suspected | Stop all use and escalate as SEV-1 security/privacy incident. |
| Audit entry missing after critical change | Treat the operation as failed until investigated. |

## 18. Support escalation package

Every admin support request should include only the minimum necessary:

- environment: Preview, staging or pilot;
- tenant-safe organization reference;
- affected feature and procedure ID;
- time window and timezone;
- affected user role, not unnecessary personal details;
- expected result;
- observed result;
- reproducibility;
- masked identifiers;
- screenshot only after checking for personal data and secrets;
- workaround or fallback status;
- operational impact.

Never include:

- passwords;
- raw RFID UIDs;
- session tokens;
- database credentials;
- full exports in public issues;
- unnecessary worker details;
- private customer addresses or network secrets.

Follow `SUPPORT_INCIDENT_OPERATING_SYSTEM.md` for severity, communication and closure.

## 19. Offboarding checklist

### ADM-OFF-01 — Remove a worker's operational access

Owner: customer administrator.

Checklist:

- [ ] effective date confirmed;
- [ ] worker status changed appropriately;
- [ ] login/session access revoked;
- [ ] active invitation revoked;
- [ ] RFID credential revoked;
- [ ] open attendance corrections reviewed;
- [ ] open leave requests reviewed;
- [ ] required evidence preserved;
- [ ] unnecessary personal data removed according to policy;
- [ ] access test confirms the user cannot continue;
- [ ] audit record reviewed.

### ADM-OFF-02 — Remove an administrator or manager

Additional controls:

- [ ] replacement owner appointed where necessary;
- [ ] privileged role removed before ordinary account archive;
- [ ] active sessions revoked;
- [ ] shared operational contacts updated;
- [ ] support, installation and incident ownership updated;
- [ ] customer approval recorded.

### ADM-OFF-03 — Tenant or pilot closure

Use the Legal Operations and Pilot Readiness offboarding procedures for:

- final export;
- customer approval;
- access removal;
- terminal return;
- data deletion or retention;
- backup expiry;
- deletion confirmation;
- unresolved legal hold;
- incident and evidence closure.

## 20. Quick-reference checklists

### Add a worker

- [ ] correct tenant;
- [ ] no duplicate;
- [ ] minimum data only;
- [ ] correct department;
- [ ] least-privileged role;
- [ ] invitation recipient verified;
- [ ] privacy/onboarding requirement met;
- [ ] evidence recorded.

### Assign or replace a card

- [ ] worker identity confirmed;
- [ ] old card revoked if replacing;
- [ ] raw UID not exposed;
- [ ] masked identifier confirmed;
- [ ] clock-in tested;
- [ ] clock-out tested;
- [ ] wrong-worker use rejected;
- [ ] audit entry checked.

### Approve a correction

- [ ] original event identified;
- [ ] reason documented;
- [ ] evidence reviewed;
- [ ] authorized approver;
- [ ] original evidence preserved;
- [ ] corrected result verified;
- [ ] report consistency checked;
- [ ] audit entry checked.

### Approve leave

- [ ] dates correct;
- [ ] allowance checked;
- [ ] holidays/weekends handled;
- [ ] staffing decision recorded;
- [ ] authorized approver;
- [ ] calendar visibility appropriate;
- [ ] remaining balance verified;
- [ ] audit evidence checked.

### Export a report

- [ ] approved report type;
- [ ] correct period and filters;
- [ ] preview reviewed;
- [ ] critical exceptions resolved/documented;
- [ ] export opened and inspected;
- [ ] totals sampled;
- [ ] recipient and purpose approved;
- [ ] secure transfer;
- [ ] retention/deletion handled;
- [ ] payroll boundary communicated.

## 21. Fictional end-to-end administration dry run

Scenario: `Fiktivna Tvornica Javor d.o.o.` with fictional users only.

### Step 1 — Company confirmation

- fictional tenant confirmed;
- timezone: Europe/Zagreb;
- no real addresses or credentials;
- outcome: `PASS` for procedure rehearsal, not live readiness.

### Step 2 — Worker creation

- fictional worker: Ana Testić;
- department: Proizvodnja;
- role: Radnik;
- unnecessary fields omitted;
- outcome: `PROCEDURE PASS`; UI path `BLOCKED`.

### Step 3 — Manager assignment

- fictional manager: Marko Voditelj;
- role need documented;
- prohibited accounting/admin access tested conceptually;
- outcome: `PROCEDURE PASS`; authoritative RBAC test pending #55.

### Step 4 — RFID assignment

- fictional masked card reference used;
- raw UID not recorded;
- simulated clock-in/out expected;
- outcome: `PREVIEW/PROCEDURE PASS`; real terminal propagation blocked by #60.

### Step 5 — Attendance correction

- fictional missing clock-out created;
- worker explanation and manager evidence recorded;
- correction approved by delegated manager;
- original event preserved in expected model;
- outcome: `PROCEDURE PASS`; authoritative audit verification pending #55.

### Step 6 — Leave request

- fictional two-day request submitted;
- allowance and fictional holiday calendar checked;
- manager approves;
- calendar visibility checked against minimization rule;
- outcome: `PROCEDURE PASS`; final visibility rules pending #55.

### Step 7 — Accounting export

- fictional period previewed;
- sample totals reviewed;
- XLSX/CSV workflow described;
- payroll boundary stated;
- outcome: `PROCEDURE PASS`; final exported-file validation pending authoritative baseline.

### Step 8 — Offboarding

- fictional worker archived;
- access and card revoked;
- historical evidence retained;
- outcome: `PROCEDURE PASS`; live retention/deletion proof still blocked.

Overall dry-run result: `PROCEDURE DEFINED — NOT APPROVED FOR LIVE CUSTOMER DATA`.

## 22. Evidence index

| Evidence ID | Required proof | Current status |
|---|---|---|
| `ADM-001` | Approved role-operation matrix | `OPEN` |
| `ADM-002` | Authoritative organization setup screenshots | `BLOCKED #55/#58` |
| `ADM-003` | Worker create/invite/activate click path | `BLOCKED #55/#58` |
| `ADM-004` | Suspend/archive and access-revocation evidence | `BLOCKED #55` |
| `ADM-005` | Department and shift administration proof | `BLOCKED #55` |
| `ADM-006` | RFID assignment/revocation with masked identifier | `BLOCKED #55/#60` |
| `ADM-007` | Attendance correction preserving original evidence | `BLOCKED #55` |
| `ADM-008` | Leave allowance/request/decision evidence | `BLOCKED #55` |
| `ADM-009` | Approved-leave visibility test | `BLOCKED #55` |
| `ADM-010` | Report preview and XLSX/CSV validation | `BLOCKED #55` |
| `ADM-011` | Accounting least-privilege test | `BLOCKED #55` |
| `ADM-012` | Audit-log review proof | `BLOCKED #55` |
| `ADM-013` | Complete fictional admin dry run | `PARTIAL` |
| `ADM-014` | Customer admin competency sign-off | `OPEN` |
| `ADM-015` | Live-pilot approval linking all readiness gates | `BLOCKED #62` |

## 23. UI validation backlog

After issues #55 and #58:

1. replace every general procedure with exact verified navigation;
2. capture privacy-safe screenshots from the authoritative environment;
3. verify every button label and form field;
4. verify role-specific visibility and negative access;
5. validate mobile and supported-browser behavior;
6. run every quick-reference checklist end to end;
7. update Product Feature Registry evidence references;
8. version the result as `v0.2`;
9. complete external customer-admin rehearsal;
10. approve for controlled pilot use only after all linked gates are proven.

## 24. Approval gates

### Gate A — Internal process rehearsal

Required:

- this document merged;
- fictional data only;
- BSS presenter/admin completes the procedure dry run;
- contradictions logged.

### Gate B — Authoritative UI validation

Required:

- issue #55 completed;
- issue #58 interface available;
- Product Feature Registry updated;
- exact click paths and screenshots verified;
- role boundaries tested.

### Gate C — Controlled customer-admin training

Required:

- Demo & Training Playbook approved for the intended environment;
- privacy-safe training data;
- support channel available;
- competency checks passed;
- known limitations acknowledged.

### Gate D — Live pilot administration

Required:

- Pilot Readiness gates satisfied;
- staging/production infrastructure approved;
- legal/privacy documents complete;
- terminal accepted;
- support and incident ownership active;
- customer and BSS owners sign the go/no-go record.

Until Gate D is proven, the manual must not be represented as authorization to process real employee data.