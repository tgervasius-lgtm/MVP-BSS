# BSS Sales & Customer Onboarding Operating System

| Field | Value |
|---|---|
| Status | `PROPOSED` |
| Version | `0.1` |
| Date | `2026-08-05` |
| Owner | BSS Product Owner |
| Related issue | `#68` |
| Applies to | Lead qualification, discovery, demo, offer, pilot approval, onboarding and post-pilot review |
| Does not replace | Approved pricing, customer-specific offer, signed contract, DPA, DPIA, technical go-live evidence or a private CRM |

## 1. Purpose

This document defines one repeatable way for BSS to move a company from first contact to a qualified opportunity, controlled pilot and post-pilot commercial decision.

The goal is not to create a large enterprise sales bureaucracy. The goal is to prevent five early-stage failures:

1. losing promising companies because no next action is recorded;
2. spending weeks on companies that are not a realistic MVP fit;
3. promising features, dates or production readiness that are not proven;
4. handing an unqualified customer directly to technical implementation;
5. starting a pilot without commercial, privacy, hardware and operational ownership.

The process must work with two founders and later remain understandable to a salesperson, implementation specialist or external partner.

## 2. Sources of truth and privacy boundary

Authoritative repository references:

- `BSS_MVP_SCOPE_FREEZE_V1.md` for product scope;
- `BSS_READINESS_MATRIX.md` for technical readiness;
- `docs/bss-os/PRODUCT_FEATURE_REGISTRY.md` for feature status;
- `docs/bss-os/PILOT_READINESS_PACKAGE.md` for live-pilot gates;
- `docs/bss-os/GDPR_DATA_GOVERNANCE_BASELINE.md` for privacy roles and data rules;
- `docs/bss-os/LEGAL_OPERATIONS_TEMPLATE_PACK.md` for legal working templates;
- `docs/bss-os/ADR-001-INFRASTRUCTURE-BASELINE.md` for infrastructure proposal;
- issue `#55` for the authoritative software baseline;
- issue `#59` for infrastructure implementation;
- issue `#60` for hardware metrology and production handoff;
- issues `#64` and `#66` for privacy/legal evidence.

GitHub stores the operating model, template fields, approved messaging and evidence links. It must not store real prospect personal data in public issues, Markdown examples or commits.

Real lead data belongs in an approved private CRM or another approved restricted system. Until that tool is selected, BSS may use a private access-controlled register outside the public product repository. Personal telephone numbers, direct emails and meeting notes must not be copied into public GitHub documentation.

## 3. Status language

### 3.1 Opportunity stages

| Stage | Meaning | Required next step |
|---|---|---|
| `LEAD_CAPTURED` | Company identified but not yet contacted | assign owner and contact route |
| `CONTACTED` | First outreach sent or call attempted | record dated follow-up |
| `DISCOVERY_SCHEDULED` | Discovery meeting booked | prepare company hypothesis and questions |
| `QUALIFIED` | Need, authority, timing and MVP fit are sufficient | schedule controlled demo |
| `DEMO_COMPLETED` | Demo delivered and reaction recorded | decide pilot fit, nurture or close |
| `PILOT_CANDIDATE` | Company fits the first-pilot model | complete readiness and commercial pre-check |
| `OFFER_SENT` | Customer-specific written offer sent | record expiry and decision date |
| `COMMERCIAL_REVIEW` | Scope, price or conditions are being negotiated | record open decisions and owner |
| `PILOT_APPROVED` | Commercial pilot decision exists | start formal onboarding gate review |
| `ONBOARDING` | Technical, legal and operational preparation active | work through approved onboarding plan |
| `READY_FOR_LIVE_GATE` | All materials assembled for go/no-go review | execute final evidence review |
| `LIVE_PILOT` | Real pilot is active | monitor support, quality and success metrics |
| `PILOT_REVIEW` | Pilot ended and evidence is being evaluated | decide paid continuation, extension or stop |
| `WON` | Customer accepted paid continuation or contract | transition to customer success/operations |
| `NURTURE` | Potential fit, but timing or readiness is not current | set a specific future review date |
| `LOST` | Customer selected another path or rejected BSS | record primary reason and lesson |
| `DISQUALIFIED` | Hard fit or ethics/compliance condition failed | close with reason; do not keep active |

