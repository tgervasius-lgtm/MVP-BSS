import test from 'node:test';
import assert from 'node:assert/strict';
import { INITIAL_STATE, getGuide, startDemo, selectRole, registerEmployee, approveLeave, resolveCorrection, reviewWorker, generateReport, resetDemo } from '../state.js';

test('startDemo otvara iskustvo bez mijenjanja metrika', () => {
  const next = startDemo(resetDemo());
  assert.equal(next.started, true);
  assert.equal(next.presentCount, 47);
  assert.equal(next.activeRole, 'director');
});

test('sandbox radnje prolaze svih pet sposobnosti bilo kojim redoslijedom', () => {
  let state = startDemo(resetDemo());
  state = approveLeave(state);
  assert.equal(state.leaveApproved, true);
  assert.equal(state.scanned, false);
  state = generateReport(state);
  assert.equal(state.reportGenerated, true);
  assert.equal(state.correctionResolved, false);
  state = reviewWorker(state);
  assert.equal(state.workerReviewed, true);
  state = resolveCorrection(state);
  assert.equal(state.correctionResolved, true);
  state = registerEmployee(state);
  assert.equal(state.scanned, true);
  assert.equal(state.presentCount, 48);
  assert.equal(getGuide(state).complete, true);
  assert.equal(getGuide(state).completed, 5);
  assert.equal(getGuide(state).progress, 100);
});

test('ručna promjena uloge čuva zajedničko stanje', () => {
  const scanned = registerEmployee(startDemo(resetDemo()));
  const accounting = selectRole(scanned, 'accounting');
  assert.equal(accounting.presentCount, 48);
  assert.equal(accounting.scanned, true);
});

test('događaj izvan preporučenog redoslijeda ažurira samo svoju zastavicu', () => {
  const state = startDemo(resetDemo());
  const corrected = resolveCorrection(state);
  assert.equal(corrected.correctionResolved, true);
  assert.equal(corrected.scanned, false);
  assert.equal(corrected.leaveApproved, false);
  assert.equal(getGuide(corrected).completed, 1);
});

test('operativna radnja ne može napredovati prije pokretanja demonstracije', () => {
  const state = resetDemo();
  assert.equal(registerEmployee(state), state);
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

test('operativna radnja čuva ručno odabranu aktivnu ulogu', () => {
  let state = selectRole(startDemo(resetDemo()), 'accounting');
  state = approveLeave(state);
  assert.equal(state.activeRole, 'accounting');
  state = selectRole(state, 'worker');
  state = resolveCorrection(state);
  assert.equal(state.activeRole, 'worker');
});

test('reset vraća determinističko početno stanje', () => {
  const reset = resetDemo();
  assert.deepEqual(reset, INITIAL_STATE);
  assert.notEqual(reset.experience, INITIAL_STATE.experience);
});
