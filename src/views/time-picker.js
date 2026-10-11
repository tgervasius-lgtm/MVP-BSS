(function registerTimePicker(root){
  'use strict';

  function enhance(container){
    const document=container.ownerDocument||container;
    container.querySelectorAll('input[type="time"]:not([data-localized-time])').forEach(input=>{
      const label=input.getAttribute('aria-label')||input.closest('label')?.textContent.trim()||'Vrijeme';
      const field=document.createElement('fieldset');field.className='time-field';
      const legend=document.createElement('legend');legend.textContent=`${label} (24 h)`;field.append(legend);
      const control=document.createElement('span');control.className='time-picker';
      const makeSelect=(part,placeholder,count)=>{
        const select=document.createElement('select');select.setAttribute('aria-label',`${label} — ${part}`);
        select.disabled=input.disabled||input.readOnly;
        const blank=document.createElement('option');blank.value='';blank.textContent=placeholder;select.append(blank);
        for(let value=0;value<count;value++){
          const option=document.createElement('option');option.value=String(value).padStart(2,'0');option.textContent=option.value;select.append(option);
        }
        return select;
      };
      const hours=makeSelect('sati','Sati',24),minutes=makeSelect('minute','Minute',60);
      const separator=document.createElement('span');separator.textContent=':';separator.setAttribute('aria-hidden','true');
      control.append(hours,separator,minutes);
      const error=document.createElement('span');error.className='time-error';error.setAttribute('aria-live','polite');
      const load=()=>{const parts=input.value.split(':');hours.value=parts[0]||'';minutes.value=parts[1]||'';};
      load();
      input.dataset.localizedTime='true';input.hidden=true;input.tabIndex=-1;input.setAttribute('aria-hidden','true');
      const outerLabel=input.closest('label');
      if(outerLabel){outerLabel.replaceWith(field);field.append(input,control,error);}else{input.after(field);field.append(control,error);}
      let syncing=false;
      const sync=()=>{
        const candidate=hours.value&&minutes.value?`${hours.value}:${minutes.value}`:'';
        input.value=candidate;
        const invalid=Boolean(candidate)&&(!input.value||!input.validity.valid);
        const message=invalid?'Odaberite valjano vrijeme unutar dopuštenog raspona.':'';
        hours.setCustomValidity(message);error.textContent=message;
        hours.setAttribute('aria-invalid',String(invalid));minutes.setAttribute('aria-invalid',String(invalid));
        if(invalid)input.value='';
        syncing=true;
        try{input.dispatchEvent(new Event('change',{bubbles:true}));}finally{syncing=false;}
      };
      hours.addEventListener('change',sync);minutes.addEventListener('change',sync);
      input.addEventListener('change',()=>{
        if(syncing)return;
        load();hours.setCustomValidity('');error.textContent='';
        hours.setAttribute('aria-invalid','false');minutes.setAttribute('aria-invalid','false');
      });
    });
  }

  const timePicker=Object.freeze({enhance});
  root.BSSCore=Object.freeze({...root.BSSCore,views:Object.freeze({...root.BSSCore?.views,timePicker})});
  if(typeof module==='object'&&module.exports)module.exports=timePicker;
})(typeof globalThis==='object'?globalThis:window);
