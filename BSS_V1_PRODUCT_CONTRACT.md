# BSS v1 Product Contract

| Stavka | Vrijednost |
| --- | --- |
| Verzija ugovora | `1.0` |
| Status | **ACCEPTED / FROZEN** |
| Datum zamrzavanja | 01.09.2026. |
| Vlasnik odluke | Tomislav Bognar / BSS |
| Owner approval | **EXPLICIT — `ODOBRAVAM FREEZE BSS v1 PRODUCT CONTRACT`** |
| Issue | GitHub #131 |
| Software baseline | protected `main` at `b904eca3c047c01da7a78e376269e94ed1d2fb48` |
| HTTP ugovor | `openapi/bss-mvp-api-v1.yaml` v1.4.0 |
| AUDIT A | targeted recheck **PASS** recorded in #133 on 01.09.2026. |

## 1. Authority, approval and evidence boundary

This document is the accepted and frozen single product-scope contract for BSS v1. It resolves the remaining Product/Data decisions routed from AUDIT A to #131. The BSS owner explicitly approved the freeze on 01.09.2026.; repository merge remains a separate software-governance step.

This contract supersedes `BSS_MVP_SCOPE_FREEZE_V1.md` and `bss-mvp-scope-v1.json` for product scope while preserving them as historical records. Freeze does not authorize merge, deployment, Pilot or customer-data use. OpenAPI remains authoritative for HTTP behavior and merged code/migrations remain authoritative for implemented behavior.

This contract distinguishes:

- **IN V1 SCOPE** — required product behavior, whether already implemented or still needing focused implementation/evidence;
- **IMPLEMENTED** — present on the named repository baseline;
- **DONE** — meets the layered Definition of Done in section 15;
- **PILOT/PRODUCTION READY** — requires later environment, operational, legal and physical evidence.

A capability can be in scope without being implemented or DONE. This frozen contract is documentation and product-governance work; it does not itself implement onboarding/import, staging, terminal hardware or other missing layers.

## 2. Product definition and claim boundary

BSS v1 is a responsive Croatian-language web/PWA workforce attendance product with an RFID/NFC terminal. It records attendance events, derives one daily attendance result, manages leave and correction requests, and creates controlled reports/exports under server-enforced RBAC, tenant isolation and audit.

For the first Croatian Pilot and external wording, BSS v1 uses the **narrow attendance/time-capture claim**:

- BSS supports only the attendance, leave, correction and reporting fields/workflows explicitly named in this contract;
- BSS is not claimed to be a complete Croatian statutory `evidencija o radnicima`, payroll, accounting, tax or legal-compliance system;
- the customer remains responsible for mandatory employee records, payroll processing, lawful basis, notices, retention and any fields/processes not explicitly supported here;
- legal or statutory completeness must not be inferred from a report name, export, UI or successful Pilot.

Qualified Croatian legal review remains a later Pilot/commercial gate. This boundary prevents an unreviewed statutory scope expansion.

## 3. BSS v1 scope

### 3.1 In scope

- organization/tenant profile and one IANA organization timezone;
- one single-site business context per tenant without a separate site entity, departments, shifts, holidays and worker records;
- Admin, Voditelj, Radnik and Knjigovodstvo roles;
- worker lifecycle (`active`/`blocked`), user invitation/status and RFID assignment/revocation;
- terminal check-in/check-out, durable offline queue, idempotent synchronization, reconciliation and heartbeat;
- one derived attendance day per worker/business date, configured break deduction, overnight shifts, late status, worked/planned/balance minutes and anomaly visibility;
- annual leave and supported absence request/approval flows;
- worker-requested attendance corrections with audited approval/rejection/cancellation;
- monthly period review/finalize/close/reopen and reproducible report snapshots;
- report preview and CSV, XLSX and PDF exports;
- initial customer onboarding and atomic CSV/XLSX employee import as a required v1 capability;
- audit, server-side RBAC/data scope, tenant isolation, validation, rate limits and responsive/accessibility states.

### 3.2 Explicitly out of scope

