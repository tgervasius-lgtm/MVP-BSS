# BSS Legal Operations Template Pack

| Field | Value |
|---|---|
| Status | `PROPOSED / NOT LEGALLY EXECUTED` |
| Version | `0.1` |
| Owner | BSS Product Owner + appointed privacy owner |
| Applies to | First Croatian pilot and later customer onboarding |
| Source baseline | `GDPR_DATA_GOVERNANCE_BASELINE.md` |
| Pilot gate | No real worker data before required documents are approved and evidenced |
| External review | Required before any customer-facing document is signed |

## 1. Purpose and use rules

This pack converts the BSS privacy baseline into operational working templates. It is not a signed contract, final legal advice, completed DPIA or proof of compliance.

Use rules:

1. Copy the required template for each customer and assign a unique document ID.
2. Replace every placeholder in square brackets.
3. Record owner, reviewer, approval date, version and evidence location.
4. Never mark a document `APPROVED` only because a draft exists.
5. Customer-controller decisions must be approved by the customer, not silently chosen by BSS.
6. Final customer-facing documents require review by a qualified Croatian privacy/employment-law professional.
7. Store signed copies in an access-controlled legal evidence location, not in the public repository.
8. The repository contains only templates and non-secret evidence references.

## 2. Document status language

| Status | Meaning |
|---|---|
| `TEMPLATE` | Blank working form; not customer-specific |
| `DRAFT` | Customer-specific but incomplete |
| `LEGAL REVIEW` | Sent to qualified reviewer |
| `CUSTOMER REVIEW` | Sent to customer controller |
| `APPROVED` | Approved by named accountable parties |
| `SIGNED` | Executed document exists in secure evidence storage |
| `SUPERSEDED` | Replaced by a later version |
| `EXPIRED` | No longer valid and renewal is required |

## 3. Responsibility map

| Decision / task | Customer controller | BSS processor | Legal/privacy reviewer |
|---|---:|---:|---:|
| Define employment-record purposes | Accountable | Consulted | Reviews |
| Select lawful bases | Accountable | Provides processing facts | Reviews |
| Approve worker privacy notice | Accountable | Provides service facts | Reviews |
| Approve customer DPIA | Accountable | Assists with technical facts and mitigations | Reviews |
| Define statutory retention | Accountable | Implements documented configuration | Reviews |
| Select BSS subprocessors | Informed/authorises under DPA model | Accountable | Reviews transfer terms |
| Operate security controls | Informed | Accountable | May review evidence |
| Handle worker request | Accountable | Assists on documented request | Reviews difficult cases |
| Notify suspected breach to customer | Informed | Accountable without undue delay | May assist |
| Notify AZOP / affected people | Accountable | Assists | Advises |
| Approve deletion after termination | Accountable | Executes and evidences | Reviews legal hold conflict |

---

# TEMPLATE A — DPA Preparation and Article 28 Schedule

## A1. Document control

| Field | Value |
|---|---|
| Document ID | `[DPA-CUSTOMER-YYYY-NNN]` |
| Customer legal name | `[ ]` |
| BSS legal name | `[BSSProject d.o.o. / final registered name]` |
| Version | `[ ]` |
| Status | `DRAFT` |
| Customer owner | `[name / role]` |
| BSS owner | `[name / role]` |
| Legal reviewer | `[name / organisation]` |
| Effective date | `[ ]` |
| Expiry/review date | `[ ]` |
| Signed evidence reference | `[secure location ID only]` |

## A2. Core processing schedule

| Required item | Customer/BSS entry |
|---|---|
| Subject matter | Hosting and operation of the BSS work-time, attendance, leave, correction and reporting service |
| Duration | `[pilot term / subscription term + controlled offboarding period]` |
| Nature of processing | Collection, storage, organisation, calculation, display, export, audit, backup, support and deletion on instructions |
| Purpose | `[customer-approved employment-time purposes]` |
| Data subjects | Employees, temporary workers where applicable, authorised customer users |
| Personal-data categories | Identity/workforce data, work-time events, leave/absence classifications, account/session data, audit records, support metadata |
| Special-category data | `Not intended`; absence data must not include diagnosis or free-text medical details |
| Processing locations | `[EU region, provider, backup region, support access locations]` |
| Customer instructions | Agreement, configuration, support tickets and named authorised contacts |

