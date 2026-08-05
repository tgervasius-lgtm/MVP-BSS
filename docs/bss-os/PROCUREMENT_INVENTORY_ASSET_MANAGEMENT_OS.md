# BSS Procurement, Inventory & Asset Management Operating System

Status: `PROPOSED v0.1 / HARDWARE VALIDATION AND FOUNDER APPROVAL REQUIRED`

Owner: BSS founders

Related issues: #91, #60, #57, #77, #85, #87 and #89

## 1. Purpose

This document defines how BSS requests, approves, purchases, receives, inspects, stores, identifies, assembles, configures, assigns, deploys, repairs, replaces, returns and retires physical assets and related controlled items.

It covers:

- prototype and production components;
- completed BSS terminals;
- spare and replacement units;
- tools, fixtures and test equipment;
- RFID cards or tags owned by BSS where applicable;
- packaging and installation materials;
- recoverable customer-deployed equipment;
- software licenses or device entitlements tied to a physical asset.

The objectives are to prevent:

- ordering an incorrect or incompatible component;
- losing track of exact model, revision, lot or serial number;
- mixing prototype, rejected and accepted stock;
- deploying a terminal without a known configuration;
- storing the only spare unit at an unknown location;
- paying for received goods that failed inspection;
- replacing a device without preserving custody and audit evidence;
- losing BSS-owned equipment at a customer location;
- using a component that merely looks similar but is not verified;
- discarding equipment without data removal or disposal evidence;
- depending on one founder or supplier to understand the physical estate.

This is operational governance. It is not product-safety, electrical, certification, customs, tax, accounting, warranty, environmental or waste-disposal advice.

Hardware remains `PARTIAL` until issue #60 and the applicable build, test and acceptance evidence are complete.

## 2. Core rules

1. Exact model, revision, dimensions, interfaces, power requirements and compatibility must be verified before a part is approved.
2. A similar-looking component is not automatically an approved substitute.
3. `ORDERED`, `RECEIVED`, `INSPECTED`, `ACCEPTED` and `AVAILABLE` are different states.
4. Received goods are not paid as accepted goods when inspection or contractual acceptance is still open.
5. Prototype stock, customer-ready stock and rejected stock must be distinguishable.
6. Every finished terminal receives a BSS-controlled asset ID before deployment.
7. Every deployed terminal has a configuration record, custody record and return path.
8. Secrets, production credentials and customer data are never stored in the public asset register.
9. Every inventory movement has a source location, destination location, owner, date and reason.
10. Every substitute part requires a documented compatibility decision and, where necessary, retesting.
11. A terminal is not production-ready merely because it powers on or has been installed.
12. Hardware source files, BOM versions, drawings and build evidence remain in BSS-controlled systems.
13. Real supplier prices, customer addresses, device secrets and personal data remain outside the public repository.
14. Quantity, reorder and warranty thresholds remain `OPEN` until real operational data exists.

## 3. Status language

### 3.1 Procurement statuses

| Status | Meaning |
|---|---|
| `REQUESTED` | A need has been recorded but not approved. |
| `APPROVED` | Purchase is authorized under finance/founder controls. |
| `QUOTED` | One or more supplier quotes exist. |
| `ORDERED` | A binding order or commitment exists. |
| `PARTIALLY RECEIVED` | Some ordered quantity arrived. |
| `RECEIVED` | Physical receipt recorded; inspection may be open. |
| `INSPECTION OPEN` | Quantity, model, condition or evidence is being checked. |
| `ACCEPTED` | Receipt passed required checks. |
| `CONDITIONAL ACCEPTANCE` | Non-critical issue remains with owner and due date. |
| `REJECTED` | Receipt failed required checks. |
| `RETURN AUTHORIZED` | Supplier return or RMA has been approved. |
| `RETURNED` | Item was returned with evidence. |
| `CANCELLED` | Order or request was cancelled. |
| `DISPUTED` | Quantity, quality, price or obligation is disputed. |

### 3.2 Inventory and asset statuses