A stage is not a feeling. Every stage change must have a date, owner and evidence such as a meeting outcome, written customer decision or signed document.

### 3.2 Opportunity health

- `ACTIVE`: next action exists within 14 days.
- `AT RISK`: next action is overdue or authority/timing is unclear.
- `STALLED`: no meaningful progress for 30 days.
- `CLOSED`: `WON`, `LOST` or `DISQUALIFIED`.

No active opportunity may exist without exactly one named BSS owner and one dated next action.

## 4. Proposed ideal customer profile

The first-pilot ICP is a proposal, not a permanent market restriction.

### 4.1 Strong first-pilot fit

A strong early customer normally has:

- approximately 10–100 workers in the initial deployment scope;
- one primary location and preferably one terminal for the first pilot;
- shifts, attendance complexity or manual correction work that creates a visible problem;
- current use of paper, spreadsheets, basic clocking or a system the customer considers inadequate;
- a named decision-maker and a named operational administrator;
- willingness to run a controlled four-week pilot;
- willingness to provide required worker information lawfully and complete privacy/legal preparation;
- acceptable network, power and installation conditions;
- no requirement for payroll calculation, GPS, biometric identification or door-access control in the MVP;
- a realistic decision timeframe rather than an undefined future interest.

### 4.2 Secondary fit

Companies with approximately 100–250 workers or several locations may be attractive, but should not be the first live pilot unless:

- the initial scope is reduced to one location and one terminal;
- decision authority is clear;
- data migration and support expectations are controlled;
- the customer accepts that expansion follows proven pilot results;
- BSS can support the implementation without delaying the core baseline.

### 4.3 Hard disqualifiers for the first pilot

Disqualify or defer when the prospect requires:

- payroll, tax, contribution or salary calculation as a go-live condition;
- fingerprint, facial recognition, GPS/geofencing or continuous worker-location tracking;
- physical door opening/access control;
- a native mobile application as a mandatory first-pilot requirement;
- immediate production use before BSS go-live gates are complete;
- uncontrolled custom development outside the frozen MVP scope;
- storage or use of worker data for advertising, unrelated analytics or employee profiling;
- no customer owner for privacy, administration or pilot decisions;
- refusal to complete required DPA/DPIA/worker transparency steps;
- an expectation that BSS will silently alter or erase original attendance evidence;
- a commercial or operational condition that BSS cannot honestly support.

A disqualified company may become eligible later only after the disqualifying condition changes or BSS formally changes scope.

## 5. Qualification score

Score each category from 0 to 2.

| Category | 0 | 1 | 2 |
|---|---|---|---|
| Problem | no clear problem | inconvenience | material time, accuracy or compliance pain |
| MVP fit | needs major out-of-scope functions | partial fit with controlled limits | fits frozen MVP |
| Workforce scope | unsuitable/very complex | possible with reduced scope | 10–100 workers and one-site pilot |
| Authority | no decision contact | influencer only | decision-maker engaged |
| Timing | no timeframe | 3–12 months | decision/pilot within 90 days |
| Operational owner | none | likely but unnamed | named admin/owner |
| Privacy readiness | unwilling/unknown | needs education | accepts DPA/DPIA/notice process |
| Technical readiness | impossible/unknown | solvable dependencies | suitable network/power/site |
| Commercial capacity | no budget logic | budget unclear | realistic budget/pilot funding path |
| Strategic value | poor learning/reference value | normal value | strong learning or credible reference value |

Maximum score: 20.

- `16–20`: strong pilot candidate, provided no hard blocker exists.
- `12–15`: qualified opportunity; close gaps before pilot promise.
- `8–11`: nurture or limited discovery only.
- `0–7`: disqualify from active sales effort.

A high score cannot override a hard privacy, ethics, technical or scope blocker.

## 6. Minimum private lead record

Each real company record must contain:

### 6.1 Company data

- internal opportunity ID;
- legal/trading company name;
- website and public company source;
- country/region;
- industry;
- estimated total workers;
- workers in proposed pilot scope;
- number of locations;
- current attendance method;
- likely pain hypothesis;
- lead source;
- BSS owner.

### 6.2 Contact and authority

- primary business contact;
- role in decision;
- preferred contact channel;
- decision-maker identified: yes/no;
- operational administrator identified: yes/no;
- privacy/legal contact identified: yes/no;
- technical/site contact identified: yes/no.

