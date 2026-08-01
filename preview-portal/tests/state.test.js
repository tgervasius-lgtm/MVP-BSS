import test from 'node:test';
import assert from 'node:assert/strict';
import { INITIAL_STATE, startDemo, selectRole, registerEmployee, approveLeave, resolveCorrection, reviewWorker, generateReport, resetDemo } from '../state.js';

test('startDemo otvara iskustvo bez mijenjanja metrika', () => {
  const next = startDemo(INITIAL_STATE);
  assert.equal(next.started, true);
  assert.equal(next.presentCount, 47);
  assert.equal(next.activeRole, 'director');
});

test('vođeni radni dan automatski prolazi svih pet uloga', () => {
  let state = startDemo(INITIAL_STATE);
  state = registerEmployee(state);
  assert.equal(state.activeRole, 'admin');
  state = resolveCorrection(state);
  assert.equal(state.activeRole, 'manager');
  state = approveLeave(state);
  assert.equal(state.activeRole, 'worker');
  state = reviewWorker(state);
  assert.equal(state.activeRole, 'accounting');
  state = generateReport(state);
  assert.equal(state.guideStep, 5);
});

test('ručna promjena uloge čuva zajedničko stanje', () => {
  const scanned = registerEmployee({ ...INITIAL_STATE, started: true });
  const accounting = selectRole(scanned, 'accounting');
  assert.equal(accounting.presentCount, 48);
  assert.equal(accounting.scanned, true);
});

test('nepoznata uloga ne mijenja stanje', () => {
  const state = { ...INITIAL_STATE, started: true };
  assert.equal(selectRole(state, 'owner'), state);
});

test('operativne radnje su idempotentne', () => {
  const attendance = registerEmployee(registerEmployee({ ...INITIAL_STATE, started: true }));
  const correction = resolveCorrection(resolveCorrection(attendance));
  const leave = approveLeave(approveLeave(correction));
  const worker = reviewWorker(reviewWorker(leave));
  const report = generateReport(generateReport(worker));
  assert.equal(report.presentCount, 48);
  assert.equal(report.reportGenerated, true);
  assert.equal(report.guideStep, 5);
});

test('reset vraća determinističko početno stanje', () => {
  assert.deepEqual(resetDemo(), INITIAL_STATE);
});