- native iOS/Android applications;
- GPS/geofencing, door/access control and biometric identification;
- payroll calculation, tax/contribution calculation, accounting ledger, recruiting or broad HR suite;
- advanced BI/AI, workforce prediction and decorative analytics;
- broad third-party integrations, a public general-purpose integration platform, a broad webhook framework or a payroll-adapter ecosystem;
- job-position catalogue as a separate business entity;
- any authoritative Job Position/Radno mjesto database model, API, authorization scope or persistence layer; legacy demo/UI-only presentation is not an implemented v1 product capability;
- multi-site/location modelling and site-scoped permissions;
- a separate site entity, site-scoped authorization or per-site timezone model;
- multiple attendance intervals or separate break-punch events within one business day;
- statutory night/overtime premium calculation or payroll classification;
- employment contracts, employment-period start/end modelling and full rehire-period history;
- partial-day/hour-based leave, proration, configurable carryover, approved-leave reversal and approver delegation;
- historical attendance/leave/correction migration;
- self-service full-tenant portability/offboarding package;
- PDF/A conformance or electronic-signature workflow;
- general workflow email, SMS or push notification systems other than the operational/authentication email required by the accepted account lifecycle;
- offline mutation or private-data caching in the web/PWA client;
- marketing campaigns, billing/subscriptions, CRM, ERP, inventory, Kubernetes and microservices.

An out-of-scope item requires an approved scope-change decision before design or implementation.

## 4. Canonical workforce and tenant data decisions

1. A tenant is one organization with one active IANA timezone and one single-site business context in v1. Site is not a persisted business entity or authorization scope; departments provide the only organizational subdivision used for data scope.
2. The canonical worker name is one required trimmed `name` string. Structured `first_name`/`last_name` fields are not v1 core semantics.
3. `code` is required and case-insensitively unique within the tenant.
4. Worker `email` is optional, normalized to lowercase, and case-insensitively unique within the tenant when present. It is contact/reference data; it does not itself create login access.
5. Login user email is a separate identity contract and is globally unique on the current v1 implementation. User access is created only through the invitation/user workflow.
6. Employment start/end dates and employment periods are not represented in v1. Importers must not invent them or infer them from file dates.
7. `annualLeaveAllowance` is a required integer from 0 through 366 for worker create/import. A missing import allowance is a blocking row validation error; the database default must not be used as a hidden product default.
8. Authoritative v1 workforce setup is worker + department + shift + RFID assignment. A worker requires an existing active department and active shift, while RFID assignment is a separate Admin action after worker creation/import; no Job Position entity is inferred from legacy demo presentation.
9. Deactivation preserves the worker, attendance, leave, correction, RFID and audit history and blocks any linked active user/session. Reactivation reuses that same worker identity/history but does not silently reactivate a linked user.
10. Formal rehire as a new employment period is unsupported. Admins must not simulate it by deleting or rewriting history. A later rehire model requires a Product/Data contract and migration review.

## 5. Authoritative role-operation matrix

All permissions are server-enforced, deny-by-default and tenant-scoped. A hidden control is not authorization. `Voditelj scope` means assigned departments; historical attendance/terminal history uses the event-effective department, not the worker's current department.

| Domain / operation | Admin | Voditelj | Radnik | Knjigovodstvo |
| --- | --- | --- | --- | --- |
| Own session and role dashboard | use | use | use | use |
| Organization settings/timezone/leave-calendar visibility | read/write | no access | no access | no access |
| Departments, shifts, holidays reference | read/write | read scoped/reference | read reference | holidays read only |
| Users, invitations and role assignment | read/write | no access | no access | no access |
| Workers | read/write tenant-wide | read assigned departments | read self only | no worker registry access |
| Worker activation/deactivation | yes | no | no | no |
| RFID assignment/block/history | read/write | read assigned workers only | no | no |
| Organization attendance list | read tenant-wide | read assigned departments | no | no |
| Individual attendance | read tenant-wide | read assigned departments | read self | no raw-attendance endpoint |
| Attendance recalculation | Admin only, open period, reason/audit | no | no | no |
| Terminal reconciliation | Admin only, reason/audit | no | no | no |
| Leave requests | view all; approve/reject | view/approve/reject assigned departments | create/view/cancel own pending | view approved only; notes/decision notes minimized |
| Leave balances | read tenant-wide | read assigned departments | read self | read organization values for reporting |
| Approved-leave calendar | configured tenant view | configured scoped view | configured privacy-minimized view | configured privacy-minimized view |
| Correction requests | view/approve/reject all | view/approve/reject assigned departments | create/view/cancel own pending | no access |
| Attendance period state | read/write lifecycle | read scoped state | no | read state |
| Report preview/export/download/verify | tenant-wide | assigned departments | no business export | tenant-wide reporting authority; `correction_log` is privacy-minimized and omits free-text reasons/notes |
| Terminal list/status/history | read/write/manage | read-only, assigned event-effective departments | no | no |
| Audit log | read tenant-wide | no | no | no |
| Employee import | create/review/commit/cancel | no | no | no |

Critical negative cases:

