import { createToastCenter, pulseElement } from './notifications.js';
import { createDirectorIntelligencePanel } from './director-intelligence.js';
import { createFinalExperiencePanel } from './final-experience.js';
import { createReleasePolish } from './release-polish.js';
import { installMobileShell, registerPreviewServiceWorker } from './mobile-shell.js';

for (const href of ['ux-polish.css', 'role-workspaces.css', 'director-intelligence.css', 'final-experience.css', 'release-polish.css']) {
  const stylesheet = document.createElement('link');
  stylesheet.rel = 'stylesheet';
  stylesheet.href = href;
  document.head.append(stylesheet);
}

installMobileShell();
void registerPreviewServiceWorker();
createReleasePolish();

const toastCenter = createToastCenter();
document.body.append(toastCenter.element);

const ACTION_MESSAGES = Object.freeze({
  scanButton: Object.freeze({ title: 'RFID prijava', message: 'Ivan Horvat uspješno je evidentiran.', tone: 'success' }),
  resolveCorrectionButton: Object.freeze({ title: 'Korekcija potvrđena', message: 'Audit zapis je ažuriran i spreman za pregled.', tone: 'success' }),
  approveLeaveButton: Object.freeze({ title: 'Zahtjev odobren', message: 'Godišnji odmor evidentiran je u rasporedu.', tone: 'success' }),
  approveWorkerLeaveButton: Object.freeze({ title: 'Zahtjev odobren', message: 'Ivan Horvat vidi odluku u svom radničkom pregledu.', tone: 'success' }),
  rejectWorkerLeaveButton: Object.freeze({ title: 'Zahtjev odbijen', message: 'Odluka Voditelja odmah je vidljiva radniku.', tone: 'warning' }),
  replaceCardButton: Object.freeze({ title: 'RFID kartica zamijenjena', message: 'Nova kartica je aktivna, a prethodna evidencija ostaje sačuvana.', tone: 'info' }),
  generateReportButton: Object.freeze({ title: 'Pregled spreman', message: 'Tablični obračunski preview je generiran.', tone: 'success' })
});

for (const [id, message] of Object.entries(ACTION_MESSAGES)) {
  document.getElementById(id)?.addEventListener('click', () => {
    toastCenter.schedule(message, id === 'scanButton' ? 560 : 120);
  });
}

document.getElementById('workerLeaveForm')?.addEventListener('submit', () => {
  toastCenter.schedule({
    title: 'Zahtjev poslan',
    message: 'Zahtjev Ivana Horvata sada je vidljiv Voditelju.',
    tone: 'success'
  }, 120);
});

const presentCount = document.getElementById('presentCount');
const plannedCount = document.getElementById('plannedCount');
const industryInput = document.getElementById('industryInput');
const employeesInput = document.getElementById('employeesInput');
const locationsInput = document.getElementById('locationsInput');
const adminView = document.getElementById('adminView');
const completionView = document.getElementById('completionView');
const restartButton = document.getElementById('restartButton');
const intelligence = createDirectorIntelligencePanel();
const commandCenter = adminView?.querySelector('.command-center');
const kpiDetails = adminView?.querySelector('.kpi-details');
if (kpiDetails || commandCenter) (kpiDetails ?? commandCenter).insertAdjacentElement('afterend', intelligence.element);
else document.getElementById('adminOverviewPanel')?.append(intelligence.element);

function updateDirectorIntelligence() {
  intelligence.update({
    employees: employeesInput?.value,
    locations: locationsInput?.value,
    present: presentCount?.textContent,
    planned: plannedCount?.textContent?.match(/\d+/)?.[0]
  });
}

function renderFinalExperience() {
  completionView?.querySelector('.final-experience')?.remove();
  if (!completionView || completionView.classList.contains('hidden')) return;
  const planned = plannedCount?.textContent?.match(/\d+/)?.[0] ?? 0;
  const panel = createFinalExperiencePanel({
    industry: industryInput?.value,
    present: presentCount?.textContent,
    planned
  });
  completionView.insertBefore(panel, restartButton ?? null);
}

let previousPresent = presentCount?.textContent ?? '';
if (presentCount) {
  const observer = new MutationObserver(() => {
    const current = presentCount.textContent ?? '';
    if (current !== previousPresent) {
      previousPresent = current;
      pulseElement(presentCount);
      pulseElement(presentCount.closest('.attendance-ring-trigger'), 'metric-pulse');
      updateDirectorIntelligence();
    }
  });
  observer.observe(presentCount, { childList: true, characterData: true, subtree: true });
}

if (completionView) {
  const completionObserver = new MutationObserver(renderFinalExperience);
  completionObserver.observe(completionView, { attributes: true, attributeFilter: ['class'] });
}

employeesInput?.addEventListener('input', updateDirectorIntelligence);
locationsInput?.addEventListener('input', updateDirectorIntelligence);
industryInput?.addEventListener('input', renderFinalExperience);
updateDirectorIntelligence();
renderFinalExperience();

function clearExperienceFeedback() {
  toastCenter.clear();
  completionView?.querySelector('.final-experience')?.remove();
}

document.getElementById('resetButton')?.addEventListener('click', clearExperienceFeedback);
restartButton?.addEventListener('click', clearExperienceFeedback);
