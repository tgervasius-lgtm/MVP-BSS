import test from 'node:test';
import assert from 'node:assert/strict';
import { INITIAL_STATE, startDemo, registerEmployee, resetDemo } from '../state.js';

test('startDemo otvara iskustvo bez mijenjanja metrika', () => {
  const next = startDemo(INITIAL_STATE);
  assert.equal(next.started, true);
  assert.equal(next.presentCount, 47);
});

test('RFID prijava povećava broj prisutnih samo jednom', () => {
  const once = registerEmployee({ ...INITIAL_STATE, started: true });
  const twice = registerEmployee(once);
  assert.equal(once.presentCount, 48);
  assert.equal(twice.presentCount, 48);
  assert.equal(twice.scanned, true);
});

test('reset vraća determinističko početno stanje', () => {
  assert.deepEqual(resetDemo(), INITIAL_STATE);
});
