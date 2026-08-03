import { MORNING_SHIFT_SCENARIO } from './scenarios/morning-shift.js';

export const EXPERIENCE_EVENTS = Object.freeze({
  EMPLOYEE_CHECKED_IN: 'EMPLOYEE_CHECKED_IN',
  CORRECTION_RESOLVED: 'CORRECTION_RESOLVED',
  LEAVE_APPROVED: 'LEAVE_APPROVED',
  WORKER_LEAVE_SUBMITTED: 'WORKER_LEAVE_SUBMITTED',
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
  const scenarioEvents = new Set(scenario.steps.map((step) => step.event));
  if (!scenarioEvents.has(eventType)) return experience;
  if (experience.completedEvents.includes(eventType)) return experience;

  const completedEvents = [...experience.completedEvents, eventType];
  return {
    ...experience,
    completedEvents,
    currentStep: completedEvents.length
  };
}

export function getExperienceView(experience, scenario = MORNING_SHIFT_SCENARIO) {
  const scenarioEvents = [...new Set(scenario.steps.map((step) => step.event))];
  const completedEvents = experience.completedEvents.filter((event) => scenarioEvents.includes(event));
  const total = scenarioEvents.length;
  const complete = completedEvents.length === total;
  const step = complete ? null : scenario.steps.find((candidate) => !completedEvents.includes(candidate.event));

  return {
    complete,
    completed: completedEvents.length,
    total,
    progress: total === 0 ? 100 : Math.round((completedEvents.length / total) * 100),
    role: step?.role ?? 'accounting',
    stepId: step?.id ?? null,
    event: step?.event ?? null,
    title: step?.title ?? 'Radni dan je završen.',
    guide: step?.guide ?? 'Pregledali ste cijeli tok od terminala do obračunskog izvještaja.'
  };
}
