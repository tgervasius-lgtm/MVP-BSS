# BSS Finance & Cashflow Operating System

Status: `PROPOSED v0.1 / FOUNDER APPROVAL AND ACCOUNTANT REVIEW REQUIRED`

Owner: BSS founders

Related issues: #89, #71, #85 and #87

## 1. Purpose

This document defines how BSS plans, records, reviews and controls management finances before and after company formation.

The objectives are to prevent:

- spending without a recorded decision;
- confusing a budget with available cash;
- confusing a vendor invoice with an accepted deliverable;
- forgetting recurring subscriptions and renewals;
- relying on one founder to understand the financial position;
- treating a grant or subsidy as unrestricted money;
- mixing forecasts, scenarios and actual transactions;
- missing overdue customer invoices;
- approving payment without invoice, receipt or acceptance evidence;
- making product or hiring commitments without understanding runway;
- storing sensitive financial or personal data in the public repository.

This is a management-control framework. It does not replace statutory accounting, Croatian tax advice, payroll, VAT treatment, grant rules, banking controls or signed company policies.

The appointed accountant and official books remain authoritative for statutory records and filings.

## 2. Core rules

1. `ACTUAL`, `COMMITTED`, `FORECAST` and `SCENARIO` are separate states.
2. A budget authorizes planning, not automatic spending.
3. A purchase commitment must be recorded before the invoice arrives.
4. An invoice does not prove that the related work or goods were accepted.
5. Payment requires an authorized commitment, matching evidence, acceptance where applicable and approval under the Founder Operating System.
6. Cash in the bank is not the same as unrestricted available cash.
7. Grants, deposits, VAT, taxes, payroll funds and customer prepayments may have restrictions or future obligations.
8. No founder reimbursement is paid without purpose, evidence and approval.
9. Every recurring cost has an owner, renewal date, cancellation path and usage review.
10. Every forecast states its assumptions and update date.
11. Real bank, invoice, payroll, tax, customer and personal financial data stays in private BSS-controlled systems.
12. Public GitHub contains only templates, fictional examples and non-sensitive governance.
13. Proposed thresholds and approval limits remain `OPEN` until both founders approve them and accountant input is obtained where needed.
14. Financial reports must be understandable by both founders without relying on the person who created them.

## 3. Status language

| Status | Meaning |
|---|---|
| `PLANNED` | Included in a draft budget or scenario; no approval or commitment. |
| `BUDGETED` | Included in an approved management budget. |
| `APPROVED` | Authorized under the current founder decision rules. |
| `COMMITTED` | BSS has created an external obligation, order or signed scope. |
| `DELIVERED` | Goods or services were submitted but not necessarily accepted. |
| `ACCEPTED` | Required evidence and acceptance criteria passed. |
| `INVOICED` | A supplier or BSS issued an invoice. |
| `DUE` | Payment date has not passed. |
| `OVERDUE` | Payment date has passed without settlement or approved dispute. |
| `PAID` | Payment is confirmed in the authoritative private record. |
| `CANCELLED` | Planned or committed item was formally cancelled. |
| `DISPUTED` | Amount, deliverable, invoice or obligation is contested. |
| `RESTRICTED` | Funds have permitted-use, evidence or repayment conditions. |
| `FORECAST` | Expected future value based on named assumptions. |
| `SCENARIO` | Hypothetical value used for planning, not an expectation. |
| `BLOCKED` | Required evidence, approval or accounting treatment is missing. |

A transaction may move through several statuses, but earlier statuses are not deleted. The change history must remain reviewable.

## 4. Sources of truth

| Record | Authoritative location | Public repository allowed? |
|---|---|---:|
| Bank balance and bank statement | Company bank / approved accounting system | No |
| Statutory ledger and tax records | Accountant / official accounting system | No |
| Supplier invoice and receipt | Private document store / accounting system | No |
| Customer invoice and payment status | Private invoicing/accounting system | No |
| Management budget | Private finance workbook or approved finance system | Summary only |
| Commitment register | Private finance register | Template only |
| Subscription register | Private finance register | Template only |
| Grant evidence | Private grant folder / accounting system | Template only |
| Founder approval | Decision register plus private evidence | Non-sensitive decision ID only |
| Vendor acceptance | GitHub/private evidence depending on sensitivity | Public only when non-sensitive |
| Forecast and scenarios | Private finance workbook | Fictional template only |

