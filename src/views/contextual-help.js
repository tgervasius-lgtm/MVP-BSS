(function registerContextualHelp(root){
  'use strict';
  const guidance={
    home:{title:'Početni pregled',worker:['Provjerite današnju evidenciju i otvorene zahtjeve.','Detalje vremena pronađite u Moji sati, a stanje zahtjeva u Mojim zahtjevima.'],default:['Pregledajte prisutnost i stavke koje traže pažnju.','Za detalje otvorite odgovarajući ekran. Dostupne radnje ovise o vašoj ulozi.']},
    attendance:{title:'Evidencija dolazaka',default:['Filtrirajte zapise po razdoblju, radniku i odjelu.','Otvorite detalje zapisa za dolazak, odlazak i status. Anomalija označava zapis koji treba provjeriti, ne automatski zaključak o radniku.']},
    mytime:{title:'Moji sati',default:['Odaberite mjesec i pregledajte svoje evidentirano vrijeme.','Otvorite detalje dana. Ako vrijeme nije točno, zatražite korekciju uz obrazloženje; izvorni zapis ostaje do odobrenja.']},
    corrections:{title:'Korekcije vremena',worker:['Ovdje pratite svoje zahtjeve za ispravak vremena.','Status pokazuje čeka li zahtjev odluku ili je obrada završena. Odluku provjerite uz vlastiti zahtjev.'],default:['Pregledajte izvorno i predloženo vrijeme te razlog zahtjeva.','Odluka mijenja stanje zahtjeva. Provjerite sve podatke prije potvrde; dostupni radnici ovise o vašem opsegu.']},
    requests:{title:'Zahtjevi za odsutnost',worker:['Pratite stanje svojih zahtjeva za odsutnost.','Za novi zahtjev odaberite vrstu, razdoblje i razlog. Zahtjev na čekanju još nije odobrena odsutnost.'],default:['Filtrirajte zahtjeve i provjerite razdoblje te razlog.','Odobrite ili odbijte samo nakon provjere. Dostupne odluke i radnici ovise o vašoj ulozi.']},
    vacations:{title:'Godišnji odmor',worker:['Pregledajte vlastiti saldo i godišnji kalendar.','Planirani zahtjev i odobreni godišnji nisu isto. Prije novog zahtjeva provjerite raspoložive dane.'],default:['Pregledajte kalendar i raspoložive dane u dopuštenom opsegu.','Otvorite detalje datuma ili radnika; status zahtjeva provjerite prije zaključka o odsutnosti.']},
    sharedLeave:{title:'Zajednički kalendar',default:['Pregledajte dostupne odsutnosti po datumu.','Količina prikazanih detalja ovisi o ulozi i postavci vidljivosti. Kalendar ne daje dodatne ovlasti za odluke.']},
    reports:{title:'Izvještaji',default:['Odaberite vrstu izvještaja, razdoblje i filtre.','Prije preuzimanja provjerite opseg i format. Izvoz sadrži podatke dostupne vašoj ulozi i nije obračun plaće.']}
  };
  let context=null;
  const escape=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  function key(){return `bss-help-v1:${context.role}:${context.screen}`;}
  function decorate(target,screen,role){
    context=null;
    const entry=guidance[screen];
    if(!entry)return;
    context={target,screen,role,entry,lines:entry[role]||entry.default};
    const hidden=root.BSSCore.runtime.storage.get(key())==='hidden';
    const section=root.document.createElement('section');section.className='screen-help';section.setAttribute('aria-label','Pomoć za ovaj ekran');
    section.innerHTML=`<div class="screen-help-heading"><button class="link-btn" data-bss-action="openScreenHelp()">Pomoć za ovaj ekran</button>${hidden?'':'<button class="link-btn" data-bss-action="hideScreenHelp()" aria-label="Sakrij kratku uputu za ovaj ekran">Sakrij uputu</button>'}</div>${hidden?'':`<p>${escape(context.lines[0])}</p>`}`;
    target.querySelector('.screen').prepend(section);
  }
  function hideScreenHelp(){
    if(!context)return;
    root.BSSCore.runtime.storage.set(key(),'hidden');
    const {target,screen,role}=context;target.querySelector('.screen-help')?.remove();decorate(target,screen,role);
    target.querySelector('[data-bss-action="openScreenHelp()"]')?.focus();
  }
  function openScreenHelp(){
    if(!context)return;
    const modal=root.document.getElementById('modal');
    modal.setAttribute('aria-labelledby','screenHelpTitle');
    modal.innerHTML=`<div class="modal-card screen-help-modal"><div class="modal-head"><h2 id="screenHelpTitle">${escape(context.entry.title)}</h2><button class="close-btn" aria-label="Zatvori pomoć" data-bss-action="closeModal()">×</button></div><ol>${context.lines.map(line=>`<li>${escape(line)}</li>`).join('')}</ol><p class="small-muted">Kratku uputu možete sakriti za ovaj ekran i ulogu na ovom uređaju. Pomoć ostaje dostupna putem gumba.</p><div class="btns"><button class="btn secondary" data-bss-action="restoreScreenHelp()">Prikaži kratku uputu</button><button class="btn" data-bss-action="closeModal()">Zatvori</button></div></div>`;
    root.showModal(modal);
  }
  function restoreScreenHelp(){
    if(!context)return;
    root.BSSCore.runtime.storage.remove(key());root.closeModal();
    const {target,screen,role}=context;target.querySelector('.screen-help')?.remove();decorate(target,screen,role);
    target.querySelector('[data-bss-action="openScreenHelp()"]')?.focus();
  }
  Object.assign(root,{openScreenHelp,hideScreenHelp,restoreScreenHelp});
  root.BSSContextualHelp=Object.freeze({decorate});
})(globalThis);
