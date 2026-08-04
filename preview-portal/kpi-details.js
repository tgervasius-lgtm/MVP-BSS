export const KPI_DETAILS = Object.freeze({
  present: Object.freeze({
    title: 'Prisutni zaposlenici',
    summary: 'Zaposlenici koji su evidentirani na aktivnim terminalima.',
    items: Object.freeze(['Ivan Horvat · 07:01', 'Ana Kovač · 06:59', 'Marko Marić · 06:58'])
  }),
  late: Object.freeze({
    title: 'Zaposlenici koji kasne',
    summary: 'Simulirani slučajevi koji zahtijevaju provjeru voditelja.',
    items: Object.freeze(['Petar Novak · 7 min', 'Maja Babić · 11 min', 'Luka Barić · 16 min'])
  }),
  absent: Object.freeze({
    title: 'Odsutni danas',
    summary: 'Odobreni godišnji odmori i evidentirana bolovanja.',
    items: Object.freeze(['2 · godišnji odmor', '3 · bolovanje', '1 · ostalo'])
  })
});

function safeCount(value) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

export function buildKpiDetails(metrics = {}) {
  const present = safeCount(metrics.present);
  const late = safeCount(metrics.late);
  const absent = safeCount(metrics.absent);
  const vacation = Math.ceil(absent / 2);
  const sick = Math.max(0, absent - vacation);
  const absenceItems = [
    vacation > 0 ? `${vacation} · godišnji odmor` : null,
    sick > 0 ? `${sick} · bolovanje` : null
  ].filter(Boolean);

  return Object.freeze({
    present: Object.freeze({
      title: 'Prisutni zaposlenici',
      summary: 'Agregirani broj prijava evidentiranih na simuliranim terminalima.',
      items: Object.freeze([`${present} · evidentirano`, `${late + absent} · još nije prisutno`])
    }),
    late: Object.freeze({
      title: 'Zaposlenici koji kasne',
      summary: 'Simulirani agregat koji zahtijeva provjeru voditelja.',
      items: Object.freeze(late > 0 ? [`${late} · čeka provjeru`] : ['Nema evidentiranih kašnjenja'])
    }),
    absent: Object.freeze({
      title: 'Odsutni danas',
      summary: 'Simulirana raspodjela odobrenih godišnjih odmora i bolovanja.',
      items: Object.freeze(absent > 0 ? absenceItems : ['Nema evidentiranih odsutnosti'])
    })
  });
}

export function getKpiDetail(id, metrics) {
  const details = metrics ? buildKpiDetails(metrics) : KPI_DETAILS;
  return details[id] ?? null;
}

export function createKpiDetailsPanel({ getMetrics = () => null } = {}) {
  const aside = document.createElement('aside');
  aside.className = 'kpi-details hidden';
  aside.setAttribute('aria-live', 'polite');
  aside.setAttribute('aria-labelledby', 'kpiDetailsTitle');
  aside.innerHTML = `
    <div class="kpi-details-header">
      <div><p class="eyebrow">Detaljni pregled</p><h3 id="kpiDetailsTitle"></h3></div>
      <button class="kpi-close" type="button" aria-label="Zatvori detaljni pregled">×</button>
    </div>
    <p class="kpi-details-summary"></p>
    <ul class="kpi-details-list"></ul>
  `;

  const title = aside.querySelector('#kpiDetailsTitle');
  const summary = aside.querySelector('.kpi-details-summary');
  const list = aside.querySelector('.kpi-details-list');
  const close = aside.querySelector('.kpi-close');
  let lastTrigger = null;

  function hide() {
    aside.classList.add('hidden');
    lastTrigger?.focus();
  }

  function show(id, trigger) {
    const detail = getKpiDetail(id, getMetrics());
    if (!detail) return false;
    lastTrigger = trigger ?? null;
    title.textContent = detail.title;
    summary.textContent = detail.summary;
    list.replaceChildren(...detail.items.map((item) => {
      const li = document.createElement('li');
      li.textContent = item;
      return li;
    }));
    aside.classList.remove('hidden');
    close.focus();
    return true;
  }

  close.addEventListener('click', hide);
  aside.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') hide();
  });

  return Object.freeze({ element: aside, show, hide });
}
