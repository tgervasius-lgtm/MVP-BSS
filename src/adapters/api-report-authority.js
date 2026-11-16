/* global BSS_API, BSS_API_STATE, apiLoading, state, reportHistoryView, downloadBlob, normalizeReportFilters, monthBounds, departmentByName, workerById, REPORT_TYPE_CONFIG, currentRole, render, toast, escapeHtml, reportScopeLabel, formatMinutes, formatSignedMinutes, $, showModal, closeModal */
(function registerReportAuthority(root){
  'use strict';

  const reportType={summary:'monthly_summary',attendance:'attendance_journal',exceptions:'exceptions',vacations:'approved_absences',corrections:'correction_log'};
  let callbacks=null;
  let preview=null;
  let previewError='';
  let previewLoading=false;
  let exporting=false;
  let queuedExport=null;
  const verifications=new Map();

  function configure(value){callbacks=value;}

  function allowed(){return ['admin','manager','accountant'].includes(currentRole);}

  function normalized(){
    const filters=normalizeReportFilters(callbacks.getReportFilters());
    callbacks.setReportFilters(filters);
    return filters;
  }

  function requestBody(){
    const filters=normalized(),bounds=monthBounds(filters.month);
    const department=filters.department==='Svi'?null:departmentByName(filters.department);
    const worker=filters.workerId==='Svi'?null:workerById(filters.workerId);
    return {
      reportType:reportType[filters.type],
      periodFrom:bounds.start,
      periodTo:bounds.end,
      departmentId:department?.apiId||null,
      workerId:worker?.apiId||null,
      attendanceStatus:null
    };
  }

  function sameFilters(serverFilters,localBody){
    if(!serverFilters)return false;
    return serverFilters.reportType===localBody.reportType
      &&serverFilters.periodFrom===localBody.periodFrom
      &&serverFilters.periodTo===localBody.periodTo
      &&(serverFilters.departmentId||null)===(localBody.departmentId||null)
      &&(serverFilters.workerId||null)===(localBody.workerId||null)
      &&(serverFilters.attendanceStatus||null)===(localBody.attendanceStatus||null);
  }

  async function loadPreview({renderLoading=false,renderAfter=true}={}){
    if(!allowed())return false;
    const body=requestBody();
    previewLoading=true;previewError='';
    if(renderLoading)render();
    try{
      const result=await BSS_API.post('/report-previews',{...body,limit:100});
      if(!sameFilters(result.filters,body))throw new Error('Zaprimljeni pregled ne odgovara odabranim kriterijima. Pokušajte ponovno.');
      preview=result;
      return true;
    }catch(error){
      preview=null;
      previewError=callbacks?.apiMessage?.(error)||error?.message||'Službeni pregled nije dostupan.';
      return false;
    }finally{
      previewLoading=false;
      if(renderAfter)render();
    }
  }

  async function hydrate(){
    if(!allowed()){preview=null;previewError='';return;}
    await loadPreview({renderAfter:false});
  }

  function cell(value){
    if(value===null||value===undefined||value==='')return '—';
    return escapeHtml(value);
  }

  function previewHtml(){
    if(!root.BSS_API_ACTIVE||!allowed())return'';
    if(previewLoading)return '<section class="card report-authoritative-state" aria-live="polite"><b>Učitavam službeni pregled…</b><span>Dohvaćam podatke izvještaja s poslužitelja.</span></section>';
    if(previewError)return `<section class="card report-authoritative-state danger"><b>Službeni pregled nije dostupan</b><span>${escapeHtml(previewError)}</span><button class="btn secondary" data-bss-action="reloadReportPreview()">Pokušaj ponovno</button></section>`;
    if(!preview)return '<section class="card report-authoritative-state"><b>Službeni pregled nije učitan</b><span>Ogledni podaci nisu službeni podaci izvještaja.</span><button class="btn secondary" data-bss-action="reloadReportPreview()">Učitaj pregled</button></section>';

    const filters=callbacks.getReportFilters(),columns=preview.columns||[],rows=preview.rows||[],config=REPORT_TYPE_CONFIG[filters.type]||{};
    const body=rows.map(row=>`<tr>${columns.map(column=>`<td>${cell(row?.[column.key])}</td>`).join('')}</tr>`).join('');
    const dataset=preview.datasetVersion||'—';
    return `<div class="card table-card report-preview report-authoritative-preview" data-authoritative-preview="true">
      <div class="table-card-heading"><div><h2>${escapeHtml(config.label||'Službeni pregled')}</h2><p>Službeni pregled · aktualni podaci · <span class="mono">${escapeHtml(dataset)}</span></p></div><span class="pill gray">${Number(preview.totals?.rowCount??rows.length)} redaka</span></div>
      ${preview.truncated?'<div class="notice warning report-preview-truncated">Prikaz je ograničen. Izvoz može sadržavati više redaka od ovog pregleda.</div>':''}
      <div class="table-wrap"><table class="report-table"><thead><tr>${columns.map(column=>`<th>${escapeHtml(column.label)}</th>`).join('')}</tr></thead><tbody>${body||`<tr><td colspan="${Math.max(columns.length,1)}"><div class="empty-state">Nema podataka za odabrane kriterije.</div></td></tr>`}</tbody></table></div>
      <div class="table-summary"><span>${escapeHtml(preview.filters?.periodFrom||'')} – ${escapeHtml(preview.filters?.periodTo||'')}</span><span>Verzija podataka: <span class="mono">${escapeHtml(dataset)}</span></span></div>
    </div>`;
  }

  function metricsHtml(){
    if(!root.BSS_API_ACTIVE||!allowed()||!preview||previewLoading||previewError)return'';
    const totals=preview.totals||{};
    return `<section class="report-metrics report-authoritative-metrics" aria-label="Službeni sažetak izvještaja">
      <div><span>Redaka</span><b>${Number(totals.rowCount||0)}</b></div>
      <div><span>Evidentirano</span><b>${formatMinutes(Number(totals.workedMinutes||0))}</b></div>
      <div><span>Planirano</span><b>${formatMinutes(Number(totals.plannedMinutes||0))}</b></div>
      <div><span>Saldo</span><b>${formatSignedMinutes(Number(totals.balanceMinutes||0))}</b></div>
    </section>`;
  }

  async function applyFilters(log=true){
    if(!allowed())return;
    const current=callbacks.getReportFilters();
    const next=normalizeReportFilters({
      month:$('#reportMonth')?.value,
      department:$('#reportDept')?.value,
      workerId:$('#reportWorker')?.value,
      type:current.type
    });
    callbacks.setReportFilters(next);
    await root.BSSAttendanceLifecycle?.load(next.month);
    const ok=await loadPreview({renderLoading:true,renderAfter:false});
    render();
    if(log)toast(ok?'Službeni preview izvještaja je ažuriran.':'Službeni preview nije moguće učitati.');
  }

  async function updateDepartment(department){
    const current=callbacks.getReportFilters(),month=$('#reportMonth')?.value||current.month;
    const next=normalizeReportFilters({...current,month,department,workerId:'Svi'});
    callbacks.setReportFilters(next);
    await root.BSSAttendanceLifecycle?.load(next.month);
    await loadPreview({renderLoading:true,renderAfter:false});
    render();
  }

  async function setType(type){
    if(!REPORT_TYPE_CONFIG[type])return;
    callbacks.setReportFilters(normalizeReportFilters({...callbacks.getReportFilters(),type}));
    await loadPreview({renderLoading:true,renderAfter:false});
    render();
  }

  async function reload(){await loadPreview({renderLoading:true});}

  function hasRows(){return Boolean(preview&&!previewLoading&&!previewError&&Number(preview.totals?.rowCount||0)>0);}

  function reportIdentity(context=callbacks.session()?.context){
    const session=callbacks.session();
    if(!session||!context)return null;
    const scope=context.effectiveScope;
    return JSON.stringify([session.epoch,context.organization.id,context.user.id,context.user.role,
      scope.role,scope.selfWorkerId,[...scope.departmentIds].sort()]);
  }

  function requireSameSession(identity,context){
    if(!identity||reportIdentity(context)!==identity)throw new Error('Prijava ili opseg izvještaja se promijenio. Ponovno otvorite izvoz.');
  }

  async function refreshExportHistory(identity){
    const context=await BSS_API.get('/me');
    requireSameSession(identity);
    if(reportIdentity(context)!==identity){
      await callbacks.refreshSession(context);
      requireSameSession(identity);
    }
    const history=await BSS_API.get('/report-exports',{limit:5});
    requireSameSession(identity);
    state.reportHistory=BSS_API_STATE.mapReportHistory(history.items,context.organization.timezone);
    const latest=state.reportHistory[0];
    state.lastReport=latest?`${latest.format} · ${latest.time}`:'Nije još generiran';
    const historyView=$('#content .report-history');
    if(historyView)historyView.outerHTML=reportHistoryView();
    const lastReport=$('#content .last-report b');
    if(lastReport)lastReport.textContent=state.lastReport;
  }

  async function runExports(next){
    exporting=true;callbacks.setLoading(true);
    try{
      while(next){
        const {input,identity}=next;
        const {format,periodVersionId=null}=input;
        requireSameSession(identity);
        let created=await BSS_API.post('/report-exports',input);
        const exportPath=`/report-exports/${encodeURIComponent(created.id)}`;
        for(let attempt=0;created.status!=='ready'&&attempt<10;attempt+=1){
          await new Promise(resolve=>setTimeout(resolve,250));
          requireSameSession(identity);
          created=await BSS_API.get(exportPath);
        }
        if(created.status!=='ready')throw new Error('Izvještaj još nije spreman za preuzimanje.');
        if(created.periodVersionId!==periodVersionId)throw new Error('Izvezeni podaci ne odgovaraju odabranoj verziji.');
        requireSameSession(identity);
        const file=await BSS_API.download(`${exportPath}/download`);
        requireSameSession(identity);
        downloadBlob(file.blob,file.fileName);
        toast(`${format.toUpperCase()} izvještaj je preuzet.`);
        await refreshExportHistory(identity);
        next=queuedExport;queuedExport=null;
      }
    }catch(error){
      if(error?.status===401)await callbacks.refreshSession();
      const message=callbacks.apiMessage(error);
      toast(queuedExport?`${message} Izvoz na čekanju nije pokrenut.`:message);
    }finally{queuedExport=null;exporting=false;callbacks.setLoading(false);}
  }

  function openExport(format){
    if(!root.BSS_API_ACTIVE||!allowed()||!['csv','xlsx','pdf'].includes(format))return;
    const body=requestBody(),filters=callbacks.getReportFilters(),modal=$('#modal');
    const versionPath=`/attendance-periods/${body.periodFrom.slice(0,4)}/${Number(body.periodFrom.slice(5,7))}/versions`;
    const currentReady=()=>hasRows()&&sameFilters(preview.filters,body);
    const identity=reportIdentity();
    if(!identity)return;
    modal.innerHTML=`<div class="modal-card">
      <div class="modal-head"><h2>Potvrdi izvoz izvještaja</h2><button class="close-btn" aria-label="Zatvori" data-bss-action="closeModal()">×</button></div>
      <p><b>${escapeHtml(REPORT_TYPE_CONFIG[filters.type].label)}</b> · ${escapeHtml(body.periodFrom)} – ${escapeHtml(body.periodTo)} · ${escapeHtml(reportScopeLabel(filters))} · ${format.toUpperCase()}</p>
      <div class="form">
        <label>Izvor podataka<select id="reportExportSource">
          <option value="current">Aktualni podaci</option><option value="locked">Spremljena verzija mjeseca</option>
        </select></label>
        <div id="reportExportVersionField" hidden><div class="form"><label for="reportExportVersion">Spremljena verzija</label><select id="reportExportVersion"></select></div></div>
        <p id="reportExportStatus" role="status"></p>
      </div>
      <div class="btns"><button id="confirmReportExport" class="btn">Potvrdi i preuzmi</button><button class="btn secondary" data-bss-action="closeModal()">Odustani</button></div>
    </div>`;
    const source=modal.querySelector('#reportExportSource');
    const versionField=modal.querySelector('#reportExportVersionField');
    const selector=modal.querySelector('#reportExportVersion');
    const status=modal.querySelector('#reportExportStatus');
    const confirm=modal.querySelector('#confirmReportExport');
    let versions=null,loading=false,error=false;

    function update(){
      const locked=source.value==='locked';
      const selected=versions?.find(item=>item.id===selector.value);
      versionField.hidden=!locked;
      selector.disabled=!locked||!versions?.length;
      confirm.disabled=locked?!selected:!currentReady();
      status.textContent=locked
        ? loading?'Učitavam spremljene verzije…'
          : error?'Verzije nisu dostupne. Za ponovni pokušaj zatvorite i otvorite izvoz.'
            : !versions?.length?'Za ovaj mjesec nema spremljenih verzija.'
              : selected?'Izvoz koristi odabranu verziju. Pregled na stranici prikazuje aktualne podatke.':'Odaberite verziju za izvoz.'
        : currentReady()?'Izvoz koristi aktualne podatke, bez zaključane verzije.':'Za odabrane filtre nema učitanih aktualnih podataka.';
    }

    source.addEventListener('change',async()=>{
      selector.value='';
      if(source.value!=='locked'||versions||loading){update();return;}
      loading=true;error=false;update();
      try{
        const result=await callbacks.listVersions(versionPath);
        const options=result.items.map((item,index)=>new Option(
          `${callbacks.versionDate(item.finalizedAt)} · revizija ${item.periodRevision} · ${index===0?'najnovija':'ranija verzija'}`,item.id));
        selector.replaceChildren(new Option('Odaberite verziju…',''),...options);
        versions=result.items;
      }catch{error=true;}
      finally{loading=false;update();}
    });
    selector.addEventListener('change',update);
    confirm.addEventListener('click',()=>{
      if(confirm.disabled||!modal.isConnected||!modal.contains(confirm)||!modal.classList.contains('open'))return;
      if(!allowed()||reportIdentity()!==identity){
        closeModal();
        toast('Prijava ili opseg izvještaja se promijenio. Ponovno otvorite izvoz.');
        return;
      }
      if(!sameFilters(requestBody(),body)){
        closeModal();
        toast('Filtri su se promijenili. Ponovno otvorite izvoz.');
        return;
      }
      const locked=source.value==='locked';
      const selected=versions?.find(item=>item.id===selector.value);
      if(locked?!selected:!currentReady())return;
      if(queuedExport||apiLoading&&!exporting){
        status.textContent=queuedExport?'Jedan izvoz već čeka. Potvrdite ponovno kad završi.':'Pričekajte završetak obrade pa potvrdite izvoz.';
        return;
      }
      const next={input:{...body,format,...(locked?{periodVersionId:selected.id}:{})},identity};
      closeModal();
      if(exporting){
        queuedExport=next;
        toast('Izvoz će se pokrenuti nakon prethodnog izvještaja.');
      }else{
        void runExports(next);
      }
    });
    update();showModal(modal);
  }

  function verificationState(exportId){return verifications.get(String(exportId))||null;}

  function verificationOutcome(data){
    if(data.periodVersionId===null)return data.artifactChecksumMatches===true?'artifact':'failed';
    return data.verified===true&&data.artifactChecksumMatches===true&&data.datasetChecksumMatches===true?'full':'failed';
  }

  function historyAction(item){
    if(!root.BSS_API_ACTIVE||!allowed()||!item?.apiId)return'';
    const id=String(item.apiId),status=verificationState(id);
    if(status?.loading)return '<span class="small-muted">Provjera…</span>';
    if(status?.data){
      const outcome=verificationOutcome(status.data);
      const label=outcome==='full'?'Provjereno':outcome==='artifact'?'Datoteka provjerena':'Nije potvrđeno';
      return `<button class="report-verification-result ${outcome==='failed'?'failed':'verified'}" data-bss-action="openReportVerification('${escapeHtml(id)}')">${label}</button>`;
    }
    if(status?.error)return `<button class="report-verification-result failed" data-bss-action="verifyReportExport('${escapeHtml(id)}')">Ponovi provjeru</button>`;
    if(item.status!=='ready')return `<span class="small-muted">${escapeHtml(item.status||'nije spremno')}</span>`;
    return `<button class="table-detail-btn" data-bss-action="verifyReportExport('${escapeHtml(id)}')">Provjeri</button>`;
  }

  async function verifyExport(exportId){
    if(!root.BSS_API_ACTIVE||!allowed()||!exportId)return;
    const id=String(exportId);
    verifications.set(id,{loading:true});render();
    try{
      const data=await BSS_API.get(`/report-exports/${encodeURIComponent(id)}/verification`);
      verifications.set(id,{loading:false,data});
      render();
      openVerification(id);
    }catch(error){
      const message=callbacks?.apiMessage?.(error)||error?.message||'Provjera izvoza nije uspjela.';
      verifications.set(id,{loading:false,error:message});
      render();toast(message);
    }
  }

  function openVerification(exportId){
    const current=verificationState(exportId),data=current?.data;if(!data)return;
    const outcome=verificationOutcome(data);
    const title=outcome==='full'?'Izvoz je provjeren':outcome==='artifact'?'Datoteka je provjerena':'Izvoz nije potvrđen';
    const message=outcome==='full'?'Kontrolni zbrojevi datoteke i podataka odgovaraju spremljenoj evidenciji izvoza.'
      :outcome==='artifact'?'Kontrolni zbroj datoteke odgovara evidenciji izvoza. Za aktualne podatke nema spremljene verzije za provjeru izvora.'
        :'Jedna ili više provjera nisu potvrdile datoteku ili podatke. Ovaj izvoz nemoj tretirati kao provjeren.';
    const modal=$('#modal');
    modal.innerHTML=`<div class="modal-card report-verification-modal"><div class="modal-head"><div><div class="eyebrow">Provjera izvornosti izvoza</div><h2>${title}</h2><div class="small-muted">Neovisna provjera spremljene datoteke i podataka izvještaja.</div></div><button class="close-btn" data-bss-action="closeModal()">×</button></div>
      <div class="notice ${outcome==='failed'?'danger':'info'}">${message}</div>
      <div class="report-verification-grid">
        <div><span>Kontrolni zbroj datoteke</span><b>${data.artifactChecksumMatches?'Podudara se':'NE PODUDARA SE'}</b></div>
        <div><span>Kontrolni zbroj podataka</span><b>${data.periodVersionId===null?'Nije primjenjivo':data.datasetChecksumMatches?'Podudara se':'NE PODUDARA SE'}</b></div>
        <div><span>Verzija podataka</span><b class="mono">${escapeHtml(data.datasetVersion||'—')}</b></div>
        <div><span>Verzija razdoblja</span><b class="mono">${escapeHtml(data.periodVersionId||'Aktualni podaci')}</b></div>
        <div><span>Verzije obračuna sati</span><b>${escapeHtml((data.calculationVersions||[]).join(', ')||'—')}</b></div>
        <div><span>Verzija predloška</span><b>${escapeHtml(data.templateVersion||'—')}</b></div>
      </div>
      <div class="small-muted">Provjereno: ${escapeHtml(data.verifiedAt||'—')}</div>
      <div class="btns"><button class="btn secondary" data-bss-action="closeModal()">Zatvori</button></div></div>`;
    showModal(modal);
  }

  root.BSSReportAuthority=Object.freeze({
    configure,hydrate,openExport,loadPreview,previewHtml,metricsHtml,hasRows,historyAction,applyFilters,updateDepartment,setType,reload,verifyExport,openVerification
  });
})(typeof globalThis==='object'?globalThis:window);
