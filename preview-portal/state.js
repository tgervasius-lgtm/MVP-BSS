import { applyExperienceEvent, createExperience, EXPERIENCE_EVENTS, getExperienceView } from './experience-engine.js';
import { createCompanyProfile, DEFAULT_PROFILE, getProfileSummary } from './company-profile.js';

export const ROLES = Object.freeze({
  director: 'Direktor',
  admin: 'Administrator',
  manager: 'Voditelj',
  worker: 'Radnik',
  accounting: 'Knjigovodstvo'
});

function createInitialState(profile = DEFAULT_PROFILE) {
  const normalizedProfile = createCompanyProfile(profile);
  const summary = getProfileSummary(normalizedProfile);
  return {
    started: false,
    activeRole: 'director',
    profile: normalizedProfile,
    summary,
    experience: createExperience(),
    presentCount: summary.present,
    scanned: false,
    leaveApproved: false,
    correctionResolved: false,
    workerReviewed: false,
    reportGenerated: false
  };
}

export const INITIAL_STATE = Object.freeze(createInitialState());

function advance(state, eventType, changes) {
  if (!state.started) return state;
  const experience = applyExperienceEvent(state.experience, eventType);
  if (experience === state.experience) return state;
  return { ...state, ...changes, experience };
}

export function getGuide(state) {
  return getExperienceView(state.experience);
}

export function configureDemo(state, profileInput) {
  if (state.started) return state;
  return createInitialState(profileInput);
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

export function resetDemo(profile = DEFAULT_PROFILE) {
  return createInitialState(profile);
}