The public repository must never become the official accounting system.

## 5. Management finance categories

These categories are for internal planning and do not replace the accountant's chart of accounts.

### `REV — Revenue and inflows`

- `REV-PILOT`: paid pilot fees;
- `REV-SETUP`: setup and installation fees;
- `REV-SUB`: recurring software/service subscription;
- `REV-HW-LEASE`: terminal lease/service income;
- `REV-HW-SALE`: hardware sale income;
- `REV-SUPPORT`: separately billed support;
- `REV-CUSTOM`: approved custom work;
- `REV-GRANT`: grants and subsidies, tracked separately as restricted where applicable;
- `REV-OTHER`: approved other operating income.

### `COGS — Direct delivery costs`

- terminal components;
- enclosure manufacturing;
- assembly and testing;
- installation travel and materials;
- payment processing directly linked to customer revenue;
- customer-specific hosting or licenses;
- replacement and repair directly linked to service delivery;
- subcontracted delivery work.

### `SW — Software and product development`

- external developers;
- code review and security testing;
- design systems and UX/UI;
- development tools;
- testing devices and services;
- software licenses used to build the product.

### `HW — Hardware development`

- Raspberry Pi and terminal components;
- displays and RFID/NFC hardware;
- prototyping;
- CAD and mechanical design;
- CNC, 3D printing and sheet metal;
- fixtures, tools and testing equipment;
- certification and laboratory work when applicable.

### `INFRA — Infrastructure and operations`

- hosting;
- databases;
- monitoring and error tracking;
- backups;
- domains and DNS;
- email and communication services;
- security and password-management services.

### `PROF — Professional services`

- accounting;
- legal review;
- privacy/GDPR advice;
- grant consulting;
- insurance advice;
- specialized audits.

### `SALES — Sales and marketing`

- website and landing pages;
- advertising;
- sales tools and CRM;
- travel for discovery and demos;
- trade fairs and events;
- printed material;
- video and visual production.

### `PEOPLE — People and contractor costs`

- payroll and employer costs;
- founder compensation where applicable;
- contractor fees;
- recruitment;
- training;
- required equipment.

### `G&A — General and administrative`

- bank fees;
- office supplies;
- phone and internet;
- general travel;
- insurance;
- registrations and memberships;
- postage and logistics.

### `CONT — Contingency`

Contingency is not a hidden discretionary account. Use requires the same approval and evidence as any other expense.

## 6. Budget operating model

### 6.1 Budget periods

Maintain:

- a rolling 12-month management budget;
- a detailed 13-week cashflow forecast;
- a current-month spending plan;
- project or grant-specific budgets where required.

### 6.2 Budget template

| Field | Required content |
|---|---|
| Budget ID | Non-sensitive internal ID |
| Period | Month, quarter or project |
| Category | Management finance category |
| Description | Specific purpose |
| Owner | Person accountable |
| Budget amount | Approved planning amount |
| Currency | EUR or approved currency |
| Funding source | Unrestricted cash, founder funding, grant, customer prepayment, other |
| Restriction | Any permitted-use or evidence constraint |
| Approval decision ID | Founder decision reference |
| Actual to date | Amount confirmed by authoritative records |
| Committed not invoiced | Approved external obligations |
| Invoiced not paid | Valid invoices awaiting payment |
| Remaining uncommitted budget | Calculated value |
| Forecast at completion | Current expected total |
| Variance | Forecast versus budget |
| Status | On track, watch, over budget, blocked |
| Comment | Assumptions and corrective action |

### 6.3 Budget equation

Use this management equation:

`Available uncommitted budget = Approved budget - Actual paid - Unpaid valid invoices - Other recorded commitments`

Do not use bank balance as a substitute for available budget.

### 6.4 Budget change

A budget change record must state:

