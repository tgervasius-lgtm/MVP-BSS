const TIMES = ['06:58', '07:00', '07:01', '07:06', '07:12'];
const EVENTS = [
  'Marko Marić se prijavio.',
  'Jutarnja smjena je započela.',
  'Ivan Horvat čeka prijavu na terminalu.',
  'Administrator ima jednu evidenciju za provjeru.',
  'Voditelj ima jedan zahtjev za godišnji odmor.'
];

export function getLivingOfficeFrame(step = 0) {
  const index = Math.min(Math.max(Number.parseInt(step, 10) || 0, 0), TIMES.length - 1);
  return Object.freeze({
    time: TIMES[index],
    event: EVENTS[index],
    index,
    total: TIMES.length
  });
}

export function appendLivingOfficeEvent(feed, frame, maxItems = 8) {
  if (!feed || typeof feed.querySelector !== 'function' || typeof feed.append !== 'function') return false;
  const key = `living-${frame.index}`;
  if (feed.querySelector(`[data-live-event="${key}"]`)) return false;

  const item = feed.ownerDocument?.createElement?.('li');
  if (!item) return false;
  item.dataset.liveEvent = key;
  item.innerHTML = `<span>${frame.time}</span> ${frame.event}`;
  feed.append(item);

  const generated = Array.from(feed.querySelectorAll('[data-live-event]'));
  while (generated.length > maxItems) {
    generated.shift()?.remove();
  }
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
  resetControl = globalThis.document?.querySelector?.('#resetButton')
} = {}) {
  let step = 0;
  let timer = null;

  function emit() {
    const frame = getLivingOfficeFrame(step);
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
    onFrame?.(getLivingOfficeFrame(0));
  }

  resetControl?.addEventListener?.('click', reset);

  return Object.freeze({
    start() {
      if (timer) return;
      emit();
      timer = setInterval(emit, intervalMs);
    },
    stop,
    reset
  });
}
