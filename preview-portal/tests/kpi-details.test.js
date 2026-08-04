import test from 'node:test';
import assert from 'node:assert/strict';
import { KPI_DETAILS, buildKpiDetails, getKpiDetail } from '../kpi-details.js';

test('vraća definirane KPI detalje', () => {
  assert.equal(getKpiDetail('present')?.title, 'Prisutni zaposlenici');
  assert.equal(getKpiDetail('late')?.items.length, 3);
  assert.equal(getKpiDetail('absent')?.items[0], '2 · godišnji odmor');
});

test('nepoznati KPI ne vraća sadržaj', () => {
  assert.equal(getKpiDetail('unknown'), null);
});

test('KPI fixture ostaje nepromjenjiv', () => {
  assert.equal(Object.isFrozen(KPI_DETAILS), true);
  assert.equal(Object.isFrozen(KPI_DETAILS.present), true);
  assert.equal(Object.isFrozen(KPI_DETAILS.present.items), true);
});

test('personalizirani KPI detalji koriste samo agregirane brojeve', () => {
  const details = buildKpiDetails({ present: 2, late: 1, absent: 1 });
  assert.deepEqual(details.present.items, ['2 · evidentirano', '2 · još nije prisutno']);
  assert.deepEqual(details.late.items, ['1 · čeka provjeru']);
  assert.deepEqual(details.absent.items, ['1 · godišnji odmor']);
  assert.doesNotMatch(details.present.items.join(' '), /Horvat|Kovač|Novak/);
});
