import test from 'node:test';
import assert from 'node:assert/strict';
import { createCancellableDelay } from '../cancellable-delay.js';

function createTimers() {
  let callback;
  let cleared = false;
  return {
    setTimeoutRef(next) { callback = next; return 17; },
    clearTimeoutRef(timer) { assert.equal(timer, 17); cleared = true; },
    fire() { callback?.(); },
    wasCleared() { return cleared; }
  };
}

test('odgođena radnja završava samo kada nije otkazana', async () => {
  const timers = createTimers();
  const delay = createCancellableDelay(timers);
  const result = delay.wait(520);
  assert.equal(delay.isPending(), true);
  timers.fire();
  assert.equal(await result, true);
  assert.equal(delay.isPending(), false);
});

test('reset odmah prekida odgođenu radnju', async () => {
  const timers = createTimers();
  const delay = createCancellableDelay(timers);
  const result = delay.wait(520);
  assert.equal(delay.cancel(), true);
  assert.equal(await result, false);
  assert.equal(timers.wasCleared(), true);
  assert.equal(delay.isPending(), false);
});