- original amount;
- proposed new amount;
- reason;
- funding source;
- effect on runway;
- items reduced or delayed to compensate;
- decision class under Founder OS;
- approvers;
- effective date.

## 7. Commitment register

A commitment is created when BSS has made an external promise that may require payment, even if no invoice exists yet.

Examples:

- signed statement of work;
- accepted supplier quote;
- hardware order;
- non-cancellable subscription;
- event booking;
- legal or accounting engagement;
- approved employee or contractor offer;
- customer refund obligation.

### Commitment record

| Field | Required content |
|---|---|
| Commitment ID | Internal ID |
| Supplier / counterparty ID | Private record reference |
| Purpose | What BSS is buying or promising |
| Category | Finance category |
| Related issue / SOW / purchase record | Evidence reference |
| Approved maximum | Authorized cap |
| Currency | Currency |
| Expected invoice dates | Timing |
| Expected payment dates | Cash timing |
| Cancellation terms | Private contract reference |
| Acceptance required | Yes/no and evidence |
| Amount invoiced | Current total |
| Amount paid | Current total |
| Remaining commitment | Calculated |
| Owner | Accountable founder |
| Status | Approved, committed, completed, cancelled, disputed |
| Decision ID | Approval evidence |

No commitment may be omitted because the invoice has not arrived.

## 8. Accounts payable and invoice approval

### 8.1 Three-way check

Before payment, match:

1. **Authorization** — approved budget and commitment;
2. **Evidence** — goods received or deliverable accepted;
3. **Invoice** — correct supplier, description, amount, date and required accounting information.

Where a formal deliverable is involved, use the External Developer & Vendor Management Pack acceptance result.

### 8.2 Invoice workflow

1. Receive invoice through an approved channel.
2. Store it in the private accounting/document system.
3. Assign invoice ID and owner.
4. Match to commitment and budget.
5. Confirm receipt or acceptance evidence.
6. Check for duplicate invoice or previous payment.
7. Confirm accounting/tax treatment with the accountant where required.
8. Approve under Founder OS decision rights.
9. Schedule payment with due date and cashflow impact.
10. Execute payment through authorized banking access.
11. Record payment confirmation privately.
12. Reconcile in monthly close.

### 8.3 Payment statuses

- `READY FOR REVIEW`;
- `BLOCKED — NO COMMITMENT`;
- `BLOCKED — NO ACCEPTANCE`;
- `BLOCKED — INVOICE ERROR`;
- `APPROVED FOR PAYMENT`;
- `SCHEDULED`;
- `PAID`;
- `DISPUTED`;
- `CANCELLED`.

### 8.4 Prohibited practices

- paying from a screenshot only;
- paying an invoice to a changed bank account without independent verification;
- splitting one purchase to avoid approval limits;
- approving one's own unsupported reimbursement;
- paying a rejected deliverable as though accepted;
- deleting the original invoice or decision trail;
- using personal accounts for company funds without an approved temporary process and accountant review.

## 9. Revenue and receivables

### 9.1 Revenue record

| Field | Required content |
|---|---|
| Revenue ID | Internal ID |
| Customer ID | Private customer reference |
| Contract / offer reference | Signed evidence |
| Revenue type | Pilot, setup, subscription, hardware, support, other |
| Service period | Period covered |
| Net amount | Private record |
| VAT/tax treatment | Accountant-authoritative field |
| Gross amount | Private record |
| Invoice date | Date |
| Due date | Date |
| Payment date | Date or blank |
| Status | Draft, issued, due, overdue, paid, credited, disputed |
| Owner | Collection owner |
| Related delivery evidence | Installation, acceptance, service evidence |

### 9.2 Receivables review

At least weekly during pilots and early operations, review:

- invoices due in the next 14 days;
- overdue invoices;
- disputed invoices;
- customer concentration;
- revenue dependent on unaccepted delivery;
- deposits or prepayments with future obligations;
- expected renewal or cancellation.

### 9.3 Collections process

The exact legal and customer communication process requires approved customer terms. Operationally:

1. confirm invoice accuracy;
2. confirm the customer received it;
3. send a professional reminder after the approved trigger;
4. record the communication privately;
5. escalate material or disputed cases to founders;
6. do not suspend service contrary to signed terms or applicable law;
7. update the cashflow forecast immediately.

## 10. 13-week cashflow forecast

The 13-week cashflow is updated at least weekly when BSS has active commitments or operations.

### 10.1 Required columns

| Row | Week 1 | Week 2 | ... | Week 13 |
|---|---:|---:|---:|---:|
| Opening unrestricted cash | | | | |
| Confirmed customer receipts | | | | |
| Probability-weighted expected receipts | | | | |
| Founder funding / loans | | | | |
| Grant receipts — restricted | | | | |
| Other inflows | | | | |
| Supplier payments | | | | |
| Payroll / contractor payments | | | | |
| Infrastructure and subscriptions | | | | |
| Hardware and manufacturing | | | | |
| Taxes / statutory payments | | | | |
| Reimbursements | | | | |
| Contingency use | | | | |
| Closing unrestricted cash | | | | |
| Restricted cash balance | | | | |
| Minimum cash trigger | | | | |
| Status | | | | |

### 10.2 Forecast confidence

Classify inflows:

- `CONFIRMED`: paid or irrevocably scheduled with reliable evidence;
- `HIGH`: invoiced and historically reliable, but not paid;
- `MEDIUM`: signed obligation with timing uncertainty;
- `LOW`: proposal, expected sale or grant decision not yet secured;
- `EXCLUDED`: should not be used to fund committed spending.

Do not present `LOW` pipeline as available cash.

### 10.3 Forecast update record

Each update states:

- update date;
- prepared by;
- reviewed by;
- opening bank balance source;
- new commitments;
- delayed receipts;
- changed assumptions;
- minimum cash week;
- required founder decisions.

## 11. Runway

Runway is a planning indicator, not a guarantee.

### 11.1 Basic runway

`Runway months = Unrestricted available cash / Normalized monthly net cash burn`

Both numerator and denominator must be defined.

Exclude from unrestricted cash where appropriate:

- restricted grants;
- customer prepayments needed for future delivery;
- tax or payroll funds;
- refundable deposits;
- disputed balances;
- amounts not yet received.

### 11.2 Burn views

Maintain:

- current-month actual burn;
- trailing three-month normalized burn when sufficient history exists;
- budgeted burn;
- forecast burn;
- stress-case burn.

### 11.3 Runway thresholds

Exact numeric thresholds remain `OPEN`.

Define management states after founder approval:

| State | Meaning | Example response type |
|---|---|---|
| `GREEN` | Adequate runway for approved plan | Continue with normal controls |
| `WATCH` | Reduced flexibility or forecast risk | Freeze non-essential commitments and review weekly |
| `ACTION` | Material risk to approved obligations | Replan scope, costs, collections and funding |
| `CRITICAL` | Near-term inability to meet obligations | No new discretionary commitments; immediate founder and accountant review |

## 12. Subscription and recurring-cost register

Every recurring charge must have:

| Field | Required content |
|---|---|
| Subscription ID | Internal ID |
| Provider | Private record reference |
| Service | Product or service name |
| Category | Finance category |
| Owner | Person responsible |
| Billing frequency | Monthly, annual, usage-based |
| Current plan | Plan name |
| Expected amount | Forecast value |
| Currency | Currency |
| Payment method owner | Private reference |
| Renewal date | Date |
| Cancellation notice | Required notice |
| Usage metric | Seats, requests, storage, active use |
| Alternative | Approved fallback or competitor |
| Data/export requirement | What must be exported before cancellation |
| Access owner | Admin owner and backup |
| Status | Active, trial, cancel, blocked, terminated |

### Subscription review

Review monthly:

- unused seats;
- duplicate tools;
- expired trials;
- price increases;
- annual renewals in the next 60 days;
- vendor lock-in;
- missing backup owner;
- payment card expiration;
- ability to export data;
- services no longer aligned with the product baseline.

## 13. Founder reimbursements and company cards

### 13.1 Reimbursement record

