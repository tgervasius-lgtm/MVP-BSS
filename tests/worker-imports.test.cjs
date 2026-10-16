const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {webcrypto}=require('node:crypto');
const {JSDOM}=require('jsdom');
const {createController}=require('../src/adapters/api-worker-imports.js');

const id='10000000-0000-4000-8000-000000000001',department='20000000-0000-4000-8000-000000000001',shift='30000000-0000-4000-8000-000000000001';
const copy=value=>structuredClone(value);
const problem=status=>Object.assign(new Error('Synthetic refusal'),{status});
function fixture({count=201,enabled=true,role='admin',invalid=false}={}){
  const rows=Array.from({length:count},(_,i)=>[`IM-${i}`,'Synthetic Person','Department','Day','0']);
  let session={id,state:'NEEDS_MAPPING',revision:'1',createdAt:new Date().toISOString(),expiresAt:new Date(Date.now()+3600000).toISOString(),
    fileChecksum:'a'.repeat(64),previewChecksum:null,mappingChecksum:null,counts:{total:count,valid:0,blocked:count}};
  let mapping=null,result=null,identity={organizationId:'org-first',userId:'admin-first',role,logged:true,api:true};
  const calls=[],saved=new Map();let readHook=null,commitHook=null,uploadHook=null,patchHook=null,refreshHook=null;
  const policy={version:'policy-v1',approvalStatus:'APPROVED',uploadEnabled:enabled,maxUploadBytes:1048576,maxRows:1000,maxColumns:6,
    formats:['csv','xlsx'],csvDelimiters:[',',';'],maxNonterminalSessions:2,maxPreviewRows:100,sessionTtlSeconds:86400,lifecycleNotice:'Synthetic lifecycle notice'};
  const api={query:values=>'?'+new URLSearchParams(values),
    async get(path,params={}){
      calls.push({method:'GET',path,params});if(readHook){const value=await readHook(path,params);if(value!==undefined)return value;}
      if(path==='/worker-import-policy')return copy(policy);
      if(path==='/departments')return[{id:department,name:'Active department',status:'active'},{id:'inactive',name:'Inactive department',status:'inactive'}];
      if(path==='/shifts')return[{id:shift,name:'Day',status:'active'}];
      if(path==='/worker-imports')return{items:[copy(session)],nextCursor:null};
      if(path===`/worker-imports/${id}`)return{...copy(session),...(result?{result:copy(result)}:{})};
      if(path.endsWith('/rows')){
        const offset=params.cursor?Number(params.cursor):0,last=Math.min(offset+params.limit,count);
        return{session:copy(session),offset,headers:['Code','Name','Department','Shift','Days'],mapping:copy(mapping),
          sourceRows:copy(rows.slice(offset,last)),canonicalRows:mapping&&!invalid?rows.slice(offset,last).map(row=>({code:row[0],name:row[1],email:null,departmentId:department,shiftId:shift,annualLeaveAllowance:0})):null,
          counts:copy(session.counts),issues:invalid&&last===count?[{rowNumber:count+1,field:'code',code:'DUPLICATE_IN_FILE'}]:[],requiresRefresh:false,nextCursor:last<count?String(last):null};
      }
      throw new Error(`Unexpected GET ${path}`);
    },
    async patch(path,body,headers){
      calls.push({method:'PATCH',path,body:copy(body),headers});if(patchHook)return patchHook(path,body,headers);
      mapping=copy(body);session={...session,state:invalid?'INVALID':'READY',revision:String(Number(session.revision)+1),previewChecksum:'b'.repeat(64),mappingChecksum:'c'.repeat(64),counts:{total:count,valid:invalid?count-1:count,blocked:invalid?1:0}};
      return copy(session);
    },
    async post(path,body,headers){
      calls.push({method:'POST',path,body:copy(body),headers});
      if(path.endsWith('/commit')){
        if(commitHook)return commitHook(path,body,headers);
        result={createdCount:count,commitId:'commit-result',sessionId:id};session={...session,state:'COMMITTED'};return copy(result);
      }
      session={...session,state:'CANCELLED',revision:String(Number(session.revision)+1)};return copy(session);
    },
    async upload(path,file,headers,signal){calls.push({method:'UPLOAD',path,file,headers,signal});if(uploadHook)return uploadHook(path,file,headers,signal);return copy(session);}
  };
  const storage={getItem:key=>saved.get(key)||null,setItem:(key,value)=>saved.set(key,value),removeItem:key=>saved.delete(key)};
  const controller=createController({api,context:()=>identity,storage,crypto:webcrypto,refresh:async()=>{if(refreshHook)return refreshHook();}});
  const helpers={controller,api,policy,calls,saved,rows,storage,
    session:()=>session,setSession:value=>{session={...session,...value};},setIdentity:value=>{identity={...identity,...value};},
    setReadHook:value=>{readHook=value;},setCommitHook:value=>{commitHook=value;},setUploadHook:value=>{uploadHook=value;},setPatchHook:value=>{patchHook=value;},setRefreshHook:value=>{refreshHook=value;},
    setResult:value=>{result=value;}};
  helpers.open=async()=>{await controller.action('load');await controller.action('resume',id);};
  helpers.map=async()=>{['code','name','department','shift','annualLeaveAllowance'].forEach((field,index)=>controller.changeColumn(index,field));controller.changeBinding('department',0,department);controller.changeBinding('shift',0,shift);await controller.action('map');};
  helpers.approve=async()=>{await controller.action('approve');controller.approve(true);};
  return helpers;
}

