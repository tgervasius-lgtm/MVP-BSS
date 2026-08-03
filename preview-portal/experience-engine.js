import { MORNING_SHIFT_SCENARIO } from './scenarios/morning-shift.js';

export const EXPERIENCE_EVENTS = Object.freeze({
  EMPLOYEE_CHECKED_IN: 'EMPLOYEE_CHECKED_IN',
  CORRECTION_RESOLVED: 'CORRECTION_RESOLVED',
  LEAVE_APPROVED: 'LEAVE_APPROVED',
  WORKER_REVIEWED: 'WORKER_REVIEWED',
  REPORT_GENERATED: 'REPORT_GENERATED'
});

export function createExperience(scenario = MORNING_SHIFT_SCENARIO) {
  return {
    scenarioId: scenario.id,
    completedEvents: [],
    currentStep: 0
  };
}

export function applyExperienceEvent(experience, eventType, scenario = MORNING_SHIFT_SCENARIO) {
  const step = scenario.steps[experience.currentStep];
  if (!step || step.event !== eventType) return experience;
  if (experience.completedEvents.includes(eventType)) return experience;

  return {
    ...experience,
    completedEvents: [...experience.completedEvents, eventType],
    currentStep: Math.min(experience.currentStep + 1, scenario.steps.length)
  };
}

export function getExperienceView(experience, scenario = MORNING_SHIFT_SCENARIO) {
  const total = scenario.steps.length;
  const complete = experience.currentStep >= total;
  const step = complete ? null : scenario.steps[experience.currentStep];

  return {
    complete,
    completed: experience.currentStep,
    total,
    progress: total === 0 ? 100 : Math.round((experience.currentStep / total) * 100),
    role: step?.role ?? 'accounting',
    stepId: step?.id ?? null,
    event: step?.event ?? null,
    title: step?.title ?? 'Radni dan je završen.',
    guide: step?.guide ?? 'Pregledali ste cijeli tok od terminala do obračunskog izvještaja.'
  };
}
