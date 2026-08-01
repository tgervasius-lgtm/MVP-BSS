import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_STEPS, normalizeBootSteps } from '../boot-experience.js';

test('boot experience ima stabilan zadani slijed', () => {
  assert.equal(DEFAULT_STEPS.length, 4);
  assert.equal(DEFAULT_STEPS.at(-1).progress, 100);
  assert.equal(DEFAULT_STEPS.at(-1).label, 'Command Center je spreman');
});

test('boot experience normalizira neispravne korake', () => {
  const steps = normalizeBootSteps([
    { label: '', progress: -20 },
    { label: 'Gotovo', progress: 150 },
    { progress: '50' }
  ]);

  assert.deepEqual(steps, [
    { label: 'Korak 1', progress: 0 },
    { label: 'Gotovo', progress: 100 },
    { label: 'Korak 3', progress: 50 }
  ]);
});

test('prazan slijed vraća zadane korake', () => {
  assert.equal(normalizeBootSteps([]), DEFAULT_STEPS);
  assert.equal(normalizeBootSteps(null), DEFAULT_STEPS);
});
