import test from 'node:test';
import assert from 'node:assert/strict';
import { createToastCenter, normalizeToast, pulseElement } from '../notifications.js';

test('normalizira toast i ograničava tekst', () => {
  const toast = normalizeToast({ title: '  Uspjeh ', message: ' Evidencija spremljena. ', tone: 'success' });
  assert.deepEqual(toast, { title: 'Uspjeh', message: 'Evidencija spremljena.', tone: 'success' });
});

test('nepoznati tone vraća info', () => {
  assert.equal(normalizeToast({ tone: 'danger' }).tone, 'info');
});

test('clear otkazuje odgođene i aktivne toast timere', () => {
  let timerId = 0;
  const timers = new Map();
  const cleared = [];

  function createElement() {
    return {
      className: '',
      innerHTML: '',
      children: [],
      setAttribute() {},
      append(...children) { this.children.push(...children); },
      replaceChildren() { this.children = []; },
      addEventListener() {},
      remove() { this.removed = true; }
    };
  }

  const center = createToastCenter({
    documentRef: { createElement },
    setTimeoutRef(callback) {
      const id = ++timerId;
      timers.set(id, callback);
      return id;
    },
    clearTimeoutRef(id) {
      cleared.push(id);
      timers.delete(id);
    }
  });

  const delayed = center.schedule({ title: 'Kasnije' }, 120);
  const item = center.show({ title: 'Sada' });
  assert.equal(center.element.children.length, 1);
  assert.equal(timers.size, 2);

  center.clear();

  assert.equal(center.element.children.length, 0);
  assert.equal(timers.size, 0);
  assert.deepEqual(cleared.sort((a, b) => a - b), [delayed, delayed + 1]);
  assert.equal(item.removed, undefined);
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
