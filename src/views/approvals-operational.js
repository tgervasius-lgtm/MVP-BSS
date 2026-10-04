(function registerApprovalsOperational(root){
  'use strict';

  function metricStrip(items,label){
    return `<section class="approval-summary" aria-label="${label}">${items.map(([name,value])=>`<div><span>${name}</span><b>${value}</b></div>`).join('')}</section>`;
  }

  function requests(context){
    const {currentRole,isApprover,isWorker,scoped,requests,requestSearch,title,requestTabs,requestTable,vacationRequestForm,escapeHtml}=context;
    const heading=isWorker?'Moji zahtjevi':currentRole==='manager'?'Zahtjevi mojeg tima':'Zahtjevi za odsutnost';
    const subtitle=isWorker?'Statusi i povijest mojih zahtjeva.':'Odluke o odsutnosti u dopuštenom opsegu.';
    const queueCopy=isApprover?'<div class="approval-context"><b>Red čekanja za odluku</b><span>Preklapanje je signal za provjeru, ne automatska zabrana.</span></div>':'';
    return `${title(heading,subtitle)}
      ${queueCopy}
      <section class="card request-control-card approval-control">
        ${requestTabs(scoped)}
        <div class="request-search"><input id="requestSearch" aria-label="Traži zahtjeve" placeholder="Ime, odjel, vrsta ili napomena" value="${escapeHtml(requestSearch)}"><button class="btn" data-bss-action="applyRequestSearch()">Traži</button><button class="btn secondary" data-bss-action="clearRequestFilters()">Očisti</button></div>
      </section>
      <section class="card table-card approval-table-card"><div class="table-card-heading"><div><h2>Zahtjevi</h2><p>${isApprover?'Najprije riješi stavke na čekanju.':'Povijest zahtjeva i odluka.'}</p></div></div>${requestTable(requests,isApprover)}</section>
      ${isWorker?vacationRequestForm():''}
      <div class="btns approval-links"><button class="btn secondary" data-bss-action="navigate('vacations')">${isWorker?'Moj godišnji':'Godišnji'}</button><button class="btn secondary" data-bss-action="navigate('sharedLeave')">Kalendar</button></div>`;
  }

  function corrections(context){
    const {currentRole,isWorker,isApprover,corrections,workerById,correctionValues,escapeHtml,isoLabel,pill,correctionForm,title}=context;
    const pending=corrections.filter(item=>item.status==='Na čekanju').length;
    const approved=corrections.filter(item=>item.status==='Odobreno').length;
    const rejected=corrections.filter(item=>item.status==='Odbijeno').length;
    const summary=metricStrip([
      ['Na čekanju',pending],
      ['Odobreno',approved],
      ['Odbijeno',rejected],
      ['Ukupno',corrections.length]
    ],'Sažetak korekcija');
    const rows=corrections.map(correction=>{
      const worker=workerById(correction.workerId),values=correctionValues(correction);
      const controls=isApprover&&correction.status==='Na čekanju'
        ?`<div class="table-actions"><button data-bss-action="updateCorrection(${correction.id},'Odobreno')">Odobri</button><button class="danger" data-bss-action="updateCorrection(${correction.id},'Odbijeno')">Odbij</button></div>`
        :isWorker&&correction.status==='Na čekanju'
          ?`<button class="table-detail-btn danger" data-bss-action="cancelCorrection(${correction.id})">Poništi</button>`
          :'—';
      return `<tr data-correction-id="${correction.id}"><td><b>${escapeHtml(worker?.name||'Nepoznat radnik')}</b><small>${escapeHtml(worker?.dept||'—')}</small></td><td>${escapeHtml(isoLabel(correction.date))}</td><td class="correction-before">${escapeHtml(values.oldValue)}</td><td class="correction-after"><b>${escapeHtml(values.newValue)}</b></td><td>${escapeHtml(correction.reason)}</td><td>${pill(correction.status)}</td><td>${controls}</td></tr>`;
    }).join('');
    const heading=isWorker?'Moje korekcije':currentRole==='manager'?'Korekcije mojeg tima':'Korekcije vremena';
    const subtitle=isWorker?'Izvorni zapis ostaje nepromijenjen do odobrenja.':'Kontrolirane promjene s dokaznim tragom.';
    return `${title(heading,subtitle)}
      ${summary}
      <section class="card table-card approval-table-card corrections-operational-card"><div class="table-card-heading"><div><h2>Korekcije vremena</h2><p>Izvorno → predloženo → odluka; audit trag ostaje sačuvan.</p></div></div><div class="table-wrap"><table class="compact-table corrections-table"><thead><tr><th>Radnik</th><th>Datum</th><th>Izvorno</th><th>Predloženo</th><th>Razlog</th><th>Status</th><th>Radnja</th></tr></thead><tbody>${rows||'<tr><td colspan="7"><div class="empty-state">Nema korekcija u tvojem opsegu.</div></td></tr>'}</tbody></table></div></section>
      ${isWorker?correctionForm():''}`;
  }

  const approvalsOperational=Object.freeze({metricStrip,requests,corrections});
  const views=Object.freeze({...root.BSSCore?.views,approvalsOperational});
  root.BSSCore=Object.freeze({...root.BSSCore,views});

  if(typeof module==='object'&&module.exports)module.exports=approvalsOperational;
})(typeof globalThis==='object'?globalThis:window);