Personal contact details remain in the private system, not GitHub.

### 6.3 Opportunity control

- current stage;
- qualification score and date;
- hard blockers;
- last meaningful interaction;
- next action;
- next-action date;
- expected decision date;
- proposed pilot window;
- pricing/offer version;
- primary loss/disqualification reason where applicable;
- links to approved non-personal evidence.

## 7. Lead capture and research

Before contact, spend no more than 10–15 minutes on initial research unless the opportunity is strategically important.

Capture only public business facts needed for relevant outreach:

- company activity;
- approximate size;
- visible locations or shifts;
- likely operations complexity;
- possible current system signals;
- suitable public contact route.

Do not create detailed profiles of individual employees or scrape unnecessary personal data.

The research outcome is a one-sentence hypothesis:

> "This company may benefit from BSS because [observable operating characteristic] likely creates [attendance/administration problem]."

The hypothesis must be treated as unconfirmed until discovery.

## 8. First outreach standard

The first message should:

1. state who BSS is in one sentence;
2. identify the relevant problem, not list every feature;
3. explain the controlled pilot concept honestly;
4. ask for a short discovery conversation;
5. avoid unsupported claims, urgency tricks or fabricated customer references.

### 8.1 Approved messaging principles

Use language such as:

- "BSS razvija sustav za evidenciju radnog vremena putem RFID/NFC terminala i web sučelja."
- "Tražimo ograničen broj tvrtki za kontrolirani pilot nakon završnih tehničkih i pravnih provjera."
- "Cilj razgovora je provjeriti postoji li stvaran problem i odgovara li vaš proces opsegu našeg MVP-a."

Do not say:

- "sustav je potpuno produkcijski spreman" while blockers remain;
- "već radi kod više klijenata" without verified customers;
- "GDPR compliant" as an unconditional guarantee;
- "zamjenjuje obračun plaće";
- "radi bez ikakve mogućnosti greške";
- "možemo krenuti odmah" before go-live gates;
- "feature is finished" when evidence is only an open PR, mockup or Preview.

## 9. Follow-up cadence

Recommended early-stage cadence after an unanswered initial message:

- Day 0: relevant initial outreach;
- Day 3: short follow-up with one concrete value question;
- Day 8: final active follow-up offering a 15-minute discovery call;
- Day 21–30: move to `NURTURE` or close as no response;
- future contact only with a clear new reason, approved cadence and lawful business-contact practice.

Do not send repeated daily messages. Do not contact several employees from the same company in parallel without coordination. Record opt-outs and do not continue marketing contact after a clear objection unless another lawful operational reason applies.

## 10. Discovery meeting

Recommended duration: 25–35 minutes.

### 10.1 Opening

- confirm available time;
- explain that the goal is fit assessment, not a forced sale;
- state that BSS MVP has defined scope and that some areas are still going through readiness gates;
- ask permission to take operational notes.

### 10.2 Current process

Ask:

- How do workers currently record arrival and departure?
- How many workers and locations are involved?
- Are shifts fixed, rotating or across midnight?
- Who corrects missing or incorrect records?
- How are annual leave and absences currently requested and approved?
- Who prepares monthly records and exports?
- How much manual work is required each month?
- What errors or disputes happen most often?
- Does the current system work offline or during network interruptions?
- Which reports are actually required?

### 10.3 Impact

- How many hours are spent correcting/preparing records?
- What happens when a record is missing or disputed?
- Who feels the problem most: administration, managers, workers or accounting?
- Is there a legal, audit or deadline risk?
- What would a successful result look like after four weeks?

### 10.4 Decision and timing

- Who approves a pilot and later a contract?
- Who owns IT, data protection and worker communication?
- Is there a works council, union or employee representative process?
- Is budget available or does it require a future planning cycle?
- What is the earliest realistic pilot period?
- What other systems or vendors are being considered?

### 10.5 Technical and site fit

- stable power and mounting position;
- internet quality and firewall constraints;
- number and placement of terminals;
- existing RFID/NFC cards, if any;
- data import format and quality;
- browser/device requirements;
- security or vendor onboarding requirements.

### 10.6 Discovery outcome

At the end, choose one:

