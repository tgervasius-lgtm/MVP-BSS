import { applyExperienceEvent, createExperience, EXPERIENCE_EVENTS, getExperienceView } from './experience-engine.js';
import { createCompanyProfile, DEFAULT_PROFILE, getProfileSummary } from './company-profile.js';

export const ROLES = Object.freeze({
  admin: 'Uprava',
  manager: 'Voditelj',
  worker: 'Radnik',
  accounting: 'Knjigovodstvo'
});

function createInitialState(profile = DEFAULT_PROFILE) {
  const normalizedProfile = createCompanyProfile(profile);
  const summary = getProfileSummary(normalizedProfile);
  return {
    started: false,
    activeRole: 'admin',
    profile: normalizedProfile,
    summary,
    experience: createExperience(),
    presentCount: summary.present,
    scanned: false,
    leaveApproved: false,
    correctionResolved: false,
    reportGenerated: false,
    workerCardReplaced: false,
    workerLeaveRequest: null
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

export function generateReport(state) {
  return advance(state, EXPERIENCE_EVENTS.REPORT_GENERATED, { reportGenerated: true });
}

export function replaceWorkerCard(state) {
  if (!state.started || state.workerCardReplaced) return state;
  return { ...state, workerCardReplaced: true };
}

function normalizeLeaveStart(value) {
  const input = String(value ?? '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input)) return '2026-08-10';
  const parsed = new Date(`${input}T12:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== input) return '2026-08-10';
  if (input < '2026-08-04' || input > '2026-12-18') return '2026-08-10';
  if ([0, 6].includes(parsed.getUTCDay())) return '2026-08-10';
  return input;
}

export function submitWorkerLeave(state, request = {}) {
  if (!state.started || state.workerLeaveRequest) return state;
  const start = normalizeLeaveStart(request.start);
  const parsedDays = Number.parseInt(request.days, 10);
  const days = Number.isFinite(parsedDays) ? Math.min(Math.max(parsedDays, 1), 5) : 2;
  return advance(state, EXPERIENCE_EVENTS.WORKER_LEAVE_SUBMITTED, {
    workerLeaveRequest: Object.freeze({
      id: 'ivan-horvat-demo-leave',
      start,
      days,
      status: 'pending'
    })
  });
}

export function decideWorkerLeave(state, decision) {
  if (!state.started || state.workerLeaveRequest?.status !== 'pending') return state;
  if (!['approved', 'rejected'].includes(decision)) return state;
  return {
    ...state,
    workerLeaveRequest: Object.freeze({ ...state.workerLeaveRequest, status: decision })
  };
}

export function resetDemo(profile = DEFAULT_PROFILE) {
  return createInitialState(profile);
}
