import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { buildCommandCenterModel, createCommandCenterPanel } from '../command-center.js';

test('gradi operativni pregled i kompoziciju planirane smjene', () => {
  const model = buildCommandCenterModel({
    profile: { employees: 68, locations: 2 },
    summary: { terminals: 3, planned: 52 },
    presentCount: 48
  });

  assert.equal(model.locations, 2);
  assert.equal(model.terminals, 3);
  assert.equal(model.online, 3);
  assert.equal(model.planned, 52);
  assert.equal(model.presentCount, 48);
  assert.equal(model.late, 2);
  assert.equal(model.absent, 2);
  assert.equal(model.attendanceRate, 92);
  assert.equal(model.hasWarnings, false);
  assert.deepEqual(model.warnings, ['Nema kritičnih upozorenja.']);
});

test('označava sinkronizaciju i nisku prisutnost', () => {
  const model = buildCommandCenterModel({
    profile: { employees: 100, locations: 4 },
    summary: { terminals: 6, planned: 76 },
    presentCount: 50
  });

  assert.equal(model.online, 5);
  assert.equal(model.late, 23);
  assert.equal(model.absent, 3);
  assert.equal(model.hasWarnings, true);
  assert.equal(model.warnings.length, 2);
});

test('ograničava neispravne ulaze', () => {
  const model = buildCommandCenterModel({ profile: {}, summary: {}, presentCount: -3 });
  assert.equal(model.locations, 1);
  assert.equal(model.terminals, 1);
  assert.equal(model.presentCount, 0);
  assert.equal(model.presentCount + model.late + model.absent, model.planned);
  assert.ok(model.presentShare >= 0);
  assert.ok(model.lateEndShare <= 100);
});

test('command center prikazuje jedan kompaktan graf i tri izravne KPI kontrole', () => {
  const dom = new JSDOM('<!doctype html><body></body>');
  globalThis.document = dom.window.document;
  const panel = createCommandCenterPanel();
  document.body.append(panel.element);

  panel.update({
    profile: { employees: 68, locations: 2 },
    summary: { terminals: 2, planned: 52 },
    presentCount: 47
  });

  assert.equal(panel.element.querySelectorAll('.attendance-ring').length, 1);
  assert.equal(panel.element.querySelectorAll('button[data-kpi]').length, 3);
  assert.equal(panel.element.querySelector('#presentCount').textContent, '47');
  assert.equal(panel.element.querySelector('#lateCount').textContent, '3');
  assert.equal(panel.element.querySelector('#absentCount').textContent, '2');
  assert.equal(panel.element.querySelector('[data-field="terminals-label"]').textContent, 'terminala online');
  assert.match(panel.element.querySelector('.attendance-ring').getAttribute('aria-label'), /47 prisutnih, 3 kasni i 2 odsutnih/);
  assert.match(panel.element.querySelector('[data-kpi="present"]').getAttribute('aria-label'), /90 posto/);

  dom.window.close();
  delete globalThis.document;
});
