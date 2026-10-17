(function registerOnboarding(root){
  'use strict';
  const domain=typeof module==='object'&&module.exports?module.require('../domain/onboarding.js'):root.BSSCore.onboardingDomain;
  const templates=typeof module==='object'&&module.exports?module.require('../views/onboarding.js'):root.BSSCore.views.onboarding;
  const emptyDraft=()=>({step:'COMPANY_SETUP',reference:'',note:''});
  const empty=()=>({data:null,loaded:false,busy:false,denied:false,uncertain:false,needsReadback:false,error:'',notice:'',review:null,draft:emptyDraft()});
  const destinations=new Set(['company','departments','shifts','holidays','workers','import','roles','terminal']);
  function createController({api,context=()=>null,changed=()=>{},navigate=()=>{},goto=()=>{}}={}){
    let config={context,changed,navigate,goto},model=empty(),identity='',generation=0,controller=null,expectedId=null,expectedProfile=null,wasActive=false,routeActive=true;
    const allowed=()=>{const c=config.context();return Boolean(c?.logged&&c.api&&c.role==='admin'&&c.organizationId&&c.userId);};
    const active=()=>{const value=config.context()?.active;return typeof value==='boolean'?value:routeActive;};
    function reset(){controller?.abort();generation+=1;model=empty();}
    function syncIdentity(activeScreen){
      if(typeof activeScreen==='string')routeActive=activeScreen==='onboarding';
      const c=config.context(),next=allowed()?`${c.organizationId}:${c.userId}`:'',visible=allowed()&&active();
      if(next!==identity){reset();identity=next;expectedId=null;expectedProfile=null;}
      else if(wasActive&&!visible)reset();
      wasActive=visible;
    }
    function configure(value){config={...config,...value};syncIdentity();}
    function notify(focus=true){if(allowed()&&active())config.changed(focus);}
    function canSave(){
      if(!model.data||model.busy||model.needsReadback||model.denied||model.data.submittedEvidence.length>=100||!model.review)return false;
      try{return model.review===domain.stamp(model.data,model.draft);}catch{return false;}
    }
    function accept(value){
      const data=domain.validate(value);
      if(expectedId!==null&&data.id!==expectedId)throw new Error('Onboarding identity changed');
      if(expectedProfile!==null&&data.profile!==expectedProfile)throw new Error('Onboarding profile changed');
      expectedId=data.id;expectedProfile=data.profile;model.data=data;model.loaded=true;model.needsReadback=false;model.uncertain=false;model.review=null;model.draft=emptyDraft();
      if(Object.hasOwn(domain.steps,data.stage))model.draft.step=data.stage;
    }
    async function run(operation){
      syncIdentity();if(!allowed()||!active()||model.busy||model.denied)return;
      const version=generation;controller=new root.AbortController();model.busy=true;model.error='';model.notice='';notify();
      const current=()=>version===generation&&allowed()&&active();
      let mutation=false;
      const pending=()=>{mutation=true;};
      try{await operation(current,controller.signal,pending);}
      catch(error){if(current()){
        const denied=error?.status===401||error?.status===403;
        model={...empty(),loaded:true,busy:true,denied,needsReadback:true,
          uncertain:mutation&&(!error?.status||error.status>=500),error:domain.message(error)};
      }}finally{if(current()){model.busy=false;notify();}}
    }
    async function load(){
      await run(async(current,signal)=>{
        model.data=null;model.review=null;model.draft=emptyDraft();
        const data=await api.request('/onboarding',{signal});if(current())accept(data);
      });
    }
    function edit(field,value){
      syncIdentity();if(!allowed()||!active()||model.busy||!model.data||!Object.hasOwn(model.draft,field))return;
      const hadReview=Boolean(model.review);model.draft[field]=String(value);model.review=null;model.error='';model.notice='';
      if(hadReview)notify(false);
    }
    function review(value){
      syncIdentity();if(!allowed()||!active()||model.busy||!model.data)return;
      model.review=null;model.error='';
      if(value){try{
        const item=domain.evidence(model.draft);
        if(model.data.submittedEvidence.some(old=>old.step===item.step&&old.reference===item.reference))throw new Error('Ova je referenca za odabrani korak već spremljena. Provjerite postojeći zapis.');
        model.review=domain.stamp(model.data,model.draft);
      }catch(error){model.error=error.message;}}
      notify(false);
    }
    async function save(){
      syncIdentity();if(!allowed()||!active()||!canSave())return;
      const before=model.data,item=domain.evidence(model.draft);
      await run(async(current,signal,pending)=>{
        model.review=null;pending();
        const value=await api.request('/onboarding/evidence',{method:'PATCH',signal,
          headers:{'If-Match':`"${before.revision}"`},body:{configurationChecksum:before.configurationChecksum,items:[item]}});
        if(!current())return;
        domain.validate(value);
        if(value.id!==before.id||BigInt(value.revision)!==BigInt(before.revision)+1n)throw new Error('Mutation response mismatch');
        accept(value);model.notice='Referenca je spremljena kao nepotvrđena. Odobrenje rada uživo nije izdano.';
      });
    }
    async function evaluate(){
      syncIdentity();if(!allowed()||!active()||!model.data||model.needsReadback)return;
      const before=model.data;
      await run(async(current,signal,pending)=>{
        model.review=null;
        const fresh=await api.request('/onboarding',{signal});if(!current())return;
        domain.validate(fresh);
        if(fresh.id!==before.id)throw new Error('Onboarding identity changed');
        if(fresh.revision!==before.revision||fresh.configurationChecksum!==before.configurationChecksum){
          accept(fresh);model.notice='Stanje je promijenjeno. Pregledajte novi prikaz prije ponovne provjere preduvjeta.';return;
        }
        pending();const value=await api.request('/onboarding/evaluate',{method:'POST',signal,
          headers:{'If-Match':`"${fresh.revision}"`},body:{configurationChecksum:fresh.configurationChecksum}});
        if(!current())return;
        domain.validate(value);
        if(value.id!==before.id||BigInt(value.revision)!==BigInt(before.revision)+1n)throw new Error('Evaluation response mismatch');
        accept(value);model.notice='Provjera je zabilježena. Otvoreni blokeri ostaju; rad uživo nije odobren.';
      });
    }
    function action(name,value){
      syncIdentity();if(!allowed()||!active()||model.denied)return;
      const commands={load,save,evaluate,goto:()=>{if(!model.busy&&destinations.has(value))config.goto(value);}};
      if(Object.hasOwn(commands,name))return commands[name]();
    }
    function view(){
      syncIdentity();if(!allowed())return'<section class="card"><h2>Priprema nije dostupna</h2><p>Prijavite se kao administrator tvrtke.</p></section>';
      if(!model.loaded&&!model.busy){const version=generation;root.queueMicrotask(()=>{if(version===generation&&allowed()&&active()&&!model.loaded&&!model.busy)void load();});}
      return templates.render(model,canSave());
    }
    return Object.freeze({configure,syncIdentity,view,action,edit,review,snapshot:()=>model,open:()=>{syncIdentity();if(allowed())config.navigate('onboarding');}});
  }
  const instance=createController({api:root.BSSCore?.api});root.BSSOnboarding=instance;
  function input(event){
    const element=event.target;if(!element?.closest?.('.onboarding'))return;
    const field=element.dataset.onboardingInput;
    if(!['step','reference','note','reviewed'].includes(field))return;
    if((field==='reviewed'||field==='step')&&event.type!=='change')return;
    if(field!=='reviewed'&&field!=='step'&&event.type!=='input')return;
    const id=element.id,start=element.selectionStart,end=element.selectionEnd;
    if(field==='reviewed')instance.review(element.checked);else instance.edit(field,element.value);
    const replacement=root.document.getElementById(id);replacement?.focus();
    if(start!==null&&start!==undefined&&typeof replacement?.setSelectionRange==='function')replacement.setSelectionRange(start,end);
  }
  root.document?.addEventListener('input',input);root.document?.addEventListener('change',input);
  if(typeof module==='object'&&module.exports)module.exports={createController};
})(typeof globalThis==='object'?globalThis:window);
