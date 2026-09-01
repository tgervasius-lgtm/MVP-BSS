const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const contract = fs.readFileSync('BSS_V1_PRODUCT_CONTRACT.md', 'utf8');
const featureRegistry = fs.readFileSync('docs/bss-os/PRODUCT_FEATURE_REGISTRY.md', 'utf8');

test('issue 131 Product Contract records the explicit owner-approved freeze', () => {
  assert.match(contract, /Verzija ugovora \| `1\.0`/);
  assert.match(contract, /Status \| \*\*ACCEPTED \/ FROZEN\*\*/);
  assert.match(contract, /Owner approval \| \*\*EXPLICIT — `ODOBRAVAM FREEZE BSS v1 PRODUCT CONTRACT`\*\*/);
  assert.match(contract, /BSS OS decision \| `APPROVED`/);
  assert.match(contract, /Whole-contract freeze decision\/date \| `APPROVED — 01\.09\.2026\.`/);
  assert.match(contract, /Contract status \| `ACCEPTED \/ FROZEN`/);
});

test('issue 131 Product Contract covers the four roles and critical negative cases', () => {
  for (const role of ['Admin', 'Voditelj', 'Radnik', 'Knjigovodstvo']) {
    assert.match(contract, new RegExp(`\\b${role}\\b`));
  }
  for (const boundary of [
    'no role can access another tenant',
    'Voditelj cannot access an unassigned department',
    'Radnik cannot access another worker',
    'Knjigovodstvo cannot access raw attendance-event drill-down'
  ]) {
    assert.ok(contract.includes(boundary), `missing role boundary: ${boundary}`);
  }
});

test('issue 131 frozen contract preserves owner-approved batch 1', () => {
  for (const decision of [
    ['PC-05', 'Narrow Croatian attendance/time-capture claim'],
    ['PC-24', 'Explicit Pilot, Commercial/No-Go and Offboarding governance lifecycle'],
    ['PC-17', 'controlled complete return/retention/deletion required before real-customer processing'],
    ['PC-20', 'without sensitive free-text correction reasons/notes'],
    ['PC-09', 'persisted event-effective local interpretation']
  ]) {
    assert.ok(contract.includes(`| \`${decision[0]}\``), `missing approved decision: ${decision[0]}`);
    assert.ok(contract.includes(decision[1]), `missing approved outcome: ${decision[0]}`);
  }
  assert.match(contract, /BSS OS decision \| `APPROVED`/);
  assert.match(contract, /Contract status \| `ACCEPTED \/ FROZEN`/);
});

test('issue 131 records owner-approved batch 2 attendance and anomaly decisions', () => {
  for (const decision of [
    ['PC-06', 'Immutable raw attendance evidence remains separate'],
    ['PC-07', 'no payroll/statutory premium engine'],
    ['PC-08', 'tolerance classifies schedule relation but never alters actual worked minutes'],
    ['PC-11', 'governed reopen/recalculate/relock'],
    ['PC-12', 'explicit resolution and period-blocking matrix']
  ]) {
    assert.ok(contract.includes(`| \`${decision[0]}\``), `missing approved decision: ${decision[0]}`);
    assert.ok(contract.includes(decision[1]), `missing approved outcome: ${decision[0]}`);
  }
  assert.match(contract, /does not introduce a generalized anomaly entity or subsystem/);
  assert.match(contract, /reopen -> correct\/recalculate -> REVIEW -> FINALIZED -> CLOSED/);
});

test('issue 131 records owner-approved batch 3 leave and worker-model decisions', () => {
  for (const decision of [
    ['PC-13', 'Whole-day leave/absence requests only'],
    ['PC-14', 'finalized/closed periods require governed reopen'],
    ['PC-15', 'formal multi-employment-period rehire subsystem is out of v1'],
    ['PC-02', 'Employment start/end dates are not mandatory v1 core fields'],
    ['PC-01', 'structured `first_name`/`last_name` migration is out of v1']
  ]) {
    assert.ok(contract.includes(`| \`${decision[0]}\``), `missing approved decision: ${decision[0]}`);
    assert.ok(contract.includes(decision[1]), `missing approved outcome: ${decision[0]}`);
  }
  assert.match(contract, /retroactive request may follow the authorized workflow only while its affected attendance period is `OPEN`/);
  assert.match(contract, /Prior finalized datasets and issued artifacts remain immutable/);
});

