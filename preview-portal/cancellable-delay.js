export function createCancellableDelay({
  setTimeoutRef = globalThis.setTimeout?.bind(globalThis),
  clearTimeoutRef = globalThis.clearTimeout?.bind(globalThis)
} = {}) {
  let pending = null;

  function cancel() {
    if (!pending) return false;
    clearTimeoutRef?.(pending.timer);
    pending.resolve(false);
    pending = null;
    return true;
  }

  function wait(delayMs = 0) {
    cancel();
    const delay = Math.max(0, Number(delayMs) || 0);
    return new Promise((resolve) => {
      const timer = setTimeoutRef?.(() => {
        pending = null;
        resolve(true);
      }, delay);
      pending = { timer, resolve };
    });
  }

  return Object.freeze({ wait, cancel, isPending: () => pending !== null });
}
