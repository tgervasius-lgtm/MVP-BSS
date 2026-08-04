import { escapeHtml } from './html-safe.js';

export const FINAL_STEPS = Object.freeze([
  Object.freeze({ key: 'attendance', label: 'RFID prijava evidentirana' }),
  Object.freeze({ key: 'correction', label: 'Administrativna korekcija potvrđena' }),
  Object.freeze({ key: 'leave', label: 'Zahtjev za godišnji odmor odobren' }),
  Object.freeze({ key: 'worker', label: 'Radnički zahtjev za godišnji poslan' }),
  Object.freeze({ key: 'report', label: 'Obračunski izvještaj pripremljen' })
]);

export function createFinalExperienceModel({ industry = 'Tvrtka', present = 0, planned = 0 } = {}) {
  const safePresent = Math.max(0, Number.parseInt(present, 10) || 0);
  const safePlanned = Math.max(0, Number.parseInt(planned, 10) || 0);
  const attendanceRate = safePlanned > 0 ? Math.min(100, Math.round((safePresent / safePlanned) * 100)) : 0;
  return Object.freeze({
    industry: String(industry || 'Tvrtka'),
    present: safePresent,
    planned: safePlanned,
    attendanceRate,
    steps: FINAL_STEPS,
    headline: 'Radni dan uspješno je prošao kroz BSS.',
    valueStatement: 'Povezani koraci ažurirali su terminal, evidenciju, upravljački pregled i obračunski tok bez ručnog prepisivanja podataka.'
  });
}

export function createFinalExperiencePanel(data) {
  const model = createFinalExperienceModel(data);
  const panel = document.createElement('section');
  panel.className = 'final-experience';
  panel.setAttribute('aria-labelledby', 'finalExperienceTitle');
  panel.innerHTML = `
    <div class="final-experience-hero">
      <span class="final-experience-mark" aria-hidden="true">✓</span>
      <div>
        <p class="eyebrow">Operativni rezultat</p>
        <h3 id="finalExperienceTitle">${escapeHtml(model.headline)}</h3>
        <p>${escapeHtml(model.valueStatement)}</p>
      </div>
    </div>
    <div class="final-experience-score">
      <strong>${model.attendanceRate}%</strong>
      <span>evidentirane planirane prisutnosti</span>
      <small>${model.present} od ${model.planned} · ${escapeHtml(model.industry)}</small>
    </div>
    <ol class="final-experience-steps">
      ${model.steps.map((step, index) => `<li><span>${index + 1}</span><strong>${escapeHtml(step.label)}</strong><small>Završeno</small></li>`).join('')}
    </ol>
  `;
  return panel;
}
