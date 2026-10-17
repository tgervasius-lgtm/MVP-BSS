(function registerWorkerImports(root){
  'use strict';

  const templates=typeof module==='object'&&module.exports?module.require('../views/worker-imports.js'):root.BSSCore.views.workerImports;
  const {fields,stamp,renderView}=templates;
  const referenceKeys={department:'departments',shift:'shifts'};
  const terminal=new Set(['COMMITTED','CANCELLED','EXPIRED','FAILED']);
  const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
  const checksum=/^[a-f0-9]{64}$/;
  const empty=()=>({phase:'list',busy:false,loaded:false,policy:null,sessions:[],nextCursor:null,session:null,result:null,
    headers:[],sourceRows:[],canonicalRows:null,issues:[],mapping:{columns:[],departments:[],shifts:[]},departments:[],shifts:[],
    page:0,onlyErrors:false,stale:false,complete:false,approval:null,file:null,format:'csv',delimiter:'',error:'',notice:'',intent:null,retry:false});

  function message(error){
      if(error?.status===401)return'Sesija je istekla. Prijavite se ponovno; rezultat provjerite nakon prijave.';
      if(error?.status===403)return'Za uvoz su potrebna administratorska prava.';
      if(error?.status===404)return'Priprema nije pronađena ili joj nemate pristup.';
      if(error?.status===410)return'Privremeni podaci više nisu dostupni. Provjerite spremljeni rezultat pripreme.';
      if(error?.status===429)return'Previše zahtjeva. Pričekajte jednu minutu pa ponovno provjerite status.';
      if(error?.status===503)return'Uvoz trenutačno nije dostupan. Pričekajte jednu minutu pa provjerite postojeći postupak.';
      if(error?.status===409||error?.code==='STALE_REVISION')return'Podaci su se promijenili. Ponovno dohvatite i pregledajte pripremu prije potvrde.';
      return error?.message||'Nije moguće dovršiti zahtjev. Provjerite postojeću pripremu.';
    }

  /** @param {{kind:string,checksum?:string,format?:string,delimiter?:string,policyVersion?:string}} intent */
  function uploadIdentityMatches(intent,desired){
    return intent.kind==='upload'&&intent.checksum===desired.checksum&&intent.format===desired.format
      &&intent.delimiter===desired.delimiter&&intent.policyVersion===desired.policyVersion;
  }

  function validatePage(part,session,offset){
    const sameSession=part.session?.id===session.id&&part.session.revision===session.revision;
    const boundedRows=Array.isArray(part.sourceRows)&&part.sourceRows.length<=100;
    const boundedCount=Number.isInteger(part.counts?.total)&&part.counts.total>=1&&part.counts.total<=1000;
    if(!sameSession||part.offset!==offset||!boundedRows||!boundedCount){
      throw new Error('Pregled nije potpun. Ponovno dohvatite pripremu.');
    }
  }
  function validateStablePreview(first,part){
    if(!first)return;
    for(const key of ['headers','mapping','counts']){
      if(JSON.stringify(part[key])!==JSON.stringify(first[key]))throw new Error('Pregled se promijenio tijekom čitanja. Ponovno dohvatite pripremu.');
    }
  }

  function createController({api,context=()=>null,changed=()=>{},navigate=()=>{},refresh=async()=>{},storage,crypto=root.crypto,clock=()=>Date.now()}={}){
    let config={context,changed,navigate,refresh},model=empty(),identity='',generation=0,controller=null;
    const allowed=()=>{const c=config.context();return Boolean(c?.logged&&c.api&&c.role==='admin'&&c.organizationId&&c.userId);};
    const storageKey=()=>`bss-import-intent-v1:${identity}`;
    const activePolicy=()=>{const p=model.policy;return p?.approvalStatus==='APPROVED'&&p.uploadEnabled===true
      &&typeof p.version==='string'&&p.version.length>0&&Number.isInteger(p.maxUploadBytes)&&p.maxUploadBytes>0&&p.maxUploadBytes<=1048576
      &&Number.isInteger(p.maxRows)&&p.maxRows>0&&p.maxRows<=1000&&Number.isInteger(p.maxColumns)&&p.maxColumns>=5&&p.maxColumns<=6
      &&Array.isArray(p.formats)&&p.formats.includes(model.format)&&Array.isArray(p.csvDelimiters);};
    const revisionHeaders=()=>({'If-Match':`"${model.session.revision}"`});
    const clearRows=()=>{model.headers=[];model.sourceRows=[];model.canonicalRows=null;model.issues=[];model.complete=false;model.approval=null;model.page=0;};
    function removeIntent(){try{storage?.removeItem(storageKey());}catch{/* Metadata only; memory remains authoritative for this tab. */}model.intent=null;model.retry=false;}
    function saveIntent(intent){model.intent=intent;try{storage?.setItem(storageKey(),JSON.stringify(intent));}catch{/* Read-back remains available without tab storage. */}}
    function readIntent(){
      try{
        const item=JSON.parse(storage?.getItem(storageKey())||'null');
        if(item?.kind==='commit'&&uuid.test(item.id)&&/^[1-9]\d{0,18}$/.test(item.revision)&&checksum.test(item.checksum)&&uuid.test(item.key))return item;
        if(item?.kind==='upload'&&uuid.test(item.key)&&checksum.test(item.checksum)&&['csv','xlsx'].includes(item.format)
          &&typeof item.policyVersion==='string'&&item.policyVersion.length<100&&(item.format==='xlsx'||[',',';'].includes(item.delimiter)))return item;
      }catch{/* Invalid or inaccessible tab metadata never enables a mutation. */}
      return null;
    }
    function syncIdentity(){
      const c=config.context(),next=allowed()?`${c.organizationId}:${c.userId}`:'';
      if(next===identity)return;
      if(identity)removeIntent();
      controller?.abort();generation+=1;identity=next;model=empty();
      if(identity){model.intent=readIntent();if(model.intent){model.phase='uncertain';if(model.intent.kind==='upload'){model.format=model.intent.format;model.delimiter=model.intent.delimiter;}}}
    }
    function notify(focus=true){if(allowed())config.changed(focus);}
    function configure(value){config={...config,...value};syncIdentity();}
    async function run(operation){
      syncIdentity();if(!allowed()||model.busy)return;
      const version=generation;controller=new root.AbortController();model.busy=true;model.error='';model.approval=null;notify();
      const current=()=>version===generation&&allowed();
      try{await operation(current,controller.signal);}
      catch(error){if(current()){
        const text=message(error);model.loaded=true;
        if(error.status===401||error.status===403){removeIntent();model={...empty(),loaded:true,phase:'denied'};}
        model.error=text;
      }}
      finally{if(current()){model.busy=false;notify();}}
    }
    async function references(){
      const [departments,shifts]=await Promise.all([api.get('/departments'),api.get('/shifts')]);
      return {departments:departments.filter(item=>item.status==='active'),shifts:shifts.filter(item=>!item.status||item.status==='active')};
    }
    async function list(cursor){return api.get('/worker-imports',{limit:50,...(cursor?{cursor}:{})});}
    async function load(){
      await run(async current=>{
        model.policy=null;const policy=await api.get('/worker-import-policy');if(!current())return;
        model.policy=policy;model.loaded=true;
        if(activePolicy()){
          const [page,refs]=await Promise.all([list(),references()]);if(!current())return;
          Object.assign(model,refs,{sessions:page.items,nextCursor:page.nextCursor});
        }
        if(model.intent?.kind==='commit')await recoverCurrent(current);
        else if(model.intent)model.phase='uncertain';
      });
    }
    async function collect(session){
      const sourceRows=[],issues=[],canonicalRows=[];let cursor,first=null,stale=false;const seen=new Set();
      for(let page=0;page<10;page+=1){
        const part=await api.get(`/worker-imports/${session.id}/rows`,{revision:session.revision,limit:100,...(cursor?{cursor}:{})});
        validatePage(part,session,sourceRows.length);
        validateStablePreview(first,part);
        first||=part;stale||=part.requiresRefresh===true;
        sourceRows.push(...part.sourceRows);issues.push(...part.issues);
        if(part.canonicalRows)canonicalRows.push(...part.canonicalRows);
        cursor=part.nextCursor;
        if(!cursor){
          if(sourceRows.length!==part.counts.total)throw new Error('Nisu dohvaćeni svi retci pripreme.');
          return {headers:first.headers,sourceRows,canonicalRows:canonicalRows.length===sourceRows.length?canonicalRows:null,
            issues,counts:part.counts,mapping:first.mapping,stale,complete:true};
        }
        if(!part.sourceRows.length||seen.has(cursor))throw new Error('Poslužitelj nije vratio sljedeću stranicu pregleda.');
        seen.add(cursor);
      }
      throw new Error('Pregled prelazi dopuštenih 1.000 redaka.');
    }
    async function readSession(id,current){
      if(!uuid.test(id))throw new Error('Poslužitelj nije vratio valjanu oznaku pripreme.');
      const session=await api.get(`/worker-imports/${id}`);if(!current())return;
      clearRows();model.session=session;model.result=session.result||null;model.stale=false;model.retry=false;
      if(terminal.has(session.state)){model.phase=session.state==='COMMITTED'?'result':'terminal';return;}
      if(session.state==='PARSING'){model.phase='parsing';return;}
      const [page,refs]=await Promise.all([collect(session),references()]);if(!current())return;
      Object.assign(model,refs,page);model.mapping=page.mapping||{columns:new Array(page.headers.length).fill(''),departments:[],shifts:[]};
      model.phase=session.state==='NEEDS_MAPPING'?'mapping':'review';
    }
    async function resume(id){if(!uuid.test(id)||model.intent?.kind==='upload')return;
      await run(async current=>{
      await readSession(id,current);if(!current())return;
      if(model.intent?.kind==='commit'&&model.intent.id===id){await recoverCurrent(current);}
    });}
    function ready(){
      return model.complete&&!model.stale&&model.session?.state==='READY'&&model.counts?.blocked===0
        &&model.counts.total===model.sourceRows.length&&checksum.test(model.session.previewChecksum)
        &&Date.parse(model.session.expiresAt)>clock();
    }
    function values(field){
      const index=model.mapping.columns.indexOf(field);
      if(index<0)return[];
      return [...new Set(model.sourceRows.map(row=>row[index]).filter(value=>typeof value==='string').map(value=>value.trim()).filter(Boolean))].sort((left,right)=>left.localeCompare(right,'hr-HR'));
    }
    function referenceComplete(field){
      return values(field).every(source=>model.mapping[referenceKeys[field]].some(binding=>binding.source===source&&uuid.test(binding.id)));
    }
    function mappingComplete(){
      const columns=model.mapping.columns;
      if(columns.length!==model.headers.length||new Set(columns).size!==columns.length||columns.some(field=>!Object.hasOwn(fields,field)))return false;
      if(Object.keys(fields).filter(field=>field!=='email').some(field=>!columns.includes(field)))return false;
      return ['department','shift'].every(referenceComplete);
    }
    function changeColumn(index,value){
      if(model.busy||model.phase!=='mapping'||!Number.isInteger(index)||index<0||index>=model.headers.length||!Object.hasOwn(fields,value)&&value!=='')return;
      const previous=model.mapping.columns[index];model.mapping.columns[index]=value;model.approval=null;
      for(const field of ['department','shift'])if(previous===field||value===field)model.mapping[field==='department'?'departments':'shifts']=[];
      notify(false);
    }
    function changeBinding(field,index,id){
      if(model.busy||model.phase!=='mapping'||!['department','shift'].includes(field))return;
      const source=values(field)[index],key=referenceKeys[field];
      if(source===undefined||id&&!model[key].some(item=>item.id===id))return;
      model.mapping[key]=model.mapping[key].filter(binding=>binding.source!==source);
      if(id){model.mapping[key].push({source,id});}
      model.approval=null;notify(false);
    }
    async function map(){if(model.phase!=='mapping'||!model.complete||!mappingComplete()||!model.session)return;
      await run(async current=>{
      try{
        const result=await api.patch(`/worker-imports/${model.session.id}/mapping`,model.mapping,revisionHeaders());
        if(current()){clearRows();model.session=result;model.phase='stale';await readSession(result.id,current);}
      }catch(error){if(current()){clearRows();model.phase='stale';}throw error;}
    });}
    async function chooseApproval(){if(!ready()||!activePolicy())return;
      await run(async current=>{
      await readSession(model.session.id,current);if(current()&&ready())model.phase='approval';
    });}
    function approve(checked){if(model.phase!=='approval'||model.busy)return;
      model.approval=checked&&ready()?stamp(model.session):null;notify(false);}
    async function sendCommit(intent,current){
      try{
        const result=await api.post(`/worker-imports/${intent.id}/commit`,{approved:true,previewChecksum:intent.checksum},
          {'If-Match':`"${intent.revision}"`,'Idempotency-Key':intent.key});
        if(!current())return;
        removeIntent();clearRows();model.file=null;model.result=result;model.session={...model.session,state:'COMMITTED'};model.phase='result';
        try{await config.refresh();}catch{model.notice='Uvoz je potvrđen. Popis radnika osvježite pri povratku na radnike.';}
      }catch(error){
        if(!current())return;
        if(!error.status||error.status>=500){clearRows();model.phase='uncertain';model.retry=false;}
        else{removeIntent();clearRows();model.phase='stale';}
        throw error;
      }
    }
    async function commit(){
      if(model.phase!=='approval'||!activePolicy()||!ready()||model.approval!==stamp(model.session))return;
      const intent={kind:'commit',id:model.session.id,revision:model.session.revision,checksum:model.session.previewChecksum,key:crypto.randomUUID()};
      await run(async current=>{saveIntent(intent);await sendCommit(intent,current);});
    }
    async function recoverCurrent(current){
      const intent=model.intent;if(!intent)return;
      if(intent.kind==='upload'){
        const page=await list();if(current())Object.assign(model,{sessions:page.items,nextCursor:page.nextCursor,phase:'uncertain'});
        return;
      }
      await readSession(intent.id,current);if(!current())return;
      if(terminal.has(model.session.state)){removeIntent();return;}
      model.phase='uncertain';model.retry=model.session.state==='READY'&&model.session.revision===intent.revision&&model.session.previewChecksum===intent.checksum&&ready();
      if(!model.retry&&model.session.state!=='PARSING'){removeIntent();model.phase='review';model.notice='Prethodna potvrda više ne vrijedi. Pregledajte aktualne podatke i potvrdite ih ponovno.';}
    }
    async function recover(){await run(async current=>{await recoverCurrent(current);});}
    async function retryCommit(){if(model.intent?.kind!=='commit'||!model.retry||!activePolicy())return;
      await run(async current=>{const intent=model.intent;await recoverCurrent(current);if(current()&&model.retry)await sendCommit(intent,current);});}
    function chooseFile(file){
      if(model.busy||!allowed()||!activePolicy())return;
      model.file=null;model.error='';model.approval=null;
      if(file){
        const max=Math.min(1048576,model.policy.maxUploadBytes);
        if(file.size<1||file.size>max)model.error=`Odaberite nepraznu datoteku do ${max.toLocaleString('hr-HR')} bajtova.`;
        else model.file=file;
      }
      notify(false);
    }
    async function upload(){
      if(!activePolicy()||!model.file||model.format==='csv'&&!model.policy.csvDelimiters.includes(model.delimiter))return;
      const file=model.file;
      await run(async(current,signal)=>{
        if(!file.name.toLowerCase().endsWith('.'+model.format))throw new Error('Odaberite format koji odgovara nastavku datoteke.');
        const bytes=await file.arrayBuffer();if(!current())return;
        const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),value=>value.toString(16).padStart(2,'0')).join('');
        if(!current())return;
        const previous=model.intent;
        if(previous&&!uploadIdentityMatches(previous,{checksum:hash,format:model.format,delimiter:model.delimiter,policyVersion:model.policy.version}))throw new Error('Za nastavak odaberite istu datoteku, format i razdjelnik. Najprije provjerite prethodni rezultat.');
        const intent=previous||{kind:'upload',key:crypto.randomUUID(),checksum:hash,format:model.format,delimiter:model.delimiter,policyVersion:model.policy.version};
        saveIntent(intent);model.phase='uploading';notify();
        try{
          const session=await api.upload(`/worker-imports${api.query({format:intent.format,policyVersion:intent.policyVersion,...(intent.format==='csv'?{delimiter:intent.delimiter}:{})})}`,
            file,{'Content-Type':intent.format==='csv'?'text/csv':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','Idempotency-Key':intent.key},signal);
          if(!current())return;
          removeIntent();model.file=null;model.session=session;model.phase='stale';
          try{await readSession(session.id,current);}catch(error){if(current()){clearRows();model.phase='stale';model.error=message(error);}return;}
        }catch(error){
          if(!current())return;
          if(!error.status||error.status>=500){model.phase='uncertain';model.retry=false;}
          else{removeIntent();model.file=null;model.phase='list';}
          throw error;
        }
      });
    }
    async function cancel(){if(!model.session||model.phase!=='cancel'||model.intent?.kind==='commit')return;
      await run(async current=>{
      try{
        const result=await api.post(`/worker-imports/${model.session.id}/cancel`,undefined,revisionHeaders());
        if(!current())return;
        clearRows();model.file=null;model.session=result;model.phase='terminal';removeIntent();
      }catch(error){if(current()){clearRows();model.phase='stale';}throw error;}
    });}
    async function reload(){if(model.intent)return recover();
      if(model.session)return resume(model.session.id);
      await load();}
    async function more(){if(!model.nextCursor)return;
      await run(async current=>{const page=await list(model.nextCursor);if(current()){model.sessions.push(...page.items);model.nextCursor=page.nextCursor;}});}
    async function inspectList(){await run(async current=>{const page=await list();if(current()){model.sessions=page.items;model.nextCursor=page.nextCursor;}});}
    function selectFormat(value){if(model.busy||model.intent||!['csv','xlsx'].includes(value))return;
      model.format=value;model.file=null;model.delimiter='';notify(false);}
    function selectDelimiter(value){if(!model.busy&&!model.intent&&['',',',';'].includes(value)){model.delimiter=value;notify(false);}}
    function newUpload(){if(model.busy||model.intent)return;
        clearRows();model.session=null;model.result=null;model.phase='list';model.file=null;model.notice='';void load();}
    function action(name,value){
      const commands={load,more,reload,recover,retryCommit,upload,map,commit,cancel,new:newUpload,list:inspectList,
        resume:()=>resume(String(value)),approve:chooseApproval,
        mapping:()=>{if(!model.busy&&!model.intent){model.approval=null;model.phase='mapping';notify();}},
        review:()=>{model.approval=null;model.phase='review';notify();},
        cancelAsk:()=>{if(model.session&&!terminal.has(model.session.state)&&!model.intent){model.approval=null;model.phase='cancel';notify();}},
        page:()=>{model.page=Math.max(0,Number(value)||0);notify();},
        workers:()=>config.navigate('workers')};
      syncIdentity();if(allowed()&&(!model.busy||name==='workers')&&Object.hasOwn(commands,name))return commands[name]();
    }
    function view(){
      syncIdentity();if(!allowed())return'<section class="card"><h2>Uvoz nije dostupan</h2><p>Prijavite se kao administrator tvrtke.</p></section>';
      if(!model.loaded&&!model.busy)root.queueMicrotask(()=>{if(allowed()&&!model.loaded&&!model.busy)void load();});
      return renderView(model,{ready:ready(),mappingComplete:mappingComplete(),values,active:activePolicy(),clock});
    }
    function open(){syncIdentity();if(allowed())config.navigate('workerImports');}
    function snapshot(){return model;}
    return Object.freeze({configure,syncIdentity,view,open,action,changeColumn,changeBinding,approve,chooseFile,selectFormat,selectDelimiter,
      filterErrors(value){model.onlyErrors=Boolean(value);model.page=0;notify(false);},snapshot});
  }

  let tabStorage;try{tabStorage=root.sessionStorage;}catch{/* Storage may be unavailable; server read-back still owns recovery. */}
  const instance=createController({api:root.BSSCore?.api,storage:tabStorage});
  root.BSSWorkerImports=instance;
  root.document?.addEventListener('change',event=>{
    const input=event.target;if(!input?.closest?.('.worker-import')||!input.dataset.importInput)return;
    const focusId=input.id,kind=input.dataset.importInput;
    if(kind==='file')instance.chooseFile(input.files?.[0]||null);
    else if(kind==='format')instance.selectFormat(input.value);
    else if(kind==='delimiter')instance.selectDelimiter(input.value);
    else if(kind==='column')instance.changeColumn(Number(input.dataset.index),input.value);
    else if(kind==='binding')instance.changeBinding(input.dataset.field,Number(input.dataset.index),input.value);
    else if(kind==='approval')instance.approve(input.checked);
    else if(kind==='errors')instance.filterErrors(input.checked);
    if(focusId)root.document.getElementById(focusId)?.focus();
  });
  if(typeof module==='object'&&module.exports)module.exports={createController,renderView};
})(typeof globalThis==='object'?globalThis:window);
