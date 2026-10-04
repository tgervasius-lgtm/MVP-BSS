/* global BSS_API, state, currentRole, logged, escapeHtml, $, showModal, closeModal, toast */
(function registerTerminalReconciliation(root){
  'use strict';

  let callbacks;
  let loading=false;
  let activeId=null;
  const uncertain=new Set();
  const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const allowed=()=>root.BSS_API_ACTIVE&&logged&&['admin','manager'].includes(currentRole);
  const eventById=id=>(state.terminal?.recentEvents||[]).find(item=>item.syncEventId===id);
  const canResolve=item=>currentRole==='admin'&&item?.statusCode==='reconciliation_required'
    &&uuid.test(item.attendanceEventId||'')&&item.reconciliationLoaded===true&&item.reconciliation===null&&!uncertain.has(item.attendanceEventId);
  const outcome=value=>value==='accepted'?'Prihvaćeno':value==='rejected'?'Odbijeno':'Nije razriješeno';
  function configure(value){callbacks=value;}
  function date(value){
    if(!value||!Number.isFinite(Date.parse(value)))return'Nije dostupno';
    const zone=state.company?.timezone||'UTC';
    return `${new Date(value).toLocaleString('hr-HR',{timeZone:zone})} (${zone}) · ${value}`;
  }
  function tableHtml(events){
    if(!allowed())return'';
    return `<div class="btns"><button class="btn secondary" data-bss-action="reloadTerminalEvents()">Osvježi događaje</button></div><div class="table-wrap"><table class="compact-table"><thead><tr><th>Radnik</th><th>Događaj</th><th>Vrijeme</th><th>Izvorni status dostave</th>${currentRole==='admin'?'<th>Odluka usklađenja</th>':''}<th>Detalj</th></tr></thead><tbody>${events.map(item=>`<tr><td>${escapeHtml(item.label)}</td><td>${escapeHtml(item.type)}</td><td>${escapeHtml(date(item.occurredAt))}</td><td>${escapeHtml(item.status)}</td>${currentRole==='admin'?`<td>${escapeHtml(item.reconciliation?outcome(item.reconciliation.resolution):item.reconciliationLoaded?'Nema odluke':'Nije dostupno')}</td>`:''}<td><button class="table-detail-btn" data-bss-action="openTerminalEvent('${escapeHtml(item.syncEventId||'')}')">Pregledaj</button></td></tr>`).join('')||`<tr><td colspan="${currentRole==='admin'?6:5}">Nema događaja u učitanom razdoblju.</td></tr>`}</tbody></table></div>`;
  }
  function detail(item){
    const modal=$('#modal');if(!modal)return;
    activeId=item.syncEventId;
    const evidence=item.lifecycleEvidence?.acknowledgement;
    const rows=[['Radnik',item.label],['Događaj',item.type],['Vrijeme događaja',date(item.occurredAt)],['Potvrda terminala',date(item.acknowledgedAt)],['Primitak',date(item.receivedAt)],['Izvorni status dostave',item.status],['Razlog obrade',item.rejectionCode||'Nije naveden'],['Potpis potvrđen',item.acknowledgementVerified===true?'Da':'Nije potvrđen'],['Pouzdanost sata',evidence?.clockStatus||'Nije dostupno'],['ID izvornog događaja',item.attendanceEventId||'Nije dostupan']];
    const resolution=item.reconciliation;
    modal.innerHTML=`<div class="modal-card"><div class="modal-head"><h2>Dokaz terminalskog događaja</h2><button class="close-btn" aria-label="Zatvori" data-bss-action="closeModal()">×</button></div><dl class="terminal-evidence">${rows.map(([label,value])=>`<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join('')}</dl>
      ${currentRole==='admin'&&resolution?`<div class="notice info">Zaključena odluka: ${outcome(resolution.resolution)} · ${escapeHtml(date(resolution.createdAt))}${resolution.attendanceDayId?`<br>Evidencija: ${escapeHtml(resolution.attendanceDayId)}`:''}. Izvorni dokaz ostaje nepromijenjen.</div>`:''}
      ${canResolve(item)?`<div class="form"><label>Odluka<select id="terminalResolution"><option value="">Odaberi odluku</option><option value="accepted">Prihvati — izvedi evidenciju ako dokazi dopuštaju</option><option value="rejected">Odbij — bez izvođenja evidencije</option></select></label><label>Razlog<textarea id="terminalResolutionReason" minlength="3" maxlength="1000" rows="3"></textarea></label><p>Prihvaćanje prolazi provjeru dokaza i perioda na poslužitelju. Odbijanje zadržava dokaz bez nove evidencije. Zaključena odluka se ne može zamijeniti.</p><label><input id="terminalResolutionConfirm" type="checkbox"> Potvrđujem odabranu odluku i njezin učinak.</label></div><div class="btns"><button class="btn" data-bss-action="submitTerminalReconciliation()">Potvrdi usklađenje</button><button class="btn secondary" data-bss-action="closeModal()">Odustani</button></div>`:`<div class="notice info">${currentRole!=='admin'?'Pregled bez ovlasti za usklađenje.':resolution?'Događaj je razriješen.':'Usklađenje trenutačno nije dostupno za ovaj zapis. Osvježi pregled ako ishod prethodnog zahtjeva nije poznat.'}</div>`}<p id="terminalResolutionFeedback" role="status" aria-live="polite"></p></div>`;
    showModal(modal);
  }
  async function reload(){
    if(!allowed()||loading)return;
    loading=true;
    try{if(await callbacks.refresh())uncertain.clear();}finally{loading=false;}
  }
  async function open(id){
    if(!allowed()||loading||!eventById(id))return;
    loading=true;
    try{
      const ok=await callbacks.refresh();
      if(!ok||!allowed()||screen!=='terminal')return;
      const item=eventById(id);if(item){uncertain.delete(item.attendanceEventId);detail(item);}
      else toast('Događaj više nije u dostupnom opsegu.');
    }finally{loading=false;}
  }
  async function submit(){
    const item=eventById(activeId);
    if(!allowed()||screen!=='terminal'||loading||!canResolve(item))return;
    const resolution=$('#terminalResolution')?.value,reason=$('#terminalResolutionReason')?.value.trim()||'';
    if(!['accepted','rejected'].includes(resolution)||reason.length<3||reason.length>1000||!$('#terminalResolutionConfirm')?.checked){
      $('#terminalResolutionFeedback').textContent='Odaberi odluku, upiši razlog od 3 do 1000 znakova i potvrdi učinak.';return;
    }
    const rawId=item.attendanceEventId;
    loading=true;
    $('#modal').querySelectorAll('button,input,select,textarea').forEach(element=>{element.disabled=true;});
    $('#terminalResolutionFeedback').textContent='Spremam odluku…';
    let confirmed=false,message='';
    try{
      const result=await BSS_API.post(`/attendance-events/${encodeURIComponent(rawId)}/reconciliation`,{resolution,reason});
      if(result?.attendanceEventId!==rawId||result.resolution!==resolution)throw new Error('Nepotvrđen odgovor');
      confirmed=true;message=`Odluka je spremljena: ${outcome(result.resolution)}.`;
    }catch(error){
      if(!error?.status||error.status>=500){uncertain.add(rawId);message='Ishod zahtjeva nije poznat. Provjeravam spremljenu odluku; zahtjev nije automatski ponovljen.';}
      else if(error.status===409)message='Usklađenje nije dopušteno ili je već zaključeno. Provjeri aktualni dokaz i odluku.';
      else if(error.status===401||error.status===403)message='Nema ovlasti ili je sesija istekla.';
      else if(error.status===429)message='Previše zahtjeva. Pričekaj pa osvježi pregled.';
      else message='Odluka nije prihvaćena. Provjeri unos i dostupnost događaja.';
    }finally{
      closeModal();
      const ok=await callbacks.refresh();
      const fresh=(state.terminal?.recentEvents||[]).find(row=>row.attendanceEventId===rawId);
      if(ok&&fresh?.reconciliation){uncertain.delete(rawId);message=`Spremljena odluka: ${outcome(fresh.reconciliation.resolution)}.`;}
      else if(confirmed&&!ok)message+=' Osvježavanje prikaza nije uspjelo.';
      loading=false;activeId=null;toast(message);
    }
  }
  root.BSSTerminalReconciliation=Object.freeze({configure,tableHtml,open,submit,reload});
})(globalThis);
