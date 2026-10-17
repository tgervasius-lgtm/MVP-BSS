(function registerOnboardingDomain(root){
  'use strict';
  const steps=Object.freeze({COMPANY_SETUP:'Tvrtka i radni kalendar',PEOPLE_IMPORT:'Radnici',ACCESS_SETUP:'Korisnici i pristup',TERMINAL_SETUP:'Terminal i RFID',DRY_RUN:'Probni rad i završne provjere'});
  const profiles=Object.freeze({DEMO:'Demo',INTERNAL:'Interni',PILOT:'Pilot',PRODUCTION:'Produkcija'});
  const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
  const hash=/^[a-f0-9]{64}$/;
  const text=(value,max,min=0)=>typeof value==='string'&&[...value].length>=min&&[...value].length<=max;
  const date=value=>text(value,60,1)&&Number.isFinite(Date.parse(value));
  const controls=(value,multiline=false)=>[...value].some(char=>{
    const code=char.codePointAt(0);return code===127||(code<32&&!(multiline&&[9,10,13].includes(code)));
  });
  function invalid(){throw new Error('Status pripreme nije potpun. Ponovno provjerite stanje; unos nije omogućen.');}
  function validate(data){
    if(!data||!uuid.test(data.id)||!text(data.revision,19,1)||!/^[1-9]\d{0,18}$/.test(data.revision)
      ||!Object.hasOwn(profiles,data.profile)||data.contractVersion!=='BSS-v1.0'
      ||(data.stage!=='DRAFT'&&!Object.hasOwn(steps,data.stage))||!hash.test(data.configurationChecksum)
      ||data.readyForGoLive!==false||data.goLiveApproved!==false||typeof data.revalidationRequired!=='boolean')invalid();
    if((data.evaluatedConfigurationChecksum!==null&&!hash.test(data.evaluatedConfigurationChecksum))
      ||(data.evaluatedAt!==null&&!date(data.evaluatedAt)))invalid();
    if(!data.softwarePrerequisites||['company','people','access','terminal'].some(key=>typeof data.softwarePrerequisites[key]!=='boolean'))invalid();
    if(!Array.isArray(data.blockers)||data.blockers.length<1||data.blockers.length>30)invalid();
    for(const item of data.blockers){
      if(!item||!Object.hasOwn(steps,item.step)||!text(item.code,100,1)||!text(item.message,1000,1))invalid();
    }
    if(!Array.isArray(data.submittedEvidence)||data.submittedEvidence.length>100)invalid();
    const ids=new Set();
    for(const item of data.submittedEvidence){
      if(!item||!uuid.test(item.id)||ids.has(item.id)||!uuid.test(item.submittedBy)||!date(item.submittedAt)
        ||!Object.hasOwn(steps,item.step)||!text(item.reference,500,1)||controls(item.reference)
        ||(item.note!==undefined&&(!text(item.note,1000)||controls(item.note,true)))
        ||!hash.test(item.configurationChecksum)||item.verification!=='UNVERIFIED'||typeof item.stale!=='boolean')invalid();
      ids.add(item.id);
    }
    return data;
  }
  function evidence(draft){
    const item={step:draft.step,reference:String(draft.reference||'').trim(),note:String(draft.note||'').trim()};
    if(!Object.hasOwn(steps,item.step)||!text(item.reference,500,1)||controls(item.reference)||!text(item.note,1000)||controls(item.note,true)){
      throw new Error('Odaberite korak i unesite referencu do 500 znakova te napomenu do 1.000 znakova, bez nedopuštenih kontrolnih znakova.');
    }
    return item;
  }
  function stamp(data,draft){return JSON.stringify([data.id,data.revision,data.configurationChecksum,evidence(draft)]);}
  function message(error){
    if(error?.status===401)return'Sesija je istekla. Ponovno se prijavite i provjerite spremljeno stanje.';
    if(error?.status===403)return'Prikaz pripreme dostupan je samo administratoru tvrtke.';
    if(error?.status===404)return'Priprema za ovu tvrtku i profil nije dostupna. Obratite se ovlaštenoj BSS podršci.';
    if(error?.status===409)return'Postavke ili revizija su se promijenile. Ponovno dohvatite i pregledajte stanje prije novog unosa.';
    if(error?.status===429)return'Previše zahtjeva. Pričekajte jednu minutu pa provjerite spremljeno stanje.';
    if(error?.status===503)return'Priprema trenutačno nije dostupna ili nije aktivirana. Pričekajte jednu minutu pa ponovno provjerite.';
    if(error?.status===400||error?.status===422)return'Zahtjev nije prihvaćen. Provjerite spremljeno stanje prije novog unosa.';
    return'Nije moguće potvrditi rezultat zahtjeva. Provjerite spremljeno stanje prije novog unosa.';
  }
  const domain=Object.freeze({steps,profiles,validate,evidence,stamp,message});
  root.BSSCore=Object.freeze({...root.BSSCore,onboardingDomain:domain});
  if(typeof module==='object'&&module.exports)module.exports=domain;
})(typeof globalThis==='object'?globalThis:window);
