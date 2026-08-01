import test from 'node:test';
import assert from 'node:assert/strict';
import { INITIAL_STATE, startDemo, selectRole, registerEmployee, approveLeave, resolveCorrection, generateReport, resetDemo } from '../state.js';

test('startDemo otvara iskustvo bez mijenjanja metrika', () => {
  const next = startDemo(INITIAL_STATE);
  assert.equal(next.started, true);
  assert.equal(next.presentCount, 47);
  assert.equal(next.activeRole, 'director');
});

test('promjena kroz svih pet uloga čuva zajedničko stanje', () => {
  let state = registerEmployee({ ...INITIAL_STATE, started: true });
  for (const role of ['admin', 'manager', 'worker', 'accounting']) state = selectRole(state, role);
  assert.equal(state.activeRole, 'accounting');
  assert.equal(state.presentCount, 48);
  assert.equal(state.scanned, true);
});

test('nepoznata uloga ne mijenja stanje', () => {
  const state = { ...INITIAL_STATE, started: true };
  assert.equal(selectRole(state, 'owner'), state);
});

test('RFID prijava povećava broj prisutnih samo jednom', () => {
  const once = registerEmployee({ ...INITIAL_STATE, started: true });
  const twice = registerEmployee(once);
  assert.equal(once.presentCount, 48);
  assert.equal(twice.presentCount, 48);
});

test('operativne radnje su idempotentne', () => {
  const leave = approveLeave(approveLeave(INITIAL_STATE));
  const correction = resolveCorrection(resolveCorrection(leave));
  const report = generateReport(generateReport(correction));
  assert.equal(report.leaveApproved, true);
  assert.equal(report.correctionResolved, true);
  assert.equal(report.reportGenerated, true);
});

test('reset vraća determinističko početno stanje', () => {
  assert.deepEqual(resetDemo(), INITIAL_STATE);
});
