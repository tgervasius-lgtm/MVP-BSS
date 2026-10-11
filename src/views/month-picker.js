(function registerMonthPicker(root){
  'use strict';

  // Preserve ISO values and existing change handlers while showing Croatian month names.
  function enhance(container,referenceDate){
    const document=container.ownerDocument||container;
    container.querySelectorAll('input[type="month"]').forEach(input=>{
      const label=input.getAttribute('aria-label')||input.closest('label')?.textContent.trim()||'Razdoblje';
      const selected=input.value.split('-');
      const control=document.createElement('span');control.className='month-picker';
      const month=document.createElement('select');month.setAttribute('aria-label',`${label} — mjesec`);
      const year=document.createElement('input');year.type='number';year.min='1';year.max='9999';year.step='1';
      year.setAttribute('aria-label',`${label} — godina`);year.value=selected[0]||referenceDate.slice(0,4);
      const blank=document.createElement('option');blank.value='';blank.textContent='Odaberite mjesec';month.append(blank);
      for(let index=1;index<=12;index++){
        const option=document.createElement('option');option.value=String(index).padStart(2,'0');
        option.textContent=new Date(2026,index-1,15).toLocaleDateString('hr-HR',{month:'long'});month.append(option);
      }
      month.value=selected[1]||'';
      input.type='hidden';input.removeAttribute('aria-label');
      // Avoid a label containing two labelable descendants.
      const outerLabel=input.closest('label');
      if(outerLabel){
        const wrapper=document.createElement('div');wrapper.className='month-field';
        const caption=document.createElement('span');caption.textContent=label;
        wrapper.append(caption,input,control);outerLabel.replaceWith(wrapper);
      }else input.after(control);
      control.append(month,year);
      const sync=()=>{
        input.value=month.value&&year.value&&year.validity.valid?`${year.value.padStart(4,'0')}-${month.value}`:'';
        input.dispatchEvent(new Event('change',{bubbles:true}));
      };
      month.addEventListener('change',sync);year.addEventListener('change',sync);
    });
  }

  const monthPicker=Object.freeze({enhance});
  const views=Object.freeze({...root.BSSCore?.views,monthPicker});
  root.BSSCore=Object.freeze({...root.BSSCore,views});

  if(typeof module==='object'&&module.exports)module.exports=monthPicker;
})(typeof globalThis==='object'?globalThis:window);
