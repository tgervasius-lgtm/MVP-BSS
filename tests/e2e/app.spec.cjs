/* global state */
const {test,expect}=require('@playwright/test');
const {AxeBuilder}=require('@axe-core/playwright');

test.beforeEach(async({page})=>{
  await page.addInitScript(()=>{
    const nativeFetch=globalThis.fetch.bind(globalThis);
    globalThis.fetch=(input,init)=>{
      const requestUrl=typeof input==='string'||input instanceof URL?String(input):input.url;
      const url=new URL(requestUrl,globalThis.location.href);
      const method=(init?.method||(typeof input==='object'&&input?.method)||'GET').toUpperCase();
      if(method==='GET'&&url.origin===globalThis.location.origin&&url.pathname==='/api/v1/me'){
        return Promise.resolve(new Response(JSON.stringify({
          code:'DEMO_MODE',
          message:'Frontend-only E2E nema backend sesiju.'
        }),{status:404,headers:{'Content-Type':'application/json'}}));
      }
      return nativeFetch(input,init);
    };
  });
});

function trackErrors(page){
  const errors=[];
  page.on('pageerror',error=>errors.push(`page: ${error.message}`));
  page.on('console',message=>{if(message.type()==='error')errors.push(`console: ${message.text()}`);});
  page.on('requestfailed',request=>errors.push(`request: ${request.url()} · ${request.failure()?.errorText||'failed'}`));
  return errors;
}

async function loginAs(page,role){
  await page.goto('/');
  await page.locator('#loginRole').selectOption(role);
  await page.locator('[data-bss-action="login()"]').click();
  await page.locator('#content .screen').waitFor({state:'visible'});
}

async function seriousAxeViolations(page){
  const result=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa']).analyze();
  return result.violations.filter(violation=>['serious','critical'].includes(violation.impact));
}

for(const role of ['admin','manager','worker','accountant']){
  test(`${role} otvara svaki dopušteni ekran bez greške i overflowa`,async({page})=>{
    const errors=trackErrors(page);
    await loginAs(page,role);
    const screens=await page.evaluate(()=>window.allowedScreens());
    expect(screens.length).toBeGreaterThanOrEqual(3);
    for(const screen of screens){
      await page.evaluate(value=>window.navigate(value),screen);
      await expect(page.locator('#content .screen')).toBeVisible();
      const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
      expect(overflow,`${role}/${screen} ima horizontalni overflow`).toBeLessThanOrEqual(1);
    }
    const restricted=await page.evaluate(()=>({
      workers:window.allowedScreens().includes('workers'),
      settings:window.allowedScreens().includes('settings'),
      roles:window.allowedScreens().includes('roles')
    }));
    if(role==='worker'||role==='accountant')expect(restricted).toEqual({workers:false,settings:false,roles:false});
    expect(errors).toEqual([]);
  });
}

test('admin vidi cijelu firmu, a radnik samo svoj godišnji kalendar',async({page})=>{
  await loginAs(page,'admin');
  await page.evaluate(()=>window.navigate('vacations'));
  await expect(page.locator('.section-title h1')).toHaveText('Godišnji');
  await expect(page.locator('.department-capacity-table')).toBeVisible();
  await expect(page.locator('.vacation-balance-table')).toContainText('Marko Marić');
  await page.evaluate(()=>window.logout());
  await page.locator('#loginRole').selectOption('worker');
  await page.locator('[data-bss-action="login()"]').click();
  await page.evaluate(()=>window.navigate('vacations'));
  await expect(page.locator('.section-title h1')).toHaveText('Moj godišnji');
  await expect(page.locator('.department-capacity-table,.vacation-balance-table,.calendar-filter')).toHaveCount(0);
  await expect(page.locator('#content')).not.toContainText('Marko Marić');
  await expect(page.locator('#content')).not.toContainText('Petra Novak');
  await expect(page.locator('.personal-requests-table thead')).not.toContainText('Radnik');
});

