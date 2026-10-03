/* global state */
const {randomUUID}=require('node:crypto');
const {test,expect}=require('@playwright/test');
const {AxeBuilder}=require('@axe-core/playwright');

const adminEmail=process.env.BSS_BOOTSTRAP_ADMIN_EMAIL;
const adminPassword=process.env.BSS_BOOTSTRAP_ADMIN_PASSWORD;

function trackErrors(page){
  const errors=[];
  page.on('pageerror',error=>errors.push(`page: ${error.message}`));
  page.on('console',message=>{
    if(message.type()==='error'&&!message.text().startsWith('Failed to load resource:')){
      errors.push(`console: ${message.text()}`);
    }
  });
  page.on('requestfailed',request=>errors.push(`request: ${request.url()} · ${request.failure()?.errorText||'failed'}`));
  page.on('response',response=>{
    if(response.status()>=500)errors.push(`response: ${response.status()} · ${response.url()}`);
  });
  return errors;
}

async function login(page){
  expect(adminEmail,'BSS_BOOTSTRAP_ADMIN_EMAIL mora biti postavljen').toBeTruthy();
  expect(adminPassword,'BSS_BOOTSTRAP_ADMIN_PASSWORD mora biti postavljen').toBeTruthy();
  await page.goto('/');
  await page.locator('#loginEmail').fill(adminEmail);
  await page.locator('#loginPassword').fill(adminPassword);
  await page.getByRole('button',{name:'Prijavi se'}).click();
  await expect(page.locator('#content .screen')).toBeVisible();
}

test('full-stack prije autentikacije posluĹľuje login ljusku stvarnog backenda',async({page})=>{
  const response=await page.goto('/');
  expect(response?.status()).toBe(200);
  expect(response?.headers()['content-type']).toContain('text/html');
  expect(response?.headers()['cache-control']).toContain('no-store');
  await expect(page.locator('#loginEmail')).toBeVisible();
  await expect(page.locator('#loginPassword')).toBeVisible();
  await expect(page.getByRole('button',{name:'Prijavi se'})).toBeVisible();
  await expect(page.locator('#loginIdentity')).toHaveCount(0);
});

