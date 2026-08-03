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
  assert.equal(document.querySelectorAll('#presentCount').length, 1);
  assert.equal(document.querySelectorAll('#directorView .metrics').length, 0);
  assert.equal(document.querySelectorAll('.command-center button[data-kpi]').length, 3);
  assert.equal(document.querySelectorAll('#activityFeed .activity-event').length, 3);

  const presentKpi = document.querySelector('[data-kpi="present"]');
  presentKpi.click();
  const kpiDetails = document.querySelector('.kpi-details');
  assert.equal(kpiDetails.classList.contains('hidden'), false);
  assert.match(document.getElementById('kpiDetailsTitle').textContent, /Prisutni/);
  kpiDetails.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  assert.equal(kpiDetails.classList.contains('hidden'), true);
  assert.equal(document.activeElement, presentKpi);

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
  assert.equal(document.querySelectorAll('#activityFeed [data-actor="Ivan Horvat"]').length, 1);
  assert.equal(document.getElementById('ivanEvent'), document.querySelector('#activityFeed .activity-event'));
  assert.match(document.getElementById('ivanEvent').textContent, /Prijava · Ulaz proizvodnje/);
  assert.doesNotMatch(document.getElementById('ivanEvent').textContent, /Čeka prijavu/);
  assert.match(document.querySelector('.attendance-ring').getAttribute('aria-label'), new RegExp(`${presentBeforeScan + 1} prisutnih`));

  const arrivalTime = document.getElementById('livingOfficeTime').textContent;
  document.querySelector('[data-role="manager"]').click();
  document.querySelector('[data-role="director"]').click();
  assert.equal(document.getElementById('livingOfficeTime').textContent, arrivalTime);
  assert.deepEqual(
    [...document.querySelectorAll('#activityFeed time')].map((time) => time.textContent),
    [arrivalTime, '07:00', '06:58']
  );

  document.getElementById('resetButton').click();
  dom.window.close();
});
