import test from 'node:test';
import assert from 'node:assert/strict';
import { createTerminalFeedback } from '../terminal-effects.js';

test('zvuk je isključen po zadanim postavkama', async () => {
  let created = 0;
  const feedback = createTerminalFeedback({ audioFactory: () => { created += 1; return {}; } });
  assert.equal(feedback.isEnabled(), false);
  assert.equal(await feedback.playSuccess(), false);
  assert.equal(created, 0);
});

test('korisnik može uključiti i isključiti zvuk', () => {
  const feedback = createTerminalFeedback();
  assert.equal(feedback.setEnabled(true), true);
  assert.equal(feedback.isEnabled(), true);
  assert.equal(feedback.setEnabled(false), false);
});

test('greška audio sustava ne prekida demo', async () => {
  const feedback = createTerminalFeedback({ audioFactory: () => { throw new Error('blocked'); } });
  feedback.setEnabled(true);
  assert.equal(await feedback.playSuccess(), false);
});