test('H2 UI: disabled policy and non-Admin roles cannot select or send uploads',async()=>{
  const f=fixture({enabled:false});await f.controller.action('load');
  assert.match(f.controller.view(),/Novi uvoz nije dostupan/);assert.doesNotMatch(f.controller.view(),/type="file"/);
  f.controller.chooseFile({size:10});await f.controller.action('upload');assert.equal(f.calls.some(call=>call.method==='UPLOAD'),false);
  for(const role of ['manager','worker','accountant']){
    const denied=fixture({role});await denied.controller.action('load');await denied.controller.action('resume',id);
    assert.equal(denied.calls.length,0);assert.match(denied.controller.view(),/Prijavite se kao administrator/);
  }
});
test('H2 UI: five-column source maps explicitly and collects every server preview page',async()=>{
  const f=fixture();await f.open();assert.equal(f.controller.snapshot().sourceRows.length,201);
  assert.equal(f.calls.filter(call=>call.path.endsWith('/rows')).length,3);
  assert.deepEqual(f.controller.snapshot().mapping.columns,['','','','','']);
  await f.map();const state=f.controller.snapshot();assert.equal(state.phase,'review');assert.equal(state.sourceRows.length,201);
  const sent=f.calls.find(call=>call.method==='PATCH');assert.deepEqual(sent.body.columns,['code','name','department','shift','annualLeaveAllowance']);
  assert.deepEqual(sent.body.departments,[{source:'Department',id:department}]);assert.equal(sent.headers['If-Match'],'"1"');
  assert.equal(state.departments.length,1);assert.equal(new JSDOM(f.controller.view()).window.document.querySelectorAll('tbody tr').length,100);
  await f.controller.action('page',2);assert.match(f.controller.view(),/IM-200/);
});
test('H2 UI: duplicate or missing source columns and every unbound reference block mapping',async()=>{
  const f=fixture();await f.open();['code','name','department','shift','shift'].forEach((field,index)=>f.controller.changeColumn(index,field));
  await f.controller.action('map');assert.equal(f.calls.some(call=>call.method==='PATCH'),false);
  f.controller.changeColumn(4,'annualLeaveAllowance');await f.controller.action('map');assert.equal(f.calls.some(call=>call.method==='PATCH'),false);
  f.controller.changeBinding('department',0,department);await f.controller.action('map');assert.equal(f.calls.some(call=>call.method==='PATCH'),false);
  f.controller.changeBinding('shift',0,shift);await f.controller.action('map');assert.equal(f.calls.filter(call=>call.method==='PATCH').length,1);
});
test('H2 UI: invalid final-page row is visible in filtered preview and cannot be approved',async()=>{
  const f=fixture({count:1000,invalid:true});await f.open();await f.map();f.controller.filterErrors(true);
  assert.match(f.controller.view(),/1001/);assert.match(f.controller.view(),/IM-999/);await f.controller.action('approve');f.controller.approve(true);
  await f.controller.action('commit');assert.equal(f.calls.some(call=>call.path.endsWith('/commit')),false);
});
test('H2 UI: requiresRefresh and inconsistent revision invalidate complete review',async()=>{
  const f=fixture();await f.open();await f.map();
  f.setReadHook((path,params)=>path.endsWith('/rows')&&params.cursor?{session:{...f.session(),revision:'99'},offset:100,sourceRows:[],counts:{total:201}}:undefined);
  await f.controller.action('reload');assert.equal(f.controller.snapshot().complete,false);assert.equal(f.controller.snapshot().sourceRows.length,0);
  await f.controller.action('approve');assert.equal(f.controller.snapshot().approval,null);
});
test('H2 UI: revision-bound approval is unchecked after remapping and double submit is blocked',async()=>{
  const f=fixture();await f.open();await f.map();await f.approve();assert.ok(f.controller.snapshot().approval);
  await f.controller.action('mapping');assert.equal(f.controller.snapshot().approval,null);await f.controller.action('commit');
  assert.equal(f.calls.some(call=>call.path.endsWith('/commit')),false);
  await f.controller.action('map');await f.approve();let finish;
  f.setCommitHook(()=>new Promise(resolve=>{finish=resolve;}));const first=f.controller.action('commit');await f.controller.action('commit');
  assert.equal(f.calls.filter(call=>call.path.endsWith('/commit')).length,1);finish({createdCount:201});await first;
  assert.equal(f.controller.snapshot().phase,'result');assert.equal(f.controller.snapshot().sourceRows.length,0);assert.equal(f.saved.size,0);
});
test('H2 UI: uncertain commit reads back durable result without new POST or duplicate identity',async()=>{
  const f=fixture();await f.open();await f.map();await f.approve();
  f.setCommitHook(()=>{f.setSession({state:'COMMITTED'});f.setResult({createdCount:201});throw problem(0);});
  await f.controller.action('commit');assert.equal(f.controller.snapshot().phase,'uncertain');assert.equal(f.controller.snapshot().sourceRows.length,0);
  const metadata=[...f.saved.values()].join('');assert.doesNotMatch(metadata,/Synthetic Person|Department|IM-0|rows|name/);
  await f.controller.action('recover');assert.equal(f.controller.snapshot().phase,'result');assert.equal(f.controller.snapshot().result.createdCount,201);
  assert.equal(f.calls.filter(call=>call.path.endsWith('/commit')).length,1);assert.equal(f.saved.size,0);
});
test('H2 UI: explicit retry after fresh read-back uses the identical key/revision/checksum',async()=>{
  const f=fixture();await f.open();await f.map();await f.approve();let attempts=0;
  f.setCommitHook(()=>{attempts+=1;if(attempts===1)throw problem(0);return{createdCount:201};});
  await f.controller.action('commit');await f.controller.action('retryCommit');assert.equal(attempts,1);
  await f.controller.action('recover');await f.controller.action('retryCommit');assert.equal(attempts,2);
  const posts=f.calls.filter(call=>call.path.endsWith('/commit'));assert.deepEqual(posts[0].body,posts[1].body);assert.deepEqual(posts[0].headers,posts[1].headers);
});
test('H2 UI: changed revision after uncertain commit requires fresh review and approval',async()=>{
  const f=fixture();await f.open();await f.map();await f.approve();f.setCommitHook(()=>{throw problem(0);});await f.controller.action('commit');
  f.setSession({revision:'3',previewChecksum:'d'.repeat(64)});await f.controller.action('recover');
  assert.equal(f.controller.snapshot().phase,'review');assert.equal(f.controller.snapshot().approval,null);assert.equal(f.saved.size,0);
  await f.controller.action('retryCommit');assert.equal(f.calls.filter(call=>call.path.endsWith('/commit')).length,1);
});
test('H2 UI: a successful commit remains successful when worker-list refresh fails',async()=>{
  const f=fixture();await f.open();await f.map();await f.approve();f.setRefreshHook(()=>{throw new Error('refresh unavailable');});await f.controller.action('commit');
  assert.equal(f.controller.snapshot().phase,'result');assert.equal(f.controller.snapshot().intent,null);
});
test('H2 UI: cancel requires a separate confirmation and purges the in-memory preview',async()=>{
  const f=fixture();await f.open();await f.controller.action('cancel');assert.equal(f.calls.some(call=>call.path.endsWith('/cancel')),false);
  await f.controller.action('cancelAsk');await f.controller.action('cancel');assert.equal(f.controller.snapshot().session.state,'CANCELLED');assert.equal(f.controller.snapshot().sourceRows.length,0);
  const post=f.calls.find(call=>call.path.endsWith('/cancel'));assert.equal(post.body,undefined);assert.equal(post.headers['If-Match'],'"1"');
});
test('H2 UI: tenant/role switch discards late results, rows, file and pending metadata',async()=>{
  const f=fixture();await f.open();let finish;f.setReadHook(path=>path===`/worker-imports/${id}`?new Promise(resolve=>{finish=resolve;}):undefined);
  const read=f.controller.action('reload');f.setIdentity({role:'manager'});f.controller.syncIdentity();finish(f.session());await read;
  assert.equal(f.controller.snapshot().session,null);assert.equal(f.controller.snapshot().sourceRows.length,0);assert.equal(f.saved.size,0);
});
test('H2 UI: text from source headers, values and references is escaped in markup',async()=>{
  const f=fixture({count:1});f.rows[0][1]='<img src=x onerror=alert(1)>';await f.open();await f.map();
  const document=new JSDOM(f.controller.view()).window.document;assert.equal(document.querySelectorAll('img,script,[onerror]').length,0);assert.match(document.body.textContent,/<img src=x/);
});
test('H2 UI: oversized file is rejected before reading bytes or calling upload',async()=>{
  const f=fixture();await f.controller.action('load');let read=false;
  f.controller.chooseFile({size:1048577,name:'synthetic.csv',arrayBuffer:async()=>{read=true;}});await f.controller.action('upload');
  assert.equal(read,false);assert.equal(f.calls.some(call=>call.method==='UPLOAD'),false);
});
test('H2 UI: raw CSV upload carries explicit delimiter and preserves uncertain identity',async()=>{
  const f=fixture({count:1});await f.controller.action('load');f.controller.selectDelimiter(';');
  const bytes=new TextEncoder().encode('Code;Name;Department;Shift;Days\nI1;Synthetic;Department;Day;0');
  const file={name:'synthetic.csv',size:bytes.length,arrayBuffer:async()=>bytes.buffer};f.controller.chooseFile(file);
  let attempts=0;f.setUploadHook(()=>{attempts+=1;if(attempts===1)throw problem(0);return f.session();});
  await f.controller.action('upload');assert.equal(f.controller.snapshot().phase,'uncertain');assert.equal(f.saved.size,1);
  await f.controller.action('upload');const sent=f.calls.filter(call=>call.method==='UPLOAD');assert.equal(sent.length,2);
  assert.equal(sent[0].file,file);assert.equal(sent[0].headers['Content-Type'],'text/csv');assert.equal(sent[0].headers['Idempotency-Key'],sent[1].headers['Idempotency-Key']);
  assert.match(sent[0].path,/delimiter=%3B/);assert.equal(f.controller.snapshot().phase,'mapping');
});