- no role can access another tenant;
- Voditelj cannot access an unassigned department, including after worker transfer and through counts/pagination;
- Radnik cannot access another worker, decide requests, export business reports or invoke administration;
- Knjigovodstvo cannot access raw attendance-event drill-down, correction workflow details or free-text correction reasons/notes, worker administration, terminal administration, user/role administration or audit log;
- Voditelj cannot pair/revoke/rotate a terminal, reconcile an event, recalculate attendance or operate period transitions;
- Admin cannot rewrite raw terminal events or bypass period/reconciliation audit.

## 6. Attendance and calculation contract

### 6.1 Evidence layers and ownership

1. A raw terminal event is immutable evidence owned by the terminal-ingestion domain. Its identity is `(terminal_id, device_event_id)`.
2. An attendance day is a derived business record owned by the attendance calculation domain.
3. Reports and finalized period snapshots are calculated/read models owned by the reporting/period domain.
4. Policy/configuration changes never rewrite raw events. Reprocessing creates a new version with supersession provenance.
5. A repeated event identity with identical immutable proof is idempotent; the same identity with changed proof is `EVENT_IDENTITY_MISMATCH`, never a second attendance fact.

### 6.2 `attendance-v1` calculation

- one worker has at most one attendance day per business date;
- one check-in and one check-out are supported; a second distinct check-in/check-out is rejected, while incomplete ordering remains visibly unresolved;
- check-out without check-in creates `incomplete`; check-in without check-out remains `active`; both block period finalization;
- elapsed time must be positive and no greater than 16 hours;
- `plannedMinutes = shift duration across midnight when applicable - configured breakMinutes`;
- `workedMinutes = max(0, floor((checkOut - checkIn) / 60 seconds) - configured breakMinutes)`;
- configured break is deducted automatically; v1 has no separate break punch, actual-break measurement or conditional break rule;
- there is no additional rounding. `toleranceMinutes` is a schedule-classification boundary only and must never shift check-in/check-out or alter `workedMinutes`;
- a check-in is `late` only when its persisted local minute is strictly later than shift start plus tolerance;
- early arrival, early departure and work outside scheduled boundaries may be shown relative to the planned shift, but are reflected through actual timestamps and balance rather than silently rounded or represented as separate v1 anomaly codes;
- positive `balanceMinutes` is the v1 overtime indicator; negative balance is deficit. Neither is payroll/premium calculation;
- v1 night work means correct overnight-shift attribution and elapsed duration. Statutory night-hour/premium classification is out of scope;
- weekend/holiday/non-standard-day attendance retains the assigned shift calculation; v1 does not calculate special-day premiums;
- `corrected` identifies an approved correction; it does not erase original values or raw evidence.

### 6.3 Timezone, DST and business date

- raw occurrence and receipt timestamps are UTC instants;
- contractual display and business-date attribution use the organization timezone version effective for the event and persist the resolved local timestamp and UTC offset;
- DST gaps/folds replay from persisted interpretation, not current timezone rules;
- for an overnight shift, a local event at or before the shift end belongs to the previous local business date (`overnight-end-inclusive-previous-date-v1`);
- event-effective timezone, shift configuration, shift assignment and department evidence are versioned. Missing/ambiguous historical evidence fails closed to `reconciliation_required` or `legacy_unavailable`.

### 6.4 Anomalies and period readiness

V1 uses the existing attendance, correction and terminal-event records as its anomaly model; it does not introduce a generalized anomaly entity or subsystem. The required resolution/readiness matrix is:

| Existing status/record | Meaning and owner | Permitted resolution | Blocks finalization |
| --- | --- | --- | --- |
| attendance `active` | check-in exists without authoritative check-out; Admin/Voditelj reviews | accepted check-out, approved correction or eligible terminal reconciliation | yes |
| attendance `late` | complete day classified later than shift start plus tolerance; Admin/Voditelj reviews as needed | retain as complete or resolve through approved correction | no, by itself |
| attendance `incomplete` | required IN/OUT evidence is missing or unresolved; Admin/Voditelj reviews and Radnik may request correction | approved correction or eligible terminal reconciliation | yes |
| attendance `corrected` | approved correction outcome with preserved before/after evidence | no in-place rewrite; later change uses a new governed correction after reopen where required | no, by itself |
| correction `pending` | worker-requested change awaits an authorized decision | approve, reject or worker cancellation while pending | yes |
| terminal `reconciliation_required` | retained raw evidence is ambiguous or historically incomplete; Admin owns resolution | explicit accepted/rejected reconciliation with reason and provenance | yes |
| terminal `rejected` or identity conflict | raw evidence failed a final integrity/authorization rule; Admin reviews operationally | retain the final rejection/conflict evidence; do not derive attendance unless the separate reconciliation contract explicitly permits it | no once processing is final |