test('issue 131 records owner-approved batch 4 onboarding and import decisions', () => {
  for (const decision of [
    ['PC-03', 'optional tenant-unique contact data'],
    ['PC-04', 'explicit value is required before commit'],
    ['PC-21', 'without a site entity, site-scoped authorization or multi-timezone site model'],
    ['PC-25', 'completed screens do not authorize go-live'],
    ['PC-26', 'atomic all-or-nothing commit and no partial/update/merge/deactivate behavior']
  ]) {
    assert.ok(contract.includes(`| \`${decision[0]}\``), `missing approved decision: ${decision[0]}`);
    assert.ok(contract.includes(decision[1]), `missing approved outcome: ${decision[0]}`);
  }
  assert.match(contract, /Site is not a persisted business entity or authorization scope/);
  assert.match(contract, /partial valid-row commits, silent merges, automatic updates and automatic deactivation/);
});

test('issue 131 records owner-approved batch 5 web, migration, export and integration boundaries', () => {
  for (const decision of [
    ['PC-22', 'Authenticated/private web operations remain online-dependent'],
    ['PC-16', 'Historical attendance, leave and correction migration is out of v1'],
    ['PC-18', 'breaking structural or semantic changes require a new version'],
    ['PC-19', 'no general platform, webhook or payroll-adapter ecosystem'],
    ['PC-23', 'general workflow email, SMS and push remain out of v1']
  ]) {
    assert.ok(contract.includes(`| \`${decision[0]}\``), `missing approved decision: ${decision[0]}`);
    assert.ok(contract.includes(decision[1]), `missing approved outcome: ${decision[0]}`);
  }
  assert.match(contract, /must not persistently cache authenticated API\/private responses merely to simulate offline behavior/);
  assert.match(contract, /does not queue offline business mutations or create a second authoritative offline-write system/);
  assert.match(contract, /breaking column, type or semantic change requires a new schema version rather than silent mutation/);
});

test('issue 131 records the final owner batch and closes the 27-decision register', () => {
  assert.match(contract, /\| `PC-27` \| `A` \| Separate authoritative Job Position\/Radno mjesto entity is out of v1/);
  assert.match(contract, /\| `PC-28` \| `A` \| CSV, XLSX and governed PDF are official v1 formats/);
  assert.match(contract, /legacy Job Position UI is demo-only\/non-authoritative/);
  assert.match(contract, /Authoritative v1 workforce setup is worker \+ department \+ shift \+ RFID assignment/);
  const approvedRows = contract.match(/^\| `PC-\d+` \| `[ABC]` \|.+\|$/gm) ?? [];
  assert.equal(approvedRows.length, 27);
  assert.equal(new Set(approvedRows.map((row) => row.match(/PC-\d+/)[0])).size, 27);
  assert.ok(approvedRows.every((row) => !/PENDING|UNKNOWN/.test(row)));
  assert.match(contract, /Whole-contract freeze decision\/date \| `APPROVED — 01\.09\.2026\.`/);
});

test('issue 131 Product Contract resolves every required workflow domain', () => {
  for (const heading of [
    'Attendance and calculation contract',
    'Leave and absence contract',
    'Correction workflow contract',
    'Reporting, exports and accounting boundary',
    'Terminal contract',
    'Customer onboarding contract',
    'Employee CSV/XLSX import contract',
    'Definition of Done contract',
    'Change control and recovery',
    'Resolved source contradictions',
    'Issue #131 acceptance mapping'
  ]) {
    assert.match(contract, new RegExp(`## \\d+\\. ${heading.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}`));
  }
});

test('issue 131 scope keeps required v1 capabilities and exclusions explicit', () => {
  for (const required of [
    'CSV, XLSX and PDF are all in v1 scope',
    'Employee import is Admin-only',
    'annualLeaveAllowance',
    'narrow Croatian attendance/time-capture claim',
    'single-site v1',
    'browser does not queue offline business mutations'
  ]) {
    assert.ok(contract.includes(required), `missing required contract decision: ${required}`);
  }
  for (const excluded of [
    'native iOS/Android applications',
    'GPS/geofencing',
    'door/access control',
    'biometric identification',
    'payroll calculation',
    'advanced BI/AI',
    'historical attendance/leave/correction migration'
  ]) {
    assert.ok(contract.includes(excluded), `missing explicit exclusion: ${excluded}`);
  }
});

test('onboarding and import stay visibly unimplemented after freeze', () => {
  assert.match(featureRegistry, /ONBOARD-001[^\n]+Yes, frozen v1\.0 scope \| NONE \| NONE/);
  assert.match(featureRegistry, /IMPORT-001[^\n]+Yes, frozen v1\.0 scope \| NONE \| NONE/);
  assert.match(contract, /Onboarding is in v1 scope but is not claimed implemented by this document/);
});
