function clamp(value, min, max) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return min;
  return Math.min(Math.max(parsed, min), max);
}

export function buildCommandCenterModel({ profile = {}, summary = {}, presentCount = 0, completed = 0, total = 5 } = {}) {
  const locations = clamp(profile.locations, 1, 8);
  const terminals = clamp(summary.terminals, 1, 8);
  const employees = clamp(profile.employees, 5, 1000);
  const planned = clamp(summary.planned ?? employees, 1, employees);
  const progress = total > 0 ? Math.round((clamp(completed, 0, total) / total) * 100) : 0;
  const online = Math.max(1, terminals - (terminals >= 4 ? 1 : 0));
  const warnings = [];

  if (terminals >= 4) warnings.push('Jedan terminal završava sinkronizaciju.');
  if (presentCount / planned < 0.9) warnings.push('Prisutnost je ispod očekivane razine za početak smjene.');
  if (warnings.length === 0) warnings.push('Nema kritičnih upozorenja.');

  return Object.freeze({
    systemStatus: online === terminals ? 'Sustav operativan' : 'Sustav stabilan',
    locations,
    terminals,
    online,
    presentCount: clamp(presentCount, 0, employees),
    progress,
    warnings: Object.freeze(warnings)
  });
}

export function createCommandCenterPanel() {
  const section = document.createElement('section');
  section.className = 'command-center panel';
  section.setAttribute('aria-labelledby', 'commandCenterTitle');
  section.innerHTML = `
    <div class="command-center-head">
      <div><p class="eyebrow">Command Center</p><h2 id="commandCenterTitle">Operativni pregled tvrtke</h2></div>
      <span class="command-system-status" data-field="status">Sustav operativan</span>
    </div>
    <div class="command-center-grid">
      <article><span>Lokacije</span><strong data-field="locations">1</strong></article>
      <article><span>Terminali online</span><strong data-field="terminals">1 / 1</strong></article>
      <article><span>Prisutni sada</span><strong data-field="present">0</strong></article>
      <article><span>Napredak dana</span><strong data-field="progress">0%</strong></article>
    </div>
    <div class="command-alerts"><p class="eyebrow">Aktivna upozorenja</p><ul data-field="warnings"></ul></div>
  `;

  const fields = {
    status: section.querySelector('[data-field="status"]'),
    locations: section.querySelector('[data-field="locations"]'),
    terminals: section.querySelector('[data-field="terminals"]'),
    present: section.querySelector('[data-field="present"]'),
    progress: section.querySelector('[data-field="progress"]'),
    warnings: section.querySelector('[data-field="warnings"]')
  };

  return Object.freeze({
    element: section,
    update(input) {
      const model = buildCommandCenterModel(input);
      fields.status.textContent = model.systemStatus;
      fields.locations.textContent = String(model.locations);
      fields.terminals.textContent = `${model.online} / ${model.terminals}`;
      fields.present.textContent = String(model.presentCount);
      fields.progress.textContent = `${model.progress}%`;
      fields.warnings.replaceChildren(...model.warnings.map((warning) => {
        const item = document.createElement('li');
        item.textContent = warning;
        return item;
      }));
      fields.status.classList.toggle('attention', model.online !== model.terminals);
      return model;
    }
  });
}