## A3. Mandatory DPA clause checklist

Mark each line only after the final contract text contains the obligation.

| ID | Requirement | Status | Evidence / clause |
|---|---|---|---|
| DPA-01 | Process only on documented controller instructions | `OPEN` | `[ ]` |
| DPA-02 | Confidentiality obligations for authorised personnel | `OPEN` | `[ ]` |
| DPA-03 | Appropriate technical and organisational measures | `OPEN` | `[ ]` |
| DPA-04 | Prior authorisation model for subprocessors | `OPEN` | `[ ]` |
| DPA-05 | Equivalent data-protection duties for subprocessors | `OPEN` | `[ ]` |
| DPA-06 | Assistance with data-subject rights | `OPEN` | `[ ]` |
| DPA-07 | Assistance with security, breach, DPIA and consultation duties | `OPEN` | `[ ]` |
| DPA-08 | Return/delete data at service end, subject to legal retention | `OPEN` | `[ ]` |
| DPA-09 | Provide information and permit proportionate audits | `OPEN` | `[ ]` |
| DPA-10 | Notify controller if an instruction appears unlawful | `OPEN` | `[ ]` |
| DPA-11 | International-transfer safeguards | `OPEN` | `[ ]` |
| DPA-12 | Incident contacts and notification route | `OPEN` | `[ ]` |
| DPA-13 | Retention, legal hold and backup expiry | `OPEN` | `[ ]` |
| DPA-14 | Liability and order-of-precedence terms reviewed | `OPEN` | `[ ]` |

## A4. Technical and organisational measures annex

| Domain | Minimum BSS statement | Customer-specific evidence |
|---|---|---|
| Tenant isolation | PostgreSQL tenant context, FORCE RLS and cross-tenant tests | `[test/run reference]` |
| Access control | Server-side RBAC, department/self scope and least privilege | `[matrix/review reference]` |
| Authentication | Secure sessions, rotation, revocation and no plaintext tokens | `[evidence]` |
| RFID | UID hash/mask; no plaintext UID in normal UI/logs | `[evidence]` |
| Encryption | TLS in transit, encrypted managed storage/backups, managed secrets | `[provider evidence]` |
| Logging | Structured, redacted logs and access/audit events | `[evidence]` |
| Backup | Scheduled encrypted backup and tested restore/PITR | `[drill evidence]` |
| Availability | Monitoring, health checks, incident escalation and recovery plan | `[evidence]` |
| Secure development | Protected `main`, CI, dependency/security scanning and review | `[GitHub evidence]` |
| Deletion | Tenant export/deletion workflow and backup-expiry tracking | `[test evidence]` |

## A5. Approval gate

- [ ] Customer purposes and lawful bases approved.
- [ ] Processing schedule matches actual product and providers.
- [ ] Subprocessor register attached.
- [ ] TOM evidence reviewed.
- [ ] Retention schedule approved.
- [ ] International-transfer position reviewed.
- [ ] Incident notification route tested.
- [ ] Final legal review completed.
- [ ] Both parties signed.

---

# TEMPLATE B — Records of Processing Activities (ROPA)

## B1. BSS as processor — customer service entry

| Field | Entry |
|---|---|
| ROPA ID | `[ROPA-PROC-CUSTOMER-NNN]` |
| Controller | `[customer name/contact]` |
| Processor | `[BSS legal name/contact]` |
| DPO/privacy contact | `[ ]` |
| Categories of processing | Workforce setup, attendance, leave, corrections, reports, audit, support, backups and deletion |
| Data-subject categories | Employees, other workers where authorised, customer users |
| Data categories | `[use approved inventory]` |
| Subprocessors | `[register version/reference]` |
| Third-country transfers | `[none / safeguards and destination]` |
| Security measures | `[TOM annex reference]` |
| Retention / deletion instruction | `[schedule reference]` |
| Contract/DPA | `[signed evidence ID]` |
| Last review | `[ ]` |