| Status | Meaning |
|---|---|
| `AVAILABLE` | Accepted and free for approved use. |
| `RESERVED` | Allocated to a named build, pilot or customer. |
| `IN ASSEMBLY` | Assigned to an active assembly process. |
| `IN TEST` | Under verification; not available for deployment. |
| `ACCEPTED UNIT` | Finished asset passed the defined acceptance checks. |
| `DEPLOYED` | In approved use at a controlled location. |
| `SPARE` | Accepted and reserved for replacement or continuity. |
| `QUARANTINE` | Isolated because identity, quality or safety is uncertain. |
| `IN REPAIR` | Under diagnosed repair or rework. |
| `AWAITING PART` | Repair is blocked by a required component. |
| `LOST` | Location or custody cannot be confirmed. |
| `STOLEN` | Reported stolen under the applicable process. |
| `DAMAGED` | Damage recorded; assessment open. |
| `RETIRED` | Removed from active use. |
| `DISPOSAL PENDING` | Data wipe and disposal evidence not complete. |
| `DISPOSED` | Approved disposal or recycling completed. |

An asset may not be marked `AVAILABLE`, `SPARE` or `DEPLOYED` while it is also `QUARANTINE`, `IN TEST` or `IN REPAIR`.

## 4. Asset classes

| Code | Asset class | Examples |
|---|---|---|
| `COMP` | Component | Raspberry Pi, display, RFID reader, PSU, cable, buzzer |
| `MECH` | Mechanical part | enclosure, bracket, fastener, gasket |
| `PCB` | Electronic assembly | carrier board, custom PCB, wiring harness |
| `TERM` | Finished terminal | complete BSS attendance terminal |
| `SPARE` | Replacement unit | accepted replacement terminal or subassembly |
| `TOOL` | Tool | drill, torque driver, crimp tool |
| `FIXTURE` | Fixture | assembly jig, test mount, RFID test fixture |
| `TEST` | Test equipment | multimeter, power meter, network tester |
| `INSTALL` | Installation item | wall anchors, mounting plate, cable channel |
| `PACK` | Packaging | transit case, foam insert, labels |
| `CARD` | Credential media | BSS-owned RFID card/tag where applicable |
| `LIC` | Asset-bound entitlement | device license or managed service entitlement |

## 5. Procurement request

Every proposed purchase begins with a procurement request.

### 5.1 Procurement request fields

| Field | Required content |
|---|---|
| Request ID | Internal non-sensitive ID |
| Requested by | Named owner |
| Request date | Date |
| Need-by date | Required date and reason |
| Category | Asset class / finance category |
| Intended use | Prototype, test, pilot, spare, customer deployment, tool |
| Exact item specification | Manufacturer, model, revision and technical requirements |
| Quantity | Requested quantity |
| Substitute allowed | No / only after review / approved alternatives |
| Compatibility dependency | Related BOM, drawing, terminal or software version |
| Estimated cost | Private finance record reference |
| Budget/commitment reference | Finance OS reference |
| Supplier candidates | Private vendor record references |
| Risk tier | Low, moderate, high or critical |
| Acceptance criteria | What must pass on receipt |
| Owner | Accountable person |
| Backup owner | Required for critical items |
| Approval decision | Founder/finance decision ID |
| Status | Request status |

### 5.2 Hard blockers before order

Do not order when:

- exact model or revision is unknown;
- dimensions have not been checked against the current mechanical design;
- power or interface compatibility is unknown;
- the item would require an unapproved architecture change;
- supplier or delivery terms are unclear for a material purchase;
- there is no budget or authorized commitment;
- a cheaper-looking alternative has not been compatibility-tested;
- the required source file, license or documentation ownership is unclear;
- the requested quantity cannot be justified;
- the item is safety-critical and required professional review is missing.

## 6. Approved parts and suppliers

### 6.1 Part approval status

