import './boot-entry.js';
import { createToastCenter, pulseElement } from './notifications.js';
import { createDirectorIntelligencePanel } from './director-intelligence.js';

for (const href of ['ux-polish.css', 'director-intelligence.css']) {
  const stylesheet = document.createElement('link');
  stylesheet.rel = 'stylesheet';
  stylesheet.href = href;
  document.head.append(stylesheet);
}

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
    window.setTimeout(() => toastCenter.show(message), id === 'scanButton' ? 560 : 120);
  });
}

const presentCount = document.getElementById('presentCount');
const employeesInput = document.getElementById('employeesInput');
const locationsInput = document.getElementById('locationsInput');
const directorView = document.getElementById('directorView');
const intelligence = createDirectorIntelligencePanel();
directorView?.append(intelligence.element);

function updateDirectorIntelligence() {
  intelligence.update({
    employees: employeesInput?.value,
    locations: locationsInput?.value,
    present: presentCount?.textContent
  });
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

employeesInput?.addEventListener('input', updateDirectorIntelligence);
locationsInput?.addEventListener('input', updateDirectorIntelligence);
updateDirectorIntelligence();

function clearExperienceFeedback() {
  toastCenter.clear();
}

document.getElementById('resetButton')?.addEventListener('click', clearExperienceFeedback);
document.getElementById('restartButton')?.addEventListener('click', clearExperienceFeedback);