## B2. BSS as controller — own business operations

Create separate rows for each BSS-controlled purpose.

| Field | Example / placeholder |
|---|---|
| ROPA ID | `[ROPA-CTRL-NNN]` |
| Purpose | Customer administration / billing / support contacts / security administration |
| Data subjects | Customer contacts, BSS users, suppliers, candidates or employees as applicable |
| Data categories | Business contact data, contract/billing data, support correspondence, security metadata |
| Lawful basis | `[contract / legal obligation / legitimate interest — legal review]` |
| Recipients | `[accounting, bank, provider, adviser]` |
| Transfer safeguards | `[ ]` |
| Retention | `[ ]` |
| TOMs | `[ ]` |
| Owner | `[ ]` |
| Last review | `[ ]` |

## B3. ROPA review checklist

- [ ] Every production processing activity appears in a ROPA.
- [ ] Processor and controller activities are separated.
- [ ] Provider and region changes are reflected.
- [ ] Retention periods match implemented jobs/configuration.
- [ ] ROPA references current DPA/DPIA and subprocessor versions.
- [ ] Review occurs at least annually and after material change.

---

# TEMPLATE C — Customer-Specific DPIA Worksheet

## C1. Control

| Field | Value |
|---|---|
| DPIA ID | `[DPIA-CUSTOMER-YYYY-NNN]` |
| Customer/controller | `[ ]` |
| Processing owner | `[customer accountable role]` |
| BSS contributor | `[ ]` |
| DPO/privacy adviser | `[ ]` |
| Status | `DRAFT` |
| Planned start date | `[ ]` |
| Approval date | `[ ]` |
| Next review | `[ ]` |

## C2. Why DPIA is being performed

For the first Croatian pilot, treat the DPIA as a mandatory release gate because the service processes employee data through a system used to track work-time activity. Record the customer-specific reasoning; do not reuse a generic conclusion without review.

## C3. Processing description

Document:

- business purpose and legal obligation;
- one company, location, terminal and worker population;
- worker onboarding and identifier assignment;
- RFID clock-in/out flow;
- leave, corrections, review and reporting;
- administrator, manager, accountant and worker access;
- storage, backups, logs, exports and support access;
- data flows to every provider/subprocessor;
- retention and offboarding;
- functions explicitly excluded: biometrics, GPS/geofencing, payroll calculation and automated disciplinary decisions.

Attach a current data-flow diagram and provider list.

## C4. Necessity and proportionality

| Question | Customer answer / evidence |
|---|---|
| What legal/business need is met? | `[ ]` |
| Why are the selected data fields necessary? | `[ ]` |
| Can any field be removed, shortened or pseudonymised? | `[ ]` |
| Why is RFID appropriate compared with less intrusive alternatives? | `[ ]` |
| How are workers informed? | `[ ]` |
| How can an inaccurate event be corrected without destroying the original trace? | `[ ]` |
| How are access rights limited? | `[ ]` |
| How is human review preserved? | `[ ]` |
| How are retention and deletion controlled? | `[ ]` |

## C5. Risk register

Score likelihood and impact from 1 to 5 before and after mitigation.

