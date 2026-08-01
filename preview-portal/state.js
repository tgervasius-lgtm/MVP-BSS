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
  guideStep: 0,
  presentCount: 47,
  scanned: false,
  leaveApproved: false,
  correctionResolved: false,
  workerReviewed: false,
  reportGenerated: false
});

export function startDemo(state = INITIAL_STATE) {
  return { ...state, started: true };
}

export function selectRole(state, role) {
  if (!Object.hasOwn(ROLES, role)) return state;
  return { ...state, activeRole: role };
}

export function registerEmployee(state) {
  if (state.scanned) return state;
  return { ...state, presentCount: state.presentCount + 1, scanned: true, guideStep: Math.max(state.guideStep, 1), activeRole: 'admin' };
}

export function resolveCorrection(state) {
  if (state.correctionResolved) return state;
  return { ...state, correctionResolved: true, guideStep: Math.max(state.guideStep, 2), activeRole: 'manager' };
}

export function approveLeave(state) {
  if (state.leaveApproved) return state;
  return { ...state, leaveApproved: true, guideStep: Math.max(state.guideStep, 3), activeRole: 'worker' };
}

export function reviewWorker(state) {
  if (state.workerReviewed) return state;
  return { ...state, workerReviewed: true, guideStep: Math.max(state.guideStep, 4), activeRole: 'accounting' };
}

export function generateReport(state) {
  if (state.reportGenerated) return state;
  return { ...state, reportGenerated: true, guideStep: 5 };
}

export function resetDemo() {
  return { ...INITIAL_STATE };
}
