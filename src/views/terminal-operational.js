(function registerTerminalOperational(root){
  'use strict';

  function render(context){
    const {terminal,allQueue,queue,events,runs,canControl,title,pill,escapeHtml,terminalEventsTable}=context;
    const signal=terminal.online?`${terminal.wifiSignal} dBm`:'Nema veze';
    const control=canControl
      ?`<div class="terminal-controls" data-terminal-controls><button class="btn secondary" data-bss-action="simulateTerminalOffline()" ${terminal.online?'':'disabled'}>Simuliraj prekid veze</button><button class="btn" data-bss-action="restoreTerminal()" ${terminal.online&&!allQueue.length?'disabled':''}>Vrati vezu i sinkroniziraj</button></div>`
      :'<div class="notice info terminal-readonly">Voditelj vidi samo događaje dodijeljenih odjela, bez prava upravljanja vezom ili sinkronizacijom.</div>';

    return `${title('Terminali','Status uređaja, lokalni red i sinkronizacija.')}
      <section class="card terminal-hero terminal-summary-card">
        <div><span class="terminal-summary-label">Uređaj</span><h2>${escapeHtml(terminal.name)}</h2><p>${escapeHtml(terminal.id)} · ${escapeHtml(terminal.location)} · ${escapeHtml(terminal.hardware)}</p></div>
        <div class="terminal-live ${terminal.online?'online':'offline'}"><i></i><span>${terminal.online?'Online':'Offline'}</span><b>${escapeHtml(terminal.lastHeartbeat)}</b></div>
      </section>
      <div class="terminal-kpis terminal-operational-kpis">
        <button data-bss-action="focusSection('terminalDiagnostics')"><span>Veza</span><b>${terminal.online?'Online':'Offline'}</b><small>${signal}</small></button>
        <button data-bss-action="focusSection('terminalQueue')"><span>Lokalni red</span><b>${allQueue.length}</b><small>${allQueue.length?'čeka sinkronizaciju':'prazan'}</small></button>
        <button data-bss-action="focusSection('terminalEvents')"><span>Događaji danas</span><b>${terminal.scans}</b><small>prihvaćeni i odbijeni</small></button>
        <button data-bss-action="focusSection('terminalSync')"><span>Zadnja sinkronizacija</span><b>${escapeHtml(terminal.lastSync)}</b><small>${runs[0]?`${runs[0].accepted} prihvaćeno · ${runs[0].duplicates} duplikata`:'nema podataka'}</small></button>
      </div>
      <div class="terminal-layout terminal-operational-layout">
        <section class="card" id="terminalDiagnostics" tabindex="-1"><div class="card-heading"><div><h2>Dijagnostika</h2><p>Identitet i stanje uređaja.</p></div></div><div class="terminal-health-grid"><div><span>RFID čitač</span>${pill(terminal.readerStatus)}</div><div><span>Zvučna potvrda</span>${pill(terminal.buzzerStatus)}</div><div><span>Firmware</span>${pill(terminal.firmwareStatus)}</div><div><span>Lokalna pohrana</span><b>${terminal.storageUsed}% zauzeto</b></div></div><div class="terminal-identity"><span>Serijski broj</span><b>${escapeHtml(terminal.serial)}</b><span>Verzija</span><b>${escapeHtml(terminal.version)}</b><span>Zadnji heartbeat</span><b>${escapeHtml(terminal.lastHeartbeat)}</b></div>${control}</section>
        <section class="card terminal-rule"><div class="card-heading"><div><h2>Offline integritet</h2><p>Događaj mora biti sačuvan i prihvaćen najviše jednom.</p></div></div><ol><li><b>1</b><span>Poznata aktivna kartica potvrđuje se lokalno.</span></li><li><b>2</b><span>Bez mreže događaj dobiva jedinstveni ID i ostaje u lokalnom redu.</span></li><li><b>3</b><span>Nakon povratka veze backend prihvaća svaki ID samo jednom.</span></li></ol><div class="terminal-rule-status">${pill(allQueue.length?'Čeka sinkronizaciju':'Sinkronizirano')}<span>${allQueue.length?`${allQueue.length} događaja sigurno spremljeno lokalno`:'Lokalni red je prazan'}</span></div></section>
      </div>
      <section class="card table-card terminal-queue" id="terminalQueue" tabindex="-1"><div class="table-card-heading"><div><h2>Lokalni red</h2><p>Offline događaji u dopuštenom opsegu.</p></div><span class="pill gray">${queue.length} u opsegu</span></div>${terminalEventsTable(queue,'Nema događaja u tvojem opsegu koji čekaju sinkronizaciju.')}<div class="table-summary"><span>${queue.length} vidljivih događaja · ${allQueue.length} ukupno u uređaju</span></div></section>
      <div class="terminal-layout terminal-operational-layout"><section class="card table-card" id="terminalEvents" tabindex="-1"><div class="table-card-heading"><div><h2>Zadnji događaji</h2></div><span class="pill gray">${events.length} prikazano</span></div>${terminalEventsTable(events.slice(0,8),'Još nema događaja terminala.')}</section><section class="card" id="terminalSync" tabindex="-1"><div class="card-heading"><div><h2>Zadnje sinkronizacije</h2></div></div><div class="sync-run-list">${runs.slice(0,5).map(run=>`<div class="sync-run"><div>${pill(run.status)}<time>${escapeHtml(run.time)}</time></div><dl><dt>Primljeno</dt><dd>${run.received}</dd><dt>Prihvaćeno</dt><dd>${run.accepted}</dd><dt>Duplikati</dt><dd>${run.duplicates}</dd></dl></div>`).join('')||'<div class="empty-state compact">Nema zabilježenih sinkronizacija.</div>'}</div></section></div>`;
  }

  const terminalOperational=Object.freeze({render});
  const views=Object.freeze({...root.BSSCore?.views,terminalOperational});
  root.BSSCore=Object.freeze({...root.BSSCore,views});

  if(typeof module==='object'&&module.exports)module.exports=terminalOperational;
})(typeof globalThis==='object'?globalThis:window);
