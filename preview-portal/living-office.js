const TIMES = ['06:58', '07:00', '07:01', '07:06', '07:12'];

const INDUSTRY_EVENTS = Object.freeze({
  proizvodnja: Object.freeze([
    'Marko Marić se prijavio na ulazu proizvodnje.',
    'Jutarnja smjena i proizvodna linija su pokrenute.',
    'Ivan Horvat čeka prijavu na terminalu hale.',
    'Administrator ima jednu evidenciju smjene za provjeru.',
    'Voditelj proizvodnje ima jedan zahtjev za godišnji odmor.'
  ]),
  logistika: Object.freeze([
    'Marko Marić se prijavio na ulazu skladišta.',
    'Jutarnja smjena skladišta je započela.',
    'Ivan Horvat čeka prijavu prije prvog utovara.',
    'Administrator provjerava jednu nedostajuću odjavu iz skladišta.',
    'Voditelj logistike ima jedan zahtjev za godišnji odmor.'
  ]),
  građevina: Object.freeze([
    'Marko Marić se prijavio na ulazu gradilišta.',
    'Terenska smjena na gradilištu je započela.',
    'Ivan Horvat čeka prijavu prije izlaska na teren.',
    'Administrator provjerava jednu terensku evidenciju.',
    'Voditelj gradilišta ima jedan zahtjev za godišnji odmor.'
  ]),
  trgovina: Object.freeze([
    'Marko Marić se prijavio na ulazu poslovnice.',
    'Jutarnja smjena poslovnice je započela.',
    'Ivan Horvat čeka prijavu prije otvaranja trgovine.',
    'Administrator provjerava jednu evidenciju iz poslovnice.',
    'Voditelj trgovine ima jedan zahtjev za godišnji odmor.'
  ]),
  ured: Object.freeze([
    'Marko Marić se prijavio na recepciji ureda.',
    'Radni dan uredskog tima je započeo.',
    'Ivan Horvat čeka prijavu prije prvog sastanka.',
    'Administrator provjerava jednu fleksibilnu evidenciju.',
    'Voditelj tima ima jedan zahtjev za godišnji odmor.'
  ]),
  ostalo: Object.freeze([
    'Marko Marić se prijavio.',
    'Jutarnja smjena je započela.',
    'Ivan Horvat čeka prijavu na terminalu.',
    'Administrator ima jednu evidenciju za provjeru.',
    'Voditelj ima jedan zahtjev za godišnji odmor.'
  ])
});

function normalizeIndustry(industry = 'ostalo') {
  const value = String(industry).trim().toLocaleLowerCase('hr-HR');
  return Object.hasOwn(INDUSTRY_EVENTS, value) ? value : 'ostalo';
}

export function getLivingOfficeFrame(step = 0, industry = 'ostalo') {
  const index = Math.min(Math.max(Number.parseInt(step, 10) || 0, 0), TIMES.length - 1);
  const key = normalizeIndustry(industry);
  const events = INDUSTRY_EVENTS[key];
  return Object.freeze({
    time: TIMES[index],
    event: events[index],
    index,
    total: TIMES.length,
    industry: key
  });
}

export function appendLivingOfficeEvent(feed, frame, maxItems = 8) {
  if (!feed || typeof feed.querySelector !== 'function' || typeof feed.append !== 'function') return false;
  const key = `living-${frame.industry ?? 'ostalo'}-${frame.index}`;
  if (feed.querySelector(`[data-live-event="${key}"]`)) return false;

  const item = feed.ownerDocument?.createElement?.('li');
  if (!item) return false;
  item.dataset.liveEvent = key;
  item.innerHTML = `<span>${frame.time}</span> ${frame.event}`;
  feed.append(item);

  const generated = Array.from(feed.querySelectorAll('[data-live-event]'));
  while (generated.length > maxItems) generated.shift()?.remove();
  return true;
}

export function clearLivingOfficeEvents(feed) {
  if (!feed || typeof feed.querySelectorAll !== 'function') return;
  feed.querySelectorAll('[data-live-event]').forEach((item) => item.remove());
}

export function createLivingOfficeController({
  onFrame,
  intervalMs = 2400,
  feed = globalThis.document?.querySelector?.('#activityFeed'),
  resetControl = globalThis.document?.querySelector?.('#resetButton'),
  industry = 'ostalo'
} = {}) {
  let step = 0;
  let timer = null;
  let activeIndustry = normalizeIndustry(industry);

  function emit() {
    const frame = getLivingOfficeFrame(step, activeIndustry);
    onFrame?.(frame);
    appendLivingOfficeEvent(feed, frame);
    step = (step + 1) % frame.total;
  }

  function stop() {
    if (!timer) return;
    clearInterval(timer);
    timer = null;
  }

  function reset() {
    stop();
    step = 0;
    clearLivingOfficeEvents(feed);
    onFrame?.(getLivingOfficeFrame(0, activeIndustry));
  }

  resetControl?.addEventListener?.('click', reset);

  return Object.freeze({
    start() {
      if (timer) return;
      emit();
      timer = setInterval(emit, intervalMs);
    },
    stop,
    reset,
    setIndustry(nextIndustry) {
      const normalized = normalizeIndustry(nextIndustry);
      if (normalized === activeIndustry) return activeIndustry;
      activeIndustry = normalized;
      reset();
      return activeIndustry;
    }
  });
}
