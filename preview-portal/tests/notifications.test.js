import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeToast, pulseElement } from '../notifications.js';

test('normalizira toast i ograničava tekst', () => {
  const toast = normalizeToast({ title: '  Uspjeh ', message: ' Evidencija spremljena. ', tone: 'success' });
  assert.deepEqual(toast, { title: 'Uspjeh', message: 'Evidencija spremljena.', tone: 'success' });
});

test('nepoznati tone vraća info', () => {
  assert.equal(normalizeToast({ tone: 'danger' }).tone, 'info');
});

test('pulseElement sigurno obrađuje valjani i nevaljani element', () => {
  const operations = [];
  const element = {
    offsetWidth: 10,
    classList: {
      remove(name) { operations.push(`remove:${name}`); },
      add(name) { operations.push(`add:${name}`); }
    }
  };
  assert.equal(pulseElement(element), true);
  assert.deepEqual(operations, ['remove:value-pulse', 'add:value-pulse']);
  assert.equal(pulseElement(null), false);
});
