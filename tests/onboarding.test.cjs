const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {JSDOM}=require('jsdom');
const {createController}=require('../src/adapters/api-onboarding.js');
const domain=require('../src/domain/onboarding.js');
const copy=value=>structuredClone(value);
const id=n=>`10000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const problem=status=>Object.assign(new Error('PRIVATE_DEPENDENCY_VALUE'),{status});
function initial(){return{id:id(1),revision:'1',profile:'INTERNAL',contractVersion:'BSS-v1.0',stage:'PEOPLE_IMPORT',configurationChecksum:'a'.repeat(64),
  evaluatedConfigurationChecksum:null,evaluatedAt:null,revalidationRequired:true,readyForGoLive:false,goLiveApproved:false,
  softwarePrerequisites:{company:true,people:false,access:true,terminal:false},
  blockers:[{step:'PEOPLE_IMPORT',code:'WORKFORCE_CONFIGURATION_INCOMPLETE',message:'Pripremite aktivne radnike.'},
    {step:'DRY_RUN',code:'OPERATOR_AUTHORITY_UNAVAILABLE',message:'Zasebna ovlast operatora nije potvrđena.'}],submittedEvidence:[]};}
function fixture(changes={}){
  let data=initial(),identity={logged:true,api:true,active:true,role:'admin',organizationId:id(2),userId:id(3),...changes},hook=null;
  const calls=[],visits=[];
  function append(item){
    data.submittedEvidence.push({...copy(item),id:id(10+data.submittedEvidence.length),submittedBy:id(3),submittedAt:'2026-10-17T13:00:00.000Z',configurationChecksum:data.configurationChecksum,verification:'UNVERIFIED',stale:false});
    data.revision=String(BigInt(data.revision)+1n);data.evaluatedAt=null;data.evaluatedConfigurationChecksum=null;data.revalidationRequired=true;return copy(data);
  }
  const api={async request(path,options={}){
    const call={path,method:options.method||'GET',body:options.body?copy(options.body):undefined,headers:options.headers,signal:options.signal};calls.push(call);
    if(hook){const result=await hook(call);if(result!==undefined)return result;}
    if(call.method==='GET')return copy(data);
    if(call.headers['If-Match']!==`"${data.revision}"`||call.body.configurationChecksum!==data.configurationChecksum)throw problem(409);
    if(path==='/onboarding/evidence')return append(call.body.items[0]);
    if(path==='/onboarding/evaluate'){
      data.revision=String(BigInt(data.revision)+1n);data.evaluatedAt='2026-10-17T13:00:00.000Z';data.evaluatedConfigurationChecksum=data.configurationChecksum;data.revalidationRequired=false;return copy(data);
    }
    throw new Error('Unexpected fixture request');
  }};
  const controller=createController({api,context:()=>identity,navigate:value=>visits.push(value),goto:value=>visits.push(value)});
  return{controller,calls,visits,api,get:()=>data,set:value=>{data={...data,...value};},identity:value=>{identity={...identity,...value};},hook:value=>{hook=value;},append,
    async ready(reference='register:synthetic-1'){await controller.action('load');controller.edit('reference',reference);controller.review(true);}};
}
const doc=f=>new JSDOM(f.controller.view()).window.document;
const saveButton=f=>doc(f).querySelector('[data-bss-action="onboardingAction(\'save\')"]');

test('H2 onboarding: only authenticated API Admin can load, navigate or mutate',async()=>{
  for(const context of [{role:'manager'},{role:'worker'},{role:'accountant'},{logged:false},{api:false},{active:false}]){
    const f=fixture(context);await f.controller.action('load');await f.controller.action('evaluate');f.controller.open();await f.controller.action('goto','company');
    assert.equal(f.calls.length,0);assert.equal(f.visits.length,context.active===false?1:0);
  }
});
test('H2 onboarding: server observations never become completed evidence or go-live approval',async()=>{
  const f=fixture();await f.controller.action('load');const document=doc(f);
  assert.equal(document.querySelectorAll('.onboarding-step').length,5);assert.match(document.body.textContent,/Rad uživo nije odobren/);
  assert.match(document.body.textContent,/Zasebna ovlast operatora/);assert.equal(saveButton(f).disabled,true);
  assert.equal(f.calls.length,1);assert.deepEqual(f.get().submittedEvidence,[]);
});
test('H2 onboarding: one explicit reviewed write binds revision/checksum and contains no client authority',async()=>{
  const f=fixture();await f.controller.action('load');f.controller.edit('reference','  register:synthetic-1  ');f.controller.edit('note','  Synthetic context  ');
  await f.controller.action('save');assert.equal(f.calls.length,1);f.controller.review(true);assert.equal(saveButton(f).disabled,false);
  await f.controller.action('save');const write=f.calls.find(c=>c.method==='PATCH');
  assert.equal(write.headers['If-Match'],'"1"');assert.deepEqual(write.body,{configurationChecksum:'a'.repeat(64),items:[{step:'PEOPLE_IMPORT',reference:'register:synthetic-1',note:'Synthetic context'}]});
  assert.equal(f.controller.snapshot().data.revision,'2');assert.equal(f.controller.snapshot().review,null);assert.equal(f.controller.snapshot().draft.reference,'');
  assert.match(f.controller.view(),/Nepotvrđena referenca/);assert.equal(f.controller.snapshot().data.goLiveApproved,false);
});
test('H2 onboarding: editing any draft field invalidates its reviewed confirmation',async()=>{
  for(const [field,value] of [['reference','changed-reference'],['note','changed context'],['step','DRY_RUN']]){
    const f=fixture();await f.ready();f.controller.edit(field,value);await f.controller.action('save');
    assert.equal(f.controller.snapshot().review,null);assert.equal(f.calls.filter(c=>c.method==='PATCH').length,0);assert.equal(saveButton(f).disabled,true);
  }
});
test('H2 onboarding: empty/oversized/control input, duplicates and full history prevent a new write',async()=>{
  for(const reference of ['', 'x'.repeat(501),'unsafe\u0000value']){
    const f=fixture();await f.ready(reference);await f.controller.action('save');assert.equal(f.calls.length,1);assert.equal(saveButton(f).disabled,true);
  }
  const f=fixture();await f.ready();await f.controller.action('save');f.controller.edit('reference','register:synthetic-1');f.controller.review(true);
  assert.equal(saveButton(f).disabled,true);assert.match(f.controller.view(),/već spremljena/);
  const full=fixture();for(let i=0;i<100;i++)full.append({step:'DRY_RUN',reference:`register:${i}`});await full.ready();await full.controller.action('save');
  assert.equal(full.calls.length,1);assert.equal(doc(full).querySelector('fieldset').disabled,true);
});
test('H2 onboarding: malformed or authority-promoting responses fail closed without exposing values',async()=>{
  for(const change of [{readyForGoLive:true},{goLiveApproved:true},{stage:'GO_LIVE_APPROVED'},{submittedEvidence:{}},{blockers:[]},
    {softwarePrerequisites:{company:'true'}},{revision:'0'},{profile:'OTHER'},{contractVersion:'unknown'},{configurationChecksum:'unsafe'}]){
    const f=fixture();f.set(change);await f.controller.action('load');await f.controller.action('evaluate');
    assert.equal(f.controller.snapshot().data,null);assert.equal(f.calls.length,1);assert.equal(doc(f).querySelector('fieldset'),null);assert.doesNotMatch(f.controller.view(),/PRIVATE_DEPENDENCY_VALUE/);
  }
});
test('H2 onboarding: lost write response performs no replay and GET recovers the durable reference',async()=>{
  const f=fixture();await f.ready();f.hook(call=>{if(call.method==='PATCH'){f.append(call.body.items[0]);throw problem(0);}});
  await f.controller.action('save');assert.equal(f.controller.snapshot().uncertain,true);assert.equal(f.controller.snapshot().data,null);
  await f.controller.action('save');await f.controller.action('evaluate');assert.equal(f.calls.filter(c=>c.method==='PATCH').length,1);
  await f.controller.action('load');assert.equal(f.controller.snapshot().data.submittedEvidence.length,1);assert.equal(f.controller.snapshot().uncertain,false);
  assert.equal(f.controller.snapshot().review,null);assert.equal(f.controller.snapshot().draft.reference,'');assert.equal(f.calls.filter(c=>c.method==='PATCH').length,1);
});
test('H2 onboarding: stale revision/config clears approval and requires fresh read and explicit review',async()=>{
  const f=fixture();await f.ready();f.set({revision:'2',configurationChecksum:'b'.repeat(64)});await f.controller.action('save');
  assert.equal(f.controller.snapshot().needsReadback,true);assert.equal(f.controller.snapshot().uncertain,false);assert.equal(f.controller.snapshot().data,null);
  await f.controller.action('load');assert.equal(f.controller.snapshot().data.revision,'2');assert.equal(saveButton(f).disabled,true);
  await f.controller.action('save');assert.equal(f.calls.filter(c=>c.method==='PATCH').length,1);
});
test('H2 onboarding: evaluation rereads current state and stops for a newly changed configuration',async()=>{
  const f=fixture();await f.controller.action('load');f.set({configurationChecksum:'b'.repeat(64)});await f.controller.action('evaluate');
  assert.equal(f.calls.filter(c=>c.method==='POST').length,0);assert.match(f.controller.view(),/Stanje je promijenjeno/);
  await f.controller.action('evaluate');const post=f.calls.find(c=>c.method==='POST');assert.equal(post.body.configurationChecksum,'b'.repeat(64));
  assert.equal(post.headers['If-Match'],'"1"');assert.equal(f.controller.snapshot().data.revalidationRequired,false);assert.equal(f.controller.snapshot().data.readyForGoLive,false);
});
test('H2 onboarding: pending write prevents double submission and malformed acknowledgement requires read-back',async()=>{
  const f=fixture();await f.ready();let release;
  f.hook(call=>call.method==='PATCH'?new Promise(resolve=>{release=()=>resolve({...f.append(call.body.items[0]),revision:'999'});}):undefined);
  const pending=f.controller.action('save');await f.controller.action('save');assert.equal(f.calls.filter(c=>c.method==='PATCH').length,1);
  release();await pending;assert.equal(f.controller.snapshot().uncertain,true);assert.equal(f.controller.snapshot().data,null);
  await f.controller.action('load');assert.equal(f.controller.snapshot().data.submittedEvidence.length,1);
});
test('H2 onboarding: unauthorized response discards private history/draft and permits no more requests',async()=>{
  for(const status of [401,403]){
    const f=fixture();await f.ready();await f.controller.action('save');f.controller.edit('note','PRIVATE_DRAFT');f.hook(()=>{throw problem(status);});
    await f.controller.action('load');const count=f.calls.length;await f.controller.action('load');await f.controller.action('evaluate');
    assert.equal(f.calls.length,count);assert.equal(f.controller.snapshot().data,null);assert.equal(f.controller.snapshot().draft.note,'');assert.doesNotMatch(f.controller.view(),/register:synthetic-1|PRIVATE_DRAFT|PRIVATE_DEPENDENCY_VALUE/);
  }
});
test('H2 onboarding: identity changes abort old work and prevent a stale response painting another tenant',async()=>{
  const f=fixture();let release;f.hook(()=>new Promise(resolve=>{release=resolve;}));const pending=f.controller.action('load');
  const oldSignal=f.calls[0].signal;f.identity({organizationId:id(4),userId:id(5)});f.controller.syncIdentity();assert.equal(oldSignal.aborted,true);
  release(initial());await pending;assert.equal(f.controller.snapshot().data,null);assert.equal(f.controller.snapshot().loaded,false);
});
test('H2 onboarding: navigating away clears private data and return/relogin resumes with a new server read',async()=>{
  const f=fixture();await f.ready();await f.controller.action('save');f.controller.edit('note','PRIVATE_DRAFT');
  f.identity({active:false});f.controller.syncIdentity();assert.equal(f.controller.snapshot().data,null);assert.equal(f.controller.snapshot().draft.note,'');
  f.identity({active:true});await f.controller.action('load');assert.equal(f.controller.snapshot().data.submittedEvidence.length,1);
  f.identity({logged:false});f.controller.syncIdentity();assert.equal(f.controller.snapshot().data,null);
  f.identity({logged:true});await f.controller.action('load');assert.equal(f.controller.snapshot().data.submittedEvidence.length,1);
});
test('H2 onboarding: session/profile identity cannot silently change on refresh',async()=>{
  for(const change of [{id:id(7)},{profile:'PRODUCTION'}]){
    const f=fixture();await f.controller.action('load');f.set(change);await f.controller.action('load');assert.equal(f.controller.snapshot().data,null);
  }
});
test('H2 onboarding: all private values are escaped text and opaque references never become links',async()=>{
  const f=fixture();f.append({step:'DRY_RUN',reference:'<img src=x onerror=alert(1)>',note:'</textarea><script>private()</script>'});
  await f.controller.action('load');f.controller.edit('reference','https://private.invalid/<script>');const document=doc(f);
  assert.equal(document.querySelectorAll('img,script,a').length,0);assert.match(document.body.textContent,/<img src=x onerror=alert\(1\)>/);
  assert.equal(document.querySelector('#onboarding-reference').value,'https://private.invalid/<script>');
});
test('H2 onboarding: scripts use no browser storage or external fetch outside the scoped API adapter',async()=>{
  const context=vm.createContext({AbortController,queueMicrotask,BSSCore:{api:{request:async()=>initial()}}});
  for(const key of ['localStorage','sessionStorage','fetch'])Object.defineProperty(context,key,{get(){throw new Error('Private browser persistence/external fetch forbidden');}});
  for(const file of ['src/domain/onboarding.js','src/views/onboarding.js','src/adapters/api-onboarding.js'])vm.runInContext(fs.readFileSync(file,'utf8'),context);
  const controller=context.BSSOnboarding;controller.configure({context:()=>({logged:true,api:true,active:true,role:'admin',organizationId:id(2),userId:id(3)})});
  await controller.action('load');controller.edit('reference','PRIVATE_MEMORY_ONLY');assert.equal(controller.snapshot().draft.reference,'PRIVATE_MEMORY_ONLY');
  assert.equal(controller.snapshot().data.goLiveApproved,false);
});
test('H2 onboarding: unavailable/missing profile/rate-limit errors expose no private dependency message',async()=>{
  for(const status of [404,429,503,500]){
    const f=fixture();f.hook(()=>{throw problem(status);});await f.controller.action('load');assert.equal(f.controller.snapshot().data,null);
    assert.equal(doc(f).querySelector('fieldset'),null);assert.doesNotMatch(f.controller.view(),/PRIVATE_DEPENDENCY_VALUE/);
  }
});
test('H2 onboarding: navigation destinations are explicit and cannot mutate or fabricate progress',async()=>{
  const f=fixture();await f.controller.action('load');for(const name of ['company','departments','shifts','holidays','workers','import','roles','terminal'])await f.controller.action('goto',name);
  await f.controller.action('goto','https://untrusted.invalid');assert.equal(f.visits.length,8);assert.equal(f.calls.length,1);assert.equal(f.get().submittedEvidence.length,0);
  assert.throws(()=>domain.evidence({step:'APPROVE',reference:'x'}));
});
test('H2 onboarding: exact Unicode/control boundaries preserve backend reference and multiline-note rules',()=>{
  const valid={step:'DRY_RUN',reference:'😀'.repeat(500),note:'line one\tcontext\r\nline two'};
  assert.equal(domain.evidence(valid).reference.length,1000);
  for(const code of [...Array.from({length:32},(_,i)=>i),127]){
    const char=String.fromCodePoint(code),reference='x'+char+'y';
    assert.throws(()=>domain.evidence({...valid,reference}));
    const note='x'+char+'y';
    if([9,10,13].includes(code))assert.equal(domain.evidence({...valid,note}).note,note);
    else assert.throws(()=>domain.evidence({...valid,note}));
  }
  assert.throws(()=>domain.evidence({...valid,reference:'😀'.repeat(501)}));
});
test('H2 onboarding: explicit router notifications clear private state immediately on leaving and reload on return',async()=>{
  const f=fixture({active:undefined});f.controller.syncIdentity('onboarding');await f.ready();await f.controller.action('save');
  f.controller.edit('note','PRIVATE_ROUTE_DRAFT');f.controller.syncIdentity('workers');
  assert.equal(f.controller.snapshot().data,null);assert.equal(f.controller.snapshot().draft.note,'');
  const count=f.calls.length;await f.controller.action('load');assert.equal(f.calls.length,count);
  f.controller.syncIdentity('onboarding');await f.controller.action('load');assert.equal(f.controller.snapshot().data.submittedEvidence.length,1);
});
test('H2 onboarding: actual delegated button clicks dispatch the registered action and all setup destinations',async()=>{
  const f=fixture();await f.controller.action('load');
  const dom=new JSDOM('<div id="content"></div>',{runScripts:'outside-only'}),window=dom.window,requests=[];
  window.onboardingAction=(name,value)=>{const result=f.controller.action(name,value);if(result?.then)requests.push(result);return result;};
  vm.runInContext(fs.readFileSync('src/views/events.js','utf8'),dom.getInternalVMContext());
  window.document.getElementById('content').innerHTML=f.controller.view();
  const buttons=[...window.document.querySelectorAll('button[data-bss-action]')].filter(button=>button.dataset.bssAction.includes("'goto'"));
  assert.equal(buttons.length,8);buttons.forEach(button=>button.click());
  assert.deepEqual(f.visits,['company','departments','shifts','holidays','workers','import','roles','terminal']);
  window.document.querySelector('[data-bss-action="onboardingAction(\'load\')"]').click();await Promise.all(requests);
  assert.equal(f.calls.filter(call=>call.method==='GET').length,2);
  assert.equal(window.BSSCore.views.events.parse('unapprovedAction()'),null);window.close();
});
