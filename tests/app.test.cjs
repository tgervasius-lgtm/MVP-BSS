const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const test = require('node:test');
const {JSDOM} = require('jsdom');

const html = fs.readFileSync('index.html','utf8');
const source = fs.readFileSync('app.js','utf8');
const coreSources = [
  'src/adapters/runtime.js',
  'src/adapters/theme-bootstrap.js',
  'src/domain/contracts.js',
  'src/domain/time.js',
  'src/policies/access.js',
  'src/use-cases/attendance.js',
  'src/use-cases/leave.js',
  'src/use-cases/corrections.js',
  'src/views/registry.js',
  'src/views/events.js'
].map(path=>fs.readFileSync(path,'utf8'));
const styleEntry = fs.readFileSync('styles.css','utf8');
const styleLayerPaths = [
  'styles/base.css',
  'styles/layouts.css',
  'styles/components.css',
  'styles/screens.css',
  'styles/navigation.css',
  'styles/themes.css',
  'styles/responsive.css'
];
const styleLayers = styleLayerPaths.map(path=>fs.readFileSync(path,'utf8'));
const styles = [styleEntry,...styleLayers].join('\n');
const manifest = JSON.parse(fs.readFileSync('manifest.json','utf8'));
const designTokens = fs.readFileSync('design-system/tokens.css','utf8');
const designGuideHtml = fs.readFileSync('design-system/index.html','utf8');
const designGuideStyles = fs.readFileSync('design-system/guide.css','utf8');
const designGuideScript = fs.readFileSync('design-system/guide.js','utf8');
const designSystemDoc = fs.readFileSync('BSS_DESIGN_SYSTEM_V1.md','utf8');
const brandBookHtml = fs.readFileSync('brand-book/index.html','utf8');
const brandBookStyles = fs.readFileSync('brand-book/brand.css','utf8');
const brandBookScript = fs.readFileSync('brand-book/brand.js','utf8');
const brandBookDoc = fs.readFileSync('BSS_BRAND_BOOK_V1.md','utf8');
const brandBookPdf = fs.readFileSync('output/pdf/BSS_BRAND-BOOK_v1.0_11.07.2026.pdf');
const technicalAudit = fs.readFileSync('BSS_TECHNICAL_AUDIT_V1.md','utf8');
const scopeFreezeDoc = fs.readFileSync('BSS_MVP_SCOPE_FREEZE_V1.md','utf8');
const scopeFreeze = JSON.parse(fs.readFileSync('bss-mvp-scope-v1.json','utf8'));
const demoRoadmap = fs.readFileSync('DEMO_3_ROADMAP.md','utf8');
const serviceWorker = fs.readFileSync('sw.js','utf8');
const themeBootstrap = fs.readFileSync('src/adapters/theme-bootstrap.js','utf8');
const packageConfig = JSON.parse(fs.readFileSync('package.json','utf8'));
const eslintConfig = fs.readFileSync('eslint.config.mjs','utf8');
const playwrightConfig = fs.readFileSync('playwright.config.cjs','utf8');
const e2eSource = fs.readFileSync('tests/e2e/app.spec.cjs','utf8');
const buildScript = fs.readFileSync('scripts/build.mjs','utf8');
const cloudflareConfig = fs.readFileSync('wrangler.toml','utf8');
const cloudflareHeaders = fs.readFileSync('_headers','utf8');
const cloudflareDeployment = fs.readFileSync('CLOUDFLARE_DEPLOYMENT.md','utf8');
const qualityWorkflow = fs.readFileSync('.github/workflows/quality.yml','utf8');

function hexToken(css,name){
  const match=css.match(new RegExp(`${name}:\\s*(#[0-9a-f]{6})`,'i'));
  assert.ok(match,`nedostaje heksadecimalna vrijednost za ${name}`);
  return match[1];
}
function contrastRatio(foreground,background){
  const luminance=hex=>{
    const rgb=hex.match(/[0-9a-f]{2}/gi).map(value=>parseInt(value,16)/255).map(value=>value<=.04045?value/12.92:((value+.055)/1.055)**2.4);
    return .2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2];
  };
  const first=luminance(foreground),second=luminance(background);
  return (Math.max(first,second)+.05)/(Math.min(first,second)+.05);
}

