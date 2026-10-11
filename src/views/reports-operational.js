(function registerReportsOperational(root){
  'use strict';

  function metrics(data){
    const mapped=(data.metrics||[]).slice(0,4);
    return `<section class="report-metrics" aria-label="Sažetak izvještaja">${mapped.map(([label,value])=>`<div><span>${label}</span><b>${value}</b></div>`).join('')}</section>`;
  }

  function render(context){
    const {currentRole,reportFilters,scopedWorkers,data,REPORT_TYPE_CONFIG,state,title,escapeHtml,departmentOptions,reportPreview,reportHistoryView,authoritativePreviewHtml='',authoritativeMetricsHtml='',authoritativeHasRows=null}=context;
    const roleText=currentRole==='manager'?'Dodijeljeni odjeli':currentRole==='accountant'?'Pregled i izvoz':'Cijela tvrtka ili uži opseg';
    return `${title('Izvještaji','Pregled, provjera i izvoz evidencijskih podataka.',currentRole==='accountant'?'<span class="pill gray">Samo čitanje</span>':'')}
      <section class="card report-workspace-head">
        <div class="report-workspace-title"><div><span>Aktivni izvještaj</span><h2>${escapeHtml(data.title)}</h2><p>${escapeHtml(data.description)}</p></div><div class="report-scope"><b>${escapeHtml(data.period)}</b><span>${escapeHtml(data.scope)}</span><small>${escapeHtml(roleText)}</small></div></div>
        <div class="report-boundary"><b>Granica modula</b><span>BSS priprema evidencijske podatke. Ne izračunava plaću, poreze ni doprinose.</span></div>
      </section>
      <section class="card report-filter-card report-workspace-controls">
        <div class="report-type-grid">${Object.entries(REPORT_TYPE_CONFIG).map(([key,config])=>`<button class="report-type ${reportFilters.type===key?'active':''}" data-bss-action="setReportType('${key}')"><i>${config.icon}</i><span><b>${escapeHtml(config.short)}</b><small>${escapeHtml(config.description)}</small></span></button>`).join('')}</div>
        <div class="report-filter-bar"><label><span>Mjesec</span><input id="reportMonth" type="month" value="${reportFilters.month}"></label><label><span>Odjel</span><select id="reportDept" data-bss-change="updateReportDepartment(this.value)">${departmentOptions(reportFilters.department)}</select></label><label><span>Radnik</span><select id="reportWorker"><option value="Svi" ${reportFilters.workerId==='Svi'?'selected':''}>Svi radnici</option>${scopedWorkers.map(worker=>`<option value="${worker.id}" ${String(worker.id)===String(reportFilters.workerId)?'selected':''}>${escapeHtml(worker.name)}</option>`).join('')}</select></label><button class="btn" data-bss-action="applyReportFilters()">Primijeni</button></div>
      </section>
      ${authoritativeMetricsHtml||metrics(data)}
      ${authoritativePreviewHtml||reportPreview(data)}
      <div class="report-secondary-grid">
        <section class="card report-export"><div class="card-heading"><div><h2>Izvoz</h2><p>Preuzmite podatke za odabrano razdoblje i filtre.</p></div></div><div class="export-file primary-export"><span>XLSX · Excel</span><b>${escapeHtml(data.filenameBase)}.xlsx</b></div><div class="export-file"><span>PDF · službeni pregled</span><b>${escapeHtml(data.filenameBase)}.pdf</b></div><div class="export-file"><span>CSV · UTF-8</span><b>${escapeHtml(data.filenameBase)}.csv</b></div><div class="btns"><button class="btn" data-bss-action="downloadReport('xlsx')" ${(authoritativeHasRows===null?data.rows.length:authoritativeHasRows)?'':'disabled'}>Preuzmi XLSX</button><button class="btn secondary" data-bss-action="downloadReport('pdf')" ${(authoritativeHasRows===null?data.rows.length:authoritativeHasRows)?'':'disabled'}>Preuzmi PDF</button><button class="btn secondary" data-bss-action="downloadReport('csv')" ${(authoritativeHasRows===null?data.rows.length:authoritativeHasRows)?'':'disabled'}>Tehnički CSV</button></div><div class="last-report"><span>Posljednja radnja</span><b>${escapeHtml(state.lastReport)}</b></div></section>
        <section class="card report-quality"><div class="card-heading"><div><h2>Kontrola podataka</h2><p>Provjere prije predaje ili izvoza.</p></div></div>${data.quality.map((item,index)=>`<div class="quality-item"><i>${index+1}</i><span>${escapeHtml(item)}</span></div>`).join('')}</section>
      </div>
      ${reportHistoryView()}`;
  }

  const reportsOperational=Object.freeze({metrics,render});
  const views=Object.freeze({...root.BSSCore?.views,reportsOperational});
  root.BSSCore=Object.freeze({...root.BSSCore,views});

  if(typeof module==='object'&&module.exports)module.exports=reportsOperational;
})(typeof globalThis==='object'?globalThis:window);
