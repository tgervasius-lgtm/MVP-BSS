const {test,expect}=require('@playwright/test');
const {AxeBuilder}=require('@axe-core/playwright');

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
  await expect(page.locator('.section-title h1')).toHaveText('Godišnji kalendar cijele firme');
  await page.evaluate(()=>window.logout());
  await page.locator('#loginRole').selectOption('worker');
  await page.locator('[data-bss-action="login()"]').click();
  await page.evaluate(()=>window.navigate('vacations'));
  await expect(page.locator('.section-title h1')).toHaveText('Moj godišnji kalendar');
  await expect(page.locator('.section-title p')).toHaveText('Prikazuju se samo tvoji zahtjevi.');
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

test('ključne aplikacijske stranice nemaju ozbiljne axe povrede',async({page})=>{
  await page.goto('/');
  expect(await seriousAxeViolations(page)).toEqual([]);
  await page.locator('#loginRole').selectOption('admin');
  await page.locator('[data-bss-action="login()"]').click();
  await page.locator('#content .screen').waitFor({state:'visible'});
  expect(await seriousAxeViolations(page)).toEqual([]);
});

test('Design System i Brand Book učitavaju se bez ozbiljnih axe povreda',async({page})=>{
  await page.goto('/design-system/');
  await expect(page.locator('h1')).toHaveText('BSS Design System v1.0');
  expect(await seriousAxeViolations(page)).toEqual([]);
  await page.goto('/brand-book/');
  await expect(page.locator('h1')).toHaveText('Jasan sustav za stvaran rad.');
  expect(await seriousAxeViolations(page)).toEqual([]);
});