function boot(role='admin',options={}){
  const dom = new JSDOM(html,{url:'https://bss.test/',runScripts:'outside-only'});
  dom.window.TextEncoder = TextEncoder;
  dom.window.Blob = Blob;
  if(options.theme) dom.window.localStorage.setItem('bss-theme-v1',options.theme);
  const context = dom.getInternalVMContext();
  coreSources.forEach(coreSource=>vm.runInContext(coreSource,context));
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
      .map(item=>item.getAttribute('data-bss-action').match(/'([^']+)'/)?.[1]).filter(Boolean))];
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

test('Demo 3.0 dashboard zadržava potpuni operativni pregled u Sprintu 7',()=>{
  const {window,document,state} = boot('admin');
  assert.match(document.querySelector('.version-chip').textContent,/v3\.0/);
  assert.match(document.querySelector('.side-footer').textContent,/Sprint 7/);
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

test('Sprint 6 daje administratoru cjelovit pregled konfiguracije',()=>{
  const {window,document,state}=boot('admin');
  window.navigate('settings');
  assert.equal(document.querySelectorAll('.settings-tabs button').length,4);
  assert.equal(document.querySelectorAll('.admin-kpis>div').length,4);
  assert.equal(state().departments.length,6);
  assert.equal(state().jobPositions.length,7);
  assert.equal(state().holidays.length,14);
  assert.equal(state().accessUsers.length,7);
  assert.equal(window.isValidOib('12345678903'),true);
  assert.equal(window.isValidOib('12345678901'),false);
  assert.match(document.querySelector('#content').textContent,/Demo ne šalje email.*ne sprema lozinku/s);
});

test('odjeli i radna mjesta imaju kontrolirano dodavanje i deaktivaciju',()=>{
  const {window,document,state}=boot('admin');
  window.navigate('settings');
  window.setSettingsTab('organization');

  window.openDepartmentModal();
  document.querySelector('#departmentName').value='Logistika';
  document.querySelector('#departmentCode').value='LOG';
  window.saveDepartment(null);
  const department=state().departments.find(item=>item.name==='Logistika');
  assert.ok(department?.active);

  window.openJobPositionModal();
  document.querySelector('#positionName').value='Koordinator';
  document.querySelector('#positionCode').value='KOORD';
  document.querySelector('#positionDepartment').value='Logistika';
  window.saveJobPosition(null);
  const position=state().jobPositions.find(item=>item.name==='Koordinator');
  assert.ok(position?.active);

  window.toggleDepartment(1);
  assert.equal(state().departments.find(item=>item.id===1).active,true);
  assert.match(document.querySelector('#toast').textContent,/radnika.*radnih mjesta/);
  window.toggleJobPosition(1);
  assert.equal(state().jobPositions.find(item=>item.id===1).active,true);
  assert.match(document.querySelector('#toast').textContent,/aktivnih radnika/);

  window.toggleJobPosition(position.id);
  assert.equal(position.active,false);
  window.toggleDepartment(department.id);
  assert.equal(department.active,false);
});

test('radnik se može dodati bez RFID kartice samo uz konfigurirani odjel i radno mjesto',()=>{
  const {window,document,state}=boot('admin');
  window.navigate('workers');
  window.openWorkerModal();
  document.querySelector('#workerName').value='Luka Testić';
  document.querySelector('#workerEmail').value='luka.testic@bss.hr';
  document.querySelector('#workerCard').value='';
  const before=state().workers.length;
  window.saveWorker(null);
  const worker=state().workers.find(item=>item.email==='luka.testic@bss.hr');
  assert.equal(state().workers.length,before+1);
  assert.equal(worker.card,'');
  assert.equal(worker.cardStatus,'Nije dodijeljena');
  assert.equal(state().accessUsers.some(item=>item.workerId===worker.id),false);
});

test('zadani fond tvrtke može biti nula i prenosi se na novog radnika',()=>{
  const {window,document,state}=boot('admin');
  state().company.defaultVacationAllowance=0;
  window.navigate('workers');
  window.openWorkerModal();
  assert.equal(document.querySelector('#workerAllowance').value,'0');
});

test('interni neradni dan mijenja obračun, a zakonski blagdan ostaje zaključan',()=>{
  const {window,document,state}=boot('admin');
  window.navigate('settings');
  window.setSettingsTab('holidays');
  assert.equal(window.businessDays('2026-12-24','2026-12-28'),2);

  window.openHolidayModal();
  document.querySelector('#holidayDate').value='2026-12-24';
  document.querySelector('#holidayName').value='Dan tvrtke';
  window.saveHoliday(null);
  const holiday=state().holidays.find(item=>item.date==='2026-12-24');
  assert.ok(holiday?.active);
  assert.equal(window.businessDays('2026-12-24','2026-12-28'),1);

  window.toggleHoliday(holiday.id);
  assert.equal(holiday.active,false);
  assert.equal(window.businessDays('2026-12-24','2026-12-28'),2);
  window.toggleHoliday(13);
  assert.equal(state().holidays.find(item=>item.id===13).active,true);

  const before=state().holidays.length;
  window.openHolidayModal();
  document.querySelector('#holidayDate').value='2026-12-25';
  document.querySelector('#holidayName').value='Duplikat';
  window.saveHoliday(null);
  assert.equal(state().holidays.length,before);
  assert.match(document.querySelector('#toast').textContent,/već postoji/);
});

test('korisničke uloge, reset i blokiranje imaju zaštitne granice i audit trag',()=>{
  const {window,document,state,evaluate}=boot('admin');
  window.navigate('roles');
  assert.equal(document.querySelectorAll('.access-table tbody tr').length,7);
  assert.equal(document.querySelectorAll('.invitation-item').length,1);
  assert.equal(document.querySelectorAll('.permission-table tbody tr').length,4);

  window.sendPasswordReset(1);
  const workerAccess=state().accessUsers.find(item=>item.id===1);
  assert.ok(workerAccess.passwordResetAt);
  assert.equal(Object.hasOwn(workerAccess,'password'),false);
  assert.equal(Object.hasOwn(workerAccess,'token'),false);
  assert.equal(state().audit[0].module,'Prava pristupa');

  window.toggleAccessUser(5);
  assert.equal(state().accessUsers.find(item=>item.id===5).status,'Aktivan');
  assert.match(document.querySelector('#toast').textContent,/ne može biti blokiran/);
  window.toggleAccessUser(1);
  assert.equal(workerAccess.status,'Blokiran');

  window.openAccessModal(2);
  for(const checkbox of document.querySelectorAll('.accessDept')) checkbox.checked=checkbox.value==='Proizvodnja';
  window.saveAccessUser(2);
  assert.equal(evaluate('JSON.stringify(ROLE_CONFIG.manager.departments)'),'["Proizvodnja"]');
});

test('pozivnica provjerava email i odjel te se može poništiti bez slanja emaila',()=>{
  const {window,document,state}=boot('admin');
  window.navigate('roles');
  const before=state().invitations.length;

  window.openInviteModal();
  document.querySelector('#inviteName').value='Dupli Korisnik';
  document.querySelector('#inviteEmail').value='ivan.horvat@bss.hr';
  document.querySelector('.accessDept[value="Proizvodnja"]').checked=true;
  window.sendInvitation();
  assert.equal(state().invitations.length,before);
  assert.match(document.querySelector('#toast').textContent,/račun.*već postoji/);

  document.querySelector('#inviteEmail').value='nova.radnica@bss.hr';
  for(const checkbox of document.querySelectorAll('.accessDept')) checkbox.checked=false;
  window.sendInvitation();
  assert.equal(state().invitations.length,before);
  assert.match(document.querySelector('#toast').textContent,/dodijeli barem jedan odjel/);

  document.querySelector('.accessDept[value="Prodaja"]').checked=true;
  window.sendInvitation();
  const invitation=state().invitations.find(item=>item.email==='nova.radnica@bss.hr');
  assert.equal(state().invitations.length,before+1);
  assert.equal(invitation.status,'Poslana');
  assert.deepEqual([...invitation.departments],['Prodaja']);
  window.cancelInvitation(invitation.id);
  assert.equal(invitation.status,'Poništena');

  window.openInviteModal();
  document.querySelector('#inviteName').value='Nova Knjigovotkinja';
  document.querySelector('#inviteEmail').value='nova.knjigovotkinja@bss.hr';
  document.querySelector('#inviteRole').value='Knjigovođa';
  document.querySelector('.accessDept[value="Prodaja"]').checked=true;
  window.sendInvitation();
  const accountantInvitation=state().invitations.find(item=>item.email==='nova.knjigovotkinja@bss.hr');
  assert.deepEqual([...accountantInvitation.departments],[]);
});

test('postavke tvrtke provjeravaju OIB i sigurnosne rokove prije spremanja',()=>{
  const {window,document,state}=boot('admin');
  window.navigate('settings');
  window.setSettingsTab('company');
  document.querySelector('#setName').value='BSS Nova d.o.o.';
  document.querySelector('#setOib').value='12345678901';
  window.saveSettings();
  assert.equal(state().company.name,'BSS Demo d.o.o.');
  assert.match(document.querySelector('#toast').textContent,/valjan OIB/);

  document.querySelector('#setOib').value='12345678903';
  document.querySelector('#setInviteHours').value='48';
  document.querySelector('#setResetMinutes').value='45';
  document.querySelector('#setSessionMinutes').value='600';
  window.saveSettings();
  assert.equal(state().company.name,'BSS Nova d.o.o.');
  assert.equal(state().security.inviteValidityHours,48);
  assert.equal(state().security.passwordResetValidityMinutes,45);
  assert.equal(state().security.sessionMinutes,600);
  assert.equal(state().audit[0].module,'Postavke');
});

test('audit trag filtrira administrativne radnje po modulu i tekstu',()=>{
  const {window,document}=boot('admin');
  window.navigate('roles');
  window.sendPasswordReset(1);
  window.navigate('audit');
  document.querySelector('#auditModule').value='Prava pristupa';
  document.querySelector('#auditSearch').value='reset lozinke';
  window.applyAuditFilters();
  const entries=[...document.querySelectorAll('.audit-item')];
  assert.equal(entries.length,1);
  assert.match(entries[0].textContent,/reset lozinke.*Prava pristupa/s);
  window.clearAuditFilters();
  assert.ok(document.querySelectorAll('.audit-item').length>entries.length);
});

test('aktivna smjena se ne gasi dok ima radnike, a nova smjena mora imati valjano trajanje',()=>{
  const {window,document,state}=boot('admin');
  window.navigate('shifts');
  window.toggleShift(1);
  assert.equal(state().shifts.find(item=>item.id===1).active,true);
  assert.match(document.querySelector('#toast').textContent,/aktivnih radnika/);

  const before=state().shifts.length;
  window.openShiftModal();
  document.querySelector('#shiftName').value='Test smjena';
  document.querySelector('#shiftStart').value='08:00';
  document.querySelector('#shiftEnd').value='08:00';
  window.saveShift(null);
  assert.equal(state().shifts.length,before);
  assert.match(document.querySelector('#toast').textContent,/više od 0/);

  document.querySelector('#shiftEnd').value='12:00';
  window.saveShift(null);
  const shift=state().shifts.find(item=>item.name==='Test smjena');
  assert.ok(shift?.active);
  window.toggleShift(shift.id);
  assert.equal(shift.active,false);
});

test('administracijski ekrani ostaju nedostupni radniku i voditelju',()=>{
  for(const selectedRole of ['worker','manager']){
    const {window,document,evaluate}=boot(selectedRole);
    window.navigate('settings');
    assert.equal(evaluate('screen'),'home');
    assert.equal(document.querySelector('.settings-tabs'),null);
    window.navigate('roles');
    assert.equal(evaluate('screen'),'home');
    assert.equal(document.querySelector('.access-table'),null);
  }
});

test('Sprint 7 povezuje prodajnu priču od RFID kartice do izvoza',()=>{
  const {window,document}=boot('admin');
  window.navigate('flow');
  assert.equal(document.querySelectorAll('.process-step').length,5);
  assert.equal(document.querySelectorAll('.demo-proof-grid .card').length,3);
  assert.equal(document.querySelectorAll('.demo-story-hero .btn').length,2);
  const text=document.querySelector('#content').textContent;
  assert.match(text,/RFID karticu.*sinkronizira.*Voditelj.*CSV i XLSX/s);
  assert.match(text,/RFID\/NFC, radnici, smjene, odsutnosti, korekcije, izvještaji, administracija i audit/);
  assert.doesNotMatch(text,/skladište|ERP|GPS|AI analitika|payroll|CRM/i);
});

test('aktivna navigacija ima semantiku i detalj radnika zadržava Radnike',()=>{
  const {window,document}=boot('admin');
  let active=document.querySelectorAll('.bottom-nav [aria-current="page"]');
  assert.equal(active.length,1);
  assert.match(active[0].textContent,/Početna/);
  window.navigate('workers');
  active=document.querySelectorAll('.bottom-nav [aria-current="page"]');
  assert.equal(active.length,1);
  assert.match(active[0].textContent,/Radnici/);
  window.openWorker(1);
  active=document.querySelectorAll('.bottom-nav [aria-current="page"]');
  assert.equal(active.length,1);
  assert.match(active[0].textContent,/Radnici/);
});

test('glavni sadržaj, tablice i naslov stranice imaju završnu pristupačnu semantiku',()=>{
  const {window,document}=boot('admin');
  assert.equal(document.querySelector('.skip-link').getAttribute('href'),'#content');
  assert.equal(document.title,'Početna | BSS Demo 3.0');
  window.navigate('attendance');
  assert.equal(document.title,'Evidencija dolazaka | BSS Demo 3.0');
  const regions=[...document.querySelectorAll('.table-wrap')];
  assert.ok(regions.length>=1);
  assert.ok(regions.every(region=>region.getAttribute('role')==='region'&&region.tabIndex===0));
  assert.ok(regions.every(region=>/pomakni vodoravno/.test(region.getAttribute('aria-label'))));
  assert.equal(document.querySelectorAll('.table-scroll-hint').length,regions.length);
});

test('izbornik i modal podržavaju Escape, aria stanje i imenovani dijalog',()=>{
  const {window,document}=boot('admin');
  window.openDrawer();
  const drawer=document.querySelector('#drawer');
  assert.ok(drawer.classList.contains('open'));
  assert.equal(drawer.getAttribute('aria-hidden'),'false');
  assert.ok([...document.querySelectorAll('[aria-controls="drawer"]')].every(button=>button.getAttribute('aria-expanded')==='true'));
  document.dispatchEvent(new window.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
  assert.equal(drawer.classList.contains('open'),false);
  assert.equal(drawer.getAttribute('aria-hidden'),'true');

  window.openWorkerModal();
  const modal=document.querySelector('#modal');
  assert.ok(modal.classList.contains('open'));
  assert.equal(modal.getAttribute('aria-hidden'),'false');
  assert.equal(modal.getAttribute('aria-labelledby'),'activeModalTitle');
  assert.equal(document.querySelector('#activeModalTitle').textContent,'Dodaj radnika');
  document.dispatchEvent(new window.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
  assert.equal(modal.classList.contains('open'),false);
  assert.equal(modal.getAttribute('aria-hidden'),'true');
});

test('vraćanje demo podataka prvo prikazuje jasnu potvrdu',()=>{
  const {window,document,state}=boot('admin');
  state().company.name='Privremena promjena';
  window.openDrawer();
  window.openResetDemoDialog();
  assert.equal(state().company.name,'Privremena promjena');
  assert.ok(document.querySelector('#modal').classList.contains('open'));
  assert.match(document.querySelector('#modal').textContent,/Vratiti početne demo-podatke.*lokalne izmjene/s);
  window.resetDemo();
  assert.equal(state().company.name,'BSS Demo d.o.o.');
  assert.equal(document.querySelector('#modal').classList.contains('open'),false);
});

test('mobilni, desktop, animacijski i PWA završni sloj imaju zaštitna pravila',()=>{
  assert.match(styles,/@media\(max-width:520px\)/);
  assert.match(styles,/@media\(min-width:960px\)/);
  assert.match(styles,/@media\(prefers-reduced-motion:reduce\)/);
  assert.match(styles,/@keyframes rfidPulse/);
  assert.match(styles,/\.skip-link/);
  assert.equal(manifest.display,'standalone');
  assert.equal(manifest.lang,'hr');
  assert.ok(manifest.categories.includes('business'));
  assert.ok(manifest.categories.includes('productivity'));
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

test('Design System v1.0 ima jedinstvene primitive i semantičke tokene za obje teme',()=>{
  assert.ok(styleEntry.trimStart().startsWith('@import url("./design-system/tokens.css")'));
  for(const token of [
    '--bss-color-brand-600','--bss-color-bg-surface','--bss-color-text-muted',
    '--bss-color-accent-soft','--bss-color-action-primary','--bss-font-sans','--bss-space-4',
    '--bss-radius-lg','--bss-shadow-md','--bss-duration-normal','--bss-control-min-height',
    '--bss-safe-area-top','--bss-safe-area-bottom'
  ]) assert.match(designTokens,new RegExp(`${token}:`));
  assert.match(designTokens,/:root\[data-theme="dark"\]/);
  assert.match(designTokens,/--bss-color-bg-canvas: var\(--bss-color-neutral-950\)/);
  assert.doesNotMatch([designTokens,...styleLayers,designGuideStyles,brandBookStyles].join('\n'),/--(?:bg|surface(?:-2)?|line(?:-subtle)?|text|muted|teal(?:-dark|-soft)?|green(?:-soft)?|amber(?:-soft)?|red(?:-soft)?|blue(?:-soft)?|shadow(?:-hover)?|radius|safe(?:-top)?)(?=\s*[:)])/);
  assert.match(designSystemDoc,/Quality gate za novu komponentu/);
  assert.match(designSystemDoc,/Refactor v1 R5 dovršio je prijelaz na semantičke/);
});

test('R5 učitava CSS slojeve istim redoslijedom i sprema ih za offline rad',()=>{
  const imports=['./design-system/tokens.css',...styleLayerPaths.map(path=>`./${path}`)];
  const positions=imports.map(path=>styleEntry.indexOf(`@import url("${path}")`));
  assert.ok(positions.every(position=>position>=0));
  assert.deepEqual(positions,[...positions].sort((a,b)=>a-b));
  assert.doesNotMatch(styleEntry,/[{}]/);
  assert.equal(styleLayers.reduce((sum,css)=>sum+(css.match(/{/g)||[]).length,0),804);
  assert.equal(styleLayers.reduce((sum,css)=>sum+(css.match(/}/g)||[]).length,0),804);
  for(const path of styleLayerPaths) assert.match(serviceWorker,new RegExp(path.replaceAll('.','\\.')));
});

test('ključni tekst i statusi Design Systema zadovoljavaju WCAG AA kontrast',()=>{
  const pairs=[
    ['--bss-color-neutral-500','--bss-color-neutral-50'],
    ['--bss-color-success-600','--bss-color-success-100'],
    ['--bss-color-warning-700','--bss-color-warning-100'],
    ['--bss-color-danger-700','--bss-color-danger-100'],
    ['--bss-color-info-700','--bss-color-info-100'],
    ['--bss-color-neutral-0','--bss-color-brand-600']
  ];
  for(const [foreground,background] of pairs){
    assert.ok(contrastRatio(hexToken(designTokens,foreground),hexToken(designTokens,background))>=4.5,`${foreground} nema AA kontrast na ${background}`);
  }
  const dark=designTokens.slice(designTokens.indexOf(':root[data-theme="dark"]'));
  for(const [foreground,background] of [
    ['--bss-color-text-muted','--bss-color-bg-surface'],
    ['--bss-color-success','--bss-color-success-soft'],
    ['--bss-color-warning','--bss-color-warning-soft'],
    ['--bss-color-danger','--bss-color-danger-soft'],
    ['--bss-color-info','--bss-color-info-soft']
  ]){
    const bg=background==='--bss-color-bg-surface'?hexToken(designTokens,'--bss-color-neutral-900'):hexToken(dark,background);
    assert.ok(contrastRatio(hexToken(dark,foreground),bg)>=4.5,`${foreground} nema AA kontrast na ${background} u tamnoj temi`);
  }
});

test('tema aplikacije je pristupačna, spremljena i preživljava ponovno iscrtavanje',()=>{
  assert.match(styles,/\.switch\{[^}]*width:44px;[^}]*height:44px/);
  const {window,document}=boot('admin');
  assert.equal(document.documentElement.dataset.theme,'light');
  window.openDrawer();
  let control=document.querySelector('[data-theme-switch]');
  assert.equal(control.getAttribute('role'),'switch');
  assert.equal(control.getAttribute('aria-checked'),'false');
  window.toggleTheme();
  assert.equal(document.documentElement.dataset.theme,'dark');
  assert.equal(window.localStorage.getItem('bss-theme-v1'),'dark');
  assert.equal(document.querySelector('meta[name="theme-color"]').content,'#071b17');
  assert.equal(control.getAttribute('aria-checked'),'true');
  assert.match(document.querySelector('[data-theme-copy]').textContent,/tamna tema/);
  window.render();
  control=document.querySelector('[data-theme-switch]');
  assert.equal(control.getAttribute('aria-checked'),'true');
  assert.ok(control.classList.contains('on'));

  const restored=boot('worker',{theme:'dark'});
  assert.equal(restored.document.documentElement.dataset.theme,'dark');
  assert.equal(restored.document.querySelector('[data-theme-switch]').getAttribute('aria-checked'),'true');
});

test('živi Design System vodič dokumentira komponente, responsive i pristupačnost',()=>{
  const guide = new JSDOM(designGuideHtml).window.document;
  for(const id of ['principles','colors','type','spacing','components','states','responsive','accessibility','icons']){
    assert.ok(guide.querySelector(`#${id}`),`nedostaje sekcija ${id}`);
  }
  assert.ok(guide.querySelector('[data-theme-switch][role="switch"]'));
  assert.equal(guide.documentElement.lang,'hr');
  assert.match(guide.querySelector('title').textContent,/Design System v1\.0/);
  assert.match(designGuideStyles,/@media\(max-width:760px\)/);
  assert.match(designGuideStyles,/@media\(prefers-reduced-motion:reduce\)/);
  assert.match(designGuideStyles,/@media\(prefers-contrast:more\)/);
  assert.match(designGuideScript,/bss-theme-v1/);
  assert.match(designGuideScript,/IntersectionObserver/);
});

test('aplikacija povezuje vodič i offline predmemorira cijeli Design System',()=>{
  const {document}=boot('admin');
  document.querySelector('.role-badge').click();
  const link=document.querySelector('.design-system-link');
  assert.equal(link.getAttribute('href'),'./design-system/');
  assert.match(link.textContent,/Design System v1\.0/);
  for(const asset of ['design-system/index.html','design-system/tokens.css','design-system/guide.css','design-system/guide.js']){
    assert.match(serviceWorker,new RegExp(asset.replaceAll('.','\\.')));
  }
  assert.match(serviceWorker,/bss-refactor-v1-r6/);
});

test('Brand Book v1.0 pokriva svih devet dogovorenih područja',()=>{
  const guide = new JSDOM(brandBookHtml).window.document;
  for(const id of ['brand','logo','colors','type','voice','imagery','device','applications','governance']){
    assert.ok(guide.querySelector(`#${id}`),`nedostaje Brand Book sekcija ${id}`);
  }
  assert.equal(guide.documentElement.lang,'hr');
  assert.match(guide.querySelector('title').textContent,/BSS Brand Book v1\.0/);
  assert.match(guide.querySelector('.bb-hero').textContent,/Od podatka na terenu do jasne odluke/);
  assert.match(guide.querySelector('#governance').textContent,/Product Ownera/);
  assert.equal(guide.querySelectorAll('.application-grid > a').length,4);
  assert.match(brandBookDoc,/Bognar Smart Systems \(BSS\)/);
  assert.match(brandBookDoc,/tehnički audit i zamrzavanje funkcionalnog opsega/);
});

test('Brand Book ima ručno izrađene, pristupačne SVG assete',()=>{
  const assets=[
    'bss-symbol.svg','bss-logo-primary.svg','bss-logo-reversed.svg',
    'bss-logo-monochrome.svg','bss-business-card.svg',
    'bss-presentation-cover.svg','bss-terminal-label.svg'
  ];
  for(const asset of assets){
    const svg=fs.readFileSync(`brand-book/assets/${asset}`,'utf8');
    assert.match(svg,/^<svg[^>]+viewBox=/);
    assert.match(svg,/<title(?:\s|>)/);
    assert.match(svg,/<desc(?:\s|>)/);
    assert.doesNotMatch(svg,/<image\b|href=["'](?:data:image|https?:)/);
  }
});

test('tema Brand Booka je pristupačna i spremljena',()=>{
  const dom=new JSDOM(brandBookHtml,{url:'https://bss.test/brand-book/',runScripts:'outside-only'});
  dom.window.document.documentElement.dataset.theme='light';
  vm.runInContext(brandBookScript,dom.getInternalVMContext());
  const control=dom.window.document.querySelector('[data-theme-switch]');
  assert.equal(control.getAttribute('role'),'switch');
  assert.equal(control.getAttribute('aria-checked'),'false');
  control.click();
  assert.equal(dom.window.document.documentElement.dataset.theme,'dark');
  assert.equal(dom.window.localStorage.getItem('bss-theme-v1'),'dark');
  assert.equal(control.getAttribute('aria-checked'),'true');
  assert.match(brandBookStyles,/@media\(max-width:680px\)/);
  assert.match(brandBookStyles,/@media\(prefers-reduced-motion:reduce\)/);
  assert.match(brandBookStyles,/@media\(prefers-contrast:more\)/);
});

test('aplikacija povezuje Brand Book i cijeli paket radi offline',()=>{
  const {window,document}=boot('admin');
  window.openDrawer();
  const link=document.querySelector('.brand-book-link');
  assert.equal(link.getAttribute('href'),'./brand-book/');
  assert.match(link.textContent,/Brand Book v1\.0/);
  for(const asset of [
    'brand-book/index.html','brand-book/brand.css','brand-book/brand.js',
    'bss-symbol.svg','bss-logo-primary.svg','bss-business-card.svg',
    'bss-presentation-cover.svg','bss-terminal-label.svg',
    'BSS_BRAND-BOOK_v1.0_11.07.2026.pdf'
  ]) assert.match(serviceWorker,new RegExp(asset.replaceAll('.','\\.')));
  assert.match(serviceWorker,/bss-refactor-v1-r6/);
  assert.match(serviceWorker,/path\.includes\('\/brand-book'\)/);
});

test('službeni Brand Book PDF nosi PDF/A-2u oznaku i ugrađene metapodatke',()=>{
  assert.ok(brandBookPdf.length>70000);
  const raw=brandBookPdf.toString('latin1');
  assert.ok(raw.startsWith('%PDF-1.7'));
  assert.match(raw,/pdfaid:part="2"/);
  assert.match(raw,/pdfaid:conformance="U"/);
  assert.match(raw,/Bognar Smart Systems/);
});

test('MVP scope v1.0 je zaključan na odobrenoj produkcijskoj osnovi',()=>{
  assert.equal(scopeFreeze.version,'1.0');
  assert.equal(scopeFreeze.status,'FROZEN');
  assert.equal(scopeFreeze.frozenAt,'2026-07-12');
  assert.equal(scopeFreeze.owner,'Tomislav Bognar');
  assert.equal(scopeFreeze.baseline.branch,'main');
  assert.equal(scopeFreeze.baseline.commit,'29353f893b16d7dbd48902320ae1c6837b572815');
  assert.equal(scopeFreeze.baseline.productionUrl,'https://mvp-bss.pages.dev/');
  assert.deepEqual(Object.keys(scopeFreeze.roles).sort(),['accountant','admin','manager','worker']);
});

test('scope manifest ima jedinstvene MVP module bez presjeka s isključenim funkcijama',()=>{
  assert.equal(new Set(scopeFreeze.includedModules).size,scopeFreeze.includedModules.length);
  assert.equal(new Set(scopeFreeze.excludedCapabilities).size,scopeFreeze.excludedCapabilities.length);
  for(const module of [
    'attendance','leave_requests','correction_requests','reports_csv_xlsx',
    'terminal_offline_sync','rbac_tenant_isolation','append_only_audit'
  ]) assert.ok(scopeFreeze.includedModules.includes(module),`nedostaje MVP modul ${module}`);
  assert.deepEqual(
    scopeFreeze.includedModules.filter(item=>scopeFreeze.excludedCapabilities.includes(item)),
    []
  );
});

test('scope manifest izričito sprječava dogovoreno širenje MVP-a',()=>{
  for(const capability of [
    'warehouse','inventory','erp','gps_tracking','geofencing','ai_analytics',
    'biometrics','payroll_calculation','door_access_control','crm','native_mobile_apps'
  ]) assert.ok(scopeFreeze.excludedCapabilities.includes(capability),`nedostaje isključenje ${capability}`);
  assert.ok(scopeFreeze.invariants.includes('no_payroll_calculation'));
  assert.ok(scopeFreeze.invariants.includes('private_api_responses_never_cached_by_service_worker'));
});

test('statusni kodovi scope manifesta su stabilni i bez duplikata',()=>{
  for(const values of Object.values(scopeFreeze.statuses)){
    assert.equal(new Set(values).size,values.length);
    assert.ok(values.every(value=>/^[a-z][a-z_]*$/.test(value)));
  }
  assert.deepEqual(scopeFreeze.statuses.leaveRequest,['pending','approved','rejected','cancelled']);
  assert.deepEqual(scopeFreeze.statuses.correctionRequest,scopeFreeze.statuses.leaveRequest);
  assert.deepEqual(scopeFreeze.statuses.terminalEvent,['queued','synced','duplicate','rejected']);
});

test('tehnički audit bilježi izmjerenu osnovu, prioritete i izlaz iz Refactora v1',()=>{
  for(const evidence of ['2.025 redaka','255','146','15','60/60']) assert.match(technicalAudit,new RegExp(evidence.replace('.','\\.')));
  assert.match(technicalAudit,/P0 – blokira stvarne podatke i pilot/);
  assert.match(technicalAudit,/P1 – mora biti riješeno prije pilota/);
  assert.match(technicalAudit,/Cloudflare i konfiguracija repozitorija nisu usklađeni/);
  assert.match(technicalAudit,/Kriteriji završetka Refactora v1/);
  assert.match(technicalAudit,/ne smiju unositi stvarni podaci radnika/);
});

test('scope dokument i roadmap zaključavaju promjene i vode u Refactor v1',()=>{
  assert.match(scopeFreezeDoc,/Status \| \*\*FROZEN\*\*/);
  assert.match(scopeFreezeDoc,/Kontrola promjene opsega/);
  assert.match(scopeFreezeDoc,/Tomislava Bognara/);
  assert.match(scopeFreezeDoc,/Refactor v1 ne smije promijeniti zaključani opseg/);
  assert.match(demoRoadmap,/Demo faza završena je odobrenim spajanjem/);
  assert.match(demoRoadmap,/Refactor v1 bez promjene funkcija i dizajna/);
  assert.deepEqual(scopeFreeze.nextPhases.slice(0,2),['refactor_v1','backend_contract']);
});

test('Refactor v1 učitava jezgru prije aplikacije i sprema je za offline rad',()=>{
  const order=[
    html.indexOf('src/adapters/runtime.js'),
    html.indexOf('src/adapters/theme-bootstrap.js'),
    html.indexOf('src/domain/contracts.js'),
    html.indexOf('src/domain/time.js'),
    html.indexOf('src/policies/access.js'),
    html.indexOf('src/use-cases/attendance.js'),
    html.indexOf('src/use-cases/leave.js'),
    html.indexOf('src/use-cases/corrections.js'),
    html.indexOf('src/views/registry.js'),
    html.indexOf('src/views/events.js'),
    html.indexOf('app.js')
  ];
  assert.ok(order.every(index=>index>=0));
  assert.deepEqual(order,[...order].sort((a,b)=>a-b));
  for(const asset of [
    'src/adapters/runtime.js','src/adapters/theme-bootstrap.js','src/domain/contracts.js','src/domain/time.js','src/policies/access.js',
    'src/use-cases/attendance.js','src/use-cases/leave.js','src/use-cases/corrections.js',
    'src/views/registry.js','src/views/events.js'
  ]){
    assert.match(serviceWorker,new RegExp(asset.replaceAll('.','\\.')));
  }
  assert.match(serviceWorker,/bss-refactor-v1-r6/);
});

test('R6 uklanja inline skripte i zaključava temu prije prikaza stranice',()=>{
  for(const documentSource of [html,designGuideHtml,brandBookHtml]){
    assert.doesNotMatch(documentSource,/<script(?![^>]*\bsrc=)[^>]*>/i);
    assert.match(documentSource,/theme-bootstrap\.js/);
  }
  assert.match(themeBootstrap,/bss-theme-v1/);
  assert.match(themeBootstrap,/prefers-color-scheme: dark/);
  assert.doesNotMatch(themeBootstrap,/innerHTML|document\.write|eval\s*\(/);
});

test('R6 quality gate pokriva lint, deterministički build, Chromium E2E i axe',()=>{
  for(const script of ['build','lint','test:e2e','ci'])assert.equal(typeof packageConfig.scripts[script],'string');
  assert.match(eslintConfig,/no-eval/);
  assert.match(eslintConfig,/no-new-func/);
  assert.match(buildScript,/build-manifest\.json/);
  assert.match(buildScript,/createHash\('sha256'\)/);
  assert.match(playwrightConfig,/desktop-chromium/);
  assert.match(playwrightConfig,/mobile-chromium/);
  assert.match(e2eSource,/AxeBuilder/);
  assert.match(e2eSource,/Godišnji kalendar cijele firme/);
  assert.match(e2eSource,/Moj godišnji kalendar/);
  for(const command of ['npm run lint','npm test','npm run build','playwright install --with-deps chromium','npm run test:e2e']){
    assert.match(qualityWorkflow,new RegExp(command.replace(/[.*+?^$()|[\]\\]/g,'\\$&')));
  }
});

test('R6 zaključava Cloudflare Pages izlaz bez automatske produkcijske objave',()=>{
  assert.equal(fs.existsSync('netlify.toml'),false);
  assert.match(cloudflareConfig,/name = "mvp-bss"/);
  assert.match(cloudflareConfig,/pages_build_output_dir = "\.\/dist"/);
  assert.match(cloudflareHeaders,/Content-Security-Policy:/);
  assert.match(cloudflareHeaders,/script-src 'self'/);
  assert.match(cloudflareHeaders,/X-Content-Type-Options: nosniff/);
  assert.match(cloudflareDeployment,/Produkcijska grana \| `main`/);
  assert.match(cloudflareDeployment,/ne mijenja bez odobrenja Product Ownera/);
  assert.doesNotMatch(qualityWorkflow,/wrangler\s+(?:pages\s+)?deploy|cloudflare\/pages-action/i);
});

test('domenski ugovor zaključava četiri uloge i hrvatske oznake statusa',()=>{
  const {evaluate}=boot('admin');
  const roles=evaluate('BSS_CORE.contracts.roles');
  assert.deepEqual({...roles},{ADMIN:'admin',MANAGER:'manager',WORKER:'worker',ACCOUNTANT:'accountant'});
  assert.deepEqual([...evaluate('BSS_CORE.contracts.requestStatus.labels')],['Na čekanju','Odobreno','Odbijeno','Poništeno']);
  assert.deepEqual([...evaluate('REQUEST_STATUSES')],[...evaluate('BSS_CORE.contracts.requestStatus.labels')]);
});

test('izdvojena vremenska domena čuva noćne smjene, pauzu i aktivni demo zapis',()=>{
  const {evaluate}=boot('admin');
  assert.equal(evaluate("BSS_CORE.time.plannedShiftMinutes({start:'22:00',end:'06:00',breakMinutes:30})"),450);
  assert.equal(evaluate("BSS_CORE.time.recordMinutes({date:'2026-07-09',start:'22:00',end:'06:00',breakMinutes:30})"),450);
  assert.equal(evaluate("BSS_CORE.time.recordMinutes({date:'2026-07-10',start:'08:00',end:'',breakMinutes:0},{includeActive:true,today:'2026-07-10',now:'10:00'})"),120);
  assert.equal(evaluate("BSS_CORE.time.formatMinutes(450)"),'7:30 h');
});

test('izdvojena vremenska domena računa radne dane i preklapanja bez stanja UI-ja',()=>{
  const {evaluate}=boot('admin');
  assert.equal(evaluate("BSS_CORE.time.businessDays('2026-04-03','2026-04-07',new Set(['2026-04-06']))"),2);
  assert.equal(evaluate("BSS_CORE.time.intervalsOverlap('2026-08-17','2026-08-21','2026-08-21','2026-08-25')"),true);
  assert.equal(evaluate("BSS_CORE.time.intervalsOverlap('2026-08-17','2026-08-20','2026-08-21','2026-08-25')"),false);
});

test('izdvojene access politike provode admin, voditelj, radnik i knjigovođa granice',()=>{
  const {evaluate}=boot('admin');
  const expression=role=>`BSS_CORE.access.visibleWorkers('${role}',state.workers,ROLE_CONFIG['${role}']).map(worker=>worker.id)`;
  assert.deepEqual([...evaluate(expression('admin'))],[1,2,3,4,5,6,7]);
  assert.deepEqual([...evaluate(expression('manager'))],[1,2,7]);
  assert.deepEqual([...evaluate(expression('worker'))],[1]);
  assert.deepEqual([...evaluate(expression('accountant'))],[]);
  assert.equal(evaluate("BSS_CORE.access.canViewScopedEntity('accountant',7,state.workers,ROLE_CONFIG.accountant)"),true);
  assert.equal(evaluate("BSS_CORE.access.canViewScopedEntity('manager',3,state.workers,ROLE_CONFIG.manager)"),false);
  assert.equal(evaluate("BSS_CORE.access.canApprove('worker')"),false);
  assert.equal(evaluate("BSS_CORE.access.canApprove('manager')"),true);
});

test('runtime adapter sprema tekst i JSON bez izravne ovisnosti o localStorageu',()=>{
  const {evaluate}=boot('admin');
  const result=evaluate(`(()=>{
    const memory=BSS_CORE.runtime.createMemoryStorage();
    const runtime=BSS_CORE.runtime.create({storage:memory,now:()=>new Date('2026-07-12T08:00:00Z')});
    runtime.storage.set('tekst','BSS');
    runtime.storage.setJson('json',{version:1,value:7});
    return [runtime.storage.get('tekst'),runtime.storage.getJson('json').value];
  })()`);
  assert.deepEqual([...result],['BSS',7]);
});

test('runtime adapter prelazi na memoriju kada preglednik odbije pohranu',()=>{
  const {evaluate}=boot('admin');
  const result=evaluate(`(()=>{
    const blocked={
      getItem(){throw new Error('blocked');},
      setItem(){throw new Error('blocked');},
      removeItem(){throw new Error('blocked');}
    };
    const runtime=BSS_CORE.runtime.create({storage:blocked});
    runtime.storage.set('session','aktivna');
    const saved=runtime.storage.get('session');
    runtime.storage.remove('session');
    return [saved,runtime.storage.get('session')];
  })()`);
  assert.deepEqual([...result],['aktivna',null]);
});

test('state adapter prihvaća samo očekivanu verziju i klonira fallback',()=>{
  const {evaluate}=boot('admin');
  const result=evaluate(`(()=>{
    const memory=BSS_CORE.runtime.createMemoryStorage({'state':'{"version":7,"value":"staro"}'});
    const runtime=BSS_CORE.runtime.create({storage:memory});
    const fallback={version:8,nested:{value:'novo'}};
    const first=runtime.state.load('state',{version:8,fallback});
    first.nested.value='promijenjeno';
    const second=runtime.state.load('state',{version:8,fallback});
    runtime.state.save('state',{version:8,nested:{value:'spremljeno'}});
    const stored=runtime.state.load('state',{version:8,fallback});
    return [second.nested.value,stored.nested.value];
  })()`);
  assert.deepEqual([...result],['novo','spremljeno']);
});

test('zamjenjivi sat i monotoni ID generator daju determinističan rezultat',()=>{
  const {evaluate}=boot('admin');
  const result=evaluate(`(()=>{
    const fixed=new Date('2026-07-12T08:00:00.000Z');
    const runtime=BSS_CORE.runtime.create({storage:BSS_CORE.runtime.createMemoryStorage(),now:()=>fixed});
    return [runtime.clock.nowMs(),runtime.clock.futureDate(2).getTime(),runtime.ids.next(),runtime.ids.next(),runtime.ids.next()];
  })()`);
  assert.equal(result[1]-result[0],7200000);
  assert.deepEqual([...result.slice(2)],[result[0],result[0]+1,result[0]+2]);
});

test('aplikacija koristi runtime granicu za pohranu, sat i nove ID-eve',()=>{
  assert.doesNotMatch(source,/\blocalStorage\b/);
  assert.doesNotMatch(source,/Date\.now\s*\(/);
  assert.match(source,/BSS_RUNTIME\.state\.load/);
  assert.match(source,/BSS_RUNTIME\.clock\.nowLabel/);
  assert.match(source,/BSS_RUNTIME\.ids\.next/);
  assert.doesNotMatch(html,/localStorage\.getItem/);
});

test('attendance use-case računa isti sažetak i čisto primjenjuje korekciju',()=>{
  const {evaluate}=boot('admin');
  const summary=evaluate(`BSS_CORE.useCases.attendance.summarize([
    {workerId:1,date:'2026-07-10',start:'08:00',end:'16:00',breakMinutes:30,status:'Uredno'},
    {workerId:1,date:'2026-07-10',start:'08:10',end:'',breakMinutes:0,status:'Kašnjenje'}
  ],{today:'2026-07-10',recordMinutes:r=>BSS_CORE.time.recordMinutes(r),plannedShiftMinutes:()=>450})`);
  assert.equal(summary.records,2);
  assert.equal(summary.completed,1);
  assert.equal(summary.active,1);
  assert.equal(summary.late,1);
  assert.equal(summary.workedMinutes,450);
  assert.equal(summary.balanceMinutes,0);
  const applied=evaluate(`BSS_CORE.useCases.attendance.applyApprovedCorrection({
    correction:{date:'2026-07-09',newStart:'08:00',newEnd:'16:00'},record:null,workerId:7,shiftBreakMinutes:30,id:99
  })`);
  assert.equal(applied.created,true);
  assert.deepEqual({...applied.record},{id:99,workerId:7,date:'2026-07-09',start:'08:00',end:'16:00',breakMinutes:30,status:'Ispravljeno'});
});

test('leave use-case vraća stabilne kodove za granice novog zahtjeva',()=>{
  const {evaluate}=boot('admin');
  const codes=evaluate(`(()=>{
    const useCase=BSS_CORE.useCases.leave;
    const base={workerId:1,type:'Godišnji odmor',start:'2026-08-17',end:'2026-08-21',today:'2026-07-10',year:'2026',requests:[],availableDays:5,businessDays:()=>5,intervalsOverlap:BSS_CORE.time.intervalsOverlap};
    return [
      useCase.validateSubmission({...base,end:'2026-08-16'}).code,
      useCase.validateSubmission({...base,start:'2026-07-10'}).code,
      useCase.validateSubmission({...base,start:'2027-01-01',end:'2027-01-02'}).code,
      useCase.validateSubmission({...base,businessDays:()=>0}).code,
      useCase.validateSubmission({...base,availableDays:4}).code,
      useCase.validateSubmission({...base,requests:[{workerId:1,start:'2026-08-20',end:'2026-08-22',status:'Odobreno'}]}).code
    ];
  })()`);
  assert.deepEqual([...codes],['INVALID_RANGE','NOT_FUTURE','OUTSIDE_YEAR','NO_WORKING_DAYS','INSUFFICIENT_BALANCE','OVERLAP']);
});

test('leave use-case provodi nepromjenjive prijelaze odluke i poništavanja',()=>{
  const {evaluate}=boot('admin');
  const result=evaluate(`(()=>{
    const useCase=BSS_CORE.useCases.leave;
    const original=useCase.createRequest({id:1,workerId:7,type:'Godišnji odmor',start:'2026-08-17',end:'2026-08-21',note:'',submittedAt:'sada'});
    const missing=useCase.decide(original,{status:'Odbijeno',note:'',actor:'Voditelj',decidedAt:'kasnije'});
    const approved=useCase.decide(original,{status:'Odobreno',note:'',actor:'Voditelj',decidedAt:'kasnije'});
    const cancelled=useCase.cancel(original,{workerId:7,decidedAt:'kasnije'});
    return [original.status,missing.code,approved.request.status,approved.request.decisionNote,cancelled.request.status];
  })()`);
  assert.deepEqual([...result],['Na čekanju','REJECTION_NOTE_REQUIRED','Odobreno','Odobreno bez dodatne napomene.','Poništeno']);
});

test('correction use-case validira zahtjev i odobrenjem mijenja jedan zapis',()=>{
  const {evaluate}=boot('admin');
  const result=evaluate(`(()=>{
    const useCase=BSS_CORE.useCases.corrections;
    const base={workerId:1,date:'2026-07-09',newStart:'08:00',newEnd:'16:00',reason:'Ispravak',today:'2026-07-10',records:[],corrections:[],timeToMinutes:BSS_CORE.time.timeToMinutes};
    const equal=useCase.validateSubmission({...base,newEnd:'08:00'}).code;
    const long=useCase.validateSubmission({...base,newEnd:'01:00'}).code;
    const valid=useCase.validateSubmission(base);
    const request=useCase.createRequest({id:2,...base,oldStart:valid.oldStart,oldEnd:valid.oldEnd});
    const decision=useCase.decide(request,{status:'Odobreno',record:null,workerId:1,shiftBreakMinutes:30,id:3});
    return [equal,long,request.status,decision.correction.status,decision.created,decision.record.status];
  })()`);
  assert.deepEqual([...result],['EQUAL_TIMES','TOO_LONG','Na čekanju','Odobreno',true,'Ispravljeno']);
});

test('UI funkcije delegiraju poslovne odluke izdvojenim R3 use-caseovima',()=>{
  assert.match(source,/BSS_USE_CASES\.attendance\.summarize/);
  assert.match(source,/BSS_USE_CASES\.leave\.validateSubmission/);
  assert.match(source,/BSS_USE_CASES\.leave\.decide/);
  assert.match(source,/BSS_USE_CASES\.corrections\.validateSubmission/);
  assert.match(source,/BSS_USE_CASES\.corrections\.decide/);
});

test('R4 source i renderirani DOM nemaju inline JavaScript handlere',()=>{
  assert.doesNotMatch(source,/\son(?:click|change|input|keydown|submit)\s*=/i);
  for(const role of ['admin','manager','worker','accountant']){
    const {document}=boot(role);
    assert.equal(document.querySelectorAll('[onclick],[onchange],[oninput],[onkeydown],[onsubmit]').length,0);
    assert.ok(document.querySelectorAll('[data-bss-action]').length>5);
  }
});

test('screen registry zaključava sve BSS ekrane i sigurno vraća početni prikaz',()=>{
  const {evaluate}=boot('admin');
  const screens=evaluate('BSS_CORE.views.registry.screens');
  assert.deepEqual(Object.keys(screens).sort(),[
    'attendance','audit','corrections','flow','home','mytime','reports','requests','roles','settings',
    'shifts','terminal','terminalDemo','vacations','worker','workers'
  ]);
  assert.equal(evaluate("BSS_CORE.views.registry.has('reports')"),true);
  assert.equal(evaluate("BSS_CORE.views.registry.has('__proto__')"),false);
  assert.match(evaluate("BSS_CORE.views.registry.render('nepoznato',globalThis)"),/Operativni dashboard/);
});

test('event registry parsira samo dopuštene akcije bez evala',()=>{
  const {evaluate}=boot('admin');
  const parsed=evaluate(`(()=>{
    const element={value:'manager'};
    const first=BSS_CORE.views.events.parse("navigate('reports')",element);
    const second=BSS_CORE.views.events.parse('switchRole(this.value)',element);
    return [first.name,first.args[0],second.name,second.args[0]];
  })()`);
  assert.deepEqual([...parsed],['navigate','reports','switchRole','manager']);
  assert.equal(evaluate("BSS_CORE.views.events.parse(\"constructor.constructor('return 1')()\",{})"),null);
  assert.equal(evaluate("BSS_CORE.views.events.parse(\"unknownAction()\",{})"),null);
  assert.doesNotMatch(fs.readFileSync('src/views/events.js','utf8'),/\beval\s*\(|new Function|Function\s*\(/);
});

test('delegirani click i change zadržavaju navigaciju i promjenu uloge',()=>{
  const {window,document,evaluate}=boot('admin');
  document.querySelector('[data-bss-action="navigate(\'reports\')"]').click();
  assert.equal(evaluate('screen'),'reports');
  document.querySelector('.role-badge').click();
  const select=document.querySelector('.role-panel select');
  select.value='manager';
  select.dispatchEvent(new window.Event('change',{bubbles:true}));
  assert.equal(evaluate('currentRole'),'manager');
});

test('delegirana tipka Enter aktivira red, a backdrop samo vlastitu pozadinu',()=>{
  const {window,document,evaluate}=boot('manager');
  const workerRow=document.querySelector('.row[role="button"][data-bss-action]');
  workerRow.dispatchEvent(new window.KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));
  assert.equal(evaluate('screen'),'worker');
  window.openDrawer();
  const drawer=document.querySelector('#drawer');
  drawer.querySelector('.drawer-panel').dispatchEvent(new window.MouseEvent('click',{bubbles:true}));
  assert.ok(drawer.classList.contains('open'));
  drawer.dispatchEvent(new window.MouseEvent('click',{bubbles:true}));
  assert.equal(drawer.classList.contains('open'),false);
});

test('svaka renderirana akcija svakog dopuštenog ekrana pripada R4 registryju',()=>{
  for(const role of ['admin','manager','worker','accountant']){
    const app=boot(role);
    const screens=[...app.evaluate('allowedScreens()')];
    for(const target of screens){
      app.window.navigate(target);
      const invalid=app.evaluate(`[...document.querySelectorAll('[data-bss-action],[data-bss-change]')]
        .filter(element=>!BSS_CORE.views.events.parse(element.dataset.bssAction||element.dataset.bssChange,element))
        .map(element=>element.dataset.bssAction||element.dataset.bssChange)`);
      assert.deepEqual([...invalid],[],`${role}/${target}: nevaljane akcije`);
    }
  }
});
