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
  return {window:dom.window,document:dom.window.document,state:()=>vm.runInContext('state',context)};
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

test('Demo 3.0 dashboard zadržava potpuni operativni pregled u Sprintu 2',()=>{
  const {window,document,state} = boot('admin');
  assert.match(document.querySelector('.version-chip').textContent,/v3\.0/);
  assert.match(document.querySelector('.side-footer').textContent,/Sprint 2/);
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

test('XLSX generator stvara valjani ZIP okvir',()=>{
  const {window} = boot('admin');
  const bytes=window.zipStore([{name:'test.txt',content:'BSS'}]);
  assert.deepEqual([...bytes.slice(0,4)],[80,75,3,4]);
  assert.deepEqual([...bytes.slice(-22,-18)],[80,75,5,6]);
});
