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
  await page.getByRole('button',{name:'Pripremi i pokreni radni dan'}).click();
  await expect(page.locator('#demoView')).toBeVisible({timeout:7000});
  await expect(page.locator('#guideTitle')).toBeFocused();
}

async function expectNoHorizontalOverflow(page){
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
  expect(overflow,'Preview Portal ima horizontalni overflow').toBeLessThanOrEqual(1);
}

test('cijeli vođeni demo završava Business Summary i Final Experience prikazom',async({page})=>{
  const errors=trackErrors(page);
  await startPreview(page);
  await expectNoHorizontalOverflow(page);

  await page.locator('#scanButton').click();
  await expect(page.locator('#adminView')).toBeVisible({timeout:2500});
  await expect(page.locator('#presentCount')).toHaveText('48');
  await page.locator('#resolveCorrectionButton').click();
  await expect(page.locator('#managerView')).toBeVisible();
  await page.locator('#approveLeaveButton').click();
  await expect(page.locator('#workerView')).toBeVisible();
  await page.locator('#reviewWorkerButton').click();
  await expect(page.locator('#accountingView')).toBeVisible();
  await page.locator('#generateReportButton').click();

  await expect(page.locator('#completionView')).toBeVisible();
  await expect(page.locator('.business-summary')).toContainText('Ovako je BSS povezao jedan radni dan.');
  await expect(page.locator('.final-experience')).toContainText('Radni dan uspješno je prošao kroz BSS.');
  await expect(page.locator('.final-experience-steps li')).toHaveCount(5);
  await expect(page.locator('.role-switcher')).toBeHidden();
  await expect(page.locator('#guideProgressBar')).toHaveAttribute('aria-valuenow','5');
  await expectNoHorizontalOverflow(page);
  expect(await seriousAxeViolations(page)).toEqual([]);
  expect(errors).toEqual([]);
});

test('buduće operativne radnje ostaju zaključane bez lažne potvrde',async({page})=>{
  await startPreview(page);
  await page.getByRole('button',{name:'Knjigovodstvo',exact:true}).click();

  const report=page.locator('#generateReportButton');
  await expect(report).toBeDisabled();
  await expect(report).toHaveAttribute('title',/Dovršite trenutačni vođeni korak/);
  await expect(page.locator('#guideProgressBar')).toHaveAttribute('aria-valuenow','0');
  await expect(page.locator('.toast')).toHaveCount(0);
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

  await page.getByRole('button',{name:'Pripremi i pokreni radni dan'}).click();
  await expect(page.locator('#scanButton')).toBeEnabled({timeout:7000});
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

  await page.getByRole('button',{name:'Pripremi i pokreni radni dan'}).click();
  await expect(page.locator('#demoView')).toBeVisible({timeout:7000});
  await expectNoHorizontalOverflow(page);
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

  await context.setOffline(true);
  try{
    await page.reload({waitUntil:'domcontentloaded'});
    await expect(page.locator('#welcomeTitle')).toHaveText(/Pogledajte kako bi BSS izgledao/);
  }finally{
    await context.setOffline(false);
  }
});