test('operativni pregled koristi četiri pokazatelja, tablice i XLSX kao glavni izvoz',async({page})=>{
  await loginAs(page,'admin');
  await expect(page.locator('.home-summary-strip .home-summary-item')).toHaveCount(4);
  await expect(page.locator('.weekly-chart')).toHaveCount(0);
  await expect(page.locator('.weekly-attendance-table tbody tr')).toHaveCount(5);
  for(const [screen,selector] of [
    ['workers','.workers-table'],
    ['shifts','.shifts-table'],
    ['requests','.requests-table'],
    ['corrections','.corrections-table'],
    ['audit','.audit-table']
  ]){
    await page.evaluate(value=>window.navigate(value),screen);
    await expect(page.locator(selector)).toBeVisible();
  }
  await page.evaluate(()=>window.navigate('vacations'));
  await expect(page.locator('.year-calendar .month-card')).toHaveCount(12);
  await expect(page.locator('.vacation-summary-card')).toHaveCount(0);
  await expect(page.locator('.department-capacity-table')).toBeVisible();
  await page.evaluate(()=>window.navigate('reports'));
  const exportButtons=page.locator('.report-export .btns button');
  await expect(exportButtons.nth(0)).toContainText('XLSX');
  await expect(exportButtons.nth(1)).toContainText('PDF');
  await expect(exportButtons.nth(2)).toContainText('Tehnički CSV');
});

test('radnik ima osobni mjesečni pregled i stanje godišnjeg s pripadajućim akcijama',async({page})=>{
  await loginAs(page,'worker');
  await page.evaluate(()=>window.navigate('mytime'));
  await expect(page.locator('.mytime-summary-card')).toBeVisible();
  await expect(page.getByRole('combobox',{name:'Mjesec — mjesec',exact:true})).toBeVisible();
  await expect(page.getByRole('spinbutton',{name:'Mjesec — godina',exact:true})).toBeVisible();
  await expect(page.locator('.mytime-summary-grid>button>span')).toHaveText(['Odrađeno','Planirano','Saldo','Za provjeru']);
  await page.locator('.mytime-summary-grid').getByRole('button',{name:/Odrađeno/}).click();
  await expect(page.locator('#myTimeRecords')).toBeFocused();
  await expect(page.locator('.attendance-kpis')).toHaveCount(0);
  await expect(page.locator('#corrDate')).toBeVisible();
  await expect(page.getByRole('button',{name:'Pošalji zahtjev',exact:true})).toBeVisible();
  expect(await seriousAxeViolations(page)).toEqual([]);

  await page.evaluate(()=>window.navigate('vacations'));
  await expect(page.locator('.vacation-balance-visual')).toHaveAttribute('aria-label',/iskorišteno.*planirano.*raspoloživo/);
  await expect(page.locator('.vacation-balance-grid>button>span')).toHaveText(['Iskorišteno','Planirano','Preostalo','Raspoloživo']);
  await expect(page.locator('.vacation-summary-card,.vacation-balance-table')).toHaveCount(0);
  expect(await seriousAxeViolations(page)).toEqual([]);
  await page.locator('.vacation-balance-grid').getByRole('button',{name:/Planirano/}).click();
  await expect(page.locator('.request-tabs button.active')).toContainText('Na čekanju');
  await expect(page.locator('#content')).not.toContainText('Marko Marić');
});

test('četiri dashboard KPI-ja otvaraju točne filtrirane preglede',async({page})=>{
  await loginAs(page,'admin');
  await page.locator('[data-kpi="present"]').click();
  await expect(page.locator('.tabs .active')).toContainText('Prisutni');
  await page.evaluate(()=>window.navigate('home'));
  await page.locator('[data-kpi="review"]').click();
  await expect(page.locator('.attendance-tabs button.active')).toContainText('Za provjeru');
  await page.evaluate(()=>window.navigate('home'));
  await page.locator('[data-kpi="absent"]').click();
  await expect(page.locator('.tabs .active')).toContainText('Odsutni danas');
  await page.evaluate(()=>window.navigate('home'));
  await page.locator('[data-kpi="pending"]').click();
  await expect(page.locator('.request-tabs button.active')).toContainText('Na čekanju');
});

