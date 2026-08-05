# BSS Demo & Training Playbook

| Field | Value |
|---|---|
| Status | `PROPOSED` |
| Version | `0.1` |
| Date | `2026-08-05` |
| Owner | BSS Product Owner |
| Related issue | `#79` |
| Applies to | Controlled sales demo, pilot preparation and role-based training |
| Does not prove | Production readiness, live customer acceptance, contractual SLA, approved pricing or legal compliance |

## 1. Purpose

This playbook defines a repeatable way for Tomislav, his brother or a future BSS team member to:

1. prepare a controlled BSS demonstration;
2. deliver a clear 15-minute product story;
3. separate proven functionality from Preview, proposal and roadmap;
4. train each customer role only for the tasks that role should perform;
5. record understanding, open questions and retraining needs;
6. recover professionally when the demo environment, network or simulated terminal is unavailable.

The objective is not to show every screen. The objective is to prove that BSS understands the customer’s attendance workflow and can guide one complete daily journey without exaggeration.

## 2. Authoritative references

Before using this playbook, check:

- `BSS_MVP_SCOPE_FREEZE_V1.md` for frozen MVP scope;
- `BSS_READINESS_MATRIX.md` for current technical readiness;
- `docs/bss-os/PRODUCT_FEATURE_REGISTRY.md` for feature status;
- `docs/bss-os/SALES_CUSTOMER_ONBOARDING_OS.md` for opportunity stages;
- `docs/bss-os/CUSTOMER_DISCOVERY_OUTREACH_PACK.md` for discovery and objection handling;
- `docs/bss-os/PILOT_READINESS_PACKAGE.md` for live-pilot gates;
- `docs/bss-os/PILOT_INSTALLATION_ACCEPTANCE_PACK.md` for terminal acceptance;
- `docs/bss-os/SUPPORT_INCIDENT_OPERATING_SYSTEM.md` for demo failure and incident handling;
- issue `#55` for the authoritative software baseline;
- issue `#58` for Preview Portal reconstruction.

Screenshots, exact button labels and click paths must be revalidated after issues `#55` and `#58` are complete. This document defines the operating flow; it is not evidence that every current screen already matches it.

## 3. Mandatory product-status language

The presenter must use these meanings consistently.

| Status | Meaning in a demo |
|---|---|
| `RELEASED` | Included in a declared release with evidence |
| `IMPLEMENTED` | Exists in code and has supporting verification, but may still be behind other release gates |
| `PREVIEW` | Demonstration behavior using controlled or fictional data; not production proof |
| `PROPOSED` | Documented direction awaiting decision or evidence |
| `BLOCKED` | Cannot safely proceed because a dependency or proof is missing |
| `ROADMAP` | Future idea outside the current committed delivery |

Examples:

- Correct: “Ovo je Preview tok s fiktivnim podacima koji pokazuje planirani korisnički doživljaj.”
- Correct: “Backend funkcija postoji u razvojnoj grani, ali produkcijska spremnost još nije potvrđena.”
- Incorrect: “Sve je gotovo” when the evidence is an open PR, mockup or document.
- Incorrect: “Možemo krenuti idući tjedan” before software, infrastructure, hardware, privacy and pilot gates are complete.

## 4. Demo types

### 4.1 Preview demo

Use for early discovery and sales validation.

- fictional deterministic data only;
- no real customer or employee data;
- clearly state `PREVIEW` at the beginning;
- no production, legal or uptime claims;
- reset state before and after every session.

### 4.2 Staging demonstration

Use only after a reproducible staging environment exists.

- test tenant and test users only;
- show implemented behavior supported by current evidence;
- identify unresolved production gates;
- never share staging credentials in public documentation or chat.

### 4.3 Live-pilot training

Allowed only after the applicable Pilot Readiness, legal/privacy, installation and support gates pass.

- customer-specific approved environment;
- named BSS trainer and customer owner;
- approved training data and access;
- attendance and competency evidence;
- no training session may override a failed go-live gate.

## 5. Presenter roles

| Role | Responsibility |
|---|---|
| Lead presenter | controls story, timing and claims |
| Product operator | performs clicks and terminal simulation |
| Observer/notetaker | records customer reactions, questions and next actions |
| Technical backup | handles environment failure without derailing the conversation |

With two founders, one person may combine presenter and operator, while the second records questions and controls unsupported claims.

## 6. Demo preparation checklist

### 6.1 Twenty-four hours before

