(function registerAccessOperational(root){
  'use strict';

  function render(context){
    const {currentRole,users,invitations,allUsers,accessStatusFilter,ACCESS_ROLES,ACCESS_MATRIX,workerById,title,escapeHtml,pill}=context;
    const active=allUsers.filter(item=>item.status==='Aktivan').length;
    const blocked=allUsers.filter(item=>item.status==='Blokiran').length;
    const pending=invitations.filter(item=>item.status==='Poslana').length;

    const userRows=users.map(user=>{
      const worker=workerById(user.workerId);
      const scope=user.departments?.length?user.departments.join(', '):ACCESS_ROLES[user.role]?.scope||'—';
      return `<tr><td><b>${escapeHtml(worker?.name||user.email)}</b><small>${escapeHtml(user.email)}</small></td><td>${escapeHtml(user.role)}</td><td>${escapeHtml(scope)}</td><td>${pill(user.status)}</td><td>${escapeHtml(user.lastLogin||'Nikad')}</td><td><div class="table-actions"><button data-bss-action="openAccessModal(${user.id})">Uloga</button><button data-bss-action="sendPasswordReset(${user.id})">Reset</button><button class="${user.status==='Aktivan'?'danger':''}" data-bss-action="toggleAccessUser(${user.id})">${user.status==='Aktivan'?'Blokiraj':'Aktiviraj'}</button></div></td></tr>`;
    }).join('');

    const invitationRows=invitations.map(invite=>`<div class="invitation-item"><div><b>${escapeHtml(invite.name)}</b><span>${escapeHtml(invite.email)} · ${escapeHtml(invite.role)} · ${escapeHtml(invite.departments?.join(', ')||'bez odjela')}</span><small>Poslano ${escapeHtml(invite.sentAt)} · vrijedi do ${escapeHtml(invite.expiresAt)}</small></div><div>${pill(invite.status)}${invite.status==='Poslana'?`<div class="table-actions"><button data-bss-action="resendInvitation(${invite.id})">Pošalji ponovno</button><button class="danger" data-bss-action="cancelInvitation(${invite.id})">Poništi</button></div>`:''}</div></div>`).join('');

    return `${title('Prava pristupa','Korisnički računi, uloge i opseg podataka.',currentRole==='admin'?'<button class="btn" data-bss-action="openInviteModal()">Pozovi korisnika</button>':'')}
      <section class="admin-kpis access-summary" aria-label="Sažetak korisničkih računa">
        <button data-bss-action="setAccessStatusFilter('Aktivan')"><span>Aktivni računi</span><b>${active}</b></button>
        <button data-bss-action="setAccessStatusFilter('Blokiran')"><span>Blokirani</span><b>${blocked}</b></button>
        <button data-bss-action="focusSection('accessInvitations')"><span>Otvorene pozivnice</span><b>${pending}</b></button>
        <button data-bss-action="focusSection('accessMatrix')"><span>Uloge</span><b>${Object.keys(ACCESS_ROLES).length}</b></button>
      </section>
      <section class="card access-users-card access-operational-card"><div class="card-heading"><div><h2>Korisnički računi</h2><p>Promjene uloga i statusa ulaze u audit trag.</p></div><div class="access-filter">${['Svi','Aktivan','Blokiran'].map(status=>`<button class="${accessStatusFilter===status?'active':''}" data-bss-action="setAccessStatusFilter('${status}')">${status}</button>`).join('')}</div></div><div class="table-wrap"><table class="access-table"><thead><tr><th>Korisnik</th><th>Uloga</th><th>Opseg</th><th>Status</th><th>Zadnja prijava</th><th>Radnje</th></tr></thead><tbody>${userRows||'<tr><td colspan="6"><div class="empty-state">Nema računa za odabrani status.</div></td></tr>'}</tbody></table></div></section>
      <div class="admin-two-column access-secondary-grid">
        <section class="card" id="accessInvitations" tabindex="-1"><div class="card-heading"><div><h2>Pozivnice</h2><p>Demo ne šalje stvarni email.</p></div></div><div class="invitation-list">${invitationRows||'<div class="empty-state compact">Nema pozivnica.</div>'}</div></section>
        <section class="card" id="accessMatrix" tabindex="-1"><div class="card-heading"><div><h2>Matrica ovlasti</h2><p>Sažetak v1 role granica.</p></div></div><div class="table-wrap"><table class="permission-table"><thead><tr><th>Uloga</th><th>Evidencija</th><th>Godišnji</th><th>Korekcije</th><th>Izvještaji</th><th>Administracija</th></tr></thead><tbody>${ACCESS_MATRIX.map(values=>`<tr>${values.map((value,index)=>`<td>${index?escapeHtml(value):`<b>${escapeHtml(value)}</b>`}</td>`).join('')}</tr>`).join('')}</tbody></table></div></section>
      </div>
      <div class="notice info access-boundary-note">Produkcija provjerava ovlasti na backendu; demo ne šalje email ni reset tokene.</div>`;
  }

  const accessOperational=Object.freeze({render});
  const views=Object.freeze({...root.BSSCore?.views,accessOperational});
  root.BSSCore=Object.freeze({...root.BSSCore,views});

  if(typeof module==='object'&&module.exports)module.exports=accessOperational;
})(typeof globalThis==='object'?globalThis:window);
