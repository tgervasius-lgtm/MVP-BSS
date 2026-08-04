const DEFAULT_DURATION = 6000;

export function normalizeToast(input = {}) {
  return Object.freeze({
    title: String(input.title ?? '').trim().slice(0, 80),
    message: String(input.message ?? '').trim().slice(0, 180),
    tone: ['success', 'info', 'warning'].includes(input.tone) ? input.tone : 'info'
  });
}

export function createToastCenter({
  documentRef = globalThis.document,
  durationMs = DEFAULT_DURATION,
  setTimeoutRef = globalThis.setTimeout?.bind(globalThis),
  clearTimeoutRef = globalThis.clearTimeout?.bind(globalThis)
} = {}) {
  const region = documentRef?.createElement?.('section');
  if (!region) throw new TypeError('Toast center requires a document.');
  region.className = 'toast-center';
  region.setAttribute('aria-live', 'polite');
  region.setAttribute('aria-atomic', 'false');

  const pendingTimers = new Set();

  function forgetTimer(timer) {
    if (timer !== undefined && timer !== null) pendingTimers.delete(timer);
  }

  function show(input) {
    const toast = normalizeToast(input);
    if (!toast.title && !toast.message) return null;

    const item = documentRef.createElement('article');
    item.className = `toast toast-${toast.tone}`;
    const content = documentRef.createElement('div');
    content.className = 'toast-content';
    const title = documentRef.createElement('strong');
    title.textContent = toast.title;
    const message = documentRef.createElement('span');
    message.textContent = toast.message;
    const close = documentRef.createElement('button');
    close.type = 'button';
    close.className = 'toast-close';
    close.setAttribute('aria-label', `Zatvori obavijest: ${toast.title || 'BSS obavijest'}`);
    close.textContent = '×';
    content.append(title, message);
    item.append(content, close);
    region.append(item);

    let timer;
    const remove = () => {
      forgetTimer(timer);
      item.remove();
    };
    timer = setTimeoutRef?.(remove, durationMs);
    if (timer !== undefined && timer !== null) pendingTimers.add(timer);

    close.addEventListener('click', () => {
      if (timer !== undefined && timer !== null) clearTimeoutRef?.(timer);
      remove();
    }, { once: true });
    return item;
  }

  function schedule(input, delayMs = 0) {
    const delay = Math.max(0, Number(delayMs) || 0);
    let timer;
    timer = setTimeoutRef?.(() => {
      forgetTimer(timer);
      show(input);
    }, delay);
    if (timer !== undefined && timer !== null) pendingTimers.add(timer);
    return timer ?? null;
  }

  function clear() {
    for (const timer of pendingTimers) clearTimeoutRef?.(timer);
    pendingTimers.clear();
    region.replaceChildren();
  }

  return Object.freeze({ element: region, show, schedule, clear });
}

export function pulseElement(element, className = 'value-pulse') {
  if (!element?.classList) return false;
  element.classList.remove(className);
  void element.offsetWidth;
  element.classList.add(className);
  return true;
}