- [ ] Confirm meeting date, time, participants and expected roles.
- [ ] Confirm whether the meeting is discovery, Preview demo or approved training.
- [ ] Read the private opportunity record and qualification notes.
- [ ] Select only the role paths relevant to the audience.
- [ ] Verify current feature statuses in the Product Feature Registry.
- [ ] Verify that no planned screen is blocked, renamed or removed.
- [ ] Prepare fictional company and worker names.
- [ ] Confirm demo environment URL and access.
- [ ] Test reset to the exact initial fixture state.
- [ ] Test screen sharing, audio and browser zoom.
- [ ] Prepare static screenshots or a short offline backup recording.
- [ ] Prepare a one-page known-limitations note.
- [ ] Assign presenter, operator and notetaker.

### 6.2 Thirty minutes before

- [ ] Restart browser and close unrelated tabs.
- [ ] Disable personal notifications.
- [ ] Open only the required demo tabs.
- [ ] Confirm fictional tenant and user identities.
- [ ] Confirm dashboard initial values.
- [ ] Confirm simulated RFID action updates the expected record.
- [ ] Confirm leave-request flow resets correctly.
- [ ] Confirm role switching works as expected.
- [ ] Confirm accounting/export Preview contains no payroll claim.
- [ ] Confirm fallback screenshots or recording are locally available.
- [ ] Start a visible timer.

### 6.3 Immediately before presenting

Say:

> “Danas prikazujemo kontrolirani BSS Preview s fiktivnim podacima. Cilj je provjeriti odgovara li tijek vašem načinu rada. Preview nije dokaz produkcijske spremnosti niti konačan ugovorni opseg.”

## 7. Standard 15-minute demo

The presenter should stop at 15 minutes and continue only if the customer asks for a deeper role-specific view.

| Time | Purpose | Presenter wording | Operator action | Expected outcome |
|---|---|---|---|---|
| 00:00–01:00 | Set expectations | Explain Preview status, fictional data and objective | Show landing/context screen | Audience understands boundaries |
| 01:00–02:30 | Establish problem | Ask how attendance is recorded and corrected today | No unnecessary clicking | Customer confirms or corrects pain hypothesis |
| 02:30–04:00 | Company overview | “Uprava prvo vidi stanje koje traži pažnju, ne deset stranica tablica.” | Open owner/director overview | Show concise status, not every metric |
| 04:00–06:00 | Worker event | “Radnik koristi karticu; sustav bilježi događaj i daje jasnu potvrdu.” | Open simulated terminal and register fictional worker | Attendance state changes consistently |
| 06:00–07:30 | Manager review | “Voditelj vidi iznimke i odlučuje što treba provjeriti.” | Open manager workspace and relevant exception | Human review remains explicit |
| 07:30–09:00 | Correction/audit | “Izvorni trag se ne briše; korekcija mora imati razlog i ovlaštenje.” | Show correction or audit-oriented Preview flow | Customer sees accountability concept |
| 09:00–10:30 | Leave request | “Radnik šalje zahtjev, a ovlaštena osoba donosi odluku.” | Submit fictional leave request and open approval view | Linked request flow is visible |
| 10:30–12:00 | Reporting/accounting | “Knjigovodstvo dobiva pregled ili izvoz; BSS MVP ne obračunava plaću.” | Open accounting/report Preview | No payroll or tax claim |
| 12:00–13:00 | Reliability/fallback | Explain manual attendance fallback and later reconciliation | Show fallback form or playbook excerpt | Customer understands outage process |
| 13:00–14:00 | Known limits | State excluded MVP features relevant to the customer | Show no roadmap mockup unless requested | Expectations stay controlled |
| 14:00–15:00 | Validate and next step | Ask three closing questions and agree one next action | Record answers privately | Clear outcome: demo, nurture, pilot candidate or disqualify |

## 8. Opening script

> “BSS razvija sustav za evidenciju radnog vremena putem RFID/NFC terminala i web sučelja. Danas nećemo prolaziti svaki ekran, nego jedan kompletan radni tijek: evidencija dolaska, pregled voditelja, zahtjev radnika i izvještaj. Podaci su fiktivni, a prikazani Preview ne predstavlja produkcijsku potvrdu. Tijekom prezentacije slobodno recite gdje se vaš proces razlikuje.”

## 9. Core story

The demo should tell one coherent story:

1. Uprava needs visibility without reading raw logs.
2. Worker needs a simple and clear action.
3. Manager needs exceptions, context and controlled correction.
4. Accounting needs reliable records or export, not another manual reconstruction.
5. BSS needs auditability, tenant isolation and fallback discipline before live use.

Do not jump randomly between features.

## 10. Role path: Uprava / vlasnik

### Objective

Show business visibility and control without presenting unsupported financial savings.

### Demonstrate

- present/absent or exception-oriented summary where available;
- unresolved items requiring attention;
- approved absence visibility;
- auditability and role separation;
- pilot success indicators.

### Ask

- “Koju informaciju danas najčešće tražite od voditelja ili administracije?”
- “Koliko vremena prođe prije nego vidite da evidencija nije potpuna?”
- “Tko danas odobrava korekcije i godišnje?”

### Do not claim

- guaranteed savings percentage;
- automatic legal compliance;
- payroll replacement;
- production availability before infrastructure evidence;
- advanced analytics not present in the registry.

## 11. Role path: Voditelj

### Objective

Show daily exception handling and human accountability.

### Demonstrate

- team attendance view;
- missing or suspicious record requiring review;
- reasoned correction path;
- leave request decision;
- audit trail concept;
- escalation when the record cannot be safely resolved.

### Ask

- “Koje greške se najčešće pojavljuju?”
- “Tko smije mijenjati zapis?”
- “Treba li voditelj vidjeti cijelu firmu ili samo svoj tim?”
- “Kako danas dokazujete zašto je zapis promijenjen?”

### Pass condition for training

The participant can identify an exception, explain when not to edit silently, record a reason and locate the resulting status or evidence.

## 12. Role path: Radnik

### Objective

Show a low-friction daily action and transparent self-service.

### Demonstrate where current evidence permits

- RFID/NFC identification concept;
- successful clock event confirmation;
- failed/unknown card handling;
- personal attendance visibility;
- leave-request submission;
- how to report an incorrect record;
- manual fallback during outage.

### Ask

- “Što radnik danas radi ako zaboravi evidentirati dolazak?”
- “Kako dobije potvrdu da je događaj zabilježen?”
- “Kako danas traži godišnji ili prijavljuje pogrešku?”

### Pass condition for training

The participant can perform the approved attendance action, interpret success/failure feedback, submit a fictional request and explain whom to contact for a correction.

## 13. Role path: Knjigovodstvo

### Objective

Show reliable access to approved records or export without claiming payroll computation.

### Demonstrate

- period and employee/team selection where implemented;
- report preview;
- export concept and status;
- distinction between original record, correction and approval;
- treatment of unresolved records;
- customer-controlled retention and access.

### Required sentence

> “BSS MVP priprema evidenciju i izvoz, ali ne obračunava plaću, poreze ni doprinose.”

### Ask

- “Koji format danas preuzimate?”
- “Koje informacije moraju biti zaključene prije obračuna?”
- “Kako danas označavate zapis koji još nije provjeren?”

### Pass condition for training

The participant can select the approved reporting period, distinguish complete from unresolved data and explain that export is an input to accounting, not payroll calculation.

## 14. Closing questions

Ask exactly these before offering a next step:

1. “Koji dio prikazanog toka najviše odgovara vašem stvarnom problemu?”
2. “Koji bi nedostatak spriječio da ograničeni pilot ima smisla?”
3. “Tko još mora potvrditi proces prije odluke o pilotu?”

Then classify the outcome:

- `QUALIFIED`: schedule deeper workflow validation;
- `PILOT_CANDIDATE`: begin readiness pre-check, without promising date;
- `NURTURE`: record specific future trigger/date;
- `DISQUALIFIED`: document hard mismatch;
- `LOST`: record reason and lesson.

## 15. Known-limitations statement

Use only the limitations relevant to the audience:

> “U trenutačni MVP ne ubrajamo obračun plaće, biometriju, GPS/geofencing, otvaranje vrata ni obveznu nativnu mobilnu aplikaciju. Produkcijska infrastruktura, fizička prihvatljivost terminala i pravni dokumenti imaju zasebne gateove prije stvarnih podataka.”

## 16. Demo failure handling

### 16.1 Preview unavailable

1. State the problem honestly.
2. Do not repeatedly refresh for more than 60 seconds.
3. Switch to approved screenshots or offline recording.
4. Continue the business workflow, not technical debugging.
5. Record the failure under the Support & Incident OS.
6. Offer a controlled follow-up only when the environment is restored.