| Status | Meaning |
|---|---|
| `CANDIDATE` | Identified but not verified. |
| `SAMPLE ORDERED` | Sample is on order. |
| `UNDER EVALUATION` | Physical/electrical/software/mechanical verification open. |
| `APPROVED FOR PROTOTYPE` | Allowed only for prototype use. |
| `APPROVED FOR PILOT` | Passed defined pilot acceptance evidence. |
| `APPROVED FOR PRODUCTION` | Requires future production/certification governance. |
| `CONDITIONALLY APPROVED` | Limited use with explicit condition. |
| `OBSOLETE` | No longer approved for new builds. |
| `BLOCKED` | Known issue prevents use. |

### 6.2 Approved-part record

- internal part number;
- manufacturer;
- exact model;
- manufacturer part number;
- hardware revision;
- firmware compatibility;
- physical dimensions;
- electrical requirements;
- interfaces;
- environmental/storage requirements;
- approved use level;
- approved substitutes;
- prohibited substitutes;
- datasheet/source link;
- validation evidence;
- known issues;
- lifecycle/availability risk;
- owner and approval date.

### 6.3 Supplier status

Supplier approval is governed by the External Developer & Vendor Management Pack.

A supplier may be:

- `CANDIDATE`;
- `DUE DILIGENCE`;
- `APPROVED FOR SAMPLE`;
- `APPROVED FOR CATEGORY`;
- `SUSPENDED`;
- `BLOCKED`;
- `OFFBOARDED`.

Part approval and supplier approval are separate. An approved component from an unverified supplier may still be rejected.

## 7. Purchase order and delivery tracking

### 7.1 Purchase record

| Field | Required content |
|---|---|
| Purchase ID | Internal ID |
| Procurement request | Linked request |
| Supplier ID | Private vendor reference |
| Quote/SOW reference | Private evidence |
| Order date | Date |
| Ordered item | Exact model/revision |
| Ordered quantity | Quantity |
| Unit/total price | Private finance record |
| Delivery location | Private controlled location |
| Expected delivery | Date/range |
| Shipping/tracking | Private reference |
| Warranty/return terms | Private evidence |
| Required documents | Invoice, packing list, certificate, drawings, etc. |
| Acceptance criteria | Receipt checks |
| Budget/commitment ID | Finance OS link |
| Owner | Accountable person |
| Status | Order status |

### 7.2 Delivery exception triggers

Record an exception for:

- late shipment;
- partial shipment;
- model substitution;
- changed revision;
- damaged package;
- quantity mismatch;
- missing documentation;
- duplicate shipment;
- unexpected customs/fees;
- supplier bank/account request change;
- warranty terms different from quote.

## 8. Goods receipt and inspection

### 8.1 Receipt process

1. Record delivery date, package count and receiver.
2. Photograph unopened package when damage or high-value risk exists.
3. Match supplier, order and packing list.
4. Count quantity.
5. Verify manufacturer, model and revision.
6. Record serial and lot numbers where available.
7. Inspect packaging and visible condition.
8. Confirm required documents and source files.
9. Perform required dimensional, electrical or functional checks.
10. Assign accepted stock location or quarantine location.
11. Record acceptance result.
12. Link the result to the invoice/payment workflow.

### 8.2 Receipt inspection record

| Field | Required content |
|---|---|
| Receipt ID | Internal ID |
| Purchase ID | Linked order |
| Date/time | Receipt time |
| Receiver | Named person |
| Package condition | Normal/damaged/tampered |
| Item identity | Manufacturer/model/revision |
| Quantity ordered/received | Counts |
| Serial/lot | Recorded where applicable |
| Visual condition | Result |
| Dimensional check | Required/result/evidence |
| Electrical/functional check | Required/result/evidence |
| Documentation check | Complete/missing |
| Photos | Private evidence reference |
| Nonconformity | Description |
| Disposition | Accept, conditionally accept, quarantine, reject |
| Inspector | Named reviewer |
| Date approved | Date |

### 8.3 Quarantine rules

Quarantine items are:

- physically separated or clearly identified;
- unavailable for assembly or deployment;
- assigned an owner and resolution date;
- linked to supplier communication or internal investigation;
- never silently returned to available stock.