test('H2 transport: raw Blob and its MIME survive one authorized session refresh',async()=>{
  const calls=[],file=new Blob(['synthetic']);let protectedRequests=0;
  const scope={AbortController,setTimeout,clearTimeout,URLSearchParams,console,document:{querySelector:()=>null},
    fetch:async(url,options)=>{calls.push({url,options});if(url.endsWith('/auth/refresh'))return{ok:true,status:204};protectedRequests+=1;
      return protectedRequests===1?{status:401,ok:false}:{status:201,ok:true,json:async()=>({id})};}};
  vm.createContext(scope);vm.runInContext(fs.readFileSync('src/adapters/api.js','utf8'),scope);
  await scope.BSSCore.api.upload('/worker-imports',file,{'Content-Type':'text/csv','Idempotency-Key':'same-upload-key'});
  assert.equal(calls.length,3);for(const call of [calls[0],calls[2]]){assert.equal(call.options.body,file);assert.equal(call.options.headers['Content-Type'],'text/csv');assert.equal(call.options.credentials,'include');}
});

test('H2 UI: unavailable or malformed policy stays closed without an automatic retry loop',async()=>{
  const f=fixture();f.setReadHook(path=>{if(path==='/worker-import-policy')throw problem(503);});
  await f.controller.action('load');f.controller.view();await new Promise(resolve=>setImmediate(resolve));
  assert.equal(f.calls.length,1);assert.doesNotMatch(f.controller.view(),/type="file"/);
  const malformed=fixture();delete malformed.policy.maxUploadBytes;await malformed.controller.action('load');
  assert.doesNotMatch(malformed.controller.view(),/type="file"/);
});
test('H2 UI: server-side role denial clears a previously authorized private preview',async()=>{
  const f=fixture();await f.open();await f.map();f.setReadHook(path=>{if(path===`/worker-imports/${id}`)throw problem(403);});
  await f.controller.action('reload');assert.equal(f.controller.snapshot().sourceRows.length,0);assert.equal(f.controller.snapshot().session,null);
  assert.doesNotMatch(f.controller.view(),/Synthetic Person|IM-0|type="file"/);
});

test('H2 UI: matching checksum alone cannot resolve an uncertain upload identity',async()=>{
  const f=fixture({count:1});await f.controller.action('load');f.controller.selectDelimiter(';');
  const bytes=new TextEncoder().encode('synthetic bytes');f.controller.chooseFile({name:'synthetic.csv',size:bytes.length,arrayBuffer:async()=>bytes.buffer});
  f.setUploadHook(()=>{throw problem(0);});await f.controller.action('upload');
  f.setSession({fileChecksum:f.controller.snapshot().intent.checksum,state:'COMMITTED'});
  const before=f.calls.length;await f.controller.action('resume',id);
  assert.equal(f.calls.length,before);assert.equal(f.controller.snapshot().phase,'uncertain');assert.ok(f.controller.snapshot().intent);
});
