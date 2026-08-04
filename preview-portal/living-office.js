const TIMES = ['06:58', '07:00', '07:01', '07:06', '07:12'];

const INDUSTRY_EVENTS = Object.freeze({
  proizvodnja: Object.freeze([
    'Marko Marić se prijavio na ulazu proizvodnje.',
    'Jutarnja smjena i proizvodna linija su pokrenute.',
    'Ivan Horvat čeka prijavu na terminalu hale.',
    'Uprava ima jednu evidenciju smjene za provjeru.',
    'Voditelj proizvodnje ima jedan zahtjev za godišnji odmor.'
  ]),
  logistika: Object.freeze([
    'Marko Marić se prijavio na ulazu skladišta.',
    'Jutarnja smjena skladišta je započela.',
    'Ivan Horvat čeka prijavu prije prvog utovara.',
    'Uprava provjerava jednu nedostajuću odjavu iz skladišta.',
    'Voditelj logistike ima jedan zahtjev za godišnji odmor.'
  ]),
  građevina: Object.freeze([
    'Marko Marić se prijavio na ulazu gradilišta.',
    'Terenska smjena na gradilištu je započela.',
    'Ivan Horvat čeka prijavu prije izlaska na teren.',
    'Uprava provjerava jednu terensku evidenciju.',
    'Voditelj gradilišta ima jedan zahtjev za godišnji odmor.'
  ]),
  trgovina: Object.freeze([
    'Marko Marić se prijavio na ulazu poslovnice.',
    'Jutarnja smjena poslovnice je započela.',
    'Ivan Horvat čeka prijavu prije otvaranja trgovine.',
    'Uprava provjerava jednu evidenciju iz poslovnice.',
    'Voditelj trgovine ima jedan zahtjev za godišnji odmor.'
  ]),
  ured: Object.freeze([
    'Marko Marić se prijavio na recepciji ureda.',
    'Radni dan uredskog tima je započeo.',
    'Ivan Horvat čeka prijavu prije prvog sastanka.',
    'Uprava provjerava jednu fleksibilnu evidenciju.',
    'Voditelj tima ima jedan zahtjev za godišnji odmor.'
  ]),
  ostalo: Object.freeze([
    'Marko Marić se prijavio.',
    'Jutarnja smjena je započela.',
    'Ivan Horvat čeka prijavu na terminalu.',
    'Uprava ima jednu evidenciju za provjeru.',
    'Voditelj ima jedan zahtjev za godišnji odmor.'
  ])
});

const INDUSTRY_ACTIVITY_CONTEXT = Object.freeze({
  proizvodnja: Object.freeze({ arrival: 'Ulaz proizvodnje', shift: 'Proizvodna linija', pending: 'Terminal hale', review: '1 evidencija smjene', manager: 'Voditelj proizvodnje' }),
  logistika: Object.freeze({ arrival: 'Ulaz skladišta', shift: 'Skladišna smjena', pending: 'Prvi utovar', review: '1 skladišna evidencija', manager: 'Voditelj logistike' }),
  građevina: Object.freeze({ arrival: 'Ulaz gradilišta', shift: 'Terenska smjena', pending: 'Izlazak na teren', review: '1 terenska evidencija', manager: 'Voditelj gradilišta' }),
  trgovina: Object.freeze({ arrival: 'Ulaz poslovnice', shift: 'Otvaranje poslovnice', pending: 'Početak rada', review: '1 evidencija poslovnice', manager: 'Voditelj trgovine' }),
  ured: Object.freeze({ arrival: 'Recepcija ureda', shift: 'Radni dan', pending: 'Prvi sastanak', review: '1 fleksibilna evidencija', manager: 'Voditelj tima' }),
  ostalo: Object.freeze({ arrival: 'Glavni terminal', shift: 'Jutarnja smjena', pending: 'Početak smjene', review: '1 evidencija', manager: 'Voditelj' })
});

const ACTIVITY_BLUEPRINTS = Object.freeze([
  Object.freeze({ actor: 'Marko Marić', action: 'Prijava', detail: 'arrival', tone: 'success', initials: 'MM' }),
  Object.freeze({ actor: 'Jutarnja smjena', action: 'Započela', detail: 'shift', tone: 'system', initials: 'JS' }),
  Object.freeze({ actor: 'Ivan Horvat', action: 'Čeka prijavu', detail: 'pending', tone: 'pending', initials: 'IH' }),
  Object.freeze({ actor: 'Uprava', action: 'Za provjeru', detail: 'review', tone: 'review', initials: 'UP' }),
  Object.freeze({ actor: 'Voditelj', action: 'Godišnji odmor', detail: '1 zahtjev', tone: 'request', initials: 'VO' })
]);

function normalizeIndustry(industry = 'ostalo') {
  const value = String(industry).trim().toLocaleLowerCase('hr-HR');
  return Object.hasOwn(INDUSTRY_EVENTS, value) ? value : 'ostalo';
}