- `QUALIFIED`: demo with decision-maker/operational owner;
- `NURTURE`: clear future date and missing condition;
- `DISQUALIFIED`: explain mismatch respectfully;
- further discovery needed: exactly one owner and next action.

Do not schedule a demo merely because the prospect is friendly.

## 11. Controlled demo workflow

Recommended duration: 25–35 minutes.

### 11.1 Demo preparation

Before every demo confirm:

- correct Preview/demo URL and access;
- no real worker data;
- current known limitations;
- which flows are implemented, mocked or proposed;
- prospect’s top three discovery problems;
- a recovery path if the live demo fails;
- a named BSS presenter and note-taker.

### 11.2 Demo sequence

1. One-minute product framing.
2. RFID/NFC arrival/departure concept and terminal status.
3. Administrator’s daily exceptions rather than a data-heavy dashboard tour.
4. Correction workflow with preserved audit trail.
5. Leave request and approval.
6. Monthly review and export concept.
7. Role-based views for administrator, manager, accounting and worker.
8. Privacy/security boundaries relevant to the customer.
9. Pilot scope, dependencies and next decision.

Do not attempt to show every screen. The demo should answer the customer’s actual problems.

### 11.3 Truth labels

Every capability discussed must be classified internally as:

| Label | Meaning | Permitted statement |
|---|---|---|
| `PREVIEW` | visual/demo behavior, not production evidence | "Ovo je demonstracijski prikaz planiranog korisničkog toka." |
| `IMPLEMENTED` | code exists in a branch or merged baseline | state exact evidence and limitations |
| `TESTED` | automated/manual evidence exists | state test scope, not absolute quality |
| `PRODUCTION-GATED` | implemented but deployment/legal/operations gate remains | explain the open gate |
| `RELEASED` | declared release and deployed for approved use | state environment and scope |
| `ROADMAP` | not approved or not implemented | never present as included in the offer |

No salesperson may upgrade a label based on assumption.

## 12. Demo outcome record

Record:

- participants by business role in the private CRM;
- problems that resonated;
- objections/questions;
- required functions;
- out-of-scope requests;
- data/privacy concerns;
- hardware/site questions;
- buying process and decision date;
- qualification score change;
- selected next stage;
- exact next action and date.

## 13. Objection handling principles

### "We already have Excel/paper"

Do not attack the current process. Quantify correction time, auditability, access control and reproducibility. A simple process may be sufficient; BSS is useful only when the problem justifies change.

### "We need payroll integration"

Clarify that MVP prepares reliable records/exports but does not calculate payroll. Record integration as future scope, not an implied pilot deliverable.

### "Can you use fingerprint/face/GPS?"

State that biometrics and GPS/geofencing are outside MVP and introduce material privacy/design changes.

### "Can we start next week?"

Explain that BSS requires a controlled readiness review, customer privacy preparation, installation plan and dry run. Do not give a live date without evidence owners confirming the gate.

### "Is it GDPR compliant?"

Explain roles and controls accurately: BSS provides technical and contractual safeguards, while compliance depends on the customer’s lawful purpose, DPIA, worker notice, configuration, access and use. Avoid unconditional certification language.

### "We need a custom feature before pilot"

Classify it as:

- already in frozen MVP;
- configuration;
- defect/required compliance fix;
- future roadmap;
- disqualifying requirement.

Do not accept custom development verbally.

## 14. Pilot candidate gate

Move an opportunity to `PILOT_CANDIDATE` only when:

- qualification score is normally at least 16/20;
- decision-maker or authorised sponsor is engaged;
- one operational owner is named;
- one limited initial location/terminal scope is defined;
- worker count is known;
- success problem and metrics are agreed in principle;
- hard scope blockers are absent;
- customer accepts privacy/legal preparation;
- timing is realistic;
- BSS has capacity for onboarding/support;
- no unproven feature is treated as mandatory.

The stage does not mean the pilot is technically approved.

## 15. Commercial pre-check and pricing control

Pricing is `PROPOSED` until the Product Owner approves the customer-specific offer.

The sales record must separate:

- hardware/terminal charge or leasing model;
- software/service subscription;
- number of included workers/terminals;
- setup, installation and training;
- travel and physical installation costs;
- pilot discount or fee;
- support level;
- data migration;
- taxes/VAT;
- minimum term and cancellation;
- ownership and return/replacement of hardware;
- post-pilot pricing.

