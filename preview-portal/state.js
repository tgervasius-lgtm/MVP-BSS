export const ROLES = Object.freeze({
  director: 'Direktor',
  manager: 'Voditelj',
  worker: 'Radnik'
});

export const INITIAL_STATE = Object.freeze({
  started: false,
  activeRole: 'director',
  presentCount: 47,
  scanned: false,
  leaveApproved: false
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
  return { ...state, presentCount: state.presentCount + 1, scanned: true };
}

export function approveLeave(state) {
  if (state.leaveApproved) return state;
  return { ...state, leaveApproved: true };
}

export function resetDemo() {
  return { ...INITIAL_STATE };
}
