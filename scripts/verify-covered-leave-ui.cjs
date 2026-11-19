const assert=require('node:assert/strict');
const path=require('node:path');
const {chromium,expect}=require('@playwright/test');

const database=process.env.BSS_TEST_DATABASE_URL;
if(process.env.NODE_ENV!=='test'||process.env.BSS_COVERED_LEAVE_UI_TEST!=='synthetic-ci-only'
  ||!database||!['127.0.0.1','localhost'].includes(new URL(database).hostname)){
  throw new Error('Explicit synthetic loopback browser test database required');
}
const range={startDate:'2030-12-26',endDate:'2031-01-03'};
const initialDates=['2030-12-26','2030-12-31','2031-01-01','2031-01-02','2031-01-03'];
const finalDates=['2030-12-26','2030-12-30','2031-01-01','2031-01-02','2031-01-03'];

async function sessionPage(browser,origin,role){
  const context=await browser.newContext({serviceWorkers:'block'});
  await context.addCookies([{name:'bss_session',value:role,url:origin}]);
  const page=await context.newPage();
  await page.clock.setFixedTime(new Date('2030-12-25T10:00:00+01:00'));
  await page.goto(origin);
  await expect(page.locator('#content .screen')).toBeVisible();
  await page.evaluate(()=>window.navigate('requests'));
  await expect(page.getByRole('heading',{name:role==='worker'?'Moji zahtjevi':'Zahtjevi mojeg tima'})).toBeVisible();
  return page;
}
async function setDate(page,label,iso){
  const [year,month,day]=iso.split('-');
  const input=page.getByLabel(`${label} — godina`,{exact:true});
  await input.fill(year);
  await input.blur();
  await page.getByLabel(`${label} — mjesec`,{exact:true}).selectOption(month);
  await page.getByLabel(`${label} — dan`,{exact:true}).selectOption(day);
}
function responseFor(page,path,status){
  return page.waitForResponse(response=>response.request().method()==='POST'&&response.status()===status
    && new URL(response.url()).pathname===path);
}
function coveredButton(page,note){
  return page.getByRole('row').filter({hasText:note}).getByRole('button',{name:'Pokriveni datumi'});
}
function dateChoice(page,date){
  return page.locator(`#modal input[type="checkbox"][value="${date}"]`);
}