test.describe('administratorski ekran i terminalska sigurnost',()=>{
// Do not capture one-time credentials, including disposable test credentials.
test.use({trace:'off',screenshot:'off',video:'off'});
test('stvarni PostgreSQL backend prijavljuje administratora i otvara svaki ugovoreni ekran',async({page},testInfo)=>{
  const errors=trackErrors(page);
  const response=await page.goto('/');
  expect(response?.headers()['cache-control']).toContain('no-store');
  await page.locator('#loginEmail').fill(adminEmail);
  await page.locator('#loginPassword').fill(adminPassword);
  await page.getByRole('button',{name:'Prijavi se'}).click();
  await expect(page.locator('#content .screen')).toBeVisible();

  const session=await page.evaluate(()=>fetch('/api/v1/me',{credentials:'include'}).then(async response=>({status:response.status,body:await response.json()})));
  expect(session.status).toBe(200);
  expect(session.body.user.role).toBe('admin');
  expect(session.body.organization.name).toContain('BSS E2E');

  const screens=await page.evaluate(()=>window.allowedScreens());
  expect(screens).toContain('workers');
  expect(screens).toContain('reports');
  expect(screens).toContain('terminal');
  for(const screen of screens){
    await page.evaluate(value=>window.navigate(value),screen);
    await expect(page.locator('#content .screen')).toBeVisible();
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
    expect(overflow,`admin/${screen} ima horizontalni overflow`).toBeLessThanOrEqual(1);
  }

  const content=await page.locator('#content').innerText();
  expect(content).not.toMatch(/Ivan Horvat|BSS Demo d\.o\.o\.|početne demo-podatke/i);
  const violations=(await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa']).analyze()).violations
    .filter(item=>['serious','critical'].includes(item.impact));
  expect(violations).toEqual([]);
  await assertTerminalReconciliationDetail(page);
  if(testInfo.project.name==='desktop-chromium')await assertTerminalRotation(page);
  expect(errors).toEqual([]);
});

});

test('radnik spremljen kroz UI odmah dolazi iz stvarnog API-ja i PostgreSQL baze',async({page},testInfo)=>{
  const errors=trackErrors(page);
  await login(page);
  await page.evaluate(()=>window.navigate('workers'));
  await page.getByRole('button',{name:'Dodaj radnika'}).click();
  const suffix=`${testInfo.project.name.replace(/[^a-z]/gi,'').slice(0,8)}-${randomUUID().slice(0,8)}`;
  const code=`E2E-${suffix}`;
  const name=`E2E Radnik ${suffix}`;
  await page.locator('#workerCode').fill(code);
  await page.locator('#workerName').fill(name);
  await page.locator('#workerEmail').fill(`${suffix.toLowerCase()}@example.test`);
  await page.locator('#workerAllowance').fill('24');
  await page.getByRole('button',{name:'Spremi'}).click();
  await expect(page.locator('.workers-table')).toContainText(name);

  const stored=await page.evaluate(async expectedCode=>{
    const response=await fetch('/api/v1/workers?limit=200',{credentials:'include'});
    const body=await response.json();
    return {status:response.status,worker:body.items.find(item=>item.code===expectedCode)};
  },code);
  expect(stored.status).toBe(200);
  expect(stored.worker.name).toBe(name);
  expect(stored.worker.annualLeaveAllowance).toBe(24);
  expect(errors).toEqual([]);
});

async function assertTerminalReconciliationDetail(page){
  await page.evaluate(()=>{
    window.navigate('terminal');
    window.BSS_API_ACTIVE=true;
    const item={syncEventId:'10000000-0000-4000-8000-000000000001',eventId:'20000000-0000-4000-8000-000000000002',attendanceEventId:'30000000-0000-4000-8000-000000000003',statusCode:'reconciliation_required',status:'Za usklađenje',label:'Testni radnik',type:'Prijava',occurredAt:'2026-10-03T08:00:00Z',reconciliationLoaded:true,reconciliation:null};
    state.terminal.recentEvents=[item];
    window.BSSTerminalReconciliation.configure({refresh:async()=>true});
    Object.assign(window,{openTerminalEvent:window.BSSTerminalReconciliation.open,submitTerminalReconciliation:window.BSSTerminalReconciliation.submit,reloadTerminalEvents:window.BSSTerminalReconciliation.reload});
    document.querySelector('#content .content-inner').innerHTML=window.BSSTerminalReconciliation.tableHtml([item]);
  });
  await page.getByRole('button',{name:'Pregledaj'}).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('button',{name:'Zatvori',exact:true})).toBeFocused();
  await page.getByRole('button',{name:'Potvrdi usklađenje'}).click();
  await expect(page.locator('#terminalResolutionFeedback')).toContainText('Odaberi odluku');
  expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa']).analyze()).violations.filter(item=>['serious','critical'].includes(item.impact))).toEqual([]);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).not.toBeVisible();
}


// Shared E2E tenant exposes one selected terminal: run the mutation only on desktop.
async function assertTerminalRotation(page){
    const paired=await page.evaluate(async activationCode=>{
      const response=await fetch('/api/v1/terminals/pair',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:'E2E rotation terminal',location:'Isolated test',activationCode})});
      const data=await response.json();data.deviceCredential='';return response.ok;
    },process.env.TERMINAL_ACTIVATION_CODE);
    expect(paired).toBe(true);
    await page.reload();await expect(page.locator('#content .screen')).toBeVisible();
    await page.evaluate(()=>window.navigate('terminal'));
    await page.getByRole('button',{name:'Rotiraj vjerodajnicu',exact:true}).click();
    await page.locator('#terminalRotationReason').selectOption('normal_rotation');
    await expect(page.locator('#terminalRotationConfirm')).not.toBeChecked();
    await page.locator('#terminalRotationConfirm').check();
    await page.getByRole('button',{name:'Potvrdi rotaciju',exact:true}).click();
    await expect(page.getByRole('heading',{name:'Vjerodajnica je rotirana'})).toBeVisible();
    await expect(page.locator('#terminalCredential')).toHaveAttribute('type','password');
    expect(await page.locator('#terminalCredential').evaluate(element=>element.value.length>20)).toBe(true);
    await page.getByRole('button',{name:'Prikaži tajnu',exact:true}).click();
    await expect(page.locator('#terminalCredential')).toHaveAttribute('type','text');
    await page.getByRole('button',{name:'Zatvori i ukloni prikaz',exact:true}).click();
    expect(await page.locator('#terminalCredential').evaluate(element=>element.value.length===0)).toBe(true);
    await page.reload();await expect(page.locator('#content .screen')).toBeVisible();
    await expect(page.locator('#terminalCredential')).toHaveCount(0);
}
