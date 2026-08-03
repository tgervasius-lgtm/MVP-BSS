const {test,expect}=require('@playwright/test');
const {AxeBuilder}=require('@axe-core/playwright');

function trackErrors(page){
  const errors=[];
  page.on('pageerror',error=>errors.push(`page: ${error.message}`));
  page.on('console',message=>{if(message.type()==='error')errors.push(`console: ${message.text()}`);});
  page.on('requestfailed',request=>errors.push(`request: ${request.url()} · ${request.failure()?.errorText||'failed'}`));
  return errors;
}

async function seriousAxeViolations(page){
  const result=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa']).analyze();
  return result.violations.filter(violation=>['serious','critical'].includes(violation.impact));
}

async function startPreview(page){
  await page.goto('/preview/');
  await page.getByRole('button',{name:'Otvori demo sustav'}).click();
  await expect(page.locator('#demoView')).toBeVisible({timeout:7000});
  await expect(page.locator('#guideTitle')).toBeFocused();
}

async function openAdminTerminals(page){
  await page.getByRole('button',{name:'Uprava',exact:true}).click();
  await page.locator('#adminTerminalsTab').click();
  await expect(page.locator('#adminTerminalsPanel')).toBeVisible();
}

async function openAdminRecords(page){
  await page.getByRole('button',{name:'Uprava',exact:true}).click();
  await page.locator('#adminRecordsTab').click();
  await expect(page.locator('#adminRecordsPanel')).toBeVisible();
}

async function expectNoHorizontalOverflow(page){
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
  expect(overflow,'Preview Portal ima horizontalni overflow').toBeLessThanOrEqual(1);
}

test('otvoreni sandbox izvršava mogućnosti bilo kojim redom i ostaje dostupan nakon sažetka',async({page})=>{
  const errors=trackErrors(page);
  await startPreview(page);
  await expectNoHorizontalOverflow(page);

  await page.getByRole('button',{name:'Knjigovodstvo',exact:true}).click();
  await expect(page.locator('#generateReportButton')).toBeEnabled();
  await page.locator('#generateReportButton').click();
  await expect(page.locator('#accountingView')).toBeVisible();
  await expect(page.locator('#reportPreview')).toBeVisible();

  await page.getByRole('button',{name:'Voditelj',exact:true}).click();
  await page.locator('#managerRequestsTab').click();
  await page.locator('#approveLeaveButton').click();
  await expect(page.locator('#managerView')).toBeVisible();

  await openAdminRecords(page);
  await page.locator('#resolveCorrectionButton').click();
  await expect(page.locator('#adminView')).toBeVisible();

  await page.getByRole('button',{name:'Radnik',exact:true}).click();
  await page.locator('#workerLeaveTab').click();
  await page.locator('#workerLeaveRequestButton').click();
  await expect(page.locator('#workerView')).toBeVisible();

  await openAdminTerminals(page);
  await page.locator('#scanButton').click();
  await expect(page.locator('#presentCount')).toHaveText('48',{timeout:2500});

  await expect(page.locator('#completionView')).toBeVisible();
  await expect(page.locator('.business-summary')).toContainText('Ovako je BSS povezao jedan radni dan.');
  await expect(page.locator('.final-experience')).toContainText('Radni dan uspješno je prošao kroz BSS.');
  await expect(page.locator('.final-experience-steps li')).toHaveCount(5);
  await expect(page.locator('.role-switcher')).toBeVisible();
  await expect(page.locator('#adminView')).toBeVisible();
  await expect(page.locator('.role-button')).toHaveCount(4);
  await expect(page.locator('[data-role="director"]')).toHaveCount(0);
  await expect(page.locator('#guideProgressBar')).toHaveAttribute('aria-valuenow','5');
  await expectNoHorizontalOverflow(page);
  expect(await seriousAxeViolations(page)).toEqual([]);
  expect(errors).toEqual([]);
  await page.locator('#restartButton').click();
  await expect(page.locator('#completionView')).toBeHidden();
  await expect(page.locator('#guideTitle')).toBeFocused();
});

