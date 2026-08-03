import test from 'node:test';
import assert from 'node:assert/strict';
import { createFinalExperienceModel, FINAL_STEPS } from '../final-experience.js';

test('final experience računa stopu prisutnosti', () => {
  const model = createFinalExperienceModel({ industry: 'Proizvodnja', present: 48, planned: 52 });
  assert.equal(model.attendanceRate, 92);
  assert.equal(model.industry, 'Proizvodnja');
  assert.equal(model.steps.length, 5);
  assert.match(model.steps[3].label, /zahtjev za godišnji/i);
});

test('final experience ograničava nevažeće vrijednosti', () => {
  const model = createFinalExperienceModel({ present: -5, planned: 'nije-broj' });
  assert.equal(model.present, 0);
  assert.equal(model.planned, 0);
  assert.equal(model.attendanceRate, 0);
});

test('final experience ne prelazi sto posto', () => {
  const model = createFinalExperienceModel({ present: 12, planned: 10 });
  assert.equal(model.attendanceRate, 100);
  assert.equal(FINAL_STEPS[4].key, 'report');
});
