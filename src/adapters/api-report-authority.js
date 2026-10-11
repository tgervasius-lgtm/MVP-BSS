/* global BSS_API, normalizeReportFilters, monthBounds, departmentByName, workerById, REPORT_TYPE_CONFIG, currentRole, render, toast, escapeHtml, formatMinutes, formatSignedMinutes, $, showModal */
(function registerReportAuthority(root){
  'use strict';

  const reportType={summary:'monthly_summary',attendance:'attendance_journal',exceptions:'exceptions',vacations:'approved_absences',corrections:'correction_log'};
  let callbacks=null;
  let preview=null;
  let previewError='';
  let previewLoading=false;
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
      attendanceStatus:null,
      limit:100
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
      const result=await BSS_API.post('/report-previews',body);
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
      <div class="table-card-heading"><div><h2>${escapeHtml(config.label||'Službeni pregled')}</h2><p>Službeni pregled · verzija podataka <span class="mono">${escapeHtml(dataset)}</span></p></div><span class="pill gray">${Number(preview.totals?.rowCount??rows.length)} redaka</span></div>
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

  function verificationState(exportId){return verifications.get(String(exportId))||null;}

  function historyAction(item){
    if(!root.BSS_API_ACTIVE||!allowed()||!item?.apiId)return'';
    const id=String(item.apiId),status=verificationState(id);
    if(status?.loading)return '<span class="small-muted">Provjera…</span>';
    if(status?.data){
      const ok=status.data.verified===true&&status.data.artifactChecksumMatches===true&&status.data.datasetChecksumMatches===true;
      return `<button class="report-verification-result ${ok?'verified':'failed'}" data-bss-action="openReportVerification('${escapeHtml(id)}')">${ok?'Provjereno':'Nije potvrđeno'}</button>`;
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
    const verified=data.verified===true&&data.artifactChecksumMatches===true&&data.datasetChecksumMatches===true;
    const modal=$('#modal');
    modal.innerHTML=`<div class="modal-card report-verification-modal"><div class="modal-head"><div><div class="eyebrow">Provjera izvornosti izvoza</div><h2>${verified?'Izvoz je provjeren':'Izvoz nije potvrđen'}</h2><div class="small-muted">Neovisna provjera spremljene datoteke i podataka izvještaja.</div></div><button class="close-btn" data-bss-action="closeModal()">×</button></div>
      <div class="notice ${verified?'info':'danger'}">${verified?'Kontrolni zbrojevi datoteke i podataka odgovaraju spremljenoj evidenciji izvoza.':'Jedna ili više provjera nisu potvrdile datoteku ili podatke. Ovaj izvoz nemoj tretirati kao provjeren.'}</div>
      <div class="report-verification-grid">
        <div><span>Kontrolni zbroj datoteke</span><b>${data.artifactChecksumMatches?'Podudara se':'NE PODUDARA SE'}</b></div>
        <div><span>Kontrolni zbroj podataka</span><b>${data.datasetChecksumMatches?'Podudara se':'NE PODUDARA SE'}</b></div>
        <div><span>Verzija podataka</span><b class="mono">${escapeHtml(data.datasetVersion||'—')}</b></div>
        <div><span>Verzija razdoblja</span><b class="mono">${escapeHtml(data.periodVersionId||'Nije zaključan')}</b></div>
        <div><span>Verzije obračuna sati</span><b>${escapeHtml((data.calculationVersions||[]).join(', ')||'—')}</b></div>
        <div><span>Verzija predloška</span><b>${escapeHtml(data.templateVersion||'—')}</b></div>
      </div>
      <div class="small-muted">Provjereno: ${escapeHtml(data.verifiedAt||'—')}</div>
      <div class="btns"><button class="btn secondary" data-bss-action="closeModal()">Zatvori</button></div></div>`;
    showModal(modal);
  }

  root.BSSReportAuthority=Object.freeze({
    configure,hydrate,loadPreview,previewHtml,metricsHtml,hasRows,historyAction,applyFilters,updateDepartment,setType,reload,verifyExport,openVerification
  });
})(typeof globalThis==='object'?globalThis:window);
