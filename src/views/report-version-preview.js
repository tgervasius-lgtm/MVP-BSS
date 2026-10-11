(function reportVersionPreview(){
  'use strict';
  // Synthetic UX review only: no API, file creation, authentication or storage.
  const versions=[
    {id:'sample-v2',label:'Verzija 2 · zaključano 8.10.2026. u 14:20',detail:'Nakon odobrenih korekcija. Najnovija ogledna verzija.'},
    {id:'sample-v1',label:'Verzija 1 · zaključano 2.10.2026. u 09:15',detail:'Raniji obračun, prije ponovnog otvaranja mjeseca.'}
  ];
  const element=id=>document.getElementById(id);
  const version=element('version'),scenario=element('scenario'),prepare=element('prepare');
  let source='current';
  function hideConfirmation(){element('confirmation').hidden=true;}
  function render(){
    element('version-panel').hidden=source!=='locked';
    const selected=versions.find(item=>item.id===version.value);
    let text='Izvoz će koristiti trenutačne podatke. Nije zaključani obračun.';
    let ready=true;
    if(source==='locked'){
      ready=scenario.value==='ready'&&Boolean(selected);
      const unavailable={empty:'Za ovaj mjesec nema zaključane verzije. Zaključani izvoz nije dostupan.',error:'Verzije nije moguće dohvatiti. Izvoz je blokiran dok se odabrani izvor ne potvrdi.',gone:'Odabrana verzija nije dostupna. Ponovno dohvatite verzije i odaberite izvor.'};
      text=unavailable[scenario.value]||'Odaberite verziju. Nijedna verzija nije automatski potvrđena.';
      if(ready)text=selected.label+'. '+selected.detail+' Izvoz koristi tu verziju, uključujući ako su trenutačni podaci poslije izmijenjeni.';
    }
    element('summary').textContent=text;
    element('summary').className='notice';
    prepare.disabled=!ready;
    version.disabled=scenario.value!=='ready';
    hideConfirmation();
  }
  function resetOptions(){
    version.replaceChildren(new Option('Odaberite verziju…',''));
    if(scenario.value==='ready')versions.forEach(item=>version.add(new Option(item.label,item.id)));
    render();
  }
  document.querySelectorAll('input[name="source"]').forEach(input=>input.addEventListener('change',()=>{source=input.value;version.value='';render();}));
  version.addEventListener('change',render);
  scenario.addEventListener('change',resetOptions);
  element('format').addEventListener('change',hideConfirmation);
  prepare.addEventListener('click',()=>{
    if(prepare.disabled)return;
    const selected=versions.find(item=>item.id===version.value);
    const locked=source==='locked';
    if(locked&&(scenario.value!=='ready'||!selected))return;
    element('confirmation-copy').textContent=`Mjesečni sažetak · rujan 2026. · svi odjeli · ${element('format').value}. Izvor: ${locked?selected.label:'Trenutačni podaci, bez zaključane verzije'}.`;
    element('confirmation').hidden=false;
    element('confirmation').focus();
  });
  element('back').addEventListener('click',()=>{hideConfirmation();prepare.focus();});
  element('theme').addEventListener('click',()=>{
    const dark=document.documentElement.dataset.theme!=='dark';
    document.documentElement.dataset.theme=dark?'dark':'light';
    element('theme').textContent=dark?'Svijetla tema':'Tamna tema';
  });
  resetOptions();
})();