async function run(){
  const [{coveredLeaveFixture},{FakeAuthService},{loadConfig},{buildApp}]=await Promise.all([
    import('../backend/test/helpers/covered-leave-fixture.ts'),import('../backend/test/helpers/fakes.ts'),
    import('../backend/src/config.ts'),import('../backend/src/http/app.ts')
  ]);
  const browser=await chromium.launch();
  let fixture,app;
  try{
    fixture=await coveredLeaveFixture(database,true);
    const {legacy,reserve,worker,manager,admin}=fixture;
    const december=await legacy.createLeaveRequest(worker,{typeCode:'annual_leave',startDate:'2030-12-23',endDate:'2030-12-25'},'seed-dec');
    await legacy.approveLeaveRequest(admin,december.id,december.revision,undefined,'seed-dec-approval');
    await legacy.createLeaveRequest(worker,{typeCode:'annual_leave',startDate:'2031-01-06',endDate:'2031-01-07',note:'Zasebno u siječnju'},'seed-jan');

    const auth=new FakeAuthService();
    const standardAuth=auth.resolveAccessToken.bind(auth);
    auth.resolveAccessToken=async token=>{
      assert.ok(token==='worker'||token==='manager','Only configured fixture sessions are allowed');
      const {context}=await standardAuth(token);
      const actor=token==='worker'?worker:manager;
      context.user={...context.user,id:actor.userId};
      context.organization={...context.organization,id:actor.organizationId,name:'BSS Synthetic Covered Leave'};
      context.effectiveScope={...context.effectiveScope,departmentIds:actor.departmentIds,selfWorkerId:actor.selfWorkerId};
      return {context,actor};
    };
    const config=loadConfig({NODE_ENV:'test',PUBLIC_ORIGIN:'http://127.0.0.1',DATABASE_URL:database,
      LOG_LEVEL:'silent',COOKIE_SECURE:'false',FRONTEND_ROOT:path.resolve(__dirname,'../dist')});
    app=await buildApp({config,authService:auth,phaseAService:legacy,coveredLeaveDecisions:reserve,logger:false});
    const origin=await app.listen({host:'127.0.0.1',port:0});
    // The browser uses the exact bound synthetic loopback origin for mutations.
    config.publicOrigin=origin;
    const workerPage=await sessionPage(browser,origin,'worker');
    const managerPage=await sessionPage(browser,origin,'manager');
    await expect(workerPage.getByRole('row').filter({hasText:'Zasebno u siječnju'})).toHaveCount(1);
    await expect(managerPage.getByRole('row').filter({hasText:'Zasebno u siječnju'})).toHaveCount(1);

    const note='Ogled godišnjeg preko Nove godine';
    await workerPage.getByRole('button',{name:'Novi zahtjev',exact:true}).click();
    await setDate(workerPage,'Od',range.startDate);
    await setDate(workerPage,'Do',range.endDate);
    await expect(workerPage.locator('#vacEnd')).toHaveValue(range.endDate);
    await expect(workerPage.locator('#vacRequestPreview')).toContainText(/2030.*traženo 4.*dostupno 2.*nedostaje 2.*2031.*traženo 3.*dostupno 3/);
    await workerPage.locator('#vacNote').fill(note);
    const submit=responseFor(workerPage,'/api/v1/leave-requests/covered-dates',201);
    await workerPage.getByRole('button',{name:'Pošalji zahtjev',exact:true}).click();
    const submission=await (await submit).json();
    assert.deepEqual(submission.years,[{year:2030,requestedDays:4,reservedDays:2},{year:2031,requestedDays:3,reservedDays:3}]);
    await expect(workerPage.locator('#submittedLeaveRequest')).toContainText(/2030.*rezervirano 2.*2031.*rezervirano 3/);
    const endpoint=`/api/v1/leave-requests/${submission.requestId}/covered-dates`;
    await coveredButton(workerPage,note).click();
    for(const date of initialDates)await dateChoice(workerPage,date).check();
    await dateChoice(workerPage,'2030-12-30').check();
    await expect(workerPage.getByRole('button',{name:'Potvrdi datume'})).toBeDisabled();
    await dateChoice(workerPage,'2030-12-30').uncheck();
    const confirmed=responseFor(workerPage,`${endpoint}/confirm`,200);
    await workerPage.getByRole('button',{name:'Potvrdi datume'}).click();
    await confirmed;

    await managerPage.reload();
    await expect(managerPage.locator('#content .screen')).toBeVisible();
    await managerPage.evaluate(()=>window.navigate('requests'));
    await coveredButton(managerPage,note).click();
    await expect(managerPage.getByRole('button',{name:'Odobri potvrđene datume'})).toBeEnabled();
    await coveredButton(workerPage,note).click();
    await dateChoice(workerPage,'2030-12-31').uncheck();
    await dateChoice(workerPage,'2030-12-30').check();
    const updated=responseFor(workerPage,`${endpoint}/confirm`,200);
    await workerPage.getByRole('button',{name:'Potvrdi datume'}).click();
    const accepted=await (await updated).json();

    const stale=responseFor(managerPage,`${endpoint}/approve`,409);
    await managerPage.getByRole('button',{name:'Odobri potvrđene datume'}).click();
    assert.equal((await (await stale).json()).code,'STALE_REVISION');
    await expect(managerPage.getByRole('button',{name:'Odobri potvrđene datume'})).toHaveCount(0);
    await managerPage.getByRole('button',{name:'Učitaj aktualni zahtjev'}).click();
    const approved=responseFor(managerPage,`${endpoint}/approve`,200);
    await managerPage.getByRole('button',{name:'Odobri potvrđene datume'}).click();
    const response=await approved;
    assert.equal((await response.request().allHeaders())['if-match'],`"${accepted.revision}"`);
    assert.deepEqual((await response.json()).dates.map(item=>item.date),finalDates);
    const balances=await Promise.all([2030,2031].map(year=>legacy.listLeaveBalances(worker,{year,limit:10})));
    assert.deepEqual(balances.map(item=>[item.items[0].approvedDays,item.items[0].plannedDays,item.items[0].availableDays]),[[5,0,0],[3,2,0]]);
    console.log('Covered leave browser PASS: 2030/2031 reservation, scoped confirmation, stale revision, exact approval and balances.');
  }finally{
    await browser.close();
    await app?.close();
    await fixture?.dispose();
  }
}
void run().catch(error=>{console.error(error.message);process.exitCode=1;});
