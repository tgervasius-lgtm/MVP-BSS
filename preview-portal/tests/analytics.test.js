import test from 'node:test';
import assert from 'node:assert/strict';
import { createAnalyticsEvent, createMemoryAnalyticsSink } from '../analytics.js';

test('analytics događaj sprema samo dopuštena agregirana polja', () => {
  const event = createAnalyticsEvent('demo_started', {
    industry: 'Proizvodnja',
    employees: 68,
    locations: 2,
    shifts: 2,
    email: 'ne-smije@u-event.hr'
  }, () => 123);

  assert.deepEqual(event, {
    name: 'demo_started',
    timestamp: 123,
    schemaVersion: 1,
    payload: {
      industry: 'Proizvodnja',
      employeeBand: '51-100',
      locationBand: '2-3',
      shifts: 2
    }
  });
});

test('analytics odbija nepoznat tip događaja', () => {
  assert.throws(() => createAnalyticsEvent('email_collected', {}), /Unsupported analytics event/);
});

test('vrijednosti se ograničavaju i čiste', () => {
  const event = createAnalyticsEvent('mission_completed', {
    mission: '<report_generated>',
    progress: 20
  }, () => 1);

  assert.equal(event.payload.mission, 'report_generated');
  assert.equal(event.payload.progress, 20);
});

test('memorijski sink omogućuje determinističku provjeru toka', () => {
  const sink = createMemoryAnalyticsSink();
  sink.track('mode_selected', { mode: 'free', employees: 12 });
  sink.track('demo_started', { employees: 12 });
  sink.track('demo_completed', { progress: 100 });
  assert.equal(sink.snapshot().length, 3);
  assert.equal(sink.snapshot()[0].payload.mode, 'free');
  sink.clear();
  assert.deepEqual(sink.snapshot(), []);
});

test('analytics sprema samo podržani način pregleda', () => {
  assert.equal(createAnalyticsEvent('mode_selected', { mode: 'assisted' }).payload.mode, 'assisted');
  assert.equal(Object.hasOwn(createAnalyticsEvent('mode_selected', { mode: 'tajni-mod' }).payload, 'mode'), false);
});
