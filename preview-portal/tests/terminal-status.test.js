import test from 'node:test';
import assert from 'node:assert/strict';
import { createTerminalFixtures } from '../terminal-status.js';

test('generira traženi broj terminala i primarnu lokaciju', () => {
  const fixtures = createTerminalFixtures({ terminals: 3, primaryArea: 'Ulaz skladišta' });
  assert.equal(fixtures.length, 3);
  assert.equal(fixtures[0].name, 'Ulaz skladišta');
  assert.equal(fixtures[0].status, 'online');
  assert.equal(fixtures[2].status, 'syncing');
});

test('ograničava broj terminala na siguran raspon', () => {
  assert.equal(createTerminalFixtures({ terminals: 0 }).length, 1);
  assert.equal(createTerminalFixtures({ terminals: 99 }).length, 8);
});

test('jedan ili dva terminala ostaju online', () => {
  const fixtures = createTerminalFixtures({ terminals: 2 });
  assert.deepEqual(fixtures.map((item) => item.status), ['online', 'online']);
});