test('zajednički godišnji prikazuje samo odobrena razdoblja bez privatnih podataka',async({page})=>{
  await loginAs(page,'admin');
  await page.evaluate(()=>window.navigate('sharedLeave'));
  await expect(page.locator('.section-title h1')).toHaveText('Kalendar');
  await expect(page.locator('.scope-switch button')).toHaveCount(3);
  await page.getByRole('button',{name:'Organizacija',exact:true}).click();
  await expect(page.locator('.shared-leave-table tbody tr')).toHaveCount(5);
  await expect(page.locator('.shared-leave-table th')).toHaveCount(3);
  const content=await page.locator('#content').innerText();
  expect(content).not.toMatch(/Obiteljski odmor|Privatne obveze|Glavni godišnji|Bolovanje/);
  expect(await seriousAxeViolations(page)).toEqual([]);
});

test('tema i svih sedam CSS slojeva rade nakon ponovnog učitavanja',async({page})=>{
  await loginAs(page,'admin');
  await page.evaluate(()=>window.toggleTheme());
  await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
  const css=await page.evaluate(()=>{
    const imported=[];
    for(const sheet of document.styleSheets){
      for(const rule of [...sheet.cssRules]){
        if(rule.styleSheet?.href)imported.push(new URL(rule.styleSheet.href).pathname);
      }
    }
    return {
      imported,
      accent:getComputedStyle(document.documentElement).getPropertyValue('--bss-color-accent-text').trim(),
      legacy:getComputedStyle(document.documentElement).getPropertyValue('--teal').trim()
    };
  });
  for(const layer of ['base','layouts','components','screens','navigation','themes','responsive']){
    expect(css.imported).toContain(`/styles/${layer}.css`);
  }
  expect(css.accent).not.toBe('');
  expect(css.legacy).toBe('');
});

for(const theme of ['light','dark']){
test(`ključne aplikacijske stranice nemaju ozbiljne axe povrede (${theme})`,async({page})=>{
  await page.addInitScript(value=>localStorage.setItem('bss-theme-v1',value),theme);
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-theme',theme);
  expect(await seriousAxeViolations(page)).toEqual([]);
  await page.locator('#loginRole').selectOption('admin');
  await page.locator('[data-bss-action="login()"]').click();
  await page.locator('#content .screen').waitFor({state:'visible'});
  expect(await seriousAxeViolations(page)).toEqual([]);
});

test(`Design System i Brand Book učitavaju se bez ozbiljnih axe povreda (${theme})`,async({page})=>{
  await page.addInitScript(value=>localStorage.setItem('bss-theme-v1',value),theme);
  await page.goto('/design-system/');
  await expect(page.locator('html')).toHaveAttribute('data-theme',theme);
  await expect(page.locator('h1')).toHaveText('BSS Design System v1.0');
  expect(await seriousAxeViolations(page)).toEqual([]);
  await page.goto('/brand-book/');
  await expect(page.locator('h1')).toHaveText('Jasan sustav za stvaran rad.');
  expect(await seriousAxeViolations(page)).toEqual([]);
});
}

test('pomoć se skriva, pamti, ponovno otvara i vraća uz tipkovnicu',async({page})=>{
  const errors=trackErrors(page);
  await loginAs(page,'worker');
  await expect(page.locator('.screen-help p')).toBeVisible();
  await page.getByRole('button',{name:'Sakrij kratku uputu za ovaj ekran'}).click();
  await expect(page.locator('.screen-help p')).toHaveCount(0);
  await page.reload();
  await page.locator('#loginRole').selectOption('worker');
  await page.locator('[data-bss-action="login()"]').click();
  await expect(page.locator('.screen-help p')).toHaveCount(0);
  const opener=page.getByRole('button',{name:'Pomoć za ovaj ekran'});
  await opener.click();
  await expect(page.locator('#modal')).toHaveAttribute('aria-hidden','false');
  expect(await seriousAxeViolations(page)).toEqual([]);
  await page.keyboard.press('Escape');
  await expect(opener).toBeFocused();
  await opener.click();
  await page.getByRole('button',{name:'Prikaži kratku uputu'}).click();
  await expect(page.locator('.screen-help p')).toBeVisible();
  await expect(opener).toBeFocused();
  expect(await seriousAxeViolations(page)).toEqual([]);
  expect(errors).toEqual([]);
});

