import test from 'node:test';
import assert from 'node:assert/strict';
import { buildOperationalMetrics } from '../operational-metrics.js';

test('zadani profil reproducira konzistentne operativne pokazatelje', () => {
  const metrics = buildOperationalMetrics({
    profile: { employees: 68, locations: 2 },
    summary: { planned: 52 },
    presentCount: 47
  });

  assert.equal(metrics.present + metrics.late + metrics.absent, metrics.planned);
  assert.equal(metrics.teamSize, 24);
  assert.equal(metrics.teamPresent + metrics.teamLate + metrics.teamSick, metrics.teamSize);
  assert.equal(metrics.monthlyHours, 8704);
  assert.equal(metrics.regularHours + metrics.nightHours + metrics.overtimeHours, metrics.monthlyHours);
});

test('mali profil nikada ne prikazuje više radnika od ukupnog broja', () => {
  const metrics = buildOperationalMetrics({
    profile: { employees: 5, locations: 1 },
    summary: { planned: 4 },
    presentCount: 2
  });

  assert.equal(metrics.present + metrics.late + metrics.absent, 4);
  assert.ok(metrics.teamSize <= 5);
  assert.equal(metrics.teamPresent + metrics.teamLate + metrics.teamSick, metrics.teamSize);
  assert.equal(metrics.monthlyHours, 640);
});

test('veliki profil deterministički skalira sate i ograničava primjer tima', () => {
  const metrics = buildOperationalMetrics({
    profile: { employees: 250, locations: 5 },
    summary: { planned: 190 },
    presentCount: 171
  });

  assert.equal(metrics.teamSize, 40);
  assert.equal(metrics.monthlyHours, 32000);
  assert.equal(metrics.regularHours + metrics.nightHours + metrics.overtimeHours, 32000);
  assert.equal(metrics.present + metrics.late + metrics.absent, 190);
});

test('broj smjena mijenja simulirani omjer noćnih i prekovremenih sati', () => {
  const oneShift = buildOperationalMetrics({ profile: { employees: 100, shifts: 1 }, summary: { planned: 76 }, presentCount: 68 });
  const fourShifts = buildOperationalMetrics({ profile: { employees: 100, shifts: 4 }, summary: { planned: 76 }, presentCount: 68 });

  assert.equal(oneShift.nightHours, 0);
  assert.ok(fourShifts.nightHours > oneShift.nightHours);
  assert.ok(fourShifts.overtimeHours > oneShift.overtimeHours);
  assert.equal(fourShifts.regularHours + fourShifts.nightHours + fourShifts.overtimeHours, fourShifts.monthlyHours);
});
