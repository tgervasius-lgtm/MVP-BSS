const DEFAULT_STEPS = Object.freeze([
  Object.freeze({ label: 'Učitavanje profila tvrtke', progress: 24 }),
  Object.freeze({ label: 'Povezivanje lokacija i terminala', progress: 52 }),
  Object.freeze({ label: 'Priprema zaposlenika i smjena', progress: 78 }),
  Object.freeze({ label: 'Command Center je spreman', progress: 100 })
]);

export function normalizeBootSteps(steps = DEFAULT_STEPS) {
  if (!Array.isArray(steps) || steps.length === 0) return DEFAULT_STEPS;
  return Object.freeze(steps.map((step, index) => Object.freeze({
    label: String(step?.label || `Korak ${index + 1}`),
    progress: Math.min(100, Math.max(0, Number(step?.progress) || 0))
  })));
}

export function createBootExperience({
  documentRef = globalThis.document,
  reducedMotion = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false,
  stepDelayMs = 520,
  steps = DEFAULT_STEPS
} = {}) {
  const sequence = normalizeBootSteps(steps);
  let running = false;
  let overlay = null;
  let runVersion = 0;

  function ensureOverlay() {
    if (overlay) return overlay;
    overlay = documentRef?.createElement?.('section');
    if (!overlay) return null;
    overlay.className = 'boot-experience hidden';
    overlay.setAttribute('role', 'status');
    overlay.setAttribute('aria-live', 'polite');
    overlay.innerHTML = `
      <div class="boot-card">
        <span class="boot-mark" aria-hidden="true">BSS</span>
        <p class="eyebrow">BSSProject d.o.o.</p>
        <h2>Radni dan se priprema</h2>
        <p class="boot-step">Pokretanje sustava</p>
        <div class="boot-progress" aria-hidden="true"><span></span></div>
      </div>`;
    documentRef.body?.append?.(overlay);
    return overlay;
  }

  function update(step) {
    if (!overlay) return;
    const label = overlay.querySelector?.('.boot-step');
    const bar = overlay.querySelector?.('.boot-progress span');
    if (label) label.textContent = step.label;
    if (bar?.style) bar.style.width = `${step.progress}%`;
  }

  async function run() {
    if (running) return false;
    const version = ++runVersion;
    running = true;
    const element = ensureOverlay();
    if (!element) {
      if (version === runVersion) running = false;
      return true;
    }
    element.classList.remove('hidden');
    element.classList.add('active');

    if (reducedMotion) {
      update(sequence.at(-1));
    } else {
      for (const step of sequence) {
        update(step);
        await new Promise((resolve) => globalThis.setTimeout(resolve, stepDelayMs));
        if (version !== runVersion) return false;
      }
    }

    if (version !== runVersion) return false;
    element.classList.remove('active');
    element.classList.add('complete');
    if (!reducedMotion) {
      await new Promise((resolve) => globalThis.setTimeout(resolve, 240));
      if (version !== runVersion) return false;
    }
    element.classList.add('hidden');
    element.classList.remove('complete');
    if (version === runVersion) running = false;
    return true;
  }

  function reset() {
    runVersion += 1;
    running = false;
    overlay?.classList?.add('hidden');
    overlay?.classList?.remove('active', 'complete');
    update(sequence[0]);
  }

  return Object.freeze({ run, reset, isRunning: () => running, element: () => ensureOverlay() });
}

export { DEFAULT_STEPS };
