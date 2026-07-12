'use strict';

const STORAGE_KEY = 'bss-demo-state-v4';
const ROLE_KEY = 'bss-demo-role-v3';
const LOGIN_KEY = 'bss-demo-logged-v3';
const APP_VERSION = '3.0';
const APP_STAGE = 'Sprint 1';
const DEMO_TODAY = '2026-07-10';
const DEMO_NOW = '10:00';
const CROATIAN_HOLIDAYS_2026 = new Set([
  '2026-01-01','2026-01-06','2026-04-05','2026-04-06','2026-05-01','2026-05-30',
  '2026-06-04','2026-06-22','2026-08-05','2026-08-15','2026-11-01','2026-11-18',
  '2026-12-25','2026-12-26'
]);

const DEFAULT_STATE = {
  version: 4,
  demoMode: true,
  company: {
    name: 'BSS Demo d.o.o.',
    oib: '12345678901',
    address: 'Đakovo, Hrvatska',
    timezone: 'Europe/Zagreb',
    workTime: '08:00 – 16:00'
  },
  shifts: [
    {id: 1, name: 'Jutarnja', start: '08:00', end: '16:00', breakMinutes: 30, tolerance: 5, active: true},
    {id: 2, name: 'Popodnevna', start: '14:00', end: '22:00', breakMinutes: 30, tolerance: 5, active: true},
    {id: 3, name: 'Noćna', start: '22:00', end: '06:00', breakMinutes: 30, tolerance: 5, active: true},
    {id: 4, name: 'Fleksibilna', start: '08:00', end: '16:00', breakMinutes: 30, tolerance: 15, active: true}
  ],
  workers: [
    {id: 1, name: 'Ivan Horvat', email: 'ivan.horvat@bss.hr', dept: 'Proizvodnja', jobTitle: 'Operater', shiftId: 1, status: 'Prisutan', card: '04 19 C2 8F', cardStatus: 'Aktivna', todayStart: '07:42', active: true, vacationAllowance: 24},
    {id: 2, name: 'Marko Marić', email: 'marko.maric@bss.hr', dept: 'Sklapanje', jobTitle: 'Voditelj smjene', shiftId: 1, status: 'Kasni', card: '04 A7 91 2B', cardStatus: 'Aktivna', todayStart: '08:12', active: true, vacationAllowance: 24},
    {id: 3, name: 'Ana Kovač', email: 'ana.kovac@bss.hr', dept: 'Ured', jobTitle: 'Administracija', shiftId: 4, status: 'Godišnji', card: '04 7D 55 31', cardStatus: 'Aktivna', todayStart: '', active: true, vacationAllowance: 24},
    {id: 4, name: 'Petra Novak', email: 'petra.novak@bss.hr', dept: 'Prodaja', jobTitle: 'Komercijalist', shiftId: 4, status: 'Odsutna', card: '04 2F 70 1A', cardStatus: 'Aktivna', todayStart: '', active: true, vacationAllowance: 24},
    {id: 5, name: 'Tomislav Bognar', email: 'tomislav.bognar@bss.hr', dept: 'IT podrška', jobTitle: 'Administrator', shiftId: 4, status: 'Prisutan', card: '04 0B 44 9C', cardStatus: 'Aktivna', todayStart: '08:05', active: true, vacationAllowance: 24},
    {id: 6, name: 'Josip Jurić', email: 'josip.juric@bss.hr', dept: 'Održavanje', jobTitle: 'Serviser', shiftId: 2, status: 'Očekuje smjenu', card: '04 FA 02 DD', cardStatus: 'Aktivna', todayStart: '', active: true, vacationAllowance: 24},
    {id: 7, name: 'Marija Radić', email: 'marija.radic@bss.hr', dept: 'Proizvodnja', jobTitle: 'Kontrola kvalitete', shiftId: 1, status: 'Bolovanje', card: '04 3C 62 E1', cardStatus: 'Aktivna', todayStart: '', active: true, vacationAllowance: 24}
  ],
  records: [
    {id: 1, workerId: 1, date: '2026-07-06', start: '07:46', end: '16:01', breakMinutes: 30, status: 'Uredno'},
    {id: 2, workerId: 1, date: '2026-07-07', start: '07:58', end: '16:04', breakMinutes: 30, status: 'Uredno'},
    {id: 3, workerId: 1, date: '2026-07-08', start: '07:55', end: '16:02', breakMinutes: 30, status: 'Uredno'},
    {id: 4, workerId: 1, date: '2026-07-09', start: '07:51', end: '16:00', breakMinutes: 30, status: 'Uredno'},
    {id: 5, workerId: 1, date: '2026-07-10', start: '07:42', end: '', breakMinutes: 0, status: 'Aktivno'},
    {id: 6, workerId: 2, date: '2026-07-06', start: '07:52', end: '16:04', breakMinutes: 30, status: 'Uredno'},
    {id: 7, workerId: 2, date: '2026-07-07', start: '07:57', end: '16:03', breakMinutes: 30, status: 'Uredno'},
    {id: 8, workerId: 2, date: '2026-07-08', start: '08:12', end: '', breakMinutes: 30, status: 'Nepotpun zapis'},
    {id: 9, workerId: 2, date: '2026-07-09', start: '07:49', end: '16:05', breakMinutes: 30, status: 'Uredno'},
    {id: 10, workerId: 2, date: '2026-07-10', start: '08:12', end: '', breakMinutes: 0, status: 'Kašnjenje'},
    {id: 11, workerId: 3, date: '2026-07-06', start: '08:04', end: '16:12', breakMinutes: 30, status: 'Uredno'},
    {id: 12, workerId: 3, date: '2026-07-07', start: '08:02', end: '16:08', breakMinutes: 30, status: 'Uredno'},
    {id: 13, workerId: 3, date: '2026-07-08', start: '08:09', end: '16:15', breakMinutes: 30, status: 'Uredno'},
    {id: 14, workerId: 4, date: '2026-07-06', start: '08:11', end: '16:18', breakMinutes: 30, status: 'Uredno'},
    {id: 15, workerId: 4, date: '2026-07-07', start: '08:22', end: '16:20', breakMinutes: 30, status: 'Kašnjenje'},
    {id: 16, workerId: 5, date: '2026-07-08', start: '08:03', end: '16:19', breakMinutes: 30, status: 'Uredno'},
    {id: 17, workerId: 5, date: '2026-07-09', start: '08:06', end: '16:10', breakMinutes: 30, status: 'Uredno'},
    {id: 18, workerId: 5, date: '2026-07-10', start: '08:05', end: '', breakMinutes: 0, status: 'Aktivno'},
    {id: 19, workerId: 6, date: '2026-07-06', start: '13:55', end: '22:01', breakMinutes: 30, status: 'Uredno'},
    {id: 20, workerId: 6, date: '2026-07-07', start: '14:07', end: '22:04', breakMinutes: 30, status: 'Kašnjenje'},
    {id: 21, workerId: 7, date: '2026-07-06', start: '07:54', end: '16:02', breakMinutes: 30, status: 'Uredno'},
    {id: 22, workerId: 7, date: '2026-07-07', start: '07:56', end: '16:01', breakMinutes: 30, status: 'Uredno'}
  ],
  requests: [
    {id: 1, workerId: 2, type: 'Godišnji odmor', start: '2026-06-23', end: '2026-06-27', note: 'Obiteljski odmor', status: 'Na čekanju'},
    {id: 2, workerId: 3, type: 'Slobodan dan', start: '2026-07-15', end: '2026-07-15', note: 'Privatne obveze', status: 'Odobreno'},
    {id: 3, workerId: 6, type: 'Godišnji odmor', start: '2026-08-05', end: '2026-08-09', note: 'Ljetni godišnji', status: 'Na čekanju'},
    {id: 4, workerId: 1, type: 'Godišnji odmor', start: '2026-03-16', end: '2026-03-20', note: 'Proljetni odmor', status: 'Odobreno'},
    {id: 5, workerId: 1, type: 'Godišnji odmor', start: '2026-09-28', end: '2026-10-02', note: 'Jesenski odmor', status: 'Odobreno'},
    {id: 6, workerId: 1, type: 'Godišnji odmor', start: '2026-12-28', end: '2026-12-30', note: 'Kraj godine', status: 'Na čekanju'},
    {id: 7, workerId: 4, type: 'Godišnji odmor', start: '2026-09-07', end: '2026-09-18', note: 'Glavni godišnji', status: 'Odobreno'},
    {id: 8, workerId: 5, type: 'Godišnji odmor', start: '2026-12-21', end: '2026-12-24', note: 'Blagdanski odmor', status: 'Odobreno'},
    {id: 9, workerId: 2, type: 'Godišnji odmor', start: '2026-04-06', end: '2026-04-10', note: 'Proljetni odmor', status: 'Odobreno'}
  ],
  corrections: [
    {id: 1, workerId: 2, date: '2026-07-08', oldStart: '08:12', oldEnd: '', newStart: '08:12', newEnd: '16:02', reason: 'Zaboravljena odjava', status: 'Na čekanju'},
    {id: 2, workerId: 1, date: '2026-07-07', oldStart: '08:04', oldEnd: '16:04', newStart: '07:58', newEnd: '16:04', reason: 'Terminal je bio offline', status: 'Odobreno'}
  ],
  audit: [
    {time: '10.07.2026. 08:12', user: 'Sustav', module: 'Terminal', action: 'RFID prijava Marka Marića na terminalu 01.'},
    {time: '10.07.2026. 08:05', user: 'Sustav', module: 'Terminal', action: 'RFID prijava Tomislava Bognara na terminalu 01.'},
    {time: '10.07.2026. 07:42', user: 'Sustav', module: 'Terminal', action: 'RFID prijava Ivana Horvata na terminalu 01.'},
    {time: '09.07.2026. 16:20', user: 'Administrator', module: 'Korekcije', action: 'Zaprimljen zahtjev za dopunu odjave Marka Marića.'}
  ],
  terminal: {online: true, unsynced: 0, scans: 36, lastSync: 'prije 48 sekundi', version: 'BSS OS 0.9.4'},
  lastScan: {workerId: 2, label: 'Marko Marić', status: 'Prijavljen', time: '08:12', message: 'Prijava prihvaćena.'},
  lastReport: 'Nije još generiran'
};

const ROLE_CONFIG = {
  admin: {label: 'Administrator', short: 'ADMIN', userId: 5},
  manager: {label: 'Voditelj', short: 'VODITELJ', userId: 2, departments: ['Sklapanje','Proizvodnja']},
  worker: {label: 'Radnik', short: 'RADNIK', userId: 1},
  accountant: {label: 'Knjigovođa', short: 'KNJIGOVOĐA', userId: 3}
};

let state = loadState();
let logged = localStorage.getItem(LOGIN_KEY) === '1';
let currentRole = localStorage.getItem(ROLE_KEY) || 'admin';
let screen = 'home';
let activeWorkerId = 1;
let workerTab = 'Profil';
let workerListTab = 'Svi';
let workerSearch = '';
let calendarYear = 2026;
let calendarMonth = 6;
let calendarMode = 'year';
let vacationDepartment = 'Svi';
let attendanceFilters = {month: '2026-07', department: 'Svi', status: 'Svi', search: ''};
let reportFilters = {month: '2026-07', department: 'Svi', workerId: 'Svi', type: 'attendance'};

const $ = selector => document.querySelector(selector);
function clone(value){ return JSON.parse(JSON.stringify(value)); }

