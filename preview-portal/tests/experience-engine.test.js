import test from 'node:test';
import assert from 'node:assert/strict';
import { applyExperienceEvent, createExperience, EXPERIENCE_EVENTS, getExperienceView } from '../experience-engine.js';

test('engine prihvaća svaku jedinstvenu radnju scenarija, neovisno o redoslijedu', () => {
  const initial = createExperience();
  const next = applyExperienceEvent(initial, EXPERIENCE_EVENTS.LEAVE_APPROVED);
  assert.equal(next.currentStep, 1);
  assert.deepEqual(next.completedEvents, [EXPERIENCE_EVENTS.LEAVE_APPROVED]);
  assert.equal(applyExperienceEvent(next, EXPERIENCE_EVENTS.LEAVE_APPROVED), next);
  assert.equal(applyExperienceEvent(next, 'UNKNOWN_EVENT'), next);
});

test('engine preporučuje prvu nezavršenu radnju i napredak računa po jedinstvenim događajima', () => {
  let experience = createExperience();
  experience = applyExperienceEvent(experience, EXPERIENCE_EVENTS.LEAVE_APPROVED);
  const view = getExperienceView(experience);
  assert.equal(view.role, 'admin');
  assert.equal(view.stepId, 'attendance');
  assert.equal(view.event, EXPERIENCE_EVENTS.EMPLOYEE_CHECKED_IN);
  assert.equal(view.completed, 1);
  assert.equal(view.progress, 20);
  assert.match(view.guide, /RFID/i);
});

test('cijeli scenarij završava na 100 posto i izvan izvornog redoslijeda', () => {
  let experience = createExperience();
  for (const event of [
    EXPERIENCE_EVENTS.REPORT_GENERATED,
    EXPERIENCE_EVENTS.CORRECTION_RESOLVED,
    EXPERIENCE_EVENTS.WORKER_LEAVE_SUBMITTED,
    EXPERIENCE_EVENTS.EMPLOYEE_CHECKED_IN,
    EXPERIENCE_EVENTS.LEAVE_APPROVED
  ]) {
    experience = applyExperienceEvent(experience, event);
  }
  const view = getExperienceView(experience);
  assert.equal(view.complete, true);
  assert.equal(view.completed, 5);
  assert.equal(view.progress, 100);
  assert.equal(view.event, null);
});
