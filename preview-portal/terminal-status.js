export function createTerminalFixtures({ terminals = 2, primaryArea = 'Glavni ulaz' } = {}) {
  const count = Math.min(Math.max(Number.parseInt(terminals, 10) || 1, 1), 8);
  return Object.freeze(Array.from({ length: count }, (_, index) => Object.freeze({
    id: `terminal-${index + 1}`,
    name: index === 0 ? primaryArea : `Lokacija ${index + 1}`,
    status: index === count - 1 && count > 2 ? 'syncing' : 'online',
    lastSync: index === count - 1 && count > 2 ? 'prije 2 min' : 'upravo sada'
  })));
}

export function createTerminalStatusPanel(fixtures) {
  const section = document.createElement('section');
  section.className = 'terminal-status-panel panel';
  section.setAttribute('aria-labelledby', 'terminalStatusTitle');
  section.innerHTML = `
    <div class="section-heading">
      <div><p class="eyebrow">Mreža uređaja</p><h2 id="terminalStatusTitle">Status terminala</h2></div>
      <span class="badge">Simulirani podaci</span>
    </div>
    <div class="terminal-status-grid"></div>
  `;

  const grid = section.querySelector('.terminal-status-grid');
  for (const terminal of fixtures) {
    const article = document.createElement('article');
    article.className = `terminal-status-card ${terminal.status}`;
    article.innerHTML = `
      <span class="terminal-status-dot" aria-hidden="true"></span>
      <div><strong>${terminal.name}</strong><small>${terminal.status === 'online' ? 'Online' : 'Sinkronizacija'} · ${terminal.lastSync}</small></div>
    `;
    grid.append(article);
  }
  return section;
}
