import test from 'node:test';
import assert from 'node:assert/strict';
import { INITIAL_STATE, ROLES, getGuide, startDemo, selectRole, registerEmployee, approveLeave, resolveCorrection, generateReport, replaceWorkerCard, submitWorkerLeave, decideWorkerLeave, resetDemo } from '../state.js';

test('startDemo otvara iskustvo bez mijenjanja metrika', () => {
  const next = startDemo(resetDemo());
  assert.equal(next.started, true);
  assert.equal(next.presentCount, 47);
  assert.equal(next.activeRole, 'admin');
  assert.deepEqual(Object.keys(ROLES), ['admin', 'manager', 'worker', 'accounting']);
  assert.equal(Object.hasOwn(ROLES, 'director'), false);
});

test('sandbox radnje prolaze svih pet sposobnosti bilo kojim redoslijedom', () => {
  let state = startDemo(resetDemo());
  state = approveLeave(state);
  assert.equal(state.leaveApproved, true);
  assert.equal(state.scanned, false);
  state = generateReport(state);
  assert.equal(state.reportGenerated, true);
  assert.equal(state.correctionResolved, false);
  state = submitWorkerLeave(state, { start: '2026-08-10', days: 2 });
  assert.equal(state.workerLeaveRequest.status, 'pending');
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
  const worker = submitWorkerLeave(submitWorkerLeave(leave), { start: '2026-08-10', days: 2 });
  const report = generateReport(generateReport(worker));
  assert.equal(report.presentCount, 48);
  assert.equal(report.reportGenerated, true);
  assert.equal(getGuide(report).completed, 5);
});

test('dodatne radnje radnika i Uprave dijele stanje, ali ne lažiraju novi guided korak', () => {
  let state = startDemo(resetDemo());
  state = replaceWorkerCard(state);
  assert.equal(state.workerCardReplaced, true);
  assert.equal(replaceWorkerCard(state), state);

  state = submitWorkerLeave(state, { start: '2026-08-10', days: 5 });
  assert.deepEqual(state.workerLeaveRequest, {
    id: 'ivan-horvat-demo-leave',
    start: '2026-08-10',
    days: 5,
    status: 'pending'
  });
  assert.equal(getGuide(state).completed, 1);

  state = decideWorkerLeave(state, 'approved');
  assert.equal(state.workerLeaveRequest.status, 'approved');
  assert.equal(decideWorkerLeave(state, 'rejected'), state);
  assert.equal(getGuide(state).completed, 1);
});

test('radnički zahtjev normalizira demo ulaz i odbija nevaljanu odluku', () => {
  const started = startDemo(resetDemo());
  const submitted = submitWorkerLeave(started, { start: '2026-99-99', days: 99 });
  assert.equal(submitted.workerLeaveRequest.start, '2026-08-10');
  assert.equal(submitted.workerLeaveRequest.days, 5);
  assert.equal(decideWorkerLeave(submitted, 'unknown'), submitted);
});

test('radnički zahtjev prihvaća samo radni dan unutar demo razdoblja', () => {
  const started = startDemo(resetDemo());
  const weekend = submitWorkerLeave(started, { start: '2026-08-08', days: 2 });
  const outsideRange = submitWorkerLeave(started, { start: '2027-01-04', days: 2 });
  const valid = submitWorkerLeave(started, { start: '2026-08-11', days: 2 });

  assert.equal(weekend.workerLeaveRequest.start, '2026-08-10');
  assert.equal(outsideRange.workerLeaveRequest.start, '2026-08-10');
  assert.equal(valid.workerLeaveRequest.start, '2026-08-11');
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
