import { buildOperationalMetrics } from './operational-metrics.js';

function clamp(value, min, max) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return min;
  return Math.min(Math.max(parsed, min), max);
}

export function buildCommandCenterModel({ profile = {}, summary = {}, presentCount = 0 } = {}) {
  const locations = clamp(profile.locations, 1, 8);
  const terminals = clamp(summary.terminals, 1, 8);
  const employees = clamp(profile.employees, 5, 1000);
  const planned = clamp(summary.planned ?? employees, 1, employees);
  const online = Math.max(1, terminals - (terminals >= 4 ? 1 : 0));
  const metrics = buildOperationalMetrics({ profile, summary: { ...summary, planned }, presentCount });
  const attendanceRate = Math.round((metrics.present / metrics.planned) * 100);
  const presentShare = (metrics.present / metrics.planned) * 100;
  const lateShare = (metrics.late / metrics.planned) * 100;
  const warnings = [];

  if (terminals >= 4) warnings.push('Jedan terminal završava sinkronizaciju.');
  if (metrics.present / metrics.planned < 0.9) warnings.push('Prisutnost je ispod očekivane razine za početak smjene.');
  if (warnings.length === 0) warnings.push('Nema kritičnih upozorenja.');

  return Object.freeze({
    systemStatus: online === terminals ? 'Sustav operativan' : 'Sustav stabilan',
    locations,
    terminals,
    online,
    planned: metrics.planned,
    presentCount: metrics.present,
    late: metrics.late,
    absent: metrics.absent,
    attendanceRate,
    presentShare,
    lateEndShare: presentShare + lateShare,
    hasWarnings: warnings[0] !== 'Nema kritičnih upozorenja.',
    warnings: Object.freeze(warnings)
  });
}

export function createCommandCenterPanel() {
  const section = document.createElement('section');
  section.className = 'command-center panel';
  section.setAttribute('aria-labelledby', 'commandCenterTitle');
  section.innerHTML = `
    <div class="command-center-head">
      <div><p class="eyebrow">Operativno stanje</p><h2 id="commandCenterTitle">Pregled tvrtke</h2></div>
      <span class="command-system-status" data-field="status">Sustav operativan</span>
    </div>
    <div class="command-meta" role="group" aria-label="Operativna infrastruktura">
      <span><strong data-field="locations">1</strong> <span data-field="locations-label">lokacija</span></span>
      <span><strong data-field="terminals">1 / 1</strong> terminali online</span>
    </div>
    <div class="command-overview">
      <button class="attendance-ring-trigger command-kpi" data-kpi="present" type="button" aria-label="Otvori detalje prisutnih zaposlenika">
        <span class="attendance-ring" data-field="attendance-chart" role="img">
          <span class="attendance-ring-core">
            <strong id="presentCount">0</strong>
            <small id="plannedCount">od 0 planiranih</small>
          </span>
        </span>
        <span class="attendance-ring-caption"><strong data-field="attendance-rate">0%</strong> prisutno</span>
      </button>
      <div class="attendance-exceptions" role="group" aria-label="Status početka smjene">
        <p><span>Iznimke smjene</span><strong data-field="attendance-summary">0 za provjeru</strong></p>
        <button class="attendance-exception late command-kpi" data-kpi="late" type="button" aria-label="Otvori detalje zaposlenika koji kasne">
          <span><i aria-hidden="true"></i>Kasne</span><strong id="lateCount">0</strong>
        </button>
        <button class="attendance-exception absent command-kpi" data-kpi="absent" type="button" aria-label="Otvori detalje odsutnih zaposlenika">
          <span><i aria-hidden="true"></i>Odsutni</span><strong id="absentCount">0</strong>
        </button>
      </div>
    </div>
    <div class="command-health" data-field="health"><span class="command-health-icon" aria-hidden="true">✓</span><ul data-field="warnings"></ul></div>
  `;

  const fields = {
    status: section.querySelector('[data-field="status"]'),
    locations: section.querySelector('[data-field="locations"]'),
    locationsLabel: section.querySelector('[data-field="locations-label"]'),
    terminals: section.querySelector('[data-field="terminals"]'),
    present: section.querySelector('#presentCount'),
    planned: section.querySelector('#plannedCount'),
    late: section.querySelector('#lateCount'),
    absent: section.querySelector('#absentCount'),
    attendanceChart: section.querySelector('[data-field="attendance-chart"]'),
    attendanceRate: section.querySelector('[data-field="attendance-rate"]'),
    attendanceSummary: section.querySelector('[data-field="attendance-summary"]'),
    presentTrigger: section.querySelector('[data-kpi="present"]'),
    lateTrigger: section.querySelector('[data-kpi="late"]'),
    absentTrigger: section.querySelector('[data-kpi="absent"]'),
    health: section.querySelector('[data-field="health"]'),
    warnings: section.querySelector('[data-field="warnings"]')
  };

  return Object.freeze({
    element: section,
    update(input) {
      const model = buildCommandCenterModel(input);
      fields.status.textContent = model.systemStatus;
      fields.locations.textContent = String(model.locations);
      fields.locationsLabel.textContent = model.locations === 1 ? 'lokacija' : model.locations < 5 ? 'lokacije' : 'lokacija';
      fields.terminals.textContent = `${model.online} / ${model.terminals}`;
      fields.present.textContent = String(model.presentCount);
      fields.planned.textContent = `od ${model.planned} planiranih`;
      fields.late.textContent = String(model.late);
      fields.absent.textContent = String(model.absent);
      fields.attendanceRate.textContent = `${model.attendanceRate}%`;
      fields.attendanceSummary.textContent = `${model.late + model.absent} za provjeru`;
      fields.attendanceChart.style.setProperty('--present-share', `${model.presentShare}%`);
      fields.attendanceChart.style.setProperty('--late-end-share', `${model.lateEndShare}%`);
      fields.attendanceChart.setAttribute('aria-label', `${model.presentCount} prisutnih, ${model.late} kasni i ${model.absent} odsutnih od ${model.planned} planiranih zaposlenika.`);
      fields.presentTrigger.setAttribute('aria-label', `Prisutni: ${model.presentCount} od ${model.planned} planiranih, ${model.attendanceRate} posto. Otvori detalje.`);
      fields.lateTrigger.setAttribute('aria-label', `Kasne: ${model.late}. Otvori detalje.`);
      fields.absentTrigger.setAttribute('aria-label', `Odsutni: ${model.absent}. Otvori detalje.`);
      fields.warnings.replaceChildren(...model.warnings.map((warning) => {
        const item = document.createElement('li');
        item.textContent = warning;
        return item;
      }));
      fields.status.classList.toggle('attention', model.online !== model.terminals);
      fields.health.classList.toggle('attention', model.hasWarnings);
      fields.health.querySelector('.command-health-icon').textContent = model.hasWarnings ? '!' : '✓';
      return model;
    }
  });
}
