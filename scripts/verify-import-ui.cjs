// No browser recordings, screenshots, credentials or uploaded rows are written.
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const {once}=require('node:events');
const net=require('node:net');
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require('@playwright/test');
const {AxeBuilder}=require('@axe-core/playwright');

if(process.env.NODE_ENV!=='test'||process.env.BSS_IMPORT_UI_SYNTHETIC_TEST!=='synthetic-ci-only'||!process.env.BSS_TEST_DATABASE_URL){
  throw new Error('Explicit synthetic browser test environment required');
}
async function start(){
  const reserve=net.createServer();reserve.listen(0,'127.0.0.1');await once(reserve,'listening');
  const port=reserve.address().port;await new Promise(resolve=>reserve.close(resolve));
  const child=spawn(process.execPath,['--import','tsx','test/helpers/import-ui-server.ts'],{cwd:path.resolve('backend'),
    env:{...process.env,BSS_IMPORT_UI_TEST_PORT:String(port)},stdio:['pipe','pipe','pipe']});
  let output='',errors='';child.stderr.on('data',chunk=>{errors+=chunk;});
  const ready=await new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>reject(new Error('Synthetic import server did not start')),90000);
    child.stdout.on('data',chunk=>{
      output+=chunk;const line=output.split('\n').find(value=>value.startsWith('{"ready":'));
      if(line){clearTimeout(timer);resolve(JSON.parse(line));}
    });
    child.once('exit',code=>{clearTimeout(timer);reject(new Error(`Synthetic import server exited (${code}): ${errors}`));});
  }).catch(error=>{child.stdin.end();throw error;});
  return{...ready,close:async()=>{
    if(child.exitCode!==null){assert.equal(child.exitCode,0,'Synthetic server exit');return;}
    const exit=once(child,'exit');child.stdin.end();const [code]=await exit;
    assert.equal(code,0,'Synthetic fixture cleanup must complete');
  }};
}
async function wait(page,text){await page.getByRole('heading',{name:text,exact:true}).waitFor();}
async function upload(page,name,mimeType,buffer,format='csv'){
  await page.locator('#import-format').selectOption(format);
  if(format==='csv')await page.locator('#import-delimiter').selectOption(';');
  await page.locator('#import-file').setInputFiles({name,mimeType,buffer});
  await page.getByRole('button',{name:'Učitaj i provjeri datoteku',exact:true}).click();
  await wait(page,'2. Povežite stupce i vrijednosti');
}
async function map(page,email=false){
  const fields=['code','name','department','shift','annualLeaveAllowance',...(email?['email']:[])];
  for(let i=0;i<fields.length;i++)await page.locator(`#import-column-${i}`).selectOption(fields[i]);
  await page.locator('#import-department-0').selectOption({label:'Department'});
  await page.locator('#import-shift-0').selectOption({label:'Day'});
  await page.getByRole('button',{name:'Provjeri cijeli popis',exact:true}).click();
  await wait(page,'3. Pregledajte cijeli popis');
}
async function accessible(page){
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)<=1,'No page overflow');
  const violations=(await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa']).analyze()).violations.filter(item=>['serious','critical'].includes(item.impact));
  assert.deepEqual(violations.map(item=>({id:item.id,nodes:item.nodes.map(node=>node.target)})),[]);
  if(page.viewportSize().width<=700&&await page.locator('.import-table').count()){
    const caption=await page.locator('.import-table caption').boundingBox(),table=await page.locator('.import-table').boundingBox();
    assert.ok(caption.width>=table.width*0.8,'Mobile caption remains readable across the table width');
    assert.equal(await page.locator('.worker-import .table-scroll-hint').isVisible(),false,'Stacked rows do not advertise horizontal scrolling');
  }
}
async function runViewport(browser,viewport){
  const f=await start();let context;
  try{
    context=await browser.newContext({viewport,serviceWorkers:'block'});
    await context.addCookies([{name:'bss_session',value:'admin',url:f.origin}]);
    const page=await context.newPage(),errors=[];let expectedAborts=0,commitPosts=0;
    page.on('pageerror',error=>errors.push(error.message));
    page.on('console',message=>{if(message.type()==='error'&&!message.text().startsWith('Failed to load resource:'))errors.push(message.text());});
    page.on('requestfailed',request=>{if(expectedAborts>0&&request.url().endsWith('/commit'))expectedAborts-=1;else errors.push(request.failure()?.errorText||'request failed');});
    page.on('response',response=>{if(response.status()>=500)errors.push(`Unexpected HTTP ${response.status()}`);});
    page.on('request',request=>{if(request.method()==='POST'&&request.url().endsWith('/commit'))commitPosts+=1;});
    await page.goto(f.origin);await page.locator('#content .screen').waitFor();
    await page.evaluate(()=>window.navigate('workers'));
    await page.getByRole('button',{name:'Uvezi radnike',exact:true}).click();await wait(page,'1. Odaberite datoteku');
    await accessible(page);
    await upload(page,'synthetic.csv','text/csv',Buffer.from(f.csv));await accessible(page);await map(page);
    await page.getByRole('button',{name:'Nastavi na potvrdu',exact:true}).click();await wait(page,'4. Potvrdite dodavanje radnika');
    assert.equal(await page.getByRole('button',{name:'Dodaj sve radnike',exact:true}).isEnabled(),false);
    await page.locator('#import-approval').focus();await page.keyboard.press('Space');
    await accessible(page);
    await page.route('**/worker-imports/*/commit',async route=>{
      const response=await route.fetch();assert.equal(response.status(),200);expectedAborts=1;await route.abort('connectionreset');
    },{times:1});
    await page.getByRole('button',{name:'Dodaj sve radnike',exact:true}).click();
    await page.getByText('Rezultat još nije potvrđen',{exact:true}).waitFor();
    await page.getByRole('button',{name:'Provjeri postojeći rezultat',exact:true}).click();await wait(page,'Radnici su dodani');
    assert.equal(commitPosts,1);assert.equal(expectedAborts,0);assert.deepEqual(await fetch(`${f.origin}/__test/import-counts`).then(r=>r.json()),{workers:1,staging:0});
    await page.reload();await page.locator('#content .screen').waitFor();await page.evaluate(()=>window.navigate('workerImports'));
    await page.getByRole('button',{name:'Otvori pripremu',exact:true}).click();await wait(page,'Radnici su dodani');
    await page.getByRole('button',{name:'Novi uvoz',exact:true}).click();await wait(page,'1. Odaberite datoteku');
    await upload(page,'synthetic.xlsx','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',Buffer.from(f.xlsx,'base64'),'xlsx');
    await map(page,true);await accessible(page);await page.getByRole('button',{name:'Otkaži pripremu',exact:true}).click();await wait(page,'Otkazati pripremu?');
    await page.getByRole('button',{name:'Potvrdi otkazivanje',exact:true}).click();await wait(page,'Otkazano');
    assert.deepEqual(await fetch(`${f.origin}/__test/import-counts`).then(r=>r.json()),{workers:1,staging:0});
    await page.getByRole('button',{name:'Natrag na popis',exact:true}).click();await wait(page,'1. Odaberite datoteku');
    await upload(page,'invalid.csv','text/csv',Buffer.from(f.invalid));await map(page);
    assert.equal(await page.getByRole('button',{name:'Nastavi na potvrdu',exact:true}).isEnabled(),false);
    await page.getByRole('button',{name:'Sljedeća stranica',exact:true}).click();await page.getByText('UI-BAD-100',{exact:true}).waitFor();
    await page.getByLabel('Prikaži samo retke s pogreškama').check();await accessible(page);
    if(process.env.BSS_IMPORT_UI_VISUAL_DIR){fs.mkdirSync(process.env.BSS_IMPORT_UI_VISUAL_DIR,{recursive:true});await page.screenshot({path:path.join(process.env.BSS_IMPORT_UI_VISUAL_DIR,`import-review-${viewport.width}.png`)});}
    assert.match(await page.locator('.import-errors').innerText(),/0 do 366/);
    await page.evaluate(()=>{document.documentElement.dataset.theme='dark';});await page.waitForTimeout(300);await accessible(page);
    await page.getByRole('button',{name:'Otkaži pripremu',exact:true}).click();await page.getByRole('button',{name:'Potvrdi otkazivanje',exact:true}).click();await wait(page,'Otkazano');
    assert.deepEqual(await fetch(`${f.origin}/__test/import-counts`).then(r=>r.json()),{workers:1,staging:0});
    assert.deepEqual(errors,[]);
    for(const role of ['manager','worker','accountant']){
      const denied=await browser.newContext({serviceWorkers:'block'});try{
        await denied.addCookies([{name:'bss_session',value:role,url:f.origin}]);const p=await denied.newPage();await p.goto(f.origin);await p.locator('#content .screen').waitFor().catch(error=>{error.message=`${role} fixture initialization: ${error.message}`;throw error;});
        assert.equal(await p.evaluate(()=>window.allowedScreens().includes('workerImports')),false);
        assert.equal((await denied.request.get(`${f.origin}/api/v1/worker-import-policy`)).status(),403);
      }finally{await denied.close();}
    }
    console.log(`PASS import UI ${viewport.width}px: CSV, XLSX, mapping, paged errors, revision approval, lost-response read-back, resume, cancel, PostgreSQL counts, denied roles, keyboard/axe/light/dark`);
  }finally{await context?.close();await f.close();}
}
module.exports={start,upload,map,accessible};
if(require.main===module)(async()=>{
  const browser=await chromium.launch({headless:true,...(process.env.BSS_IMPORT_UI_BROWSER_EXECUTABLE?{executablePath:process.env.BSS_IMPORT_UI_BROWSER_EXECUTABLE}:{})});
  try{for(const viewport of [{width:1440,height:1000},{width:390,height:844}])await runViewport(browser,viewport);}
  finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