export function getLivingOfficeFrame(step = 0, industry = 'ostalo') {
  const index = Math.min(Math.max(Number.parseInt(step, 10) || 0, 0), TIMES.length - 1);
  const key = normalizeIndustry(industry);
  const events = INDUSTRY_EVENTS[key];
  const context = INDUSTRY_ACTIVITY_CONTEXT[key];
  const blueprint = ACTIVITY_BLUEPRINTS[index];
  const actor = index === 4 ? context.manager : blueprint.actor;
  const detail = Object.hasOwn(context, blueprint.detail) ? context[blueprint.detail] : blueprint.detail;
  return Object.freeze({
    time: TIMES[index],
    event: events[index],
    actor,
    action: blueprint.action,
    detail,
    tone: blueprint.tone,
    initials: index === 4 ? actor.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toLocaleUpperCase('hr-HR') : blueprint.initials,
    index,
    total: TIMES.length,
    industry: key
  });
}

export function createActivityFeedItem(documentRef, frame, { id, source = 'live' } = {}) {
  if (!documentRef?.createElement || !frame) return null;
  const item = documentRef.createElement('li');
  const avatar = documentRef.createElement('span');
  const copy = documentRef.createElement('span');
  const actor = documentRef.createElement('strong');
  const detail = documentRef.createElement('small');
  const time = documentRef.createElement('time');

  item.className = `activity-event ${frame.tone || 'system'}`;
  if (id) item.id = id;
  item.dataset.activityState = frame.tone || 'system';
  item.dataset.actor = frame.actor || '';
  item.dataset.eventKey = `living-${frame.industry ?? 'ostalo'}-${frame.index}`;
  item.dataset[source === 'seed' ? 'seedEvent' : 'liveEvent'] = item.dataset.eventKey;

  avatar.className = 'activity-avatar';
  avatar.setAttribute('aria-hidden', 'true');
  avatar.textContent = frame.initials || 'BSS';
  copy.className = 'activity-copy';
  actor.textContent = frame.actor || 'BSS sustav';
  detail.textContent = [frame.action, frame.detail].filter(Boolean).join(' · ');
  time.textContent = frame.time || '—';
  if (frame.time) time.setAttribute('datetime', frame.time);
  copy.append(actor, detail);
  item.append(avatar, copy, time);
  return item;
}

export function renderInitialActivityFeed(feed, industry = 'ostalo', count = 3) {
  if (!feed?.ownerDocument?.createElement || typeof feed.replaceChildren !== 'function') return 0;
  const parsed = Number.parseInt(count, 10);
  const limit = Number.isFinite(parsed) ? Math.min(Math.max(parsed, 0), TIMES.length) : 3;
  const items = Array.from({ length: limit }, (_, index) => createActivityFeedItem(
    feed.ownerDocument,
    getLivingOfficeFrame(index, industry),
    { source: 'seed' }
  )).filter(Boolean).reverse();
  feed.replaceChildren(...items);
  return items.length;
}

export function appendLivingOfficeEvent(feed, frame, maxItems = 8) {
  if (!feed || typeof feed.querySelector !== 'function' || typeof feed.append !== 'function') return false;
  const key = `living-${frame.industry ?? 'ostalo'}-${frame.index}`;
  if (feed.querySelector(`[data-event-key="${key}"]`)) return false;

  const parsed = Number.parseInt(maxItems, 10);
  const limit = Number.isFinite(parsed) ? Math.min(Math.max(parsed, 0), 20) : 8;
  if (limit === 0) return false;

  const item = createActivityFeedItem(feed.ownerDocument, frame);
  if (!item) return false;
  const newestFirst = typeof feed.prepend === 'function';
  if (newestFirst) feed.prepend(item); else feed.append(item);

  const visible = Array.from(feed.querySelectorAll('[data-event-key]'));
  while (visible.length > limit) (newestFirst ? visible.pop() : visible.shift())?.remove();
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
  industry = 'ostalo',
  getIndustry = () => industry,
  autoAdvance = true,
  startStep = 0
} = {}) {
  const initialStep = Math.min(Math.max(Number.parseInt(startStep, 10) || 0, 0), TIMES.length - 1);
  let step = initialStep;
  let timer = null;
  let staticEmitted = false;
  let activeIndustry = normalizeIndustry(industry);

  function syncIndustry() {
    const nextIndustry = normalizeIndustry(getIndustry?.());
    if (nextIndustry === activeIndustry) return;
    activeIndustry = nextIndustry;
    clearLivingOfficeEvents(feed);
  }

  function emit() {
    syncIndustry();
    const frame = getLivingOfficeFrame(step, activeIndustry);
    onFrame?.(frame);
    appendLivingOfficeEvent(feed, frame, 5);
    step += 1;
    if (step >= frame.total) stop();
    return frame;
  }

  function stop() {
    if (!timer) return;
    clearInterval(timer);
    timer = null;
  }

  function reset() {
    stop();
    activeIndustry = normalizeIndustry(getIndustry?.());
    step = initialStep;
    staticEmitted = false;
    clearLivingOfficeEvents(feed);
    onFrame?.(getLivingOfficeFrame(initialStep, activeIndustry));
  }

  resetControl?.addEventListener?.('click', reset);

  return Object.freeze({
    start() {
      if (timer || step >= TIMES.length) return;
      if (!autoAdvance && staticEmitted) return;
      const frame = emit();
      staticEmitted = true;
      if (!autoAdvance || step >= frame.total) return;
      timer = setInterval(emit, intervalMs);
    },
    stop,
    reset
  });
}