test('uloge i operativne radnje nisu zaključane niti prisilno mijenjaju prikaz',async({page})=>{
  await startPreview(page);
  await page.getByRole('button',{name:'Knjigovodstvo',exact:true}).click();

  const report=page.locator('#generateReportButton');
  await expect(report).toBeEnabled();
  await expect(report).not.toHaveAttribute('title',/Dovršite/);
  await report.click();
  await expect(page.locator('#accountingView')).toBeVisible();
  await expect(page.locator('#roleLabel')).toHaveText('Knjigovodstvo');
  await expect(page.locator('#guideProgressBar')).toHaveAttribute('aria-valuenow','1');
  await expect(page.locator('.toast')).toContainText('Pregled spreman');
});

test('pregled uz preporuke ostaje otvoren sandbox i ažurira sljedeću preporuku',async({page})=>{
  await page.goto('/preview/');
  await page.getByLabel('Pregled uz preporuke').check();
  await page.getByRole('button',{name:'Otvori demo sustav'}).click();

  await expect(page.locator('#guideDetails')).toHaveAttribute('open','');
  await expect(page.locator('#guideText')).toContainText(/RFID/i);
  await page.locator('#adminTerminalsTab').click();
  await page.locator('#scanButton').click();
  await expect(page.locator('#presentCount')).toHaveText('48',{timeout:2500});
  await expect(page.locator('#guideText')).toContainText(/korekciju/i);

  await page.getByRole('button',{name:'Knjigovodstvo',exact:true}).click();
  await expect(page.locator('#generateReportButton')).toBeEnabled();
});

test('reset tijekom RFID animacije prekida odgođenu radnju i vraća početne podatke',async({page})=>{
  await startPreview(page);
  await openAdminTerminals(page);
  await page.locator('#scanButton').click();
  await page.locator('#resetButton').click();
  await page.waitForTimeout(750);

  await expect(page.locator('#welcomeView')).toBeVisible();
  await expect(page.locator('#employeesInput')).toHaveValue('68');
  await expect(page.locator('#locationsInput')).toHaveValue('2');
  await expect(page.locator('#presentCount')).toHaveText('47');
  await expect(page.locator('#terminalScreen')).toContainText('Spremno za prijavu');
  await expect(page.locator('#ivanEvent')).toHaveCount(0);

  await page.getByRole('button',{name:'Otvori demo sustav'}).click();
  await expect(page.locator('#scanButton')).toBeEnabled({timeout:7000});
});

test('RFID očitavanje ostaje zaključano tijekom promjene uloge i potvrđuje se samo jednom',async({page})=>{
  await startPreview(page);
  await openAdminTerminals(page);
  await page.locator('#scanButton').click();
  await page.getByRole('button',{name:'Voditelj',exact:true}).click();
  await page.getByRole('button',{name:'Uprava',exact:true}).click();

  await expect(page.locator('#scanButton')).toBeDisabled();
  await expect(page.locator('#scanButton')).toHaveText(/očitava/i);
  await expect(page.locator('#terminalScreen')).toContainText('Očitavanje kartice');
  await expect(page.locator('#presentCount')).toHaveText('48',{timeout:2500});
  await expect(page.locator('.toast')).toHaveCount(1);
  await expect(page.locator('.toast')).toContainText('uspješno je evidentiran');
});

test('upravljački command center i sažeti feed ostaju povezani s RFID stanjem',async({page})=>{
  const errors=trackErrors(page);
  await startPreview(page);

  const commandCenter=page.locator('.command-center');
  await expect(commandCenter.locator('.attendance-ring')).toHaveAttribute('aria-label',/47 prisutnih, 3 kasni i 2 odsutnih od 52/);
  await expect(commandCenter.locator('button[data-kpi]')).toHaveCount(3);
  await expect(page.locator('#adminView .metrics')).toHaveCount(0);

  const lateButton=page.getByRole('button',{name:/Kasne: 3/});
  await lateButton.click();
  await expect(page.locator('.kpi-details')).toBeVisible();
  await expect(page.locator('#kpiDetailsTitle')).toHaveText(/Zaposlenici koji kasne/);
  await page.keyboard.press('Escape');
  await expect(lateButton).toBeFocused();

  const feed=page.locator('#activityFeed');
  await expect(feed.locator('.activity-event')).toHaveCount(3);
  await expect(feed.locator('.activity-event').first()).toContainText('Ivan Horvat');
  await expect(feed.locator('.activity-event').first()).toContainText('Čeka prijavu');

  await page.locator('#adminTerminalsTab').click();
  await page.locator('#scanButton').click();
  await expect(page.locator('#presentCount')).toHaveText('48',{timeout:2500});
  await expect(feed.locator('[data-actor="Ivan Horvat"]')).toHaveCount(1);
  await expect(page.locator('#ivanEvent')).toContainText('Prijava · Ulaz proizvodnje');
  await expect(page.locator('#ivanEvent')).not.toContainText('Čeka prijavu');
  await expect(commandCenter.locator('.attendance-ring')).toHaveAttribute('aria-label',/48 prisutnih, 2 kasni i 2 odsutnih od 52/);

  await expectNoHorizontalOverflow(page);
  expect(await seriousAxeViolations(page)).toEqual([]);
  expect(errors).toEqual([]);
});

