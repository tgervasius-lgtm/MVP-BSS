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

export function createLivingOfficeController({ onFrame, intervalMs = 2400 } = {}) {
  let step = 0;
  let timer = null;

  function emit() {
    const frame = getLivingOfficeFrame(step);
    onFrame?.(frame);
    step = (step + 1) % frame.total;
  }

  return Object.freeze({
    start() {
      if (timer) return;
      emit();
      timer = setInterval(emit, intervalMs);
    },
    stop() {
      if (!timer) return;
      clearInterval(timer);
      timer = null;
    },
    reset() {
      step = 0;
      onFrame?.(getLivingOfficeFrame(0));
    }
  });
}
