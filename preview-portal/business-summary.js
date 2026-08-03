import { escapeHtml } from './html-safe.js';

function plural(value, one, few, many) {
  const mod10 = value % 10;
  const mod100 = value % 100;
  if (value === 1) return one;
  if (mod10 >= 2 && mod10 <= 4 && !(mod100 >= 12 && mod100 <= 14)) return few;
  return many;
}

export function createBusinessSummary({ profile, summary, presentCount } = {}) {
  const employees = Number(profile?.employees) || 0;
  const locations = Number(profile?.locations) || 0;
  const shifts = Number(profile?.shifts) || 0;
  const terminals = Number(summary?.terminals) || 0;
  const planned = Number(summary?.planned) || 0;
  const present = Number(presentCount) || 0;

  return Object.freeze({
    industry: String(profile?.industry || 'Tvrtka'),
    employees,
    locations,
    shifts,
    terminals,
    planned,
    present,
    attendanceLabel: `od ${planned} planiranih zaposlenika evidentirano`,
    correctionLabel: '1 administrativna korekcija potvrđena',
    leaveLabel: '1 zahtjev za godišnji odmor odobren',
    reportLabel: 'Obračunski izvještaj pripremljen',
    profileLabel: `${employees} ${plural(employees, 'zaposlenik', 'zaposlenika', 'zaposlenika')} · ${locations} ${plural(locations, 'lokacija', 'lokacije', 'lokacija')} · ${shifts} ${plural(shifts, 'smjena', 'smjene', 'smjena')} · ${terminals} ${plural(terminals, 'terminal', 'terminala', 'terminala')}`
  });
}

export function createBusinessSummaryPanel(data) {
  const result = createBusinessSummary(data);
  const section = document.createElement('section');
  section.className = 'business-summary';
  section.setAttribute('aria-labelledby', 'businessSummaryTitle');
  section.innerHTML = `
    <div class="business-summary-heading">
      <p class="eyebrow">Rezultat simulacije</p>
      <h3 id="businessSummaryTitle">Ovako je BSS povezao jedan radni dan.</h3>
      <p>${escapeHtml(result.industry)} · ${escapeHtml(result.profileLabel)}</p>
    </div>
    <div class="business-summary-grid">
      <article><strong>${result.present}</strong><span>${escapeHtml(result.attendanceLabel)}</span></article>
      <article><strong>1</strong><span>${escapeHtml(result.correctionLabel)}</span></article>
      <article><strong>1</strong><span>${escapeHtml(result.leaveLabel)}</span></article>
      <article><strong>✓</strong><span>${escapeHtml(result.reportLabel)}</span></article>
    </div>
    <p class="business-summary-note">Svi prikazani podaci su simulirani. Portal ne šalje niti sprema kontaktne ili osobne podatke.</p>
  `;
  return section;
}
