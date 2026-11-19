(function registerCoveredLeave(root){
  'use strict';

  let callbacks,submission;
  function configure(config){callbacks=config;}
  function clear(){submission=undefined;}

  async function submit({startDate,endDate,note},workerId){
    const fingerprint=JSON.stringify([callbacks.context().epoch,workerId,startDate,endDate,note]);
    if(submission?.fingerprint!==fingerprint){
      submission={fingerprint,key:root.crypto.randomUUID()};
    }
    const result=await callbacks.api.post('/leave-requests/covered-dates',{startDate,endDate,note},{'Idempotency-Key':submission.key});
    clear();
    return result;
  }

  async function openCoveredLeave(id,previousCard){
    const {enabled,role,epoch}=callbacks.context();
    if(!enabled||!['worker','manager','admin'].includes(role))return;
    const request=callbacks.request(id);
    if(!request)return;
    const modal=root.document.querySelector('#modal'),view=callbacks.view;
    if(!previousCard)modal.innerHTML=view.coveredLeaveFrame();
    const card=modal.querySelector('.covered-leave-card');
    const renderBody=html=>{card.querySelector('.covered-leave-content').innerHTML=html;};
    renderBody('<p role="status">Učitavanje datuma…</p>');
    if(!previousCard)root.showModal(modal);
    const sessionActive=()=>{
      const current=callbacks.context();
      return current.logged&&epoch===current.epoch&&role===current.role;
    };
    const active=()=>sessionActive()&&card===root.document.querySelector('#modal.open .covered-leave-card');
    const path=`/leave-requests/${request.apiId}/covered-dates`;
    try{
      const decision=await callbacks.api.get(path);
      if(!active())return;
      renderBody(view.coveredLeaveDecision({decision,request,worker:role==='worker',workerName:callbacks.workerName(request.workerId),...callbacks.format}));
      const limits=new Map(decision.years.map(year=>[String(year.year),year.reservedDays]));
      const apply=card.querySelector('[data-covered-apply]'),reject=card.querySelector('[data-covered-reject]');
      const selected=()=>[...card.querySelectorAll('input:checked')].map(input=>({date:input.value,type:'annual_leave'}));
      function updateSelection(){
        if(!apply||role!=='worker')return;
        const dates=selected(),remaining=new Map(limits);
        let over=false;
        for(const {date} of dates){
          const year=date.slice(0,4),left=(remaining.get(year)??0)-1;
          remaining.set(year,left);
          over||=left<0;
        }
        apply.disabled=!dates.length||over;
        card.querySelector('[data-covered-count]').textContent=over?'Odabir prelazi rezervaciju za pojedinu godinu.':`Odabrano: ${dates.length}.`;
      }
      card.querySelector('.covered-leave-content').onchange=updateSelection;
      updateSelection();
      async function save(action,body){
        if(!active()||callbacks.loading())return;
        callbacks.setLoading(true);
        const errorMessage=card.querySelector('[data-covered-error]');
        errorMessage.hidden=true;
        if(apply)apply.disabled=true;
        if(reject)reject.disabled=true;
        try{
          const target=action==='reject'?`/leave-requests/${request.apiId}/reject`:`${path}/${action}`;
          await callbacks.api.post(target,body,callbacks.revisionHeaders(decision.revision));
          if(sessionActive()){
            if(active())root.closeModal();
            await callbacks.refreshApi({confirm:'Datumi su potvrđeni. Zahtjev čeka odluku.',approve:'Potvrđeni datumi su odobreni.',reject:'Zahtjev je odbijen.'}[action]);
          }
        }catch(error){
          if(active()&&error?.code==='STALE_REVISION'){
            renderBody(view.coveredLeaveReload(id,'Zahtjev je izmijenjen tijekom pregleda.',callbacks.format.escapeHtml));
            card.querySelector('[data-bss-action^="coveredLeaveAction"]').focus();
          }else if(active()){
            errorMessage.textContent=callbacks.apiMessage(error);
            errorMessage.hidden=false;
            if(reject)reject.disabled=false;
            if(apply)apply.disabled=false;
            updateSelection();
          }
        }finally{callbacks.setLoading(false);}
      }
      if(apply)apply.onclick=()=>role==='worker'?save('confirm',{dates:selected()}):save('approve');
      if(reject)reject.onclick=()=>{
        const note=card.querySelector('textarea').value.trim();
        if(note)save('reject',{note});
        else{
          const error=card.querySelector('[data-covered-error]');
          error.textContent='Upiši razlog odbijanja.';error.hidden=false;
        }
      };
    }catch(error){
      if(active())renderBody(view.coveredLeaveReload(id,callbacks.apiMessage(error),callbacks.format.escapeHtml));
    }
  }
  function coveredLeaveAction(action,id){
    const card=root.document.querySelector('#modal.open .covered-leave-card');
    if(action==='open'||(action==='reload'&&card))return openCoveredLeave(id,action==='reload'?card:null);
  }

  root.BSSCoveredLeave=Object.freeze({configure,clear,submit,action:coveredLeaveAction});
})(window);
