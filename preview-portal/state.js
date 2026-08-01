import { applyExperienceEvent, createExperience, EXPERIENCE_EVENTS, getExperienceView } from './experience-engine.js';

export const ROLES = Object.freeze({
  director: 'Direktor',
  admin: 'Administrator',
  manager: 'Voditelj',
  worker: 'Radnik',
  accounting: 'Knjigovodstvo'
});

export const INITIAL_STATE = Object.freeze({
  started: false,
  activeRole: 'director',
  experience: createExperience(),
  presentCount: 47,
  scanned: false,
  leaveApproved: false,
  correctionResolved: false,
  workerReviewed: false,
  reportGenerated: false
});

function advance(state, eventType, changes) {
  const experience = applyExperienceEvent(state.experience, eventType);
  if (experience === state.experience) return state;
  const view = getExperienceView(experience);
  return { ...state, ...changes, experience, activeRole: view.role };
}

export function getGuide(state) {
  return getExperienceView(state.experience);
}

export function startDemo(state = INITIAL_STATE) {
  return { ...state, started: true };
}

export function selectRole(state, role) {
  if (!Object.hasOwn(ROLES, role)) return state;
  return { ...state, activeRole: role };
}

export function registerEmployee(state) {
  return advance(state, EXPERIENCE_EVENTS.EMPLOYEE_CHECKED_IN, {
    presentCount: state.presentCount + 1,
    scanned: true
  });
}

export function resolveCorrection(state) {
  return advance(state, EXPERIENCE_EVENTS.CORRECTION_RESOLVED, { correctionResolved: true });
}

export function approveLeave(state) {
  return advance(state, EXPERIENCE_EVENTS.LEAVE_APPROVED, { leaveApproved: true });
}

export function reviewWorker(state) {
  return advance(state, EXPERIENCE_EVENTS.WORKER_REVIEWED, { workerReviewed: true });
}

export function generateReport(state) {
  return advance(state, EXPERIENCE_EVENTS.REPORT_GENERATED, { reportGenerated: true });
}

export function resetDemo() {
  return {
    ...INITIAL_STATE,
    experience: createExperience()
  };
}