- claimant;
- date;
- business purpose;
- category;
- amount and currency;
- receipt/invoice reference;
- related decision or trip;
- payment method;
- tax/accounting treatment confirmed where necessary;
- approver other than claimant when required;
- status and payment date.

### 13.2 Reimbursement rules

- personal and company expenses must be separated;
- missing evidence is `BLOCKED`, not automatically reimbursable;
- exchange rate method must follow accountant-approved treatment;
- cash expenses require the same evidence as card expenses;
- reimbursement does not create automatic tax deductibility;
- no founder approves a material unsupported claim solely for themselves;
- original evidence retention follows accountant and legal requirements.

### 13.3 Company-card controls

- named cardholder;
- documented business purpose;
- approved spending class;
- transaction notifications;
- monthly statement reconciliation;
- immediate reporting of lost card or suspicious transaction;
- card removal when role changes;
- no shared PIN or public storage of card details.

## 14. Grants, subsidies and restricted funds

Every grant or subsidy has a separate private record.

### 14.1 Required fields

- program and authority;
- application/reference ID;
- applicant entity;
- approved amount;
- payment schedule;
- eligible cost categories;
- ineligible costs;
- co-financing requirement;
- evidence requirements;
- procurement requirements;
- project period;
- reporting deadlines;
- retention period;
- repayment/clawback risks;
- owner and backup;
- accountant/legal/adviser reference;
- restricted cash balance;
- actual eligible spending;
- open evidence gaps.

### 14.2 Grant rules

- an application is not an approved grant;
- an approved grant is not necessarily cash received;
- cash received may not be freely spendable;
- grant-funded purchases still require acceptance and invoice controls;
- the same expense must not be claimed twice;
- evidence must be linked before reporting;
- any change in project scope, supplier or timing is reviewed against the program rules;
- public GitHub contains no real application, personal, bank or confidential grant data.

## 15. Monthly close

Management close does not replace statutory close.

### 15.1 Close checklist

1. Obtain bank statements and balances from the authoritative source.
2. Reconcile bank transactions to private finance records.
3. Confirm all supplier invoices received and stored.
4. Record commitments without invoices.
5. Match payments to approvals and evidence.
6. Review unpaid supplier invoices.
7. Review issued customer invoices and overdue receivables.
8. Review subscriptions and upcoming renewals.
9. Record founder reimbursements and unresolved evidence.
10. Reconcile restricted grants and eligible spending.
11. Update fixed-asset or hardware inventory records where applicable.
12. Review VAT, payroll, tax and statutory items with the accountant.
13. Compare actuals to budget.
14. Update forecast at completion.
15. Update 13-week cashflow.
16. Calculate runway using the approved definition.
17. Record variances, risks and decisions.
18. Produce the founder finance summary.
19. Store the close evidence privately.
20. Lock or version the month after review.

### 15.2 Founder finance summary

The summary contains:

- opening and closing unrestricted cash;
- restricted cash;
- revenue invoiced and collected;
- overdue receivables;
- spend by category;
- committed not yet paid;
- largest variances;
- recurring monthly cost;
- forecast minimum cash point;
- runway state;
- grant status;
- upcoming material payments;
- decisions needed;
- data quality or evidence gaps.

## 16. Scenario planning

Maintain at least three scenarios:

### `BASE`

Current approved operating assumption.

### `CONSERVATIVE`

Examples of assumptions:

- slower customer conversion;
- later invoice collection;
- higher hardware replacement cost;
- additional legal or infrastructure work;
- no unapproved grant income.

### `STRESS`

Examples of assumptions:

- pilot delayed;
- major customer payment delayed;
- critical hardware redesign;
- unexpected external developer remediation;
- grant not awarded or repayment risk;
- increased hosting/support cost.

### Scenario record

For every scenario state:

- assumptions;
- period;
- expected receipts;
- expected commitments;
- minimum cash point;
- runway;
- obligations still payable;
- costs that can be paused;
- costs that cannot be paused;
- trigger for moving from one scenario to another;
- founder decisions required.

Scenarios must not overwrite actuals or the approved budget.

