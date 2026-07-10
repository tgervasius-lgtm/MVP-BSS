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
