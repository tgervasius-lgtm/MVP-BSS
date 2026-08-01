import test from 'node:test';
import assert from 'node:assert/strict';
import { createBusinessSummary } from '../business-summary.js';

test('poslovni sažetak koristi simulirani profil i rezultat radnog dana', () => {
  const result = createBusinessSummary({
    profile: { industry: 'Logistika', employees: 68, locations: 2, shifts: 2 },
    summary: { terminals: 2, planned: 52 },
    presentCount: 48
  });

  assert.equal(result.industry, 'Logistika');
  assert.equal(result.present, 48);
  assert.equal(result.attendanceLabel, '48 od 52 planiranih zaposlenika evidentirano');
  assert.match(result.profileLabel, /68 zaposlenika/);
  assert.match(result.profileLabel, /2 terminala/);
});

test('poslovni sažetak sigurno obrađuje nepotpune podatke', () => {
  const result = createBusinessSummary();
  assert.equal(result.present, 0);
  assert.equal(result.planned, 0);
  assert.equal(result.industry, 'Tvrtka');
});
