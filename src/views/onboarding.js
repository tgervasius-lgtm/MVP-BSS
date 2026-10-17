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
  function stepCard(step,data,busy){
    const observed=prerequisite[step]&&data.softwarePrerequisites[prerequisite[step]];
    const status=observed?'Softverski preduvjet je uočen':'Potrebna je provjera';
    const blockers=data.blockers.filter(item=>item.step===step);
    const count=data.submittedEvidence.filter(item=>item.step===step).length;
    return `<li class="card onboarding-step"><h3>${escape(steps[step])}</h3><p class="onboarding-meta">${status} · Predane reference: ${count}</p>
      ${blockers.length?`<ul class="onboarding-blockers">${blockers.map(item=>`<li>${escape(item.message)}</li>`).join('')}</ul>`:'<p>Ovaj softverski sažetak nije potvrda korisničke konfiguracije ili spremnosti za rad uživo.</p>'}
      <div class="onboarding-actions">${routes[step].map(([key,label])=>button('goto',label,{value:key,secondary:true,disabled:busy})).join('')}</div></li>`;
  }
  function evidenceForm(model,canSave){
    const {data,draft}=model,full=data.submittedEvidence.length>=100,disabled=model.busy||full;
    return `<section class="card"><h2>Dodajte referencu pripreme</h2><p id="onboarding-private">Unesite samo oznaku iz odobrenog privatnog registra. Ne unosite lozinke, tokene, osobne dokumente ili nepotrebne osobne podatke. Datoteke se ovdje ne učitavaju, a poveznice se ne otvaraju.</p>
      ${full?'<p role="status">Dosegnuta je granica od 100 referenci. Za ispravak ili daljnji postupak obratite se ovlaštenoj podršci.</p>':''}
      <p>Nespremljeni unos briše se nakon osvježavanja, provjere preduvjeta ili izlaska iz ovog prikaza.</p>
      <fieldset class="onboarding-form" ${disabled?'disabled':''}><legend>Nova nepotvrđena referenca</legend>
        <label for="onboarding-step">Korak pripreme<select id="onboarding-step" data-onboarding-input="step">${Object.entries(steps).map(([key,label])=>`<option value="${key}" ${draft.step===key?'selected':''}>${escape(label)}</option>`).join('')}</select></label>
        <label for="onboarding-reference">Referenca (obavezno, najviše 500 znakova)<input id="onboarding-reference" data-onboarding-input="reference" maxlength="500" autocomplete="off" aria-describedby="onboarding-private" value="${escape(draft.reference)}"></label>
        <label for="onboarding-note">Napomena (neobavezno, najviše 1.000 znakova)<textarea id="onboarding-note" data-onboarding-input="note" maxlength="1000" autocomplete="off" rows="3">${escape(draft.note)}</textarea></label>
        <label class="onboarding-check" for="onboarding-reviewed"><input id="onboarding-reviewed" data-onboarding-input="reviewed" type="checkbox" ${model.review?'checked':''}>Pregledao/la sam aktualne postavke i navedenu referencu. Spremanje nije potvrda spremnosti.</label>
        ${button('save','Spremi nepotvrđenu referencu',{disabled:!canSave||disabled})}
      </fieldset></section>`;
  }
  function history(data){
    const items=data.submittedEvidence;
    return `<section class="card"><h2>Predane reference (${items.length}/100)</h2><p>Sve reference ostaju nepotvrđene. Promjena postavki može zahtijevati novu provjeru; raniji zapisi ostaju sačuvani.</p>
      ${items.length?`<ol class="onboarding-evidence">${items.map(item=>`<li><h3>${escape(steps[item.step])}</h3><p class="onboarding-reference">${escape(item.reference)}</p>
        ${item.note?`<p class="onboarding-note">${escape(item.note)}</p>`:''}<p><strong>${item.stale?'Postavke su promijenjene — potrebna nova provjera':'Nepotvrđena referenca'}</strong></p>
        <p class="onboarding-meta">Predao: ${escape(item.submittedBy)} · <time datetime="${escape(item.submittedAt)}">${escape(new Date(item.submittedAt).toLocaleString('hr-HR'))}</time></p></li>`).join('')}</ol>`:'<p>Još nema predanih referenci.</p>'}</section>`;
  }
  function render(model,canSave=false){
    const {data,busy}=model;
    const header=`<div class="section-title"><div><h1>Priprema tvrtke</h1><p>Pregledajte postavke, otvorene korake i spremljene reference.</p></div>${button('load','Provjeri spremljeno stanje',{disabled:busy||model.denied,secondary:true})}</div>`;
    const alerts=`${model.error?`<p class="notice warning" role="alert">${escape(model.error)}</p>`:''}${model.notice?`<p class="notice info" role="status">${escape(model.notice)}</p>`:''}`;
    if(!data)return `<div class="onboarding" aria-busy="${busy}">${header}${alerts}<section class="card"><h2 id="onboarding-status" tabindex="-1">${model.uncertain?'Rezultat još nije potvrđen':'Status pripreme'}</h2><p>${busy?'Dohvaćanje spremljenog stanja…':'Provjerite spremljeno stanje kako biste nastavili. Ponavljanje unosa ne pokreće se automatski.'}</p></section></div>`;
    const next=steps[data.stage]||steps.COMPANY_SETUP;
    return `<div class="onboarding" aria-busy="${busy}">${header}${alerts}
      <section class="card"><h2 id="onboarding-status" tabindex="-1">Rad uživo nije odobren</h2><p>Profil: <strong>${escape(profiles[data.profile])}</strong> · Revizija ${escape(data.revision)}</p><p>Sljedeći korak: <strong>${escape(next)}</strong></p>
        <p>Predane reference i zabilježena provjera ne daju odobrenje za rad uživo. Nedostaju zasebna provjera ovlasti, neovisni probni rad i primjenjivi operativni dokazi.</p>
        <p>${data.revalidationRequired?'Aktualne postavke treba ponovno provjeriti.':'Zabilježena provjera odgovara očitanim postavkama; otvoreni blokeri i dalje vrijede.'}</p>
        ${data.evaluatedAt?`<p class="onboarding-meta">Posljednja zabilježena provjera: <time datetime="${escape(data.evaluatedAt)}">${escape(new Date(data.evaluatedAt).toLocaleString('hr-HR'))}</time></p>`:''}
        ${button('evaluate','Ponovno provjeri preduvjete',{disabled:busy})}</section>
      <section aria-labelledby="onboarding-steps-title"><h2 id="onboarding-steps-title">Koraci i otvoreni blokeri</h2><ol class="onboarding-steps">${Object.keys(steps).map(step=>stepCard(step,data,busy)).join('')}</ol></section>
      ${evidenceForm(model,canSave)}${history(data)}</div>`;
  }
  const view=Object.freeze({render,escape});
  root.BSSCore=Object.freeze({...root.BSSCore,views:Object.freeze({...root.BSSCore?.views,onboarding:view})});
  if(typeof module==='object'&&module.exports)module.exports=view;
})(typeof globalThis==='object'?globalThis:window);
