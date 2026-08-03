import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_STEPS, createBootExperience, normalizeBootSteps } from '../boot-experience.js';

test('boot experience ima stabilan zadani slijed', () => {
  assert.equal(DEFAULT_STEPS.length, 4);
  assert.equal(DEFAULT_STEPS.at(-1).progress, 100);
  assert.equal(DEFAULT_STEPS.at(-1).label, 'Command Center je spreman');
});

test('boot experience normalizira neispravne korake', () => {
  const steps = normalizeBootSteps([
    { label: '', progress: -20 },
    { label: 'Gotovo', progress: 150 },
    { progress: '50' }
  ]);

  assert.deepEqual(steps, [
    { label: 'Korak 1', progress: 0 },
    { label: 'Gotovo', progress: 100 },
    { label: 'Korak 3', progress: 50 }
  ]);
});

test('prazan slijed vraća zadane korake', () => {
  assert.equal(normalizeBootSteps([]), DEFAULT_STEPS);
  assert.equal(normalizeBootSteps(null), DEFAULT_STEPS);
});

test('reset prekida aktivnu boot sekvencu', async () => {
  const classes = new Set(['hidden']);
  const label = { textContent: '' };
  const bar = { style: { width: '' } };
  const overlay = {
    className: '',
    innerHTML: '',
    setAttribute() {},
    classList: {
      add(...names) { names.forEach((name) => classes.add(name)); },
      remove(...names) { names.forEach((name) => classes.delete(name)); }
    },
    querySelector(selector) {
      if (selector === '.boot-step') return label;
      if (selector === '.boot-progress span') return bar;
      return null;
    }
  };
  const documentRef = {
    createElement() { return overlay; },
    body: { append() {} }
  };
  const boot = createBootExperience({ documentRef, stepDelayMs: 0 });
  const result = boot.run();
  boot.reset();

  assert.equal(await result, false);
  assert.equal(boot.isRunning(), false);
  assert.equal(classes.has('hidden'), true);
});

test('boot tijekom animacije zaključava pozadinu i nakon završetka je otključava', async () => {
  const attributes = new Set();
  const main = {
    hasAttribute(name) { return attributes.has(name); },
    setAttribute(name) { attributes.add(name); },
    removeAttribute(name) { attributes.delete(name); }
  };
  const overlay = {
    className: '',
    innerHTML: '',
    setAttribute() {},
    focus() { this.focused = true; },
    classList: { add() {}, remove() {} },
    querySelector(selector) {
      if (selector === '.boot-step') return { textContent: '' };
      if (selector === '.boot-progress span') return { style: {} };
      return null;
    }
  };
  const documentRef = {
    querySelector(selector) { return selector === 'main' ? main : null; },
    createElement() { return overlay; },
    body: { append() {} }
  };
  const boot = createBootExperience({ documentRef, reducedMotion: true });
  const result = await boot.run();
  assert.equal(result, true);
  assert.equal(overlay.focused, true);
  assert.equal(attributes.has('inert'), false);
});
