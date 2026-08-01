import test from 'node:test';
import assert from 'node:assert/strict';
import { INITIAL_STATE, getGuide, startDemo, selectRole, registerEmployee, approveLeave, resolveCorrection, reviewWorker, generateReport, resetDemo } from '../state.js';

test('startDemo otvara iskustvo bez mijenjanja metrika', () => {
  const next = startDemo(resetDemo());
  assert.equal(next.started, true);
  assert.equal(next.presentCount, 47);
  assert.equal(next.activeRole, 'director');
});

test('vođeni radni dan automatski prolazi svih pet uloga', () => {
  let state = startDemo(resetDemo());
  state = registerEmployee(state);
  assert.equal(state.activeRole, 'admin');
  state = resolveCorrection(state);
  assert.equal(state.activeRole, 'manager');
  state = approveLeave(state);
  assert.equal(state.activeRole, 'worker');
  state = reviewWorker(state);
  assert.equal(state.activeRole, 'accounting');
  state = generateReport(state);
  assert.equal(getGuide(state).complete, true);
  assert.equal(getGuide(state).progress, 100);
});

test('ručna promjena uloge čuva zajedničko stanje', () => {
  const scanned = registerEmployee(startDemo(resetDemo()));
  const accounting = selectRole(scanned, 'accounting');
  assert.equal(accounting.presentCount, 48);
  assert.equal(accounting.scanned, true);
});

test('događaj izvan redoslijeda ne mijenja stanje', () => {
  const state = startDemo(resetDemo());
  assert.equal(resolveCorrection(state), state);
});

test('operativne radnje su idempotentne', () => {
  const attendance = registerEmployee(registerEmployee(startDemo(resetDemo())));
  const correction = resolveCorrection(resolveCorrection(attendance));
  const leave = approveLeave(approveLeave(correction));
  const worker = reviewWorker(reviewWorker(leave));
  const report = generateReport(generateReport(worker));
  assert.equal(report.presentCount, 48);
  assert.equal(report.reportGenerated, true);
  assert.equal(getGuide(report).completed, 5);
});

test('reset vraća determinističko početno stanje', () => {
  const reset = resetDemo();
  assert.deepEqual(reset, INITIAL_STATE);
  assert.notEqual(reset.experience, INITIAL_STATE.experience);
});
