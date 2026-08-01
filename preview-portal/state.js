export const INITIAL_STATE = Object.freeze({ started: false, presentCount: 47, scanned: false });

export function startDemo(state = INITIAL_STATE) {
  return { ...state, started: true };
}

export function registerEmployee(state) {
  if (state.scanned) return state;
  return { ...state, presentCount: state.presentCount + 1, scanned: true };
}

export function resetDemo() {
  return { ...INITIAL_STATE };
}