test('korekcija traži obrazloženje i prikazuje odgovor radniku',async({page})=>{
  await loginAs(page,'admin');
  // This synthetic fixture belongs to the worker used in the second half.
  await page.evaluate(()=>{state.corrections.find(item=>item.id===1).workerId=1;window.render();});
  await page.evaluate(()=>window.navigate('corrections'));
  await page.locator('[data-bss-action="openCorrectionDecision(1,\'Odbijeno\')"]').click();
  await page.getByRole('button',{name:'Potvrdi odbijanje'}).click();
  await expect(page.locator('#correctionDecisionNote')).toBeFocused();
  await page.locator('#correctionDecisionNote').fill('Vrijeme odjave treba potvrditi s voditeljem.');
  expect(await seriousAxeViolations(page)).toEqual([]);
  await page.getByRole('button',{name:'Potvrdi odbijanje'}).click();
  await page.evaluate(()=>{window.switchRole('worker');window.navigate('corrections');});
  await expect(page.locator('[data-correction-id="1"]')).toContainText('Vrijeme odjave treba potvrditi s voditeljem.');
  await expect(page.locator('[data-correction-id="1"]')).toContainText('Odbijeno');
  expect(await seriousAxeViolations(page)).toEqual([]);
});

test('osobni sandučić ima filtre, čitljiv prikaz i pristup samo dopuštenim ulogama',async({page})=>{
  const errors=trackErrors(page);await loginAs(page,'worker');await page.evaluate(()=>window.navigate('documents'));
  await expect(page.locator('.section-title h1')).toHaveText('Moji dokumenti');
  await expect(page.locator('.document-row')).toHaveCount(2);
  await expect(page.getByRole('button',{name:'Novi dokument'})).toHaveCount(0);
  await page.getByLabel('Vrsta dokumenta').selectOption('contract');await page.getByRole('button',{name:'Primijeni',exact:true}).click();
  await expect(page.locator('.document-row')).toHaveCount(1);await expect(page.locator('.document-row')).toContainText('Ugovor o radu');
  expect(await seriousAxeViolations(page)).toEqual([]);
  await page.evaluate(()=>{window.switchRole('manager');window.navigate('documents');});
  await expect(page.locator('.section-title h1')).not.toHaveText('Moji dokumenti');expect(errors).toEqual([]);
});

test.describe('document API UI fixture',()=>{
// Browser routing cannot intercept requests made by the service worker.
// Keep normal service-worker coverage in the separate application tests.
test.use({serviceWorkers:'block'});
test('dokument API sučelje: primatelj, nacrt, potvrda objave i preuzimanje PDF-a',async({page})=>{
  const errors=trackErrors(page);const docs=[];const id='00000000-0000-4000-8000-000000000010';const worker='00000000-0000-4000-8000-000000000005';
  await page.route(/\/api\/v1\/documents(?:[/?].*)?$/,async route=>{
    const req=route.request(),path=new URL(req.url()).pathname;let data;
    if(path.endsWith('/config'))data={enabled:true,maxBytes:5242880};
    else if(path.endsWith('/recipients'))data={items:[{id:worker,name:'Synthetic Worker',code:'W-1'}]};
    else if(path.endsWith('/publish')){expect(req.headers()['if-match']).toBe('"1"');expect(req.postDataJSON()).toEqual({confirmed:true});docs[0].state='published';docs[0].revision='2';data=docs[0];}
    else if(path.endsWith('/download')){await route.fulfill({status:200,contentType:'application/pdf',headers:{'content-disposition':'attachment; filename="BSS-fixture.pdf"'},body:'%PDF-1.4\nfixture\n%%EOF'});return;}
    else if(req.method()==='POST'){const body=req.postDataJSON();expect(body.workerId).toBe(worker);expect(body.period).toBe('2026-10');docs.push({...body,id,workerName:'Synthetic Worker',workerCode:'W-1',state:'draft',revision:'1',bytes:25,createdAt:'2026-10-06T10:00:00Z',publishedAt:null});data=docs[0];}
    else data={items:docs,nextCursor:null};
    await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(data)});
  });
  await loginAs(page,'accountant');
  await page.evaluate(()=>{state.demoMode=false;window.navigate('documents');});
  await page.getByRole('button',{name:'Novi dokument'}).click();
  await page.getByLabel('Traži primatelja po imenu ili šifri').fill('Synthetic');await page.getByRole('button',{name:'Pronađi radnika'}).click();
  await page.getByRole('combobox',{name:'Primatelj',exact:true}).selectOption(worker);await page.getByLabel('Naziv dokumenta').fill('Platna lista 10/2026');
  await page.getByRole('combobox',{name:'Mjesec (obvezno za platnu listu) — mjesec',exact:true}).selectOption('10');
  await page.getByRole('spinbutton',{name:'Mjesec (obvezno za platnu listu) — godina',exact:true}).fill('2026');
  await page.getByLabel('PDF datoteka').setInputFiles({name:'fixture.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF-1.4\nfixture\n%%EOF')});
  expect(await seriousAxeViolations(page)).toEqual([]);await page.getByRole('button',{name:'Spremi nacrt'}).click();
  await expect(page.locator('.document-row')).toContainText('Nacrt');
  await page.getByRole('button',{name:'Pregledaj i objavi'}).click();await expect(page.locator('#modal')).toContainText('Synthetic Worker · W-1');
  expect(await seriousAxeViolations(page)).toEqual([]);await page.getByRole('button',{name:'Potvrdi objavu'}).click();
  await expect(page.locator('.document-row')).toContainText('Objavljeno');
  const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:/Preuzmi PDF/}).click();const download=await downloadPromise;expect(download.suggestedFilename()).toBe('BSS-fixture.pdf');
  expect(errors).toEqual([]);
});
});