function loadState(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && parsed.version === 4 ? parsed : clone(DEFAULT_STATE);
  }catch(error){
    return clone(DEFAULT_STATE);
  }
}
function saveState(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function resetState(){ state = clone(DEFAULT_STATE); saveState(); }
function escapeHtml(value){
  return String(value ?? '').replace(/[&<>'"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
}
function now(){
  return new Date().toLocaleString('hr-HR',{hour:'2-digit',minute:'2-digit',day:'2-digit',month:'2-digit',year:'numeric'}).replace(',', '.');
}
function isoToDate(iso){ return new Date(`${iso}T12:00:00`); }
function isoLabel(iso, withYear = true){
  if(!iso) return '—';
  return isoToDate(iso).toLocaleDateString('hr-HR',withYear?{day:'2-digit',month:'2-digit',year:'numeric'}:{day:'2-digit',month:'2-digit'});
}
function rangeLabel(start,end){ return start === end ? isoLabel(start,false) : `${isoLabel(start,false)} – ${isoLabel(end,false)}`; }
function timeToMinutes(value){
  if(!/^\d{2}:\d{2}$/.test(value || '')) return null;
  const [hour,minute] = value.split(':').map(Number);
  return hour * 60 + minute;
}
function recordMinutes(record, includeActive = false){
  const start = timeToMinutes(record.start);
  let end = timeToMinutes(record.end);
  if(start === null) return 0;
  if(end === null && includeActive && record.date === DEMO_TODAY) end = timeToMinutes(DEMO_NOW);
  if(end === null) return 0;
  if(end < start) end += 1440;
  return Math.max(0, end - start - Number(record.breakMinutes || 0));
}
function formatMinutes(minutes){
  const value = Math.max(0, Math.round(Number(minutes) || 0));
  return `${Math.floor(value/60)}:${String(value%60).padStart(2,'0')} h`;
}
function businessDays(start,end){
  if(!start || !end || end < start) return 0;
  let count = 0;
  const cursor = isoToDate(start);
  const finish = isoToDate(end);
  while(cursor <= finish){
    const iso = cursor.toISOString().slice(0,10);
    const day = cursor.getDay();
    if(day !== 0 && day !== 6 && !CROATIAN_HOLIDAYS_2026.has(iso)) count += 1;
    cursor.setDate(cursor.getDate()+1);
  }
  return count;
}
function pluralDays(count){ return `${count} ${count === 1 ? 'radni dan' : 'radnih dana'}`; }
function workerById(id){ return state.workers.find(worker => worker.id === Number(id)); }
function shiftById(id){ return state.shifts.find(shift => shift.id === Number(id)); }
function initials(name){ return String(name || '?').split(/\s+/).filter(Boolean).map(part=>part[0]).join('').slice(0,2).toUpperCase(); }
function role(){ return ROLE_CONFIG[currentRole] || ROLE_CONFIG.admin; }
function currentWorker(){ return workerById(role().userId) || state.workers[0]; }
function departmentList(){ return [...new Set(state.workers.filter(w=>w.active).map(w=>w.dept))].sort((a,b)=>a.localeCompare(b,'hr')); }
function activeWorkers(){ return state.workers.filter(worker=>worker.active); }
function visibleWorkers(){
  if(currentRole === 'admin') return state.workers;
  if(currentRole === 'manager') return state.workers.filter(worker=>role().departments.includes(worker.dept));
  if(currentRole === 'worker') return state.workers.filter(worker=>worker.id === role().userId);
  return [];
}
function workerVisible(workerId){ return visibleWorkers().some(worker=>worker.id === Number(workerId)); }
function requestVisible(request){
  if(currentRole === 'admin' || currentRole === 'accountant') return true;
  return workerVisible(request.workerId);
}
function recordVisible(record){
  if(currentRole === 'admin' || currentRole === 'accountant') return true;
  return workerVisible(record.workerId);
}
function correctionVisible(correction){ return currentRole === 'admin' || currentRole === 'accountant' ? true : workerVisible(correction.workerId); }
function workerMonthMinutes(workerId, month = '2026-07'){
  return state.records.filter(record=>record.workerId === Number(workerId) && record.date.startsWith(month)).reduce((sum,record)=>sum+recordMinutes(record),0);
}
function vacationUsed(workerId, year = 2026){
  return state.requests.filter(request=>request.workerId === Number(workerId) && request.type === 'Godišnji odmor' && request.status === 'Odobreno' && request.start.startsWith(String(year))).reduce((sum,request)=>sum+businessDays(request.start,request.end),0);
}
function vacationRemaining(workerId, year = 2026){
  const worker = workerById(workerId);
  return Math.max(0,(worker?.vacationAllowance || 0)-vacationUsed(workerId,year));
}
function pendingCount(){
  const requests = state.requests.filter(request=>request.status === 'Na čekanju' && requestVisible(request)).length;
  const corrections = state.corrections.filter(correction=>correction.status === 'Na čekanju' && correctionVisible(correction)).length;
  return requests + corrections;
}
function plannedShiftMinutes(workerId){
  const shift=shiftById(workerById(workerId)?.shiftId);
  if(!shift)return 0;
  const start=timeToMinutes(shift.start),rawEnd=timeToMinutes(shift.end);
  if(start===null||rawEnd===null)return 0;
  const end=rawEnd<=start?rawEnd+1440:rawEnd;
  return Math.max(0,end-start-Number(shift.breakMinutes||0));
}
function overtimeMinutes(records){
  return records.reduce((sum,record)=>sum+Math.max(0,recordMinutes(record)-plannedShiftMinutes(record.workerId)),0);
}
function dashboardMetrics(workers){
  const ids=new Set(workers.map(worker=>worker.id));
  const records=state.records.filter(record=>ids.has(record.workerId)&&record.date.startsWith('2026-07'));
  return {
    active:workers.length,
    present:workers.filter(worker=>['Prisutan','Kasni'].includes(worker.status)).length,
    late:workers.filter(worker=>worker.status==='Kasni').length,
    absent:workers.filter(worker=>worker.status==='Odsutna').length,
    vacation:workers.filter(worker=>worker.status==='Godišnji').length,
    sick:workers.filter(worker=>worker.status==='Bolovanje').length,
    waiting:workers.filter(worker=>worker.status==='Očekuje smjenu').length,
    pending:pendingCount(),
    review:records.filter(record=>['Kašnjenje','Nepotpun zapis'].includes(record.status)).length,
    overtime:overtimeMinutes(records),
    monthMinutes:records.reduce((sum,record)=>sum+recordMinutes(record),0)
  };
}
function weeklyAttendance(workerIds){
  const ids=new Set(workerIds);
  return ['2026-07-06','2026-07-07','2026-07-08','2026-07-09','2026-07-10'].map(date=>{
    const records=state.records.filter(record=>ids.has(record.workerId)&&record.date===date);
    return {date,label:isoToDate(date).toLocaleDateString('hr-HR',{weekday:'short'}).replace('.',''),checkins:records.filter(record=>record.start).length,checkouts:records.filter(record=>record.end).length};
  });
}
function recentAttendanceEvents(type,workerIds,limit=4){
  const ids=new Set(workerIds);
  const field=type==='in'?'start':'end';
  return state.records.filter(record=>ids.has(record.workerId)&&record[field]).map(record=>({worker:workerById(record.workerId),date:record.date,time:record[field],status:record.status})).sort((a,b)=>`${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`)).slice(0,limit);
}
function dashboardAlerts(metrics){
  const alerts=[];
  if(metrics.review)alerts.push({tone:'warning',icon:'!',title:`${metrics.review} zapisa traže provjeru`,text:'Kašnjenja ili nepotpuni zapisi u srpnju.',target:'attendance'});
  if(state.requests.some(request=>request.status==='Na čekanju'&&requestVisible(request)))alerts.push({tone:'info',icon:'□',title:'Zahtjevi čekaju odluku',text:`${state.requests.filter(request=>request.status==='Na čekanju'&&requestVisible(request)).length} zahtjeva za odsutnost.`,target:'requests'});
  if(state.corrections.some(correction=>correction.status==='Na čekanju'&&correctionVisible(correction)))alerts.push({tone:'info',icon:'✎',title:'Korekcija vremena na čekanju',text:'Odobrenje će ažurirati evidenciju i audit log.',target:'corrections'});
  if(!state.terminal.online||state.terminal.unsynced)alerts.push({tone:'danger',icon:'◉',title:'Terminal zahtijeva pažnju',text:`${state.terminal.unsynced} neposlanih zapisa.`,target:'terminal'});
  return alerts;
}
function navBadge(id){
  if(id==='requests')return state.requests.filter(request=>request.status==='Na čekanju'&&requestVisible(request)).length;
  if(id==='corrections')return state.corrections.filter(correction=>correction.status==='Na čekanju'&&correctionVisible(correction)).length;
  if(id==='terminal')return state.terminal.unsynced;
  return 0;
}
function audit(user,action,module){ state.audit.unshift({time:now(),user,action,module}); saveState(); }
function toast(message){
  const element = $('#toast');
  if(!element) return;
  element.textContent = message;
  element.classList.add('show');
  clearTimeout(window.__bssToast);
  window.__bssToast = setTimeout(()=>element.classList.remove('show'),2600);
}
function pill(status){
  const green = ['Prisutan','Uredno','Ispravljeno','Odobreno','Online','Prijavljen','Aktivna','Aktivno','Aktivan','Sinkronizirano'];
  const orange = ['Na čekanju','Kasni','Kašnjenje','Nepotpun zapis','Očekuje smjenu','Offline zapis'];
  const red = ['Odbijeno','Odsutna','Greška','Offline','Blokirana','Neaktivan','Neaktivna'];
  const blue = ['Godišnji','Bolovanje','Samo čitanje','Demo'];
  const css = green.includes(status) ? 'green' : orange.includes(status) ? 'orange' : red.includes(status) ? 'red' : blue.includes(status) ? 'blue' : '';
  return `<span class="pill ${css}">${escapeHtml(status)}</span>`;
}
function title(heading,subtitle,right = ''){
  return `<div class="section-title"><div><h1>${escapeHtml(heading)}</h1><p>${escapeHtml(subtitle)}</p></div><div class="section-actions">${right}</div></div>`;
}
function row(avatar,heading,subtitle,right = '',click = ''){
  const interaction = click ? ` clickable" role="button" tabindex="0" onclick="${click}" onkeydown="if(event.key==='Enter')${click}` : '';
  return `<div class="row${interaction}"><div class="avatar">${escapeHtml(avatar)}</div><div class="meta"><b>${escapeHtml(heading)}</b><span>${subtitle}</span></div><div class="side">${right}</div></div>`;
}
function saveAndRender(message){ saveState(); render(); if(message) toast(message); }

const NAV_ITEMS = {
  admin: [
    ['home','⌂','Početna'],['attendance','◴','Evidencija'],['workers','☷','Radnici'],['shifts','↺','Smjene'],
    ['vacations','▦','Godišnji'],['requests','□','Zahtjevi'],['corrections','✎','Korekcije'],['reports','⇩','Izvještaji'],
    ['terminal','◉','Terminali'],['roles','♙','Prava pristupa'],['audit','☰','Audit log'],['settings','⚙','Postavke']
  ],
  manager: [
    ['home','⌂','Početna'],['attendance','◴','Evidencija tima'],['workers','☷','Moj tim'],['shifts','↺','Smjene'],
    ['vacations','▦','Godišnji tima'],['requests','□','Zahtjevi'],['corrections','✎','Korekcije'],['reports','⇩','Izvještaji'],['terminal','◉','Terminali']
  ],
  worker: [
    ['home','⌂','Početna'],['mytime','◷','Moji sati'],['vacations','▦','Moj godišnji'],['requests','□','Moji zahtjevi'],['corrections','✎','Moje korekcije']
  ],
  accountant: [
    ['home','⌂','Početna'],['reports','⇩','Izvještaji'],['vacations','▦','Odsutnosti']
  ]
};
const DEMO_NAV = {
  admin: [['terminalDemo','≋','RFID simulator'],['flow','→','Kako radi BSS']],
  manager: [['terminalDemo','≋','RFID simulator'],['flow','→','Kako radi BSS']],
  worker: [],
  accountant: []
};

function roleNavItems(){ return [...(NAV_ITEMS[currentRole] || []),...(state.demoMode ? DEMO_NAV[currentRole] || [] : [])]; }
function allowedScreens(){
  const allowed = roleNavItems().map(item=>item[0]);
  if(['admin','manager'].includes(currentRole)) allowed.push('worker');
  if(currentRole === 'admin') allowed.push('mytime');
  return [...new Set(allowed)];
}
function navigate(next){
  screen = allowedScreens().includes(next) ? next : 'home';
  if(screen !== 'worker') workerTab = 'Profil';
  closeDrawer();
  render();
  const content = $('#content');
  if(content) content.scrollTop = 0;
}
function switchRole(next){
  if(!state.demoMode || !ROLE_CONFIG[next]) return;
  currentRole = next;
  localStorage.setItem(ROLE_KEY,currentRole);
  vacationDepartment = 'Svi';
  calendarMode = currentRole === 'admin' ? 'year' : 'month';
  screen = 'home';
  render();
  toast(`Aktivni prikaz: ${role().label}.`);
}
function toggleDemoMode(){
  state.demoMode = !state.demoMode;
  if(!state.demoMode && ['terminalDemo','flow'].includes(screen)) screen = 'home';
  saveAndRender(state.demoMode ? 'Prodajni demo-alati su uključeni.' : 'Prikazuje se čista aplikacija bez prodajnih demo-alata.');
}
function topCopy(){
  const worker = currentWorker();
  const map = {
    home: ['Početna',`${role().label} · ${state.company.name}`],
    attendance: ['Evidencija dolazaka','Filtrirani zapisi radnog vremena'],
    mytime: ['Moja evidencija',`${worker.name} · osobni podaci`],
    workers: ['Radnici',currentRole === 'manager' ? 'Radnici u mojem timu' : 'Zaposlenici, smjene i kartice'],
    worker: ['Detalj radnika','Profil, evidencija i RFID kartica'],
    shifts: ['Smjene','Rasporedi i pravila evidencije'],
    requests: ['Zahtjevi','Godišnji odmor i slobodni dani'],
    vacations: ['Kalendar godišnjih','Odsutnosti i raspoloživi dani'],
    corrections: ['Korekcije vremena','Kontrolirane izmjene zapisa'],
    reports: ['Izvještaji','CSV i pravi XLSX export'],
    terminal: ['Terminali','Status uređaja i sinkronizacije'],
    terminalDemo: ['RFID simulator','Odvojeni prodajni demo terminala'],
    flow: ['Kako radi BSS','Prodajni prikaz procesa'],
    roles: ['Prava pristupa','Ovlasti po ulozi'],
    audit: ['Audit log','Trag važnih aktivnosti'],
    settings: ['Postavke','Tvrtka i način prikaza']
  };
  return map[screen] || map.home;
}
function navButton(item,kind = 'drawer'){
  const [id,icon,label] = item;
  const count=navBadge(id);
  if(kind === 'bottom') return `<button class="nav-item ${screen===id?'active':''}" onclick="navigate('${id}')"><span class="ico">${icon}${count?`<i class="nav-dot">${count}</i>`:''}</span>${escapeHtml(label)}</button>`;
  return `<button class="drawer-item ${screen===id?'active':''}" onclick="navigate('${id}')"><span class="nav-icon">${icon}</span><span class="nav-label">${escapeHtml(label)}</span>${count?`<span class="nav-count">${count}</span>`:''}</button>`;
}
function bottomNavigation(){
  const picks = {
    admin: ['home','attendance','workers','vacations','reports'],
    manager: ['home','attendance','workers','vacations','requests'],
    worker: ['home','mytime','vacations','requests','corrections'],
    accountant: ['home','reports','vacations']
  }[currentRole] || ['home'];
  const items = (NAV_ITEMS[currentRole] || []).filter(item=>picks.includes(item[0]));
  return `<nav class="bottom-nav" aria-label="Glavna navigacija" style="grid-template-columns:repeat(${items.length},1fr)">${items.map(item=>navButton(item,'bottom')).join('')}</nav>`;
}
function navGroup(id){
  if(['home','attendance','mytime'].includes(id))return 'Pregled';
  if(['workers','worker','shifts','vacations'].includes(id))return 'Ljudi i rasporedi';
  if(['requests','corrections'].includes(id))return 'Odobravanja';
  if(['reports','terminal','roles','audit','settings'].includes(id))return 'Sustav';
  return 'Demo alati';
}
function navList(grouped=false){
  const items=roleNavItems();
  if(!grouped)return items.map(item=>navButton(item)).join('');
  const groups=['Pregled','Ljudi i rasporedi','Odobravanja','Sustav','Demo alati'];
  return groups.map(group=>{
    const groupItems=items.filter(item=>navGroup(item[0])===group);
    return groupItems.length?`<div class="nav-group"><div class="nav-group-label">${group}</div>${groupItems.map(item=>navButton(item)).join('')}</div>`:'';
  }).join('');
}
function roleOptions(){
  return Object.entries(ROLE_CONFIG).map(([key,value])=>`<option value="${key}" ${currentRole===key?'selected':''}>${escapeHtml(value.label)}</option>`).join('');
}
function desktopSidebar(){
  return `<aside class="desktop-sidebar">
    <div class="side-brand"><div class="mini-logo">B</div><div><b>BSS Smart Systems</b><span>Evidencija vremena</span></div><span class="version-chip">v${APP_VERSION}</span></div>
    <div class="side-role"><b>${escapeHtml(currentWorker().name)}</b>${escapeHtml(role().label)}${state.demoMode?' · demo prikaz':''}</div>
    <nav class="desktop-nav" aria-label="Glavna navigacija">${navList(true)}</nav>
    <div class="side-footer"><span class="system-light ${state.terminal.online?'online':'offline'}"></span>${state.terminal.online?'Terminal povezan':'Terminal nije povezan'}<br>${escapeHtml(state.company.name)} · ${APP_STAGE}</div>
  </aside>`;
}
function shell(){
  const [heading,subtitle] = topCopy();
  const roleControl = state.demoMode ? `<div class="role-panel"><label>Demo prikaz aplikacije kao</label><select onchange="switchRole(this.value)">${roleOptions()}</select></div>` : '';
  return `<div class="device">
    <section id="login" class="login ${logged?'hidden':''}">
      <div class="login-inner">
        <div class="brand"><div class="mark">B</div><h1>BSS</h1><small>Smart Systems</small><p>Evidencija radnog vremena, odsutnosti i RFID terminala na jednom mjestu.</p><span class="login-version">Demo ${APP_VERSION} · ${APP_STAGE}</span></div>
        <div class="glass"><div class="form">
          <label>Email ili korisničko ime<input value="admin@bss.hr" autocomplete="username"></label>
          <label>Lozinka<input type="password" value="demodemo" autocomplete="current-password"></label>
          ${state.demoMode?`<label>Demo uloga<select id="loginRole">${roleOptions()}</select></label>`:''}
          <div class="login-row"><span>✓ Demo pristup</span><span>Podaci ostaju u pregledniku</span></div>
          <button class="primary-login" onclick="login()">Uđi u BSS</button>
        </div></div>
        <div class="login-note">Demo podaci: ${activeWorkers().length} radnika · 1 terminal · ${state.shifts.filter(shift=>shift.active).length} aktivne smjene.</div>
      </div>
    </section>
    <div id="app" class="app-shell ${logged?'':'hidden'}">
      ${desktopSidebar()}
      <header class="topbar"><div class="mini-logo">B</div><div class="top-copy"><h2>${escapeHtml(heading)}</h2><p>${escapeHtml(subtitle)}</p></div><div class="topbar-meta"><span>10. srpnja 2026.</span><b><i class="system-light ${state.terminal.online?'online':'offline'}"></i>${state.terminal.online?'Sustav online':'Potrebna provjera'}</b></div><button class="role-badge" onclick="openDrawer()">${escapeHtml(role().short)}</button><button class="menu-btn" aria-label="Otvori izbornik" onclick="openDrawer()">☰</button></header>
      <main class="content" id="content"><div class="content-inner"></div></main>
      ${bottomNavigation()}
      <div class="drawer" id="drawer" onclick="if(event.target.id==='drawer')closeDrawer()"><div class="drawer-panel">
        <div class="modal-head"><div><h2>BSS izbornik</h2><div class="small-muted">${escapeHtml(currentWorker().name)} · ${escapeHtml(role().label)}</div></div><button class="close-btn" aria-label="Zatvori" onclick="closeDrawer()">×</button></div>
        ${roleControl}
        <div class="demo-panel"><div><label>Prodajni demo</label><p>${state.demoMode?'Simulator i promjena uloga su vidljivi.':'Čisti prikaz aplikacije.'}</p></div><button class="switch ${state.demoMode?'on':''}" aria-label="Promijeni demo način" onclick="toggleDemoMode()"><i></i></button></div>
        ${navList(true)}
        ${state.demoMode?'<button class="drawer-item" onclick="resetDemo()"><span>↻</span>Vrati početne demo-podatke</button>':''}
        <button class="drawer-item" onclick="logout()"><span>⇥</span>Odjava</button>
      </div></div>
      <div class="modal" id="modal" onclick="if(event.target.id==='modal')closeModal()"></div>
      <div class="toast" id="toast" role="status" aria-live="polite"></div>
    </div>
  </div>`;
}
function render(){
  if(!allowedScreens().includes(screen)) screen = 'home';
  document.getElementById('root').innerHTML = shell();
  if(!logged) return;
  const views = {
    home:viewHome,attendance:viewAttendance,mytime:viewMyTime,workers:viewWorkers,worker:viewWorker,shifts:viewShifts,
    requests:viewRequests,vacations:viewVacations,corrections:viewCorrections,reports:viewReports,terminal:viewTerminal,
    terminalDemo:viewTerminalDemo,flow:viewFlow,roles:viewRoles,audit:viewAudit,settings:viewSettings
  };
  const target = $('#content .content-inner');
  target.innerHTML = `<div class="screen">${(views[screen] || viewHome)()}</div>`;
}
function login(){
  if(state.demoMode && $('#loginRole')) currentRole = $('#loginRole').value;
  localStorage.setItem(ROLE_KEY,currentRole);
  localStorage.setItem(LOGIN_KEY,'1');
  logged = true;
  calendarMode = currentRole === 'admin' ? 'year' : 'month';
  screen = 'home';
  render();
  toast(`Dobro došli. Aktivni prikaz: ${role().label}.`);
}
function logout(){ logged = false; localStorage.removeItem(LOGIN_KEY); screen = 'home'; render(); }
function openDrawer(){ $('#drawer')?.classList.add('open'); }
function closeDrawer(){ $('#drawer')?.classList.remove('open'); }
function closeModal(){ $('#modal')?.classList.remove('open'); }
function resetDemo(){
  resetState();
  currentRole = 'admin';
  localStorage.setItem(ROLE_KEY,currentRole);
  screen = 'home';
  render();
  toast('Početni demo-podaci su vraćeni.');
}

function viewHome(){
  if(currentRole === 'worker') return viewWorkerHome();
  if(currentRole === 'manager') return viewManagerHome();
  if(currentRole === 'accountant') return viewAccountantHome();
  return viewAdminHome();
}
function openAttendanceStatus(status){
  attendanceFilters={month:'2026-07',department:'Svi',status,search:''};
  navigate('attendance');
}
function openWorkerStatus(tab){ workerListTab=tab;workerSearch='';navigate('workers'); }
function kpiCard(key,icon,value,label,detail,tone='teal',action=''){
  const tag=action?'button':'div';
  const interaction=action?` onclick="${action}" aria-label="${escapeHtml(`${label}: ${value}`)}"`:'';
  return `<${tag} class="kpi-card ${tone}" data-kpi="${key}"${interaction}><span class="kpi-icon">${icon}</span><span class="kpi-value">${escapeHtml(value)}</span><b>${escapeHtml(label)}</b><small>${escapeHtml(detail)}</small></${tag}>`;
}
function weeklyChart(data,totalWorkers){
  return `<div class="weekly-chart" aria-label="Prijave i odjave kroz radni tjedan">${data.map(day=>{
    const inHeight=Math.max(5,Math.round(day.checkins/Math.max(1,totalWorkers)*100));
    const outHeight=Math.max(3,Math.round(day.checkouts/Math.max(1,totalWorkers)*100));
    return `<div class="chart-day"><div class="chart-values"><span>${day.checkins}</span><span>${day.checkouts}</span></div><div class="chart-bars"><i class="checkin" style="height:${inHeight}%"></i><i class="checkout" style="height:${outHeight}%"></i></div><b>${escapeHtml(day.label)}</b></div>`;
  }).join('')}</div><div class="chart-legend"><span><i class="checkin"></i>Prijave</span><span><i class="checkout"></i>Odjave</span></div>`;
}
function attendanceEvent(event,type){
  return `<div class="activity-item"><div class="activity-symbol ${type}">${type==='in'?'→':'←'}</div><div><b>${escapeHtml(event.worker?.name||'Nepoznat radnik')}</b><span>${escapeHtml(event.worker?.dept||'—')} · ${escapeHtml(isoLabel(event.date,false))}</span></div><time>${escapeHtml(event.time)}</time></div>`;
}
function viewAdminHome(){
  const workers = activeWorkers();
  const metrics=dashboardMetrics(workers),workerIds=workers.map(worker=>worker.id),weekly=weeklyAttendance(workerIds),alerts=dashboardAlerts(metrics);
  const checkins=recentAttendanceEvents('in',workerIds),checkouts=recentAttendanceEvents('out',workerIds);
  const demoQuick=state.demoMode?`<button onclick="navigate('terminalDemo')"><b>RFID simulator</b><span>Isprobaj očitanje bez promjene evidencije</span></button>`:`<button onclick="navigate('terminal')"><b>Status terminala</b><span>Provjeri mrežu i lokalni red uređaja</span></button>`;
  return `${title('Operativni dashboard','Petak, 10. srpnja 2026. · pregled firme u stvarnom vremenu.',`${pill(`Demo ${APP_VERSION} · ${APP_STAGE}`)} ${pill(state.terminal.online?'Online':'Offline')}`)}
    <section class="card hero dashboard-hero"><div><div class="eyebrow">Dnevni sažetak</div><h2>${metrics.present} od ${metrics.active} radnika trenutačno je evidentirano</h2><p>Podaci su povezani s istim demo-zapisima koji se koriste u evidenciji i izvještajima.</p></div><div class="hero-totals"><div><span>Evidentirano u srpnju</span><b>${formatMinutes(metrics.monthMinutes)}</b></div><div><span>Čeka početak smjene</span><b>${metrics.waiting}</b></div><div><span>Terminal</span><b>${state.terminal.online?'Sinkroniziran':'Offline'}</b></div></div></section>
    <section class="dashboard-kpis" aria-label="Ključni pokazatelji">
      ${kpiCard('present','✓',metrics.present,'Prisutni','Uključuje evidentirano kašnjenje','green',"openWorkerStatus('Prisutni')")}
      ${kpiCard('late','◷',metrics.late,'Kasne danas','Iznad tolerancije smjene','amber',"openAttendanceStatus('Kašnjenje')")}
      ${kpiCard('absent','—',metrics.absent,'Odsutni','Bez aktivne prijave ili odsutnosti','red')}
      ${kpiCard('vacation','☀',metrics.vacation,'Na godišnjem','Odobrena današnja odsutnost','blue',"openWorkerStatus('Godišnji')")}
      ${kpiCard('sick','+',metrics.sick,'Na bolovanju','Evidentirano bolovanje','purple')}
      ${kpiCard('pending','□',metrics.pending,'Otvorene odluke','Godišnji i korekcije','amber',"navigate('requests')")}
      ${kpiCard('overtime','↗',formatMinutes(metrics.overtime),'Prekovremeno','Iznad plana smjene u srpnju','teal',"navigate('reports')")}
      ${kpiCard('review','!',metrics.review,'Za provjeru','Kašnjenja i nepotpuni zapisi','red',"navigate('attendance')")}
    </section>
    <div class="dashboard-layout"><div class="dashboard-primary">
      <section class="card"><div class="card-heading"><div><h2>Prijave kroz tjedan</h2><p>Broj evidentiranih dolazaka i odlazaka po radnom danu.</p></div><button class="link-btn" onclick="navigate('attendance')">Otvori evidenciju →</button></div>${weeklyChart(weekly,metrics.active)}</section>
      <section class="card"><div class="card-heading"><div><h2>Zadnje prijave i odjave</h2><p>Najnoviji događaji iz evidencije radnog vremena.</p></div></div><div class="activity-columns"><div><h3>Prijave</h3>${checkins.map(event=>attendanceEvent(event,'in')).join('')}</div><div><h3>Odjave</h3>${checkouts.map(event=>attendanceEvent(event,'out')).join('')}</div></div></section>
      <section class="card"><div class="card-heading"><div><h2>Brze akcije</h2><p>Najčešći administrativni poslovi bez traženja po izborniku.</p></div></div><div class="quick"><button onclick="navigate('attendance')"><b>Pregledaj evidenciju</b><span>Dolasci, odlasci i nepravilnosti</span></button><button onclick="downloadReport('csv')"><b>Preuzmi CSV</b><span>Mjesečni podaci za obračun</span></button><button onclick="openWorkerModal()"><b>Dodaj radnika</b><span>Profil, smjena i RFID kartica</span></button>${demoQuick}</div></section>
    </div><aside class="dashboard-secondary">
      <section class="card"><div class="card-heading"><div><h2>Upozorenja i odluke</h2><p>Stavke koje traže pažnju administratora.</p></div><span class="alert-total">${alerts.length}</span></div><div class="alert-list">${alerts.map(alert=>`<button class="alert-item ${alert.tone}" onclick="navigate('${alert.target}')"><span>${alert.icon}</span><div><b>${escapeHtml(alert.title)}</b><small>${escapeHtml(alert.text)}</small></div><i>›</i></button>`).join('')||'<div class="empty-state compact">Nema otvorenih upozorenja.</div>'}</div></section>
      <section class="card system-card"><div class="card-heading"><div><h2>Status sustava</h2><p>Terminal i demo-okruženje.</p></div>${pill(state.terminal.online?'Online':'Offline')}</div><div class="system-row"><span><i class="system-light ${state.terminal.online?'online':'offline'}"></i>BSS Terminal 01</span><b>${state.terminal.online?'Povezan':'Nije povezan'}</b></div><div class="system-row"><span>Zadnja sinkronizacija</span><b>${escapeHtml(state.terminal.lastSync)}</b></div><div class="system-row"><span>Neposlani zapisi</span><b>${state.terminal.unsynced}</b></div><div class="system-row"><span>Aktivne smjene</span><b>${state.shifts.filter(shift=>shift.active).length}</b></div><button class="btn secondary block" onclick="navigate('terminal')">Detalji terminala</button></section>
      <section class="card"><div class="card-heading"><div><h2>Zadnje administrativne aktivnosti</h2><p>Audit trag važnih promjena.</p></div></div>${state.audit.slice(0,3).map(item=>row(initials(item.user),item.action,`${escapeHtml(item.time)} · ${escapeHtml(item.module)}`)).join('')}<button class="btn secondary block" onclick="navigate('audit')">Cijeli audit log</button></section>
    </aside></div>`;
}
function viewWorkerHome(){
  const worker = currentWorker();
  const shift = shiftById(worker.shiftId);
  const ownRequests = state.requests.filter(request=>request.workerId===worker.id);
  const todayRecord = state.records.find(record=>record.workerId===worker.id && record.date===DEMO_TODAY);
  return `${title(`Pozdrav, ${worker.name.split(' ')[0]}`,'Ovdje su isključivo tvoji podaci.',pill(worker.status))}
    <div class="card hero"><h2 style="font-size:23px">${['Prisutan','Kasni'].includes(worker.status)?'Trenutačno si prijavljen':'Trenutačno nisi prijavljen'}</h2><p>${escapeHtml(shift?.name || 'Bez smjene')} · ${escapeHtml(shift?.start || '—')} – ${escapeHtml(shift?.end || '—')}</p><div class="meta-line"><span>Današnja prijava</span><b>${escapeHtml(todayRecord?.start || '—')}</b></div><div class="meta-line"><span>Dosad evidentirano</span><b>${formatMinutes(todayRecord?recordMinutes(todayRecord,true):0)}</b></div></div>
    <div class="stats-grid"><div class="stat"><div class="num">${formatMinutes(workerMonthMinutes(worker.id))}</div><div class="lab">Završeni sati u srpnju</div></div><div class="stat"><div class="num">${vacationRemaining(worker.id)}</div><div class="lab">Preostali dani godišnjeg</div></div><div class="stat"><div class="num">${ownRequests.filter(request=>request.status==='Odobreno').length}</div><div class="lab">Odobreni zahtjevi</div></div><div class="stat"><div class="num">${ownRequests.filter(request=>request.status==='Na čekanju').length}</div><div class="lab">Na čekanju</div></div></div>
    <div class="card"><h2>Brze akcije</h2><div class="quick"><button onclick="navigate('mytime')"><b>Moji sati</b><span>Dolasci, odlasci i ukupno vrijeme</span></button><button onclick="navigate('vacations')"><b>Moj godišnji</b><span>Osobni kalendar i raspoloživi dani</span></button><button onclick="navigate('requests')"><b>Novi zahtjev</b><span>Godišnji odmor ili slobodan dan</span></button><button onclick="navigate('corrections')"><b>Korekcija</b><span>Zatraži ispravak pogrešnog zapisa</span></button></div></div>
    ${recordTable(state.records.filter(record=>record.workerId===worker.id),'Moji zadnji zapisi')}`;
}
function viewManagerHome(){
  const team = visibleWorkers().filter(worker=>worker.active);
  const requestCount = state.requests.filter(request=>requestVisible(request)&&request.status==='Na čekanju').length;
  const correctionCount = state.corrections.filter(correction=>correctionVisible(correction)&&correction.status==='Na čekanju').length;
  const metrics=dashboardMetrics(team),weekly=weeklyAttendance(team.map(worker=>worker.id)),alerts=dashboardAlerts(metrics);
  return `${title('Dashboard mojeg tima',`Odjeli: ${role().departments.join(' i ')} · 10. srpnja 2026.`,pill(`${team.length} radnika`))}
    <section class="dashboard-kpis manager-kpis">
      ${kpiCard('present','✓',metrics.present,'Prisutni','Trenutno evidentirani','green',"openWorkerStatus('Prisutni')")}
      ${kpiCard('late','◷',metrics.late,'Kasne danas','Iznad tolerancije','amber',"openAttendanceStatus('Kašnjenje')")}
      ${kpiCard('vacation','☀',metrics.vacation,'Na godišnjem','Danas odsutni','blue',"openWorkerStatus('Godišnji')")}
      ${kpiCard('sick','+',metrics.sick,'Na bolovanju','Evidentirano bolovanje','purple')}
      ${kpiCard('pending','□',requestCount+correctionCount,'Čeka odluku','Zahtjevi i korekcije','amber')}
      ${kpiCard('review','!',metrics.review,'Za provjeru','Zapisi mojeg tima','red',"navigate('attendance')")}
    </section>
    <div class="dashboard-layout"><div class="dashboard-primary"><section class="card"><div class="card-heading"><div><h2>Prijave mojeg tima</h2><p>Dolazak i odlazak po radnom danu.</p></div><button class="link-btn" onclick="navigate('attendance')">Evidencija tima →</button></div>${weeklyChart(weekly,Math.max(1,team.length))}</section><section class="card"><div class="card-heading"><div><h2>Radnici mojeg tima</h2><p>Status, odjel i dodijeljena smjena.</p></div></div>${team.map(worker=>row(initials(worker.name),worker.name,`${escapeHtml(worker.dept)} · ${escapeHtml(shiftById(worker.shiftId)?.name || 'Bez smjene')}`,pill(worker.status),`openWorker(${worker.id})`)).join('')}</section></div><aside class="dashboard-secondary"><section class="card"><div class="card-heading"><div><h2>Upozorenja i odluke</h2><p>Samo stavke iz dodijeljenih odjela.</p></div><span class="alert-total">${alerts.length}</span></div><div class="alert-list">${alerts.map(alert=>`<button class="alert-item ${alert.tone}" onclick="navigate('${alert.target}')"><span>${alert.icon}</span><div><b>${escapeHtml(alert.title)}</b><small>${escapeHtml(alert.text)}</small></div><i>›</i></button>`).join('')||'<div class="empty-state compact">Nema otvorenih upozorenja.</div>'}</div></section><section class="card"><h2>Brze akcije</h2><div class="quick"><button onclick="navigate('vacations')"><b>Kalendar tima</b><span>Planiraj odsutnosti odjela</span></button><button onclick="navigate('requests')"><b>Odobri zahtjeve</b><span>${requestCount} zahtjeva čeka odluku</span></button><button onclick="navigate('corrections')"><b>Korekcije</b><span>${correctionCount} korekcija čeka odluku</span></button><button onclick="navigate('reports')"><b>Izvještaj tima</b><span>Filtrirani podaci odjela</span></button></div></section></aside></div>`;
}
function viewAccountantHome(){
  const minutes = state.records.filter(record=>record.date.startsWith('2026-07')).reduce((sum,record)=>sum+recordMinutes(record),0);
  return `${title('Pregled za knjigovodstvo','Izvještaji i odobrene odsutnosti bez prava izmjene.',pill('Samo čitanje'))}<div class="card hero"><h2 style="font-size:23px">Obračunski podaci</h2><p>CSV i XLSX koriste iste filtre i iste podatke prikazane u pregledu.</p><div class="meta-line"><span>Završeni sati u demo-skupu</span><b>${formatMinutes(minutes)}</b></div><div class="meta-line"><span>Posljednji export</span><b>${escapeHtml(state.lastReport)}</b></div></div><div class="card"><h2>Brze akcije</h2><div class="quick"><button onclick="navigate('reports')"><b>Izvještaji</b><span>Filtrirani CSV i XLSX za obračun</span></button><button onclick="navigate('vacations')"><b>Odobrene odsutnosti</b><span>Kalendar bez zahtjeva koji čekaju odluku</span></button></div></div>`;
}

function statusOptions(selected){
  return ['Svi','Uredno','Aktivno','Kašnjenje','Nepotpun zapis'].map(value=>`<option ${selected===value?'selected':''}>${escapeHtml(value)}</option>`).join('');
}
function departmentOptions(selected, includeAll = true){
  const departments=currentRole==='manager'?[...new Set(visibleWorkers().map(worker=>worker.dept))].sort((a,b)=>a.localeCompare(b,'hr')):departmentList();
  return `${includeAll?`<option value="Svi" ${selected==='Svi'?'selected':''}>Svi odjeli</option>`:''}${departments.map(value=>`<option value="${escapeHtml(value)}" ${selected===value?'selected':''}>${escapeHtml(value)}</option>`).join('')}`;
}
function filteredAttendanceRecords(){
  return state.records.filter(recordVisible).filter(record=>{
    const worker = workerById(record.workerId);
    const search = attendanceFilters.search.toLocaleLowerCase('hr');
    return record.date.startsWith(attendanceFilters.month)
      && (attendanceFilters.department==='Svi' || worker?.dept===attendanceFilters.department)
      && (attendanceFilters.status==='Svi' || record.status===attendanceFilters.status)
      && (!search || worker?.name.toLocaleLowerCase('hr').includes(search));
  }).sort((a,b)=>b.date.localeCompare(a.date)||a.workerId-b.workerId);
}
function applyAttendanceFilters(){
  attendanceFilters = {month:$('#attMonth').value,department:$('#attDept').value,status:$('#attStatus').value,search:$('#attSearch').value.trim()};
  render();
}
function clearAttendanceFilters(){ attendanceFilters={month:'2026-07',department:'Svi',status:'Svi',search:''}; render(); }
function viewAttendance(){
  const records = filteredAttendanceRecords();
  const minutes = records.reduce((sum,record)=>sum+recordMinutes(record),0);
  return `${title(currentRole==='manager'?'Evidencija mojeg tima':'Evidencija dolazaka','Stvarni operativni zapisi; RFID simulator je zaseban demo-alat.',pill(`${records.length} zapisa`))}
    <div class="card"><div class="filter-bar"><input id="attSearch" aria-label="Traži radnika" placeholder="Ime radnika" value="${escapeHtml(attendanceFilters.search)}"><input id="attMonth" aria-label="Mjesec" type="month" value="${attendanceFilters.month}"><select id="attDept" aria-label="Odjel">${departmentOptions(attendanceFilters.department)}</select><select id="attStatus" aria-label="Status">${statusOptions(attendanceFilters.status)}</select><div class="filter-actions"><button class="btn" onclick="applyAttendanceFilters()">Primijeni</button><button class="btn secondary" onclick="clearAttendanceFilters()">Očisti</button></div></div></div>
    ${recordTable(records,'Rezultati evidencije',true)}
    <div class="stats-grid"><div class="stat"><div class="num">${formatMinutes(minutes)}</div><div class="lab">Završeni sati u rezultatu</div></div><div class="stat"><div class="num">${records.filter(record=>record.status==='Kašnjenje').length}</div><div class="lab">Kašnjenja</div></div><div class="stat"><div class="num">${records.filter(record=>record.status==='Nepotpun zapis').length}</div><div class="lab">Nepotpuni zapisi</div></div><div class="stat"><div class="num">${new Set(records.map(record=>record.workerId)).size}</div><div class="lab">Radnici u rezultatu</div></div></div>`;
}
function recordTable(records,heading = 'Evidencija',showDepartment = false){
  const body = records.map(record=>{
    const worker = workerById(record.workerId);
    return `<tr><td><b>${escapeHtml(worker?.name || 'Nepoznat radnik')}</b>${showDepartment?`<br><span class="small-muted">${escapeHtml(worker?.dept || '—')}</span>`:''}</td><td>${escapeHtml(isoLabel(record.date))}</td><td>${escapeHtml(record.start || '—')}</td><td>${escapeHtml(record.end || '—')}</td><td>${record.breakMinutes?`${record.breakMinutes} min`:'—'}</td><td>${record.end?formatMinutes(recordMinutes(record)):'—'}</td><td>${pill(record.status)}</td></tr>`;
  }).join('');
  return `<div class="card table-card"><div style="padding:15px 15px 8px"><h2>${escapeHtml(heading)}</h2></div><div class="table-wrap"><table><thead><tr><th>Radnik</th><th>Datum</th><th>Dolazak</th><th>Odlazak</th><th>Pauza</th><th>Ukupno</th><th>Status</th></tr></thead><tbody>${body||'<tr><td colspan="7"><div class="empty-state">Nema zapisa za odabrane kriterije.</div></td></tr>'}</tbody></table></div><div class="table-summary"><span>${records.length} zapisa</span><span>Zbroj završenih sati: ${formatMinutes(records.reduce((sum,record)=>sum+recordMinutes(record),0))}</span></div></div>`;
}
function viewMyTime(){
  const worker = currentWorker();
  const records = state.records.filter(record=>record.workerId===worker.id && record.date.startsWith('2026-07')).sort((a,b)=>b.date.localeCompare(a.date));
  const exceptions = records.filter(record=>!['Uredno','Aktivno'].includes(record.status)).length;
  return `${title('Moja evidencija',`Radno vrijeme za ${worker.name}.`,pill('Srpanj 2026.'))}<div class="stats-grid"><div class="stat"><div class="num">${formatMinutes(workerMonthMinutes(worker.id))}</div><div class="lab">Završeni sati</div></div><div class="stat"><div class="num">${records.length}</div><div class="lab">Zapisi u mjesecu</div></div><div class="stat"><div class="num">${exceptions}</div><div class="lab">Zapisi za provjeru</div></div><div class="stat"><div class="num">${vacationRemaining(worker.id)}</div><div class="lab">Preostali godišnji</div></div></div>${recordTable(records,'Moji zapisi')}
    <div class="card"><h2>Zatraži korekciju</h2><p class="small-muted">Odaberi datum i upiši ispravno vrijeme. Postojeći zapis neće se promijeniti dok voditelj ili administrator ne odobre zahtjev.</p><div class="form form-grid cols-3"><label>Datum<input id="corrDate" type="date" value="2026-07-10" onchange="updateCorrectionPreview()"></label><label>Ispravan dolazak<input id="corrStart" type="time" value="07:42"></label><label>Ispravan odlazak<input id="corrEnd" type="time" value="16:02"></label><label style="grid-column:1/-1">Razlog<textarea id="corrReason" rows="3" placeholder="Opiši što treba ispraviti"></textarea></label></div><div id="corrPreview" class="muted-box" style="margin-top:11px">${correctionPreviewText('2026-07-10',worker.id)}</div><div class="btns"><button class="btn" onclick="submitCorrection()">Pošalji zahtjev</button></div></div>`;
}
function correctionPreviewText(date,workerId){
  const record = state.records.find(item=>item.workerId===Number(workerId)&&item.date===date);
  return record ? `Postojeći zapis: ${record.start||'—'} – ${record.end||'—'} · ${record.status}` : 'Za taj datum nema postojećeg zapisa. Korekcija će biti označena za ručnu provjeru.';
}
function updateCorrectionPreview(){ const element=$('#corrPreview'); if(element) element.textContent=correctionPreviewText($('#corrDate').value,currentWorker().id); }

function setWorkerTab(tab){ workerListTab=tab; render(); }
function applyWorkerSearch(){ workerSearch=$('#workerSearch').value.trim(); render(); }
function filteredWorkers(){
  const search = workerSearch.toLocaleLowerCase('hr');
  return visibleWorkers().filter(worker=>{
    const tabMatch = workerListTab==='Svi' ? worker.active : workerListTab==='Prisutni' ? worker.active&&['Prisutan','Kasni'].includes(worker.status) : workerListTab==='Godišnji' ? worker.active&&worker.status==='Godišnji' : !worker.active;
    const searchMatch = !search || `${worker.name} ${worker.email} ${worker.dept} ${worker.jobTitle}`.toLocaleLowerCase('hr').includes(search);
    return tabMatch && searchMatch;
  });
}
function viewWorkers(){
  const workers = filteredWorkers();
  const isAdmin = currentRole==='admin';
  const tabs = isAdmin ? ['Svi','Prisutni','Godišnji','Neaktivni'] : ['Svi','Prisutni','Godišnji'];
  return `${title(isAdmin?'Radnici':'Moj tim',isAdmin?'Upravljanje zaposlenicima, smjenama i RFID karticama.':'Prikaz je ograničen na odjele voditelja.',isAdmin?'<button class="btn" onclick="openWorkerModal()">Dodaj radnika</button>':'')}
    <div class="card"><div class="filter-bar" style="grid-template-columns:minmax(0,1fr) auto"><input id="workerSearch" placeholder="Traži po imenu, odjelu ili radnom mjestu" value="${escapeHtml(workerSearch)}"><button class="btn" onclick="applyWorkerSearch()">Traži</button></div><div class="tabs">${tabs.map(tab=>`<button class="tab ${workerListTab===tab?'active':''}" onclick="setWorkerTab('${tab}')">${tab}</button>`).join('')}</div></div>
    <div class="card">${workers.map(worker=>{
      const shift = shiftById(worker.shiftId);
      const subtitle = `${escapeHtml(worker.dept)} · ${escapeHtml(worker.jobTitle)} · ${escapeHtml(shift?.name||'Bez smjene')}${isAdmin?`<br>RFID: ${escapeHtml(worker.card||'Nije dodijeljena')} · ${escapeHtml(worker.cardStatus)}`:''}`;
      return row(initials(worker.name),worker.name,subtitle,pill(worker.active?worker.status:'Neaktivan'),`openWorker(${worker.id})`);
    }).join('')||'<div class="empty-state">Nema radnika za odabrani filtar.</div>'}</div>`;
}
function openWorker(id){
  if(!workerVisible(id) && currentRole!=='admin') return;
  activeWorkerId=Number(id);
  workerTab='Profil';
  navigate('worker');
}
function setWorkerDetailTab(tab){ workerTab=tab; render(); }
function viewWorker(){
  const worker=workerById(activeWorkerId);
  if(!worker || (!workerVisible(worker.id)&&currentRole!=='admin')) return `<div class="notice">Radnik nije dostupan u tvojem opsegu prava.</div>`;
  const isAdmin=currentRole==='admin';
  const shift=shiftById(worker.shiftId);
  const actions=isAdmin?`<button class="btn secondary" onclick="openWorkerModal(${worker.id})">Uredi</button><button class="btn ${worker.active?'red':'green'}" onclick="toggleWorkerActive(${worker.id})">${worker.active?'Deaktiviraj':'Aktiviraj'}</button>`:'';
  let content='';
  if(workerTab==='Profil') content=`<div class="card"><div class="summary-line"><span>Ime i prezime</span><b>${escapeHtml(worker.name)}</b></div><div class="summary-line"><span>Email</span><b>${escapeHtml(worker.email)}</b></div><div class="summary-line"><span>Odjel</span><b>${escapeHtml(worker.dept)}</b></div><div class="summary-line"><span>Radno mjesto</span><b>${escapeHtml(worker.jobTitle)}</b></div><div class="summary-line"><span>Smjena</span><b>${escapeHtml(shift?.name||'Nije dodijeljena')} · ${escapeHtml(shift?`${shift.start} – ${shift.end}`:'—')}</b></div><div class="summary-line"><span>Status zaposlenja</span><b>${pill(worker.active?'Aktivan':'Neaktivan')}</b></div></div>`;
  if(workerTab==='Evidencija') content=recordTable(state.records.filter(record=>record.workerId===worker.id).sort((a,b)=>b.date.localeCompare(a.date)),`Evidencija: ${worker.name}`);
  if(workerTab==='RFID kartica') content=`<div class="card"><div class="summary-line"><span>RFID UID</span><b>${escapeHtml(worker.card||'Nije dodijeljena')}</b></div><div class="summary-line"><span>Status kartice</span><b>${pill(worker.cardStatus)}</b></div><div class="summary-line"><span>Zadnja današnja prijava</span><b>${escapeHtml(worker.todayStart||'—')}</b></div>${isAdmin?`<div class="btns"><button class="btn ${worker.cardStatus==='Aktivna'?'red':'green'}" onclick="toggleCard(${worker.id})">${worker.cardStatus==='Aktivna'?'Blokiraj karticu':'Aktiviraj karticu'}</button><button class="btn secondary" onclick="openWorkerModal(${worker.id})">Promijeni UID</button></div>`:''}</div>`;
  return `${title(worker.name,`${escapeHtml(worker.dept)} · ${escapeHtml(worker.jobTitle)}`,pill(worker.active?worker.status:'Neaktivan'))}<div class="tabs">${['Profil','Evidencija','RFID kartica'].map(tab=>`<button class="tab ${workerTab===tab?'active':''}" onclick="setWorkerDetailTab('${tab}')">${tab}</button>`).join('')}</div>${content}<div class="btns">${actions}<button class="btn secondary" onclick="navigate('workers')">Natrag na radnike</button></div>`;
}
function shiftSelectOptions(selected){
  return state.shifts.filter(shift=>shift.active||shift.id===Number(selected)).map(shift=>`<option value="${shift.id}" ${shift.id===Number(selected)?'selected':''}>${escapeHtml(shift.name)} · ${escapeHtml(shift.start)}–${escapeHtml(shift.end)}${shift.active?'':' (neaktivna)'}</option>`).join('');
}
function openWorkerModal(id = null){
  if(currentRole!=='admin') return;
  const existing=id?workerById(id):null;
  const worker=existing||{name:'',email:'',dept:'Proizvodnja',jobTitle:'Operater',shiftId:1,card:'',cardStatus:'Aktivna',vacationAllowance:24};
  const modal=$('#modal');
  modal.innerHTML=`<div class="modal-card"><div class="modal-head"><div><h2>${existing?'Uredi radnika':'Dodaj radnika'}</h2><div class="small-muted">RFID UID i email moraju biti jedinstveni.</div></div><button class="close-btn" aria-label="Zatvori" onclick="closeModal()">×</button></div><div class="form form-grid">
    <label>Ime i prezime<input id="workerName" value="${escapeHtml(worker.name)}" autocomplete="off"></label><label>Email<input id="workerEmail" type="email" value="${escapeHtml(worker.email)}"></label>
    <label>Odjel<input id="workerDept" list="departments" value="${escapeHtml(worker.dept)}"><datalist id="departments">${departmentList().map(dept=>`<option value="${escapeHtml(dept)}">`).join('')}</datalist></label><label>Radno mjesto<input id="workerJob" value="${escapeHtml(worker.jobTitle)}"></label>
    <label>Smjena<select id="workerShift">${shiftSelectOptions(worker.shiftId)}</select></label><label>Godišnji fond (radni dani)<input id="workerAllowance" type="number" min="0" max="40" value="${Number(worker.vacationAllowance||0)}"></label>
    <label>RFID UID<input id="workerCard" value="${escapeHtml(worker.card)}" placeholder="04 12 AB CD"></label><label>Status kartice<select id="workerCardStatus"><option ${worker.cardStatus==='Aktivna'?'selected':''}>Aktivna</option><option ${worker.cardStatus==='Blokirana'?'selected':''}>Blokirana</option></select></label>
    </div><div class="btns"><button class="btn" onclick="saveWorker(${existing?worker.id:'null'})">${existing?'Spremi izmjene':'Dodaj radnika'}</button><button class="btn secondary" onclick="closeModal()">Odustani</button></div></div>`;
  modal.classList.add('open');
}
function normalizeCard(value){ return String(value||'').trim().toUpperCase().replace(/\s+/g,' '); }
function saveWorker(id){
  if(currentRole!=='admin') return;
  const name=$('#workerName').value.trim(),email=$('#workerEmail').value.trim().toLowerCase(),dept=$('#workerDept').value.trim(),jobTitle=$('#workerJob').value.trim(),card=normalizeCard($('#workerCard').value);
  const shiftId=Number($('#workerShift').value),vacationAllowance=Number($('#workerAllowance').value),cardStatus=$('#workerCardStatus').value;
  if(!name||!email||!dept||!jobTitle){toast('Popuni ime, email, odjel i radno mjesto.');return;}
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){toast('Unesi ispravnu email adresu.');return;}
  if(!card){toast('Unesi RFID UID ili jasno ukloni dodjelu kroz uređivanje.');return;}
  if(state.workers.some(worker=>worker.id!==Number(id)&&normalizeCard(worker.card)===card)){toast('RFID kartica je već dodijeljena drugom radniku.');return;}
  if(state.workers.some(worker=>worker.id!==Number(id)&&worker.email.toLowerCase()===email)){toast('Email je već dodijeljen drugom radniku.');return;}
  if(!Number.isFinite(vacationAllowance)||vacationAllowance<0||vacationAllowance>40){toast('Fond godišnjeg mora biti između 0 i 40 dana.');return;}
  const data={name,email,dept,jobTitle,shiftId,card,cardStatus,vacationAllowance};
  if(id){
    const worker=workerById(id); if(!worker) return;
    Object.assign(worker,data);
    audit('Administrator',`Ažuriran profil radnika ${name}.`,'Radnici');
  }else{
    const worker={id:Date.now(),...data,status:'Odsutna',todayStart:'',active:true};
    state.workers.push(worker); activeWorkerId=worker.id;
    audit('Administrator',`Dodan radnik ${name} i dodijeljena RFID kartica.`,'Radnici');
  }
  closeModal(); saveState(); screen='workers'; render(); toast(id?'Profil radnika je spremljen.':'Radnik je dodan.');
}
function toggleWorkerActive(id){
  if(currentRole!=='admin') return;
  const worker=workerById(id); if(!worker) return;
  worker.active=!worker.active;
  if(!worker.active){worker.status='Odsutna';worker.cardStatus='Blokirana';worker.todayStart='';}
  audit('Administrator',`${worker.active?'Aktiviran':'Deaktiviran'} radnik ${worker.name}.`,'Radnici');
  saveAndRender(worker.active?'Radnik je ponovno aktivan.':'Radnik i njegova kartica su deaktivirani.');
}
function toggleCard(id){
  if(currentRole!=='admin') return;
  const worker=workerById(id); if(!worker) return;
  worker.cardStatus=worker.cardStatus==='Aktivna'?'Blokirana':'Aktivna';
  audit('Administrator',`${worker.cardStatus==='Aktivna'?'Aktivirana':'Blokirana'} RFID kartica za ${worker.name}.`,'Radnici');
  saveAndRender(`Kartica je ${worker.cardStatus.toLowerCase()}.`);
}

function viewShifts(){
  const isAdmin=currentRole==='admin';
  return `${title('Smjene i pravila',isAdmin?'Dodavanje i uređivanje smjena te broj dodijeljenih radnika.':'Smjene su dostupne samo za čitanje.',isAdmin?'<button class="btn" onclick="openShiftModal()">Dodaj smjenu</button>':'')}
    <div class="stats-grid">${state.shifts.map(shift=>`<div class="stat"><div class="num" style="font-size:19px">${escapeHtml(shift.name)}</div><div class="lab">${escapeHtml(shift.start)} – ${escapeHtml(shift.end)}</div><div class="trend">${state.workers.filter(worker=>worker.active&&worker.shiftId===shift.id).length} dodijeljenih radnika</div></div>`).join('')}</div>
    <div class="card">${state.shifts.map(shift=>{
      const info=`${escapeHtml(shift.start)} – ${escapeHtml(shift.end)} · pauza ${shift.breakMinutes} min · tolerancija ${shift.tolerance} min · ${state.workers.filter(worker=>worker.active&&worker.shiftId===shift.id).length} radnika`;
      const controls=isAdmin?`<button class="btn secondary small" onclick="openShiftModal(${shift.id})">Uredi</button><button class="btn ${shift.active?'red':'green'} small" onclick="toggleShift(${shift.id})">${shift.active?'Deaktiviraj':'Aktiviraj'}</button>`:pill(shift.active?'Aktivna':'Neaktivan');
      return row('S',shift.name,info,controls);
    }).join('')}</div><div class="notice info">Smjena određuje planirano vrijeme, pauzu i toleranciju. Obračun dodataka za noćni i prekovremeni rad nije dio ovog statičnog demo-prikaza.</div>`;
}
function openShiftModal(id=null){
  if(currentRole!=='admin') return;
  const existing=id?shiftById(id):null;
  const shift=existing||{name:'',start:'08:00',end:'16:00',breakMinutes:30,tolerance:5};
  const modal=$('#modal');
  modal.innerHTML=`<div class="modal-card"><div class="modal-head"><h2>${existing?'Uredi smjenu':'Dodaj smjenu'}</h2><button class="close-btn" onclick="closeModal()">×</button></div><div class="form form-grid"><label>Naziv<input id="shiftName" value="${escapeHtml(shift.name)}"></label><label>Početak<input id="shiftStart" type="time" value="${escapeHtml(shift.start)}"></label><label>Završetak<input id="shiftEnd" type="time" value="${escapeHtml(shift.end)}"></label><label>Pauza (min)<input id="shiftBreak" type="number" min="0" max="180" value="${shift.breakMinutes}"></label><label>Tolerancija kašnjenja (min)<input id="shiftTolerance" type="number" min="0" max="60" value="${shift.tolerance}"></label></div><div class="btns"><button class="btn" onclick="saveShift(${existing?shift.id:'null'})">Spremi</button><button class="btn secondary" onclick="closeModal()">Odustani</button></div></div>`;
  modal.classList.add('open');
}
function saveShift(id){
  if(currentRole!=='admin') return;
  const name=$('#shiftName').value.trim(),start=$('#shiftStart').value,end=$('#shiftEnd').value,breakMinutes=Number($('#shiftBreak').value),tolerance=Number($('#shiftTolerance').value);
  if(!name||!start||!end){toast('Popuni naziv, početak i završetak smjene.');return;}
  if(state.shifts.some(shift=>shift.id!==Number(id)&&shift.name.toLocaleLowerCase('hr')===name.toLocaleLowerCase('hr'))){toast('Smjena s tim nazivom već postoji.');return;}
  if(!Number.isFinite(breakMinutes)||breakMinutes<0||breakMinutes>180||!Number.isFinite(tolerance)||tolerance<0||tolerance>60){toast('Provjeri pauzu i toleranciju.');return;}
  if(id){Object.assign(shiftById(id),{name,start,end,breakMinutes,tolerance});audit('Administrator',`Ažurirana smjena ${name}.`,'Smjene');}
  else{state.shifts.push({id:Date.now(),name,start,end,breakMinutes,tolerance,active:true});audit('Administrator',`Dodana smjena ${name}.`,'Smjene');}
  closeModal();saveAndRender('Smjena je spremljena.');
}
function toggleShift(id){
  if(currentRole!=='admin') return;
  const shift=shiftById(id);if(!shift)return;
  shift.active=!shift.active;audit('Administrator',`${shift.active?'Aktivirana':'Deaktivirana'} smjena ${shift.name}.`,'Smjene');saveAndRender(`Smjena je ${shift.active?'aktivna':'neaktivna'}.`);
}

function intervalsOverlap(startA,endA,startB,endB){ return startA<=endB && startB<=endA; }
function teamConflicts(request){
  const worker=workerById(request.workerId);
  if(!worker)return[];
  return state.requests.filter(other=>other.id!==request.id&&other.workerId!==request.workerId&&other.status!=='Odbijeno'&&intervalsOverlap(request.start,request.end,other.start,other.end)&&workerById(other.workerId)?.dept===worker.dept);
}
function committedVacationDays(workerId,year=2026){
  return state.requests.filter(request=>request.workerId===Number(workerId)&&request.type==='Godišnji odmor'&&request.status!=='Odbijeno'&&request.start.startsWith(String(year))).reduce((sum,request)=>sum+businessDays(request.start,request.end),0);
}
function requestCard(request,isApprover){
  const worker=workerById(request.workerId);
  const days=businessDays(request.start,request.end);
  const conflicts=teamConflicts(request);
  const controls=isApprover&&request.status==='Na čekanju'?`<div class="btns"><button class="btn green small" onclick="updateRequest(${request.id},'Odobreno')">Odobri</button><button class="btn red small" onclick="updateRequest(${request.id},'Odbijeno')">Odbij</button></div>`:'';
  const conflictLabel=conflicts.length?`<br><span style="color:var(--amber);font-weight:800">Preklapanje u odjelu: ${conflicts.map(item=>escapeHtml(workerById(item.workerId)?.name||'')).join(', ')}</span>`:'';
  return `<div class="row"><div class="avatar">${initials(worker?.name)}</div><div class="meta"><b>${escapeHtml(worker?.name||'Nepoznat radnik')}</b><span>${escapeHtml(request.type)} · ${escapeHtml(rangeLabel(request.start,request.end))} · ${pluralDays(days)}<br>${escapeHtml(request.note||'Bez napomene')}${conflictLabel}</span></div><div class="side">${pill(request.status)}${controls}</div></div>`;
}
function viewRequests(){
  const isApprover=['admin','manager'].includes(currentRole);
  const isWorker=currentRole==='worker';
  const requests=state.requests.filter(requestVisible).sort((a,b)=>b.start.localeCompare(a.start));
  const worker=currentWorker();
  const available=Math.max(0,(worker.vacationAllowance||0)-committedVacationDays(worker.id));
  const form=isWorker?`<div class="card"><h2>Novi zahtjev</h2><div class="notice info">Trajanje se računa po radnim danima (ponedjeljak–petak), bez hrvatskih blagdana u 2026. Zahtjev koji se preklapa s tvojim postojećim zahtjevom neće se poslati.</div><div class="form form-grid"><label>Vrsta<select id="vacType"><option>Godišnji odmor</option><option>Slobodan dan</option></select></label><label>Preostalo za nove zahtjeve<input value="${available} radnih dana" disabled></label><label>Od<input id="vacStart" type="date" value="2026-08-17"></label><label>Do<input id="vacEnd" type="date" value="2026-08-21"></label><label style="grid-column:1/-1">Napomena<textarea id="vacNote" rows="3" placeholder="Kratka napomena voditelju"></textarea></label></div><div class="btns"><button class="btn" onclick="submitVacationRequest()">Pošalji zahtjev</button></div></div>`:'';
  return `${title(isWorker?'Moji zahtjevi':currentRole==='manager'?'Zahtjevi mojeg tima':'Zahtjevi za odsutnost',isWorker?'Status godišnjih odmora i slobodnih dana.':'Odobravanje uz vidljivo preklapanje unutar odjela.',pill(`${requests.filter(request=>request.status==='Na čekanju').length} na čekanju`))}
    ${isApprover?'<div class="notice">Oznaka preklapanja je upozorenje za planiranje kapaciteta. Voditelj i dalje može donijeti odluku prema stvarnoj zamjeni u smjeni.</div>':''}
    <div class="card">${requests.map(request=>requestCard(request,isApprover)).join('')||'<div class="empty-state">Nema zahtjeva u tvojem opsegu.</div>'}</div>${form}<button class="btn secondary block" onclick="navigate('vacations')">Otvori kalendar godišnjih</button>`;
}
function submitVacationRequest(){
  if(currentRole!=='worker')return;
  const worker=currentWorker(),type=$('#vacType').value,start=$('#vacStart').value,end=$('#vacEnd').value,note=$('#vacNote').value.trim();
  if(!start||!end||end<start){toast('Provjeri početni i završni datum.');return;}
  const days=businessDays(start,end);
  if(days===0){toast('Odabrano razdoblje nema radnih dana.');return;}
  const ownOverlap=state.requests.find(request=>request.workerId===worker.id&&request.status!=='Odbijeno'&&intervalsOverlap(start,end,request.start,request.end));
  if(ownOverlap){toast(`Zahtjev se preklapa s razdobljem ${rangeLabel(ownOverlap.start,ownOverlap.end)}.`);return;}
  if(type==='Godišnji odmor'){
    const available=Math.max(0,(worker.vacationAllowance||0)-committedVacationDays(worker.id));
    if(days>available){toast(`Nema dovoljno raspoloživih dana. Dostupno: ${available}.`);return;}
  }
  const request={id:Date.now(),workerId:worker.id,type,start,end,note:note||'Bez napomene',status:'Na čekanju'};
  state.requests.unshift(request);
  const conflicts=teamConflicts(request).length;
  audit('Radnik',`Poslan zahtjev: ${worker.name} · ${rangeLabel(start,end)} · ${pluralDays(days)}.`,'Zahtjevi');
  saveAndRender(conflicts?`Zahtjev je poslan. Postoji ${conflicts} preklapanje u odjelu.`:'Zahtjev je poslan voditelju.');
}
function updateRequest(id,status){
  if(!['admin','manager'].includes(currentRole))return;
  const request=state.requests.find(item=>item.id===Number(id));
  if(!request||!requestVisible(request)||!['Odobreno','Odbijeno'].includes(status))return;
  request.status=status;
  const worker=workerById(request.workerId);
  const decision=status==='Odobreno'?'Odobren':'Odbijen';
  audit(role().label,`${decision} zahtjev: ${worker?.name||'Radnik'} · ${rangeLabel(request.start,request.end)}.`,'Zahtjevi');
  saveAndRender(`Zahtjev je ${decision.toLowerCase()}.`);
}

function calendarRequests(){
  return state.requests.filter(request=>request.start&&request.end&&request.status!=='Odbijeno'&&requestVisible(request))
    .filter(request=>currentRole!=='accountant'||request.status==='Odobreno')
    .filter(request=>vacationDepartment==='Svi'||workerById(request.workerId)?.dept===vacationDepartment);
}
function isoDate(year,month,day){ return `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`; }
function requestsForDay(iso,requests){ return requests.filter(request=>request.start<=iso&&request.end>=iso); }
function calendarMonthCard(year,month,requests,large=false){
  const first=new Date(year,month,1),dayCount=new Date(year,month+1,0).getDate(),offset=(first.getDay()+6)%7;
  const monthName=first.toLocaleDateString('hr-HR',{month:'long'});
  let cells=Array.from({length:offset},()=>'<span class="day empty" aria-hidden="true"></span>').join('');
  for(let day=1;day<=dayCount;day++){
    const iso=isoDate(year,month,day),events=requestsForDay(iso,requests),weekday=isoToDate(iso).getDay();
    const statuses=[...new Set(events.map(event=>event.status))];
    const statusClass=!events.length?'':statuses.length>1?'has-mixed':statuses[0]==='Odobreno'?'has-approved':'has-pending';
    const today=iso===DEMO_TODAY?'today':'';
    const weekend=weekday===0||weekday===6?'weekend':'';
    if(events.length){
      const names=events.map(event=>`${workerById(event.workerId)?.name||'Radnik'} – ${event.status}`).join(', ');
      cells+=`<button class="day ${statusClass} ${today} ${weekend}" onclick="showVacationDay('${iso}')" aria-label="${escapeHtml(`${isoLabel(iso)}: ${names}`)}" title="${escapeHtml(names)}">${day}${events.length>1?`<span class="event-count">${events.length}</span>`:''}</button>`;
    }else{
      cells+=`<span class="day ${today} ${weekend}" aria-label="${escapeHtml(isoLabel(iso))}">${day}</span>`;
    }
  }
  return `<section class="month-card ${large?'large':''}"><h3>${escapeHtml(monthName)} ${large?year:''}</h3><div class="week-row">${['P','U','S','Č','P','S','N'].map(day=>`<span>${day}</span>`).join('')}</div><div class="day-grid">${cells}</div></section>`;
}
function setCalendarMode(mode){ calendarMode=mode;render(); }
function changeCalendarPeriod(delta){
  if(calendarMode==='year') calendarYear+=delta;
  else{
    calendarMonth+=delta;
    if(calendarMonth<0){calendarMonth=11;calendarYear-=1;}
    if(calendarMonth>11){calendarMonth=0;calendarYear+=1;}
  }
  render();
}
function setVacationDepartment(value){ vacationDepartment=value;render(); }
function showVacationDay(iso){
  const events=requestsForDay(iso,calendarRequests());
  if(!events.length)return;
  const modal=$('#modal');
  modal.innerHTML=`<div class="modal-card"><div class="modal-head"><div><h2>${escapeHtml(isoToDate(iso).toLocaleDateString('hr-HR',{day:'numeric',month:'long',year:'numeric'}))}</h2><div class="small-muted">Odsutnosti za odabrani datum</div></div><button class="close-btn" onclick="closeModal()">×</button></div>${events.map(request=>{const worker=workerById(request.workerId);return row(initials(worker?.name),worker?.name||'Nepoznat radnik',`${escapeHtml(request.type)} · ${pluralDays(businessDays(request.start,request.end))}`,pill(request.status));}).join('')}</div>`;
  modal.classList.add('open');
}
function viewVacations(){
  const requests=calendarRequests().filter(request=>request.start.slice(0,4)<=String(calendarYear)&&request.end.slice(0,4)>=String(calendarYear));
  const isAdmin=currentRole==='admin';
  const titleText=currentRole==='worker'?'Moj godišnji kalendar':currentRole==='manager'?'Kalendar mojeg tima':currentRole==='accountant'?'Odobrene odsutnosti':'Godišnji kalendar cijele firme';
  const subtitle=currentRole==='worker'?'Prikazuju se samo tvoji zahtjevi.':isAdmin?'Godišnji pregled svih radnika uz filtar odjela.':'Prikaz je ograničen pravima tvoje uloge.';
  const label=calendarMode==='year'?String(calendarYear):new Date(calendarYear,calendarMonth,1).toLocaleDateString('hr-HR',{month:'long',year:'numeric'});
  const calendar=calendarMode==='year'?`<div class="year-calendar">${Array.from({length:12},(_,month)=>calendarMonthCard(calendarYear,month,requests)).join('')}</div>`:`<div class="month-view">${calendarMonthCard(calendarYear,calendarMonth,requests,true)}</div>`;
  const balanceWorkers=currentRole==='accountant'?[]:visibleWorkers().filter(worker=>worker.active);
  const approved=requests.filter(request=>request.status==='Odobreno');
  const pendingVisible=currentRole!=='accountant';
  return `${title(titleText,subtitle,pill(String(calendarYear)))}
    <div class="card"><div class="calendar-toolbar"><div class="calendar-controls"><button onclick="changeCalendarPeriod(-1)" aria-label="Prethodno">‹</button><b>${escapeHtml(label)}</b><button onclick="changeCalendarPeriod(1)" aria-label="Sljedeće">›</button></div><div class="view-switch"><button class="${calendarMode==='month'?'active':''}" onclick="setCalendarMode('month')">Mjesec</button><button class="${calendarMode==='year'?'active':''}" onclick="setCalendarMode('year')">Godina</button></div>${isAdmin?`<select class="calendar-filter" onchange="setVacationDepartment(this.value)"><option value="Svi" ${vacationDepartment==='Svi'?'selected':''}>Svi odjeli</option>${departmentList().map(dept=>`<option ${vacationDepartment===dept?'selected':''}>${escapeHtml(dept)}</option>`).join('')}</select>`:''}</div></div>
    <div class="stats-grid"><div class="stat"><div class="num">${requests.length}</div><div class="lab">Periodi odsutnosti</div></div><div class="stat"><div class="num">${new Set(requests.map(request=>request.workerId)).size}</div><div class="lab">Radnici u kalendaru</div></div><div class="stat"><div class="num">${approved.reduce((sum,request)=>sum+businessDays(request.start,request.end),0)}</div><div class="lab">Odobreni radni dani</div></div><div class="stat"><div class="num">${requests.filter(request=>teamConflicts(request).length).length}</div><div class="lab">Periodi s preklapanjem</div></div></div>
    <div class="card">${calendar}<div class="calendar-legend"><span><i class="legend-dot approved"></i>Odobreno</span>${pendingVisible?'<span><i class="legend-dot pending"></i>Na čekanju</span>':''}<span><i class="legend-dot mixed"></i>Više događaja/statusa</span></div><p class="small-muted">Detalji se otvaraju samo na označenim datumima; prazni dani nisu nepotrebno interaktivni.</p></div>
    ${balanceWorkers.length?`<div class="card"><h2>Stanje godišnjeg odmora ${calendarYear}.</h2><div class="balance-list">${balanceWorkers.map(worker=>{const used=vacationUsed(worker.id,calendarYear),remaining=vacationRemaining(worker.id,calendarYear),allowance=worker.vacationAllowance||0,percent=allowance?Math.min(100,used/allowance*100):0;return `<div class="balance-item"><div><b>${escapeHtml(worker.name)}</b><span> Iskorišteno ${used} od ${allowance} radnih dana</span><div class="progress"><i style="width:${percent}%"></i></div></div><b>${remaining} preostalo</b></div>`;}).join('')}</div></div>`:''}
    <div class="card"><h2>${currentRole==='worker'?'Moja razdoblja':'Planirane odsutnosti'}</h2>${requests.slice().sort((a,b)=>a.start.localeCompare(b.start)).map(request=>requestCard(request,false)).join('')||'<div class="empty-state">Nema odsutnosti za odabrani prikaz.</div>'}</div>${currentRole==='worker'?'<button class="btn block" onclick="navigate(\'requests\')">Pošalji novi zahtjev</button>':''}`;
}

function correctionValues(correction){
  const oldValue=`${correction.oldStart||'—'} – ${correction.oldEnd||'—'}`;
  const newValue=`${correction.newStart||'—'} – ${correction.newEnd||'—'}`;
  return {oldValue,newValue};
}
function submitCorrection(){
  if(currentRole!=='worker')return;
  const worker=currentWorker(),date=$('#corrDate').value,newStart=$('#corrStart').value,newEnd=$('#corrEnd').value,reason=$('#corrReason').value.trim();
  if(!date||(!newStart&&!newEnd)||!reason){toast('Unesi datum, ispravno vrijeme i razlog.');return;}
  if(newStart&&newEnd&&timeToMinutes(newStart)===timeToMinutes(newEnd)){toast('Dolazak i odlazak ne mogu biti isti.');return;}
  const duplicate=state.corrections.find(correction=>correction.workerId===worker.id&&correction.date===date&&correction.status==='Na čekanju');
  if(duplicate){toast('Za taj datum već postoji korekcija na čekanju.');return;}
  const record=state.records.find(item=>item.workerId===worker.id&&item.date===date);
  const oldStart=record?.start||'',oldEnd=record?.end||'';
  if(newStart===oldStart&&newEnd===oldEnd){toast('Novo vrijeme jednako je postojećem zapisu.');return;}
  state.corrections.unshift({id:Date.now(),workerId:worker.id,date,oldStart,oldEnd,newStart,newEnd,reason,status:'Na čekanju'});
  audit('Radnik',`Poslana korekcija: ${worker.name} · ${isoLabel(date)}.`,'Korekcije');
  screen='corrections';saveAndRender('Zahtjev za korekciju je poslan.');
}
function viewCorrections(){
  const isWorker=currentRole==='worker',isApprover=['admin','manager'].includes(currentRole);
  const corrections=state.corrections.filter(correctionVisible).sort((a,b)=>b.date.localeCompare(a.date));
  const cards=corrections.map(correction=>{
    const worker=workerById(correction.workerId),values=correctionValues(correction);
    const controls=isApprover&&correction.status==='Na čekanju'?`<div class="btns"><button class="btn green small" onclick="updateCorrection(${correction.id},'Odobreno')">Odobri</button><button class="btn red small" onclick="updateCorrection(${correction.id},'Odbijeno')">Odbij</button></div>`:'';
    return `<div class="row"><div class="avatar">${initials(worker?.name)}</div><div class="meta"><b>${escapeHtml(worker?.name||'Nepoznat radnik')}</b><span>${escapeHtml(isoLabel(correction.date))} · ${escapeHtml(values.oldValue)} → ${escapeHtml(values.newValue)}<br>${escapeHtml(correction.reason)}</span></div><div class="side">${pill(correction.status)}${controls}</div></div>`;
  }).join('');
  const form=isWorker?`<div class="card"><h2>Nova korekcija</h2><div class="form form-grid cols-3"><label>Datum<input id="corrDate" type="date" value="2026-07-10" onchange="updateCorrectionPreview()"></label><label>Ispravan dolazak<input id="corrStart" type="time" value="07:42"></label><label>Ispravan odlazak<input id="corrEnd" type="time" value="16:02"></label><label style="grid-column:1/-1">Razlog<textarea id="corrReason" rows="3"></textarea></label></div><div id="corrPreview" class="muted-box" style="margin-top:11px">${correctionPreviewText('2026-07-10',currentWorker().id)}</div><div class="btns"><button class="btn" onclick="submitCorrection()">Pošalji zahtjev</button></div></div>`:'';
  return `${title(isWorker?'Moje korekcije':currentRole==='manager'?'Korekcije mojeg tima':'Korekcije vremena',isWorker?'Radnik šalje zahtjev; izvorni zapis ostaje nepromijenjen do odobrenja.':'Odobrena korekcija ažurira odgovarajući zapis i ostavlja audit trag.',pill(`${corrections.filter(correction=>correction.status==='Na čekanju').length} na čekanju`))}<div class="card">${cards||'<div class="empty-state">Nema korekcija u tvojem opsegu.</div>'}</div>${form}`;
}
function updateCorrection(id,status){
  if(!['admin','manager'].includes(currentRole))return;
  const correction=state.corrections.find(item=>item.id===Number(id));
  if(!correction||!correctionVisible(correction)||!['Odobreno','Odbijeno'].includes(status))return;
  correction.status=status;
  const worker=workerById(correction.workerId);
  if(status==='Odobreno'){
    let record=state.records.find(item=>item.workerId===correction.workerId&&item.date===correction.date);
    if(!record){
      const shift=shiftById(worker?.shiftId);
      record={id:Date.now(),workerId:correction.workerId,date:correction.date,start:correction.newStart,end:correction.newEnd,breakMinutes:shift?.breakMinutes||0,status:'Ispravljeno'};
      state.records.push(record);
    }else{
      record.start=correction.newStart;record.end=correction.newEnd;record.status='Ispravljeno';
      if(record.end&&!record.breakMinutes)record.breakMinutes=shiftById(worker?.shiftId)?.breakMinutes||0;
    }
  }
  const values=correctionValues(correction);
  const decision=status==='Odobreno'?'Odobrena':'Odbijena';
  audit(role().label,`${decision} korekcija: ${worker?.name||'Radnik'} · ${values.oldValue} → ${values.newValue}.`,'Korekcije');
  saveAndRender(`Korekcija je ${decision.toLowerCase()}.`);
}

function reportScopeWorkers(){
  if(currentRole==='manager')return visibleWorkers().filter(worker=>worker.active);
  return activeWorkers();
}
function monthBounds(month){
  const [year,index]=month.split('-').map(Number);
  const lastDay=new Date(year,index,0).getDate();
  return {start:`${month}-01`,end:`${month}-${String(lastDay).padStart(2,'0')}`};
}
function reportWorkerAllowed(worker){
  if(!worker)return false;
  return reportScopeWorkers().some(item=>item.id===worker.id)
    && (reportFilters.department==='Svi'||worker.dept===reportFilters.department)
    && (reportFilters.workerId==='Svi'||worker.id===Number(reportFilters.workerId));
}
function getReportData(){
  const {start,end}=monthBounds(reportFilters.month);
  if(['attendance','exceptions'].includes(reportFilters.type)){
    const records=state.records.filter(record=>record.date>=start&&record.date<=end&&reportWorkerAllowed(workerById(record.workerId)))
      .filter(record=>reportFilters.type==='attendance'||!['Uredno','Ispravljeno'].includes(record.status))
      .sort((a,b)=>a.date.localeCompare(b.date)||a.workerId-b.workerId);
    return {title:reportFilters.type==='attendance'?'Mjesečna evidencija':'Kašnjenja i nepotpuni zapisi',headers:['Radnik','Odjel','Datum','Dolazak','Odlazak','Pauza (min)','Ukupno','Status'],rows:records.map(record=>{const worker=workerById(record.workerId);return [worker?.name||'',worker?.dept||'',isoLabel(record.date),record.start||'—',record.end||'—',record.breakMinutes||0,record.end?formatMinutes(recordMinutes(record)):'—',record.status];})};
  }
  if(reportFilters.type==='vacations'){
    const requests=state.requests.filter(request=>request.status==='Odobreno'&&request.start<=end&&request.end>=start&&reportWorkerAllowed(workerById(request.workerId))).sort((a,b)=>a.start.localeCompare(b.start));
    return {title:'Odobrene odsutnosti',headers:['Radnik','Odjel','Vrsta','Od','Do','Radni dani','Status'],rows:requests.map(request=>{const worker=workerById(request.workerId);return [worker?.name||'',worker?.dept||'',request.type,isoLabel(request.start),isoLabel(request.end),businessDays(request.start,request.end),request.status];})};
  }
  const corrections=state.corrections.filter(correction=>correction.date>=start&&correction.date<=end&&reportWorkerAllowed(workerById(correction.workerId))).sort((a,b)=>a.date.localeCompare(b.date));
  return {title:'Korekcije vremena',headers:['Radnik','Odjel','Datum','Stara vrijednost','Nova vrijednost','Razlog','Status'],rows:corrections.map(correction=>{const worker=workerById(correction.workerId),values=correctionValues(correction);return [worker?.name||'',worker?.dept||'',isoLabel(correction.date),values.oldValue,values.newValue,correction.reason,correction.status];})};
}
function applyReportFilters(log=true){
  reportFilters={month:$('#reportMonth').value,department:$('#reportDept').value,workerId:$('#reportWorker').value,type:$('#reportType').value};
  if(log){state.lastReport=`Pregled generiran ${now()}`;audit(role().label,`Generiran pregled: ${getReportData().title}.`,'Izvještaji');}
  render();if(log)toast('Pregled izvještaja je ažuriran.');
}
function reportPreview(data){
  return `<div class="card table-card"><div style="padding:15px 15px 8px"><h2>${escapeHtml(data.title)}</h2></div><div class="table-wrap"><table><thead><tr>${data.headers.map(header=>`<th>${escapeHtml(header)}</th>`).join('')}</tr></thead><tbody>${data.rows.map(values=>`<tr>${values.map(value=>`<td>${escapeHtml(value)}</td>`).join('')}</tr>`).join('')||`<tr><td colspan="${data.headers.length}"><div class="empty-state">Nema podataka za odabrane kriterije.</div></td></tr>`}</tbody></table></div><div class="table-summary"><span>${data.rows.length} redaka</span><span>CSV i XLSX koriste ovaj isti rezultat</span></div></div>`;
}
function viewReports(){
  const workers=reportScopeWorkers(),data=getReportData();
  return `${title('Izvještaji','Filtri izravno određuju pregled te sadržaj CSV i XLSX datoteke.',pill(`${data.rows.length} redaka`))}
    <div class="card"><div class="filter-bar"><input id="reportMonth" type="month" value="${reportFilters.month}" aria-label="Mjesec"><select id="reportDept" aria-label="Odjel">${departmentOptions(reportFilters.department)}</select><select id="reportWorker" aria-label="Radnik"><option value="Svi" ${reportFilters.workerId==='Svi'?'selected':''}>Svi radnici</option>${workers.map(worker=>`<option value="${worker.id}" ${String(worker.id)===String(reportFilters.workerId)?'selected':''}>${escapeHtml(worker.name)}</option>`).join('')}</select><select id="reportType" aria-label="Vrsta izvještaja"><option value="attendance" ${reportFilters.type==='attendance'?'selected':''}>Mjesečna evidencija</option><option value="exceptions" ${reportFilters.type==='exceptions'?'selected':''}>Kašnjenja i nepotpuni zapisi</option><option value="vacations" ${reportFilters.type==='vacations'?'selected':''}>Odobrene odsutnosti</option><option value="corrections" ${reportFilters.type==='corrections'?'selected':''}>Korekcije vremena</option></select><button class="btn" onclick="applyReportFilters()">Generiraj</button></div></div>
    <div class="card"><h2>Preuzimanje</h2><div class="summary-line"><span>CSV</span><b>UTF-8, odvojeno točkom-zarezom</b></div><div class="summary-line"><span>XLSX</span><b>Stvarna Excel radna knjiga, nije preimenovani CSV</b></div><div class="summary-line"><span>Posljednja radnja</span><b>${escapeHtml(state.lastReport)}</b></div><div class="btns"><button class="btn" onclick="downloadReport('csv')">Preuzmi CSV</button><button class="btn secondary" onclick="downloadReport('xlsx')">Preuzmi XLSX</button></div></div>${reportPreview(data)}`;
}
function csvContent(data){
  return '\ufeff'+[data.headers,...data.rows].map(row=>row.map(value=>`"${String(value??'').replaceAll('"','""')}"`).join(';')).join('\r\n');
}
function downloadBlob(blob,filename){
  const link=document.createElement('a'),url=URL.createObjectURL(blob);
  link.href=url;link.download=filename;document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),500);
}
function downloadReport(format){
  const data=getReportData();
  if(!data.rows.length){toast('Nema podataka za preuzimanje.');return;}
  const base=`BSS_${reportFilters.type}_${reportFilters.month}`;
  if(format==='csv')downloadBlob(new Blob([csvContent(data)],{type:'text/csv;charset=utf-8'}),`${base}.csv`);
  else downloadBlob(buildXlsx(data.headers,data.rows,data.title),`${base}.xlsx`);
  state.lastReport=`${format.toUpperCase()} preuzet ${now()}`;
  audit(role().label,`Preuzet ${format.toUpperCase()} izvještaj: ${data.title}.`,'Izvještaji');
  render();toast(`${format.toUpperCase()} izvještaj je preuzet.`);
}

