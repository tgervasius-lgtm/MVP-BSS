/* global BSS_API, state, currentRole, logged, $, showModal, toast, escapeHtml */
(function registerTerminalCredential(root){
  'use strict';

  let callbacks,pending=false,draft=null,epoch=0,secret='',credentialField=null;
  const notices=new Map();
  const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const allowed=()=>root.BSS_API_ACTIVE&&logged&&currentRole==='admin';
  const validTerminal=terminal=>uuid.test(terminal?.apiId||'')&&['online','offline'].includes(terminal.statusCode)&&/^[1-9]\d*$/.test(String(terminal.revision));
  function configure(value){callbacks=value;}
  function clear(){
    if(credentialField){credentialField.value='';credentialField.type='password';}
    secret='';credentialField=null;draft=null;epoch+=1;
  }
  function controlsHtml(){
    if(!allowed())return'';
    const terminal=state.terminal;
    return `${notices.has(terminal.apiId)?`<div class="notice warning" role="status">${escapeHtml(notices.get(terminal.apiId))}</div>`:''}${validTerminal(terminal)?'<button class="btn secondary" data-bss-action="openTerminalRotation()">Rotiraj vjerodajnicu</button>':''}`;
  }
  async function open(){
    if(!allowed()||pending||!validTerminal(state.terminal))return;
    if(!await callbacks.refresh()||!allowed()||screen!=='terminal'||!validTerminal(state.terminal))return;
    const terminal=state.terminal,modal=$('#modal');
    modal.innerHTML=`<div class="modal-card"><div class="modal-head"><h2>Rotacija vjerodajnice terminala</h2><button class="close-btn" aria-label="Zatvori" data-bss-action="closeModal()">×</button></div><p>${escapeHtml(terminal.name)} · ${escapeHtml(terminal.location)}</p><div class="form"><label>Razlog<select id="terminalRotationReason" data-bss-change="changeTerminalRotationReason()"><option value="">Odaberi razlog</option><option value="normal_rotation">Redovna rotacija</option><option value="suspected_compromise">Sumnja na kompromitaciju</option></select></label><p id="terminalRotationEffect">Odaberi razlog prije potvrde.</p><p>Nova vjerodajnica prikazuje se jednom. Pripremi siguran prijenos na uređaj; ova radnja sama ne instalira ključ na terminal. Nakon zatvaranja nije moguće ponovno dohvatiti istu tajnu.</p><label><input id="terminalRotationConfirm" type="checkbox"> Potvrđujem rotaciju i spreman sam sigurno preuzeti novu vjerodajnicu.</label></div><div class="btns"><button class="btn" data-bss-action="submitTerminalRotation()">Potvrdi rotaciju</button><button class="btn secondary" data-bss-action="closeModal()">Odustani</button></div><p id="terminalRotationFeedback" role="status" aria-live="polite"></p></div>`;
    showModal(modal);
    draft={id:terminal.apiId,revision:String(terminal.revision)};
  }
  function changeReason(){
    const reason=$('#terminalRotationReason')?.value;
    const feedback=$('#terminalRotationEffect');if(!feedback)return;
    feedback.textContent=reason==='normal_rotation'?'Prethodni ključ prestaje vrijediti za nove potvrde. Dokazive potvrde nastale prije granice rotacije ostaju provjerljive.':reason==='suspected_compromise'?'Prethodni ključ se dodatno označava opozvanim zbog sumnje na kompromitaciju. Potvrde nastale na granici opoziva ili poslije nje ne mogu autorizirati evidenciju.':'Odaberi razlog prije potvrde.';
    $('#terminalRotationConfirm').checked=false;
  }
  function showCredential(result){
    const modal=$('#modal');
    modal.innerHTML=`<div class="modal-card"><div class="modal-head"><h2>Vjerodajnica je rotirana</h2><button class="close-btn" aria-label="Zatvori i ukloni vjerodajnicu" data-bss-action="closeModal()">×</button></div><div class="notice warning">Preuzmi tajnu sada i sigurno je prenesi na terminal. Instalacija na uređaj nije potvrđena. Zatvaranje, navigacija ili odjava uklanjaju ovaj prikaz.</div><div class="form"><label>Jednokratna vjerodajnica<input id="terminalCredential" type="password" readonly autocomplete="off" spellcheck="false"></label></div><div class="btns"><button class="btn secondary" id="terminalCredentialReveal" data-bss-action="revealTerminalCredential()">Prikaži tajnu</button><button class="btn secondary" data-bss-action="copyTerminalCredential()">Kopiraj tajnu</button></div><p>Javni ID ACK ključa: <code>${escapeHtml(result.acknowledgementKey.id)}</code><br>Verzija: ${escapeHtml(result.acknowledgementKey.version)}</p><p id="terminalCredentialFeedback" role="status" aria-live="polite"></p><button class="btn" data-bss-action="closeModal()">Zatvori i ukloni prikaz</button></div>`;
    showModal(modal);
    secret=result.deviceCredential;result.deviceCredential='';
    credentialField=$('#terminalCredential');credentialField.value=secret;
  }
  async function submit(){
    if(!allowed()||screen!=='terminal'||pending||!draft||!validTerminal(state.terminal)||state.terminal.apiId!==draft.id)return;
    const reason=$('#terminalRotationReason')?.value;
    if(!['normal_rotation','suspected_compromise'].includes(reason)||!$('#terminalRotationConfirm')?.checked){
      $('#terminalRotationFeedback').textContent='Odaberi razlog i potvrdi preuzimanje vjerodajnice.';return;
    }
    const attempt={...draft},attemptEpoch=epoch;
    pending=true;
    $('#modal').querySelectorAll('button,input,select').forEach(element=>{element.disabled=true;});
    $('#terminalRotationFeedback').textContent='Rotiram vjerodajnicu…';
    try{
      const result=await BSS_API.request(`/terminals/${encodeURIComponent(attempt.id)}/credentials/rotate`,{
        method:'POST',body:{reason},headers:{'If-Match':`"${attempt.revision}"`},retrySession:false
      });
      if(result?.terminal?.id!==attempt.id||!/^[1-9]\d*$/.test(String(result.terminal.revision))||typeof result.deviceCredential!=='string'||!result.deviceCredential
        ||!uuid.test(result.acknowledgementKey?.id||'')||!Number.isInteger(result.acknowledgementKey?.version)||result.acknowledgementKey.version<1){
        if(result)result.deviceCredential='';throw new Error('Nepotvrđen odgovor');
      }
      if(epoch!==attemptEpoch||!allowed()||screen!=='terminal'||state.terminal.apiId!==attempt.id){
        result.deviceCredential='';
        notices.set(attempt.id,'Rotacija je dovršena, ali jednokratni prikaz je zatvoren. Istu tajnu nije moguće ponovno dohvatiti; oporavak zahtijeva novu svjesno potvrđenu rotaciju.');
        return;
      }
      state.terminal.revision=result.terminal.revision;
      state.terminal.statusCode=result.terminal.status;
      notices.set(attempt.id,'Rotacija je provedena na poslužitelju. Siguran prijenos nove vjerodajnice na fizički terminal nije potvrđen.');
      showCredential(result);
    }catch(error){
      const message=error?.code==='STALE_REVISION'?'Terminal je u međuvremenu promijenjen. Osvježi pregled i ponovno provjeri razlog prije nove potvrde.':error?.status===401||error?.status===403?'Sesija je istekla ili nemaš ovlasti. Zahtjev nije automatski ponovljen.':error?.status===409?'Rotacija nije dopuštena za aktualno stanje terminala.':error?.status===429?'Previše zahtjeva. Pričekaj prije novog pokušaja.':!error?.status||error.status>=500?'Ishod rotacije nije poznat. Nova vjerodajnica možda već vrijedi i nije ju moguće ponovno dohvatiti. Osvježi stanje; oporavak zahtijeva novu izričito potvrđenu rotaciju.':'Rotacija nije prihvaćena. Provjeri terminal i unos.';
      notices.set(attempt.id,message);
      if(epoch===attemptEpoch){clear();await callbacks.refresh();if(allowed())toast(message);}
    }finally{pending=false;}
  }
  function reveal(){
    if(!allowed()||!secret||!credentialField?.isConnected)return;
    credentialField.type=credentialField.type==='password'?'text':'password';
    $('#terminalCredentialReveal').textContent=credentialField.type==='password'?'Prikaži tajnu':'Sakrij tajnu';
  }
  async function copy(){
    if(!allowed()||!secret||!credentialField?.isConnected)return;
    try{
      if(!root.navigator?.clipboard?.writeText)throw new Error('Clipboard unavailable');
      await root.navigator.clipboard.writeText(secret);
      const feedback=$('#terminalCredentialFeedback');if(feedback)feedback.textContent='Kopirano. Prenesi u siguran postupak za terminal i očisti međuspremnik nakon uporabe.';
    }catch{
      const feedback=$('#terminalCredentialFeedback');if(feedback)feedback.textContent='Kopiranje nije dostupno. Tajnu možeš svjesno prikazati i ručno preuzeti.';
    }
  }
  root.addEventListener?.('pagehide',clear);
  root.BSSTerminalCredential=Object.freeze({configure,controlsHtml,open,submit,changeReason,reveal,copy,clear});
})(globalThis);
