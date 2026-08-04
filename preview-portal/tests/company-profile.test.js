import test from 'node:test';
import assert from 'node:assert/strict';
import { createCompanyProfile, DEFAULT_PROFILE, getProfileSummary } from '../company-profile.js';

test('profil prihvaća podržanu djelatnost i brojčane granice', () => {
  const profile = createCompanyProfile({ industry: 'Logistika', employees: '120', locations: '3', shifts: '3' });
  assert.deepEqual(profile, { industry: 'Logistika', employees: 120, locations: 3, shifts: 3 });
});

test('neispravni podaci vraćaju sigurne zadane vrijednosti i granice', () => {
  const profile = createCompanyProfile({ industry: 'Nepoznato', employees: -10, locations: 999, shifts: 8 });
  assert.equal(profile.industry, DEFAULT_PROFILE.industry);
  assert.equal(profile.employees, 5);
  assert.equal(profile.locations, 8);
  assert.equal(profile.shifts, 4);
});

test('sažetak ograničava terminalsku vizualizaciju na osam uređaja', () => {
  const summary = getProfileSummary(createCompanyProfile({ employees: 1000, locations: 8 }));
  assert.equal(summary.terminals, 8);
});

test('sažetak deterministički računa terminale i prisutnost', () => {
  const summary = getProfileSummary(createCompanyProfile({ industry: 'Građevina', employees: 81, locations: 2, shifts: 1 }));
  assert.equal(summary.terminals, 3);
  assert.ok(summary.planned > summary.present);
  assert.ok(summary.present >= 0);
});
