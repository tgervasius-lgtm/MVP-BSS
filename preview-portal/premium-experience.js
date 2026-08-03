import './boot-entry.js';
import { createToastCenter, pulseElement } from './notifications.js';
import { createDirectorIntelligencePanel } from './director-intelligence.js';
import { createFinalExperiencePanel } from './final-experience.js';
import { createReleasePolish } from './release-polish.js';
import { installMobileShell, registerPreviewServiceWorker } from './mobile-shell.js';

for (const href of ['ux-polish.css', 'director-intelligence.css', 'final-experience.css', 'release-polish.css']) {
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
  reviewWorkerButton: Object.freeze({ title: 'Pregled završen', message: 'Radnik je potvrdio da su podaci jasni.', tone: 'info' }),
  generateReportButton: Object.freeze({ title: 'Izvještaj spreman', message: 'Obračunski paket je generiran.', tone: 'success' })
});

for (const [id, message] of Object.entries(ACTION_MESSAGES)) {
  document.getElementById(id)?.addEventListener('click', () => {
    toastCenter.schedule(message, id === 'scanButton' ? 560 : 120);
  });
}

const presentCount = document.getElementById('presentCount');
const plannedCount = document.getElementById('plannedCount');
const industryInput = document.getElementById('industryInput');
const employeesInput = document.getElementById('employeesInput');
const locationsInput = document.getElementById('locationsInput');
const directorView = document.getElementById('directorView');
const completionView = document.getElementById('completionView');
const restartButton = document.getElementById('restartButton');
const intelligence = createDirectorIntelligencePanel();
directorView?.append(intelligence.element);

function updateDirectorIntelligence() {
  intelligence.update({
    employees: employeesInput?.value,
    locations: locationsInput?.value,
    present: presentCount?.textContent
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
      pulseElement(presentCount.closest('.metric'), 'metric-pulse');
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
