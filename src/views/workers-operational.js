(function registerWorkersOperational(root){
  'use strict';

  function table(workers,context){
    const {shiftById,escapeHtml,pill}=context;
    const body=workers.map(worker=>{
      const shift=shiftById(worker.shiftId);
      return `<tr data-worker-id="${worker.id}">
        <td class="worker-code">R-${String(worker.id).padStart(3,'0')}</td>
        <td><button class="worker-name-link" data-bss-action="openWorker(${worker.id})"><b>${escapeHtml(worker.name)}</b><small>${escapeHtml(worker.email)}</small></button></td>
        <td>${escapeHtml(worker.dept)}</td>
        <td>${escapeHtml(worker.jobTitle||'—')}</td>
        <td><b>${escapeHtml(shift?.name||'Bez smjene')}</b><small>${escapeHtml(shift?`${shift.start} – ${shift.end}`:'Nema rasporeda')}</small></td>
        <td>${pill(worker.active?worker.status:'Neaktivan')}</td>
        <td><button class="table-detail-btn" data-bss-action="openWorker(${worker.id})" aria-label="Otvori radnika ${escapeHtml(worker.name)}">Otvori</button></td>
      </tr>`;
    }).join('');
    return `<div class="table-wrap"><table class="compact-table workers-table"><thead><tr><th>Šifra</th><th>Ime i prezime</th><th>Odjel</th><th>Radno mjesto</th><th>Smjena</th><th>Status</th><th></th></tr></thead><tbody>${body||'<tr><td colspan="7"><div class="empty-state">Nema radnika za odabrani filtar.</div></td></tr>'}</tbody></table></div>`;
  }

  function summary(visibleWorkers){
    const scoped=visibleWorkers,active=scoped.filter(worker=>worker.active);
    const present=active.filter(worker=>['Prisutan','Kasni'].includes(worker.status)).length;
    const away=active.filter(worker=>['Odsutna','Godišnji','Bolovanje'].includes(worker.status)).length;
    const inactive=scoped.filter(worker=>!worker.active).length;
    return `<section class="workers-summary" aria-label="Sažetak radnika">
      <div><span>Aktivni</span><b>${active.length}</b></div>
      <div><span>Prisutni</span><b>${present}</b></div>
      <div><span>Odsutni danas</span><b>${away}</b></div>
      <div><span>Neaktivni</span><b>${inactive}</b></div>
    </section>`;
  }

  function screen(context){
    const {workers,isAdmin,visibleWorkers,workerSearch,workerListTab,workerShiftFilter,shiftById,escapeHtml,title,workerTable}=context;
    const tabs=isAdmin?['Svi','Prisutni','Odsutni danas','Godišnji','Neaktivni']:['Svi','Prisutni','Odsutni danas','Godišnji'];
    const shiftLabel=workerShiftFilter==='Svi'?'':shiftById(workerShiftFilter)?.name||'';
    return `${title(isAdmin?'Radnici':'Moj tim',isAdmin?'Zaposlenici i operativni status.':'Radnici u dodijeljenim odjelima.',isAdmin?'<button class="btn" data-bss-action="openWorkerModal()">Dodaj radnika</button>':'')}
      <section class="card workers-control-card">
        <div class="workers-toolbar"><input id="workerSearch" aria-label="Traži radnike" placeholder="Traži po imenu, odjelu ili radnom mjestu" value="${escapeHtml(workerSearch)}"><button class="btn" data-bss-action="applyWorkerSearch()">Traži</button></div>
        <div class="tabs workers-tabs">${tabs.map(tab=>`<button class="tab ${workerListTab===tab?'active':''}" data-bss-action="setWorkerTab('${tab}')">${tab}</button>`).join('')}</div>
        ${shiftLabel?`<button class="active-filter" data-bss-action="openWorkerStatus('Svi')">Smjena: ${escapeHtml(shiftLabel)} · ukloni filtar ×</button>`:''}
      </section>
      <section class="card table-card workers-operational-card"><div class="table-card-heading"><div><h2>${isAdmin?'Popis radnika':'Radnici u mojem opsegu'}</h2><p>RFID i pristup nalaze se u detalju radnika.</p></div><span class="pill gray">${workers.length} radnika</span></div>${workerTable(workers)}</section>`;
  }

  const workersOperational=Object.freeze({table,summary,screen});
  const views=Object.freeze({...root.BSSCore?.views,workersOperational});
  root.BSSCore=Object.freeze({...root.BSSCore,views});

  if(typeof module==='object'&&module.exports)module.exports=workersOperational;
})(typeof globalThis==='object'?globalThis:window);