No listed condition is silently removed or reclassified to make a report ready. A future need for cross-domain anomaly assignment, waiver, SLA or generalized case management requires a separate Product Contract change.

Period lifecycle is `OPEN -> REVIEW -> FINALIZED -> CLOSED`. Only Admin transitions it with reason, revision/concurrency control, idempotency and audit. `FINALIZED` stores an immutable dataset, checksum and calculation/template provenance. Reopen is an audited Admin transition back to `OPEN`; prior versions and issued artifacts remain immutable. Recalculation/correction is prohibited while finalized/closed and may proceed only through `reopen -> correct/recalculate -> REVIEW -> FINALIZED -> CLOSED`, producing a new locked dataset/version rather than silently mutating the old one.

## 7. Leave and absence contract

1. Supported type codes are `annual_leave`, `paid_leave`, `unpaid_leave` and `free_day`.
2. Requests are inclusive date ranges and whole working days only. Hours/partial days are out of scope.
3. Working days exclude Saturday, Sunday and tenant holidays for the relevant date/year.
4. Pending or approved requests may not overlap for the same worker, regardless of type.
5. Annual leave checks each affected calendar year against the worker's explicit allowance. Pending plus approved days reserve availability.
6. Carryover is fixed at zero in v1; proration and employment-date calculation are unsupported.
7. Only Radnik creates a request for self. Admin or scoped Voditelj approves/rejects. There is no delegated approver identity beyond those roles.
8. Radnik may cancel only an own `pending` request. Reversal/cancellation of approved leave is not a v1 operation.
9. A retroactive request may follow the authorized workflow only while its affected attendance period is `OPEN`. If the affected period is `FINALIZED` or `CLOSED`, Admin must first complete the governed reopen path before approval, recalculation or refinalization may affect that period. Prior finalized datasets and issued artifacts remain immutable.
10. Knjigovodstvo sees approved requests for reporting with notes minimized, not pending/rejected/cancelled private workflow detail.
11. The shared calendar exposes only employee name plus approved `annual_leave` dates within the configured visibility; it never exposes illness, reasons, notes, balances or other private absence data.

## 8. Correction workflow contract

1. Radnik may request a correction only for an own attendance day in an open period, providing complete proposed check-in/check-out and a reason.
2. Proposed check-in must belong to the original work date in the attendance day's historical timezone; check-out must be later and total duration no greater than 16 hours.
3. Only Admin or the event/worker-scoped Voditelj may view and approve/reject the request. Knjigovodstvo has no correction workflow access.
4. Approval is atomic: verify request revision/pending state, verify the attendance values still match the request's captured before-state, update the derived day, mark the request approved and write audit evidence.
5. Audit preserves requester, decider, reason/note, timestamps, request status, original/requested values, attendance before/after, request ID and audit event ID.
6. Radnik may cancel only an own pending request. Approved corrections cannot be cancelled or overwritten in place.
7. Rejection requires a note and preserves attendance unchanged.
8. Finalized/closed periods reject new requests and approvals. A late correction requires Admin's audited period reopen, a new correction/recalculation outcome and a new finalized dataset version; old artifacts remain verifiable.
9. Terminal-event reconciliation is not a worker correction. It is Admin-only, requires retained DEC-025 proof and preserves raw evidence plus explicit accepted/rejected provenance.

## 9. Reporting, exports and accounting boundary

### 9.1 Catalogue and formats

The v1 catalogue is:

- `monthly_summary`;
- `attendance_journal`;
- `exceptions`;
- `approved_absences`;
- `correction_log`.

CSV, XLSX and PDF are all in v1 scope because they are present in OpenAPI v1.4 and the current implementation. XLSX is the primary business format, CSV the machine-readable technical format, and PDF the fixed-layout human/print format. PDF/A certification and electronic signature are not claimed.

### 9.2 Authority and reproducibility

- Admin exports tenant-wide; Voditelj exports only assigned departments; Knjigovodstvo exports tenant-wide; Radnik cannot create business exports.
- Knjigovodstvo may use the five named report types, but its `correction_log` dataset is privacy-minimized and must omit free-text correction reasons, decision notes and other correction-workflow detail. Admin and scoped Voditelj retain the contract-authorized correction report detail.
- screen preview and formats derive from one server dataset for the same filters; locked official exports use a named immutable full-month `periodVersionId`;
- every artifact records report/filter scope, organization/timezone, generation actor/time, row count, official minutes, dataset/template version, classification `NOT_PAYROLL`, and checksum/provenance appropriate to the format;
- every machine-readable export declares its schema/template version. Additive compatible evolution must preserve existing field meaning within that version; a breaking column, type or semantic change requires a new schema version rather than silent mutation, and old locked exports remain reproducible and verifiable;
- reopening never mutates an issued artifact. A later official result receives a new period/dataset/export identity;
- reports prepare attendance evidence; they do not calculate payroll, taxes, contributions or statutory premium pay.