## 17. Financial risk triggers

Exact numeric thresholds remain `OPEN`.

Create alerts for:

- runway moving into `WATCH`, `ACTION` or `CRITICAL`;
- forecast cash below the approved minimum;
- material unapproved commitment;
- invoice received without a commitment;
- payment requested without acceptance evidence;
- budget forecast exceeding approved amount;
- overdue customer receivable;
- one customer representing excessive concentration;
- subscription renewing without active owner;
- grant evidence gap or ineligible-spend risk;
- tax/payroll/statutory amount not reserved;
- bank or card access held by one person only;
- unexplained bank transaction;
- duplicate or suspicious invoice;
- vendor bank-account change;
- founder reimbursement without evidence;
- actual data not closed by the approved date.

### Risk response record

- trigger;
- date detected;
- amount or exposure;
- owner;
- immediate containment;
- decision required;
- due date;
- status;
- evidence location.

## 18. Finance meeting cadence

### Weekly cash review

When active commitments exist:

- current cash and restrictions;
- receipts expected in 14 days;
- payments due in 14 days;
- new commitments;
- overdue invoices;
- forecast changes;
- decisions needed.

### Monthly founder finance review

- approve management close;
- review budget variance;
- review runway;
- approve corrective actions;
- review subscriptions;
- review grants and evidence;
- review vendor commitments;
- record decisions in the authorized register.

### Quarterly planning review

- update 12-month budget;
- re-evaluate scenarios;
- review pricing assumptions against unit economics;
- review hiring and vendor capacity;
- review funding and grant strategy;
- review contingency.

## 19. Finance roles

Actual assignments remain `OPEN` until approved under Founder OS.

| Role | Responsibility | Backup required? |
|---|---|---:|
| Finance owner | Maintains management records and cadence | Yes |
| Payment preparer | Prepares but does not automatically approve payment | Yes |
| Payment approver | Approves under decision rights | Yes |
| Accountant liaison | Coordinates statutory/accounting questions | Yes |
| Receivables owner | Tracks customer invoices and reminders | Yes |
| Subscription owner | Reviews use, renewal and cancellation | Yes |
| Grant owner | Maintains program evidence and deadlines | Yes |
| Reviewer | Performs monthly independent review | Yes |

No role in this document changes legal signing or banking authority.

## 20. Private finance-system requirements

Before real operations, choose a private BSS-controlled system that supports:

- role-based access;
- MFA;
- audit history;
- attachments and evidence links;
- export to accountant-compatible formats;
- backup and recovery;
- separation of actual, forecast and scenario data;
- recurring-cost tracking;
- due-date alerts;
- access revocation;
- retention controls.

A spreadsheet may be used temporarily only when:

- it is stored in an approved private workspace;
- access is restricted;
- version history is active;
- backups exist;
- one owner and one backup are named;
- no public links are enabled;
- accountant requirements can still be met.

## 21. Fictional dry run

All names and numbers below are fictional and are not BSS forecasts or approved amounts.

### 21.1 Fictional opening position

- unrestricted cash: `FICT-EUR 18,000`;
- restricted grant cash: `FICT-EUR 7,000`;
- customer receivable due in Week 2: `FICT-EUR 1,500`;
- approved hardware commitment: `FICT-EUR 2,400`;
- external software review commitment: `FICT-EUR 3,000`;
- recurring monthly infrastructure: `FICT-EUR 220`;
- accountant/legal forecast for the quarter: `FICT-EUR 1,200`.

### 21.2 Commitment and invoice event

A fictional CAD supplier submits an invoice for `FICT-EUR 1,100`.

Review finds:

- approved commitment exists;
- source SolidWorks file is missing;
- STEP export and drawing are delivered;
- acceptance result is `CONDITIONAL ACCEPTANCE`;
- payment terms require accepted source files.

Finance result:

- invoice status: `BLOCKED — NO FINAL ACCEPTANCE`;
- no payment scheduled;
- supplier receives a punch-list;
- 13-week cashflow keeps the amount as a likely future outflow, not paid actual.

