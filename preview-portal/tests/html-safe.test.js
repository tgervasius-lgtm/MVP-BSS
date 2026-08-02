import test from 'node:test';
import assert from 'node:assert/strict';
import { escapeHtml } from '../html-safe.js';

test('escapeHtml neutralizira HTML i atribute', () => {
  const input = `<img src=x onerror="alert('x')"> & test`;
  assert.equal(
    escapeHtml(input),
    '&lt;img src=x onerror=&quot;alert(&#39;x&#39;)&quot;&gt; &amp; test'
  );
});

test('escapeHtml sigurno obrađuje prazne vrijednosti', () => {
  assert.equal(escapeHtml(null), '');
  assert.equal(escapeHtml(undefined), '');
  assert.equal(escapeHtml(42), '42');
});