Suggested wording:

> “Preview okruženje trenutno nije dostupno. Neću glumiti da je sve u redu; prikazat ću isti tijek kroz pripremljene statične primjere i nakon toga vam poslati potvrdu kada ponovno možemo proći interaktivno.”

### 16.2 Simulated terminal fails

- do not use a real unknown card or customer credential;
- show the approved fallback illustration;
- explain expected success and failure feedback;
- separate simulation failure from physical hardware readiness;
- record the scenario for later validation.

### 16.3 Browser or screen-share problem

- use the backup browser profile;
- reduce extensions and zoom issues;
- switch presenter/operator if needed;
- never expose personal tabs, messages or secrets.

### 16.4 Fixture state is wrong

- stop the flow;
- run the documented reset once;
- if reset fails, use fallback material;
- do not manually invent values during the customer call.

## 17. Training structure

Training is separate from the sales demo.

### 17.1 Training session sequence

1. Confirm approved environment and participant roles.
2. Explain data/privacy boundaries and support route.
3. Demonstrate the role’s daily tasks.
4. Participant repeats tasks with fictional or approved training data.
5. Trainer observes without taking over immediately.
6. Complete competency check.
7. Record questions, failed tasks and retraining needs.
8. Provide role-specific quick reference.

### 17.2 Recommended duration

| Role | Initial training target |
|---|---|
| Uprava | 30–45 minutes |
| Voditelj | 45–60 minutes |
| Radnik group | 15–25 minutes |
| Knjigovodstvo | 30–45 minutes |
| Customer pilot administrator | 60–90 minutes |

These are proposed planning targets, not contractual commitments.

## 18. Training module: Uprava

### Learning objectives

- understand what the dashboard does and does not prove;
- identify unresolved risk or action items;
- understand role separation and audit evidence;
- understand pilot success reporting;
- know the support/escalation route.

### Exercises

- locate one fictional exception;
- identify the responsible operational owner;
- distinguish Preview KPI from production evidence;
- explain why a signed checklist cannot override a failed critical gate.

### Pass criteria

All critical exercises completed without the trainer operating the interface on the participant’s behalf.

## 19. Training module: Voditelj

### Learning objectives

- review daily team status;
- identify missing/inconsistent records;
- perform or request an authorized correction;
- approve/reject a leave request where permitted;
- preserve reason and audit evidence;
- activate manual fallback when required.

### Exercises

- find a fictional missing clock-out;
- record the required reason and next action;
- process a fictional leave request;
- explain when to escalate instead of editing;
- reconcile one manual fallback record.

### Pass criteria

No silent modification, correct role boundary and complete evidence for every exercised correction.

## 20. Training module: Radnik

### Learning objectives

- use the attendance action correctly;
- understand success and failure signals;
- know the process for forgotten or incorrect records;
- submit a leave request where available;
- use manual fallback during outage;
- know whom to contact.

### Exercises

- perform fictional arrival and departure;
- react to an unknown/failed card scenario;
- submit a fictional leave request;
- complete the manual fallback line correctly.

### Pass criteria

Participant completes all daily actions and can state the correction/support route.

## 21. Training module: Knjigovodstvo

### Learning objectives

- access the permitted report scope;
- select period and population;
- identify unresolved records;
- prepare or request export;
- understand audit and retention boundaries;
- understand that BSS does not calculate payroll.

### Exercises

- prepare a fictional monthly report;
- identify one unresolved record;
- explain whether it may proceed to accounting;
- locate the correction reason or audit indicator;
- state the payroll limitation correctly.

### Pass criteria

Participant does not treat incomplete data as final and does not describe the export as payroll calculation.

## 22. Trainer record

Store real participant records only in an approved private system.

Minimum fields:

- customer/tenant ID;
- training session ID;
- date and environment version;
- trainer;
- participant role;
- modules delivered;
- exercises attempted;
- pass/fail/conditional outcome;
- open questions;
- retraining required: yes/no;
- next action and owner;
- evidence link.

Do not commit participant names, emails or signatures to the public repository.

## 23. Competency outcomes

| Outcome | Meaning |
|---|---|
| `PASS` | All critical tasks completed independently |
| `CONDITIONAL PASS` | Daily use may proceed only with named supervision and dated retraining |
| `FAIL` | One or more critical tasks or safety/privacy boundaries not understood |
| `BLOCKED` | Required environment, feature or evidence unavailable |