No verbal quote is final unless reproduced in a dated written offer version.

### 15.1 Discount rules

Any discount must have:

- reason;
- amount and duration;
- owner approval;
- expiry;
- what BSS receives in return, if anything, such as structured feedback or a permitted reference;
- confirmation that no worker privacy rights are exchanged for a discount.

Never offer an indefinite founder discount without a defined end or decision point.

## 16. Customer-specific offer checklist

Before sending an offer confirm:

- legal customer entity and address;
- business contact and authorised recipient;
- scope: company, location, workers and terminal count;
- included MVP features;
- excluded features;
- pilot duration;
- proposed dates marked as conditional where gates remain;
- installation responsibility;
- customer data/input responsibility;
- BSS support responsibility;
- privacy/DPA/DPIA dependencies;
- success metrics;
- stop/rollback conditions;
- pricing version and VAT treatment;
- validity period;
- transition after pilot;
- hardware ownership/return/replacement;
- signatures/approval path;
- reference to terms and data-processing documentation.

The offer must not promise production behavior that is only visible in Preview.

## 17. Offer follow-up

Recommended sequence:

- offer delivery: confirm receipt and decision process;
- 2–3 business days: answer factual questions;
- agreed decision date: request decision or identify blocker;
- one final written summary of scope/changes;
- move to `NURTURE` or `LOST` when no realistic next step exists.

Every negotiated change must update the offer version. Do not rely on an email thread as the only scope record.

## 18. Sales-to-onboarding handoff

Sales does not hand off only a signed price. The handoff package must contain:

- final opportunity summary;
- signed/approved commercial document;
- exact pilot scope;
- customer objectives and success metrics;
- named customer sponsor;
- named customer administrator;
- named privacy/legal contact;
- named technical/site contact;
- workforce/location/terminal scope;
- approved features and explicit exclusions;
- open risks and dependencies;
- target dates and confidence level;
- data/import assumptions;
- hardware/site assumptions;
- support commitments;
- DPA/DPIA/notice status;
- evidence links;
- customer communication history summary without unnecessary personal data.

The implementation owner must explicitly accept the handoff or return it with missing items.

## 19. Customer onboarding stages

### 19.1 `PILOT_APPROVED`

Requirements:

- commercial approval exists;
- scope version is frozen for onboarding;
- customer owners are named;
- target date is provisional until final go-live review.

### 19.2 Kickoff

Kickoff agenda:

- objectives and non-goals;
- roles and contacts;
- implementation timeline;
- data and privacy responsibilities;
- hardware/site plan;
- training audiences;
- support channel and severity model;
- success metrics;
- change-control process;
- go/no-go authority.

### 19.3 Customer data preparation

Customer supplies only approved minimum data through an approved secure channel.

Typical fields may include:

- worker internal reference;
- worker name;
- work email where needed;
- department and role;
- shift/working-time rule;
- manager scope;
- leave balance where applicable;
- active/inactive status;
- RFID assignment workflow.

Do not request OIB, bank data, home address, medical diagnosis or document copies by default.

Validate:

- row count;
- required fields;
- duplicates;
- invalid emails/identifiers;
- department/manager mapping;
- shift validity;
- worker status;
- approved lawful scope.

### 19.4 Environment and access preparation

- tenant created in the approved environment;
- administrator accounts invited securely;
- least-privilege roles assigned;
- test accounts separated from real workers;
- secrets and credentials delivered through approved channels;
- Preview access not reused as production access;
- environment URL and support contacts documented.

### 19.5 Hardware and site preparation

- physical measurements confirmed;
- device identity and terminal assignment prepared;
- power/network confirmed;
- mounting position approved;
- cable/security considerations approved;
- time sync and offline behavior tested;
- spare/replacement process defined;
- installation appointment and customer site contact confirmed.

### 19.6 Configuration workshop

Confirm:

- organisation timezone;
- departments;
- work schedules/shifts;
- breaks and tolerances;
- holidays/non-working days;
- approval roles;
- leave categories;
- report/export requirements;
- retention/legal hold instructions;
- user access scope.

Configuration decisions must not silently change frozen product behavior.

### 19.7 Training

Minimum training groups:

