export function createReleasePolish({ documentRef = globalThis.document } = {}) {
  const roleLabel = documentRef?.getElementById?.('roleLabel');
  const completion = documentRef?.getElementById?.('completionView');
  const demo = documentRef?.getElementById?.('demoView');
  const main = documentRef?.querySelector?.('main');

  if (main && !main.id) main.id = 'mainContent';
  main?.setAttribute?.('tabindex', '-1');

  if (documentRef?.body && !documentRef.getElementById?.('skipToContent')) {
    const skip = documentRef.createElement('a');
    skip.id = 'skipToContent';
    skip.className = 'skip-link';
    skip.href = '#mainContent';
    skip.textContent = 'Preskoči na glavni sadržaj';
    documentRef.body.prepend(skip);
  }

  let previousRole = roleLabel?.textContent ?? '';
  let completionWasVisible = false;

  const observer = typeof MutationObserver === 'function' && roleLabel
    ? new MutationObserver(() => {
        const currentRole = roleLabel.textContent ?? '';
        if (currentRole !== previousRole) {
          previousRole = currentRole;
          const activeView = documentRef.querySelector?.('.role-view:not(.hidden)');
          activeView?.setAttribute?.('tabindex', '-1');
          activeView?.focus?.({ preventScroll: true });
        }
      })
    : null;

  observer?.observe?.(roleLabel, { childList: true, characterData: true, subtree: true });

  const completionObserver = typeof MutationObserver === 'function' && completion
    ? new MutationObserver(() => {
        const visible = !completion.classList?.contains?.('hidden');
        if (visible && !completionWasVisible) {
          completion.setAttribute?.('tabindex', '-1');
          completion.focus?.({ preventScroll: false });
        }
        completionWasVisible = visible;
      })
    : null;

  completionObserver?.observe?.(completion, { attributes: true, attributeFilter: ['class'] });

  demo?.setAttribute?.('aria-busy', 'false');

  return Object.freeze({
    destroy() {
      observer?.disconnect?.();
      completionObserver?.disconnect?.();
    }
  });
}
