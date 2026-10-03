(function registerHomeOperational(root){
  'use strict';

  function workspaceHead({eyebrow,heading,description,period,scope,roleLabel,escapeHtml}){
    return `<section class="card home-workspace-head">
      <div class="home-workspace-title">
        <div><span>${escapeHtml(eyebrow)}</span><h2>${escapeHtml(heading)}</h2><p>${escapeHtml(description)}</p></div>
        <div class="home-workspace-scope"><b>${escapeHtml(period)}</b><span>${escapeHtml(scope)}</span><small>${escapeHtml(roleLabel)}</small></div>
      </div>
    </section>`;
  }

  function summaryStrip(items,label,escapeHtml){
    return `<section class="home-summary-strip" aria-label="${escapeHtml(label)}">${items.map(item=>`<button class="home-summary-item" data-kpi="${item.key}" data-bss-action="${item.action}" aria-label="${escapeHtml(`${item.label}: ${item.value}`)}"><span>${escapeHtml(item.label)}</span><b>${escapeHtml(item.value)}</b><small>${escapeHtml(item.detail)}</small></button>`).join('')}</section>`;
  }

  function alertsList(alerts,escapeHtml){
    return `<div class="home-queue-list">${alerts.map(alert=>`<button class="home-queue-row ${alert.tone}" data-bss-action="${alert.action||`navigate('${alert.target}')`}"><span class="home-queue-mark" aria-hidden="true">${alert.icon}</span><div><b>${escapeHtml(alert.title)}</b><small>${escapeHtml(alert.text)}</small></div><i aria-hidden="true">›</i></button>`).join('')||'<div class="empty-state compact">Nema otvorenih stavki koje traže pažnju.</div>'}</div>`;
  }

  function admin(context){
    const {metrics,weekly,alerts,checkins,checkouts,state,title,weeklyAttendanceTable,attendanceEvent,escapeHtml,pill}=context;
    const absentToday=metrics.absent+metrics.vacation+metrics.sick;
    const dateLabel=new Date().toLocaleDateString('hr-HR',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
    const summary=summaryStrip([
      {key:'present',value:metrics.present,label:'Prisutni',detail:'Trenutačno evidentirani',action:"openWorkerStatus('Prisutni')"},
      {key:'review',value:metrics.review,label:'Za provjeru',detail:'Zapisi koji traže pažnju',action:'openAttendanceReview()'},
      {key:'absent',value:absentToday,label:'Odsutni danas',detail:'Odsutnosti u evidenciji',action:"openWorkerStatus('Odsutni danas')"},
      {key:'pending',value:metrics.pending,label:'Čeka odluku',detail:'Zahtjevi za odsutnost',action:'openPendingRequests()'}
    ],'Današnji operativni pokazatelji',escapeHtml);

    return `${title('Početna','Operativni pregled dana.')}
      ${workspaceHead({
        eyebrow:'Današnji operativni pregled',
        heading:'Stanje rada i evidencije',
        description:'Jedan pregled za prisutnost, iznimke, odluke i stanje terminala.',
        period:dateLabel,
        scope:'Cijela tvrtka',
        roleLabel:'Administrator',
        escapeHtml
      })}
      ${summary}
      <div class="dashboard-layout home-operational-layout">
        <div class="dashboard-primary">
          <section class="card table-card home-daily-module"><div class="table-card-heading"><div><h2>Dnevni pregled</h2><p>Prijave, odjave i otvorene smjene po radnom danu.</p></div><button class="link-btn" data-bss-action="navigate('attendance')">Otvori evidenciju →</button></div>${weeklyAttendanceTable(weekly)}</section>
          <section class="card home-activity-card"><div class="card-heading"><div><h2>Zadnje prijave i odjave</h2><p>Posljednji evidentirani terminalski događaji.</p></div></div><div class="activity-columns"><div><h3>Prijave</h3>${checkins.map(event=>attendanceEvent(event,'in')).join('')}</div><div><h3>Odjave</h3>${checkouts.map(event=>attendanceEvent(event,'out')).join('')}</div></div></section>
        </div>
        <aside class="dashboard-secondary">
          <section class="card home-actions-card"><div class="card-heading"><div><h2>Za riješiti</h2><p>Stavke koje traže odluku ili provjeru.</p></div><span class="alert-total">${alerts.length}</span></div>${alertsList(alerts,escapeHtml)}</section>
          <section class="card home-operations-card">
            <div class="home-panel-section"><div class="card-heading"><div><h2>Status sustava</h2></div>${pill(state.terminal.online?'Online':'Offline')}</div><div class="system-row"><span><i class="system-light ${state.terminal.online?'online':'offline'}"></i>BSS Terminal 01</span><b>${state.terminal.online?'Povezan':'Nije povezan'}</b></div><div class="system-row"><span>Zadnja sinkronizacija</span><b>${escapeHtml(state.terminal.lastSync)}</b></div><div class="system-row"><span>Neposlani zapisi</span><b>${state.terminal.unsynced}</b></div><button class="home-text-action" data-bss-action="navigate('terminal')">Detalji terminala →</button></div>
            <div class="home-panel-section home-audit-section"><div class="card-heading"><div><h2>Zadnje aktivnosti</h2></div></div><div class="home-audit-list">${state.audit.slice(0,3).map(item=>`<div class="home-audit-row"><div><b>${escapeHtml(item.action)}</b><span>${escapeHtml(item.time)} · ${escapeHtml(item.module)}</span></div></div>`).join('')||'<div class="empty-state compact">Još nema aktivnosti.</div>'}</div><button class="home-text-action" data-bss-action="navigate('audit')">Audit log →</button></div>
          </section>
        </aside>
      </div>`;
  }

  function manager(context){
    const {team,metrics,alerts,weekly,requestCount,departments,title,weeklyAttendanceTable,workerTable,escapeHtml}=context;
    const absentToday=metrics.absent+metrics.vacation+metrics.sick;
    const scope=departments.length?`Odjeli: ${departments.join(', ')}`:'Dodijeljeni odjeli';
    const summary=summaryStrip([
      {key:'present',value:metrics.present,label:'Prisutni',detail:'Trenutačno evidentirani',action:"openWorkerStatus('Prisutni')"},
      {key:'review',value:metrics.review,label:'Za provjeru',detail:'Zapisi mojeg tima',action:'openAttendanceReview()'},
      {key:'absent',value:absentToday,label:'Odsutni danas',detail:'Odsutnosti u opsegu',action:"openWorkerStatus('Odsutni danas')"},
      {key:'pending',value:requestCount,label:'Čeka odluku',detail:'Zahtjevi za odsutnost',action:'openPendingRequests()'}
    ],'Današnji pokazatelji tima',escapeHtml);

    return `${title('Početna','Operativni pregled tima.')}
      ${workspaceHead({
        eyebrow:'Današnji operativni pregled',
        heading:'Stanje dodijeljenog tima',
        description:'Prisutnost, iznimke i odluke unutar voditeljeva opsega.',
        period:new Date().toLocaleDateString('hr-HR',{weekday:'long',day:'numeric',month:'long',year:'numeric'}),
        scope,
        roleLabel:'Voditelj',
        escapeHtml
      })}
      ${summary}
      <div class="dashboard-layout home-operational-layout">
        <div class="dashboard-primary">
          <section class="card table-card home-daily-module"><div class="table-card-heading"><div><h2>Dnevni pregled tima</h2><p>Prijave, odjave i otvorene smjene u dodijeljenom opsegu.</p></div><button class="link-btn" data-bss-action="navigate('attendance')">Evidencija tima →</button></div>${weeklyAttendanceTable(weekly)}</section>
          <section class="card table-card"><div class="table-card-heading"><div><h2>Radnici mojeg tima</h2><p>Operativni statusi radnika u dodijeljenim odjelima.</p></div></div>${workerTable(team)}</section>
        </div>
        <aside class="dashboard-secondary"><section class="card home-actions-card"><div class="card-heading"><div><h2>Za riješiti</h2><p>Stavke koje traže odluku ili provjeru.</p></div><span class="alert-total">${alerts.length}</span></div>${alertsList(alerts,escapeHtml)}</section></aside>
      </div>`;
  }

  function worker(context){
    const {worker,shift,ownRequests,todayRecord,title,pill,escapeHtml,formatMinutes,recordMinutes,vacationRemaining}=context;
    const isPresent=['Prisutan','Kasni'].includes(worker.status);
    const checkIn=todayRecord?.start||worker.todayStart||'—';
    const recorded=todayRecord?formatMinutes(recordMinutes(todayRecord,true)):'—';
    const pending=ownRequests.filter(request=>request.status==='Na čekanju').length;
    const shiftLabel=`${escapeHtml(shift?.name||'Bez smjene')} · ${escapeHtml(shift?.start||'—')} – ${escapeHtml(shift?.end||'—')}`;
    return `${title(`Pozdrav, ${worker.name.split(' ')[0]}`,`Danas · ${shift?.name||'Bez smjene'}`,pill(worker.status))}
      <div class="worker-home-workspace">
        <section class="card worker-today-card">
          <div class="worker-today-head"><div><span class="worker-kicker">Današnja evidencija</span><h2>${isPresent?'Radni dan je u tijeku':'Nema aktivne prijave'}</h2><p>${shiftLabel}</p></div><span class="worker-presence-dot ${isPresent?'online':''}" aria-hidden="true"></span></div>
          <div class="worker-today-grid">
            <button data-bss-action="navigate('mytime')"><span>Prijava</span><b>${escapeHtml(checkIn)}</b><small>Otvori moje sate</small></button>
            <button data-bss-action="navigate('mytime')"><span>Evidentirano danas</span><b>${escapeHtml(recorded)}</b><small>Pregled evidencije</small></button>
          </div>
          <div class="worker-home-links"><button class="btn secondary" data-bss-action="navigate('mytime')">Moji sati</button><button class="btn secondary" data-bss-action="navigate('sharedLeave')">Kalendar</button></div>
        </section>
        <aside class="card worker-summary-card">
          <div class="worker-summary-head"><span class="worker-kicker">Moj pregled</span><h2>Odsutnosti i zahtjevi</h2></div>
          <button class="worker-summary-row" data-bss-action="navigate('vacations')"><span><b>Preostali godišnji</b><small>Raspoloživo za planiranje</small></span><strong>${vacationRemaining(worker.id)} dana</strong></button>
          <button class="worker-summary-row" data-bss-action="openPendingRequests()"><span><b>Otvoreni zahtjevi</b><small>Zahtjevi koji čekaju odluku</small></span><strong>${pending}</strong></button>
          <button class="btn block" data-bss-action="navigate('requests')">Moji zahtjevi</button>
        </aside>
      </div>`;
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
