(function registerLeaveCalendarOperational(root){
  'use strict';

  function calendarHeader({label,isAdmin,vacationDepartment,escapeHtml,departmentList,includeDepartment=true}){
    return `<div class="calendar-card-toolbar"><div class="calendar-period-control"><button data-bss-action="changeCalendarPeriod(-1)" aria-label="Prethodno razdoblje">‹</button><b>${escapeHtml(label)}</b><button data-bss-action="changeCalendarPeriod(1)" aria-label="Sljedeće razdoblje">›</button></div><div class="calendar-card-actions"><div class="view-switch"><button class="${root.calendarMode==='month'?'active':''}" data-bss-action="setCalendarMode('month')">Mjesec</button><button class="${root.calendarMode==='year'?'active':''}" data-bss-action="setCalendarMode('year')">Godina</button></div>${isAdmin&&includeDepartment?`<select class="calendar-filter" data-bss-change="setVacationDepartment(this.value)"><option value="Svi" ${vacationDepartment==='Svi'?'selected':''}>Svi odjeli</option>${departmentList().map(dept=>`<option ${vacationDepartment===dept?'selected':''}>${escapeHtml(dept)}</option>`).join('')}</select>`:''}</div></div>`;
  }

  function vacations(context){
    const {currentRole,calendarYear,calendarMonth,calendarMode,vacationDepartment,requests,isAdmin,balanceWorkers,personalBalance,departmentSummary,title,escapeHtml,departmentList,calendarMonthCard,vacationBalanceVisual,requestTable,vacationBalanceSummary}=context;
    root.calendarMode=calendarMode;
    const titleText=currentRole==='worker'?'Moj godišnji':currentRole==='manager'?'Godišnji mojeg tima':currentRole==='accountant'?'Odobrene odsutnosti':'Godišnji';
    const subtitle=currentRole==='worker'?'Pregled godišnjeg i zahtjeva.':isAdmin?'Planirane odsutnosti i kapacitet po odjelima.':'Odobrena razdoblja u dopuštenom opsegu.';
    const label=calendarMode==='year'?String(calendarYear):new Date(calendarYear,calendarMonth,1).toLocaleDateString('hr-HR',{month:'long',year:'numeric'});
    const calendar=calendarMode==='year'
      ?`<div class="year-calendar">${Array.from({length:12},(_,month)=>calendarMonthCard(calendarYear,month,requests)).join('')}</div>`
      :`<div class="month-view">${calendarMonthCard(calendarYear,calendarMonth,requests,true)}</div>`;
    const pendingVisible=currentRole!=='accountant';
    return `${title(titleText,subtitle,'<button class="btn secondary" data-bss-action="navigate(\'sharedLeave\')">Kalendar</button>')}
      ${personalBalance?vacationBalanceVisual(personalBalance,calendarYear):''}
      ${departmentSummary.length?`<section class="card table-card leave-capacity-card"><div class="table-card-heading"><div><h2>Kapacitet po odjelima</h2><p>Operativni pregled planiranih odsutnosti.</p></div></div><div class="table-wrap"><table class="compact-table department-capacity-table"><thead><tr><th>Odjel</th><th>Radnici</th><th>Odobreni dani</th><th>Na čekanju</th><th>Preklapanja</th><th></th></tr></thead><tbody>${departmentSummary.map(item=>`<tr><td><b>${escapeHtml(item.department)}</b></td><td>${item.workers}</td><td>${item.approvedDays}</td><td>${item.pending}</td><td><b class="${item.conflicts?'negative':'neutral'}">${item.conflicts}</b></td><td><button class="table-detail-btn" data-bss-action="setVacationDepartment('${escapeHtml(item.department)}')">Prikaži</button></td></tr>`).join('')}</tbody></table></div></section>`:''}
      <section class="card calendar-card leave-calendar-card">${calendarHeader({label,isAdmin,vacationDepartment,escapeHtml,departmentList})}${calendar}<div class="calendar-legend"><span><i class="legend-dot approved"></i>Odobreno</span>${pendingVisible?'<span><i class="legend-dot pending"></i>Na čekanju</span>':''}<span><i class="legend-dot mixed"></i>Više statusa</span></div></section>
      ${balanceWorkers.length?`<section class="card table-card"><div class="table-card-heading"><div><h2>Stanje godišnjeg ${calendarYear}.</h2><p>Fond i rezervirana razdoblja po radniku.</p></div></div><div class="table-wrap"><table class="compact-table vacation-balance-table"><thead><tr><th>Radnik</th><th>Fond</th><th>Odobreno</th><th>Rezervirano</th><th>Preostalo</th><th>Dostupno</th><th></th></tr></thead><tbody>${balanceWorkers.map(worker=>{const balance=vacationBalanceSummary(worker.id,calendarYear);return `<tr><td><b>${escapeHtml(worker.name)}</b><small>${escapeHtml(worker.dept)}</small></td><td>${balance.allowance}</td><td>${balance.used}</td><td>${balance.reserved}</td><td>${balance.remaining}</td><td><b>${balance.available}</b></td><td><button class="table-detail-btn" data-bss-action="openWorker(${worker.id})">Otvori</button></td></tr>`;}).join('')}</tbody></table></div></section>`:''}
      <section class="card table-card"><div class="table-card-heading"><div><h2>${currentRole==='worker'?'Moja aktivna razdoblja':'Planirane odsutnosti'}</h2></div><span class="pill gray">${requests.length} razdoblja</span></div>${requestTable(requests.slice().sort((a,b)=>a.start.localeCompare(b.start)),false)}</section>
      ${currentRole==='worker'?'<button class="btn block" data-bss-action="navigate(\'requests\')">Pošalji novi zahtjev</button>':''}`;
  }

  function shared(context){
    const {calendarYear,calendarMonth,calendarMode,requests,title,escapeHtml,calendarMonthCard,sharedLeaveScopeControl,workerById,isoLabel}=context;
    root.calendarMode=calendarMode;
    const label=calendarMode==='year'?String(calendarYear):new Date(calendarYear,calendarMonth,1).toLocaleDateString('hr-HR',{month:'long',year:'numeric'});
    const calendar=calendarMode==='year'
      ?`<div class="year-calendar shared-year-calendar">${Array.from({length:12},(_,month)=>calendarMonthCard(calendarYear,month,requests,false,'showSharedLeaveDay',true)).join('')}</div>`
      :`<div class="month-view">${calendarMonthCard(calendarYear,calendarMonth,requests,true,'showSharedLeaveDay',true)}</div>`;
    return `${title('Kalendar','Odobreni godišnji u dopuštenom opsegu.')}
      <section class="card shared-leave-scope-card calendar-privacy-card">${sharedLeaveScopeControl()}<p>Prikazuju se samo ime zaposlenika i odobreni datumi godišnjeg. Bez bolovanja, razloga, napomena ili salda.</p></section>
      <section class="card calendar-card shared-leave-calendar">${calendarHeader({label,isAdmin:false,vacationDepartment:'Svi',escapeHtml,departmentList:()=>[],includeDepartment:false})}${calendar}<div class="calendar-legend"><span><i class="legend-dot approved"></i>Odobreni godišnji</span></div></section>
      <section class="card table-card" id="sharedLeaveDetails" tabindex="-1"><div class="table-card-heading"><div><h2>Odobrena razdoblja ${calendarYear}.</h2><p>Sva odobrena razdoblja u odabranoj godini. Prikaz samo potrebnih podataka.</p></div><span class="pill gray">${requests.length} razdoblja</span></div><div class="table-wrap"><table class="compact-table shared-leave-table"><thead><tr><th>Zaposlenik</th><th>Od</th><th>Do</th></tr></thead><tbody>${requests.map(request=>`<tr><td><b>${escapeHtml(workerById(request.workerId)?.name||'Radnik')}</b></td><td>${escapeHtml(isoLabel(request.start))}</td><td>${escapeHtml(isoLabel(request.end))}</td></tr>`).join('')||'<tr><td colspan="3"><div class="empty-state">Nema odobrenih godišnjih u dopuštenom opsegu.</div></td></tr>'}</tbody></table></div></section>`;
  }

  const leaveCalendarOperational=Object.freeze({calendarHeader,vacations,shared});
  const views=Object.freeze({...root.BSSCore?.views,leaveCalendarOperational});
  root.BSSCore=Object.freeze({...root.BSSCore,views});

  if(typeof module==='object'&&module.exports)module.exports=leaveCalendarOperational;
})(typeof globalThis==='object'?globalThis:window);
