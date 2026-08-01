function clamp(value, min, max) {
  const number = Number.parseInt(value, 10);
  if (!Number.isFinite(number)) return min;
  return Math.min(Math.max(number, min), max);
}

export function buildAttendanceTrend({ employees = 68, present = 47 } = {}) {
  const total = clamp(employees, 5, 1000);
  const current = clamp(present, 0, total);
  const ratios = [0.18, 0.46, 0.72, 0.9, 1];
  const times = ['06:30', '06:45', '07:00', '07:15', '07:30'];
  return Object.freeze(ratios.map((ratio, index) => Object.freeze({
    time: times[index],
    value: Math.min(current, Math.round(current * ratio)),
    percent: current === 0 ? 0 : Math.round(ratio * 100)
  })));
}

export function buildLocationDistribution({ employees = 68, locations = 2 } = {}) {
  const total = clamp(employees, 5, 1000);
  const count = clamp(locations, 1, 8);
  const base = Math.floor(total / count);
  const remainder = total % count;
  return Object.freeze(Array.from({ length: count }, (_, index) => Object.freeze({
    name: index === 0 ? 'Glavna lokacija' : `Lokacija ${index + 1}`,
    employees: base + (index < remainder ? 1 : 0)
  })));
}

export function createDirectorIntelligencePanel({ documentRef = globalThis.document } = {}) {
  const element = documentRef.createElement('section');
  element.className = 'panel director-intelligence';
  element.setAttribute('aria-label', 'Direktorski trendovi');

  function update({ employees, locations, present }) {
    const trend = buildAttendanceTrend({ employees, present });
    const distribution = buildLocationDistribution({ employees, locations });
    const maxEmployees = Math.max(...distribution.map((item) => item.employees), 1);

    element.innerHTML = `
      <div class="section-heading">
        <div><p class="eyebrow">Director Intelligence</p><h2>Jutarnji operativni trend</h2></div>
        <span class="badge">Simulirani podaci</span>
      </div>
      <div class="director-intelligence-grid">
        <article>
          <h3>Prisutnost kroz jutro</h3>
          <div class="attendance-trend" role="img" aria-label="Trend prijavljenih zaposlenika kroz jutro">
            ${trend.map((point) => `<div class="trend-column"><span style="height:${Math.max(point.percent, 4)}%"></span><strong>${point.value}</strong><small>${point.time}</small></div>`).join('')}
          </div>
        </article>
        <article>
          <h3>Raspodjela po lokacijama</h3>
          <ul class="location-distribution">
            ${distribution.map((item) => `<li><div><strong>${item.name}</strong><small>${item.employees} zaposlenika</small></div><span aria-hidden="true"><i style="width:${Math.round((item.employees / maxEmployees) * 100)}%"></i></span></li>`).join('')}
          </ul>
        </article>
      </div>
      <p class="director-intelligence-note">Vizualizacija je dio demonstracijskog scenarija i ne predstavlja stvarne podatke tvrtke.</p>`;
  }

  return Object.freeze({ element, update });
}
