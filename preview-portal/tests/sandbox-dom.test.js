import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { JSDOM } from 'jsdom';

test('DOM integracija pruža četiri bogata radna prostora i povezane radnje', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const dom = new JSDOM(html, { url: 'http://localhost/preview/', pretendToBeVisual: true });

  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  globalThis.MutationObserver = dom.window.MutationObserver;
  globalThis.requestAnimationFrame = (callback) => callback();

  await import('../app.js?sandbox-dom-role-depth-test');

  const employees = document.getElementById('employeesInput');
  document.getElementById('industryInput').value = 'Ured';
  employees.value = '5';
  document.getElementById('locationsInput').value = '1';
  document.getElementById('shiftsInput').value = '1';
  document.getElementById('profileForm').dispatchEvent(new dom.window.Event('submit', {
    bubbles: true,
    cancelable: true
  }));

  assert.equal(document.getElementById('demoView').classList.contains('hidden'), false);
  assert.match(document.getElementById('activeProfile').textContent, /Ured.*5 zaposlenika/);
  assert.equal(document.querySelectorAll('.role-button').length, 4);
  assert.equal(document.querySelector('[data-role="director"]'), null);
  assert.equal(document.getElementById('roleLabel').textContent, 'Uprava');
  assert.equal(document.getElementById('adminView').classList.contains('hidden'), false);
  assert.equal(document.querySelectorAll('#presentCount').length, 1);
  assert.equal(document.querySelectorAll('.command-center button[data-kpi]').length, 3);
  assert.equal(document.getElementById('adminAuditArea').textContent, 'Glavni ulaz');
  assert.match(document.getElementById('adminWorkerContext').textContent, /Uredski tim/);

  const presentKpi = document.querySelector('[data-kpi="present"]');
  presentKpi.click();
  const kpiDetails = document.querySelector('.kpi-details');
  assert.equal(kpiDetails.classList.contains('hidden'), false);
  kpiDetails.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  assert.equal(kpiDetails.classList.contains('hidden'), true);
  assert.equal(document.activeElement, presentKpi);

  document.getElementById('adminRecordsTab').click();
  assert.equal(document.getElementById('adminRecordsPanel').hidden, false);
  document.getElementById('resolveCorrectionButton').click();
  document.getElementById('replaceCardButton').click();
  assert.equal(document.getElementById('adminCorrectionPriorityTitle').textContent, 'Korekcija potvrđena');
  assert.equal(document.getElementById('adminWorkerCardCode').textContent, 'BSS-7304');
  assert.equal(document.getElementById('adminWorkerCardAudit').classList.contains('hidden'), false);
  assert.equal(document.getElementById('guideProgressBar').getAttribute('aria-valuenow'), '1');

  document.querySelector('[data-role="accounting"]').click();
  assert.equal(document.getElementById('nightHours').textContent, '0');
  document.getElementById('generateReportButton').click();
  assert.equal(document.getElementById('reportPreview').classList.contains('hidden'), false);
  assert.equal(document.getElementById('guideProgressBar').getAttribute('aria-valuenow'), '2');

  document.querySelector('[data-role="manager"]').click();
  assert.equal(document.getElementById('managerTeamSize').textContent, '2');
  assert.equal(document.querySelectorAll('#managerTeamRoster li:not([hidden])').length, 2);
  assert.deepEqual(
    [...document.querySelectorAll('#managerTeamRoster li:not([hidden]) .roster-status')].map((status) => status.textContent),
    ['Prisutna', 'Prisutna']
  );
  assert.match(document.querySelector('#managerTeamRoster li:not([hidden]):last-of-type').textContent, /Ana Kovač/);
  assert.equal(document.getElementById('managerLeaveCoverage').textContent, '50%');
  assert.equal(document.getElementById('managerPrimaryUnit').textContent, 'Operativni tim');
  assert.equal(document.getElementById('managerSecondaryUnit').textContent, 'Podrška');
  assert.deepEqual(
    [...document.querySelectorAll('[data-manager-planned]')].map((cell) => cell.textContent),
    ['16 h', '16 h', '16 h']
  );
  document.getElementById('managerRequestsTab').click();
  document.getElementById('approveLeaveButton').click();
  assert.equal(document.getElementById('leaveStatus').textContent, 'Odobreno');
  assert.equal(document.getElementById('guideProgressBar').getAttribute('aria-valuenow'), '3');

  document.querySelector('[data-role="worker"]').click();
  assert.ok(document.querySelector('.worker-today-card'));
  assert.match(document.getElementById('workerContext').textContent, /Uredski tim/);
  assert.equal(document.getElementById('workerNightHours').textContent, '0 h');
  assert.equal(document.getElementById('reviewWorkerButton'), null);
  document.getElementById('workerLeaveTab').click();
  document.getElementById('workerLeaveStart').value = '2026-08-11';
  document.getElementById('workerLeaveDays').value = '3';
  document.getElementById('workerLeaveForm').dispatchEvent(new dom.window.Event('submit', {
    bubbles: true,
    cancelable: true
  }));
  assert.match(document.getElementById('workerLeaveRequestStatus').textContent, /3 radna dana.*Čeka odluku/);
  assert.equal(document.getElementById('guideProgressBar').getAttribute('aria-valuenow'), '4');

  document.querySelector('[data-role="manager"]').click();
  document.getElementById('managerRequestsTab').click();
  assert.equal(document.getElementById('workerLeaveManagerCard').classList.contains('hidden'), false);
  assert.match(document.getElementById('managerWorkerLeavePeriod').textContent, /2026/);
  document.getElementById('approveWorkerLeaveButton').click();
  assert.equal(document.getElementById('managerWorkerLeaveStatus').textContent, 'Odobreno');

  document.querySelector('[data-role="admin"]').click();
  document.getElementById('adminTerminalsTab').click();
  const presentBeforeScan = Number.parseInt(document.getElementById('presentCount').textContent, 10);
  document.getElementById('scanButton').click();
  assert.match(document.getElementById('terminalScreen').textContent, /Očitavanje kartice/);
  await new Promise((resolve) => setTimeout(resolve, 560));
  assert.equal(Number.parseInt(document.getElementById('presentCount').textContent, 10), presentBeforeScan + 1);
  assert.equal(document.querySelectorAll('#activityFeed [data-actor="Ivan Horvat"]').length, 1);
  assert.match(document.getElementById('adminWorkerLastPunch').textContent, /Glavni ulaz/);
  assert.equal(document.getElementById('guideProgressBar').getAttribute('aria-valuenow'), '5');
  assert.equal(document.getElementById('completionView').classList.contains('hidden'), false);

  document.querySelector('[data-role="worker"]').click();
  assert.equal(document.getElementById('workerShiftStatus').textContent, 'Smjena u tijeku');
  assert.equal(document.getElementById('workerCardStatus').textContent, 'Nova kartica aktivna');
  assert.match(document.getElementById('workerLeaveRequestStatus').textContent, /Odobreno/);

  document.getElementById('resetButton').click();
  assert.equal(document.getElementById('welcomeView').classList.contains('hidden'), false);
  assert.equal(employees.value, '5');
  assert.equal(document.getElementById('adminOverviewPanel').hidden, false);
  assert.equal(document.getElementById('adminRecordsPanel').hidden, true);
  assert.equal(document.getElementById('workerLeaveRequestStatus').textContent, 'Zahtjev još nije poslan.');
  assert.equal(document.getElementById('workerLeaveStart').value, '2026-08-10');
  assert.equal(document.getElementById('workerLeaveDays').value, '2');
  assert.equal(document.getElementById('adminWorkerCardCode').textContent, 'BSS-2841');

  dom.window.close();
});
