// Synthetic references only; no browser traces/video or customer data.
const assert=require('node:assert/strict');
const {chromium}=require('@playwright/test');
const {start,upload,map,accessible}=require('./verify-import-ui.cjs');
async function opened(page){
  await page.evaluate(()=>window.navigate('onboarding'));
  await page.getByRole('heading',{name:'Rad uživo nije odobren',exact:true}).waitFor();
}
async function submit(page,reference){
  await page.locator('#onboarding-step').selectOption('DRY_RUN');
  await page.locator('#onboarding-reference').fill(reference);
  await page.locator('#onboarding-note').fill('Synthetic private register context');
  await page.locator('#onboarding-reviewed').focus();await page.keyboard.press('Space');
  await page.getByRole('button',{name:'Spremi nepotvrđenu referencu',exact:true}).click();
}
async function viewportProof(browser,viewport){
  const f=await start();let context,second,foreign;const errors=[];let expectedAbort=false,patches=0;
  try{
    context=await browser.newContext({viewport,serviceWorkers:'block'});await context.addCookies([{name:'bss_session',value:'admin',url:f.origin}]);
    const page=await context.newPage();
    page.on('pageerror',error=>errors.push(error.message));
    page.on('console',message=>{if(message.type()==='error'&&!message.text().startsWith('Failed to load resource:'))errors.push(message.text());});
    page.on('requestfailed',request=>{if(expectedAbort&&request.url().endsWith('/onboarding/evidence'))expectedAbort=false;else errors.push(request.failure()?.errorText||'Request failed');});
    page.on('response',response=>{if(response.status()>=500)errors.push(`Unexpected HTTP ${response.status()}`);});
    page.on('request',request=>{if(request.method()==='PATCH'&&request.url().endsWith('/onboarding/evidence'))patches+=1;});
    await page.goto(f.origin);await page.locator('#content .screen').waitFor();await opened(page);await accessible(page);
    for(const id of ['onboarding-step','onboarding-reference','onboarding-note']){
      assert.ok((await page.locator('#'+id).boundingBox()).height>=44,'Touch-sized onboarding input');
    }
    assert.match(await page.locator('.onboarding').innerText(),/Potrebni su aktivni radnici/);
    const counts=()=>fetch(`${f.origin}/__test/onboarding-counts`).then(r=>r.json());assert.deepEqual(await counts(),{evidence:0,evaluations:0});
    // Visiting existing screens is never persisted as evidence or approval.
    for(const name of ['Podaci tvrtke','Odjeli','Smjene','Neradni dani','Prava pristupa','Terminali i kartice']){
      await page.locator('.onboarding').getByRole('button',{name,exact:true}).click();await page.locator('#content .screen').waitFor();await opened(page);
    }
    assert.deepEqual(await counts(),{evidence:0,evaluations:0});
    await page.getByRole('button',{name:'Uvezi radnike',exact:true}).click();await page.getByRole('heading',{name:'1. Odaberite datoteku',exact:true}).waitFor();
    await upload(page,'synthetic.csv','text/csv',Buffer.from(f.csv));await map(page);
    await page.getByRole('button',{name:'Nastavi na potvrdu',exact:true}).click();await page.locator('#import-approval').check();
    await page.getByRole('button',{name:'Dodaj sve radnike',exact:true}).click();await page.getByRole('heading',{name:'Radnici su dodani',exact:true}).waitFor();
    await opened(page);assert.doesNotMatch(await page.locator('.onboarding').innerText(),/Potrebni su aktivni radnici/);
    assert.deepEqual(await counts(),{evidence:0,evaluations:0});
    await page.route('**/onboarding/evidence',async route=>{
      const response=await route.fetch();assert.equal(response.status(),200);expectedAbort=true;await route.abort('connectionreset');
    },{times:1});
    await submit(page,'register:synthetic-browser-first');await page.getByRole('heading',{name:'Rezultat još nije potvrđen',exact:true}).waitFor();
    assert.equal(patches,1);assert.equal(await page.locator('#onboarding-reference').count(),0);
    await page.getByRole('button',{name:'Provjeri spremljeno stanje',exact:true}).click();await page.getByText('register:synthetic-browser-first',{exact:true}).waitFor();
    assert.equal(patches,1);assert.equal(expectedAbort,false);assert.deepEqual(await counts(),{evidence:1,evaluations:0});
    await page.reload();await page.locator('#content .screen').waitFor();await opened(page);await page.getByText('register:synthetic-browser-first',{exact:true}).waitFor();
    // Real browser logout/login HTTP entry, using the documented synthetic auth adapter.
    await page.evaluate(()=>window.logout());await page.locator('#loginEmail').waitFor();
    await page.locator('#loginEmail').fill('admin@example.test');await page.locator('#loginPassword').fill('synthetic-browser-password-only');
    await page.evaluate(()=>window.login());await page.locator('#content .screen').waitFor();await opened(page);
    await page.getByText('register:synthetic-browser-first',{exact:true}).waitFor();assert.equal(await page.locator('#onboarding-reviewed').isChecked(),false);
    second=await browser.newContext({viewport,serviceWorkers:'block'});await second.addCookies([{name:'bss_session',value:'admin-second',url:f.origin}]);
    const other=await second.newPage();await other.goto(f.origin);await other.locator('#content .screen').waitFor();await opened(other);
    await page.locator('#onboarding-reference').fill('register:stale-admin-draft');await page.locator('#onboarding-reviewed').check();
    await submit(other,'register:second-admin');await other.getByText('register:second-admin',{exact:true}).waitFor();
    await page.getByRole('button',{name:'Spremi nepotvrđenu referencu',exact:true}).click();await page.getByRole('alert').waitFor();
    assert.match(await page.getByRole('alert').innerText(),/promijenile/);assert.deepEqual(await counts(),{evidence:2,evaluations:0});
    await page.getByRole('button',{name:'Provjeri spremljeno stanje',exact:true}).click();await page.getByText('register:second-admin',{exact:true}).waitFor();
    await page.getByRole('button',{name:'Ponovno provjeri preduvjete',exact:true}).click();await page.getByText('Provjera je zabilježena. Otvoreni blokeri ostaju; rad uživo nije odobren.',{exact:true}).waitFor();
    assert.deepEqual(await counts(),{evidence:2,evaluations:1});
    const changed=await fetch(`${f.origin}/__test/onboarding-change`,{method:'POST',headers:{Origin:f.origin,'X-BSS-Synthetic-Probe':'onboarding-only'}});assert.equal(changed.status,200);
    await page.getByRole('button',{name:'Provjeri spremljeno stanje',exact:true}).click();await page.getByText('Postavke su promijenjene — potrebna nova provjera',{exact:true}).first().waitFor();
    assert.match(await page.locator('.onboarding').innerText(),/Aktualne postavke treba ponovno provjeriti/);await accessible(page);
    await page.evaluate(()=>{document.documentElement.dataset.theme='dark';});await accessible(page);
    assert.equal(await page.evaluate(()=>[localStorage,sessionStorage].some(store=>Object.keys(store).some(key=>String(store.getItem(key)).includes('register:synthetic-browser-first')))),false);
    foreign=await browser.newContext({serviceWorkers:'block'});await foreign.addCookies([{name:'bss_session',value:'foreign',url:f.origin}]);
    const foreignResponse=await foreign.request.get(`${f.origin}/api/v1/onboarding`);assert.equal(foreignResponse.status(),200);
    assert.deepEqual((await foreignResponse.json()).submittedEvidence,[]);
    for(const role of ['manager','worker','accountant']){
      const denied=await browser.newContext({serviceWorkers:'block'});try{
        await denied.addCookies([{name:'bss_session',value:role,url:f.origin}]);const p=await denied.newPage();await p.goto(f.origin);await p.locator('#content .screen').waitFor();
        assert.equal(await p.evaluate(()=>window.allowedScreens().includes('onboarding')),false);assert.equal((await denied.request.get(`${f.origin}/api/v1/onboarding`)).status(),403);
      }finally{await denied.close();}
    }
    assert.deepEqual(errors,[]);
    console.log(`PASS onboarding UI ${viewport.width}px: existing-step navigation/import, unverified references, lost-response GET, reload/login, concurrent Admin, config invalidation, blocked evaluation, tenant/role separation, keyboard/axe/light/dark`);
  }finally{await foreign?.close();await second?.close();await context?.close();await f.close();}
}
async function run(browser){for(const viewport of [{width:1440,height:1000},{width:390,height:844}])await viewportProof(browser,viewport);}
module.exports={run};
if(require.main===module)(async()=>{
  const browser=await chromium.launch({headless:true,...(process.env.BSS_IMPORT_UI_BROWSER_EXECUTABLE?{executablePath:process.env.BSS_IMPORT_UI_BROWSER_EXECUTABLE}:{})});
  try{await run(browser);}finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
