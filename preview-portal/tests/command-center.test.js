import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCommandCenterModel } from '../command-center.js';

test('gradi operativni pregled iz profila i napretka', () => {
  const model = buildCommandCenterModel({
    profile: { employees: 68, locations: 2 },
    summary: { terminals: 3 },
    presentCount: 48,
    completed: 2,
    total: 5
  });

  assert.equal(model.locations, 2);
  assert.equal(model.terminals, 3);
  assert.equal(model.online, 3);
  assert.equal(model.presentCount, 48);
  assert.equal(model.progress, 40);
  assert.deepEqual(model.warnings, ['Nema kritičnih upozorenja.']);
});

test('označava sinkronizaciju i nisku prisutnost', () => {
  const model = buildCommandCenterModel({
    profile: { employees: 100, locations: 4 },
    summary: { terminals: 6 },
    presentCount: 50,
    completed: 5,
    total: 5
  });

  assert.equal(model.online, 5);
  assert.equal(model.progress, 100);
  assert.equal(model.warnings.length, 2);
});

test('ograničava neispravne ulaze', () => {
  const model = buildCommandCenterModel({ profile: {}, summary: {}, presentCount: -3, completed: 9, total: 5 });
  assert.equal(model.locations, 1);
  assert.equal(model.terminals, 1);
  assert.equal(model.presentCount, 0);
  assert.equal(model.progress, 100);
});
