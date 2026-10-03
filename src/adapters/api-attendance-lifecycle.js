/* global CURRENT_MONTH, currentRole, BSS_API, render, toast, escapeHtml, monthDisplay, reportFilters, $, showModal, state, isoLabel */
(function registerAttendanceLifecycleApi(root){
  'use strict';

  let callbacks=null;
  let period=null;
  let periodEtag='';
  let periodMonth='';
  let idempotencySequence=0;

  function configure(value){callbacks=value;}

  function statusLabel(status){
    return({open:'Otvoreno',review:'U pregledu',finalized:'Finalizirano',closed:'Zatvoreno'})[status]||status||'Nepoznato';
  }
  function actionLabel(action){
    return({review:'Pokreni pregled',finalize:'Finaliziraj mjesec',close:'Zatvori mjesec',reopen:'Ponovno otvori'})[action]||action;
  }
  function idempotencyKey(action){
    const unique=root.crypto?.randomUUID?.()||`${Date.now()}-${++idempotencySequence}`;
    return `bss-period-${action}-${unique}`;
  }
  function transitionHeaders(action){
    return {...callbacks.revisionHeaders(period?.revision||periodEtag||'0'),'Idempotency-Key':idempotencyKey(action)};
  }
  async function fetchPeriod(month=periodMonth||CURRENT_MONTH,{renderAfter=true}={}){
    if(!['admin','manager','accountant'].includes(currentRole)||!/^[0-9]{4}-[0-9]{2}$/.test(month||''))return false;
    const [year,monthNumber]=month.split('-').map(Number);
    const result=await BSS_API.getWithMeta(`/attendance-periods/${year}/${monthNumber}`);
    period=result.data;periodEtag=result.etag||result.data.revision;periodMonth=month;
    if(renderAfter)render();
    return true;
  }
  async function hydrate(){
    if(['admin','manager','accountant'].includes(currentRole)){
      await fetchPeriod(periodMonth||CURRENT_MONTH,{renderAfter:false});
    }else{
      period=null;periodEtag='';periodMonth='';
    }
  }
  async function load(month=periodMonth||CURRENT_MONTH){
    try{return await fetchPeriod(month);}
    catch(error){const message=callbacks.apiMessage(error);render();toast(message);return false;}
  }
  function blockerRows(){
    const unresolved=period?.unresolved||{};
    return [
      ['Aktivni zapisi',Number(unresolved.active||0)],
      ['Nepotpuni zapisi',Number(unresolved.incomplete||0)],
      ['Korekcije na čekanju',Number(unresolved.pendingCorrections||0)],
      ['Terminalska usklađenja',Number(unresolved.reconciliationRequired||0)]
    ];
  }
  function card(){
    if(!['admin','manager','accountant'].includes(currentRole)||!period)return'';
    const blocked=Number(period.unresolved?.total||0)>0,admin=currentRole==='admin',actions=[];
    if(admin&&period.status==='open')actions.push(['review',false]);
    if(admin&&period.status==='review')actions.push(['finalize',blocked]);
    if(admin&&period.status==='finalized')actions.push(['close',false],['reopen',false]);
    if(admin&&period.status==='closed')actions.push(['reopen',false]);
    const checksum=period.datasetChecksumSha256?period.datasetChecksumSha256.slice(0,12)+'…':'Nije zaključan';
    return `<section class="card period-lifecycle-card" aria-label="Mjesečni lifecycle evidencije">
      <div class="period-lifecycle-head"><div><span>Mjesečni lifecycle</span><h2>${escapeHtml(monthDisplay(periodMonth))}</h2><p>Server-authoritative stanje za finalizaciju i reproducibilne izvještaje.</p></div><label>Mjesec<input id="apiPeriodMonth" type="month" value="${escapeHtml(periodMonth)}" data-bss-change="loadAttendancePeriod(this.value)"></label></div>
      <div class="period-lifecycle-strip"><div><span>Status</span><b>${escapeHtml(statusLabel(period.status))}</b></div><div><span>Revizija</span><b>${escapeHtml(period.revision)}</b></div><div><span>Otvoreni blocker-i</span><b>${Number(period.unresolved?.total||0)}</b></div><div><span>Dataset checksum</span><b class="period-checksum">${escapeHtml(checksum)}</b></div></div>
      <div class="period-lifecycle-body">
        <div class="period-blocker-list">${blockerRows().map(([label,value])=>`<div><span>${escapeHtml(label)}</span><b class="${value?'negative':'positive'}">${value}</b></div>`).join('')}</div>
        <div class="period-provenance"><span>Provenance</span><b>${escapeHtml(period.provenanceStatus||'none')}</b><small>${period.datasetVersion?`Dataset ${escapeHtml(period.datasetVersion)}`:'Dataset nastaje tek pri finalizaciji.'}</small>${period.lastReason?`<small>Zadnji razlog: ${escapeHtml(period.lastReason)}</small>`:''}</div>
      </div>
      ${admin?`<div class="btns period-lifecycle-actions">${actions.map(([action,disabled])=>`<button class="btn ${action==='reopen'?'secondary':''}" data-bss-action="openPeriodTransition('${action}')" ${disabled?'disabled':''}>${escapeHtml(actionLabel(action))}</button>`).join('')||'<span class="small-muted">Za trenutno stanje nema nove tranzicije.</span>'}</div>`:'<div class="notice info period-readonly">Lifecycle je samo za čitanje. Tranzicije su Admin-only i server ih dodatno autorizira.</div>'}
      ${blocked&&period.status==='review'?'<div class="notice danger">Finalizacija je blokirana dok server prijavljuje neriješene attendance, korekcijske ili terminalske stavke.</div>':''}
    </section>`;
  }
  function viewReports(){return `${card()}${callbacks.baseViewReports()}`;}
  async function applyReportFilters(){
    callbacks.baseApplyReportFilters();
    if(['admin','manager','accountant'].includes(currentRole))await load(reportFilters.month);
  }
  function openTransition(action){
    if(currentRole!=='admin'||!period)return;
    const allowed=(period.status==='open'&&action==='review')||(period.status==='review'&&action==='finalize')||(period.status==='finalized'&&['close','reopen'].includes(action))||(period.status==='closed'&&action==='reopen');
    if(!allowed)return toast('Ta tranzicija nije dopuštena iz trenutačnog stanja.');
    if(action==='finalize'&&Number(period.unresolved?.total||0)>0)return toast('Finalizacija je blokirana neriješenim stavkama.');
    const modal=$('#modal');
    modal.innerHTML=`<div class="modal-card"><div class="modal-head"><div><div class="eyebrow">Attendance period</div><h2>${escapeHtml(actionLabel(action))}</h2><div class="small-muted">${escapeHtml(monthDisplay(periodMonth))} · ${escapeHtml(statusLabel(period.status))} · revizija ${escapeHtml(period.revision)}</div></div><button class="close-btn" aria-label="Zatvori" data-bss-action="closeModal()">×</button></div><div class="notice info">Ranije finalizirani datasetovi i artefakti ostaju nepromijenjeni. Server provjerava lifecycle, blockere, ovlasti i reviziju.</div><label>Razlog<textarea id="periodTransitionReason" rows="3" minlength="3" maxlength="1000" placeholder="Zašto se stanje mijenja?"></textarea></label><div class="btns"><button class="btn" data-bss-action="submitPeriodTransition('${action}')">Potvrdi</button><button class="btn secondary" data-bss-action="closeModal()">Odustani</button></div></div>`;
    showModal(modal);
  }
  async function submitTransition(action){
    if(currentRole!=='admin'||!period)return;
    const reason=$('#periodTransitionReason')?.value.trim()||'';
    if(reason.length<3)return toast('Upiši razlog od najmanje 3 znaka.');
    const [year,monthNumber]=periodMonth.split('-').map(Number);
    await callbacks.mutateApi(async()=>{
      period=await BSS_API.post(`/attendance-periods/${year}/${monthNumber}/${action}`,{reason},transitionHeaders(action));
      periodEtag=period.revision;
    },`${actionLabel(action)} — spremljeno.`);
  }
  async function openRecalculation(recordId){
    if(currentRole!=='admin')return;
    const record=state.records.find(item=>item.id===Number(recordId));
    if(!record?.apiId)return;
    if(record.status==='Ispravljeno')return toast('Ispravljeni zapis se ne preračunava ponovno.');
    const [year,monthNumber]=record.date.slice(0,7).split('-').map(Number);
    try{
      const currentPeriod=await BSS_API.getWithMeta(`/attendance-periods/${year}/${monthNumber}`);
      if(currentPeriod.data.status!=='open')return toast('Preračun je dopušten samo u otvorenom periodu. Za zaključani ili review period koristi kontrolirani lifecycle postupak.');
      const modal=$('#modal');
      modal.innerHTML=`<div class="modal-card"><div class="modal-head"><div><div class="eyebrow">Kontrolirani preračun</div><h2>${escapeHtml(isoLabel(record.date))}</h2><div class="small-muted">Revizija zapisa ${escapeHtml(record.revision)} · calculationVersion attendance-v1</div></div><button class="close-btn" aria-label="Zatvori" data-bss-action="closeModal()">×</button></div><div class="record-detail-grid"><div><span>Dolazak</span><b>${escapeHtml(record.start||'—')}</b></div><div><span>Odlazak</span><b>${escapeHtml(record.end||'—')}</b></div><div><span>Status</span><b>${escapeHtml(record.status)}</b></div><div><span>Period</span><b>${escapeHtml(statusLabel(currentPeriod.data.status))}</b></div></div><div class="notice info">Preračun koristi postojeće nepromjenjive terminalske dokaze. Sirovi RFID događaji se ne prepisuju; server sprema before/after, razlog i audit provenance.</div><label>Razlog<textarea id="attendanceRecalculationReason" rows="3" minlength="3" maxlength="1000" placeholder="Zašto je potreban preračun?"></textarea></label><div class="btns"><button class="btn" data-bss-action="submitAttendanceRecalculation(${record.id})">Preračunaj</button><button class="btn secondary" data-bss-action="closeModal()">Odustani</button></div></div>`;
      showModal(modal);
    }catch(error){toast(callbacks.apiMessage(error));}
  }
  async function submitRecalculation(recordId){
    if(currentRole!=='admin')return;
    const record=state.records.find(item=>item.id===Number(recordId)),reason=$('#attendanceRecalculationReason')?.value.trim()||'';
    if(!record?.apiId||reason.length<3)return toast('Upiši razlog od najmanje 3 znaka.');
    if(record.status==='Ispravljeno')return toast('Ispravljeni zapis se ne preračunava ponovno.');
    const [year,monthNumber]=record.date.slice(0,7).split('-').map(Number);
    let currentPeriod;
    try{currentPeriod=await BSS_API.getWithMeta(`/attendance-periods/${year}/${monthNumber}`);}
    catch(error){return toast(callbacks.apiMessage(error));}
    if(currentPeriod.data.status!=='open')return toast('Preračun je dopušten samo u otvorenom periodu.');
    await callbacks.mutateApi(()=>BSS_API.post(`/attendance/${record.apiId}/recalculations`,{calculationVersion:'attendance-v1',reason},callbacks.revisionHeaders(record.revision)),'Attendance zapis je preračunat iz nepromjenjivih dokaza.');
  }
  function openRecord(id){
    callbacks.baseOpenAttendanceRecord(id);
    if(currentRole!=='admin')return;
    const record=state.records.find(item=>item.id===Number(id)),container=$('#modal .btns');
    if(!record?.apiId||!container||record.status==='Ispravljeno')return;
    const button=document.createElement('button');
    button.className='btn secondary';
    button.textContent='Kontrolirani preračun';
    button.setAttribute('data-bss-action',`openAttendanceRecalculation(${record.id})`);
    container.prepend(button);
  }

  root.BSSAttendanceLifecycle=Object.freeze({
    configure,hydrate,load,viewReports,applyReportFilters,openTransition,submitTransition,openRecalculation,submitRecalculation,openRecord
  });
})(typeof globalThis==='object'?globalThis:window);