test('odgođena RFID prijava ne vraća simulirani sat ni feed unatrag',async({page})=>{
  await startPreview(page);
  await expect(page.locator('#livingOfficeTime')).toHaveText('07:12',{timeout:7000});

  await openAdminTerminals(page);
  await page.locator('#scanButton').click();
  await expect(page.locator('#presentCount')).toHaveText('48',{timeout:2500});
  await expect(page.locator('#livingOfficeTime')).toHaveText('07:12');
  await expect(page.locator('#ivanEvent time')).toHaveText('07:12');

  const times=await page.locator('#activityFeed time').allTextContents();
  const newestFirst=[...times].sort((a,b)=>b.localeCompare(a));
  expect(times).toEqual(newestFirst);
  await expect(page.locator('#activityFeed .activity-event')).toHaveCount(5);
  await expectNoHorizontalOverflow(page);
});

test('rana RFID prijava ostaje vremenski usklađena nakon promjene uloge',async({page})=>{
  await startPreview(page);
  await openAdminTerminals(page);
  await page.locator('#scanButton').click();
  await expect(page.locator('#presentCount')).toHaveText('48',{timeout:2500});

  const arrivalTime=await page.locator('#ivanEvent time').textContent();
  await page.getByRole('button',{name:'Voditelj',exact:true}).click();
  await page.getByRole('button',{name:'Uprava',exact:true}).click();

  await expect(page.locator('#livingOfficeTime')).toHaveText(arrivalTime);
  await expect(page.locator('#activityFeed [data-actor="Ivan Horvat"]')).toHaveCount(1);
  const times=await page.locator('#activityFeed time').allTextContents();
  expect(times[0]).toBe(arrivalTime);
  expect(times).toEqual([...times].sort((a,b)=>b.localeCompare(a)));
  await expectNoHorizontalOverflow(page);
});

test('agregirani profil skalira KPI-jeve, tim i fond sati na granicama',async({page})=>{
  await page.goto('/preview/');
  await page.locator('#industryInput').selectOption('Ured');
  await page.locator('#employeesInput').fill('5');
  await page.locator('#locationsInput').fill('1');
  await page.locator('#shiftsInput').selectOption('1');
  await page.getByRole('button',{name:'Otvori demo sustav'}).click();

  await expect(page.locator('#plannedCount')).toContainText('4');
  await expect(page.locator('#lateCount')).toHaveText('1');
  await expect(page.locator('#absentCount')).toHaveText('1');
  await page.getByRole('button',{name:'Voditelj',exact:true}).click();
  await expect(page.locator('#managerTeamSize')).toHaveText('2');
  await expect(page.locator('#managerTeamRoster li:not([hidden])')).toHaveCount(2);
  await expect(page.locator('#managerTeamRoster li:not([hidden]) .roster-status')).toHaveText(['Prisutna','Prisutna']);
  await expect(page.locator('#managerTeamRoster li:not([hidden])').last()).toContainText('Ana Kovač');
  await expect(page.locator('#managerLeaveCoverage')).toHaveText('50%');
  await expect(page.locator('#managerPrimaryUnit')).toHaveText('Operativni tim');
  await expect(page.locator('#managerSecondaryUnit')).toHaveText('Podrška');
  await expect(page.locator('[data-manager-planned]')).toHaveText(['16 h','16 h','16 h']);
  await expect(page.locator('[data-manager-recorded]')).toHaveText(['15 h','16 h','15 h']);
  await page.getByRole('button',{name:'Radnik',exact:true}).click();
  await expect(page.locator('#workerContext')).toContainText('Uredski tim');
  await page.locator('#workerHoursTab').click();
  await expect(page.locator('#workerNightHours')).toHaveText('0 h');
  await page.getByRole('button',{name:'Knjigovodstvo',exact:true}).click();
  await expect(page.locator('#monthlyHours')).toHaveText('640');
  await expect(page.locator('#nightHours')).toHaveText('0');

  await page.locator('#resetButton').click();
  await page.locator('#employeesInput').fill('250');
  await page.locator('#locationsInput').fill('5');
  await page.locator('#shiftsInput').selectOption('4');
  await page.getByRole('button',{name:'Otvori demo sustav'}).click();
  await page.getByRole('button',{name:'Voditelj',exact:true}).click();
  await expect(page.locator('#managerTeamSize')).toHaveText('40');
  await page.getByRole('button',{name:'Knjigovodstvo',exact:true}).click();
  await expect(page.locator('#monthlyHours')).toHaveText(/32[.\s]?000/);
  await expectNoHorizontalOverflow(page);
});

