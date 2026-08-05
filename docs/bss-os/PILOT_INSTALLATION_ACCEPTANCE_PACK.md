# BSS Pilot Installation & Acceptance Pack

| Field | Value |
|---|---|
| Status | `PROPOSED` |
| Version | `0.1` |
| Date | `2026-08-05` |
| Owner | BSS Product Owner / Installation Owner |
| Related issue | `#77` |
| Applies to | First controlled pilot terminal installation and acceptance |
| Does not prove | Final hardware fit, production CAD, production infrastructure, live-pilot legal readiness or customer-specific approval |

## 1. Purpose

This pack defines how BSS prepares, installs, verifies and formally accepts a pilot terminal at a customer site.

It prevents five common failures:

1. arriving without confirmed power, network or mounting conditions;
2. installing a device whose exact hardware revision or configuration is not recorded;
3. calling an installation successful without proving critical functions;
4. hiding failed tests behind a customer signature;
5. losing traceability for photos, serial numbers, configuration, defects and re-tests.

The pack is a controlled operational template. It is not evidence that the current prototype is physically ready. Exact fit, thermal, RFID, mounting and serviceability evidence remain blocked by issue `#60`.

## 2. Sources of truth

Installation planning must reference:

- `docs/bss-os/PILOT_READINESS_PACKAGE.md`;
- `docs/bss-os/SUPPORT_INCIDENT_OPERATING_SYSTEM.md`;
- `docs/bss-os/GDPR_DATA_GOVERNANCE_BASELINE.md`;
- `docs/bss-os/LEGAL_OPERATIONS_TEMPLATE_PACK.md`;
- `docs/bss-os/ADR-001-INFRASTRUCTURE-BASELINE.md`;
- `docs/bss-os/PRODUCT_FEATURE_REGISTRY.md`;
- issue `#55` for the authoritative software baseline;
- issue `#59` for staging/production infrastructure;
- issue `#60` for physical metrology and production CAD;
- issue `#62` for overall pilot readiness;
- issues `#64` and `#66` for privacy/legal evidence;
- issue `#75` for support and incident readiness.

No checklist item may override a blocker in those sources.

## 3. Status language

### 3.1 Site status

- `UNASSESSED`: no verified site information.
- `INFORMATION REQUESTED`: questionnaire sent, evidence incomplete.
- `CONDITIONALLY SUITABLE`: likely suitable, but named prerequisites remain open.
- `READY FOR INSTALLATION`: all mandatory pre-installation evidence approved.
- `INSTALLATION IN PROGRESS`: physical work and tests active.
- `CONDITIONAL ACCEPTANCE`: non-critical punch-list remains with approved workaround and due date.
- `ACCEPTED`: all critical tests passed and evidence is complete.
- `FAILED`: one or more critical tests failed or evidence is insufficient.
- `REMOVED`: device removed and chain of custody closed.

### 3.2 Test outcomes

- `PASS`: requirement observed and evidence recorded.
- `CONDITIONAL PASS`: function works with a documented non-critical limitation, owner and due date.
- `FAIL`: requirement not met.
- `BLOCKED`: test cannot be validly executed because a dependency is unavailable.
- `NOT APPLICABLE`: allowed only with written reason and approver.

A critical test may not be converted to `PASS` by verbal agreement.

## 4. Roles

| Role | Responsibility |
|---|---|
| BSS Product Owner | final go/no-go authority for pilot installation |
| BSS Installation Owner | owns site preparation, tools, installation and evidence |
| BSS Technical Owner | owns software, terminal configuration, connectivity and sync verification |
| BSS Hardware Owner | owns terminal identity, physical integrity, mounting, thermal and RFID checks |
| BSS Privacy/Security Owner | confirms no credentials, employee data or private photos enter the public repository |
| Customer Pilot Owner | approves site access, business timing and acceptance decision |
| Customer Site Contact | confirms power, network, wall/location and physical access |
| Customer Administrator | verifies approved worker/admin test flows and manual fallback |

One person may hold several roles in an early pilot, but every role must be explicitly assigned.

## 5. Pre-installation customer questionnaire

The following information must be collected in a private approved system, not public GitHub.

### 5.1 Company and location

- internal customer/pilot ID;
- site name and private address;
- installation contact and backup contact;
- planned installation date and time window;
- normal operating hours and shift-change peaks;
- access restrictions, safety induction and required personal protective equipment;
- proposed terminal area and reason for selection.

### 5.2 Pilot scope

- workers included in the pilot;
- departments/teams included;
- number of shifts;
- approved administrators and supervisors;
- planned pilot start and end date;
- manual fallback owner;
- known site closure or holiday dates.

### 5.3 Power