function xmlEscape(value){ return String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[char])); }
function columnName(index){ let name='';for(let value=index+1;value>0;value=Math.floor((value-1)/26))name=String.fromCharCode(65+(value-1)%26)+name;return name; }
function le16(value){ return [value&255,(value>>>8)&255]; }
function le32(value){ return [value&255,(value>>>8)&255,(value>>>16)&255,(value>>>24)&255]; }
let crcTable=null;
function crc32(bytes){
  if(!crcTable)crcTable=Array.from({length:256},(_,n)=>{let c=n;for(let k=0;k<8;k++)c=(c&1)?0xedb88320^(c>>>1):c>>>1;return c>>>0;});
  let crc=0xffffffff;for(const byte of bytes)crc=crcTable[(crc^byte)&255]^(crc>>>8);return (crc^0xffffffff)>>>0;
}
function concatBytes(parts){
  const size=parts.reduce((sum,part)=>sum+part.length,0),result=new Uint8Array(size);let offset=0;
  for(const part of parts){result.set(part,offset);offset+=part.length;}return result;
}
function zipStore(files){
  const encoder=new TextEncoder(),locals=[],centrals=[];let offset=0;
  for(const file of files){
    const name=encoder.encode(file.name),data=encoder.encode(file.content),crc=crc32(data);
    const local=new Uint8Array([80,75,3,4,...le16(20),...le16(0),...le16(0),...le16(0),...le16(0),...le32(crc),...le32(data.length),...le32(data.length),...le16(name.length),...le16(0),...name,...data]);
    const central=new Uint8Array([80,75,1,2,...le16(20),...le16(20),...le16(0),...le16(0),...le16(0),...le16(0),...le32(crc),...le32(data.length),...le32(data.length),...le16(name.length),...le16(0),...le16(0),...le16(0),...le16(0),...le32(0),...le32(offset),...name]);
    locals.push(local);centrals.push(central);offset+=local.length;
  }
  const centralData=concatBytes(centrals),end=new Uint8Array([80,75,5,6,...le16(0),...le16(0),...le16(files.length),...le16(files.length),...le32(centralData.length),...le32(offset),...le16(0)]);
  return concatBytes([...locals,centralData,end]);
}
function buildXlsx(headers,rows,titleText){
  const values=[headers,...rows],sheetRows=values.map((rowValues,rowIndex)=>`<row r="${rowIndex+1}">${rowValues.map((value,columnIndex)=>`<c r="${columnName(columnIndex)}${rowIndex+1}" t="inlineStr"><is><t xml:space="preserve">${xmlEscape(value)}</t></is></c>`).join('')}</row>`).join('');
  const sheetName=String(titleText||'Izvještaj').replace(/[\\/*?:[\]]/g,' ').slice(0,31)||'Izvještaj';
  const files=[
    {name:'[Content_Types].xml',content:'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>'},
    {name:'_rels/.rels',content:'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'},
    {name:'xl/workbook.xml',content:`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${xmlEscape(sheetName)}" sheetId="1" r:id="rId1"/></sheets></workbook>`},
    {name:'xl/_rels/workbook.xml.rels',content:'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>'},
    {name:'xl/worksheets/sheet1.xml',content:`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${sheetRows}</sheetData></worksheet>`}
  ];
  return new Blob([zipStore(files)],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
}

function viewTerminal(){
  return `${title('Status terminala','Nadzor veze, verzije i redova za sinkronizaciju.',pill(state.terminal.online?'Online':'Offline'))}<div class="card hero"><div class="eyebrow" style="color:rgba(255,255,255,.74)">Uređaj 01</div><h2 style="font-size:23px">BSS Terminal 01</h2><p>Ulaz proizvodnje · RFID/NFC prijava i odjava</p><div class="meta-line"><span>Zadnja sinkronizacija</span><b>${escapeHtml(state.terminal.lastSync)}</b></div></div><div class="dashboard-grid"><div class="card"><h2>Telemetrija uređaja</h2><div class="summary-line"><span>Današnja očitanja</span><b>${state.terminal.scans}</b></div><div class="summary-line"><span>Neposlani zapisi</span><b>${state.terminal.unsynced}</b></div><div class="summary-line"><span>Mreža</span><b>${state.terminal.online?'Wi‑Fi online':'Wi‑Fi offline'}</b></div><div class="summary-line"><span>Verzija</span><b>${escapeHtml(state.terminal.version)}</b></div><div class="btns"><button class="btn secondary" onclick="simulateTerminalOffline()">Simuliraj prekid veze</button><button class="btn" onclick="restoreTerminal()">Vrati vezu i sinkroniziraj</button></div></div><div class="card"><h2>Offline pravilo</h2><p class="small-muted">Terminal lokalno sprema očitanja kada nema veze. Nakon povratka mreže, backend mora prihvatiti zapise idempotentno kako se ista prijava ne bi spremila dvaput.</p><div class="summary-line"><span>Lokalni red</span><b>${state.terminal.unsynced} zapisa</b></div><div class="summary-line"><span>Stanje</span><b>${state.terminal.unsynced?'Čeka sinkronizaciju':'Sinkronizirano'}</b></div></div></div>`;
}
function simulateTerminalOffline(){
  if(!state.terminal.online){toast('Terminal je već offline.');return;}
  state.terminal.online=false;state.terminal.unsynced+=3;state.terminal.lastSync='prije 12 minuta';
  audit('Terminal',`Prekid veze: ${state.terminal.unsynced} zapisa čeka sinkronizaciju.`,'Terminal');saveAndRender('Terminal je offline; zapisi ostaju u lokalnom redu.');
}
function restoreTerminal(){
  const count=state.terminal.unsynced;state.terminal.online=true;state.terminal.unsynced=0;state.terminal.lastSync='upravo sada';
  audit('Terminal',`Veza vraćena; sinkronizirano ${count} lokalnih zapisa.`,'Terminal');saveAndRender(`Veza je vraćena i sinkronizirano je ${count} zapisa.`);
}
function viewTerminalDemo(){
  const scan=state.lastScan;
  return `${title('RFID simulator','Prodajni demo odvojen od službene evidencije. Promjene ovdje ne mijenjaju zapise radnog vremena.',pill('Demo'))}<div class="notice info">Ovo je izolirani simulator ponašanja terminala. Za operativne dolaske i odlaske koristi ekran Evidencija.</div><div class="card rfid-box"><span class="pill green">Simulirani terminal · Ulaz proizvodnje</span><div class="rfid-ring"><div class="rfid-card">≋</div></div><h2 style="margin:0;font-size:21px">Prislonite RFID karticu</h2><p class="small-muted" style="max-width:420px">Isprobaj uspješno očitanje, nepoznatu karticu i lokalni offline zapis bez promjene službene evidencije.</p><div class="result"><div class="summary-line"><span>Radnik / kartica</span><b>${escapeHtml(scan.label)}</b></div><div class="summary-line"><span>Status</span><b>${pill(scan.status)}</b></div><div class="summary-line"><span>Vrijeme</span><b>${escapeHtml(scan.time)}</b></div><div class="summary-line"><span>Poruka</span><b>${escapeHtml(scan.message)}</b></div></div><div class="btns"><button class="btn" onclick="demoScan()">Simuliraj očitanje</button><button class="btn secondary" onclick="demoUnknownCard()">Nepoznata kartica</button><button class="btn secondary" onclick="demoOfflineScan()">Offline zapis</button></div></div>`;
}
function demoScan(){
  const signingOut=state.lastScan.status==='Prijavljen';
  state.lastScan={workerId:2,label:'Marko Marić',status:signingOut?'Odjavljen':'Prijavljen',time:signingOut?'16:05':'08:12',message:signingOut?'Odjava prihvaćena. Demo evidencija nije promijenjena.':'Prijava prihvaćena. Demo evidencija nije promijenjena.'};
  state.terminal.scans+=1;saveAndRender(`Simulator: ${state.lastScan.status.toLowerCase()}.`);
}
function demoUnknownCard(){ state.lastScan={workerId:null,label:'UID 04 FF 91 2B',status:'Greška',time:'08:14',message:'Kartica nije dodijeljena aktivnom radniku.'};saveAndRender('Simulator je odbio nepoznatu karticu.'); }
function demoOfflineScan(){ state.lastScan={workerId:1,label:'Ivan Horvat',status:'Offline zapis',time:'07:42',message:'Zapis je spremljen u simulirani lokalni red.'};saveAndRender('Simulator je prikazao lokalno offline spremanje.'); }

function viewFlow(){
  const steps=[
    ['Radnik prisloni RFID karticu','Terminal provjeri karticu i aktivni status radnika.'],
    ['Uređaj potvrdi očitanje','Radnik odmah dobiva zvučnu i vizualnu potvrdu.'],
    ['Zapis stiže u backend','Jedinstveni ID sprečava dvostruko spremanje nakon offline rada.'],
    ['Voditelj rješava iznimke','Kašnjenja, nepotpuni dani i korekcije ulaze u kontrolirani tijek.'],
    ['Knjigovodstvo izvozi podatke','Filtrirani CSV ili XLSX koristi isti provjereni skup zapisa.']
  ];
  return `${title('Kako radi BSS','Kratki prodajni prikaz procesa; nije dio svakodnevnog rada administratora.',pill('Demo'))}<div class="card">${steps.map((step,index)=>`<div class="timeline-step"><b>${index+1}. ${escapeHtml(step[0])}</b><span>${escapeHtml(step[1])}</span></div>`).join('')}</div><div class="card hero"><h2>Vrijednost za kupca</h2><p>Jedno mjesto za evidenciju, odsutnosti, odobravanja i izvoz, uz terminal koji nastavlja raditi kada veza kratko nestane.</p></div>`;
}
function viewRoles(){
  const roles=[
    ['Administrator','Vidi cijelu firmu; upravlja radnicima, karticama i smjenama; odobrava zahtjeve; izvozi podatke.'],
    ['Voditelj','Vidi samo dodijeljene odjele; pregledava evidenciju tima i odlučuje o njihovim zahtjevima.'],
    ['Radnik','Vidi samo vlastitu evidenciju, godišnji i korekcije; ne može izravno mijenjati službeni zapis.'],
    ['Knjigovođa','Čita i izvozi izvještaje te vidi samo odobrene odsutnosti; nema prava uređivanja.']
  ];
  return `${title('Prava pristupa','Prikaz podataka i dostupne akcije ovise o ulozi.')}<div class="card">${roles.map(item=>row('R',item[0],escapeHtml(item[1]),pill(item[0]==='Knjigovođa'?'Samo čitanje':'Aktivno'))).join('')}</div><div class="notice">U ovom statičnom demu promjena uloge služi prezentaciji. U produkciji uloga mora dolaziti iz autentificirane korisničke sesije i provjeravati se na backendu pri svakom zahtjevu.</div>`;
}
function viewAudit(){
  return `${title('Audit log','Kronološki trag administrativnih odluka i promjena. ',pill(`${state.audit.length} događaja`))}<div class="card">${state.audit.map(item=>row(initials(item.user),item.action,`${escapeHtml(item.time)} · ${escapeHtml(item.user)} · ${escapeHtml(item.module)}`)).join('')||'<div class="empty-state">Nema evidentiranih događaja.</div>'}</div>`;
}
function viewSettings(){
  const company=state.company;
  return `${title('Postavke firme','Osnovna konfiguracija demo-organizacije.')}<div class="dashboard-grid"><div class="card"><h2>Tvrtka</h2><div class="form form-grid"><label>Naziv firme<input id="setName" value="${escapeHtml(company.name)}"></label><label>OIB<input id="setOib" inputmode="numeric" maxlength="11" value="${escapeHtml(company.oib)}"></label><label>Adresa<input id="setAddress" value="${escapeHtml(company.address)}"></label><label>Standardno radno vrijeme<input id="setWorkTime" value="${escapeHtml(company.workTime)}"></label></div><div class="btns"><button class="btn" onclick="saveSettings()">Spremi postavke</button></div></div><div><div class="card"><h2>Način prikaza</h2><div class="summary-line"><span>Trenutni način</span><b>${state.demoMode?'Prodajni demo':'Čista aplikacija'}</b></div><p class="small-muted">Prodajni demo dodaje simulator terminala, objašnjenje procesa i promjenu uloga. Čista aplikacija skriva te prezentacijske elemente.</p><button class="btn secondary block" onclick="toggleDemoMode()">${state.demoMode?'Isključi prodajne demo-alate':'Uključi prodajne demo-alate'}</button></div><div class="card"><h2>Granica ove verzije</h2><p class="small-muted">Ova objava je kvalitetan statičan demonstrator. Podaci se spremaju u ovaj preglednik; nema stvarne autentikacije, baze ni komunikacije s fizičkim terminalom.</p></div></div></div>`;
}
function saveSettings(){
  if(currentRole!=='admin')return;
  const name=$('#setName').value.trim(),oib=$('#setOib').value.trim(),address=$('#setAddress').value.trim(),workTime=$('#setWorkTime').value.trim();
  if(!name||!address||!workTime){toast('Popuni naziv, adresu i radno vrijeme.');return;}
  if(!/^\d{11}$/.test(oib)){toast('OIB mora imati 11 znamenki.');return;}
  Object.assign(state.company,{name,oib,address,workTime});audit('Administrator','Ažurirane postavke firme.','Postavke');saveAndRender('Postavke firme su spremljene.');
}

render();
if('serviceWorker' in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));}
