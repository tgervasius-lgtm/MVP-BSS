import { createToastCenter, pulseElement } from './notifications.js';

const polishStyles = document.createElement('link');
polishStyles.rel = 'stylesheet';
polishStyles.href = 'ux-polish.css';
document.head.append(polishStyles);

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
let previousPresent = presentCount?.textContent ?? '';
if (presentCount) {
  const observer = new MutationObserver(() => {
    const current = presentCount.textContent ?? '';
    if (current !== previousPresent) {
      previousPresent = current;
      pulseElement(presentCount);
      pulseElement(presentCount.closest('.metric'), 'metric-pulse');
    }
  });
  observer.observe(presentCount, { childList: true, characterData: true, subtree: true });
}

function clearExperienceFeedback() {
  toastCenter.clear();
}

document.getElementById('resetButton')?.addEventListener('click', clearExperienceFeedback);
document.getElementById('restartButton')?.addEventListener('click', clearExperienceFeedback);
