const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const test = require('node:test');
const {JSDOM} = require('jsdom');

const html = fs.readFileSync('index.html','utf8');
const source = fs.readFileSync('app.js','utf8');

function boot(role='admin'){
  const dom = new JSDOM(html,{url:'https://bss.test/',runScripts:'outside-only'});
  dom.window.TextEncoder = TextEncoder;
  dom.window.Blob = Blob;
  const context = dom.getInternalVMContext();
  vm.runInContext(source,context);
  dom.window.document.querySelector('#loginRole').value = role;
  dom.window.login();
  return {
    window:dom.window,
    document:dom.window.document,
    state:()=>vm.runInContext('state',context),
    evaluate:expression=>vm.runInContext(expression,context)
  };
}

test('svaka uloga može otvoriti samo svoje ekrane bez greške',()=>{
  for(const role of ['admin','manager','worker','accountant']){
    const {window,document} = boot(role);
    const targets = [...new Set([...document.querySelectorAll('.desktop-nav .drawer-item')]
      .map(item=>item.getAttribute('onclick').match(/'([^']+)'/)?.[1]).filter(Boolean))];
    assert.ok(targets.length >= 3);
    for(const target of targets){
      window.navigate(target);
      assert.ok(document.querySelector('.screen'));
      assert.equal(document.querySelector('#content').textContent.includes('undefined'),false);
    }
  }
});

test('evidencija i RFID simulator su odvojeni',()=>{
  const {window,document} = boot('admin');
  window.navigate('attendance');
  assert.ok(document.querySelector('table'));
  assert.equal(document.querySelector('.rfid-ring'),null);
  window.navigate('terminalDemo');
  assert.ok(document.querySelector('.rfid-ring'));
});

test('Demo 3.0 dashboard zadržava potpuni operativni pregled u Sprintu 5',()=>{
  const {window,document,state} = boot('admin');
  assert.match(document.querySelector('.version-chip').textContent,/v3\.0/);
  assert.match(document.querySelector('.side-footer').textContent,/Sprint 5/);
  assert.equal(document.querySelectorAll('.dashboard-kpis .kpi-card').length,8);
  assert.equal(document.querySelector('[data-kpi="present"] .kpi-value').textContent,'3');
  assert.equal(document.querySelector('[data-kpi="absent"] .kpi-value').textContent,'1');
  assert.equal(document.querySelector('[data-kpi="vacation"] .kpi-value').textContent,'1');
  assert.equal(document.querySelector('[data-kpi="sick"] .kpi-value').textContent,'1');
  assert.equal(document.querySelectorAll('.weekly-chart .chart-day').length,5);
  assert.ok(document.querySelectorAll('.activity-columns .activity-item').length>=6);
  const metrics=window.dashboardMetrics(state().workers.filter(worker=>worker.active));
  assert.equal(metrics.active,7);
  assert.ok(metrics.monthMinutes>0);
  assert.ok(metrics.overtime>=0);
});

test('navigacija je grupirana i prikazuje brojače otvorenih stavki',()=>{
  const {document} = boot('admin');
  const groups=new Set([...document.querySelectorAll('.desktop-nav .nav-group-label')].map(item=>item.textContent));
  assert.deepEqual(groups,new Set(['Pregled','Ljudi i rasporedi','Odobravanja','Sustav','Demo alati']));
  const badges=[...document.querySelectorAll('.desktop-nav .nav-count')].map(item=>Number(item.textContent));
  assert.ok(badges.length>=2);
  assert.ok(badges.every(value=>value>0));
});

test('Demo 3.0 ostaje unutar uskog BSS opsega',()=>{
  const {document}=boot('admin');
  const text=document.querySelector('#app').textContent.toLocaleLowerCase('hr');
  assert.doesNotMatch(text,/skladište|gps|geofencing|ai analitika|obračun plaće|otvaranje vrata|crm/);
});

test('Sprint 2 evidencija povezuje plan, saldo, aktivne zapise i odstupanja',()=>{
  const {window,document,state}=boot('admin');
  window.navigate('attendance');
  assert.equal(document.querySelectorAll('.attendance-tabs button').length,3);
  assert.equal(document.querySelectorAll('.attendance-live-item').length,3);
  assert.equal(document.querySelectorAll('.attendance-table .table-detail-btn').length,22);
  const summary=window.attendanceSummary(state().records);
  assert.equal(summary.records,22);
  assert.equal(summary.completed,18);
  assert.equal(summary.active,3);
  assert.equal(summary.review,4);
  assert.equal(summary.plannedMinutes,8100);
  assert.equal(summary.workedMinutes,8232);
  assert.equal(summary.balanceMinutes,132);

  window.setAttendanceView('review');
  assert.equal(window.filteredAttendanceRecords().length,4);
  assert.ok(window.filteredAttendanceRecords().every(record=>['Kašnjenje','Nepotpun zapis'].includes(record.status)));
  assert.equal(document.querySelectorAll('.attendance-table .table-detail-btn').length,4);

  window.setAttendanceView('active');
  assert.equal(window.filteredAttendanceRecords().length,3);
  assert.ok(window.filteredAttendanceRecords().every(record=>record.date==='2026-07-10'&&!record.end));
});

test('detalj zapisa prikazuje smjenu, saldo i kontrolirani put korekcije',()=>{
  const {window,document}=boot('admin');
  window.navigate('attendance');
  window.openAttendanceRecord(8);
  assert.ok(document.querySelector('#modal').classList.contains('open'));
  const text=document.querySelector('#modal').textContent;
  assert.match(text,/Marko Marić/);
  assert.match(text,/Jutarnja/);
  assert.match(text,/Nepotpun zapis/);
  assert.match(text,/Korekcija: Na čekanju/);
  assert.equal(document.querySelectorAll('.record-detail-grid > div').length,6);
});

test('radnikova evidencija ostaje privatna i korekcija kreće iz odabranog zapisa',()=>{
  const {window,document,state}=boot('worker');
  window.navigate('mytime');
  assert.equal(document.querySelector('#myTimeMonth').value,'2026-07');
  assert.equal(document.querySelectorAll('.attendance-table .table-detail-btn').length,5);
  const summary=window.attendanceSummary(state().records.filter(record=>record.workerId===1&&record.date.startsWith('2026-07')));
  assert.equal(summary.workedMinutes,1837);
  assert.equal(summary.plannedMinutes,1800);
  assert.equal(summary.balanceMinutes,37);
  assert.doesNotMatch(document.querySelector('#content').textContent,/Marko Marić|Petra Novak/);

  window.openAttendanceRecord(5);
  window.startCorrectionFromRecord(5);
  assert.equal(document.querySelector('#corrDate').value,'2026-07-10');
  assert.equal(document.querySelector('#corrStart').value,'07:42');
  assert.equal(document.querySelector('#corrEnd').value,'');
  document.querySelector('#corrEnd').value='16:00';
  document.querySelector('#corrReason').value='Zaboravljena odjava';
  const before=state().corrections.length;
  window.submitCorrection();
  assert.equal(state().corrections.length,before+1);
  assert.equal(state().corrections[0].workerId,1);
  assert.equal(state().corrections[0].status,'Na čekanju');
  assert.match(state().audit[0].action,/Poslana korekcija/);
});

test('voditelj u Sprintu 2 ne može otvoriti zapis izvan svojih odjela',()=>{
  const {window,document}=boot('manager');
  window.navigate('attendance');
  const summary=window.attendanceSummary(window.attendanceRecordsForCurrentFilters());
  assert.equal(summary.records,12);
  assert.equal(summary.active,2);
  assert.equal(summary.review,2);
  const text=document.querySelector('#content').textContent;
  assert.match(text,/Ivan Horvat|Marko Marić|Marija Radić/);
  assert.doesNotMatch(text,/Ana Kovač|Petra Novak|Tomislav Bognar|Josip Jurić/);
  window.openAttendanceRecord(16);
  assert.equal(document.querySelector('#modal').classList.contains('open'),false);
});

test('korekcija odbija budući datum i evidenciju dulju od 16 sati',()=>{
  const {window,document,state}=boot('worker');
  window.navigate('mytime');
  const before=state().corrections.length;
  document.querySelector('#corrDate').value='2026-07-11';
  document.querySelector('#corrStart').value='07:42';
  document.querySelector('#corrEnd').value='16:00';
  document.querySelector('#corrReason').value='Test budućeg datuma';
  window.submitCorrection();
  assert.equal(state().corrections.length,before);
  assert.match(document.querySelector('#toast').textContent,/budući datum/);

  document.querySelector('#corrDate').value='2026-07-09';
  document.querySelector('#corrStart').value='00:00';
  document.querySelector('#corrEnd').value='23:00';
  document.querySelector('#corrReason').value='Test preduge evidencije';
  window.submitCorrection();
  assert.equal(state().corrections.length,before);
  assert.match(document.querySelector('#toast').textContent,/dulje od 16 sati/);
});

test('administrator ima godišnji pregled, radnik vidi samo sebe',()=>{
  const admin = boot('admin');
  admin.window.navigate('vacations');
  assert.equal(admin.document.querySelectorAll('.year-calendar .month-card').length,12);
  assert.ok(admin.document.querySelectorAll('button.day').length < admin.document.querySelectorAll('.day').length/2);

  const worker = boot('worker');
  worker.window.navigate('vacations');
  worker.window.setCalendarMode('year');
  const text = worker.document.querySelector('#content').textContent;
  assert.match(text,/Ivan Horvat/);
  assert.doesNotMatch(text,/Marko Marić|Petra Novak/);
});

test('Sprint 3 razdvaja statuse zahtjeva i kalendar rezervira samo aktivne odsutnosti',()=>{
  const {window,document,state}=boot('admin');
  window.navigate('requests');
  assert.equal(document.querySelectorAll('.request-tabs button').length,5);
  assert.equal(document.querySelectorAll('.leave-request-card').length,3);
  assert.ok([...document.querySelectorAll('.leave-request-card')].every(card=>card.dataset.status==='Na čekanju'));
  const counts=window.requestStatusCounts(state().requests);
  assert.equal(counts.Svi,11);
  assert.equal(counts['Na čekanju'],3);
  assert.equal(counts.Odobreno,6);
  assert.equal(counts.Odbijeno,1);
  assert.equal(counts.Poništeno,1);

  window.setRequestStatusFilter('Odbijeno');
  assert.equal(document.querySelectorAll('.leave-request-card').length,1);
  assert.match(document.querySelector('#content').textContent,/Predloži drugi termin/);

  window.navigate('vacations');
  assert.equal(document.querySelectorAll('.year-calendar .month-card').length,12);
  assert.equal(window.calendarRequests().length,9);
  assert.ok(window.calendarRequests().every(request=>['Na čekanju','Odobreno'].includes(request.status)));
  assert.equal(document.querySelectorAll('#content .leave-request-card').length,9);
  assert.equal(document.querySelectorAll('#content .leave-request-card[data-status="Odbijeno"],#content .leave-request-card[data-status="Poništeno"]').length,0);
  window.setVacationDepartment('Proizvodnja');
  assert.ok(window.calendarRequests().every(request=>state().workers.find(worker=>worker.id===request.workerId).dept==='Proizvodnja'));
  assert.equal(document.querySelectorAll('.leave-department-grid>div').length,1);
  assert.equal(document.querySelectorAll('.balance-item').length,2);
});

test('knjigovođa u godišnjem kalendaru vidi samo odobrene odsutnosti',()=>{
  const {window,document}=boot('accountant');
  window.navigate('vacations');
  assert.equal(window.calendarRequests().length,6);
  assert.ok(window.calendarRequests().every(request=>request.status==='Odobreno'));
  assert.equal(document.querySelectorAll('.balance-item').length,0);
  assert.equal(document.querySelectorAll('#content .leave-request-card[data-status="Na čekanju"]').length,0);
});

test('voditelj donosi odluku s napomenom samo za radnike svojeg opsega',()=>{
  const {window,document,state}=boot('manager');
  window.navigate('requests');
  assert.equal(document.querySelectorAll('.leave-request-card').length,3);
  const marija=state().requests.find(request=>request.id===3);
  window.openRequestDecision(3);
  assert.ok(document.querySelector('#modal').classList.contains('open'));
  assert.match(document.querySelector('#modal').textContent,/Marija Radić/);
  assert.match(document.querySelector('#modal').textContent,/Preklapanje u odjelu/);
  window.decideRequest(3,'Odbijeno');
  assert.equal(marija.status,'Na čekanju');
  assert.match(document.querySelector('#toast').textContent,/upiši razlog/);
  document.querySelector('#requestDecisionNote').value='Predloži termin nakon 2. listopada.';
  window.decideRequest(3,'Odbijeno');
  assert.equal(marija.status,'Odbijeno');
  assert.equal(marija.decidedBy,'Voditelj');
  assert.match(marija.decisionNote,/nakon 2\. listopada/);
  assert.match(state().audit[0].action,/Odbijen zahtjev/);

  window.openRequestDecision(2);
  assert.equal(document.querySelector('#modal').classList.contains('open'),false);
});

test('radnik vidi vlastiti fond i poništavanjem vraća rezervirane dane',()=>{
  const {window,document,state}=boot('worker');
  window.navigate('requests');
  assert.equal(document.querySelectorAll('.leave-request-card').length,4);
  assert.doesNotMatch(document.querySelector('#content').textContent,/Marko Marić|Marija Radić|Petra Novak/);
  let balance=window.vacationBalanceSummary(1);
  assert.equal(balance.allowance,24);
  assert.equal(balance.used,10);
  assert.equal(balance.reserved,3);
  assert.equal(balance.remaining,14);
  assert.equal(balance.available,11);
  assert.match(document.querySelector('#vacRequestPreview').textContent,/5 radnih dana.*nakon slanja 6/);

  window.openCancelRequest(6);
  assert.ok(document.querySelector('#modal').classList.contains('open'));
  window.cancelVacationRequest(6);
  assert.equal(state().requests.find(request=>request.id===6).status,'Poništeno');
  balance=window.vacationBalanceSummary(1);
  assert.equal(balance.reserved,0);
  assert.equal(balance.available,14);
  assert.match(state().audit[0].action,/Poništen zahtjev/);
});

test('novi godišnji zahtjev provjerava budući datum, preklapanje i raspoloživi fond',()=>{
  const {window,document,state}=boot('worker');
  window.navigate('requests');
  const before=state().requests.length;

  document.querySelector('#vacStart').value='2026-09-30';
  document.querySelector('#vacEnd').value='2026-10-01';
  window.submitVacationRequest();
  assert.equal(state().requests.length,before);
  assert.match(document.querySelector('#toast').textContent,/preklapa/);

  document.querySelector('#vacStart').value='2026-08-10';
  document.querySelector('#vacEnd').value='2026-08-28';
  window.submitVacationRequest();
  assert.equal(state().requests.length,before);
  assert.match(document.querySelector('#toast').textContent,/Nema dovoljno/);

  document.querySelector('#vacType').value='Slobodan dan';
  document.querySelector('#vacStart').value='2026-08-05';
  document.querySelector('#vacEnd').value='2026-08-09';
  document.querySelector('#vacNote').value='Privatne obveze';
  window.submitVacationRequest();
  assert.equal(state().requests.length,before+1);
  assert.equal(state().requests[0].status,'Na čekanju');
  assert.equal(window.businessDays(state().requests[0].start,state().requests[0].end),2);
});

test('voditelj je ograničen na dodijeljene odjele',()=>{
  const {window,document} = boot('manager');
  window.navigate('workers');
  const text = document.querySelector('#content').textContent;
  assert.match(text,/Ivan Horvat/);
  assert.match(text,/Marko Marić/);
  assert.doesNotMatch(text,/Ana Kovač|Petra Novak/);
  window.navigate('reports');
  assert.ok(window.getReportData().rows.every(row=>['Sklapanje','Proizvodnja'].includes(row[1])));
});

test('radni dani izostavljaju vikende i hrvatske blagdane',()=>{
  const {window} = boot('worker');
  assert.equal(window.businessDays('2026-08-05','2026-08-09'),2);
  assert.equal(window.businessDays('2026-04-06','2026-04-10'),4);
});

test('dupla RFID kartica se odbija, a nova se može dodati',()=>{
  const {window,document,state} = boot('admin');
  window.navigate('workers');
  window.openWorkerModal();
  document.querySelector('#workerName').value='Test Radnik';
  document.querySelector('#workerEmail').value='test.radnik@bss.hr';
  document.querySelector('#workerCard').value='04 19 C2 8F';
  const before=state().workers.length;
  window.saveWorker(null);
  assert.equal(state().workers.length,before);
  document.querySelector('#workerCard').value='04 88 21 AB';
  window.saveWorker(null);
  assert.equal(state().workers.length,before+1);
});

test('odobrena korekcija mijenja zapis i stvara audit događaj',()=>{
  const {window,state} = boot('admin');
  window.navigate('corrections');
  window.updateCorrection(1,'Odobreno');
  const record=state().records.find(item=>item.workerId===2&&item.date==='2026-07-08');
  assert.equal(record.end,'16:02');
  assert.equal(record.status,'Ispravljeno');
  assert.match(state().audit[0].action,/Odobrena korekcija/);
});

test('Sprint 5 prikazuje identitet, dijagnostiku i događaje terminala',()=>{
  const {window,document,state}=boot('admin');
  window.navigate('terminal');
  assert.match(document.querySelector('.terminal-hero').textContent,/BSS-T01.*Ulaz proizvodnje/);
  assert.equal(document.querySelectorAll('.terminal-kpis>div').length,4);
  assert.equal(document.querySelectorAll('.terminal-health-grid>div').length,4);
  assert.ok(document.querySelector('[data-terminal-controls]'));
  assert.equal(document.querySelectorAll('.terminal-event-table')[1].querySelectorAll('tbody tr').length,3);
  assert.equal(state().terminal.queue.length,0);
  assert.equal(state().terminal.unsynced,0);
});

test('offline očitanje ulazi u lokalni red i sinkronizira se bez promjene evidencije',()=>{
  const {window,state}=boot('admin');
  const recordsBefore=JSON.stringify(state().records);
  window.navigate('terminal');
  window.simulateTerminalOffline();
  assert.equal(state().terminal.online,false);
  assert.equal(state().terminal.queue.length,0);

  window.navigate('terminalDemo');
  window.demoOfflineScan();
  const queued=state().terminal.queue[0];
  assert.match(queued.eventId,/^T01-20260710-/);
  assert.equal(queued.status,'Čeka sinkronizaciju');
  assert.equal(state().terminal.unsynced,1);
  assert.equal(JSON.stringify(state().records),recordsBefore);

  window.navigate('terminal');
  window.restoreTerminal();
  assert.equal(state().terminal.online,true);
  assert.equal(state().terminal.unsynced,0);
  assert.equal(state().terminal.queue.length,0);
  assert.equal(state().terminal.syncRuns[0].received,1);
  assert.equal(state().terminal.syncRuns[0].accepted,1);
  assert.equal(state().terminal.syncRuns[0].duplicates,0);
  assert.equal(state().terminal.recentEvents.find(event=>event.eventId===queued.eventId).status,'Sinkronizirano');
  assert.equal(JSON.stringify(state().records),recordsBefore);
});

test('nepoznata RFID kartica odbija se lokalno i ne puni offline red',()=>{
  const {window,state}=boot('admin');
  const scansBefore=state().terminal.scans,recordsBefore=JSON.stringify(state().records);
  window.navigate('terminalDemo');
  window.demoUnknownCard();
  assert.equal(state().terminal.scans,scansBefore+1);
  assert.equal(state().terminal.queue.length,0);
  assert.equal(state().terminal.unsynced,0);
  assert.equal(state().terminal.recentEvents[0].status,'Odbijeno');
  assert.equal(state().lastScan.status,'Greška');
  assert.equal(JSON.stringify(state().records),recordsBefore);
});

test('sinkronizacija prepoznaje ponovljeni ID i ne prihvaća ga dvaput',()=>{
  const {window,state}=boot('admin');
  const existingId=state().terminal.syncedEventIds[0],recordsBefore=JSON.stringify(state().records);
  window.navigate('terminal');
  window.simulateTerminalOffline();
  const duplicate=window.queueTerminalEvent(1,'Prijava',existingId);
  assert.equal(state().terminal.unsynced,1);
  window.restoreTerminal();
  assert.equal(state().terminal.syncRuns[0].received,1);
  assert.equal(state().terminal.syncRuns[0].accepted,0);
  assert.equal(state().terminal.syncRuns[0].duplicates,1);
  assert.equal(state().terminal.recentEvents.find(event=>event===duplicate).status,'Duplikat');
  assert.equal(JSON.stringify(state().records),recordsBefore);
});

test('online simulator dodaje jedinstven sinkronizirani događaj, ne službeni zapis',()=>{
  const {window,state}=boot('admin');
  const recordsBefore=JSON.stringify(state().records),eventsBefore=state().terminal.recentEvents.length;
  window.navigate('terminalDemo');
  window.demoScan();
  assert.equal(state().terminal.queue.length,0);
  assert.equal(state().terminal.recentEvents.length,eventsBefore+1);
  assert.equal(state().terminal.recentEvents[0].status,'Sinkronizirano');
  assert.ok(state().terminal.syncedEventIds.includes(state().terminal.recentEvents[0].eventId));
  assert.equal(JSON.stringify(state().records),recordsBefore);
});

test('voditelj ima samo čitanje na operativnom ekranu terminala',()=>{
  const {window,document,state}=boot('manager');
  window.navigate('terminal');
  assert.equal(document.querySelector('[data-terminal-controls]'),null);
  assert.match(document.querySelector('.terminal-readonly').textContent,/bez prava upravljanja/);
  assert.match(document.querySelector('#content').textContent,/Ivan Horvat|Marko Marić/);
  assert.doesNotMatch(document.querySelector('#content').textContent,/Tomislav Bognar/);
  window.simulateTerminalOffline();
  assert.equal(state().terminal.online,true);
  window.restoreTerminal();
  assert.equal(state().terminal.syncRuns.length,1);
});

test('Sprint 4 nudi pet poslovnih izvještaja iz istog skupa podataka',()=>{
  const {window,document}=boot('admin');
  window.navigate('reports');
  assert.equal(document.querySelectorAll('.report-type').length,5);
  assert.equal(document.querySelectorAll('.report-kpi').length,4);
  let data=window.getReportData();
  assert.equal(data.title,'Mjesečni sažetak');
  assert.equal(data.rows.length,7);
  assert.equal(data.rows.reduce((sum,row)=>sum+row[3],0),18);
  assert.equal(data.filenameBase,'BSS_mjesecni_sazetak_07_2026');
  assert.match(document.querySelector('.report-boundary').textContent,/Ne izračunava plaću/);

  window.setReportType('attendance');
  data=window.getReportData();
  assert.equal(data.rows.length,22);
  assert.equal(data.headers.length,12);
  assert.equal(data.filenameBase,'BSS_evidencija_radnog_vremena_07_2026');

  window.setReportType('exceptions');
  assert.equal(window.getReportData().rows.length,4);
  window.setReportType('vacations');
  data=window.getReportData();
  assert.equal(data.rows.length,1);
  assert.equal(data.rows[0][5],1);
  window.setReportType('corrections');
  assert.equal(window.getReportData().rows.length,2);
});

test('filtri odjela i radnika jednako ograničavaju pregled i izvoz',()=>{
  const {window,document,state}=boot('admin');
  window.navigate('reports');
  window.setReportType('attendance');
  window.updateReportDepartment('Proizvodnja');
  let data=window.getReportData();
  assert.equal(data.scope,'Odjel: Proizvodnja');
  assert.equal(data.rows.length,7);
  assert.ok(data.rows.every(row=>row[1]==='Proizvodnja'));
  assert.equal(document.querySelectorAll('#reportWorker option').length,3);

  document.querySelector('#reportWorker').value='7';
  window.applyReportFilters(false);
  data=window.getReportData();
  assert.equal(data.rows.length,2);
  assert.ok(data.rows.every(row=>row[0]==='Marija Radić'));
  assert.equal(window.csvContent(data).split('\r\n').length,3);
  assert.equal(state().reportHistory.length,0);
});

test('izvještaji poštuju prava voditelja, knjigovođe i radnika',()=>{
  const manager=boot('manager');
  manager.window.navigate('reports');
  let data=manager.window.getReportData();
  assert.equal(data.rows.length,3);
  assert.ok(data.rows.every(row=>['Sklapanje','Proizvodnja'].includes(row[1])));
  assert.deepEqual([...manager.document.querySelectorAll('#reportDept option')].map(item=>item.value),['Svi','Proizvodnja','Sklapanje']);
  manager.evaluate("reportFilters={month:'2026-07',department:'Ured',workerId:'3',type:'attendance'}");
  data=manager.window.getReportData();
  assert.ok(data.rows.every(row=>['Sklapanje','Proizvodnja'].includes(row[1])));
  assert.match(data.scope,/Dodijeljeni odjeli/);

  const accountant=boot('accountant');
  accountant.window.navigate('reports');
  assert.equal(accountant.window.getReportData().rows.length,7);
  assert.match(accountant.document.querySelector('#content').textContent,/Samo čitanje/);

  const worker=boot('worker');
  const auditBefore=worker.state().audit.length;
  worker.window.navigate('reports');
  assert.equal(worker.evaluate('screen'),'home');
  assert.equal(worker.document.querySelector('.report-hero'),null);
  worker.window.downloadReport('csv');
  assert.equal(worker.state().audit.length,auditBefore);
});

test('generiranje izvještaja ostavlja status, povijest i audit trag',()=>{
  const {window,state}=boot('admin');
  window.navigate('reports');
  const auditBefore=state().audit.length;
  window.applyReportFilters();
  assert.equal(state().reportHistory.length,1);
  assert.equal(state().reportHistory[0].type,'Mjesečni sažetak');
  assert.equal(state().reportHistory[0].rows,7);
  assert.match(state().lastReport,/Pregled generiran/);
  assert.equal(state().audit.length,auditBefore+1);
  assert.equal(state().audit[0].module,'Izvještaji');
  assert.match(state().audit[0].action,/Cijela tvrtka.*7 redaka/);
});

test('CSV je UTF-8, koristi točku-zarez i ispravno štiti navodnike',()=>{
  const {window}=boot('admin');
  window.setReportType('attendance');
  const data=window.getReportData(),csv=window.csvContent(data);
  assert.ok(csv.startsWith('\ufeff'));
  assert.match(csv,/"Radnik";"Odjel";"Datum"/);
  assert.match(csv,/RFID \/ Terminal 01/);
  assert.equal(csv.split('\r\n').length,23);
  assert.equal(window.csvContent({headers:['Polje'],rows:[['Vrijednost "BSS"']]}),'\ufeff"Polje"\r\n"Vrijednost ""BSS"""');
});

test('XLSX izvještaj ima stilove, zamrznuto zaglavlje i automatski filtar',async()=>{
  const {window}=boot('admin');
  const data=window.getReportData(),blob=window.buildXlsx(data.headers,data.rows,data.title);
  const bytes=new Uint8Array(await blob.arrayBuffer()),text=new TextDecoder().decode(bytes);
  assert.equal(blob.type,'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  assert.deepEqual([...bytes.slice(0,4)],[80,75,3,4]);
  assert.deepEqual([...bytes.slice(-22,-18)],[80,75,5,6]);
  assert.match(text,/xl\/styles\.xml/);
  assert.match(text,/state="frozen"/);
  assert.match(text,/<autoFilter ref="A1:/);
});

test('XLSX generator stvara valjani ZIP okvir',()=>{
  const {window} = boot('admin');
  const bytes=window.zipStore([{name:'test.txt',content:'BSS'}]);
  assert.deepEqual([...bytes.slice(0,4)],[80,75,3,4]);
  assert.deepEqual([...bytes.slice(-22,-18)],[80,75,5,6]);
});
