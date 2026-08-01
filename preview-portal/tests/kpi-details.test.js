import test from 'node:test';
import assert from 'node:assert/strict';
import { KPI_DETAILS, getKpiDetail } from '../kpi-details.js';

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