## 10. Terminal contract

1. Admin pairs, revokes and rotates terminal identity; Voditelj has read-only terminal status/history in event-effective department scope.
2. A positive worker acknowledgement occurs only after the individual event is durably committed to the terminal's local queue.
3. Each event carries monotonic sequence, immutable device event ID, occurrence/acknowledgement time, clock health, card hash and the DEC-025 per-event HMAC receipt. The outer request is separately signed, fresh and nonce-protected.
4. Offline operation queues locally and retries until explicit per-event server result. Retry/restart/out-of-order handling must not lose a proven acknowledgement or create an incorrect duplicate.
5. Normal credential rotation retains historical verification; revocation/compromise boundaries reject later receipts. Secrets and raw RFID UID never appear in API responses, logs or audit.
6. Ambiguous clock/lifecycle/configuration evidence is retained as `reconciliation_required`, not silently accepted or discarded. Only Admin can resolve it with reason and append-only before/after/provenance.
7. Heartbeat reports terminal health, software version, queue depth, sequence and clock offset. Heartbeat does not acknowledge attendance or advance ingestion.
8. The software contract cannot prove durable media, real worker feedback, RFID reliability, time sync, power loss/recovery or physical enclosure behavior. Those require #132 real-device evidence before Pilot.

## 11. Customer onboarding contract

Onboarding is in v1 scope but is not claimed implemented by this document. It is a resumable, tenant-scoped workflow with these gates:

`DRAFT -> COMPANY_SETUP -> PEOPLE_IMPORT -> ACCESS_SETUP -> TERMINAL_SETUP -> DRY_RUN -> READY_FOR_GO_LIVE -> GO_LIVE_APPROVED`

- Admin/customer and BSS internal service/support identities remain separate;
- tenant creation, timezone, departments, shifts, holidays, explicit leave allowances, administrator invitations, RFID and terminal pairing are required setup steps as applicable;
- `READY_FOR_GO_LIVE` is computed from completed evidence and never equals approval;
- `GO_LIVE_APPROVED` is an explicit authorized decision with actor, time, contract/version, configuration snapshot, evidence links, open limitations and rollback contacts;
- Demo/Internal/Pilot/Production profiles have separate gates; Preview credentials/data are never promoted to a live tenant;
- failure leaves the workflow resumable at the last proven step; no success is inferred from a completed screen;
- customer data uses an approved secure channel and minimum necessary fields. OIB, bank data, home address, medical diagnosis and document copies are not default onboarding data;
- a second-person dry run and later AUDIT C/customer GO/NO-GO evidence are required before live Pilot use.

## 12. Employee CSV/XLSX import contract

Employee import is Admin-only and follows:

`UPLOAD -> PARSE -> NORMALIZE/STAGE -> MAP -> VALIDATE -> PREVIEW -> APPROVE -> COMMIT -> RESULT/AUDIT`

### 12.1 Canonical columns

| Field | Required | Rule |
| --- | ---: | --- |
| `code` | yes | trimmed, 1–40 chars, tenant case-insensitive unique |
| `name` | yes | one trimmed display/legal working name, 2–160 chars |
| `email` | no | valid, lowercase-normalized, tenant case-insensitive unique when present |
| `department` | yes | maps unambiguously to one existing active department |
| `shift` | yes | maps unambiguously to one existing active shift |
| `annualLeaveAllowance` | yes | integer 0–366; never silently defaulted |

Employment dates, split names, user roles/accounts/passwords, historical attendance/leave/corrections and RFID secrets are not import columns in v1. User invitation and RFID assignment are explicit later steps.

### 12.2 Validation and commit

