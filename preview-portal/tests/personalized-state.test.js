import test from 'node:test';
import assert from 'node:assert/strict';
import { approveLeave, configureDemo, generateReport, registerEmployee, resetDemo, startDemo } from '../state.js';

test('konfiguracija prije početka prilagođava metrike i profil', () => {
  const configured = configureDemo(resetDemo(), { industry: 'Trgovina', employees: 40, locations: 4, shifts: 2 });
  assert.equal(configured.profile.industry, 'Trgovina');
  assert.equal(configured.profile.employees, 40);
  assert.equal(configured.summary.terminals, 4);
  assert.equal(configured.presentCount, configured.summary.present);
});

test('profil se ne može mijenjati nakon pokretanja sandboxa', () => {
  const started = startDemo(configureDemo(resetDemo(), { industry: 'Ured', employees: 25, locations: 1, shifts: 1 }));
  const unchanged = configureDemo(started, { industry: 'Logistika', employees: 200, locations: 5, shifts: 3 });
  assert.equal(unchanged, started);
});

test('RFID prijava povećava personaliziranu prisutnost samo jednom', () => {
  const started = startDemo(configureDemo(resetDemo(), { industry: 'Građevina', employees: 90, locations: 3, shifts: 2 }));
  const once = registerEmployee(started);
  const twice = registerEmployee(once);
  assert.equal(once.presentCount, started.presentCount + 1);
  assert.equal(twice.presentCount, once.presentCount);
});

test('personalizirani sandbox bilježi radnje izvan redoslijeda bez utjecaja na prisutnost', () => {
  const started = startDemo(configureDemo(resetDemo(), { industry: 'Ured', employees: 25, locations: 1, shifts: 1 }));
  const report = generateReport(started);
  const leave = approveLeave(report);
  assert.equal(leave.presentCount, started.presentCount);
  assert.equal(leave.reportGenerated, true);
  assert.equal(leave.leaveApproved, true);
});
