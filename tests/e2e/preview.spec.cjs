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

  await page.getByRole('button',{name:'Voditelj',exact:true}).click();
  await page.locator('#approveLeaveButton').click();
  await expect(page.locator('#managerView')).toBeVisible();

  await page.getByRole('button',{name:'Administrator',exact:true}).click();
  await page.locator('#resolveCorrectionButton').click();
  await expect(page.locator('#adminView')).toBeVisible();

  await page.getByRole('button',{name:'Radnik',exact:true}).click();
  await page.locator('#reviewWorkerButton').click();
  await expect(page.locator('#workerView')).toBeVisible();

  await page.getByRole('button',{name:'Direktor',exact:true}).click();
  await page.locator('#scanButton').click();
  await expect(page.locator('#presentCount')).toHaveText('48',{timeout:2500});

  await expect(page.locator('#completionView')).toBeVisible();
  await expect(page.locator('.business-summary')).toContainText('Ovako je BSS povezao jedan radni dan.');
  await expect(page.locator('.final-experience')).toContainText('Radni dan uspješno je prošao kroz BSS.');
  await expect(page.locator('.final-experience-steps li')).toHaveCount(5);
  await expect(page.locator('.role-switcher')).toBeVisible();
  await expect(page.locator('#directorView')).toBeVisible();
  await expect(page.locator('#guideProgressBar')).toHaveAttribute('aria-valuenow','5');
  await expectNoHorizontalOverflow(page);
  expect(await seriousAxeViolations(page)).toEqual([]);
  expect(errors).toEqual([]);
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
  await expect(page.locator('.toast')).toContainText('Izvještaj spreman');
});

test('pregled uz preporuke ostaje otvoren sandbox i ažurira sljedeću preporuku',async({page})=>{
  await page.goto('/preview/');
  await page.getByLabel('Pregled uz preporuke').check();
  await page.getByRole('button',{name:'Otvori demo sustav'}).click();

  await expect(page.locator('#guideDetails')).toHaveAttribute('open','');
  await expect(page.locator('#guideText')).toContainText(/RFID/i);
  await page.locator('#scanButton').click();
  await expect(page.locator('#presentCount')).toHaveText('48',{timeout:2500});
  await expect(page.locator('#guideText')).toContainText(/korekciju/i);

  await page.getByRole('button',{name:'Knjigovodstvo',exact:true}).click();
  await expect(page.locator('#generateReportButton')).toBeEnabled();
});

test('reset tijekom RFID animacije prekida odgođenu radnju i vraća početne podatke',async({page})=>{
  await startPreview(page);
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
  await page.locator('#scanButton').click();
  await page.getByRole('button',{name:'Administrator',exact:true}).click();
  await page.getByRole('button',{name:'Direktor',exact:true}).click();

  await expect(page.locator('#scanButton')).toBeDisabled();
  await expect(page.locator('#scanButton')).toHaveText(/očitava/i);
  await expect(page.locator('#terminalScreen')).toContainText('Očitavanje kartice');
  await expect(page.locator('#presentCount')).toHaveText('48',{timeout:2500});
  await expect(page.locator('.toast')).toHaveCount(1);
  await expect(page.locator('.toast')).toContainText('uspješno je evidentiran');
});

test('agregirani profil skalira KPI-jeve, tim i fond sati na granicama',async({page})=>{
  await page.goto('/preview/');
  await page.locator('#employeesInput').fill('5');
  await page.locator('#locationsInput').fill('1');
  await page.locator('#shiftsInput').selectOption('1');
  await page.getByRole('button',{name:'Otvori demo sustav'}).click();

  await expect(page.locator('#plannedCount')).toContainText('4');
  await expect(page.locator('#lateCount')).toHaveText('1');
  await expect(page.locator('#absentCount')).toHaveText('1');
  await page.getByRole('button',{name:'Voditelj',exact:true}).click();
  await expect(page.locator('#managerTeamSize')).toHaveText('2');
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

test('mobilni vodič je običan blok i odlazi sa sadržajem pri skrolanju',async({page})=>{
  await startPreview(page);
  const guide=page.locator('.guide-panel');
  const before=await guide.evaluate(element=>({position:getComputedStyle(element).position,top:element.getBoundingClientRect().top}));
  expect(before.position).toBe('static');
  await page.evaluate(()=>window.scrollTo(0,Math.min(700,document.documentElement.scrollHeight-window.innerHeight)));
  const after=await guide.evaluate(element=>element.getBoundingClientRect().top);
  expect(after).toBeLessThan(before.top-100);
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
