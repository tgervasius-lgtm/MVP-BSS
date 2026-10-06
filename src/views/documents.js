/* global logged, currentRole, sessionContext, state, BSS_API, render, escapeHtml, title, showModal, closeModal, toast, downloadBlob, currentWorker */
(function registerDocuments(root){
  'use strict';
  const categories={payslip:'Platna lista',contract:'Ugovor',other:'Drugi dokument'};
  const statuses={draft:'Nacrt',published:'Objavljeno',withdrawn:'Povučeno'};
  let owner='',epoch=0,loaded=false,busy=false,error='',enabled=true,items=[],cursor=null,category='',period='',recipients=[],pending=null;
  const writer=()=>['admin','accountant'].includes(currentRole);
  const allowed=()=>['admin','accountant','worker'].includes(currentRole);
  const esc=escape=>escapeHtml(escape);
  function identity(){return logged?`${state.demoMode?'demo':sessionContext?.organization?.id}:${sessionContext?.user?.id||currentRole}:${currentRole}`:'';}
  function syncIdentity(){
    const next=identity();
    if(next===owner)return;
    owner=next;epoch++;loaded=false;busy=false;error='';enabled=true;items=[];cursor=null;category='';period='';recipients=[];pending=null;
  }
  function current(ticket){return ticket===epoch&&identity()===owner&&logged&&allowed();}
  function redraw(){if(logged&&screen==='documents')render();}
  function demoItems(){
    const workers=state.workers.slice(0,2);
    return workers.flatMap((worker,i)=>['payslip','contract'].map((kind,j)=>({id:`demo-${i}-${j}`,workerId:String(worker.id),workerName:worker.name,workerCode:`R-${worker.id}`,
      title:kind==='payslip'?'Platna lista — listopad 2026.':'Ugovor o radu',category:kind,period:kind==='payslip'?'2026-10':null,state:'published',bytes:24000,revision:'1',createdAt:'2026-10-06T10:00:00Z',publishedAt:'2026-10-06T10:00:00Z'})))
      .filter(d=>writer()||d.workerId===String(currentWorker().id));
  }
  async function loadDocuments(append=false){
    syncIdentity();if(!allowed()||busy)return;
    const ticket=epoch;busy=true;error='';redraw();
    try{
      if(state.demoMode){items=demoItems().filter(d=>(!category||d.category===category)&&(!period||d.period===period));cursor=null;enabled=true;}
      else{
        const availability=await BSS_API.get('/documents/config');if(!current(ticket))return;
        enabled=availability.enabled===true;
        if(enabled){
          const page=await BSS_API.get('/documents',{limit:25,category,period,cursor:append?cursor:undefined});if(!current(ticket))return;
          items=append?[...items,...page.items]:page.items;cursor=page.nextCursor;
        }else{items=[];cursor=null;}
      }
    }catch(e){if(current(ticket)){error=e?.message||'Dokumenti se nisu mogli učitati.';if(!append)items=[];}}
    finally{if(current(ticket)){busy=false;loaded=true;redraw();}}
  }
  function mount(){if(screen==='documents'&&!loaded&&!busy&&allowed())void loadDocuments();}
  function filterDocuments(){if(busy)return;category=root.document.getElementById('documentCategory')?.value||'';period=root.document.getElementById('documentPeriod')?.value||'';void loadDocuments();}
  function documentRow(d){
    const download=d.state==='withdrawn'?'':`<button class="btn secondary small" data-bss-action="downloadDocument('${esc(d.id)}')" ${busy?'disabled':''}>Preuzmi PDF<span class="sr-only">: ${esc(d.title)}</span></button>`;
    const actions=writer()?`${d.state==='draft'?`<button class="btn small" data-bss-action="reviewDocument('${esc(d.id)}','publish')" ${busy?'disabled':''}>Pregledaj i objavi</button>`:''}${d.state!=='withdrawn'?`<button class="link-btn" data-bss-action="reviewDocument('${esc(d.id)}','withdraw')" ${busy?'disabled':''}>Povuci<span class="sr-only">: ${esc(d.title)}</span></button>`:''}`:'';
    return `<article class="document-row"><div><h2>${esc(d.title)}</h2><p>${esc(categories[d.category])}${d.period?` · ${esc(d.period)}`:''} · PDF</p>${writer()?`<p><b>${esc(d.workerName)}</b> · ${esc(d.workerCode)} · ${esc(statuses[d.state])}</p>`:''}</div><div class="btns">${download}${actions}</div></article>`;
  }
  function viewDocuments(){
    if(!allowed())return '<div class="notice">Nemate pristup dokumentima.</div>';
    return `${title(writer()?'Dokumenti radnika':'Moji dokumenti',writer()?'Pripremite dokument, provjerite primatelja i zatim ga objavite.':'Platne liste, ugovori i drugi dokumenti koje vam dostavlja firma.',writer()&&enabled?`<button class="btn" data-bss-action="openDocumentUpload()" ${busy?'disabled':''}>Novi dokument</button>`:'')}
      ${state.demoMode?'<p class="notice">Ogledni prikaz sa sintetičkim dokumentima. Učitavanje stvarnih datoteka ovdje nije dostupno.</p>':''}
      ${!enabled?'<div class="card"><p>Dokumenti trenutačno nisu dostupni. Za dostavu dokumenta obratite se administratoru firme.</p></div>':`<div class="card document-filters"><label>Vrsta dokumenta<select id="documentCategory"><option value="">Sve vrste</option>${Object.entries(categories).map(([key,label])=>`<option value="${key}" ${category===key?'selected':''}>${label}</option>`).join('')}</select></label><label>Mjesec platne liste<input id="documentPeriod" type="month" value="${esc(period)}"></label><button class="btn secondary" data-bss-action="filterDocuments()" ${busy?'disabled':''}>Primijeni</button><button class="link-btn" data-bss-action="reloadDocuments()" ${busy?'disabled':''}>Osvježi</button></div>
      ${error?`<div class="notice" role="alert">${esc(error)} <button class="link-btn" data-bss-action="reloadDocuments()">Pokušaj ponovno</button></div>`:''}
      <section class="card document-list" aria-label="Popis dokumenata" aria-busy="${busy}">${items.map(documentRow).join('')||`<p role="status">${busy?'Učitavanje dokumenata…':error?'Popis trenutačno nije dostupan.':'Nema dokumenata za odabrane filtre.'}</p>`}</section>${cursor?`<button class="btn secondary" data-bss-action="moreDocuments()" ${busy?'disabled':''}>Prikaži starije dokumente</button>`:''}`}`;
  }
  async function downloadDocument(id){
    if(busy||!allowed())return;const d=items.find(x=>x.id===id);if(!d||d.state==='withdrawn')return;
    if(state.demoMode){toast('Ogledni dokument. Stvarna PDF datoteka nije priložena.');return;}
    const ticket=epoch,modal=root.document.getElementById('modal'),inModal=modal?.classList.contains('open');busy=true;if(!inModal)redraw();
    try{const file=await BSS_API.download(`/documents/${encodeURIComponent(id)}/download`);if(current(ticket)&&screen==='documents')downloadBlob(file.blob,file.fileName);}
    catch(e){if(current(ticket)){error=e?.message||'Preuzimanje nije uspjelo.';if(inModal)toast(error);}}
    finally{if(current(ticket)){busy=false;if(!inModal)redraw();}}
  }
  function show(html,label){const modal=root.document.getElementById('modal');modal.setAttribute('aria-labelledby',label);modal.innerHTML=html;showModal(modal);}
  function openDocumentUpload(){
    if(!writer()||busy||!enabled)return;
    if(state.demoMode){toast('Učitavanje je dostupno u aktivnom BSS sandučiću. Ovdje su samo ogledni dokumenti.');return;}
    pending=null;recipients=[];
    show(`<div class="modal-card"><div class="modal-head"><h2 id="documentUploadTitle">Novi dokument</h2><button class="close-btn" aria-label="Zatvori" data-bss-action="closeModal()">×</button></div><p>PDF do 5 MiB, bez lozinke. Prvo se sprema nacrt; radnik ga vidi tek nakon objave.</p><div class="form"><label>Traži primatelja po imenu ili šifri<input id="documentRecipientSearch" maxlength="100"></label><button class="btn secondary" data-bss-action="findDocumentRecipients()">Pronađi radnika</button><label>Primatelj<select id="documentRecipient" required><option value="">Prvo pronađite radnika</option></select></label><p id="documentRecipientStatus" role="status"></p><label>Naziv dokumenta<input id="documentTitle" maxlength="120" required></label><label>Vrsta<select id="documentUploadCategory">${Object.entries(categories).map(([key,label])=>`<option value="${key}">${label}</option>`).join('')}</select></label><label>Mjesec (obvezno za platnu listu)<input id="documentUploadPeriod" type="month"></label><label>PDF datoteka<input id="documentFile" type="file" accept="application/pdf,.pdf" required></label></div><p id="documentUploadStatus" role="status"></p><div class="btns"><button id="documentUploadSubmit" class="btn" data-bss-action="submitDocumentUpload()">Spremi nacrt</button><button class="btn secondary" data-bss-action="closeModal()">Odustani</button></div></div>`,'documentUploadTitle');
  }
  async function findDocumentRecipients(){
    if(!writer()||busy)return;const ticket=epoch;const field=root.document.getElementById('documentRecipientSearch');if(!field)return;
    const status=root.document.getElementById('documentRecipientStatus'),select=root.document.getElementById('documentRecipient');
    busy=true;status.textContent='Traženje…';select.disabled=true;
    try{const response=await BSS_API.get('/documents/recipients',{search:field.value.trim()});if(!current(ticket)||!select.isConnected)return;
      recipients=response.items;select.innerHTML='<option value="">Odaberite primatelja</option>'+recipients.map(r=>`<option value="${esc(r.id)}">${esc(r.name)} · ${esc(r.code)}</option>`).join('');
      status.textContent=recipients.length?'Provjerite ime i šifru radnika. Prikazano je najviše 50 rezultata.':'Nema pronađenih radnika.';
    }catch(e){if(current(ticket)&&status.isConnected)status.textContent=e?.message||'Pretraga nije uspjela.';}
    finally{if(current(ticket)){busy=false;if(select.isConnected)select.disabled=false;}}
  }
  const readFile=file=>new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.onerror=()=>reject(new Error('Datoteka se nije mogla pročitati.'));reader.readAsDataURL(file);});
  async function submitDocumentUpload(){
    if(!writer()||busy||!enabled||state.demoMode)return;
    const form=root.document.getElementById('documentUploadSubmit');if(!form)return;
    const val=id=>root.document.getElementById(id)?.value||'';
    const status=root.document.getElementById('documentUploadStatus');
    const file=root.document.getElementById('documentFile')?.files?.[0];
    const worker=recipients.find(x=>x.id===val('documentRecipient')),name=val('documentTitle').trim(),kind=val('documentUploadCategory'),month=val('documentUploadPeriod');
    if(!worker||name.length<2||!file||file.size===0||file.size>5242880||!file.name.toLowerCase().endsWith('.pdf')||(kind==='payslip'&&!month)){status.textContent='Odaberite primatelja, naziv, odgovarajući mjesec i PDF do 5 MiB.';return;}
    const ticket=epoch;busy=true;form.disabled=true;status.textContent='Provjera i spremanje dokumenta…';
    try{
      const body={workerId:worker.id,title:name,category:kind,period:month||null,contentBase64:await readFile(file)};
      if(!current(ticket)||!form.isConnected)return;
      const key=JSON.stringify(body);if(!pending||pending.key!==key)pending={key,id:root.crypto.randomUUID()};
      await BSS_API.request('/documents',{method:'POST',body:{...body,uploadId:pending.id},retrySession:false});
      if(!current(ticket))return;pending=null;if(form.isConnected)closeModal();busy=false;await loadDocuments();toast('Nacrt je spremljen. Pregledajte primatelja i objavite dokument.');
    }catch(e){if(current(ticket)&&status.isConnected)status.textContent=e?.message||'Spremanje nije potvrđeno. Ponovite s istom datotekom i podacima; isti nacrt neće se izraditi dvaput.';}
    finally{if(current(ticket)){busy=false;if(form.isConnected)form.disabled=false;}}
  }
  function reviewDocument(id,action){
    if(!writer()||busy||!['publish','withdraw'].includes(action))return;
    const d=items.find(x=>x.id===id);if(!d||d.state==='withdrawn'||(action==='publish'&&d.state!=='draft'))return;
    const publish=action==='publish';
    show(`<div class="modal-card"><div class="modal-head"><h2 id="documentReviewTitle">${publish?'Objavi dokument':'Povuci dokument'}</h2><button class="close-btn" aria-label="Zatvori" data-bss-action="closeModal()">×</button></div><p><b>${esc(d.title)}</b></p><p>Primatelj: <b>${esc(d.workerName)} · ${esc(d.workerCode)}</b></p><p>${esc(categories[d.category])}${d.period?` · ${esc(d.period)}`:''}</p><p>${publish?'Potvrdite da sadržaj pripada ovom radniku. Nakon objave dokument će biti dostupan u njegovu sandučiću.':'Novo preuzimanje bit će onemogućeno. Već preuzete kopije time se ne brišu.'}</p><div class="btns"><button class="btn secondary" data-bss-action="downloadDocument('${esc(id)}')">Preuzmi za provjeru</button><button id="documentConfirm" class="btn" data-bss-action="confirmDocument('${esc(id)}','${action}','${esc(d.revision)}')">${publish?'Potvrdi objavu':'Potvrdi povlačenje'}</button><button class="btn secondary" data-bss-action="closeModal()">Odustani</button></div><p id="documentDecisionStatus" role="status"></p></div>`,'documentReviewTitle');
  }
  async function confirmDocument(id,action,revision){
    if(!writer()||busy||!['publish','withdraw'].includes(action))return;
    if(state.demoMode){toast('Ogledni dokument se ne mijenja.');return;}
    const ticket=epoch,button=root.document.getElementById('documentConfirm');busy=true;if(button)button.disabled=true;
    try{await BSS_API.request(`/documents/${encodeURIComponent(id)}/${action}`,{method:'POST',body:{confirmed:true},headers:{'If-Match':`"${revision}"`},retrySession:false});
      if(!current(ticket))return;closeModal();busy=false;await loadDocuments();toast(action==='publish'?'Dokument je objavljen.':'Dokument je povučen.');
    }catch(e){if(current(ticket)){closeModal();busy=false;await loadDocuments();error=e?.message||'Ishod nije potvrđen. Provjerite aktualno stanje prije nove radnje.';redraw();}}
    finally{if(current(ticket))busy=false;}
  }
  function clearSensitive(){pending=null;recipients=[];const file=root.document.getElementById('documentFile');if(file){file.value='';file.closest('.modal-card')?.remove();}}
  Object.assign(root,{viewDocuments,filterDocuments,downloadDocument,openDocumentUpload,findDocumentRecipients,submitDocumentUpload,reviewDocument,confirmDocument,
    reloadDocuments:()=>loadDocuments(),moreDocuments:()=>loadDocuments(true)});
  root.BSSDocuments=Object.freeze({syncIdentity,mount,clearSensitive});
})(globalThis);
