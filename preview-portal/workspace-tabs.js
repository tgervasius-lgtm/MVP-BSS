function tabsIn(container) {
  return [...container.querySelectorAll('[role="tab"][data-workspace-tab]')];
}

function panelFor(container, tab) {
  const id = tab.getAttribute('aria-controls');
  const panel = id ? container.ownerDocument?.getElementById?.(id) : null;
  return panel && container.contains(panel) ? panel : null;
}

export function activateWorkspaceTab(container, target, { focus = false } = {}) {
  const tabs = tabsIn(container);
  if (!tabs.includes(target)) return false;

  for (const tab of tabs) {
    const active = tab === target;
    tab.setAttribute('aria-selected', String(active));
    tab.tabIndex = active ? 0 : -1;
    const panel = panelFor(container, tab);
    if (panel) panel.hidden = !active;
  }

  if (focus) target.focus();
  return true;
}

export function installWorkspaceTabs(documentRef = globalThis.document) {
  if (!documentRef?.querySelectorAll) return Object.freeze([]);

  const controllers = [...documentRef.querySelectorAll('[data-workspace-tabs]')].map((container) => {
    const tabs = tabsIn(container);
    const initial = tabs.find((tab) => tab.getAttribute('aria-selected') === 'true') ?? tabs[0];
    if (initial) activateWorkspaceTab(container, initial);

    const onClick = (event) => {
      const tab = event.target.closest?.('[role="tab"][data-workspace-tab]');
      if (tab && container.contains(tab)) activateWorkspaceTab(container, tab);
    };

    const onKeyDown = (event) => {
      const tab = event.target.closest?.('[role="tab"][data-workspace-tab]');
      const index = tabs.indexOf(tab);
      if (index < 0) return;

      const keyMap = {
        ArrowRight: (index + 1) % tabs.length,
        ArrowDown: (index + 1) % tabs.length,
        ArrowLeft: (index - 1 + tabs.length) % tabs.length,
        ArrowUp: (index - 1 + tabs.length) % tabs.length,
        Home: 0,
        End: tabs.length - 1
      };
      if (!Object.hasOwn(keyMap, event.key)) return;
      event.preventDefault();
      activateWorkspaceTab(container, tabs[keyMap[event.key]], { focus: true });
    };

    container.addEventListener('click', onClick);
    container.addEventListener('keydown', onKeyDown);

    return Object.freeze({
      container,
      activate(tabId, options) {
        const tab = tabs.find((candidate) => candidate.id === tabId);
        return tab ? activateWorkspaceTab(container, tab, options) : false;
      },
      destroy() {
        container.removeEventListener('click', onClick);
        container.removeEventListener('keydown', onKeyDown);
      }
    });
  });

  return Object.freeze(controllers);
}