| Risk | Harm scenario | Initial L/I | Controls | Residual L/I | Owner | Accepted? |
|---|---|---:|---|---:|---|---|
| Cross-tenant access | One customer sees another customer’s workers | `[ ]` | FORCE RLS, scoped API, negative tests | `[ ]` | BSS | `[ ]` |
| Excess internal access | Manager/accountant sees unauthorised data | `[ ]` | RBAC, department scope, audit | `[ ]` | Both | `[ ]` |
| Incorrect work record | Missed/duplicate event affects employee rights | `[ ]` | Idempotency, offline queue, correction workflow | `[ ]` | Both | `[ ]` |
| RFID misuse | Card/identifier used or exposed improperly | `[ ]` | Hash/mask, block/reassign history | `[ ]` | Both | `[ ]` |
| Overcollection | Health or identity data collected without need | `[ ]` | Restricted schema, no diagnosis/free text | `[ ]` | Customer | `[ ]` |
| Function creep | Data used for hidden productivity monitoring | `[ ]` | Frozen scope, notice, change control | `[ ]` | Customer | `[ ]` |
| Security breach | Personal data exposed or unavailable | `[ ]` | Encryption, secrets, logging, backup, incident SOP | `[ ]` | BSS | `[ ]` |
| Excess retention | Records retained indefinitely | `[ ]` | Approved schedule, deletion jobs, legal holds | `[ ]` | Both | `[ ]` |
| Support access | BSS staff access data without valid need | `[ ]` | Named access, ticket, time limit, audit | `[ ]` | BSS | `[ ]` |
| Automated adverse decision | Flag produces discipline without context | `[ ]` | Human review, no automated sanction | `[ ]` | Customer | `[ ]` |

## C6. Consultation and approval

- [ ] Workers/representatives consulted where appropriate and outcome recorded.
- [ ] DPO/privacy adviser opinion recorded.
- [ ] BSS technical facts confirmed.
- [ ] Residual high risks assessed.
- [ ] Prior consultation with AZOP considered where residual high risk cannot be sufficiently reduced.
- [ ] Customer controller signed approval before live data.

---

# TEMPLATE D — Worker Privacy Notice (Croatian Draft)

> This is a template. The employer/controller must adapt and approve it before distribution.

## Tko obrađuje vaše podatke

Voditelj obrade je `[puni naziv poslodavca, adresa i kontakt]`. Kontakt za privatnost/službenika za zaštitu podataka je `[kontakt]`.

BSS `[puni pravni naziv i kontakt]` pruža tehničku uslugu evidencije radnog vremena kao izvršitelj obrade prema uputama poslodavca.

## Zašto se podaci obrađuju

Podaci se obrađuju radi `[točna svrha: vođenje zakonske evidencije radnog vremena, upravljanje odobrenim odsutnostima, ispravcima i izvještajima]`.

Pravna osnova je `[odredi poslodavac uz pravni review; za obveznu evidenciju tipično pravna obveza i radnopravni odnos, ne zadana privola zaposlenika]`.

## Koji se podaci obrađuju

Mogu uključivati:

- ime i prezime te interni radnički identifikator;
- odjel, radno mjesto, smjenu i status;
- vrijeme dolaska/odlaska i izvedene dnevne/mjesečne zbrojeve;
- odobrene kategorije odsutnosti potrebne za evidenciju;
- zahtjeve za korekciju i odluke ovlaštenih osoba;
- maskirani/hashirani RFID identifikator;
- korisničke, sigurnosne i audit zapise potrebne za zaštitu sustava.

Sustav nije namijenjen pohrani medicinske dijagnoze, kopija osobnih dokumenata, bankovnih podataka, biometrije ni GPS lokacije.

## Tko ima pristup

Pristup imaju samo ovlaštene osobe poslodavca prema ulozi i opsegu te ovlaštene BSS osobe kada je to potrebno za ugovorenu podršku i sigurnost. Podizvršitelji i lokacije obrade navedeni su u `[link/interna lokacija]`.

## Koliko dugo se podaci čuvaju

Evidencije se čuvaju prema primjenjivim radnopravnim rokovima i odobrenom rasporedu čuvanja. Za hrvatsku evidenciju radnog vremena polazni zakonski minimum je najmanje šest godina, uz dulje čuvanje kada postoji relevantan spor ili druga zakonska obveza. Ostale klase podataka imaju zasebne, kraće rokove gdje je moguće.

## Vaša prava

Možete zatražiti pristup, ispravak, ograničenje ili druga primjenjiva prava kontaktiranjem `[poslodavac kontakt]`. Brisanje nije moguće kada poslodavac mora podatak čuvati zbog zakonske obveze ili pravnog zahtjeva; razlog će biti objašnjen.

