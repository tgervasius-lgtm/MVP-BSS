const DEFAULT_DURATION = 2800;

export function normalizeToast(input = {}) {
  return Object.freeze({
    title: String(input.title ?? '').trim().slice(0, 80),
    message: String(input.message ?? '').trim().slice(0, 180),
    tone: ['success', 'info', 'warning'].includes(input.tone) ? input.tone : 'info'
  });
}

export function createToastCenter({ documentRef = globalThis.document, durationMs = DEFAULT_DURATION } = {}) {
  const region = documentRef?.createElement?.('section');
  if (!region) throw new TypeError('Toast center requires a document.');
  region.className = 'toast-center';
  region.setAttribute('aria-live', 'polite');
  region.setAttribute('aria-atomic', 'false');

  function show(input) {
    const toast = normalizeToast(input);
    if (!toast.title && !toast.message) return null;

    const item = documentRef.createElement('article');
    item.className = `toast toast-${toast.tone}`;
    item.innerHTML = `<strong>${toast.title}</strong><span>${toast.message}</span>`;
    region.append(item);

    const remove = () => item.remove();
    const timer = globalThis.setTimeout?.(remove, durationMs);
    item.addEventListener('click', () => {
      if (timer) globalThis.clearTimeout?.(timer);
      remove();
    }, { once: true });
    return item;
  }

  function clear() {
    region.replaceChildren();
  }

  return Object.freeze({ element: region, show, clear });
}

export function pulseElement(element, className = 'value-pulse') {
  if (!element?.classList) return false;
  element.classList.remove(className);
  void element.offsetWidth;
  element.classList.add(className);
  return true;
}