- CSV and genuine XLSX are accepted; formula/macro execution is prohibited and spreadsheet-injection-safe handling is required;
- a session has tenant, uploader, file checksum, schema/parser version, mapping, revision and expiry identity;
- preview shows normalized values, creates/blocked rows, duplicate/reference errors and totals without changing core records;
- commit requires the reviewed session revision plus explicit Admin approval, revalidates against current database state and is idempotent;
- initial import is create-only. No implicit update, merge, deactivate or delete is allowed;
- commit is all-or-nothing. Any invalid/conflicting row blocks the entire commit; v1 has no partial or silent import;
- partial valid-row commits, silent merges, automatic updates and automatic deactivation of existing workers are explicitly out of scope for v1;
- retries with the same idempotency identity return the original result. Reuse with different input is conflict;
- result/audit records file checksum (not file contents), counts, schema/parser version, actor, approval, commit ID, created worker IDs and errors;
- uploaded files/staging are private and tenant-isolated, never logged, and deleted after the session reaches a terminal state or expires under the approved data-lifecycle policy. Exact retention/capacity limits remain an implementation/AUDIT C decision and must be visible before upload rather than guessed here.

## 13. Integrations, migration, portability and lifecycle

- v1 integration boundary is BSS-owned web/API clients, BSS terminal protocols and the explicitly named reports/exports. A general-purpose integration platform, broad webhook framework, reusable third-party write API and payroll-adapter ecosystem are out of scope.
- historical attendance, leave and correction migration is out of scope. Initial employee setup/import creates current master data only.
- ordinary CSV/XLSX/PDF reports are not a complete tenant-portability/offboarding export.
- self-service full-tenant portability is out of scope for v1. Before real-customer processing, H4/privacy/offboarding procedures must provide a controlled, complete and lawful data-return, legal-hold/retention and evidenced-deletion process; ordinary reports are not accepted as that complete package and this product contract does not claim that implementation exists.
- the governance lifecycle is `DEMO -> PILOT_CANDIDATE -> PILOT_APPROVED -> GO_LIVE_APPROVED -> PILOT -> POST_PILOT_REVIEW -> COMMERCIAL_AUTHORIZED/COMMERCIAL` or `NO_GO`, followed by `OFFBOARDING -> OFFBOARDED` when service ends. `EXTEND` may return a Pilot to an explicitly approved further Pilot period. Sales/CRM labels such as `WON`, `NURTURE` and `LOST` are not Product Contract states and do not authorize data processing.
- these are governance gates, not automatically implemented API/database enums. No state bypasses AUDIT C, customer GO/NO-GO, Commercial authorization or the controlled offboarding process.
- real Pilot data is never Preview data and remains subject to approved tenant, access, privacy, retention, backup/recovery and offboarding controls.

## 14. Web/PWA, UX and notification baseline

- responsive web/PWA means installable/responsive UI and a cacheable public shell; authenticated/private business operations remain online-dependent;
- service workers must not persistently cache authenticated API/private responses merely to simulate offline behavior, and the browser does not queue offline business mutations or create a second authoritative offline-write system;
- terminal offline attendance is a separate authoritative guarantee governed by the accepted terminal contract in section 10;
- each applicable screen/workflow requires meaningful `loading`, `empty`, `error`, `forbidden`, `stale/conflict` and recovery states, keyboard navigation, accessible names, visible focus, non-color-only status, responsive behavior and clear destructive confirmation;
- a successful action receives an in-product confirmation and the authoritative refreshed state. Pending/review queues remain visible to the responsible role;
- v1 notification baseline is in-product workflow state/confirmation plus only the operational/authentication email required by the accepted account lifecycle (invitation/account access/recovery). General leave/correction/report/terminal workflow email, SMS and push notification systems are out of scope until a provider-independent Product Contract change is approved;
- Figma, Storybook, screen maps and the later Design Foundation may express only roles, workflows, states and scope in this Product Contract. They must not create new product rules. The Product Contract freeze gate is satisfied; Design Foundation remains subject to its own activation and evidence controls.

## 15. Definition of Done contract

For every relevant capability, `DONE` requires all applicable cells below. `N/A`, `SKIPPED` and `UNAVAILABLE` must be explicit and are not PASS.

| Layer | Required evidence when applicable |
| --- | --- |
| Product | behavior and exclusions match this approved contract; deferred work is tracked |
| UI/UX | complete role-purposeful flow, loading/empty/error/forbidden/stale/recovery states, responsive and accessibility checks |
| API | OpenAPI operation ID, roles, schemas, validation, stable errors/statuses and contract tests |
| Authorization | server-side allow rules plus critical negative role/data-scope tests |
| Tenant/data | organization scope, RLS/tenant isolation and real PostgreSQL evidence for tenant-owned paths |
| Validation/concurrency | boundary validation, revision/idempotency/conflict behavior and failure recovery |
| Audit | actor, action, target, time, reason and bounded before/after/provenance for sensitive mutations |
| Tests | happy path, negative/permission path, edge/error path and critical workflow E2E |
| Security/privacy | least privilege, secret/data minimization, retention/access review and no weakened gate |
| Documentation/contracts | Product Contract, OpenAPI, migrations, feature/readiness registers and user/ops docs synchronized |
| Repository | focused and applicable broader checks pass on intended PR; review threads resolved; no unrelated/generated/secret/debug files |
| Environment | production-like Staging PASS for the capability; deployment/rollback/recovery evidence where applicable |
| Terminal/hardware | real-device/offline/power/retry/physical evidence where the claim depends on hardware |