Imate pravo podnijeti pritužbu Agenciji za zaštitu osobnih podataka.

## Automatizirane odluke

BSS može tehnički označiti kašnjenje, nepotpun zapis ili drugo odstupanje. Takva oznaka sama po sebi nije disciplinska odluka. Odluku koja utječe na vaš radni odnos donosi ovlaštena osoba nakon pregleda konteksta.

## Promjene obavijesti

Verzija: `[ ]`  Datum primjene: `[ ]`  Prethodna verzija: `[ ]`.

---

# TEMPLATE E — Data-Subject Request SOP and Log

## E1. Intake record

| Field | Entry |
|---|---|
| Request ID | `[DSR-YYYY-NNN]` |
| Received date/time | `[ ]` |
| Channel | `[ ]` |
| Requester | `[ ]` |
| Customer/controller | `[ ]` |
| Request type | Access / correction / restriction / objection / deletion / portability / other |
| Identity-verification method | `[minimum necessary]` |
| Deadline owner | `[customer]` |
| BSS task owner | `[ ]` |
| Legal hold / retention conflict | `[ ]` |
| Status | `OPEN` |

## E2. Workflow

1. Forward any request received by BSS to the controller contact without undue delay.
2. Do not disclose data directly unless the controller has documented that authority.
3. Verify requester identity proportionately; do not collect unnecessary identity-document copies.
4. Preserve relevant data while the request is assessed.
5. Identify tenant, worker, date range, exports, audit and backup implications.
6. Produce scoped data through an authorised, logged process.
7. Redact third-party data and security-sensitive information as instructed.
8. Record controller decision where a request is refused or limited.
9. Send result through an approved secure channel.
10. Close with evidence, timestamps and approvers.

## E3. Completion log

| Step | Owner | Completed | Evidence |
|---|---|---|---|
| Controller notified | BSS | `[ ]` | `[ ]` |
| Identity confirmed | Customer | `[ ]` | `[ ]` |
| Scope approved | Customer | `[ ]` | `[ ]` |
| Search/export executed | BSS | `[ ]` | `[ ]` |
| Legal-retention conflict assessed | Customer/legal | `[ ]` | `[ ]` |
| Response delivered | Customer | `[ ]` | `[ ]` |
| Technical cleanup completed | BSS | `[ ]` | `[ ]` |
| Case closed | Both | `[ ]` | `[ ]` |

---

# TEMPLATE F — Personal-Data Breach and Security Incident Pack

## F1. Initial incident record

| Field | Entry |
|---|---|
| Incident ID | `[INC-YYYY-NNN]` |
| Detected at | `[UTC/local]` |
| Detected by | `[ ]` |
| Affected environment | Preview / staging / production |
| Affected customer/tenant | `[ ]` |
| Data involved | `[known / suspected]` |
| Confidentiality/integrity/availability impact | `[ ]` |
| Containment status | `[ ]` |
| BSS incident commander | `[ ]` |
| Controller contact notified at | `[ ]` |
| Evidence location | `[secure ID]` |

## F2. Immediate BSS actions

- [ ] Preserve logs, request IDs, audit events and relevant snapshots.
- [ ] Prevent evidence alteration while containing the event.
- [ ] Revoke affected sessions/keys/credentials where appropriate.
- [ ] Identify affected tenants before broad notification.
- [ ] Notify the customer controller without undue delay using the agreed channel.
- [ ] State what is known, unknown, being investigated and next update time.
- [ ] Do not publicly speculate or admit unsupported facts.
- [ ] Continue documented updates until containment and assessment are complete.

## F3. Processor-to-controller notification fields

Include:

- nature and timeline of the incident;
- affected service, tenant, data categories and approximate people/records where known;
- likely consequences based on current facts;
- measures taken/proposed;
- contact point;
- evidence and limitations;
- next update time.