## 9. Component inventory register

### 9.1 Required fields

| Field | Required content |
|---|---|
| Internal part number | BSS identifier |
| Asset class | Component class |
| Exact item | Manufacturer/model/revision |
| Lot/serial control | Required or not |
| Quantity on hand | Physical count |
| Quantity available | Accepted and unreserved |
| Quantity reserved | Assigned to named purpose |
| Quantity in quarantine | Isolated quantity |
| Quantity in repair/rework | Quantity |
| Unit of measure | Piece, metre, set, etc. |
| Storage location | Private location ID |
| Storage requirement | ESD, dry, temperature, locked, etc. |
| Reorder trigger | `OPEN` until approved |
| Target stock | `OPEN` until approved |
| Lead time | Actual/estimated with source |
| Approved supplier | Private reference |
| Last receipt | Date |
| Last count | Date |
| Owner | Responsible person |
| Status | Active, obsolete, blocked |

### 9.2 Quantity equations

`Available = Accepted on hand - Reserved - Quarantine - Repair - Other blocked quantity`

`Projected available = Available + Confirmed incoming - Planned consumption`

Forecast incoming is not physical stock.

### 9.3 Reservation record

Every reservation states:

- part and quantity;
- project, build, terminal or customer purpose;
- owner;
- reservation date;
- need-by date;
- expiry/review date;
- release reason when cancelled.

## 10. BOM and configuration control

### 10.1 BOM hierarchy

Maintain separate controlled versions for:

- prototype BOM;
- pilot BOM;
- future production BOM;
- installation kit BOM;
- spare kit BOM;
- packaging BOM.

### 10.2 BOM line fields

- BOM version;
- line number;
- internal part number;
- exact manufacturer part number;
- quantity per unit;
- approved substitute rule;
- mounting/assembly note;
- firmware/software dependency;
- drawing/CAD reference;
- test requirement;
- status;
- change decision.

### 10.3 BOM change process

1. Raise change request.
2. State reason: availability, defect, cost, compatibility, redesign or lifecycle.
3. Identify affected terminal/configuration versions.
4. Compare dimensions, power, interfaces, software and performance.
5. Define retesting required.
6. Update BOM and source files.
7. Approve change.
8. Identify old stock disposition.
9. Update assembly and service documentation.
10. Record effective build serial/date.

No silent substitution is permitted.

## 11. Finished terminal asset register

Every completed terminal receives a unique BSS asset record before it can become `ACCEPTED UNIT`, `SPARE` or `DEPLOYED`.

### 11.1 Terminal asset fields

| Field | Required content |
|---|---|
| Asset ID | Unique BSS ID |
| Serial number | Approved serial convention |
| Terminal model | Product/model label |
| Hardware BOM version | Exact version |
| Enclosure/drawing revision | Exact version |
| Main compute serial | Private record where appropriate |
| Display model/serial | Where available |
| RFID reader model/serial | Where available |
| PSU model/serial | Where available |
| Firmware version | Version/hash |
| OS/image version | Version/hash |
| Application version | Release/commit |
| Device configuration | Non-secret configuration reference |
| Secret provisioning status | Private secret-store reference only |
| Assembly date | Date |
| Assembler | Person/vendor |
| Test result | Evidence reference |
| Acceptance result | Accepted/conditional/rejected |
| Current status | Asset status |
| Current location | Private location ID |
| Custody owner | BSS/customer/site role |
| Warranty/service record | Private reference |
| Last inspection | Date |
| Next review | Date |
| Notes | Non-sensitive notes |

### 11.2 Serial convention

The final serial convention remains `OPEN`.

It should be:

- unique;
- human-readable;
- not customer-personal;
- not derived from secrets;
- stable through repair;
- linked to the configuration history;
- physically labelled and digitally recorded.

## 12. Assembly and test movement

### 12.1 Assembly issue record

When stock moves into assembly, record:

- build ID;
- intended terminal asset ID;
- BOM version;
- part numbers and quantities issued;
- lot/serials where controlled;
- assembler;
- date;
- substitutions or deviations;
- returned unused quantity;
- scrap or damage;
- test result.

### 12.2 Build statuses

- `KIT PREPARED`;
- `IN ASSEMBLY`;
- `ASSEMBLY COMPLETE`;
- `IN INITIAL TEST`;
- `REWORK REQUIRED`;
- `IN FINAL TEST`;
- `ACCEPTED UNIT`;
- `REJECTED BUILD`.

A build cannot skip required test stages merely because it is needed urgently.

## 13. Deployment and chain of custody

### 13.1 Deployment handoff

Before deployment, confirm:

- asset status is `ACCEPTED UNIT` or approved `SPARE`;
- installation acceptance prerequisites are met;
- configuration and application version are recorded;
- customer/site ID is privately recorded;
- transport and installation owner are named;
- damage state is photographed where appropriate;
- accessories and mounting parts are listed;
- return and support path are known;
- secrets are provisioned through the approved private process;
- no real worker data exists in public evidence.

### 13.2 Custody record

| Field | Required content |
|---|---|
| Custody ID | Internal ID |
| Asset ID | Terminal/asset |
| From location/owner | Previous custody |
| To location/owner | New custody |
| Transfer date/time | Date/time |
| Purpose | Pilot, demo, repair, storage, replacement |
| Condition | Recorded condition |
| Included accessories | List |
| Configuration state | Version reference |
| Acceptance/signature evidence | Private record |
| Return expectation | Date/condition |
| Approved by | Owner |

### 13.3 Customer-site rules

- BSS retains an asset record even when equipment is customer-held;
- customer custody does not transfer ownership unless signed terms say so;
- site movement requires BSS notification under the approved process;
- customer must not open or modify the terminal unless explicitly authorized;
- support must know the exact deployed asset and configuration;
- replacement does not erase the history of the original unit.

## 14. Spare and replacement strategy

Exact quantities and locations remain `OPEN`.

### 14.1 Spare classes

- complete terminal spare;
- compute module spare;
- display spare;
- RFID reader spare;
- PSU spare;
- mounting/installation spare kit;
- consumable/fastener kit.

### 14.2 Spare readiness

A spare is ready only when:

- item identity is approved;
- condition is accepted;
- software/configuration compatibility is known;
- required accessories are present;
- storage location is known;
- owner and deployment process are defined;
- periodic verification is current.

### 14.3 Replacement workflow

1. Open support/incident record.
2. Identify failed asset and configuration.
3. Decide remote fix, field repair or replacement.
4. Reserve compatible spare.
5. Record outgoing custody.
6. Provision approved configuration and secrets.
7. Install and test replacement.
8. Record customer/site acceptance.
9. Return failed unit to BSS custody.
10. Quarantine or move to repair.
11. Preserve incident and asset links.
12. Close only after service and records are reconciled.

## 15. Repair and RMA

### 15.1 Repair record

- asset ID;
- incident/support ID;
- failure description;
- date detected;
- current location;
- warranty status;
- diagnostic owner;
- diagnostic evidence;
- parts consumed;
- configuration changes;
- rework performed;
- supplier RMA reference;
- test required;
- final result;
- cost reference;
- return-to-service approval;
- data wipe or secret rotation required.

### 15.2 Repair statuses

- `DIAGNOSIS OPEN`;
- `AWAITING APPROVAL`;
- `AWAITING PART`;
- `SUPPLIER RMA`;
- `IN REPAIR`;
- `IN RETEST`;
- `RETURN TO SERVICE APPROVED`;
- `REPAIR REJECTED`;
- `RETIRE`.

### 15.3 Warranty controls

Record privately:

- warranty provider;
- start/end date;
- covered defects;
- excluded damage;
- claim deadline;
- required evidence;
- shipping responsibility;
- repair/replacement result.

Operational warranty records do not replace signed supplier or customer terms.

## 16. Nonconformance and quarantine

A nonconformance record is required when:

- wrong model/revision received;
- dimensions differ from specification;
- visible or functional defect exists;
- repeated assembly issue occurs;
- test result is outside acceptance range;
- configuration cannot be verified;
- asset custody is uncertain;
- returned customer equipment is damaged;
- counterfeit or tampered item is suspected.

### Nonconformance fields

- record ID;
- item/asset/lot;
- description;
- evidence;
- severity;
- immediate containment;
- quantity affected;
- related builds/customers;
- root-cause owner;
- supplier involvement;
- disposition: use as-is, rework, return, scrap, investigate;
- approval;
- close evidence.

`USE AS-IS` requires explicit approval and documented risk; it is never the default.

## 17. Tools, fixtures and test equipment

### 17.1 Register fields

| Field | Required content |
|---|---|
| Asset ID | Unique ID |
| Type | Tool, fixture, test device |
| Manufacturer/model | Exact identity |
| Serial number | Where available |
| Current location | Private ID |
| Custody owner | Person/vendor |
| Intended use | Process supported |
| Condition | Serviceable/damaged/quarantine |
| Verification/calibration required | Yes/no/unknown |
| Last verification | Date/evidence |
| Next verification | Date or trigger |
| Accessories | Required accessories |
| Instructions | Controlled reference |
| Status | Available, assigned, repair, retired |

### 17.2 Verification rule

Where a measurement affects acceptance, the suitability and verification status of the tool must be known. Exact legal calibration obligations require professional review where applicable.

## 18. Stock counts and reconciliation

### 18.1 Cycle count

Count frequency remains `OPEN` and should be risk-based.

Prioritize:

- high-value components;
- serialized assets;
- customer-deployed assets;
- critical spares;
- restricted or sensitive media;
- items with repeated discrepancy;
- long-lead components.

### 18.2 Discrepancy record

- part/asset;
- expected quantity/location;
- actual quantity/location;
- variance;
- date and counter;
- last known movement;
- investigation owner;
- possible cause;
- financial/security/customer impact;
- corrective action;
- approval and close date.

Do not silently edit the expected quantity to match the count.

## 19. Loss, theft and damage

When loss, theft or material damage is reported:

1. open incident and asset records;
2. identify whether secrets or customer data could be exposed;
3. rotate or revoke credentials where applicable;
4. notify required internal/customer/legal parties under approved processes;
5. preserve evidence;
6. update custody and asset status;
7. evaluate insurance, police or contractual steps with qualified guidance;
8. arrange replacement only through approved controls;
9. record financial impact privately;
10. close only after security, custody and finance records agree.

## 20. Return and offboarding

### 20.1 Customer or pilot return

- confirm asset IDs and accessories expected;
- schedule return with custody owner;
- record condition at removal;
- remove site-specific configuration;
- revoke or rotate device secrets;
- verify no customer data remains beyond approved retention;
- inspect and test after return;
- classify as available, spare, repair, quarantine or retire;
- close customer custody record;
- link any damage or missing-item issue.

### 20.2 Vendor or employee return

Recover:

- terminals;
- prototype units;
- components;
- tools and fixtures;
- storage media;
- keys and access cards;
- packaging and source materials where required.

Revoke related digital access through the appropriate offboarding process.

## 21. Data wipe and secret handling

Before reuse, return, repair by an external party or disposal:

- identify data-bearing components;
- export required logs/evidence under approved retention;
- revoke device credentials;
- remove customer-specific configuration;
- perform the approved wipe/reset method;
- verify the result;
- record who performed and reviewed it;
- keep secrets out of the public asset record.

A factory reset is not assumed sufficient without verification for the actual device and data model.

## 22. Retirement and disposal

### 22.1 Retirement decision

Possible reasons:

- uneconomic repair;
- obsolete or unsupported component;
- repeated reliability failure;
- security limitation;
- physical damage;
- design change;
- end of pilot asset life;
- certification or safety concern.

### 22.2 Disposal checklist