- dedicated or shared outlet available within approved cable reach;
- outlet type and voltage appropriate for the approved power supply;
- outlet remains powered during required operating hours;
- cable route does not create a trip, crush, heat or moisture hazard;
- extension lead use explicitly approved or prohibited;
- customer confirms who may disconnect power.

### 5.4 Network

- approved connection type: Ethernet, Wi-Fi or other controlled option;
- signal/port availability at the proposed terminal location;
- outbound connectivity restrictions;
- captive portal, proxy, certificate or allowlist requirements;
- guest network restrictions;
- customer network owner identified;
- test credentials shared only through an approved secure channel;
- fallback if customer network is unavailable.

Wi-Fi passwords, API secrets and private network details must never be committed to the repository.

### 5.5 Physical environment

- wall/material type or approved alternative mounting surface;
- proposed installation height and user reachability;
- expected dust, moisture, temperature, vibration and direct sunlight;
- risk of impact from forklifts, carts, doors or moving equipment;
- visibility to workers without exposing private information to unauthorized persons;
- safe service access without blocking exits or operations;
- available clearance for enclosure, connectors and cable bend radius;
- customer permission for drilling or adhesive mounting where applicable.

### 5.6 RFID use

- approved card/tag type;
- number of cards needed for pilot and spares;
- existing card compatibility claim: `UNVERIFIED` until tested;
- expected tap position and user flow;
- nearby metal, electrical equipment or interference risks;
- requirement for read-zone test at the actual mounting location.

## 6. Pre-installation evidence gate

A site may become `READY FOR INSTALLATION` only when all mandatory items below are complete.

| Evidence ID | Requirement | Owner | Status |
|---|---|---|---|
| INST-001 | named BSS and customer owners | Product Owner | `OPEN` |
| INST-002 | approved site questionnaire | Installation Owner | `OPEN` |
| INST-003 | proposed location photo/sketch stored privately | Customer Site Contact | `OPEN` |
| INST-004 | power suitability confirmed | Hardware Owner | `OPEN` |
| INST-005 | network path and owner confirmed | Technical Owner | `OPEN` |
| INST-006 | mounting method approved | Hardware Owner | `OPEN` |
| INST-007 | exact terminal serial/hardware/software versions recorded | Hardware/Technical Owners | `OPEN` |
| INST-008 | support channel and fallback owner confirmed | Support Owner | `OPEN` |
| INST-009 | legal/privacy live-data gate confirmed | Privacy Owner | `OPEN` |
| INST-010 | rollback/removal plan confirmed | Installation Owner | `OPEN` |

Any open critical item keeps the site below `READY FOR INSTALLATION`.

## 7. Installer equipment checklist

The final list depends on the approved hardware revision. Proposed categories:

### 7.1 Terminal and spares

- approved pilot terminal;
- approved power supply;
- approved mounting components;
- RFID cards/tags and controlled spares;
- replacement cables/adapters approved for the build;
- labeled transport packaging;
- tamper/evidence labels where approved;
- temporary replacement terminal only if configured and traceable.

### 7.2 Tools

- suitable measuring tool;
- level and marking tools;
- screwdriver/bit set appropriate to approved fasteners;
- wall detector where drilling is planned;
- drill and approved bits only when authorized;
- cable management materials;
- laptop and approved service adapter;
- network test method;
- cleaning materials safe for the enclosure/display;
- personal protective equipment required by the site.

### 7.3 Documentation

- current installation pack version;
- current BOM/device configuration record;
- private site evidence link;
- acceptance test sheet;
- manual attendance fallback form;
- support and escalation contacts;
- removal/return checklist.

## 8. Device identity and chain of custody

Before transport record:

- internal device ID;
- serial number/QR identifier;
- enclosure revision;
- Raspberry Pi model/RAM revision;
- display exact SKU;
- RFID module revision;
- power supply model;
- cooler/fan model;
- installed software/firmware version;
- configuration version;
- build/release commit where applicable;
- date and person performing pre-delivery inspection;
- visible condition and private photo evidence;
- transport handoff and recipient.

Do not record secrets or raw credentials in the device record.

Every custody transfer must include date, from, to, reason and condition.

## 9. Installation sequence

### 9.1 Arrival and safety

1. Confirm customer site contact is present.
2. Confirm work area and installation method match the approved plan.
3. Recheck power, network and environmental conditions.
4. Stop if the location materially differs from approved evidence.
5. Protect workers and normal operations during installation.

### 9.2 Physical placement

1. Mark final location and height.
2. Verify clearances, cable route and service access.
3. Verify no drilling or mounting conflict with hidden services.
4. Install approved mounting hardware.
5. Attach terminal without enclosure deformation or cable strain.
6. Confirm level, stability and secure fasteners.
7. Confirm ventilation paths remain open.
8. Confirm power/network cables cannot be accidentally pulled or crushed.
9. Apply device identification without covering vents, RFID zone or service points.