- administrator;
- managers/approvers;
- accounting/report consumer;
- workers;
- BSS support/on-call owner.

Training evidence includes:

- date;
- audience;
- version/environment;
- topics;
- unresolved questions;
- attendance or delivery confirmation;
- training materials used.

### 19.8 Test-data dry run

Complete the full dry run required by the Pilot Readiness Package before live data:

- worker import;
- role boundaries;
- terminal event flow;
- offline queue and resync;
- duplicate handling;
- blocked card;
- correction approval;
- leave request/approval;
- report/export consistency;
- backup/restore evidence;
- incident escalation;
- tenant offboarding exercise where applicable.

### 19.9 Final go/no-go

The final review checks the evidence, not confidence.

Required decision fields:

- decision: `GO`, `CONDITIONAL GO` or `NO-GO`;
- date/time;
- decision owners;
- open conditions;
- rollback trigger;
- first support window;
- customer communication owner;
- evidence index.

`CONDITIONAL GO` is prohibited for unresolved critical security, privacy, tenant isolation, backup/restore or hardware safety blockers.

## 20. Live pilot operating rhythm

Recommended four-week rhythm:

### Daily during first week

- terminal connectivity and queue status;
- rejected/duplicate events;
- incomplete records;
- support incidents;
- customer administrator feedback;
- privacy/security concerns.

### Weekly

- success metric review;
- unresolved corrections;
- adoption and worker questions;
- performance/reliability;
- scope-change requests;
- risk review;
- next-week actions.

No new major feature should be inserted into a running pilot without formal change review.

## 21. Pilot success metrics

Customer-specific metrics must be approved before go-live. Proposed baseline:

### Reliability

- no lost accepted terminal events;
- no duplicate official attendance records from replay;
- offline events synchronize correctly;
- terminal availability within agreed pilot expectation.

### Accuracy and workflow

- incomplete records are visible and resolvable;
- correction history is preserved;
- role boundaries prevent unauthorised data access;
- report totals match approved source data;
- month-end output can be reproduced.

### Operational value

- reduced manual correction/preparation effort;
- administrator can operate without BSS performing routine actions;
- workers understand clocking and request flows;
- agreed support issues are resolved within pilot targets.

### Commercial fit

- decision-maker confirms the problem is material;
- customer accepts post-pilot operating model and pricing direction;
- expansion requirements are known;
- unresolved blockers are explicit.

A pilot is not successful solely because the customer liked the interface.

## 22. Pilot stop and rollback conditions

Pause or stop the pilot when:

- tenant isolation or unauthorised access is suspected;
- accepted attendance events are lost or corrupted;
- backup/restore capability is unavailable during a critical incident;
- hardware creates an electrical/physical safety risk;
- customer uses the system outside the approved legal purpose;
- required privacy documentation becomes invalid or withdrawn;
- the customer requests prohibited biometric/GPS use;
- BSS cannot provide the agreed minimum support;
- the approved pilot scope is materially changed without review.

Document the decision, customer communication, data state, rollback and evidence preservation.

## 23. Post-pilot review

Hold the review within five business days of pilot completion where practical.

### 23.1 Evidence pack

- agreed success metrics and results;
- incidents and resolution;
- reliability/quality findings;
- administrator and worker feedback themes;
- support effort;
- privacy/security findings;
- hardware findings;
- out-of-scope requests;
- estimated production changes;
- commercial recommendation.

### 23.2 Decision options

- `WON`: paid continuation/contract approved;
- `EXTEND`: limited extension with specific unresolved objective;
- `NURTURE`: value exists but timing/budget/readiness is later;
- `LOST`: customer does not continue;
- `STOP FOR RISK`: BSS does not continue due to unacceptable risk.

An extension must not be used to avoid a commercial decision indefinitely.

### 23.3 Loss reasons

Use one primary reason and optional secondary reason:

- no material problem;
- out-of-scope requirement;
- price/budget;
- timing;
- competitor/current system;
- internal customer priority;
- privacy/legal refusal;
- technical/site incompatibility;
- no authority/sponsor;
- BSS readiness/capacity;
- trust/reference requirement;
- other documented reason.

## 24. Metrics for BSS management

Track monthly, with small-sample caution:

- new target companies;
- contacted companies;
- positive response rate;
- discovery meetings;
- qualified opportunities;
- demos completed;
- pilot candidates;
- offers sent;
- pilots approved;
- live pilots;
- won/lost decisions;
- median days per stage;
- overdue next actions;
- top loss reasons;
- expected pilot capacity for next 90 days.

Do not use the number of raw leads as the primary success metric. Focus on qualified progress and learning.

## 25. Capacity control

Before approving a new pilot, confirm BSS capacity for:

- customer communication;
- technical onboarding;
- hardware preparation/installation;
- privacy/legal coordination;
- training;
- first-week monitoring;
- incident response;
- post-pilot analysis.

Maintain a maximum number of simultaneous pilots until real effort is measured. The initial safe default is one live pilot at a time.

## 26. Change request control

Every customer request is classified as:

- configuration;
- existing frozen MVP feature;
- defect;
- security/privacy/compliance requirement;
- future roadmap request;
- customer-specific integration;
- rejected/out-of-scope request.

Record:

- business reason;
- number of customers requesting it;
- urgency;
- revenue impact;
- product impact;
- security/privacy impact;
- hardware/API impact;
- estimate and dependency;
- Product Owner decision.

Sales cannot commit a roadmap item without an approved product decision and delivery evidence.

## 27. Fictional workflow dry run

This example contains no real company or personal data.

| Field | Fictional value |
|---|---|
| Opportunity ID | `DEMO-0001` |
| Company | `Primjer Proizvodnja d.o.o. (fictional)` |
| Stage | `QUALIFIED` |
| Workers | 42 |
| Locations | 1 |
| Current process | spreadsheet + manual corrections |
| Main pain | 10 hours/month preparing records |
| Pilot scope | 20 workers, 1 terminal, 4 weeks |
| Qualification score | 17/20 |
| Hard blockers | none identified; privacy documents open |
| Next action | controlled demo with director and administrator |
| Next date | fictional test date |
| Live status | `NO-GO` until all evidence gates pass |

Dry-run path:

1. `LEAD_CAPTURED`: public business source recorded.
2. `CONTACTED`: fictional outreach template used.
3. `DISCOVERY_SCHEDULED`: owner and date assigned.
4. `QUALIFIED`: score 17, decision-maker engaged.
5. `DEMO_COMPLETED`: Preview clearly labelled.
6. `PILOT_CANDIDATE`: one-site/one-terminal scope.
7. `OFFER_SENT`: fictional pricing placeholder, not approved externally.
8. `PILOT_APPROVED`: blocked in dry run because no signed customer documents.
9. Result: workflow correctly prevents transition to live data.

This proves process logic only. It does not prove commercial readiness or customer demand.

## 28. Evidence index

| Evidence ID | Required evidence | Status |
|---|---|---|
| `SALES-001` | approved ICP and disqualification rules | `OPEN` |
| `SALES-002` | approved first-contact message | `OPEN` |
| `SALES-003` | discovery script dry run | `OPEN` |
| `SALES-004` | controlled demo script dry run | `OPEN` |
| `SALES-005` | approved claim/truth matrix | `OPEN` |
| `SALES-006` | approved pricing and discount authority | `OPEN` |
| `SALES-007` | customer-specific offer template | `OPEN` |
| `SALES-008` | private CRM/tool approved | `OPEN` |
| `SALES-009` | fictional opportunity dry run recorded | `PARTIAL` |
| `SALES-010` | sales-to-onboarding handoff rehearsal | `OPEN` |
| `SALES-011` | onboarding kickoff template approved | `OPEN` |
| `SALES-012` | final go/no-go ownership approved | `OPEN` |
| `SALES-013` | post-pilot review template approved | `OPEN` |
| `SALES-014` | Product Owner approval for external messaging | `OPEN` |

## 29. Definition of done for issue #68

Issue `#68` may close only when:

- this operating document is merged and approved;
- the Product Owner approves ICP, messaging and pricing authority;
- private lead-record tooling is selected and access controlled;
- discovery and demo scripts are tested using fictional data;
- a fictional opportunity passes through the entire process without bypassing gates;
- offer, handoff, onboarding and post-pilot templates are available;
- BSS OS evidence links are used in go/no-go decisions;
- no real prospect personal data are committed to the repository.

Merging this document does not mean sales execution, pilot demand or customer onboarding is complete.