- asset identified;
- custody recovered;
- data and secrets removed;
- reusable parts decision recorded;
- grant/customer/contract restriction checked;
- accounting/asset treatment confirmed;
- approved recycler/disposal route selected where required;
- disposal evidence stored privately;
- asset marked `DISPOSED` only after completion.

Exact environmental and waste rules require qualified/local review.

## 23. Inventory and asset metrics

Targets remain `OPEN` until real data exists.

Track:

- receipt accuracy;
- inspection rejection rate;
- supplier defect rate;
- inventory discrepancy rate;
- stockout events;
- emergency purchase events;
- spare readiness;
- terminal first-pass test rate;
- rework rate;
- deployment-to-failure interval;
- repair turnaround time;
- repeat failure rate;
- lost/unconfirmed assets;
- obsolete stock value;
- configuration-record completeness;
- customer return completeness.

Metrics must state source, owner, period and definition.

## 24. Operating cadence

### Per procurement

- request;
- approval;
- order;
- receipt;
- inspection;
- finance match;
- stock update.

### Weekly during active builds/pilots

- incoming deliveries;
- blocked/quarantine items;
- build reservations;
- spare readiness;
- repair status;
- customer-deployed asset exceptions.

### Monthly

- stock count according to approved risk schedule;
- serialized asset review;
- obsolete/slow stock review;
- warranty deadlines;
- recurring supplier issues;
- finance reconciliation;
- missing custody or configuration evidence.

### Before every pilot deployment

- asset acceptance;
- configuration record;
- custody handoff;
- spare/replacement plan;
- installation kit;
- return process;
- secret provisioning and recovery.

## 25. Roles

Actual assignments remain `OPEN`.

| Role | Responsibility | Backup required? |
|---|---|---:|
| Procurement owner | Request, quote and order coordination | Yes |
| Technical approver | Exact model and compatibility approval | Yes |
| Receiver/inspector | Receipt and inspection evidence | Yes |
| Inventory custodian | Locations and stock movements | Yes |
| Build owner | Assembly issue and configuration traceability | Yes |
| Asset custodian | Finished-terminal lifecycle | Yes |
| Service owner | Repair, replacement and RMA | Yes |
| Finance reviewer | Commitment, invoice and asset reconciliation | Yes |
| Security/privacy reviewer | Data wipe and credential decisions | Yes |

The same person may hold several roles in the early phase, but critical approval and self-review risks must be identified.

## 26. Fictional procurement dry run

All names, quantities and values are fictional.

### 26.1 Request

A fictional build needs five display modules.

Request record:

- exact approved model: `FICT-DISPLAY-43-A`;
- quantity: five;
- use: two prototypes, one pilot candidate, one spare, one test unit;
- substitute: not allowed without technical review;
- budget and commitment: fictional approved references;
- acceptance: exact model, dimensions, connector, visible condition and power-on check.

### 26.2 Receipt

The supplier sends five units, but one is revision B.

Inspection result:

- four revision A units: `ACCEPTED`;
- one revision B unit: `QUARANTINE`;
- supplier documentation does not prove mechanical compatibility;
- invoice quantity is five, but acceptance evidence covers four.

Finance result:

- four accepted items may proceed under the approved invoice process;
- disputed item remains blocked;
- revision B is not silently substituted;
- technical evaluation or return is required.

### 26.3 Inventory

- four accepted units enter `AVAILABLE`;
- two become `RESERVED` for prototype builds;
- one becomes `RESERVED` for pilot candidate;
- one becomes `SPARE` after the approved test;
- revision B remains `QUARANTINE`.

This dry run demonstrates status separation only. It does not approve a real component.

## 27. Fictional terminal lifecycle dry run

All identifiers are fictional.

### 27.1 Build and acceptance

Terminal `FICT-BSS-T-0007` is assembled with:

- pilot BOM `FICT-PBOM-03`;
- enclosure revision `FICT-ENC-02`;
- application release `FICT-REL-1.0`;
- exact component serials stored privately.

Initial test finds an intermittent power connector.