### 9.3 Power and boot

1. Connect approved power supply.
2. Observe boot behavior and display initialization.
3. Confirm no abnormal heat, smell, sound, restart loop or visible damage.
4. Record boot time and displayed version where available.
5. Stop and isolate power if unsafe behavior appears.

### 9.4 Connectivity and configuration

1. Connect through the approved network path.
2. Confirm system time and configured organization/site.
3. Confirm terminal identity is recognized by the correct tenant/site.
4. Confirm no test tenant or another customer context remains active.
5. Confirm secrets were entered only through an approved method.
6. Confirm monitoring/health status where available.

### 9.5 RFID read-zone setup

1. Test the approved card/tag at the intended tap point.
2. Test repeated reads from realistic user approach angles.
3. Confirm no unintended read at an excessive distance.
4. Check nearby metal/equipment interference.
5. Mark or explain the correct user tap position.
6. Record failures and environmental conditions.

## 10. Functional acceptance tests

Criticality must be approved before live use. Proposed baseline:

| Test ID | Test | Critical | Required evidence |
|---|---|---:|---|
| FAT-001 | terminal powers on safely | Yes | observation + device log/photo |
| FAT-002 | correct device/software version shown | Yes | version record |
| FAT-003 | correct customer tenant/site context | Yes | authorized admin observation |
| FAT-004 | network connectivity stable | Yes | connection/health evidence |
| FAT-005 | approved RFID card recognized | Yes | observed test event |
| FAT-006 | unknown/invalid card rejected safely | Yes | observed negative test |
| FAT-007 | successful clock-in visible to authorized admin | Yes | event and UI evidence |
| FAT-008 | successful clock-out visible and paired correctly | Yes | event and UI evidence |
| FAT-009 | duplicate/retry does not create uncontrolled duplicate record | Yes | controlled retry evidence |
| FAT-010 | offline/unavailable path behaves as documented | Yes where supported | queue/fallback evidence |
| FAT-011 | later synchronization preserves original event identity/time | Yes where supported | sync/audit evidence |
| FAT-012 | buzzer/display confirmation clear and not misleading | No | observation |
| FAT-013 | supervisor/admin can review exception or correction flow | Yes | role-based test |
| FAT-014 | unauthorized role cannot access restricted data/action | Yes | negative RBAC test |
| FAT-015 | manual attendance fallback available and understood | Yes | completed fictional fallback row |
| FAT-016 | support case can be opened through approved channel | Yes | fictional support test |
| FAT-017 | restart returns terminal to controlled state | Yes | restart evidence |
| FAT-018 | enclosure, mounting and cables remain stable after use test | Yes | inspection evidence |
| FAT-019 | temperature/ventilation acceptable under approved test | Yes before live use | measured/observed evidence |
| FAT-020 | customer owner understands limitations and excluded features | Yes | signed acknowledgement |

No real worker data should be required for installation testing. Use approved fictional/test identities until the live-data gate is signed.

## 11. Manual attendance fallback

If terminal or platform use is unavailable, the customer must use an approved manual method.

Minimum fallback record:

- date;
- worker internal reference appropriate to customer policy;
- shift/site;
- arrival and departure time;
- reason for manual capture;
- person recording the entry;
- employee/supervisor confirmation where required;
- later reconciliation date;
- authorized person entering/correcting the system record;
- link/reference to audit evidence.

Original manual evidence must be retained according to the customer’s approved process. A later digital correction must not silently erase the fact that fallback was used.

## 12. Safety and serviceability check

Before acceptance verify:

- terminal cannot detach under normal use;
- no exposed conductor or damaged cable;
- no sharp edge or pinch point;
- no blocked emergency route;
- no dangerous cable loop or trip hazard;
- display is readable under site lighting;
- terminal is reachable by intended users;
- device can be serviced without dismantling customer property beyond the approved method;
- ventilation is not blocked;
- power can be safely isolated;
- device label and support reference are visible;
- RFID use does not require unsafe posture or movement.

## 13. Photo and evidence rules

Private evidence set should include:

- proposed location before installation;
- mounting surface and power/network route;
- device serial/condition before installation;
- installed terminal front, side and cable route;
- mounting detail where appropriate;
- final operational state;
- any defect or conditional item;
- removal condition at the end of pilot.

Do not include worker faces, badges, personal records, passwords, network labels or unrelated private areas. Public repository entries may contain only non-sensitive evidence references, not private photos.

## 14. Acceptance decision

### 14.1 `ACCEPTED`

Allowed only when:

- all critical tests are `PASS`;
- no critical safety, privacy, tenant-isolation or data-integrity issue exists;
- evidence is complete;
- support and fallback are confirmed;
- customer and BSS owners approve the result.

### 14.2 `CONDITIONAL ACCEPTANCE`

Allowed only when:

- all critical tests pass;
- remaining items are non-critical;
- each item has owner, due date, workaround and re-test requirement;
- customer accepts the limitation in writing;
- Product Owner approves conditional use.

### 14.3 `FAILED`

Required when:

- any critical test fails or is blocked;
- mounting or power is unsafe;
- tenant/site identity is wrong or uncertain;
- RFID behavior is unreliable for the approved use;
- network/offline/fallback behavior is not understood;
- required legal/privacy or live-data gate is missing;
- evidence is materially incomplete.

A failed installation must not process real worker data.

## 15. Acceptance form template

### Installation record

- customer/pilot ID:
- private site reference:
- device ID/serial:
- hardware revision:
- software/configuration version:
- installation date/time:
- BSS Installation Owner:
- Customer Pilot Owner:

### Test summary

- critical tests passed / total:
- non-critical tests passed / total:
- failed tests:
- blocked tests:
- conditional items:
- private evidence location:

### Decision

- [ ] `ACCEPTED`
- [ ] `CONDITIONAL ACCEPTANCE`
- [ ] `FAILED`

### Sign-off

- BSS owner name/date/decision:
- customer owner name/date/decision:
- limitations acknowledged:
- next review date:

Signatures do not override a failed critical test.

## 16. Punch-list and re-test

Each open item must include:

- punch-list ID;
- description;
- severity/criticality;
- temporary workaround;
- owner;
- due date;
- affected users/process;
- required evidence;
- re-test owner/date;
- final result.

Critical punch-list items force the installation status to `FAILED` or `INSTALLATION IN PROGRESS`, never `CONDITIONAL ACCEPTANCE`.

## 17. Replacement, removal and end-of-pilot

### 17.1 Replacement

- open support/incident record;
- preserve relevant logs and condition evidence;
- identify replacement device and configuration;
- revoke or rotate device credentials as required;
- repeat critical acceptance tests;
- update chain of custody;
- do not reuse an unverified returned device.

### 17.2 Removal

- agree shutdown window;
- confirm manual fallback if service continues;
- export customer data only through the approved process;
- revoke terminal access/credentials;
- safely disconnect and remove mounting/cabling as agreed;
- record wall/surface condition;
- record returned equipment and damage;
- close custody record;
- follow approved tenant/data offboarding separately.

## 18. Fictional dry run

### Scenario

- fictional company: `Testna Proizvodnja d.o.o.`;
- one fictional location;
- 20 fictional workers in planned pilot scope;
- one terminal;
- Ethernet available;
- wall outlet and approved mounting board available;
- no real employee data.

### Outcome

- site questionnaire complete;
- power/network/location evidence complete;
- device identity recorded;
- physical placement stable;
- RFID valid/invalid card tests pass;
- clock-in/out visible in fictional admin context;
- manual fallback demonstrated;
- offline/retry test marked `BLOCKED` until authoritative integrated backend behavior is available;
- final installation result: `FAILED` for live use because a critical test is blocked;
- lesson: complete documentation cannot replace missing software/hardware evidence.

## 19. Go-live evidence index

| Evidence ID | Evidence | Status |
|---|---|---|
| INST-001 | named owners | `OPEN` |
| INST-002 | completed private site questionnaire | `OPEN` |
| INST-003 | approved location/power/network evidence | `OPEN` |
| INST-004 | frozen terminal identity and versions | `OPEN` |
| INST-005 | physical metrology/CAD acceptance from issue #60 | `BLOCKED` |
| INST-006 | software baseline from issue #55 | `BLOCKED` |
| INST-007 | infrastructure connectivity/monitoring proof from issue #59 | `BLOCKED` |
| INST-008 | privacy/legal live-data approval | `BLOCKED` |
| INST-009 | support/fallback ownership from issue #75 | `OPEN` |
| INST-010 | completed critical FAT results | `OPEN` |
| INST-011 | safety/serviceability evidence | `OPEN` |
| INST-012 | private photo/evidence package | `OPEN` |
| INST-013 | signed acceptance decision | `OPEN` |
| INST-014 | punch-list/re-test closure | `OPEN` |
| INST-015 | removal/replacement plan | `OPEN` |

## 20. Current decision

This document may be merged as a `PROPOSED v0.1` operational template.

It does not authorize a physical installation or live pilot. Actual installation remains `BLOCKED` until the applicable software, infrastructure, hardware, privacy/legal, support and pilot-readiness evidence is proven.