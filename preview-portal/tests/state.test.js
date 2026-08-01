import test from 'node:test';
import assert from 'node:assert/strict';
import { INITIAL_STATE, startDemo, selectRole, registerEmployee, approveLeave, resetDemo } from '../state.js';

test('startDemo otvara iskustvo bez mijenjanja metrika', () => {
  const next = startDemo(INITIAL_STATE);
  assert.equal(next.started, true);
  assert.equal(next.presentCount, 47);
  assert.equal(next.activeRole, 'director');
});

test('promjena uloge čuva zajedničko demo stanje', () => {
  const scanned = registerEmployee({ ...INITIAL_STATE, started: true });
  const manager = selectRole(scanned, 'manager');
  const worker = selectRole(manager, 'worker');
  assert.equal(worker.activeRole, 'worker');
  assert.equal(worker.presentCount, 48);
  assert.equal(worker.scanned, true);
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

test('odobrenje godišnjeg je idempotentno', () => {
  const once = approveLeave(INITIAL_STATE);
  const twice = approveLeave(once);
  assert.equal(once.leaveApproved, true);
  assert.equal(twice.leaveApproved, true);
});

test('reset vraća determinističko početno stanje', () => {
  assert.deepEqual(resetDemo(), INITIAL_STATE);
});
