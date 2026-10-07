import assert from 'node:assert/strict';
import test from 'node:test';
import { loadConfig } from '../../src/config.js';
import { buildApp } from '../../src/http/app.js';
import type { DocumentService, DocumentView } from '../../src/documents/model.js';
import { MAX_DOCUMENT_BYTES } from '../../src/documents/model.js';
import { FakeAuthService, FakePhaseAService, IDS } from '../helpers/fakes.js';
const config=loadConfig({NODE_ENV:'test',PUBLIC_ORIGIN:'http://localhost:3000',DATABASE_URL:'postgres://unused',LOG_LEVEL:'silent'});
const item:DocumentView={id:IDS.export,workerId:IDS.worker,workerName:'Synthetic',workerCode:'001',title:'Listopad',category:'payslip',period:'2026-10',state:'draft',bytes:20,revision:'1',createdAt:'2026-10-06T10:00:00.000Z',publishedAt:null};
test('document HTTP denies missing identity, managers, worker writes and CSRF; disabled mode returns 503',async t=>{
  const app=await buildApp({config,authService:new FakeAuthService(),phaseAService:new FakePhaseAService(),logger:false});t.after(()=>app.close());
  assert.equal((await app.inject({url:'/api/v1/documents/config'})).statusCode,401);
  assert.equal((await app.inject({url:'/api/v1/documents/config',cookies:{bss_session:'manager'}})).statusCode,403);
  assert.equal((await app.inject({url:'/api/v1/documents/config',cookies:{bss_session:'worker'}})).json().enabled,false);
  assert.equal((await app.inject({url:'/api/v1/documents',cookies:{bss_session:'worker'}})).statusCode,503);
  for(const role of ['worker','manager'])assert.equal((await app.inject({method:'POST',url:'/api/v1/documents',cookies:{bss_session:role},headers:{origin:config.publicOrigin},payload:{}})).statusCode,403);
  assert.equal((await app.inject({method:'POST',url:'/api/v1/documents',cookies:{bss_session:'admin'},payload:{}})).statusCode,403);
});

test('document upload rejects oversized bodies and bounds concurrent work with released slots',async t=>{
  let release!:()=>void,entered!:()=>void,count=0;
  const held=new Promise<void>(resolve=>{release=resolve;});
  const bothEntered=new Promise<void>(resolve=>{entered=resolve;});
  const documents:DocumentService={recipients:async()=>[],list:async()=>({items:[],nextCursor:null}),
    upload:async()=>{count++;if(count===2)entered();await held;return item;},
    transition:async()=>item,download:async()=>({content:Buffer.alloc(0),fileName:'fixture.pdf'})};
  const app=await buildApp({config,authService:new FakeAuthService(),phaseAService:new FakePhaseAService(),documents,logger:false});t.after(()=>app.close());
  const request={method:'POST' as const,url:'/api/v1/documents',cookies:{bss_session:'accountant'},headers:{origin:config.publicOrigin}};
  const payload={workerId:IDS.worker,uploadId:IDS.export,title:'Listopad',category:'payslip',period:'2026-10',contentBase64:'AA=='};
  const oversized=await app.inject({...request,payload:{...payload,contentBase64:'A'.repeat(Math.ceil(MAX_DOCUMENT_BYTES/3)*4+8192)}});
  assert.equal(oversized.statusCode,413);assert.equal(count,0);
  const first=app.inject({...request,payload}).then(result=>result);
  const second=app.inject({...request,payload}).then(result=>result);
  try{
    await bothEntered;
    assert.equal((await app.inject({...request,payload})).statusCode,429);
    assert.equal(count,2);
  }finally{release();}
  for(const result of await Promise.all([first,second]))assert.equal(result.statusCode,201);
  assert.equal((await app.inject({...request,payload})).statusCode,201);assert.equal(count,3);
});
test('document HTTP validates recipient/month, explicit transition and revision; downloads remain private attachments',async t=>{
  let uploads=0,transitions=0;
  const documents:DocumentService={recipients:async()=>[],list:async()=>({items:[item],nextCursor:null}),upload:async()=>{uploads++;return item;},transition:async()=>{transitions++;return item;},download:async()=>({content:Buffer.from('%PDF-1.4\nfixture\n%%EOF'),fileName:'BSS-fixture.pdf'})};
  const app=await buildApp({config,authService:new FakeAuthService(),phaseAService:new FakePhaseAService(),documents,logger:false});t.after(()=>app.close());
  const cookies={bss_session:'accountant'},headers={origin:config.publicOrigin};
  const payload={workerId:IDS.worker,uploadId:IDS.export,title:'Listopad',category:'payslip',period:'2026-10',contentBase64:'AA=='};
  assert.equal((await app.inject({method:'POST',url:'/api/v1/documents',cookies,headers,payload:{...payload,organizationId:IDS.organization}})).statusCode,422);
  assert.equal((await app.inject({method:'POST',url:'/api/v1/documents',cookies,headers,payload})).statusCode,201);assert.equal(uploads,1);
  const url=`/api/v1/documents/${IDS.export}/publish`;
  assert.equal((await app.inject({method:'POST',url,cookies,headers,payload:{confirmed:true}})).statusCode,422);
  assert.equal((await app.inject({method:'POST',url,cookies,headers:{...headers,'if-match':'"1"'},payload:{confirmed:false}})).statusCode,422);
  assert.equal((await app.inject({method:'POST',url,cookies,headers:{...headers,'if-match':'"1"'},payload:{confirmed:true}})).statusCode,200);assert.equal(transitions,1);
  const result=await app.inject({url:`/api/v1/documents/${IDS.export}/download`,cookies:{bss_session:'worker'}});
  assert.equal(result.statusCode,200);assert.match(result.headers['content-disposition']!,/^attachment;/);assert.equal(result.headers['cache-control'],'no-store, private');assert.equal(result.headers['x-content-type-options'],'nosniff');
  assert.equal((await app.inject({url:'/api/v1/documents?limit=101',cookies})).statusCode,422);
  assert.equal((await app.inject({url:'/api/v1/documents/recipients',cookies:{bss_session:'worker'}})).statusCode,403);
});
