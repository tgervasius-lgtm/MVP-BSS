(function registerAuditOperational(root){
  'use strict';

  function render(context){
    const {entries,modules,total,auditFilters,title,escapeHtml}=context;
    const visibleModules=new Set(entries.map(item=>item.module)).size;
    const users=new Set(entries.map(item=>item.user)).size;
    return `${title('Audit log','Tko je, kada i što promijenio.')}
      <section class="audit-summary" aria-label="Sažetak audit događaja">
        <div><span>Prikazano</span><b>${entries.length}</b></div>
        <div><span>Ukupno</span><b>${total}</b></div>
        <div><span>Moduli</span><b>${visibleModules}</b></div>
        <div><span>Korisnici</span><b>${users}</b></div>
      </section>
      <section class="card audit-control-card"><div class="audit-filter-bar"><select id="auditModule"><option ${auditFilters.module==='Svi'?'selected':''}>Svi</option>${modules.map(module=>`<option ${auditFilters.module===module?'selected':''}>${escapeHtml(module)}</option>`).join('')}</select><input id="auditSearch" placeholder="Korisnik, radnja ili modul" value="${escapeHtml(auditFilters.search)}"><button class="btn" data-bss-action="applyAuditFilters()">Primijeni</button><button class="btn secondary" data-bss-action="clearAuditFilters()">Očisti</button></div></section>
      <section class="card table-card audit-evidence-card"><div class="table-card-heading"><div><h2>Administrativni događaji</h2><p>Evidence-only pregled; događaji se ovdje ne uređuju.</p></div></div><div class="table-wrap"><table class="compact-table audit-table"><thead><tr><th>Vrijeme</th><th>Korisnik</th><th>Modul</th><th>Radnja</th></tr></thead><tbody>${entries.map(item=>`<tr><td>${escapeHtml(item.time)}</td><td><b>${escapeHtml(item.user)}</b></td><td>${escapeHtml(item.module)}</td><td>${escapeHtml(item.action)}</td></tr>`).join('')||'<tr><td colspan="4"><div class="empty-state">Nema događaja za odabrane kriterije.</div></td></tr>'}</tbody></table></div></section>`;
  }

  const auditOperational=Object.freeze({render});
  const views=Object.freeze({...root.BSSCore?.views,auditOperational});
  root.BSSCore=Object.freeze({...root.BSSCore,views});
  if(typeof module==='object'&&module.exports)module.exports=auditOperational;
})(typeof globalThis==='object'?globalThis:window);