`UI exists`, `endpoint works locally`, `merged`, `checks green`, `deployed`, `Pilot-accepted` and `production-ready` remain different states. A capability is not fully DONE merely because one layer passes.

## 16. Change control and recovery

Before approval, this document is a draft and may be revised through #131 review. Approval must record owner, date, final version/SHA, resolved contradiction list and acceptance mapping.

After freeze, every material change requires:

1. a BSS OS decision/change record with business reason and affected roles;
2. UI/API/data/security/privacy/hardware/operations and evidence impact analysis;
3. reversibility classification and migration/rollback or forward-recovery plan;
4. a versioned Product Contract update plus synchronized OpenAPI/code/registers where applicable;
5. a focused reviewed PR and all required checks;
6. revalidation of only bounded affected evidence, or broader revalidation when impact cannot be bounded.

No historical raw attendance, issued export or audit record may be rewritten as rollback. The pre-freeze proposal remains in Git history. After freeze, a new version must supersede this contract through the governed change process.

## 17. Resolved source contradictions

| Topic | Earlier conflict | Product Contract resolution |
| --- | --- | --- |
| PDF | old scope/profile said proposed/out; OpenAPI v1.4 and code implement it | CSV/XLSX/PDF in v1; no PDF/A claim |
| Job positions | old scope and frontend demo listed them; current API/core has departments/shifts only and the API adapter identifies no separate MVP entity | legacy Job Position UI is demo-only/non-authoritative; no v1 database model, API, authorization scope or persistence layer |
| Onboarding/import | old freeze omitted them; #131/H2 require them | in v1 scope, explicitly not claimed implemented by this doc |
| Worker name | H2 asked single vs structured | one required `name`; split fields out |
| Employment dates | H2/H11 unresolved | out of v1 core/import; no inferred values |
| Worker email | semantics unclear | optional, lowercase, tenant case-insensitive unique; not login provisioning |
| Leave default | database has historical default; API requires value | explicit allowance required; missing import value blocks |
| Leave retroactivity | frontend demo permits future dates only, while current backend accepts retroactive dates without an attendance-period gate | v1 permits retroactive workflow only for an `OPEN` affected period; `FINALIZED`/`CLOSED` requires governed reopen before approval or recalculation can affect it |
| Attendance semantics | event delivery was sometimes conflated with calculation | immutable raw event -> versioned attendance day -> immutable report snapshot |
| Break/multiple events | old scope did not define mechanics | configured automatic deduction; one IN/OUT pair; no break punch/multiple intervals |
| Night/overtime | names could imply payroll/statutory classification | overnight attribution and balance only; no premium/payroll classification |
| Site model | unresolved single vs multi-site | single-site v1; departments are not sites |
| Knjigovodstvo | current API permits every report type and current `correction_log` exposes free-text reason, while the proposed negative rule excluded correction detail | tenant-wide named reports remain available, but the Knjigovodstvo `correction_log` must omit free-text reasons/notes and correction-workflow detail |
| Statutory claim | complete vs narrow unresolved | narrow Croatian attendance/time-capture claim |
| Web offline | PWA could be confused with terminal guarantee | web private operations online-only; terminal offline-first |
| AUDIT A | repository registers still recorded BLOCKED | #133 targeted recheck PASS authorizes #131 work, not freeze |

## 18. Issue #131 acceptance mapping

| # | Acceptance criterion | Proposal evidence/state |
| ---: | --- | --- |
| 1 | AUDIT A PASS/gaps addressed | #133 targeted recheck PASS; sections 6–17 resolve remaining decisions |
| 2 | one approved/versioned Product Contract | version `1.0`, **ACCEPTED / FROZEN** by explicit owner approval on 01.09.2026. |
| 3 | explicit core/out-of-scope | sections 2–3 |
| 4 | four-role matrix and negative cases | section 5 |
| 5 | attendance/leave/correction/reporting/terminal/onboarding contracts | sections 6–12 |
| 6 | onboarding and CSV/XLSX import in v1 | sections 3, 11 and 12 |
| 7 | precise cross-workstream DONE | section 15 |
| 8 | Figma/Storybook/Design Foundation reference contract | section 14; this frozen contract is the product-scope authority |
| 9 | post-freeze scope-change record | section 16 |