test('radnički zahtjev i RFID kartica povezuju Radnika, Voditelja i Upravu',async({page})=>{
  const errors=trackErrors(page);
  await startPreview(page);

  await page.getByRole('button',{name:'Radnik',exact:true}).click();
  await expect(page.locator('.worker-today-card')).toContainText('Moj radni dan');
  await expect(page.locator('.worker-summary-card')).toHaveCount(4);
  await expect(page.locator('#reviewWorkerButton')).toHaveCount(0);
  await page.locator('#workerLeaveTab').click();
  await page.locator('#workerLeaveStart').fill('2026-08-11');
  await page.locator('#workerLeaveDays').selectOption('3');
  await page.locator('#workerLeaveRequestButton').click();
  await expect(page.locator('#workerLeaveRequestStatus')).toContainText('3 radna dana');
  await expect(page.locator('#workerLeaveRequestStatus')).toContainText('Čeka odluku Voditelja');

  await page.getByRole('button',{name:'Voditelj',exact:true}).click();
  await page.locator('#managerRequestsTab').click();
  await expect(page.locator('#workerLeaveManagerCard')).toBeVisible();
  await expect(page.locator('#managerWorkerLeaveDays')).toHaveText('3 radna dana');
  await page.locator('#approveWorkerLeaveButton').click();
  await expect(page.locator('#managerWorkerLeaveStatus')).toHaveText('Odobreno');

  await page.getByRole('button',{name:'Radnik',exact:true}).click();
  await expect(page.locator('#workerLeaveSummary')).toHaveText('odobreno');
  await expect(page.locator('#workerLeaveRequestStatus')).toContainText('Odobreno');

  await openAdminRecords(page);
  await page.locator('#replaceCardButton').click();
  await expect(page.locator('#adminWorkerCardCode')).toHaveText('BSS-7304');
  await expect(page.locator('#replaceCardButton')).toBeDisabled();
  await page.getByRole('button',{name:'Radnik',exact:true}).click();
  await expect(page.locator('#workerCardStatus')).toHaveText('Nova kartica aktivna');

  await page.locator('#resetButton').click();
  await expect(page.locator('#workerLeaveStart')).toHaveValue('2026-08-10');
  await expect(page.locator('#workerLeaveDays')).toHaveValue('2');

  await expectNoHorizontalOverflow(page);
  expect(await seriousAxeViolations(page)).toEqual([]);
  expect(errors).toEqual([]);
});

test('mobilni vodič je običan blok i odlazi sa sadržajem pri skrolanju',async({page})=>{
  await startPreview(page);
  const guide=page.locator('.guide-panel');
  await page.evaluate(()=>{
    document.documentElement.style.scrollBehavior='auto';
    window.scrollTo(0,0);
  });
  await expect.poll(()=>page.evaluate(()=>window.scrollY)).toBe(0);

  const before=await guide.evaluate(element=>({
    position:getComputedStyle(element).position,
    top:element.getBoundingClientRect().top
  }));
  const target=await page.evaluate(()=>Math.min(400,document.documentElement.scrollHeight-window.innerHeight));
  expect(before.position).toBe('static');
  expect(target).toBeGreaterThan(100);

  await page.evaluate(scrollTarget=>window.scrollTo(0,scrollTarget),target);
  await expect.poll(()=>page.evaluate(()=>window.scrollY)).toBeGreaterThanOrEqual(target-1);
  const after=await guide.evaluate(element=>({top:element.getBoundingClientRect().top,scrollY:window.scrollY}));
  expect(after.top).toBeLessThan(before.top-100);
  expect(Math.abs((before.top-after.top)-after.scrollY)).toBeLessThanOrEqual(1);
  await expectNoHorizontalOverflow(page);
});

