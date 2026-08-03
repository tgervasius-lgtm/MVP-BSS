import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { JSDOM } from 'jsdom';

test('DOM integracija otvara personalizirani sandbox bez zaključavanja radnji', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const dom = new JSDOM(html, { url: 'http://localhost/preview/', pretendToBeVisual: true });

  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  globalThis.MutationObserver = dom.window.MutationObserver;
  globalThis.requestAnimationFrame = (callback) => callback();

  await import('../app.js?sandbox-dom-test');

  const employees = document.getElementById('employeesInput');
  employees.value = '120';
  document.getElementById('profileForm').dispatchEvent(new dom.window.Event('submit', {
    bubbles: true,
    cancelable: true
  }));

  assert.equal(document.getElementById('demoView').classList.contains('hidden'), false);
  assert.match(document.getElementById('activeProfile').textContent, /120 zaposlenika/);

  document.querySelector('[data-role="accounting"]').click();
  const report = document.getElementById('generateReportButton');
  assert.equal(report.disabled, false);
  report.click();

  assert.equal(document.getElementById('accountingView').classList.contains('hidden'), false);
  assert.equal(document.getElementById('roleLabel').textContent, 'Knjigovodstvo');
  assert.equal(document.getElementById('guideProgressBar').getAttribute('aria-valuenow'), '1');

  document.getElementById('resetButton').click();
  assert.equal(document.getElementById('welcomeView').classList.contains('hidden'), false);
  assert.equal(employees.value, '120');

  document.querySelector('input[value="assisted"]').checked = true;
  document.getElementById('profileForm').dispatchEvent(new dom.window.Event('submit', {
    bubbles: true,
    cancelable: true
  }));
  assert.equal(document.getElementById('guideDetails').open, true);
  document.querySelector('[data-role="manager"]').click();
  assert.equal(document.getElementById('approveLeaveButton').disabled, false);

  document.querySelector('[data-role="director"]').click();
  const presentBeforeScan = Number.parseInt(document.getElementById('presentCount').textContent, 10);
  document.getElementById('scanButton').click();
  document.querySelector('[data-role="admin"]').click();
  document.querySelector('[data-role="director"]').click();
  assert.equal(document.getElementById('scanButton').disabled, true);
  assert.match(document.getElementById('terminalScreen').textContent, /Očitavanje kartice/);
  await new Promise((resolve) => setTimeout(resolve, 560));
  assert.equal(Number.parseInt(document.getElementById('presentCount').textContent, 10), presentBeforeScan + 1);

  document.getElementById('resetButton').click();
  dom.window.close();
});
