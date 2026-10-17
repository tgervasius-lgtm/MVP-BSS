(function registerOnboardingView(root){
  'use strict';
  const domain=typeof module==='object'&&module.exports?module.require('../domain/onboarding.js'):root.BSSCore.onboardingDomain;
  const {steps,profiles}=domain;
  const escape=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const routes={COMPANY_SETUP:[['company','Podaci tvrtke'],['departments','Odjeli'],['shifts','Smjene'],['holidays','Neradni dani']],PEOPLE_IMPORT:[['workers','Popis radnika'],['import','Uvezi radnike']],ACCESS_SETUP:[['roles','Prava pristupa']],TERMINAL_SETUP:[['terminal','Terminali i kartice']],DRY_RUN:[]};
  const prerequisite={COMPANY_SETUP:'company',PEOPLE_IMPORT:'people',ACCESS_SETUP:'access',TERMINAL_SETUP:'terminal'};
  function button(action,label,{disabled=false,value,secondary=false}={}){
    const argument=value===undefined?'':",'"+escape(value)+"'";
    return `<button type="button" class="btn${secondary?' secondary':''}" data-bss-action="onboardingAction('${action}'${argument})" ${disabled?'disabled':''}>${escape(label)}</button>`;
  }
  function blockerList(items){
    const rows=items.map(item=>`<li>${escape(item.message)}</li>`).join('');
    return `<ul class="onboarding-blockers">${rows}</ul>`;
  }
  function timestamp(value){
    return `<time datetime="${escape(value)}">${escape(new Date(value).toLocaleString('hr-HR'))}</time>`;
  }
  function alert(text,tone,role){
    return text?`<p class="notice ${tone}" role="${role}">${escape(text)}</p>`:'';
  }
  function stepCard(step,data,busy){
    const observed=prerequisite[step]&&data.softwarePrerequisites[prerequisite[step]];
    const status=observed?'Softverski preduvjet je uočen':'Potrebna je provjera';
    const blockers=data.blockers.filter(item=>item.step===step);
    const count=data.submittedEvidence.filter(item=>item.step===step).length;
    const content=blockers.length?blockerList(blockers):'<p>Ovaj softverski sažetak nije potvrda korisničke konfiguracije ili spremnosti za rad uživo.</p>';
    const actions=routes[step].map(([key,label])=>button('goto',label,{value:key,secondary:true,disabled:busy})).join('');
    return `<li class="card onboarding-step"><h3>${escape(steps[step])}</h3><p class="onboarding-meta">${status} · Predane reference: ${count}</p>
      ${content}<div class="onboarding-actions">${actions}</div></li>`;
  }
  function evidenceForm(model,canSave){
    const {data,draft}=model,full=data.submittedEvidence.length>=100,disabled=model.busy||full;
    const options=Object.entries(steps).map(([key,label])=>`<option value="${key}" ${draft.step===key?'selected':''}>${escape(label)}</option>`).join('');
    return `<section class="card"><h2>Dodajte referencu pripreme</h2><p id="onboarding-private">Unesite samo oznaku iz odobrenog privatnog registra. Ne unosite lozinke, tokene, osobne dokumente ili nepotrebne osobne podatke. Datoteke se ovdje ne učitavaju, a poveznice se ne otvaraju.</p>
      ${full?'<p role="status">Dosegnuta je granica od 100 referenci. Za ispravak ili daljnji postupak obratite se ovlaštenoj podršci.</p>':''}
      <p>Nespremljeni unos briše se nakon osvježavanja, provjere preduvjeta ili izlaska iz ovog prikaza.</p>
      <fieldset class="onboarding-form" ${disabled?'disabled':''}><legend>Nova nepotvrđena referenca</legend>
        <label for="onboarding-step">Korak pripreme<select id="onboarding-step" data-onboarding-input="step">${options}</select></label>
        <label for="onboarding-reference">Referenca (obavezno, najviše 500 znakova)<input id="onboarding-reference" data-onboarding-input="reference" maxlength="500" autocomplete="off" aria-describedby="onboarding-private" value="${escape(draft.reference)}"></label>
        <label for="onboarding-note">Napomena (neobavezno, najviše 1.000 znakova)<textarea id="onboarding-note" data-onboarding-input="note" maxlength="1000" autocomplete="off" rows="3">${escape(draft.note)}</textarea></label>
        <label class="onboarding-check" for="onboarding-reviewed"><input id="onboarding-reviewed" data-onboarding-input="reviewed" type="checkbox" ${model.review?'checked':''}>Pregledao/la sam aktualne postavke i navedenu referencu. Spremanje nije potvrda spremnosti.</label>
        ${button('save','Spremi nepotvrđenu referencu',{disabled:!canSave||disabled})}
      </fieldset></section>`;
  }
  function evidenceItem(item){
    const note=item.note?`<p class="onboarding-note">${escape(item.note)}</p>`:'';
    const status=item.stale?'Postavke su promijenjene — potrebna nova provjera':'Nepotvrđena referenca';
    return `<li><h3>${escape(steps[item.step])}</h3><p class="onboarding-reference">${escape(item.reference)}</p>
      ${note}<p><strong>${status}</strong></p><p class="onboarding-meta">Predao: ${escape(item.submittedBy)} · ${timestamp(item.submittedAt)}</p></li>`;
  }
  function history(data){
    const items=data.submittedEvidence;
    const content=items.length?'<ol class="onboarding-evidence">'+items.map(evidenceItem).join('')+'</ol>':'<p>Još nema predanih referenci.</p>';
    return `<section class="card"><h2>Predane reference (${items.length}/100)</h2><p>Sve reference ostaju nepotvrđene. Promjena postavki može zahtijevati novu provjeru; raniji zapisi ostaju sačuvani.</p>
      ${content}</section>`;
  }
  function render(model,canSave=false){
    const {data,busy}=model;
    const header=`<div class="section-title"><div><h1>Priprema tvrtke</h1><p>Pregledajte postavke, otvorene korake i spremljene reference.</p></div>${button('load','Provjeri spremljeno stanje',{disabled:busy||model.denied,secondary:true})}</div>`;
    const alerts=alert(model.error,'warning','alert')+alert(model.notice,'info','status');
    if(!data)return `<div class="onboarding" aria-busy="${busy}">${header}${alerts}<section class="card"><h2 id="onboarding-status" tabindex="-1">${model.uncertain?'Rezultat još nije potvrđen':'Status pripreme'}</h2><p>${busy?'Dohvaćanje spremljenog stanja…':'Provjerite spremljeno stanje kako biste nastavili. Ponavljanje unosa ne pokreće se automatski.'}</p></section></div>`;
    const next=steps[data.stage]||steps.COMPANY_SETUP;
    const evaluated=data.evaluatedAt?'<p class="onboarding-meta">Posljednja zabilježena provjera: '+timestamp(data.evaluatedAt)+'</p>':'';
    return `<div class="onboarding" aria-busy="${busy}">${header}${alerts}
      <section class="card"><h2 id="onboarding-status" tabindex="-1">Rad uživo nije odobren</h2><p>Profil: <strong>${escape(profiles[data.profile])}</strong> · Revizija ${escape(data.revision)}</p><p>Sljedeći korak: <strong>${escape(next)}</strong></p>
        <p>Predane reference i zabilježena provjera ne daju odobrenje za rad uživo. Nedostaju zasebna provjera ovlasti, neovisni probni rad i primjenjivi operativni dokazi.</p>
        <p>${data.revalidationRequired?'Aktualne postavke treba ponovno provjeriti.':'Zabilježena provjera odgovara očitanim postavkama; otvoreni blokeri i dalje vrijede.'}</p>
        ${evaluated}
        ${button('evaluate','Ponovno provjeri preduvjete',{disabled:busy})}</section>
      <section aria-labelledby="onboarding-steps-title"><h2 id="onboarding-steps-title">Koraci i otvoreni blokeri</h2><ol class="onboarding-steps">${Object.keys(steps).map(step=>stepCard(step,data,busy)).join('')}</ol></section>
      ${evidenceForm(model,canSave)}${history(data)}</div>`;
  }
  const view=Object.freeze({render,escape});
  root.BSSCore=Object.freeze({...root.BSSCore,views:Object.freeze({...root.BSSCore?.views,onboarding:view})});
  if(typeof module==='object'&&module.exports)module.exports=view;
})(typeof globalThis==='object'?globalThis:window);
