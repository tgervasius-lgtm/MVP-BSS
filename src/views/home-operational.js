(function registerHomeOperational(root){
  'use strict';

  function alertsList(alerts,escapeHtml){
    return `<div class="alert-list home-action-list">${alerts.map(alert=>`<button class="alert-item ${alert.tone}" data-bss-action="${alert.action||`navigate('${alert.target}')`}"><span aria-hidden="true">${alert.icon}</span><div><b>${escapeHtml(alert.title)}</b><small>${escapeHtml(alert.text)}</small></div><i>›</i></button>`).join('')||'<div class="empty-state compact">Nema otvorenih stavki koje traže pažnju.</div>'}</div>`;
  }

  function admin(context){
    const {metrics,weekly,alerts,checkins,checkouts,state,title,kpiCard,weeklyAttendanceTable,attendanceEvent,escapeHtml,pill,row,initials}=context;
    const absentToday=metrics.absent+metrics.vacation+metrics.sick;
    return `${title('Početna',new Date().toLocaleDateString('hr-HR',{weekday:'long',day:'numeric',month:'long',year:'numeric'}))}
      <section class="dashboard-kpis home-kpis" aria-label="Današnji operativni pokazatelji">
        ${kpiCard('present','✓',metrics.present,'Prisutni','Trenutačno evidentirani','green',"openWorkerStatus('Prisutni')")}
        ${kpiCard('review','!',metrics.review,'Za provjeru','Zapisi koji traže pažnju','red',"openAttendanceReview()")}
        ${kpiCard('absent','—',absentToday,'Odsutni danas','Godišnji, bolovanje ili druga odsutnost','blue',"openWorkerStatus('Odsutni danas')")}
        ${kpiCard('pending','□',metrics.pending,'Čeka odluku','Zahtjevi za odsutnost','amber',"openPendingRequests()")}
      </section>
      <div class="dashboard-layout home-operational-layout">
        <div class="dashboard-primary">
          <section class="card table-card"><div class="table-card-heading"><div><h2>Dnevni pregled</h2><p>Sažetak evidencije bez dodatnih dekorativnih grafova.</p></div><button class="link-btn" data-bss-action="navigate('attendance')">Otvori evidenciju →</button></div>${weeklyAttendanceTable(weekly)}</section>
          <section class="card home-activity-card"><div class="card-heading"><div><h2>Zadnje prijave i odjave</h2></div></div><div class="activity-columns"><div><h3>Prijave</h3>${checkins.map(event=>attendanceEvent(event,'in')).join('')}</div><div><h3>Odjave</h3>${checkouts.map(event=>attendanceEvent(event,'out')).join('')}</div></div></section>
        </div>
        <aside class="dashboard-secondary">
          <section class="card home-actions-card"><div class="card-heading"><div><h2>Za riješiti</h2><p>Stavke koje traže odluku ili provjeru.</p></div><span class="alert-total">${alerts.length}</span></div>${alertsList(alerts,escapeHtml)}</section>
          <section class="card system-card"><div class="card-heading"><div><h2>Status sustava</h2></div>${pill(state.terminal.online?'Online':'Offline')}</div><div class="system-row"><span><i class="system-light ${state.terminal.online?'online':'offline'}"></i>BSS Terminal 01</span><b>${state.terminal.online?'Povezan':'Nije povezan'}</b></div><div class="system-row"><span>Zadnja sinkronizacija</span><b>${escapeHtml(state.terminal.lastSync)}</b></div><div class="system-row"><span>Neposlani zapisi</span><b>${state.terminal.unsynced}</b></div><button class="btn secondary block" data-bss-action="navigate('terminal')">Detalji terminala</button></section>
          <section class="card"><div class="card-heading"><div><h2>Zadnje aktivnosti</h2></div></div>${state.audit.slice(0,3).map(item=>row(initials(item.user),item.action,`${escapeHtml(item.time)} · ${escapeHtml(item.module)}`)).join('')}<button class="btn secondary block" data-bss-action="navigate('audit')">Audit log</button></section>
        </aside>
      </div>`;
  }

  function manager(context){
    const {team,metrics,alerts,weekly,requestCount,departments,title,kpiCard,weeklyAttendanceTable,workerTable,escapeHtml}=context;
    const absentToday=metrics.absent+metrics.vacation+metrics.sick;
    return `${title('Početna',`Odjeli: ${departments.join(' i ')}`)}
      <section class="dashboard-kpis home-kpis" aria-label="Današnji pokazatelji tima">
        ${kpiCard('present','✓',metrics.present,'Prisutni','Trenutačno evidentirani','green',"openWorkerStatus('Prisutni')")}
        ${kpiCard('review','!',metrics.review,'Za provjeru','Zapisi mojeg tima','red',"openAttendanceReview()")}
        ${kpiCard('absent','—',absentToday,'Odsutni danas','Odsutnosti u opsegu','blue',"openWorkerStatus('Odsutni danas')")}
        ${kpiCard('pending','□',requestCount,'Čeka odluku','Zahtjevi za odsutnost','amber',"openPendingRequests()")}
      </section>
      <div class="dashboard-layout home-operational-layout"><div class="dashboard-primary"><section class="card table-card"><div class="table-card-heading"><div><h2>Dnevni pregled tima</h2></div><button class="link-btn" data-bss-action="navigate('attendance')">Evidencija tima →</button></div>${weeklyAttendanceTable(weekly)}</section><section class="card table-card"><div class="table-card-heading"><div><h2>Radnici mojeg tima</h2></div></div>${workerTable(team)}</section></div><aside class="dashboard-secondary"><section class="card home-actions-card"><div class="card-heading"><div><h2>Za riješiti</h2></div><span class="alert-total">${alerts.length}</span></div>${alertsList(alerts,escapeHtml)}</section></aside></div>`;
  }

  function worker(context){
    const {worker,shift,ownRequests,todayRecord,title,pill,escapeHtml,formatMinutes,recordMinutes,vacationRemaining}=context;
    return `${title(`Pozdrav, ${worker.name.split(' ')[0]}`,'',pill(worker.status))}
      <section class="card worker-home-card worker-home-operational"><div class="worker-home-status"><h2>${['Prisutan','Kasni'].includes(worker.status)?'Trenutačno si prijavljen':'Trenutačno nisi prijavljen'}</h2><p>${escapeHtml(shift?.name||'Bez smjene')} · ${escapeHtml(shift?.start||'—')} – ${escapeHtml(shift?.end||'—')}</p></div><div class="worker-home-facts"><button data-bss-action="navigate('mytime')"><span>Današnja prijava</span><b>${escapeHtml(todayRecord?.start||'—')}</b></button><button data-bss-action="navigate('mytime')"><span>Evidentirano danas</span><b>${formatMinutes(todayRecord?recordMinutes(todayRecord,true):0)}</b></button><button data-bss-action="navigate('vacations')"><span>Preostali godišnji</span><b>${vacationRemaining(worker.id)} dana</b></button><button data-bss-action="openPendingRequests()"><span>Otvoreni zahtjevi</span><b>${ownRequests.filter(request=>request.status==='Na čekanju').length}</b></button></div><div class="worker-home-links"><button class="btn secondary" data-bss-action="navigate('sharedLeave')">Kalendar</button><button class="btn secondary" data-bss-action="navigate('requests')">Zahtjevi</button></div></section>`;
  }

  function accountant(context){
    const {minutes,lastReport,title,pill,formatMinutes,escapeHtml}=context;
    return `${title('Početna','Pregled za knjigovodstvo.',pill('Samo čitanje'))}<section class="card accountant-home-card accountant-home-operational"><div><h2>Obračunski podaci</h2><button class="meta-line" data-bss-action="navigate('reports')"><span>Završeni sati u mjesecu</span><b>${formatMinutes(minutes)}</b></button><button class="meta-line" data-bss-action="navigate('reports')"><span>Posljednji izvoz</span><b>${escapeHtml(lastReport)}</b></button></div><div class="quick"><button data-bss-action="navigate('reports')"><b>Izvještaji</b><span>XLSX, PDF i tehnički CSV</span></button><button data-bss-action="navigate('sharedLeave')"><b>Kalendar</b><span>Samo odobrena razdoblja</span></button></div></section>`;
  }

  const homeOperational=Object.freeze({admin,manager,worker,accountant});
  const views=Object.freeze({...root.BSSCore?.views,homeOperational});
  root.BSSCore=Object.freeze({...root.BSSCore,views});

  if(typeof module==='object'&&module.exports)module.exports=homeOperational;
})(typeof globalThis==='object'?globalThis:window);
