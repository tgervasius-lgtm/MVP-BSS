(function registerMyTime(root){
  'use strict';

  let scopeKey=null;
  let selectedId=null;

  function monthlySummary({summary,shift,month,monthDisplay,escapeHtml,formatMinutes,formatSignedMinutes}){
    return `<section class="card mytime-summary-card">
      <div class="mytime-summary-head"><div><span>Mjesečni pregled</span><h2>${escapeHtml(monthDisplay(month))}</h2></div>
        <label>Mjesec<input id="myTimeMonth" type="month" value="${escapeHtml(month)}" data-bss-change="setMyTimeMonth(this.value)"></label>
      </div>
      <div class="mytime-summary-grid">
        <button data-bss-action="focusSection('myTimeRecords')"><span>Odrađeno</span><b>${formatMinutes(summary.workedMinutes)}</b></button>
        <button data-bss-action="focusSection('myTimeRecords')"><span>Planirano</span><b>${formatMinutes(summary.plannedMinutes)}</b></button>
        <button data-bss-action="focusSection('myTimeRecords')"><span>Saldo</span><b class="${summary.balanceMinutes<0?'negative':'positive'}">${formatSignedMinutes(summary.balanceMinutes)}</b></button>
        <button data-bss-action="setMyTimeReview(true)" ${summary.review?'':'disabled'}><span>Za provjeru</span><b>${summary.review}</b></button>
      </div>
      <div class="mytime-shift-row"><span>Smjena</span><b>${escapeHtml(shift?.name||'Bez smjene')} · ${escapeHtml(shift?`${shift.start} – ${shift.end}`:'Nema rasporeda')}</b></div>
    </section>`;
  }

  function dayDetails(record,{corrections,shift,today,recordMinutes,plannedShiftMinutes,formatMinutes,formatSignedMinutes,isoLabel,escapeHtml,pill}){
    const planned=plannedShiftMinutes(record.workerId);
    const worked=record.end||record.date===today?formatMinutes(recordMinutes(record,true)):'—';
    const balance=record.end?formatSignedMinutes(recordMinutes(record)-planned):'—';
    const correction=corrections.find(item=>item.workerId===record.workerId&&item.date===record.date);
    const entries=[
      ['Dolazak',record.start||'—'],['Odlazak',record.end||'—'],['Pauza',record.breakMinutes?`${record.breakMinutes} min`:'—'],
      ['Evidentirano',worked],['Plan smjene',formatMinutes(planned)],['Saldo',balance]
    ];
    return `<section class="card mytime-day-detail" aria-labelledby="myTimeDayTitle">
      <div class="mytime-day-head"><div><h3 id="myTimeDayTitle">${escapeHtml(isoLabel(record.date))}</h3>
        <p>${escapeHtml(shift?`${shift.name} · ${shift.start} – ${shift.end}`:'Bez smjene')}</p></div>${pill(record.status)}</div>
      <dl>${entries.map(([name,value])=>`<div><dt>${name}</dt><dd>${escapeHtml(value)}</dd></div>`).join('')}</dl>
      ${correction?`<div class="notice info"><strong>Korekcija: ${escapeHtml(correction.status)}</strong>
        ${correction.decisionNote?`<p>${escapeHtml(correction.decisionNote)}</p>`:''}</div>`:''}
      <button type="button" class="btn" data-bss-action="startCorrectionFromRecord(${record.id})">Zatraži korekciju</button>
    </section>`;
  }

  function render(context){
    const {records,reviewOnly,month,scope,isoLabel,escapeHtml,pill,pendingCorrectionFor}=context;
    const key=JSON.stringify([scope,month]);
    if(key!==scopeKey){
      scopeKey=key;
      selectedId=null;
    }
    const selected=records.find(record=>record.id===selectedId)??records[0];
    selectedId=selected?.id??null;
    const rows=records.map(record=>`<li><button type="button" class="mytime-day-button"
      id="myTimeDay-${record.id}" aria-pressed="${record.id===selectedId}" data-bss-action="selectMyTimeDay(${record.id})">
      <span>${escapeHtml(isoLabel(record.date))}${pendingCorrectionFor(record)?'<small class="pending-note">Korekcija čeka</small>':''}</span>
      ${pill(record.status)}</button></li>`).join('');
    const options=records.map(record=>`<option value="${record.id}" ${record.id===selectedId?'selected':''}>${escapeHtml(isoLabel(record.date))}</option>`).join('');
    return `${monthlySummary(context)}
      ${reviewOnly?'<button class="btn secondary compact-filter-clear" data-bss-action="setMyTimeReview(false)">Prikaži sve mjesečne zapise</button>':''}
      <div id="myTimeRecords" class="mytime-records" tabindex="-1">
        <div class="mytime-workspace">
          <section class="card mytime-day-list"><h2>${reviewOnly?'Zapisi za provjeru':'Moji zapisi'}</h2>
            ${selected?`<label class="mytime-day-picker">Odaberi dan<select id="myTimeDay" data-bss-change="selectMyTimeDay(this.value,true)">${options}</select></label>
              <ul>${rows}</ul>`:`<p class="empty-state">${reviewOnly?'Nema zapisa za provjeru u ovom mjesecu.':'Nema zapisa u ovom mjesecu.'}</p>`}
          </section>
          ${selected?dayDetails(selected,context):''}
        </div>
      </div>`;
  }

  function selectDay(value,fromPicker=false){
    const id=Number(value);
    if(!Number.isSafeInteger(id)||!root.document.getElementById(`myTimeDay-${id}`))return;
    selectedId=id;
    root.render();
    root.document.getElementById(fromPicker?'myTimeDay':`myTimeDay-${id}`)?.focus({preventScroll:true});
  }

  root.selectMyTimeDay=selectDay;
  const myTimeOperational=Object.freeze({render});
  const views=Object.freeze({...root.BSSCore?.views,myTimeOperational});
  root.BSSCore=Object.freeze({...root.BSSCore,views});
})(globalThis);