A friendly conversation or attendance at training is not a pass.

## 24. Retraining triggers

Retraining is required when:

- critical workflow or navigation changes;
- participant repeatedly performs unauthorized corrections;
- support cases show misunderstanding of fallback;
- role or access scope changes;
- report/export semantics change;
- privacy or retention instructions materially change;
- an incident review identifies training as a contributing cause;
- more than 90 days pass before a delayed live pilot and the interface changed materially.

## 25. Quick-reference cards

Prepare one short card per role after exact screen validation.

### Worker card

1. Identify/clock action.
2. Confirm success message.
3. Report failed or incorrect record.
4. Submit leave request.
5. Use manual fallback during outage.

### Manager card

1. Review team exceptions.
2. Verify context.
3. Correct only with authorization and reason.
4. Process leave decision.
5. Escalate unresolved or security/privacy concerns.

### Accounting card

1. Select approved period.
2. Check unresolved records.
3. Generate/prepare export.
4. Preserve evidence and audit context.
5. Do not interpret BSS as payroll calculation.

### Owner card

1. Review status requiring attention.
2. Assign operational owner.
3. Track pilot success and open blockers.
4. Use approved support route.
5. Do not treat Preview metrics as production evidence.

## 26. Fictional dry run

### Scenario

- Company: `Primjer Montaža d.o.o.`
- Workers in demo: 24 fictional workers
- Location: one fictional site
- Roles present: owner, manager, worker representative, accounting representative
- Environment: deterministic Preview

### Result

| Step | Outcome |
|---|---|
| Preview reset | PASS |
| Opening status statement | PASS |
| Owner overview | PASS |
| Simulated RFID event | PASS |
| Manager exception review | PASS |
| Fictional correction explanation | PASS |
| Leave request and decision | PASS |
| Accounting/report limitation | PASS |
| Manual fallback explanation | PASS |
| Closing questions | PASS |
| Total duration | 14:42 |

### Findings

- Presenter must avoid spending more than 90 seconds on the owner overview.
- Payroll limitation should be stated before opening the accounting view.
- The notetaker must record the customer’s current correction process, not only feature reactions.
- Exact click paths remain `BLOCKED` until the authoritative baseline and reconstructed Preview are validated.

This dry run is fictional and does not prove a real customer demo or training completion.

## 27. Evidence index

| ID | Evidence | Status before controlled external use |
|---|---|---|
| `DTP-001` | Product status/claim review | OPEN |
| `DTP-002` | Current 15-minute script approved | OPEN |
| `DTP-003` | Preview reset proof | OPEN |
| `DTP-004` | Exact click-path validation | BLOCKED by #55/#58 |
| `DTP-005` | Offline fallback screenshots/recording | OPEN |
| `DTP-006` | Known-limitations sheet | OPEN |
| `DTP-007` | Owner training exercise proof | OPEN |
| `DTP-008` | Manager training exercise proof | OPEN |
| `DTP-009` | Worker training exercise proof | OPEN |
| `DTP-010` | Accounting training exercise proof | OPEN |
| `DTP-011` | Trainer attendance/competency template | DEFINED |
| `DTP-012` | Fictional timed dry run | DEFINED |
| `DTP-013` | Product Owner external wording approval | OPEN |
| `DTP-014` | Privacy review of training data/process | OPEN |
| `DTP-015` | Live-pilot training go/no-go evidence | BLOCKED |

## 28. Approval gates

### Approved for internal rehearsal

Requires:

- merged playbook;
- fictional data only;
- claim review;
- known limitations available;
- fallback material prepared.

### Approved for controlled external Preview demo

Requires:

- current Preview access tested;
- exact click paths validated;
- presenter rehearsal passed;
- external wording approved by Product Owner;
- no real personal data;
- no unsupported price, date, SLA or compliance promise.

### Approved for live-pilot training

Requires all applicable:

- issue `#55` authoritative baseline complete;
- issue `#58` Preview disposition complete where relevant;
- Pilot Readiness gate passed;
- infrastructure, privacy/legal, support and installation evidence passed;
- customer-specific roles and environment prepared;
- named trainer and customer owner;
- approved training and competency records.

## 29. Version control

Update this document when:

- role permissions change;
- key screen or click path changes;
- Preview fixtures or reset behavior change;
- training objectives change;
- new critical fallback is introduced;
- product status language changes;
- a demo or incident review produces a corrective action.

Every external demo should record which playbook version and environment version were used.
