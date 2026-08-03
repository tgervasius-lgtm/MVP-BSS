import test from 'node:test';
import assert from 'node:assert/strict';
import { buildAttendanceTrend, buildLocationDistribution } from '../director-intelligence.js';

test('trend prisutnosti završava aktualnim brojem prisutnih', () => {
  const trend = buildAttendanceTrend({ employees: 68, present: 48 });
  assert.equal(trend.length, 5);
  assert.equal(trend.at(-1).value, 48);
  assert.equal(trend.at(-1).time, '07:05');
  assert.equal(trend.at(-1).percent, 71);
});

test('visina zadnjeg stupca predstavlja udio planirane smjene', () => {
  const trend = buildAttendanceTrend({ employees: 68, planned: 52, present: 47 });
  assert.equal(trend.at(-1).value, 47);
  assert.equal(trend.at(-1).percent, 90);
  assert.ok(trend.every((point) => point.percent >= 0 && point.percent <= 100));
});

test('raspodjela lokacija zadržava ukupan broj zaposlenika', () => {
  const locations = buildLocationDistribution({ employees: 68, locations: 3 });
  assert.equal(locations.length, 3);
  assert.equal(locations.reduce((sum, item) => sum + item.employees, 0), 68);
});

test('neispravni ulazi koriste sigurne granice', () => {
  assert.equal(buildAttendanceTrend({ employees: 'x', present: -5 }).at(-1).value, 0);
  assert.equal(buildLocationDistribution({ employees: 5000, locations: 99 }).length, 8);
});
