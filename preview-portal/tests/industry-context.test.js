import test from 'node:test';
import assert from 'node:assert/strict';
import { getIndustryContext } from '../industry-context.js';

test('svaka glavna djelatnost dobiva relevantan operativni kontekst', () => {
  assert.equal(getIndustryContext('Proizvodnja').area, 'Ulaz proizvodnje');
  assert.equal(getIndustryContext('Građevina').manager, 'Voditelj gradilišta');
  assert.equal(getIndustryContext('Logistika').team, 'Skladišni tim');
  assert.equal(getIndustryContext('Trgovina').moment, 'otvaranje poslovnice');
  assert.equal(getIndustryContext('Ured').area, 'Glavni ulaz');
});

test('nepoznata djelatnost koristi siguran opći kontekst', () => {
  assert.deepEqual(getIndustryContext('Nepoznata'), getIndustryContext('Ostalo'));
});