test('design audit: localized month, visible decisions and readable terminal in both themes',async({page},testInfo)=>{
  await loginAs(page,'worker');
  await expect(page.locator('.worker-summary-card')).toContainText('11 dana');
  await expect(page.locator('.topbar-meta')).toContainText('Demo datum: 10. 07. 2026.');
  await page.evaluate(()=>window.navigate('mytime'));
  await expect(page.getByRole('combobox',{name:'Mjesec — mjesec',exact:true})).toHaveValue('07');
  await page.getByRole('combobox',{name:'Mjesec — mjesec',exact:true}).selectOption({label:'lipanj'});
  await expect(page.locator('.mytime-summary-head h2')).toContainText('lipanj 2026.');
  await expect(page.locator('#myTimeMonth')).toHaveValue('2026-06');
  expect(await seriousAxeViolations(page)).toEqual([]);
  await page.screenshot({path:testInfo.outputPath('worker-localized.png')});
  await page.evaluate(()=>{window.switchRole('admin');window.navigate('requests');});
  const action=page.locator('.requests-table [data-bss-action^="openRequestDecision"]').first();
  const box=await action.boundingBox();expect(box).not.toBeNull();
  expect(box.x).toBeGreaterThanOrEqual(0);expect(box.x+box.width).toBeLessThanOrEqual(page.viewportSize().width);
  await action.click();await expect(page.locator('.request-decision-modal')).toBeVisible();
  await page.getByRole('button',{name:'Odustani',exact:true}).click();
  await page.screenshot({path:testInfo.outputPath('requests-actions.png')});
  await page.evaluate(()=>window.navigate('terminal'));
  for(const theme of ['light','dark']){
    await page.evaluate(value=>{if(document.documentElement.dataset.theme!==value)window.toggleTheme();},theme);
    // Audit settled theme colors, not intermediate CSS-transition frames.
    await expect.poll(()=>page.evaluate(()=>document.getAnimations().filter(animation=>animation.constructor.name==='CSSTransition'&&animation.playState==='running').length)).toBe(0);
    const colors=await page.locator('.terminal-summary-card h2').evaluate(el=>({text:getComputedStyle(el).color,background:getComputedStyle(el.closest('.card')).backgroundColor}));
    expect(colors.text).not.toBe(colors.background);
    expect(await seriousAxeViolations(page)).toEqual([]);
    await page.screenshot({path:testInfo.outputPath(`terminal-${theme}.png`)});
  }
});
