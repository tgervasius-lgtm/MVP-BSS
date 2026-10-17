(function registerWorkerImportViews(root){
  'use strict';
  const fields={code:'Šifra radnika',name:'Ime i prezime',email:'E-mail (neobavezno)',department:'Odjel',shift:'Smjena',annualLeaveAllowance:'Dani godišnjeg odmora'};
  const states={PARSING:'Obrada',NEEDS_MAPPING:'Povežite stupce',READY:'Spremno za pregled',INVALID:'Potrebni ispravci',COMMITTED:'Radnici su dodani',CANCELLED:'Otkazano',EXPIRED:'Isteklo',FAILED:'Obrada nije uspjela'};
  const escape=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const stamp=session=>`${session?.id}:${session?.revision}:${session?.previewChecksum}`;
  function button(action,label,{disabled=false,secondary=false,value}={}){
    let args='';
    if(value!==undefined){const encoded=typeof value==='number'?value:"'"+escape(value)+"'";args=','+encoded;}
    const css=secondary?' secondary':'',unavailable=disabled?'disabled':'';
    return `<button type="button" class="btn${css}" data-bss-action="workerImportAction('${action}'${args})" ${unavailable}>${escape(label)}</button>`;
  }
  function notice(title,text,tone='info'){
    return `<div class="notice ${tone}"><strong>${escape(title)}</strong><p>${escape(text)}</p></div>`;
  }
  function options(items,selected){
    return '<option value="">Odaberite…</option>'+items.map(([value,label])=>{
      const chosen=value===selected?'selected':'';
      return `<option value="${escape(value)}" ${chosen}>${escape(label)}</option>`;
    }).join('');
  }
  function summary(model){
    const counts=model.counts||model.session?.counts||{total:0,valid:0,blocked:0};
    return `<dl class="import-counts"><div><dt>Ukupno</dt><dd>${escape(counts.total)}</dd></div><div><dt>Za dodavanje</dt><dd>${escape(counts.valid)}</dd></div><div><dt>S pogreškama</dt><dd>${escape(counts.blocked)}</dd></div></dl>`;
  }
  function sessionItem(session,model){
    const status=escape(states[session.state]||'Provjerite status');
    const date=escape(new Date(session.createdAt).toLocaleString('hr-HR'));
    const action=button('resume','Otvori pripremu',{value:session.id,secondary:true,disabled:model.busy||model.intent?.kind==='upload'});
    return `<li><div><strong>${status}</strong><span>${date} · ${escape(session.counts.total)} redaka</span></div>${action}</li>`;
  }
  function sessionList(model){
    let list='<p>Nema učitanih priprema.</p>';
    if(model.sessions.length)list='<ul class="import-sessions">'+model.sessions.map(session=>sessionItem(session,model)).join('')+'</ul>';
    const refresh=button('list','Osvježi popis',{secondary:true,disabled:model.busy});
    const more=model.nextCursor?button('more','Učitaj još priprema',{secondary:true,disabled:model.busy}):'';
    return `<section class="card"><h2>Prethodne pripreme</h2><p>Priprema je spremljena na poslužitelju i može se nastaviti nakon ponovne prijave.</p>${list}${refresh}${more}</section>`;
  }
  function delimiterInput(model,disabled){
    if(model.format!=='csv')return'';
    const choices=options([[',','Zarez (,)'],[';','Točka-zarez (;)']],model.delimiter);
    return `<label for="import-delimiter">Razdjelnik CSV stupaca<select id="import-delimiter" data-import-input="delimiter" ${disabled}>${choices}</select></label>`;
  }
  function uploadForm(model,retry=false){
    const heading=retry?'Nastavite isto učitavanje':'1. Odaberite datoteku';
    const disabled=retry||model.busy?'disabled':'',busy=model.busy?'disabled':'';
    const csvSelected=model.format==='csv'?'selected':'',xlsxSelected=model.format==='xlsx'?'selected':'';
    const delimiter=delimiterInput(model,disabled),fileLabel=retry?'Ista izvorna datoteka':'CSV ili XLSX datoteka';
    const selected=model.file?'<p>Odabrano: '+escape(model.file.name)+' · '+escape(model.file.size)+' bajtova</p>':'';
    const submit=button('upload',retry?'Ponovi isto učitavanje':'Učitaj i provjeri datoteku',{disabled:model.busy||!model.file||model.format==='csv'&&!model.delimiter});
    return `<section class="card"><h2>${heading}</h2><p>Do ${escape(model.policy?.maxRows)} radnika i ${escape(model.policy?.maxUploadBytes)} bajtova. Svaki redak mora sadržavati šifru, ime i prezime, odjel, smjenu i izričit broj dana godišnjeg. E-mail je neobavezan.</p><p>Uvoz dodaje radnike. Korisnički računi, pozivnice, RFID kartice i povijesna evidencija uređuju se zasebno.</p><p>Ne šaljite OIB, bankovne podatke, lozinke ili dodatne stupce.</p><div class="form form-grid"><label for="import-format">Format<select id="import-format" data-import-input="format" ${disabled}><option value="csv" ${csvSelected}>CSV</option><option value="xlsx" ${xlsxSelected}>Excel XLSX</option></select></label>${delimiter}<label for="import-file">${fileLabel}<input id="import-file" type="file" accept=".csv,.xlsx" data-import-input="file" ${busy}></label></div>${selected}${submit}</section>`;
  }
  function mappingColumn(model,header,index){
    const choices=options(Object.entries(fields),model.mapping.columns[index]),busy=model.busy?'disabled':'';
    return `<label for="import-column-${index}">${index+1}. ${escape(header)}<select id="import-column-${index}" data-import-input="column" data-index="${index}" ${busy}>${choices}</select></label>`;
  }
  function bindingInput(model,field,source,index){
    const key=field==='department'?'departments':'shifts',label=field==='department'?'odjel':'smjena';
    const choices=options(model[key].map(item=>[item.id,item.name]),model.mapping[key].find(binding=>binding.source===source)?.id);
    const busy=model.busy?'disabled':'';
    return `<label for="import-${field}-${index}">${escape(source)} → postojeći ${label}<select id="import-${field}-${index}" data-import-input="binding" data-field="${field}" data-index="${index}" ${busy}>${choices}</select></label>`;
  }
  function bindingGroup(model,helpers,field){
    const legend=field==='department'?'Odjeli iz datoteke':'Smjene iz datoteke';
    const inputs=helpers.values(field).map((source,index)=>bindingInput(model,field,source,index)).join('');
    const empty='<p>Najprije povežite odgovarajući stupac. Prazne ili neispravne vrijednosti prikazat će se u provjeri redaka.</p>';
    return `<fieldset><legend>${legend}</legend>${inputs||empty}</fieldset>`;
  }
  function mappingView(model,helpers){
    const columns=model.headers.map((header,index)=>mappingColumn(model,header,index)).join('');
    const references=['department','shift'].map(field=>bindingGroup(model,helpers,field)).join('');
    const actions=button('map','Provjeri cijeli popis',{disabled:model.busy||!helpers.mappingComplete})+button('cancelAsk','Otkaži pripremu',{secondary:true,disabled:model.busy});
    return `<section class="card"><h2>2. Povežite stupce i vrijednosti</h2><p>Svaki izvorni stupac povežite točno jednom. Odjele i smjene povežite s postojećim vrijednostima tvrtke, bez automatskih zamjena.</p><div class="form form-grid">${columns}</div><div class="form import-bindings">${references}</div>${actions}</section>`;
  }
  const issueMessages={TEXT_REQUIRED:'Unesite tekstualnu vrijednost.',EXPLICIT_ALLOWANCE_REQUIRED:'Unesite cijeli broj od 0 do 366.',REFERENCE_MAPPING_REQUIRED:'Povežite vrijednost s postojećim aktivnim odjelom ili smjenom.',INVALID_WORKER_FIELDS:'Provjerite oblik i duljinu podataka radnika.',REFERENCE_INACTIVE:'Odabrani odjel ili smjena više nije aktivna.',REFERENCE_MISSING:'Odabrani odjel ili smjena više ne postoji.',DUPLICATE_IN_FILE:'Vrijednost se ponavlja u datoteci. Unesite jedinstvenu vrijednost.',DUPLICATE_IN_TENANT:'Vrijednost već postoji u tvrtki. Uvoz ne mijenja postojeće radnike.'};
  function previewValue(model,raw,field,index){
    const canonical=model.canonicalRows?.[index];
    if(canonical&&field==='department')return model.departments.find(item=>item.id===canonical.departmentId)?.name||'Odjel više nije dostupan';
    if(canonical&&field==='shift')return model.shifts.find(item=>item.id===canonical.shiftId)?.name||'Smjena više nije dostupna';
    return canonical?.[field]??raw;
  }
  function previewCell(model,headings,raw,column,index){
    const field=headings[column],value=previewValue(model,raw,field,index);
    const original=String(value)!==String(raw)?'<small>Izvorno: '+escape(raw)+'</small>':'';
    return `<td data-label="${escape(fields[field]||model.headers[column])}">${escape(value)}${original}</td>`;
  }
  function issueItem(issue){
    const label=escape(fields[issue.field]||'Redak');
    const text=escape(issueMessages[issue.code]||'Provjerite vrijednost, jedinstvenost i aktivni odjel ili smjenu.');
    return `<li><strong>${label}:</strong> ${text}</li>`;
  }
  function previewRow(model,headings,errors,{row,index}){
    const cells=row.map((raw,column)=>previewCell(model,headings,raw,column,index)).join('');
    const problems=errors.get(index+2)||[];
    const messages=problems.length?'<ul class="import-errors">'+problems.map(issueItem).join('')+'</ul>':'Za dodavanje';
    return `<tr><td data-label="Redak">${index+2}</td>${cells}<td data-label="Provjera">${messages}</td></tr>`;
  }
  function reviewTable(model){
    const errors=new Map();
    for(const issue of model.issues){
      if(!errors.has(issue.rowNumber)){errors.set(issue.rowNumber,[]);}
      errors.get(issue.rowNumber).push(issue);
    }
    const filtered=model.sourceRows.map((row,index)=>({row,index})).filter(({index})=>!model.onlyErrors||errors.has(index+2));
    const pages=Math.max(1,Math.ceil(filtered.length/100)),page=Math.min(model.page,pages-1),shown=filtered.slice(page*100,(page+1)*100);
    const headings=model.mapping.columns.length===model.headers.length?model.mapping.columns:model.headers.map(()=>null);
    const rows=shown.map(row=>previewRow(model,headings,errors,row)).join('');
    const tableHead=model.headers.map((header,index)=>'<th scope="col">'+escape(fields[headings[index]]||header)+'</th>').join('');
    const empty='<tr><td colspan="'+(model.headers.length+2)+'">Nema redaka s pogreškama.</td></tr>';
    const checked=model.onlyErrors?'checked':'',busy=model.busy?'disabled':'';
    const interpretation=model.canonicalRows?'Prikazane su poslužiteljski normalizirane vrijednosti.':'Prikazane su izvorne vrijednosti i poslužiteljske pogreške.';
    const pager=button('page','Prethodna stranica',{value:page-1,secondary:true,disabled:model.busy||page===0})+button('page','Sljedeća stranica',{value:page+1,secondary:true,disabled:model.busy||page===pages-1});
    return `<label class="import-check"><input type="checkbox" data-import-input="errors" ${checked} ${busy}>Prikaži samo retke s pogreškama</label><p>Stranica ${page+1} od ${pages} · ${filtered.length} prikazanih redaka · redak 1 je zaglavlje. ${interpretation}</p><div class="table-wrap import-table-wrap" role="region" aria-label="Pregled svih radnika i pogrešaka" tabindex="0"><table class="compact-table import-table"><caption>Pregled pripreme uvoza</caption><thead><tr><th scope="col">Redak</th>${tableHead}<th scope="col">Provjera</th></tr></thead><tbody>${rows||empty}</tbody></table></div><div class="btns">${pager}</div>`;
  }
  function uncertainView(model,helpers){
    let content=notice('Rezultat još nije potvrđen','Zahtjev je možda dovršen. Najprije provjerite postojeći postupak. Nemojte pokretati novi uvoz.','warning')+button('recover','Provjeri postojeći rezultat',{disabled:model.busy});
    if(model.intent?.kind==='commit'&&model.retry)content+=button('retryCommit','Ponovi istu potvrdu',{disabled:model.busy||!helpers.active,secondary:true});
    if(model.intent?.kind==='upload')content+='<p>Za pouzdani nastavak odaberite istu izvornu datoteku i ponovite isto učitavanje. Poslužitelj vraća prethodni postupak, bez stvaranja novog uvoza.</p>'+(helpers.active?uploadForm(model,true):'')+sessionList(model);
    return content;
  }
  function approvalControls(model,helpers){
    const checked=model.approval?'checked':'',disabled=model.busy||!helpers.ready?'disabled':'';
    const actions=button('commit','Dodaj sve radnike',{disabled:model.busy||!helpers.ready||!helpers.active||model.approval!==stamp(model.session)})+button('review','Natrag na pregled',{secondary:true,disabled:model.busy});
    return `<p>Dodavanje ne mijenja postojeće radnike i ne stvara korisničke račune ni RFID kartice.</p><label class="import-check"><input id="import-approval" type="checkbox" data-import-input="approval" ${checked} ${disabled}>Pregledao/la sam cijeli popis i odobravam dodavanje svih ${escape(model.counts.total)} radnika.</label>${actions}`;
  }
  function reviewView(model,helpers){
    const heading=model.phase==='approval'?'4. Potvrdite dodavanje radnika':'3. Pregledajte cijeli popis';
    let warning='';
    if(!helpers.ready)warning=notice('Uvoz je blokiran',model.stale?'Podaci su se promijenili. Ponovno povežite i provjerite cijeli popis.':'Ispravite označena polja u datoteci ili povezivanju. Svih se radnika dodaje zajedno ili ni jedan.','warning');
    const confirm=model.phase==='approval'?approvalControls(model,helpers):button('approve','Nastavi na potvrdu',{disabled:model.busy||!helpers.ready||!helpers.active});
    const actions=confirm+button('mapping','Promijeni povezivanje',{secondary:true,disabled:model.busy})+button('cancelAsk','Otkaži pripremu',{secondary:true,disabled:model.busy});
    return `<section class="card"><h2>${heading}</h2>${summary(model)}${warning}${reviewTable(model)}${actions}</section>`;
  }
  function cancelView(model){
    const actions=button('cancel','Potvrdi otkazivanje',{disabled:model.busy})+button('reload','Natrag na pripremu',{secondary:true,disabled:model.busy});
    return `<section class="card"><h2>Otkazati pripremu?</h2><p>Privremeni podaci bit će uklonjeni. Otkazivanje pripreme ne poništava ranije uspješne uvoze ni postojeće radnike.</p>${actions}</section>`;
  }
  function resultView(model){
    const count=escape(model.result?.createdCount??model.session?.counts.total);
    const actions=button('workers','Otvori radnike')+button('new','Novi uvoz',{secondary:true,disabled:model.busy});
    return `<section class="card"><h2>Radnici su dodani</h2><p>Poslužitelj potvrđuje dodavanje ${count} radnika. Privremeni podaci uklonjeni su; rezultat i revizijski trag ostaju spremljeni.</p><p>Korisničke račune i RFID kartice dodijelite zasebno. Ispravak uspješnog uvoza provodi se kroz redovne, odobrene izmjene radnika.</p>${actions}</section>`;
  }
  function terminalView(model){
    const heading=escape(states[model.session?.state]||'Pregled nije dostupan'),action=button('new','Natrag na popis',{disabled:model.busy});
    return `<section class="card"><h2>${heading}</h2><p>Privremeni podaci ove pripreme više nisu dostupni. Ova priprema nije dodala radnike.</p>${action}</section>`;
  }
  function pendingView(model){
    const heading=model.phase==='parsing'?'Obrada pripreme':'Ponovno provjerite pripremu';
    return notice(heading,'Dohvatite aktualni status s poslužitelja prije sljedeće radnje.')+button('reload','Dohvati aktualnu pripremu',{disabled:model.busy});
  }
  function listView(model,helpers){
    const form=helpers.active?uploadForm(model):notice('Novi uvoz nije dostupan','Uvoz nije aktiviran ili poslužitelj trenutačno ne dopušta novo učitavanje. Možete provjeriti ranije pripreme.');
    return form+sessionList(model);
  }
  function contentView(model,helpers){
    if(!model.loaded)return'<section class="card"><h2>Provjera pravila uvoza</h2><p>Pričekajte dohvat pravila s poslužitelja.</p></section>';
    const views={uncertain:uncertainView,denied:()=>notice('Administratorski pristup nije dostupan','Ponovno se prijavite i provjerite svoju ulogu.'),uploading:()=>notice('Datoteka se obrađuje','Pričekajte provjereni odgovor. Još nije potvrđeno dodavanje radnika.'),mapping:mappingView,review:reviewView,approval:reviewView,cancel:cancelView,result:resultView,terminal:terminalView,parsing:pendingView,stale:pendingView};
    return (views[model.phase]||listView)(model,helpers);
  }
  function policyView(policy){
    if(!policy)return'';
    return `<details class="card import-policy" open><summary>Pravila obrade i zadržavanja podataka</summary><p>${escape(policy.lifecycleNotice)}</p><p>Najviše ${escape(policy.maxRows)} redaka i ${escape(policy.maxColumns)} stupaca; ${escape(policy.maxNonterminalSessions)} istodobne pripreme po tvrtki. Rok pripreme: ${escape(policy.sessionTtlSeconds/3600)} sata.</p></details>`;
  }
  function metaView(session){
    if(!session)return'';
    return `<p class="import-meta">Status: ${escape(states[session.state])} · pregled ${escape(session.revision)} · istječe ${escape(new Date(session.expiresAt).toLocaleString('hr-HR'))}</p>`;
  }
  function renderView(model,helpers){
    const back=button('workers','Natrag na radnike',{secondary:true});
    const progress=model.busy?'<p>Zahtjev je u tijeku…</p>':'';
    const error=model.error?'<div role="alert">'+notice('Zahtjev nije dovršen',model.error,'danger')+button('reload','Provjeri status',{secondary:true,disabled:model.busy})+'</div>':'';
    const info=model.notice?notice('Potrebna je nova provjera',model.notice,'warning'):'';
    return `<div class="worker-import" aria-busy="${model.busy}"><div class="section-title"><div><h1>Uvoz radnika</h1><p>Učitavanje, provjera i zajedničko dodavanje radnika.</p></div>${back}</div><div role="status" aria-live="polite">${progress}</div>${error}${info}${policyView(model.policy)}${metaView(model.session)}${contentView(model,helpers)}</div>`;
  }
  const views=Object.freeze({fields,stamp,renderView});
  root.BSSCore=Object.freeze({...root.BSSCore,views:Object.freeze({...root.BSSCore?.views,workerImports:views})});
  if(typeof module==='object'&&module.exports)module.exports=views;
})(typeof globalThis==='object'?globalThis:window);
