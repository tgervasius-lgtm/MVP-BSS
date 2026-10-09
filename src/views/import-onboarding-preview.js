(function importOnboardingPreview(root){
  'use strict';
  // UX-only fixture controller. Never reads files, calls APIs, stores data or mutates the app.
  const fields=[['code','Šifra radnika'],['name','Ime i prezime'],['email','E-mail (neobavezno)'],['department','Odjel'],['shift','Smjena'],['annualLeaveAllowance','Dani godišnjeg odmora']];
  const headers=['Broj','Radnik','Kontakt','Tim','Raspored','Godišnji'];
  const rows=[
    ['UX-001','Ogledni radnik A','radnik.a@example.invalid','Skladište','Jutarnja','24'],
    ['UX-002','Ogledni radnik B','','Skladište','Jutarnja','20'],
    ['UX-003','Ogledni radnik C','radnik.c@example.invalid','Skladište','Jutarnja','22']
  ];
  const scenarios=[['valid','Ispravan popis'],['invalid','Duplikat i neispravan godišnji'],['expired','Istek pripreme'],['stale','Promijenjen pregled'],['uncertain','Prekid nakon potvrde']];
  const stages=['Odabir','Povezivanje','Pregled','Potvrda'];
  const button=(action,label,primary=false,disabled=false)=>`<button type="button" data-action="${action}" class="${primary?'primary':''}" ${disabled?'disabled':''}>${label}</button>`;
  const escape=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const message=(heading,body,type='')=>`<div class="preview-message ${type}"><strong>${heading}</strong><p>${body}</p></div>`;

  function mount(document){
    const content=document.getElementById('preview-content');
    if(!content)return;
    const model={view:'import',step:0,scenario:'valid',format:'',status:'select',mapping:{},department:'',shift:'',approval:false,revision:1,completed:false,onlyErrors:false};
    const announcement=document.getElementById('preview-announcement');

    function selector(id,label,options,value=''){
      return `<div><label for="${id}">${label}</label><select id="${id}"><option value="">Odaberite…</option>${options.map(([key,text])=>`<option value="${escape(key)}" ${value===String(key)?'selected':''}>${escape(text)}</option>`).join('')}</select></div>`;
    }
    function actions(html){return `<div class="preview-actions">${html}</div>`;}
    function sampleTable(full=false){
      return `<div class="preview-table-wrap" tabindex="0" role="region" aria-label="Ogledni izvorni podaci"><table><caption>Izvorni stupci · ogledni podaci</caption><thead><tr>${headers.map(header=>`<th scope="col">${header}</th>`).join('')}</tr></thead><tbody>${(full?previewRows().map(item=>item.row):rows.slice(0,2)).map(row=>`<tr>${row.map(value=>`<td>${escape(value||'—')}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
    }
    function selectScreen(){
      return `<h2>1. Odaberite popis radnika</h2><p>CSV ili Excel (.xlsx), najviše 1.000 radnika i 1 MiB. Uvoz dodaje nove radnike; postojeće ne mijenja.</p>
        <div class="preview-choice"><strong>Pregled s oglednom datotekom</strong><p class="preview-muted">Pravi odabir datoteke bit će dostupan nakon aktivacije. Za pregled koristite ove sintetičke primjere.</p>${button('csv','Pregledaj ogledni CSV',true)}${button('xlsx','Pregledaj ogledni Excel')}</div>
        <details><summary>Koje podatke pripremiti?</summary><ul><li>Šifra radnika, ime i prezime, odjel, smjena i broj dana godišnjeg odmora.</li><li>E-mail je neobavezan. Odjeli i smjene moraju već postojati.</li><li>Bez lozinki, OIB-a, RFID podataka i povijesne evidencije.</li><li>Uvoz ne stvara korisničke račune niti šalje pozivnice.</li></ul><p>U budućem postupku privremeni podaci istječu nakon 24 sata te se uklanjaju nakon uvoza ili otkazivanja. Prije stvarnog učitavanja prikazat će se odobrena obavijest o obradi i zadržavanju podataka, uključujući sigurnosne kopije.</p></details>`;
    }
    function parsingScreen(){
      return `<h2>Čitanje datoteke</h2>${message('Obrada je u tijeku','Još nije unesen ni jedan radnik. U stvarnom postupku rezultat obrade prikazat će se automatski.')}${actions(button('parsed','Prikaži ogledni rezultat obrade',true)+button('cancelAsk','Otkaži pripremu'))}`;
    }
    function mappingComplete(){
      const values=fields.map(([key])=>model.mapping[key]);
      return values.every(Boolean)&&new Set(values).size===fields.length&&Boolean(model.department)&&Boolean(model.shift);
    }
    function mappingScreen(){
      const columns=headers.map((header,index)=>[String(index+1),`${index+1}. ${header}`]);
      return `<h2>2. Povežite stupce i vrijednosti</h2><p>Svaki stupac povežite jednom. Vrijednosti iz popisa pridružite postojećem odjelu i smjeni, bez automatskih zamjena.</p>${sampleTable()}
        <div class="preview-form preview-pair">${fields.map(([key,label])=>selector(`map-${key}`,label,columns,model.mapping[key])).join('')}</div>
        <h3>Odjel i smjena iz datoteke</h3><div class="preview-form preview-pair">${selector('map-department-value','Skladište → postojeći odjel',[['demo-department','Skladište (aktivan)']],model.department)}${selector('map-shift-value','Jutarnja → postojeća smjena',[['demo-shift','Jutarnja · 06:00–14:00 (aktivna)']],model.shift)}</div>
        <p id="mapping-guidance" class="preview-muted">Za nastavak povežite svih šest oglednih stupaca, odjel i smjenu. E-mail može biti prazan; ovaj ogledni popis sadrži njegov stupac.</p>${actions(button('validate','Provjeri cijeli popis',true,!mappingComplete())+button('cancelAsk','Otkaži pripremu'))}`;
    }
    function previewRows(){
      const shown=rows.map(row=>[...row]);
      if(model.scenario==='invalid'){shown[1][0]='UX-001';shown[2][5]='dvadeset';}
      return shown.map((row,index)=>{
        const errors=[];
        if(model.scenario==='invalid'&&index<2)errors.push('Šifra: duplikat u datoteci. Upišite jedinstvenu šifru.');
        if(model.scenario==='invalid'&&index===2)errors.push('Godišnji: unesite cijeli broj od 0 do 366.');
        return {row,index,errors};
      });
    }
    function counts(){return model.scenario==='invalid'?{total:3,valid:0,blocked:3}:{total:3,valid:3,blocked:0};}
    function summary(){
      const count=counts();
      return `<div class="preview-summary"><div><strong>${count.total}</strong><span>Ukupno radnika</span></div><div><strong>${count.valid}</strong><span>Za dodavanje</span></div><div><strong>${count.blocked}</strong><span>S pogreškama</span></div></div>`;
    }
    function errorRows(){
      return previewRows().filter(item=>!model.onlyErrors||item.errors.length).map(({row,index,errors})=>`<tr><td data-label="Redak">${index+2}</td><td data-label="Radnik">${escape(row[0])}<small>${escape(row[1])}</small></td><td data-label="Odjel i smjena">${escape(row[3])}<small>${escape(row[4])}</small></td><td data-label="Godišnji">${escape(row[5])}</td><td data-label="Rezultat provjere">${errors.length?errors.map(error=>`<span class="preview-error">${escape(error)}</span>`).join('<br>'):'Za dodavanje'}</td></tr>`).join('');
    }
    function reviewScreen(){
      const invalid=model.scenario==='invalid';
      const warning=invalid?message('Uvoz je blokiran','Ispravite izvorni popis i učitajte ga ponovno. Ni jedan radnik neće se unijeti dok cijeli popis nije ispravan.','danger'):message('Popis je spreman za pregled','Podaci još nisu uneseni. Prije potvrde provjerite šifre, odjel, smjenu i godišnji.');
      return `<h2>3. Pregledajte cijeli popis</h2>${summary()}${warning}<p class="preview-muted">Prikaz: 3 od 3 retka · redak 1 je zaglavlje · ogledni pregled ${model.revision}</p>
        <label class="preview-check"><input id="errors-only" type="checkbox" ${model.onlyErrors?'checked':''}>Prikaži samo retke s pogreškama</label>
        <div class="preview-table-wrap" tabindex="0" role="region" aria-label="Pregled radnika i pogrešaka"><table class="preview-review-table"><caption>Provjera oglednih podataka</caption><thead><tr><th scope="col">Redak</th><th scope="col">Radnik</th><th scope="col">Odjel i smjena</th><th scope="col">Godišnji</th><th scope="col">Rezultat provjere</th></tr></thead><tbody>${errorRows()||'<tr><td colspan="5">Nema redaka s pogreškama.</td></tr>'}</tbody></table></div>
        <details><summary>Prikaži sve ogledne vrijednosti</summary>${sampleTable(true)}</details>
        ${actions(button('approve','Nastavi na potvrdu',true,invalid)+button('mapping','Promijeni povezivanje')+button('replace','Ponovno odaberi popis')+button('cancelAsk','Otkaži pripremu'))}`;
    }
    function approvalScreen(){
      return `<h2>4. Potvrdite dodavanje radnika</h2>${summary()}<p>U budućem postupku dodat će se sva 3 radnika ili ni jedan. Postojeći radnici, korisnički računi i RFID kartice ostaju izvan ovog uvoza.</p>
        <p><strong>Ogledni odjel:</strong> Skladište<br><strong>Ogledna smjena:</strong> Jutarnja · 06:00–14:00</p>
        <label class="preview-check"><input id="approve-import" type="checkbox" ${model.approval?'checked':''}>Provjerio/la sam cijeli popis i odobravam dodavanje svih 3 ogledna radnika.</label>
        <p class="preview-muted">Gumb simulira rezultat. Ne stvara radnike. U stvarnom postupku promjena pregleda ili podataka tražit će novu provjeru i potvrdu.</p>${actions(button('commit','Prikaži ogledni rezultat uvoza',true,!model.approval)+button('review','Natrag na pregled')+button('cancelAsk','Otkaži pripremu'))}`;
    }
    function terminalScreen(){
      const messages={
        expired:['Priprema je istekla','Privremeni pregled više nije dostupan. Učitavanje treba ponoviti; ovaj postupak nije unio radnike.'],
        cancelled:['Priprema je otkazana','Privremeni podaci više nisu dostupni. Otkazivanje prije potvrde ne mijenja radnike.'],
        stale:['Pregled se promijenio','Potvrda nije prihvaćena. Ponovno pregledajte podatke i izričito potvrdite aktualni popis.'],
        uncertain:['Rezultat još nije potvrđen','Veza je prekinuta nakon potvrde. Uvoz je možda uspio. Nemojte pokretati novi uvoz; najprije provjerite rezultat ovog postupka.']
      };
      const [heading,body]=messages[model.status];
      let next=button('replace','Počni novi ogledni pregled',true);
      if(model.status==='stale')next=button('refresh','Ponovno pregledaj aktualni popis',true);
      if(model.status==='uncertain')next=button('readback','Provjeri ogledni rezultat',true);
      return `<h2>${heading}</h2>${message(heading,body,model.status==='cancelled'?'':'danger')}${actions(next)}`;
    }
    function resultScreen(){
      return `<h2>Ogledni rezultat: 3 radnika dodana</h2>${message('Simulacija završena','Ovo je prikaz buduće potvrde uspješnog uvoza. Stvarni popis radnika ostaje nepromijenjen.','success')}<dl><dt>Ogledna oznaka postupka</dt><dd>UX-IMPORT-001</dd><dt>Rezultat</dt><dd>3 od 3 · bez djelomičnog uvoza</dd></dl><p>Sljedeće su zasebne radnje: pozivnice za pristup i dodjela RFID kartica. Uvoz ih ne obavlja automatski.</p>${actions(button('onboarding','Pregledaj pripremu tvrtke',true)+button('replace','Pregledaj drugi ogledni popis'))}`;
    }
    function cancelScreen(){
      return `<h2>Otkazati pripremu?</h2><p>U budućem postupku otkazivanje uklanja privremene podatke. Pripremu je moguće ponovno početi, ali popis treba ponovno učitati.</p><p>Već uspješan uvoz ne može se poništiti ovim gumbom.</p>${actions(button('cancel','Da, otkaži oglednu pripremu')+button('back','Nastavi pripremu',true))}`;
    }
    function currentScreen(){
      const screens={select:selectScreen,parsing:parsingScreen,mapping:mappingScreen,review:reviewScreen,approval:approvalScreen,result:resultScreen,cancelAsk:cancelScreen};
      return screens[model.status]?screens[model.status]():terminalScreen();
    }
    function aside(){
      return `<aside class="preview-card preview-aside" aria-label="Okvir postupka"><h2>Priprema uvoza</h2><dl><dt>Datoteka</dt><dd>${model.format?`ogledni-radnici.${model.format}`:'Nije odabrana'}</dd><dt>Podaci</dt><dd>Samo sintetički</dd><dt>Način</dt><dd>Dodavanje novih radnika</dd><dt>Privremeni podaci</dt><dd>Planirano: do 24 sata</dd></dl><ul><li>Nema djelomičnog uvoza.</li><li>Nema automatskih zamjena.</li><li>Potvrda vrijedi za aktualni pregled.</li></ul><div class="preview-form">${selector('preview-scenario','Ogledni scenarij',scenarios,model.scenario)}</div><p class="preview-muted">Promjena scenarija započinje novi ogledni postupak. Nije opcija budućeg produkcijskog ekrana.</p></aside>`;
    }
    function onboardingScreen(){
      const items=[
        ['Tvrtka i postavke','Ogledni dokaz','Naziv, vremenska zona, odjeli, smjene i neradni dani. Ovaj primjer prikazuje pripremljenu konfiguraciju; stvarna provjera nije izvršena.'],
        ['Radnici',model.completed?'Ogledni rezultat uvoza':'Potrebna priprema',model.completed?'Simulirani rezultat: 3 radnika. U stvarnom postupku računa se potvrđen rezultat iz baze.':'Pripremite popis i provjerite sve retke prije potvrde.'],
        ['Pristup i pozivnice','Potrebna provjera','Provjerite administratora i ovlasti te zasebno pozovite korisnike. E-mail u popisu nije dokaz aktivnog računa.'],
        ['Terminal i kartice','Nije potvrđeno','Povezivanje terminala i dodjela kartica provjeravaju se zasebno. Ovaj UX ne provjerava fizički uređaj.'],
        ['Probni postupak','Nije potvrđeno','Neovisna druga osoba provjerava dolazak, odlazak, korekciju i izvoz. Posjet ekranu nije dokaz uspješnog testa.'],
        ['Spremnost za početak rada','Blokirano','Sustav procjenjuje spremnost iz potvrđenih dokaza. Nedostaju provjere pristupa, terminala i probnog postupka.'],
        ['Odobrenje početka rada','Nije odobreno','Ovlaštena BSS osoba zasebno bilježi odluku uz prihvat kupca. Administrator tvrtke ne odobrava sam sebi početak stvarnog rada.']
      ];
      return `<section class="preview-card"><h2>Pregled pripreme tvrtke</h2>${message('Priprema nije odobrenje za rad','Napredak se temelji na potvrđenim dokazima. Svi statusi ovdje su ogledni; nema stvarne aktivacije.')}<p class="preview-muted">Profil: Demo · u produkciji se posljednja potvrđena priprema dohvaća nakon povratka. Ovaj prototip ništa ne sprema.</p><ol class="preview-onboarding">${items.map(([title,status,description],index)=>`<li><span class="preview-number" aria-hidden="true">${index+1}</span><div><h3>${title}</h3><span class="preview-badge">${status}</span><p>${description}</p>${index===1?button('import','Pregledaj uvoz radnika'):''}</div></li>`).join('')}</ol><p>Promjena postavki nakon ranijeg odobrenja zahtijeva ponovnu provjeru. Ranija odluka ostaje zabilježena i ne znači da su nove prepreke riješene.</p></section>`;
    }
    function render(focus=true){
      const navigation=document.querySelectorAll('[data-view]');
      navigation.forEach(item=>{if(item.dataset.view===model.view)item.setAttribute('aria-current','page');else item.removeAttribute('aria-current');});
      if(model.view==='onboarding')content.innerHTML=onboardingScreen();
      else content.innerHTML=`<ol class="preview-steps" aria-label="Koraci uvoza">${stages.map((stage,index)=>`<li ${model.step===index?'aria-current="step"':''}>${index+1}. ${stage}</li>`).join('')}</ol><div class="preview-grid"><section class="preview-card">${currentScreen()}</section>${aside()}</div>`;
      if(focus)content.focus();
      announcement.textContent=model.view==='onboarding'?'Pregled pripreme tvrtke':content.querySelector('h2').textContent;
    }
    function reset(){
      model.status='select';model.step=0;model.mapping={};model.format='';model.department='';model.shift='';model.approval=false;model.onlyErrors=false;model.revision=1;
    }
    function showStatus(status,step=model.step){model.status=status;model.step=step;model.approval=false;}
    function start(format){model.format=format;showStatus('parsing',0);}
    const commands={
      csv:()=>start('csv'),xlsx:()=>start('xlsx'),parsed:()=>showStatus('mapping',1),
      validate:()=>{if(mappingComplete()){model.revision+=1;showStatus('review',2);}},
      mapping:()=>showStatus('mapping',1),review:()=>showStatus('review',2),
      approve:()=>{if(counts().blocked===0)showStatus('approval',3);},
      commit:()=>{
        if(model.status!=='approval'||!model.approval)return;
        const outcomes={expired:'expired',stale:'stale',uncertain:'uncertain'};
        showStatus(outcomes[model.scenario]||'result',3);
        if(model.status==='result')model.completed=true;
      },
      refresh:()=>{model.revision+=1;showStatus('review',2);model.scenario='valid';},
      readback:()=>{if(model.status==='uncertain'){showStatus('result',3);model.completed=true;}},
      cancelAsk:()=>{model.previous=model.status;showStatus('cancelAsk');},
      cancel:()=>{showStatus('cancelled');model.mapping={};model.department='';model.shift='';},
      back:()=>showStatus(model.previous),replace:reset,
      onboarding:()=>{model.view='onboarding';},import:()=>{model.view='import';}
    };
    document.addEventListener('click',event=>{
      const target=event.target.closest('[data-action],[data-view]');
      if(!target||target.disabled)return;
      if(target.dataset.view)model.view=target.dataset.view;
      else if(commands[target.dataset.action])commands[target.dataset.action]();
      render();
    });
    content.addEventListener('change',event=>{
      const {id,value,checked}=event.target;
      if(id==='preview-scenario'){model.scenario=value||'valid';reset();render();return;}
      if(id==='approve-import'){model.approval=checked;content.querySelector('[data-action="commit"]').disabled=!checked;return;}
      if(id==='errors-only'){model.onlyErrors=checked;const scroll=content.querySelector('.preview-table-wrap').scrollLeft;render(false);content.querySelector('.preview-table-wrap').scrollLeft=scroll;content.querySelector('#errors-only').focus();return;}
      if(id==='map-department-value')model.department=value;
      else if(id==='map-shift-value')model.shift=value;
      else if(id.startsWith('map-'))model.mapping[id.slice(4)]=value;
      const validate=content.querySelector('[data-action="validate"]');
      if(validate)validate.disabled=!mappingComplete();
      model.approval=false;
    });
    document.getElementById('preview-theme').addEventListener('click',event=>{
      const dark=document.documentElement.dataset.theme!=='dark';
      document.documentElement.dataset.theme=dark?'dark':'light';
      event.target.textContent=dark?'Svijetla tema':'Tamna tema';
    });
    render(false);
  }
  if(typeof module==='object'&&module.exports)module.exports={mount};
  if(root.document)mount(root.document);
})(typeof globalThis==='object'?globalThis:window);
