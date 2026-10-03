(function registerAttendanceOperational(root){
  'use strict';

  let activeFilter='all';

  function dailyRows(context){
    const {visibleWorkers,attendanceFilters,records,today,shiftById,plannedShiftMinutes,recordMinutes,pendingCorrectionFor}=context;
    const search=attendanceFilters.search.toLocaleLowerCase('hr');
    return visibleWorkers.filter(worker=>worker.active).filter(worker=>
      (attendanceFilters.department==='Svi'||worker.dept===attendanceFilters.department)
      &&(!search||`${worker.name} ${worker.dept} ${worker.jobTitle}`.toLocaleLowerCase('hr').includes(search))
    ).map(worker=>{
      const record=records.find(item=>item.workerId===worker.id&&item.date===today);
      const shift=shiftById(worker.shiftId);
      const planned=plannedShiftMinutes(worker.id);
      const worked=record?(record.end?recordMinutes(record):recordMinutes(record,true)):0;
      const balance=record?.end?recordMinutes(record)-planned:null;
      let status='Bez dolaska';
      if(['Godišnji','Bolovanje','Odsutna'].includes(worker.status))status=worker.status==='Odsutna'?'Odsutan':worker.status;
      else if(record?.start&&!record?.end)status='Prisutan';
      else if(record?.start&&record?.end)status='Završen';
      else if(['Prisutan','Kasni'].includes(worker.status))status='Prisutan';
      const anomaly=record&&['Kašnjenje','Nepotpun zapis'].includes(record.status)
        ?record.status
        :pendingCorrectionFor(record||{workerId:worker.id,date:today})?'Korekcija čeka'
        :(!record&&status==='Bez dolaska'?'Nema prijave':'—');
      return {worker,record,shift,planned,worked,balance,status,anomaly};
    });
  }

  function metrics(rows){
    return {
      present:rows.filter(row=>['Prisutan','Završen'].includes(row.status)).length,
      missing:rows.filter(row=>row.status==='Bez dolaska').length,
      absent:rows.filter(row=>['Odsutan','Godišnji','Bolovanje'].includes(row.status)).length,
      anomaly:rows.filter(row=>row.anomaly!=='—').length,
      total:rows.length
    };
  }

  function filterRows(rows,filter){
    if(filter==='present')return rows.filter(row=>['Prisutan','Završen'].includes(row.status));
    if(filter==='missing')return rows.filter(row=>row.status==='Bez dolaska');
    if(filter==='absent')return rows.filter(row=>['Odsutan','Godišnji','Bolovanje'].includes(row.status));
    if(filter==='anomaly')return rows.filter(row=>row.anomaly!=='—');
    return rows;
  }

  function renderKpis(filter,rows){
    const data=metrics(rows);
    const cards=[
      ['present','✓',data.present,'Prisutni','Evidentirani danas','green'],
      ['missing','—',data.missing,'Bez dolaska','Bez današnje prijave','amber'],
      ['absent','○',data.absent,'Odsutni','Godišnji, bolovanje ili odsutnost','blue'],
      ['anomaly','!',data.anomaly,'Anomalije','Redovi koji traže pažnju','red'],
      ['all','Σ',data.total,'Ukupno','Radnici u dopuštenom opsegu','neutral']
    ];
    return `<section class="attendance-operational-kpis" aria-label="Dnevni attendance pokazatelji">${cards.map(([key,icon,value,label,detail,tone])=>`<button class="attendance-op-kpi ${tone} ${filter===key?'active':''}" data-bss-action="setAttendanceDailyFilter('${key}')" aria-pressed="${filter===key}"><span class="attendance-op-icon" aria-hidden="true">${icon}</span><span><b>${value}</b><strong>${label}</strong><small>${detail}</small></span></button>`).join('')}</section>`;
  }

  function statusHtml(status,pill){
    if(status==='Prisutan'||status==='Završen')return pill(status==='Završen'?'Uredno':'Prisutan');
    if(status==='Bez dolaska')return '<span class="pill gray">Bez dolaska</span>';
    if(status==='Godišnji')return pill('Godišnji');
    if(status==='Bolovanje')return pill('Bolovanje');
    return '<span class="pill gray">Odsutan</span>';
  }

  function anomalyHtml(anomaly,escapeHtml){
    if(anomaly==='—')return '<span class="attendance-anomaly-none">—</span>';
    const cls=anomaly==='Nepotpun zapis'||anomaly==='Nema prijave'?'red':'orange';
    return `<span class="pill ${cls}">${escapeHtml(anomaly)}</span>`;
  }

  function renderTable(filter,rows,context){
    const {escapeHtml,formatMinutes,formatSignedMinutes,pill,isoLabel,today}=context;
    const filtered=filterRows(rows,filter);
    const body=filtered.map(({worker,record,shift,worked,balance,status,anomaly})=>`<tr class="${anomaly!=='—'?'attendance-op-review':''}">
      <td class="attendance-code">R-${String(worker.id).padStart(3,'0')}</td>
      <td><button class="attendance-person-link" data-bss-action="openWorker(${worker.id})"><b>${escapeHtml(worker.name)}</b><small>${escapeHtml(worker.jobTitle||'—')}</small></button></td>
      <td>${escapeHtml(worker.dept||'—')}</td>
      <td><b>${escapeHtml(shift?`${shift.start} – ${shift.end}`:'Bez plana')}</b><small>${escapeHtml(shift?.name||'')}</small></td>
      <td>${escapeHtml(record?.start||'—')}</td>
      <td>${escapeHtml(record?.end||'—')}</td>
      <td>${record?.start?formatMinutes(worked):'—'}</td>
      <td><span class="record-balance ${balance===null?'neutral':balance<0?'negative':'positive'}">${balance===null?'—':formatSignedMinutes(balance)}</span></td>
      <td>${statusHtml(status,pill)}</td>
      <td>${anomalyHtml(anomaly,escapeHtml)}</td>
      <td>${record?`<button class="table-detail-btn" data-bss-action="openAttendanceRecord(${record.id})" aria-label="Otvori evidenciju za ${escapeHtml(worker.name)}">Otvori</button>`:'<span class="small-muted">Bez zapisa</span>'}</td>
    </tr>`).join('');
    const data=metrics(filtered);
    return `<section class="card table-card attendance-operational-card" id="attendanceDaily" tabindex="-1">
      <div class="table-card-heading"><div><h2>Dnevna evidencija</h2><p>${escapeHtml(isoLabel(today))} · status i anomalija prikazani su odvojeno.</p></div><span class="pill gray">${filtered.length} redaka</span></div>
      <div class="table-wrap"><table class="attendance-operational-table"><thead><tr><th>Šifra</th><th>Ime i prezime</th><th>Odjel</th><th>Planirano</th><th>Dolazak</th><th>Odlazak</th><th>Odrađeno</th><th>Saldo</th><th>Status</th><th>Anomalija</th><th></th></tr></thead><tbody>${body||'<tr><td colspan="11"><div class="empty-state">Nema radnika za odabrani dnevni filtar.</div></td></tr>'}</tbody></table></div>
      <div class="table-summary"><span>${filtered.length} prikazano · ${data.anomaly} anomalija</span><span>Izvorni attendance zapisi ostaju nepromijenjeni.</span></div>
    </section>`;
  }

  function setFilter(next){
    if(!['all','present','missing','absent','anomaly'].includes(next))return false;
    activeFilter=next;
    return true;
  }

  function render(context){
    const rows=dailyRows(context);
    return Object.freeze({kpis:renderKpis(activeFilter,rows),table:renderTable(activeFilter,rows,context)});
  }

  const attendanceOperational=Object.freeze({dailyRows,metrics,filterRows,setFilter,render});
  const views=Object.freeze({...root.BSSCore?.views,attendanceOperational});
  root.BSSCore=Object.freeze({...root.BSSCore,views});
  root.setAttendanceDailyFilter=next=>{ if(attendanceOperational.setFilter(next)&&typeof root.render==='function')root.render(); };

  if(typeof module==='object'&&module.exports)module.exports=attendanceOperational;
})(typeof globalThis==='object'?globalThis:window);