## 19. Approval record

### 19.1 Owner-approved Product Contract decisions

The following choices were explicitly approved by the BSS owner and form the frozen decision basis for Product Contract v1.0 on 01.09.2026. Whole-contract approval is recorded separately in section 19.2.

| Decision | Approved choice | Recorded outcome |
| --- | --- | --- |
| `PC-05` | `B` | Narrow Croatian attendance/time-capture claim; no complete statutory employee-record claim |
| `PC-24` | `B` | Explicit Pilot, Commercial/No-Go and Offboarding governance lifecycle |
| `PC-17` | `B` | Self-service portability out of v1; controlled complete return/retention/deletion required before real-customer processing |
| `PC-20` | `B` | Knjigovodstvo business reporting retained without sensitive free-text correction reasons/notes |
| `PC-09` | `A` | One organization timezone with persisted event-effective local interpretation and historical replay |
| `PC-06` | `A` | Immutable raw attendance evidence remains separate from derived attendance days and calculated report/period results |
| `PC-07` | `A` | One-IN/one-OUT `attendance-v1` calculation with automatic break, 16-hour limit and no payroll/statutory premium engine |
| `PC-08` | `A` | No additional time rounding; tolerance classifies schedule relation but never alters actual worked minutes |
| `PC-11` | `A` | Authorized auditable corrections and governed reopen/recalculate/relock instead of finalized-period mutation |
| `PC-12` | `A` | Existing status/record anomaly model with an explicit resolution and period-blocking matrix; no generalized anomaly subsystem |
| `PC-13` | `A` | Whole-day leave/absence requests only; carryover, proration, partial days/hours, delegation and advanced approved-leave cancellation remain out of v1 |
| `PC-14` | `A` | Retroactive leave may affect an open period; finalized/closed periods require governed reopen before approval or recalculation can affect them |
| `PC-15` | `A` | Reactivation preserves the same worker identity/history; a formal multi-employment-period rehire subsystem is out of v1 |
| `PC-02` | `A` | Employment start/end dates are not mandatory v1 core fields and imports must not silently invent them |
| `PC-01` | `A` | One required canonical `name`; structured `first_name`/`last_name` migration is out of v1 |
| `PC-03` | `A` | Worker email is optional tenant-unique contact data and does not create or define a BSS user/login identity |
| `PC-04` | `A` | Missing annual-leave allowance is a blocking import validation error; an explicit value is required before commit |
| `PC-21` | `A` | One single-site business context without a site entity, site-scoped authorization or multi-timezone site model |
| `PC-25` | `A` | Resumable governed onboarding with evidence/readiness state and explicit go-live approval; completed screens do not authorize go-live |
| `PC-26` | `A` | Admin-only, create-only, previewed/validated employee import with atomic all-or-nothing commit and no partial/update/merge/deactivate behavior |
| `PC-22` | `A` | Authenticated/private web operations remain online-dependent; only the accepted terminal contract provides authoritative offline attendance |
| `PC-16` | `A` | Historical attendance, leave and correction migration is out of v1; onboarding/import creates current worker master data only |
| `PC-18` | `A` | Machine-readable exports declare a versioned schema; breaking structural or semantic changes require a new version, never silent mutation |
| `PC-19` | `A` | Integrations are limited to BSS-owned web/API clients, terminal protocol and named reports/exports; no general platform, webhook or payroll-adapter ecosystem |
| `PC-23` | `A` | In-product workflow state/confirmation plus operational authentication email only; general workflow email, SMS and push remain out of v1 |
| `PC-27` | `A` | Separate authoritative Job Position/Radno mjesto entity is out of v1; workforce setup remains worker, department, shift and RFID assignment |
| `PC-28` | `A` | CSV, XLSX and governed PDF are official v1 formats; PDF/A, electronic signing and document certification remain out of v1 |

### 19.2 Whole-contract approval gate

| Field | Value |
| --- | --- |
| BSS OS decision | `APPROVED` |
| Whole-contract freeze decision/date | `APPROVED — 01.09.2026.` |
| Owner approval | `EXPLICIT — ODOBRAVAM FREEZE BSS v1 PRODUCT CONTRACT` |
| Approved version | `1.0` |
| Repository baseline for freeze | `b904eca3c047c01da7a78e376269e94ed1d2fb48` |
| Contract status | `ACCEPTED / FROZEN` |
| Design Foundation gate | `PRODUCT CONTRACT FREEZE GATE SATISFIED` |