- status: `REWORK REQUIRED`;
- terminal cannot be marked `ACCEPTED UNIT`;
- connector is replaced;
- final test passes;
- acceptance result becomes `ACCEPTED UNIT`.

### 27.2 Deployment

- custody transfers from BSS storage to fictional pilot site;
- configuration and condition are recorded;
- one accepted spare is reserved;
- customer/site return path is documented;
- device secrets are provisioned privately.

### 27.3 Failure and replacement

In Week 2, the display fails.

- incident linked to asset;
- spare terminal is deployed;
- failed terminal returns to BSS custody;
- credentials are revoked or rotated as required;
- failed terminal enters `IN REPAIR`;
- replacement display is recorded against the repair;
- full acceptance test passes before return to `SPARE`.

### 27.4 End of pilot

- both assets are recovered;
- customer-specific configuration is removed;
- condition and accessories are checked;
- one unit returns to `AVAILABLE`;
- one remains `SPARE`;
- custody records close.

This dry run is not evidence of real terminal readiness.

## 28. Evidence index

| Evidence ID | Required evidence | Location type |
|---|---|---|
| `AST-001` | Approved asset classes and ID convention | Controlled document |
| `AST-002` | Procurement request register | Private |
| `AST-003` | Approved-parts register | Controlled/private |
| `AST-004` | Supplier approval references | Private |
| `AST-005` | Purchase and delivery register | Private |
| `AST-006` | Receipt and inspection records | Private |
| `AST-007` | Component inventory register | Private |
| `AST-008` | BOM/configuration history | Repository/private evidence |
| `AST-009` | Finished-terminal asset register | Private |
| `AST-010` | Custody and deployment register | Private |
| `AST-011` | Spare readiness register | Private |
| `AST-012` | Repair/RMA/nonconformance register | Private |
| `AST-013` | Tool/test-equipment register | Private |
| `AST-014` | Count and discrepancy evidence | Private |
| `AST-015` | Wipe, retirement and disposal evidence | Private |

## 29. Approval gates

### Gate A1 — Governance approval

- roles and backups;
- asset classes;
- status language;
- procurement authority;
- custody rules;
- private system selected.

### Gate A2 — Technical baseline

- approved BOM version;
- exact component identities;
- mechanical/electrical/software compatibility;
- test and acceptance criteria;
- issue #60 physical evidence where applicable.

### Gate A3 — Finance and vendor alignment

- budget and commitment approved;
- supplier controls complete;
- invoice and acceptance match;
- warranty/return terms recorded;
- no confidential pricing in public repo.

### Gate A4 — Pilot asset readiness

- asset IDs assigned;
- build/configuration traceability complete;
- installation acceptance prerequisites met;
- spare/replacement plan exists;
- custody and return process exists;
- data wipe/secret rotation process tested.

### Gate A5 — Dry run

- fictional purchase;
- partial/incorrect receipt;
- quarantine and finance block;
- terminal build and rework;
- deployment and replacement;
- return and reconciliation.

## 30. External review backlog

Confirm where applicable:

- electrical and product safety;
- required conformity/certification;
- installation requirements;
- customs/import treatment;
- warranty and consumer/business obligations;
- fixed-asset and inventory accounting;
- grant-funded asset restrictions;
- hazardous or electronic waste disposal;
- insurance for deployed assets;
- customer custody, loss and damage terms;
- data-bearing-device disposal.

## 31. Definition of done for this document

The document is complete for `PROPOSED v0.1` when:

- it is merged through green repository gates;
- procurement, receipt, inventory, asset, custody, repair and disposal templates exist;
- component and terminal traceability are explicit;
- the fictional procurement and terminal lifecycle dry runs exist;
- no real customer, supplier, credential, address, bank or confidential pricing data is present;
- actual quantities, suppliers, reorder points, serial convention and regulatory decisions remain open.

Merge does not mean:

- the hardware is production-ready;
- a real BOM is approved;
- a supplier is selected;
- stock exists;
- a terminal has passed physical tests;
- customer custody terms are signed;
- safety, conformity or disposal obligations are confirmed.