test('320 px, tipkovnica i reduced motion ostaju upotrebljivi',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto('/preview/');
  await expectNoHorizontalOverflow(page);
  await page.locator('#skipToContent').focus();
  await expect(page.locator('#skipToContent')).toBeFocused();
  const motion=await page.locator('.panel').first().evaluate(element=>{
    const style=getComputedStyle(element);
    return {animation:parseFloat(style.animationDuration)||0,transition:parseFloat(style.transitionDuration)||0};
  });
  expect(motion.animation).toBeLessThanOrEqual(0.001);
  expect(motion.transition).toBeLessThanOrEqual(0.001);
  await page.getByRole('button',{name:'Otvori demo sustav'}).click();
  await expect(page.locator('#demoView')).toBeVisible({timeout:7000});
  const staticTime=await page.locator('#livingOfficeTime').textContent();
  await page.waitForTimeout(2700);
  await expect(page.locator('#livingOfficeTime')).toHaveText(staticTime);
  const compactLayout=await page.locator('.command-overview').evaluate(element=>({
    viewport:window.innerWidth,
    columns:getComputedStyle(element).gridTemplateColumns
  }));
  if(compactLayout.viewport<=380)expect(compactLayout.columns.trim().split(/\s+/)).toHaveLength(1);
  const exceptionOverflow=await page.locator('.attendance-exception').evaluateAll(elements=>elements.map(element=>element.scrollWidth-element.clientWidth));
  expect(exceptionOverflow.every(value=>value<=1)).toBe(true);

  await page.getByRole('button',{name:'Radnik',exact:true}).click();
  const workerLayout=await page.locator('.worker-quick-grid').evaluate(element=>({
    viewport:window.innerWidth,
    columns:getComputedStyle(element).gridTemplateColumns.trim().split(/\s+/).length
  }));
  if(workerLayout.viewport<=420)expect(workerLayout.columns).toBe(2);
  else expect(workerLayout.columns).toBeGreaterThanOrEqual(2);
  await page.locator('#workerTodayTab').focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('#workerHoursTab')).toBeFocused();
  await expect(page.locator('#workerHoursPanel')).toBeVisible();
  const workerOverflow=await page.locator('#workerView').evaluate(element=>element.scrollWidth-element.clientWidth);
  expect(workerOverflow).toBeLessThanOrEqual(1);
  await expectNoHorizontalOverflow(page);
  expect(await seriousAxeViolations(page)).toEqual([]);
});

test('Preview PWA ostaje dostupan nakon offline ponovnog učitavanja',async({page,context})=>{
  await page.goto('/preview/');
  await page.waitForFunction(()=>navigator.serviceWorker?.controller?.scriptURL.endsWith('/preview/sw.js'),null,{timeout:10000});
  const registration=await page.evaluate(async()=>{
    const current=await navigator.serviceWorker.getRegistration('./');
    return {scope:current?.scope,script:current?.active?.scriptURL};
  });
  expect(registration.scope).toMatch(/\/preview\/$/);
  expect(registration.script).toMatch(/\/preview\/sw\.js$/);

  const manifestResponse=await page.request.get('/preview/manifest.webmanifest');
  expect(manifestResponse.ok()).toBe(true);
  expect(manifestResponse.headers()['content-type']).toContain('application/manifest+json');

  const freshPage=await context.newPage();
  await context.setOffline(true);
  try{
    await freshPage.goto('/preview/',{waitUntil:'domcontentloaded'});
    await expect(freshPage.locator('#welcomeTitle')).toHaveText(/Otvorite vlastito BSS demo okruženje/);
    await expect(freshPage.getByRole('button',{name:'Otvori demo sustav'})).toBeEnabled();
  }finally{
    await context.setOffline(false);
    await freshPage.close();
  }
});
