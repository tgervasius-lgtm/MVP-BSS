(function registerDatePicker(root){
  'use strict';

  function enhance(container){
    const document=container.ownerDocument||container;
    container.querySelectorAll('input[type="date"]:not([data-localized-date])').forEach(input=>{
      const label=input.getAttribute('aria-label')||input.closest('label')?.textContent.trim()||'Datum';
      const field=document.createElement('fieldset');field.className='date-field';
      const legend=document.createElement('legend');legend.textContent=label;field.append(legend);
      const control=document.createElement('span');control.className='date-picker';
      const makeSelect=(part,placeholder)=>{
        const select=document.createElement('select');select.setAttribute('aria-label',`${label} — ${part}`);
        const option=document.createElement('option');option.value='';option.textContent=placeholder;select.append(option);return select;
      };
      const day=makeSelect('dan','Dan'),month=makeSelect('mjesec','Mjesec');
      const year=document.createElement('input');year.type='number';year.step='1';year.min='1';year.max='9999';
      year.setAttribute('aria-label',`${label} — godina`);year.placeholder='Godina';
      for(const part of [day,month,year])part.disabled=input.disabled||input.readOnly;
      for(let value=1;value<=31;value++){
        const option=document.createElement('option');option.value=String(value).padStart(2,'0');option.textContent=String(value);day.append(option);
      }
      for(let value=1;value<=12;value++){
        const option=document.createElement('option');option.value=String(value).padStart(2,'0');
        option.textContent=new Date(2026,value-1,15).toLocaleDateString('hr-HR',{month:'long'});month.append(option);
      }
      const load=()=>{const parts=input.value.split('-');year.value=parts[0]||'';month.value=parts[1]||'';day.value=parts[2]||'';};
      load();
      // Retain native ISO/date validity and the original ID/change contract.
      input.dataset.localizedDate='true';input.hidden=true;input.tabIndex=-1;input.setAttribute('aria-hidden','true');
      const outerLabel=input.closest('label');
      if(outerLabel){outerLabel.replaceWith(field);field.append(input,control);}else{input.after(field);field.append(control);}
      control.append(day,month,year);
      const error=document.createElement('span');error.className='date-error';error.setAttribute('aria-live','polite');field.append(error);
      let syncing=false;
      const sync=()=>{
        const candidate=day.value&&month.value&&year.value&&year.validity.valid?`${year.value.padStart(4,'0')}-${month.value}-${day.value}`:'';
        input.value=candidate;
        const invalid=(Boolean(year.value)&&!year.validity.valid)||(Boolean(candidate)&&(!input.value||!input.validity.valid));
        day.setCustomValidity(invalid?'Odaberite valjan datum unutar dopuštenog razdoblja.':'');
        error.textContent=day.validationMessage;
        for(const part of [day,month,year])part.setAttribute('aria-invalid',String(invalid));
        if(invalid)input.value='';
        syncing=true;
        try{input.dispatchEvent(new Event('change',{bubbles:true}));}finally{syncing=false;}
      };
      day.addEventListener('change',sync);month.addEventListener('change',sync);year.addEventListener('change',sync);
      input.addEventListener('change',()=>{
        if(syncing)return;
        load();day.setCustomValidity('');error.textContent='';
        for(const part of [day,month,year])part.setAttribute('aria-invalid','false');
      });
    });
  }

  const datePicker=Object.freeze({enhance});
  root.BSSCore=Object.freeze({...root.BSSCore,views:Object.freeze({...root.BSSCore?.views,datePicker})});
  if(typeof module==='object'&&module.exports)module.exports=datePicker;
})(typeof globalThis==='object'?globalThis:window);