After source files pass review:

- acceptance becomes `ACCEPTED`;
- invoice becomes `APPROVED FOR PAYMENT`;
- payment is scheduled in Week 3;
- commitment remaining balance is updated.

### 21.3 Fictional customer receivable event

The Week 2 customer receipt is delayed to Week 5.

Actions:

- receivable status changes to `OVERDUE` after the approved trigger;
- the cashflow forecast moves the receipt from Week 2 to Week 5;
- confidence changes from `HIGH` to `MEDIUM`;
- discretionary marketing spend is moved to `PLANNED`, not committed;
- founders review the minimum cash week.

### 21.4 Fictional monthly close result

- all bank transactions reconciled;
- one duplicate software subscription identified and marked for cancellation;
- one founder expense lacks a receipt and remains `BLOCKED`;
- hardware forecast is above budget due to enclosure rework;
- restricted grant spending remains within the fictional eligible category;
- no statutory conclusion is made without accountant review;
- management close status: `CONDITIONAL — TWO EVIDENCE ITEMS OPEN`.

This fictional dry run proves only that the process can be followed. It does not prove real financial readiness.

## 22. Evidence index

| Evidence ID | Required evidence | Public or private |
|---|---|---|
| `FIN-001` | Founder-approved finance roles and backups | Private decision record |
| `FIN-002` | Approved budget and version | Private |
| `FIN-003` | Commitment register | Private |
| `FIN-004` | Accounts-payable register | Private |
| `FIN-005` | Receivables register | Private |
| `FIN-006` | Subscription register | Private |
| `FIN-007` | 13-week cashflow | Private |
| `FIN-008` | Runway definition and approved triggers | Private decision record |
| `FIN-009` | Grant/restricted-fund register | Private |
| `FIN-010` | Founder reimbursement register | Private |
| `FIN-011` | Monthly close checklist and sign-off | Private |
| `FIN-012` | Actual-versus-budget review | Private |
| `FIN-013` | Scenario assumptions and outputs | Private |
| `FIN-014` | Accountant review/open questions | Private |
| `FIN-015` | Access, backup and recovery test | Private |

## 23. Approval gates

### Gate F1 — Founder approval

Required before operational use:

- roles and backups;
- decision rights;
- spending bands;
- payment approval path;
- runway states and triggers;
- monthly-close deadline.

### Gate F2 — Accountant alignment

Required before relying on the process for real statutory or tax treatment:

- invoice and evidence requirements;
- VAT and tax handling;
- founder reimbursements;
- payroll and contractor treatment;
- fixed assets and inventory;
- grants and restricted funds;
- document retention;
- export/integration requirements.

### Gate F3 — Private system readiness

Required before storing real data:

- approved private system;
- MFA and role access;
- backup and recovery;
- owner and backup;
- no public sharing;
- accountant-compatible export.

### Gate F4 — Dry run

Required before live operations:

- fictional budget;
- fictional commitment and invoice;
- fictional customer receivable;
- 13-week cashflow update;
- monthly close;
- access and backup test;
- recorded lessons and changes.

## 24. External review backlog

Confirm with qualified Croatian professionals where applicable:

- company bookkeeping setup;
- VAT registration and invoicing;
- tax treatment of founder funding, loans and reimbursements;
- payroll and contractor classification;
- fixed assets, inventory and depreciation;
- grant and subsidy accounting;
- foreign suppliers and cross-border services;
- payment and bank authorization;
- statutory retention;
- annual accounts and filings;
- insurance and financial controls.

## 25. Definition of done for this document

The document is complete for `PROPOSED v0.1` when:

- it is merged through green repository gates;
- templates exist for all required finance records;
- actual, forecast and scenario states are explicit;
- no real financial or personal data is present;
- one fictional end-to-end dry run exists;
- founder decisions and accountant-dependent items remain clearly open.

Merge of this document does not mean:

- the company is formed;
- the budget is approved;
- bank access exists;
- tax or VAT treatment is confirmed;
- any grant is awarded;
- any founder may spend or sign unilaterally;
- BSS has proven runway or financial readiness.
