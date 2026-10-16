(function registerWorkerImports(root){
  'use strict';

  const fields={code:'Šifra radnika',name:'Ime i prezime',email:'E-mail (neobavezno)',department:'Odjel',shift:'Smjena',annualLeaveAllowance:'Dani godišnjeg odmora'};
  const states={PARSING:'Obrada',NEEDS_MAPPING:'Povežite stupce',READY:'Spremno za pregled',INVALID:'Potrebni ispravci',COMMITTED:'Radnici su dodani',CANCELLED:'Otkazano',EXPIRED:'Isteklo',FAILED:'Obrada nije uspjela'};
  const terminal=new Set(['COMMITTED','CANCELLED','EXPIRED','FAILED']);
  const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
  const checksum=/^[a-f0-9]{64}$/;
  const escape=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const stamp=session=>`${session?.id}:${session?.revision}:${session?.previewChecksum}`;
  const empty=()=>({phase:'list',busy:false,loaded:false,policy:null,sessions:[],nextCursor:null,session:null,result:null,
    headers:[],sourceRows:[],canonicalRows:null,issues:[],mapping:{columns:[],departments:[],shifts:[]},departments:[],shifts:[],
    page:0,onlyErrors:false,stale:false,complete:false,approval:null,file:null,format:'csv',delimiter:'',error:'',notice:'',intent:null,retry:false});

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
        if(part.session?.id!==session.id||part.session.revision!==session.revision||part.offset!==sourceRows.length
          ||!Array.isArray(part.sourceRows)||part.sourceRows.length>100||part.counts?.total<1||part.counts.total>1000)throw new Error('Pregled nije potpun. Ponovno dohvatite pripremu.');
        if(first&&(JSON.stringify(part.headers)!==JSON.stringify(first.headers)||JSON.stringify(part.mapping)!==JSON.stringify(first.mapping)
          ||JSON.stringify(part.counts)!==JSON.stringify(first.counts)))throw new Error('Pregled se promijenio tijekom čitanja. Ponovno dohvatite pripremu.');
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
      Object.assign(model,refs,page);model.mapping=page.mapping||{columns:Array(page.headers.length).fill(''),departments:[],shifts:[]};
      model.phase=session.state==='NEEDS_MAPPING'?'mapping':'review';
    }
    async function resume(id){if(!uuid.test(id)||model.intent?.kind==='upload')return;await run(async current=>{
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
      return [...new Set(model.sourceRows.map(row=>row[index]).filter(value=>typeof value==='string').map(value=>value.trim()).filter(Boolean))].sort();
    }
    function mappingComplete(){
      const columns=model.mapping.columns;
      if(columns.length!==model.headers.length||new Set(columns).size!==columns.length||columns.some(field=>!Object.hasOwn(fields,field)))return false;
      if(Object.keys(fields).filter(field=>field!=='email').some(field=>!columns.includes(field)))return false;
      return ['department','shift'].every(field=>values(field).every(source=>model.mapping[field==='department'?'departments':'shifts'].some(binding=>binding.source===source&&uuid.test(binding.id))));
    }
    function changeColumn(index,value){
      if(model.busy||model.phase!=='mapping'||!Number.isInteger(index)||index<0||index>=model.headers.length||!Object.hasOwn(fields,value)&&value!=='')return;
      const previous=model.mapping.columns[index];model.mapping.columns[index]=value;model.approval=null;
      for(const field of ['department','shift'])if(previous===field||value===field)model.mapping[field==='department'?'departments':'shifts']=[];
      notify(false);
    }
    function changeBinding(field,index,id){
      if(model.busy||model.phase!=='mapping'||!['department','shift'].includes(field))return;
      const source=values(field)[index],key=field==='department'?'departments':'shifts';
      if(source===undefined||id&&!model[key].some(item=>item.id===id))return;
      model.mapping[key]=model.mapping[key].filter(binding=>binding.source!==source);
      if(id)model.mapping[key].push({source,id});model.approval=null;notify(false);
    }
    async function map(){if(model.phase!=='mapping'||!model.complete||!mappingComplete()||!model.session)return;await run(async current=>{
      try{
        const result=await api.patch(`/worker-imports/${model.session.id}/mapping`,model.mapping,revisionHeaders());
        if(current()){clearRows();model.session=result;model.phase='stale';await readSession(result.id,current);}
      }catch(error){if(current()){clearRows();model.phase='stale';}throw error;}
    });}
    async function chooseApproval(){if(!ready()||!activePolicy())return;await run(async current=>{
      await readSession(model.session.id,current);if(current()&&ready())model.phase='approval';
    });}
    function approve(checked){if(model.phase!=='approval'||model.busy)return;model.approval=checked&&ready()?stamp(model.session):null;notify(false);}
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
        if(!new RegExp(`\\.${model.format}$`,'i').test(file.name))throw new Error('Odaberite format koji odgovara nastavku datoteke.');
        const bytes=await file.arrayBuffer();if(!current())return;
        const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),value=>value.toString(16).padStart(2,'0')).join('');
        if(!current())return;
        const previous=model.intent;
        if(previous&&(previous.kind!=='upload'||previous.checksum!==hash||previous.format!==model.format||previous.delimiter!==model.delimiter||previous.policyVersion!==model.policy.version))throw new Error('Za nastavak odaberite istu datoteku, format i razdjelnik. Najprije provjerite prethodni rezultat.');
        const intent=previous||{kind:'upload',key:crypto.randomUUID(),checksum:hash,format:model.format,delimiter:model.delimiter,policyVersion:model.policy.version};
        saveIntent(intent);model.phase='uploading';notify();
        try{
          const session=await api.upload(`/worker-imports${api.query({format:intent.format,policyVersion:intent.policyVersion,...(intent.format==='csv'?{delimiter:intent.delimiter}:{})})}`,
            file,{'Content-Type':intent.format==='csv'?'text/csv':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','Idempotency-Key':intent.key},signal);
          if(!current())return;removeIntent();model.file=null;model.session=session;model.phase='stale';
          try{await readSession(session.id,current);}catch(error){if(current()){clearRows();model.phase='stale';model.error=message(error);}return;}
        }catch(error){
          if(!current())return;
          if(!error.status||error.status>=500){model.phase='uncertain';model.retry=false;}
          else{removeIntent();model.file=null;model.phase='list';}
          throw error;
        }
      });
    }
    async function cancel(){if(!model.session||model.phase!=='cancel'||model.intent?.kind==='commit')return;await run(async current=>{
      try{
        const result=await api.post(`/worker-imports/${model.session.id}/cancel`,undefined,revisionHeaders());
        if(!current())return;clearRows();model.file=null;model.session=result;model.phase='terminal';removeIntent();
      }catch(error){if(current()){clearRows();model.phase='stale';}throw error;}
    });}
    async function reload(){if(model.intent)return recover();if(model.session)return resume(model.session.id);await load();}
    async function more(){if(!model.nextCursor)return;await run(async current=>{const page=await list(model.nextCursor);if(current()){model.sessions.push(...page.items);model.nextCursor=page.nextCursor;}});}
    async function inspectList(){await run(async current=>{const page=await list();if(current()){model.sessions=page.items;model.nextCursor=page.nextCursor;}});}
    function selectFormat(value){if(model.busy||model.intent||!['csv','xlsx'].includes(value))return;model.format=value;model.file=null;model.delimiter='';notify(false);}
    function selectDelimiter(value){if(!model.busy&&!model.intent&&['',',',';'].includes(value)){model.delimiter=value;notify(false);}}
    function newUpload(){if(model.busy||model.intent)return;clearRows();model.session=null;model.result=null;model.phase='list';model.file=null;model.notice='';void load();}
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

  function button(action,label,{disabled=false,secondary=false,value}={}){
    const args=value===undefined?'':`,${typeof value==='number'?value:`'${escape(value)}'`}`;
    return `<button type="button" class="btn${secondary?' secondary':''}" data-bss-action="workerImportAction('${action}'${args})" ${disabled?'disabled':''}>${escape(label)}</button>`;
  }
  function notice(title,text,tone='info'){return `<div class="notice ${tone}"><strong>${escape(title)}</strong><p>${escape(text)}</p></div>`;}
  function options(items,selected){return `<option value="">Odaberite…</option>${items.map(([value,label])=>`<option value="${escape(value)}" ${value===selected?'selected':''}>${escape(label)}</option>`).join('')}`;}
  function summary(model){const counts=model.counts||model.session?.counts||{total:0,valid:0,blocked:0};return `<dl class="import-counts"><div><dt>Ukupno</dt><dd>${escape(counts.total)}</dd></div><div><dt>Za dodavanje</dt><dd>${escape(counts.valid)}</dd></div><div><dt>S pogreškama</dt><dd>${escape(counts.blocked)}</dd></div></dl>`;}
  function sessionList(model){return `<section class="card"><h2>Prethodne pripreme</h2><p>Priprema je spremljena na poslužitelju i može se nastaviti nakon ponovne prijave.</p>${model.sessions.length?`<ul class="import-sessions">${model.sessions.map(session=>`<li><div><strong>${escape(states[session.state]||'Provjerite status')}</strong><span>${escape(new Date(session.createdAt).toLocaleString('hr-HR'))} · ${escape(session.counts.total)} redaka</span></div>${button('resume','Otvori pripremu',{value:session.id,secondary:true,disabled:model.busy||model.intent?.kind==='upload'})}</li>`).join('')}</ul>`:'<p>Nema učitanih priprema.</p>'}${button('list','Osvježi popis',{secondary:true,disabled:model.busy})}${model.nextCursor?button('more','Učitaj još priprema',{secondary:true,disabled:model.busy}):''}</section>`;}
  function uploadForm(model,retry=false){
    return `<section class="card"><h2>${retry?'Nastavite isto učitavanje':'1. Odaberite datoteku'}</h2><p>Do ${escape(model.policy?.maxRows)} radnika i ${escape(model.policy?.maxUploadBytes)} bajtova. Svaki redak mora sadržavati šifru, ime i prezime, odjel, smjenu i izričit broj dana godišnjeg. E-mail je neobavezan.</p><p>Uvoz dodaje radnike. Korisnički računi, pozivnice, RFID kartice i povijesna evidencija uređuju se zasebno.</p><p>Ne šaljite OIB, bankovne podatke, lozinke ili dodatne stupce.</p>
      <div class="form form-grid"><label for="import-format">Format<select id="import-format" data-import-input="format" ${retry||model.busy?'disabled':''}><option value="csv" ${model.format==='csv'?'selected':''}>CSV</option><option value="xlsx" ${model.format==='xlsx'?'selected':''}>Excel XLSX</option></select></label>${model.format==='csv'?`<label for="import-delimiter">Razdjelnik CSV stupaca<select id="import-delimiter" data-import-input="delimiter" ${retry||model.busy?'disabled':''}>${options([[',','Zarez (,)'],[';','Točka-zarez (;)']],model.delimiter)}</select></label>`:''}<label for="import-file">${retry?'Ista izvorna datoteka':'CSV ili XLSX datoteka'}<input id="import-file" type="file" accept=".csv,.xlsx" data-import-input="file" ${model.busy?'disabled':''}></label></div>${model.file?`<p>Odabrano: ${escape(model.file.name)} · ${escape(model.file.size)} bajtova</p>`:''}
      ${button('upload',retry?'Ponovi isto učitavanje':'Učitaj i provjeri datoteku',{disabled:model.busy||!model.file||model.format==='csv'&&!model.delimiter})}</section>`;
  }
  function mappingView(model,helpers){
    const columns=model.headers.map((header,index)=>`<label for="import-column-${index}">${index+1}. ${escape(header)}<select id="import-column-${index}" data-import-input="column" data-index="${index}" ${model.busy?'disabled':''}>${options(Object.entries(fields),model.mapping.columns[index])}</select></label>`).join('');
    const refs=['department','shift'].map(field=>{const key=field==='department'?'departments':'shifts';return `<fieldset><legend>${field==='department'?'Odjeli iz datoteke':'Smjene iz datoteke'}</legend>${helpers.values(field).map((source,index)=>`<label for="import-${field}-${index}">${escape(source)} → postojeći ${field==='department'?'odjel':'smjena'}<select id="import-${field}-${index}" data-import-input="binding" data-field="${field}" data-index="${index}" ${model.busy?'disabled':''}>${options(model[key].map(item=>[item.id,item.name]),model.mapping[key].find(binding=>binding.source===source)?.id)}</select></label>`).join('')||'<p>Najprije povežite odgovarajući stupac. Prazne ili neispravne vrijednosti prikazat će se u provjeri redaka.</p>'}</fieldset>`;}).join('');
    return `<section class="card"><h2>2. Povežite stupce i vrijednosti</h2><p>Svaki izvorni stupac povežite točno jednom. Odjele i smjene povežite s postojećim vrijednostima tvrtke, bez automatskih zamjena.</p><div class="form form-grid">${columns}</div><div class="form import-bindings">${refs}</div>${button('map','Provjeri cijeli popis',{disabled:model.busy||!helpers.mappingComplete})}${button('cancelAsk','Otkaži pripremu',{secondary:true,disabled:model.busy})}</section>`;
  }
  const issueMessages={TEXT_REQUIRED:'Unesite tekstualnu vrijednost.',EXPLICIT_ALLOWANCE_REQUIRED:'Unesite cijeli broj od 0 do 366.',REFERENCE_MAPPING_REQUIRED:'Povežite vrijednost s postojećim aktivnim odjelom ili smjenom.',INVALID_WORKER_FIELDS:'Provjerite oblik i duljinu podataka radnika.',REFERENCE_INACTIVE:'Odabrani odjel ili smjena više nije aktivna.',REFERENCE_MISSING:'Odabrani odjel ili smjena više ne postoji.',DUPLICATE_IN_FILE:'Vrijednost se ponavlja u datoteci. Unesite jedinstvenu vrijednost.',DUPLICATE_IN_TENANT:'Vrijednost već postoji u tvrtki. Uvoz ne mijenja postojeće radnike.'};
  function reviewTable(model){
    const errors=new Map();for(const issue of model.issues){if(!errors.has(issue.rowNumber))errors.set(issue.rowNumber,[]);errors.get(issue.rowNumber).push(issue);}
    const filtered=model.sourceRows.map((row,index)=>({row,index})).filter(({index})=>!model.onlyErrors||errors.has(index+2));
    const pages=Math.max(1,Math.ceil(filtered.length/100)),page=Math.min(model.page,pages-1),shown=filtered.slice(page*100,(page+1)*100);
    const headings=model.mapping.columns.length===model.headers.length?model.mapping.columns:model.headers.map(()=>null);
    const rows=shown.map(({row,index})=>{
      const cells=row.map((raw,column)=>{
        const field=headings[column],canonical=model.canonicalRows?.[index];let value=canonical?.[field]??raw;
        if(canonical&&field==='department')value=model.departments.find(item=>item.id===canonical.departmentId)?.name||'Odjel više nije dostupan';
        if(canonical&&field==='shift')value=model.shifts.find(item=>item.id===canonical.shiftId)?.name||'Smjena više nije dostupna';
        return `<td data-label="${escape(fields[field]||model.headers[column])}">${escape(value)}${String(value)!==String(raw)?`<small>Izvorno: ${escape(raw)}</small>`:''}</td>`;
      }).join('');
      const problems=errors.get(index+2)||[];
      return `<tr><td data-label="Redak">${index+2}</td>${cells}<td data-label="Provjera">${problems.length?`<ul class="import-errors">${problems.map(issue=>`<li><strong>${escape(fields[issue.field]||'Redak')}:</strong> ${escape(issueMessages[issue.code]||'Provjerite vrijednost, jedinstvenost i aktivni odjel ili smjenu.')}</li>`).join('')}</ul>`:'Za dodavanje'}</td></tr>`;
    }).join('');
    return `<label class="import-check"><input type="checkbox" data-import-input="errors" ${model.onlyErrors?'checked':''} ${model.busy?'disabled':''}>Prikaži samo retke s pogreškama</label><p>Stranica ${page+1} od ${pages} · ${filtered.length} prikazanih redaka · redak 1 je zaglavlje. ${model.canonicalRows?'Prikazane su poslužiteljski normalizirane vrijednosti.':'Prikazane su izvorne vrijednosti i poslužiteljske pogreške.'}</p><div class="table-wrap import-table-wrap" role="region" aria-label="Pregled svih radnika i pogrešaka" tabindex="0"><table class="compact-table import-table"><caption>Pregled pripreme uvoza</caption><thead><tr><th scope="col">Redak</th>${model.headers.map((header,index)=>`<th scope="col">${escape(fields[headings[index]]||header)}</th>`).join('')}<th scope="col">Provjera</th></tr></thead><tbody>${rows||`<tr><td colspan="${model.headers.length+2}">Nema redaka s pogreškama.</td></tr>`}</tbody></table></div><div class="btns">${button('page','Prethodna stranica',{value:page-1,secondary:true,disabled:model.busy||page===0})}${button('page','Sljedeća stranica',{value:page+1,secondary:true,disabled:model.busy||page===pages-1})}</div>`;
  }
  function renderView(model,helpers){
    const busy=model.busy,session=model.session;let content;
    if(!model.loaded)content='<section class="card"><h2>Provjera pravila uvoza</h2><p>Pričekajte dohvat pravila s poslužitelja.</p></section>';
    else if(model.phase==='uncertain'){
      content=notice('Rezultat još nije potvrđen','Zahtjev je možda dovršen. Najprije provjerite postojeći postupak. Nemojte pokretati novi uvoz.','warning')+button('recover','Provjeri postojeći rezultat',{disabled:busy});
      if(model.intent?.kind==='commit'&&model.retry)content+=button('retryCommit','Ponovi istu potvrdu',{disabled:busy||!helpers.active,secondary:true});
      if(model.intent?.kind==='upload')content+='<p>Za pouzdani nastavak odaberite istu izvornu datoteku i ponovite isto učitavanje. Poslužitelj vraća prethodni postupak, bez stvaranja novog uvoza.</p>'+(helpers.active?uploadForm(model,true):'')+sessionList(model);
    }else if(model.phase==='denied')content=notice('Administratorski pristup nije dostupan','Ponovno se prijavite i provjerite svoju ulogu.');
    else if(model.phase==='uploading')content=notice('Datoteka se obrađuje','Pričekajte provjereni odgovor. Još nije potvrđeno dodavanje radnika.');
    else if(model.phase==='mapping')content=mappingView(model,helpers);
    else if(model.phase==='review'||model.phase==='approval'){
      content=`<section class="card"><h2>${model.phase==='approval'?'4. Potvrdite dodavanje radnika':'3. Pregledajte cijeli popis'}</h2>${summary(model)}`;
      if(!helpers.ready)content+=notice('Uvoz je blokiran',model.stale?'Podaci su se promijenili. Ponovno povežite i provjerite cijeli popis.':'Ispravite označena polja u datoteci ili povezivanju. Svih se radnika dodaje zajedno ili ni jedan.','warning');
      content+=reviewTable(model);
      if(model.phase==='approval')content+=`<p>Dodavanje ne mijenja postojeće radnike i ne stvara korisničke račune ni RFID kartice.</p><label class="import-check"><input id="import-approval" type="checkbox" data-import-input="approval" ${model.approval?'checked':''} ${busy||!helpers.ready?'disabled':''}>Pregledao/la sam cijeli popis i odobravam dodavanje svih ${escape(model.counts.total)} radnika.</label>${button('commit','Dodaj sve radnike',{disabled:busy||!helpers.ready||!helpers.active||model.approval!==stamp(session)})}${button('review','Natrag na pregled',{secondary:true,disabled:busy})}`;
      else content+=button('approve','Nastavi na potvrdu',{disabled:busy||!helpers.ready||!helpers.active});
      content+=button('mapping','Promijeni povezivanje',{secondary:true,disabled:busy})+button('cancelAsk','Otkaži pripremu',{secondary:true,disabled:busy})+'</section>';
    }else if(model.phase==='cancel')content=`<section class="card"><h2>Otkazati pripremu?</h2><p>Privremeni podaci bit će uklonjeni. Otkazivanje pripreme ne poništava ranije uspješne uvoze ni postojeće radnike.</p>${button('cancel','Potvrdi otkazivanje',{disabled:busy})}${button('reload','Natrag na pripremu',{secondary:true,disabled:busy})}</section>`;
    else if(model.phase==='result')content=`<section class="card"><h2>Radnici su dodani</h2><p>Poslužitelj potvrđuje dodavanje ${escape(model.result?.createdCount??session?.counts.total)} radnika. Privremeni podaci uklonjeni su; rezultat i revizijski trag ostaju spremljeni.</p><p>Korisničke račune i RFID kartice dodijelite zasebno. Ispravak uspješnog uvoza provodi se kroz redovne, odobrene izmjene radnika.</p>${button('workers','Otvori radnike')}${button('new','Novi uvoz',{secondary:true,disabled:busy})}</section>`;
    else if(model.phase==='terminal')content=`<section class="card"><h2>${escape(states[session?.state]||'Pregled nije dostupan')}</h2><p>Privremeni podaci ove pripreme više nisu dostupni. Ova priprema nije dodala radnike.</p>${button('new','Natrag na popis',{disabled:busy})}</section>`;
    else if(model.phase==='parsing'||model.phase==='stale')content=notice(model.phase==='parsing'?'Obrada pripreme':'Ponovno provjerite pripremu','Dohvatite aktualni status s poslužitelja prije sljedeće radnje.')+button('reload','Dohvati aktualnu pripremu',{disabled:busy});
    else content=(helpers.active?uploadForm(model):notice('Novi uvoz nije dostupan','Uvoz nije aktiviran ili poslužitelj trenutačno ne dopušta novo učitavanje. Možete provjeriti ranije pripreme.'))+sessionList(model);
    return `<div class="worker-import" aria-busy="${busy}"><div class="section-title"><div><h1>Uvoz radnika</h1><p>Učitavanje, provjera i zajedničko dodavanje radnika.</p></div>${button('workers','Natrag na radnike',{secondary:true})}</div><div role="status" aria-live="polite">${busy?'<p>Zahtjev je u tijeku…</p>':''}</div>${model.error?`<div role="alert">${notice('Zahtjev nije dovršen',model.error,'danger')}${button('reload','Provjeri status',{secondary:true,disabled:busy})}</div>`:''}${model.notice?notice('Potrebna je nova provjera',model.notice,'warning'):''}${model.policy?`<details class="card import-policy" open><summary>Pravila obrade i zadržavanja podataka</summary><p>${escape(model.policy.lifecycleNotice)}</p><p>Najviše ${escape(model.policy.maxRows)} redaka i ${escape(model.policy.maxColumns)} stupaca; ${escape(model.policy.maxNonterminalSessions)} istodobne pripreme po tvrtki. Rok pripreme: ${escape(model.policy.sessionTtlSeconds/3600)} sata.</p></details>`:''}${session?`<p class="import-meta">Status: ${escape(states[session.state])} · pregled ${escape(session.revision)} · istječe ${escape(new Date(session.expiresAt).toLocaleString('hr-HR'))}</p>`:''}${content}</div>`;
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