The customer controller remains accountable for deciding whether notification to AZOP or affected individuals is required. GDPR supervisory-authority notification is generally required without undue delay and, where feasible, within 72 hours after the controller becomes aware, unless the breach is unlikely to result in risk.

## F4. Post-incident review

| Question | Answer |
|---|---|
| Root cause | `[ ]` |
| Why controls did/did not prevent it | `[ ]` |
| Detection gap | `[ ]` |
| Customer impact | `[ ]` |
| Regulatory outcome | `[ ]` |
| Corrective actions and owners | `[ ]` |
| Due dates | `[ ]` |
| Readiness documents updated | `[ ]` |

---

# TEMPLATE G — Subprocessor Register and Change Workflow

## G1. Register

| Provider | Service | Legal entity | Region | Data categories | Transfer position | DPA/SCC evidence | Start date | Status |
|---|---|---|---|---|---|---|---|---|
| `[Render or selected host]` | Backend/database | `[ ]` | Frankfurt/EU `[verify]` | Application and operational data | `[ ]` | `[ ]` | `[ ]` | `PROPOSED` |
| Cloudflare | DNS/TLS/frontend/edge as configured | `[ ]` | `[ ]` | Network and frontend request metadata | `[ ]` | `[ ]` | `[ ]` | `PROPOSED` |
| `[Sentry/monitoring]` | Error monitoring | `[ ]` | `[ ]` | Redacted diagnostics | `[ ]` | `[ ]` | `[ ]` | `PROPOSED` |
| `[email provider]` | Transactional email | `[ ]` | `[ ]` | Account/contact delivery data | `[ ]` | `[ ]` | `[ ]` | `PROPOSED` |
| `[backup provider]` | Secondary encrypted backup | `[ ]` | `[ ]` | Encrypted backup data | `[ ]` | `[ ]` | `[ ]` | `PROPOSED` |

## G2. Change process

1. Open provider-change assessment before technical adoption.
2. Review necessity, data categories, location, DPA, subprocessors, security and exit plan.
3. Complete transfer assessment/safeguards where relevant.
4. Update architecture, DPA schedule, ROPA, DPIA and privacy notice where material.
5. Provide customer notice/objection window according to the signed DPA.
6. Do not send production personal data before approval.
7. Record approval and effective date.

---

# TEMPLATE H — Tenant Offboarding and Deletion Certificate

## H1. Offboarding instruction

| Field | Entry |
|---|---|
| Offboarding ID | `[OFF-YYYY-NNN]` |
| Customer | `[ ]` |
| Contract end | `[ ]` |
| Authorised controller instruction | `[name/date/evidence]` |
| Export scope | `[ ]` |
| Legal hold | None / details |
| Deletion date | `[ ]` |
| Backup expiry target | `[ ]` |
| BSS owner | `[ ]` |

## H2. Required sequence

- [ ] Freeze new customer writes at agreed time.
- [ ] Revoke user and terminal access.
- [ ] Generate approved final export with checksum and delivery evidence.
- [ ] Confirm customer receipt before destructive deletion where required.
- [ ] Identify legal hold or statutory retention instruction.
- [ ] Delete active tenant data according to approved instruction.
- [ ] Delete/revoke application secrets, RFID assignments and sessions.
- [ ] Remove tenant data from support workspaces and temporary files.
- [ ] Mark backups for expiry through the documented retention cycle.
- [ ] Prevent deleted tenant restoration into production without controlled legal/incident approval.
- [ ] Complete verification query/test.
- [ ] Issue certificate with limitations and backup-expiry date.

## H3. Certificate

> BSS confirms that active production data for tenant `[ID/name]` was exported and/or deleted according to instruction `[reference]` on `[date/time]`. Remaining encrypted backup copies, if any, are inaccessible for ordinary service use and are scheduled to expire by `[date]`, subject to documented legal hold `[none/details]`.

Approver: `[ ]`  Reviewer: `[ ]`  Evidence ID: `[ ]`.

---

# TEMPLATE I — Legal Review and Live-Pilot Gate

