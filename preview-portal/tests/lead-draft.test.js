import test from 'node:test';
import assert from 'node:assert/strict';
import { createLeadSummary, normalizeLeadDraft, validateLeadDraft } from '../lead-draft.js';

test('normalizira i ograničava lokalni nacrt', () => {
  const draft = normalizeLeadDraft({ company: '  BSSProject d.o.o. ', contact: ' Tomislav ', email: ' TEST@EXAMPLE.COM ', interest: 'pilot' });
  assert.deepEqual(draft, { company: 'BSSProject d.o.o.', contact: 'Tomislav', email: 'test@example.com', interest: 'pilot' });
});

test('odbija nepotpun ili neispravan nacrt', () => {
  const result = validateLeadDraft({ company: '', contact: 'T', email: 'nije-email', interest: 'other' });
  assert.equal(result.valid, false);
  assert.deepEqual(Object.keys(result.errors).sort(), ['company', 'contact', 'email', 'interest']);
});

test('generira sažetak samo za valjan nacrt', () => {
  const summary = createLeadSummary(
    { company: 'Primjer d.o.o.', contact: 'Ana Kovač', email: 'ana@example.com', interest: 'online' },
    { industry: 'Logistika', employees: 80, locations: 2, shifts: 2 }
  );
  assert.match(summary, /Primjer d\.o\.o\./);
  assert.match(summary, /Logistika/);
  assert.match(summary, /Zaposlenici: 80/);
});

test('ne generira sažetak iz nevaljanih podataka', () => {
  assert.throws(() => createLeadSummary({}), /invalid/i);
});
