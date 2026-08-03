import test from 'node:test';
import assert from 'node:assert/strict';
import { applyExperienceEvent, createExperience, EXPERIENCE_EVENTS, getExperienceView } from '../experience-engine.js';

test('engine prihvaća samo događaj trenutačne misije', () => {
  const initial = createExperience();
  assert.equal(applyExperienceEvent(initial, EXPERIENCE_EVENTS.LEAVE_APPROVED), initial);
  const next = applyExperienceEvent(initial, EXPERIENCE_EVENTS.EMPLOYEE_CHECKED_IN);
  assert.equal(next.currentStep, 1);
});

test('engine izračunava ulogu, tekst i napredak iz scenarija', () => {
  let experience = createExperience();
  experience = applyExperienceEvent(experience, EXPERIENCE_EVENTS.EMPLOYEE_CHECKED_IN);
  const view = getExperienceView(experience);
  assert.equal(view.role, 'admin');
  assert.equal(view.stepId, 'correction');
  assert.equal(view.event, EXPERIENCE_EVENTS.CORRECTION_RESOLVED);
  assert.equal(view.completed, 1);
  assert.equal(view.progress, 20);
  assert.match(view.guide, /korekciju/i);
});

test('cijeli scenarij završava na 100 posto', () => {
  let experience = createExperience();
  for (const event of Object.values(EXPERIENCE_EVENTS)) {
    experience = applyExperienceEvent(experience, event);
  }
  const view = getExperienceView(experience);
  assert.equal(view.complete, true);
  assert.equal(view.progress, 100);
  assert.equal(view.event, null);
});
