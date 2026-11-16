/* global state */
const {createHash,randomUUID}=require('node:crypto');
const {readFile}=require('node:fs/promises');
const {test,expect}=require('@playwright/test');
const {AxeBuilder}=require('@axe-core/playwright');

// This full-stack file handles disposable credentials: never record browser artifacts.
test.use({trace:'off',screenshot:'off',video:'off'});

const adminEmail=process.env.BSS_BOOTSTRAP_ADMIN_EMAIL;
const adminPassword=process.env.BSS_BOOTSTRAP_ADMIN_PASSWORD;

function trackErrors(page){
  const errors=[],pending=new Map();
  Object.defineProperty(errors,'pending',{value:pending});
  page.on('request',request=>{if(new URL(request.url()).pathname.startsWith('/api/'))pending.set(request,null);});
  page.on('requestfinished',request=>pending.delete(request));
  page.on('pageerror',error=>errors.push(`page: ${error.message}`));
  page.on('console',message=>{
    if(message.type()==='error'&&!message.text().startsWith('Failed to load resource:')){
      errors.push(`console: ${message.text()}`);
    }
  });
  page.on('requestfailed',request=>{pending.delete(request);errors.push(`request: ${request.url()} · ${request.failure()?.errorText||'failed'}`);});
  page.on('response',response=>{
    if(pending.has(response.request()))pending.set(response.request(),response.status());
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
  const loginResponse=page.waitForResponse(response=>new URL(response.url()).pathname==='/api/v1/auth/login'&&response.request().method()==='POST');
  await page.getByRole('button',{name:'Prijavi se'}).click();
  expect((await loginResponse).status(),'Testni administrator prijavljen kroz stvarni API').toBe(200);
  await expect(page.locator('#content .screen')).toBeVisible({timeout:15_000});
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
test('stvarni PostgreSQL backend prijavljuje administratora i otvara svaki ugovoreni ekran',async({page},testInfo)=>{
  const errors=trackErrors(page),expectedResponses=[];
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
  expect(screens).toContain('onboarding');
  for(const screen of screens){
    const unavailable=screen==='onboarding'?page.waitForResponse(response=>new URL(response.url()).pathname==='/api/v1/onboarding'&&response.request().method()==='GET'):null;
    await page.evaluate(value=>window.navigate(value),screen);
    await expect(page.locator('#content .screen')).toBeVisible();
    if(unavailable){
      const response=await unavailable;
      expect(response.status()).toBe(503);
      expect((await response.json()).code).toBe('ONBOARDING_UNAVAILABLE');
      expect(response.headers()['cache-control']).toContain('no-store');
      await expect(page.locator('.onboarding')).toHaveAttribute('aria-busy','false');
      await expect(page.getByRole('alert')).toContainText('nije aktivirana');
      await expect(page.locator('#onboarding-reference')).toHaveCount(0);
      expectedResponses.push(`response: 503 · ${response.url()}`);
    }
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
    expect(overflow,`admin/${screen} ima horizontalni overflow`).toBeLessThanOrEqual(1);
  }

  const content=await page.locator('#content').innerText();
  expect(content).not.toMatch(/Ivan Horvat|BSS Demo d\.o\.o\.|početne demo-podatke/i);
  const violations=(await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa']).analyze()).violations
    .filter(item=>['serious','critical'].includes(item.impact));
  expect(violations).toEqual([]);
  await assertTerminalReconciliationDetail(page);
  if(testInfo.project.name==='desktop-chromium')await assertTerminalRotation(page,errors.pending);
  expect(expectedResponses).toHaveLength(1);
  expect(errors).toEqual(expectedResponses);
});

});

test.describe('spremanje radnika i izvoz izvještaja',()=>{
  test.use({serviceWorkers:'block'});
  test('stvarni API i PostgreSQL spremaju radnika i izvoze odabranu verziju mjeseca',async({page},testInfo)=>{
    test.slow();
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

    await test.step('Izvoz traži izričit odabir starije spremljene verzije mjeseca',async()=>{
      const month=String((testInfo.project.name==='desktop-chromium'?8:9)+2*testInfo.retry).padStart(2,'0');
      const path=`/api/v1/attendance-periods/2032/${Number(month)}`;
      const first=await page.evaluate(async path=>{
        async function transition(action,revision){
          const response=await fetch(`${path}/${action}`,{
            method:'POST',headers:{'Content-Type':'application/json','If-Match':`"${revision}"`,'Idempotency-Key':crypto.randomUUID()},
            body:JSON.stringify({reason:`Ogledni korak: ${action}`})
          });
          if(!response.ok)throw new Error(`Transition ${action} returned ${response.status}`);
          return response.json();
        }
        const current=await fetch(path).then(response=>response.json());
        const review=await transition('review',current.revision);
        const first=await transition('finalize',review.revision);
        const reopened=await transition('reopen',first.revision);
        const nextReview=await transition('review',reopened.revision);
        await transition('finalize',nextReview.revision);
        return first.datasetVersion;
      },path);

      await page.evaluate(()=>window.navigate('reports'));
      const filters=page.locator('.report-filter-bar');
      await filters.getByLabel('Mjesec — godina',{exact:true}).fill('2032');
      await filters.getByLabel('Mjesec — mjesec',{exact:true}).selectOption(month);
      const preview=page.waitForResponse(response=>new URL(response.url()).pathname==='/api/v1/report-previews'&&response.request().method()==='POST');
      await page.getByRole('button',{name:'Primijeni',exact:true}).click();
      expect((await preview).status()).toBe(200);
      await expect(page.locator('.report-authoritative-preview')).toContainText(`2032-${month}-01`);
      await expect(page.locator('.report-authoritative-preview')).toContainText('Nema podataka za odabrane kriterije.');
      await expect(page.getByRole('button',{name:'Tehnički CSV',exact:true})).toBeEnabled();
      const versionPath=`${path}/versions`;
      await page.route(`**${versionPath}?*`,route=>route.fulfill({status:503,json:{code:'UNAVAILABLE',message:'Testna nedostupnost'}}),{times:1});
      await page.getByRole('button',{name:'Tehnički CSV'}).click();
      const dialog=page.getByRole('dialog');
      await dialog.getByLabel('Izvor podataka').selectOption('locked');
      await expect(dialog.getByRole('status')).toContainText('Verzije nisu dostupne');
      await expect(dialog.getByRole('button',{name:'Potvrdi i preuzmi'})).toBeDisabled();
      await dialog.getByRole('button',{name:'Odustani'}).click();
      await page.getByRole('button',{name:'Tehnički CSV'}).click();
      await expect(dialog).toContainText('2032-'+month+'-01');
      await expect(dialog.getByRole('combobox',{name:'Spremljena verzija',exact:true})).toBeHidden();
      await dialog.getByLabel('Izvor podataka').selectOption('locked');
      const versions=dialog.getByRole('combobox',{name:'Spremljena verzija',exact:true});
      await expect(versions.locator('option')).toHaveCount(3);
      await expect(versions.locator('option').nth(1)).toContainText('najnovija');
      await expect(versions.locator('option').nth(2)).toContainText('ranija verzija');
      const confirm=dialog.getByRole('button',{name:'Potvrdi i preuzmi'});
      await expect(confirm).toBeDisabled();
      await versions.selectOption(first);
      await expect(confirm).toBeEnabled();
      await dialog.getByLabel('Izvor podataka').selectOption('current');
      await dialog.getByLabel('Izvor podataka').selectOption('locked');
      await expect(confirm).toBeDisabled();
      await versions.selectOption(first);
      const overflow=await dialog.evaluate(element=>element.scrollWidth-element.clientWidth);
      expect(overflow).toBeLessThanOrEqual(1);
      expect((await new AxeBuilder({page}).include('#modal').withTags(['wcag2a','wcag2aa']).analyze()).violations
        .filter(item=>['serious','critical'].includes(item.impact))).toEqual([]);
      const exported=page.waitForResponse(response=>new URL(response.url()).pathname==='/api/v1/report-exports'&&response.request().method()==='POST');
      const download=page.waitForEvent('download');
      await confirm.click();
      const response=await exported;
      expect(response.status()).toBe(202);
      expect(response.request().postDataJSON().periodVersionId).toBe(first);
      expect((await response.json()).periodVersionId).toBe(first);
      expect((await download).suggestedFilename()).toMatch(/\.csv$/);
      const historyEntry=page.locator('.report-history-item').filter({hasText:first});
      await expect(historyEntry).toHaveCount(1);
      await historyEntry.getByRole('button',{name:'Provjeri',exact:true}).click();
      await expect(page.getByRole('dialog')).toContainText('Izvoz je provjeren');
      expect(errors).toEqual([expect.stringMatching(new RegExp(`^response: 503 · .*${versionPath}\\?`))]);
    });
    await test.step('Aktualna datoteka prolazi provjeru, a datoteka s pogrešnim zbrojem ne prolazi',async()=>{
      const dialog=page.getByRole('dialog');
      await dialog.getByRole('button',{name:'Zatvori',exact:true}).click();
      const liveMonth=testInfo.project.name==='desktop-chromium'?'04':'05';
      await withReportFixture(async db=>{
        const seeded=await db.query(`
          INSERT INTO attendance_days (
            organization_id, worker_id, work_date, shift_snapshot, check_in, check_out,
            break_minutes, worked_minutes, planned_minutes, status, calculation_version
          ) SELECT w.organization_id, w.id, $2::date, '{}', $2::date + time '06:00',
            $2::date + time '14:00', 30, 450, 450, 'complete', 'legacy-unversioned'
          FROM workers w JOIN organizations o ON o.id = w.organization_id
          WHERE w.id = $1 AND o.name = 'BSS E2E d.o.o.'`,[stored.worker.id,`2032-${liveMonth}-10`]);
        expect(seeded.rowCount).toBe(1);
      });
      const filters=page.locator('.report-filter-bar');
      await filters.getByLabel('Mjesec — mjesec',{exact:true}).selectOption(liveMonth);
      await filters.getByRole('button',{name:'Primijeni',exact:true}).click();
      await expect(page.locator('.report-authoritative-preview')).toContainText(name);
      await page.getByRole('button',{name:'Tehnički CSV',exact:true}).click();
      await expect(dialog.getByLabel('Izvor podataka')).toHaveValue('current');
      const confirm=dialog.getByRole('button',{name:'Potvrdi i preuzmi',exact:true});
      const live=await completeReportDownload(watchReportDownload(page,'csv',()=>confirm.click()),'csv',null);
      const entry=page.locator(`[data-report-export-id="${live.id}"]`);
      await expect(entry).toContainText('Aktualni podaci');
      await entry.getByRole('button',{name:'Provjeri',exact:true}).click();
      await expect(dialog).toContainText('Datoteka je provjerena');
      await expect(dialog).toContainText('Nije primjenjivo');
      await expect(dialog).not.toContainText('NE PODUDARA SE');

      const damagedId=await withReportFixture(async db=>{
        // Add a separate synthetic fixture. Keep the original and export immutability intact.
        const copy=await db.query(`
          INSERT INTO report_exports (
            organization_id, created_by, report_type, filters, format, status, dataset_version,
            template_version, row_count, total_minutes, storage_key, checksum_sha256, expires_at,
            completed_at, content, mime_type, file_name, privacy_profile
          ) SELECT e.organization_id, e.created_by, e.report_type, e.filters, e.format, e.status,
            e.dataset_version, e.template_version, e.row_count, e.total_minutes, e.storage_key,
            e.checksum_sha256, e.expires_at, e.completed_at, e.content || decode('00','hex'),
            e.mime_type, e.file_name, e.privacy_profile
          FROM report_exports e JOIN organizations o ON o.id = e.organization_id
          WHERE e.id = $1 AND e.period_version_id IS NULL AND o.name = 'BSS E2E d.o.o.'
          RETURNING id`,[live.id]);
        expect(copy.rowCount).toBe(1);
        return copy.rows[0].id;
      });
      await page.reload();
      await page.waitForFunction(()=>window.BSS_API_ACTIVE===true);
      await page.evaluate(()=>window.navigate('reports'));
      const damaged=page.locator(`[data-report-export-id="${damagedId}"]`);
      await damaged.getByRole('button',{name:'Provjeri',exact:true}).click();
      await expect(dialog).toContainText('Izvoz nije potvrđen');
      await expect(dialog).toContainText('NE PODUDARA SE');
    });

  });
});

const apiPath=url=>new URL(url).pathname;
const exportPath='/api/v1/report-exports';
const mePath='/api/v1/me';

test.describe('uzastopni izvoz CSV → PDF',()=>{
  test.use({serviceWorkers:'block'});
  for(const confirmWhilePending of [true,false]){
    const name=confirmWhilePending?'PDF potvrđen dok GET /me čeka':'GET /me završi dok je PDF dijalog otvoren';
    test(name,async({page},testInfo)=>{
      const errors=trackErrors(page);
      await login(page);
      const year=confirmWhilePending?2034:2035;
      const month=(testInfo.project.name==='desktop-chromium'?1:2)+2*testInfo.retry;
      const periodVersionId=await saveReportPeriod(page,year,month);
      await page.evaluate(()=>window.navigate('reports'));
      const filters=page.locator('.report-filter-bar');
      await filters.getByLabel('Mjesec — godina',{exact:true}).fill(String(year));
      const formattedMonth=String(month).padStart(2,'0');
      const from=`${year}-${formattedMonth}-01`;
      await filters.getByLabel('Mjesec — mjesec',{exact:true}).selectOption(formattedMonth);
      const preview=page.waitForResponse(response=>apiPath(response.url())==='/api/v1/report-previews'
        &&response.request().method()==='POST'&&response.request().postDataJSON().periodFrom===from);
      await filters.getByRole('button',{name:'Primijeni',exact:true}).click();
      expect((await preview).status(),'Actual report preview HTTP status').toBe(200);
      await expect(page.locator('.report-authoritative-preview')).toContainText(from);
      await expect(page.locator('.report-authoritative-preview')).toContainText('Nema podataka za odabrane kriterije.');

      const csvConfirm=await openSavedExport(page,'Tehnički CSV',periodVersionId);
      let release,markRequested;
      const gate=new Promise(resolve=>{release=resolve;});
      const requested=new Promise(resolve=>{markRequested=resolve;});
      const matchMe=url=>apiPath(url)===mePath;
      const hold=async route=>{markRequested();await gate;await route.continue();};
      await page.route(matchMe,hold,{times:1});

      const posts=[];
      const trackPost=request=>{
        if(apiPath(request.url())===exportPath&&request.method()==='POST')posts.push(request.postDataJSON().format);
      };
      page.on('request',trackPost);
      try{
        const csv=await completeReportDownload(watchReportDownload(page,'csv',()=>csvConfirm.click()),'csv',periodVersionId);
        await requested;
        const newCsv=page.locator(`[data-report-export-id="${csv.id}"]`);
        await expect(newCsv).toHaveCount(0);
        const pdfConfirm=await openSavedExport(page,'Preuzmi PDF',periodVersionId);
        let pdfDownload;
        if(confirmWhilePending){
          pdfDownload=watchReportDownload(page,'pdf',()=>pdfConfirm.click());
          await pdfDownload.action;
        }
        release();
        await expect(newCsv,'Povijest se mora osvježiti zapisom iz upravo preuzetog CSV-a').toContainText('Spremljena verzija');
        if(!confirmWhilePending){
          await expect(pdfConfirm,'Otvoren PDF dijalog mora preživjeti osvježavanje CSV-a').toBeVisible();
          await expect(pdfConfirm).toBeEnabled();
          pdfDownload=watchReportDownload(page,'pdf',()=>pdfConfirm.click());
        }

        await expect.poll(()=>posts.filter(format=>format==='pdf').length,{
          message:'Potvrđeni PDF mora poslati točno jedan POST',timeout:7_000
        }).toBe(1);
        const pdf=await completeReportDownload(pdfDownload,'pdf',periodVersionId);
        expect(pdf.id).not.toBe(csv.id);
        await expect(page.locator(`[data-report-export-id="${pdf.id}"]`)).toContainText(periodVersionId);
        expect(posts).toEqual(['csv','pdf']);
        expect(errors).toEqual([]);
      }finally{
        release();
        await page.unroute(matchMe,hold);
        page.off('request',trackPost);
      }
    });
  }
});

async function saveReportPeriod(page,year,month){
  return page.evaluate(async path=>{
    let response=await fetch(path);
    if(!response.ok)throw new Error(`Period returned ${response.status}`);
    let period=await response.json();
    for(const action of ['review','finalize']){
      response=await fetch(`${path}/${action}`,{
        method:'POST',
        headers:{'Content-Type':'application/json','If-Match':`"${period.revision}"`,'Idempotency-Key':crypto.randomUUID()},
        body:JSON.stringify({reason:`Ogledni korak: ${action}`})
      });
      if(!response.ok)throw new Error(`Transition ${action} returned ${response.status}`);
      period=await response.json();
    }
    return period.datasetVersion;
  },`/api/v1/attendance-periods/${year}/${month}`);
}

async function openSavedExport(page,button,periodVersionId){
  await page.getByRole('button',{name:button,exact:true}).click();
  const dialog=page.getByRole('dialog');
  await dialog.getByLabel('Izvor podataka').selectOption('locked');
  const versions=dialog.getByRole('combobox',{name:'Spremljena verzija',exact:true});
  await expect(versions.locator('option')).toHaveCount(2);
  await versions.selectOption(periodVersionId);
  const confirm=dialog.getByRole('button',{name:'Potvrdi i preuzmi',exact:true});
  await expect(confirm).toBeEnabled();
  return confirm;
}

function watchReportDownload(page,format,confirm){
  const result=Promise.all([
    page.waitForResponse(response=>apiPath(response.url())===exportPath
      &&response.request().method()==='POST'&&response.request().postDataJSON().format===format),
    page.waitForEvent('download')
  ]);
  // Early assertions should still report the missing request when a download never starts.
  void result.catch(()=>{});
  return {result,action:confirm()};
}

async function completeReportDownload({result,action},format,periodVersionId){
  await action;
  const [response,download]=await result;
  expect(response.status()).toBe(202);
  expect(response.request().postDataJSON().periodVersionId??null).toBe(periodVersionId);
  const info=await response.json();
  expect(info).toMatchObject({periodVersionId,format,status:'ready'});
  expect(download.suggestedFilename().endsWith(`.${format}`)).toBe(true);
  expect(await download.failure()).toBeNull();
  const bytes=await readFile(await download.path());
  const signature=format==='csv'?Buffer.from([0xef,0xbb,0xbf]):Buffer.from('%PDF');
  expect(bytes.subarray(0,signature.length)).toEqual(signature);
  expect(createHash('sha256').update(bytes).digest('hex')).toBe(info.checksumSha256);
  return info;
}

async function withReportFixture(run){
  const connectionString=process.env.DATABASE_URL;
  const database=new URL(connectionString);
  expect(process.env.NODE_ENV==='test'&&database.hostname==='127.0.0.1',
    'Report fixture requires a disposable loopback PostgreSQL test database').toBe(true);
  const {Client}=require('../../backend/node_modules/pg');
  const db=new Client({connectionString});
  await db.connect();
  try{return await run(db);}
  finally{await db.end();}
}

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
async function assertTerminalRotation(page,pending){
    const paired=await page.evaluate(async activationCode=>{
      const response=await fetch('/api/v1/terminals/pair',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:'E2E rotation terminal',location:'Isolated test',activationCode})});
      const data=await response.json();data.deviceCredential='';return response.ok;
    },process.env.TERMINAL_ACTIVATION_CODE);
    expect(paired).toBe(true);
    await expect.poll(()=>[...pending].map(([request,status])=>({path:new URL(request.url()).pathname,status})),{message:'API requests must finish before explicit reload'}).toEqual([]);
    await page.reload();
    await page.waitForFunction(()=>window.BSS_API_ACTIVE===true);
    await expect(page.locator('#content .screen')).toBeVisible();
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
    await expect.poll(()=>[...pending].map(([request,status])=>({path:new URL(request.url()).pathname,status})),{message:'API requests must finish before explicit reload'}).toEqual([]);
    await page.reload();
    await page.waitForFunction(()=>window.BSS_API_ACTIVE===true);
    await expect(page.locator('#content .screen')).toBeVisible();
    await expect(page.locator('#terminalCredential')).toHaveCount(0);
}