## I1. Required evidence index

| Evidence ID | Document / proof | Required status before live data |
|---|---|---|
| LEG-001 | Signed pilot/service agreement | `SIGNED` |
| LEG-002 | Signed DPA and schedules | `SIGNED` |
| LEG-003 | Customer-approved DPIA | `APPROVED` |
| LEG-004 | Worker privacy notice | `APPROVED / DISTRIBUTED` |
| LEG-005 | Customer controller ROPA entry | `CONFIRMED` |
| LEG-006 | BSS processor ROPA entry | `APPROVED` |
| LEG-007 | Subprocessor register | `APPROVED` |
| LEG-008 | Retention/legal-hold schedule | `APPROVED` |
| LEG-009 | Data-subject request dry run | `PASS` |
| LEG-010 | Breach tabletop exercise | `PASS` |
| LEG-011 | Tenant offboarding dry run | `PASS` |
| LEG-012 | External Croatian legal/privacy review | `COMPLETE` |

## I2. Live-pilot decision

| Gate | Owner | Status | Evidence |
|---|---|---|---|
| Software baseline | BSS | `BLOCKED by #55` | `[ ]` |
| Infrastructure/provider | BSS | `OPEN` | `[ ]` |
| Hardware acceptance | BSS/customer | `OPEN` | `[ ]` |
| DPA | Both | `OPEN` | `[ ]` |
| DPIA | Customer | `OPEN` | `[ ]` |
| Worker transparency | Customer | `OPEN` | `[ ]` |
| Rights procedure | Both | `OPEN` | `[ ]` |
| Incident procedure | Both | `OPEN` | `[ ]` |
| Dry run | Both | `OPEN` | `[ ]` |

Decision: `NO-GO` until every applicable critical gate is proven.

---

# Tabletop Dry-Run Scenario

Before live use, run one documented exercise with test identities:

1. Create a test tenant with 10 synthetic workers.
2. Distribute the draft worker notice internally as a test artefact.
3. Process attendance, leave, correction and report flows.
4. Submit one access/correction request and complete the DSR workflow.
5. Simulate one cross-tenant access attempt and record denial evidence.
6. Simulate a lost admin session/credential and complete incident intake and revocation.
7. Prepare a controller breach notification update without sending it externally.
8. Export and offboard the test tenant.
9. Verify active deletion and document backup expiry.
10. Record findings, owners and closure dates.

Dry-run result: `[PASS / FAIL]`  Date: `[ ]`  Evidence ID: `[ ]`.

---

# Official reference set

Use current official versions during legal review:

- GDPR, especially Articles 13/14, 28, 30, 32–36 and data-subject rights: https://eur-lex.europa.eu/eli/reg/2016/679/oj
- EDPB Guidelines 07/2020 on controller and processor concepts: https://www.edpb.europa.eu/our-work-tools/our-documents/guidelines/guidelines-072020-concepts-controller-and-processor-gdpr_en
- AZOP list of processing operations requiring DPIA, including employee monitoring systems: https://azop.hr/odluka-o-uspostavi-i-javnoj-objavi-popisa-vrsta-postupaka-obrade-koje-podlijezu-zahtjevu-za-procjenu-ucinka-na-zastitu-podataka/
- AZOP DPIA guidance: https://azop.hr/procjena-ucinka-na-zastitu-podataka-eng-data-protection-impact-assessment-dpia/
- Croatian worker-record regulation, NN 55/2024: https://narodne-novine.nn.hr/clanci/sluzbeni/2024_05_55_969.html
- AZOP guidance on employee-data lawful basis and transparency: https://azop.hr/obrada-osobnih-podataka-radnika-u-kontekstu-zaposljavanja-moze-li-privola-biti-pravni-temelj-za-obradu-osobnih-podataka-zaposlenika/

Last source review: 2026-08-05.

## Final warning

Completion of this template pack does not make BSS production-ready or legally approved. Only executed customer-specific documents, implemented technical controls and traceable evidence can close the live-pilot gates.