(function installApiBindings(root){
  'use strict';

  const apiRole={Administrator:'admin',Voditelj:'manager',Radnik:'worker',Knjigovođa:'accountant'};
  const reportType={summary:'monthly_summary',attendance:'attendance_journal',exceptions:'exceptions',vacations:'approved_absences',corrections:'correction_log'};
  const typeCode={'Godišnji odmor':'annual_leave','Slobodan dan':'free_day'};
  const visibilityLabel={team:'Tim',department:'Odjel',organization:'Cijela organizacija'};

  function revisionHeaders(value){return{'If-Match':`"${String(value||'0')}"`};}
  function apiMessage(error){
    if(error?.code==='STALE_REVISION')return'Podatak je u međuvremenu promijenjen. Prikaz je osvježen.';
    if(error?.code==='UNAUTHENTICATED')return'Sesija je istekla. Prijavi se ponovno.';
    return error?.message||'API zahtjev nije uspio.';
  }
  function resetApiFilters(){
    attendanceFilters={month:CURRENT_MONTH,department:'Svi',status:'Svi',search:''};attendanceView='all';
    myTimeMonth=CURRENT_MONTH;myTimeReviewOnly=false;workerShiftFilter='Svi';requestStatusFilter=currentRole==='worker'?'Svi':'Na čekanju';requestSearch='';
    reportFilters={month:CURRENT_MONTH,department:'Svi',workerId:'Svi',type:'summary'};settingsTab='overview';accessStatusFilter='Svi';auditFilters={module:'Svi',search:''};
  }
  async function hydrateApi(context=null){
    sessionContext=context||await BSS_API.get('/me');
    const hydrated=await BSS_API_STATE.hydrate(BSS_API,sessionContext,DEMO_TODAY);
    state=hydrated.state;dashboardSummary=hydrated.dashboard;currentRole=hydrated.role;
    ROLE_CONFIG[currentRole].userId=hydrated.selfWorkerId||0;
    if(currentRole==='manager')ROLE_CONFIG.manager.departments=state.departments.map(item=>item.name);
    logged=true;apiError='';
    return hydrated;
  }
  async function refreshApi(message=''){
    try{
      await hydrateApi();
      if(!allowedScreens().includes(screen))screen='home';
      render();
      if(message)toast(message);
      return true;
    }catch(error){
      apiError=apiMessage(error);
      if(error?.status===401){logged=false;state=createApiState();screen='home';}
      render();toast(apiError);return false;
    }
  }
  async function mutateApi(action,message){
    if(apiLoading)return false;
    apiLoading=true;apiError='';
    try{
      await action();closeModal();
      return await refreshApi(message);
    }catch(error){
      apiError=apiMessage(error);
      if(error?.status===401){logged=false;state=createApiState();screen='home';}
      render();toast(apiError);return false;
    }finally{apiLoading=false;}
  }

  async function apiLogin(){
    const email=$('#loginEmail')?.value.trim().toLowerCase(),password=$('#loginPassword')?.value||'';
    if(!email||password.length<12){apiError='Unesi email i lozinku od najmanje 12 znakova.';render();return;}
    apiLoading=true;apiError='';render();
    try{
      const context=await BSS_API.post('/auth/login',{email,password});
      await hydrateApi(context);resetApiFilters();screen='home';render();toast(`Dobro došli. Aktivni prikaz: ${role().label}.`);
    }catch(error){logged=false;apiError=apiMessage(error);render();}
    finally{apiLoading=false;}
  }
  async function apiAcceptInvitation(){
    const password=$('#loginPassword')?.value||'';
    if(!INVITATION_TOKEN||password.length<12){apiError='Lozinka mora imati najmanje 12 znakova.';render();return;}
    apiLoading=true;apiError='';render();
    try{
      const context=await BSS_API.post('/auth/invitations/accept',{token:INVITATION_TOKEN,password});
      root.history?.replaceState?.(null,'',`${root.location.pathname}${root.location.search}`);
      await hydrateApi(context);resetApiFilters();screen='home';render();toast('Korisnički račun je aktiviran.');
    }catch(error){logged=false;apiError=apiMessage(error);render();}
    finally{apiLoading=false;}
  }
  async function apiLogout(){
    try{await BSS_API.post('/auth/logout');}catch{/* Lokalni prikaz se zatvara i ako je sesija već istekla. */}
    logged=false;sessionContext=null;dashboardSummary=null;state=createApiState();screen='home';apiError='';render();
  }
  async function bootstrapApi(){
    try{await hydrateApi();resetApiFilters();render();}
    catch(error){logged=false;state=createApiState();if(error?.status!==401)apiError=apiMessage(error);render();}
  }

  function apiOpenWorkerModal(id=null){
    if(currentRole!=='admin')return;
    const existing=id?workerById(id):null,worker=existing||{code:'',name:'',email:'',dept:state.departments[0]?.name||'',shiftId:state.shifts[0]?.id||0,vacationAllowance:20};
    const modal=$('#modal');
    modal.innerHTML=`<div class="modal-card"><div class="modal-head"><div><h2>${existing?'Uredi radnika':'Dodaj radnika'}</h2><div class="small-muted">Profil, zadana smjena i RFID kartica spremaju se u PostgreSQL.</div></div><button class="close-btn" data-bss-action="closeModal()">×</button></div><div class="form form-grid">
      <label>Šifra radnika<input id="workerCode" maxlength="40" value="${escapeHtml(worker.code||'')}"></label><label>Ime i prezime<input id="workerName" value="${escapeHtml(worker.name)}"></label>
      <label>Email<input id="workerEmail" type="email" value="${escapeHtml(worker.email||'')}"></label><label>Odjel<select id="workerDept">${departmentSelectOptions(worker.dept)}</select></label>
      <label>Smjena<select id="workerShift">${shiftSelectOptions(worker.shiftId)}</select></label><label>Fond godišnjeg<input id="workerAllowance" type="number" min="0" max="366" value="${Number(worker.vacationAllowance||0)}"></label>
      <label style="grid-column:1/-1">Nova RFID kartica<input id="workerCard" autocomplete="off" placeholder="${existing&&worker.card?'Ostavi prazno za postojeću '+escapeHtml(worker.card):'UID kartice, neobvezno'}"></label>
      </div><div class="btns"><button class="btn" data-bss-action="saveWorker(${existing?worker.id:'null'})">Spremi</button><button class="btn secondary" data-bss-action="closeModal()">Odustani</button></div></div>`;
    showModal(modal);
  }
  async function apiSaveWorker(id){
    if(currentRole!=='admin')return;
    const existing=id?workerById(id):null,department=departmentByName($('#workerDept')?.value),shift=shiftById($('#workerShift')?.value);
    const body={code:$('#workerCode')?.value.trim(),name:$('#workerName')?.value.trim(),email:$('#workerEmail')?.value.trim().toLowerCase()||null,departmentId:department?.apiId,shiftId:shift?.apiId,annualLeaveAllowance:Number($('#workerAllowance')?.value)};
    const card=$('#workerCard')?.value.trim();
    if(!body.code||!body.name||!department||!shift||!Number.isInteger(body.annualLeaveAllowance)){toast('Popuni šifru, ime, odjel, smjenu i fond godišnjeg.');return;}
    await mutateApi(async()=>{
      const saved=existing
        ?await BSS_API.patch(`/workers/${existing.apiId}`,body,revisionHeaders(existing.revision))
        :await BSS_API.post('/workers',body);
      if(card)await BSS_API.post(`/workers/${saved.id}/rfid-cards`,{uid:card});
    },existing?'Profil radnika je spremljen.':'Radnik je dodan.');
  }
  async function apiToggleWorker(id){
    const worker=workerById(id);if(currentRole!=='admin'||!worker)return;
    const action=worker.active?'deactivate':'activate';
    await mutateApi(()=>BSS_API.post(`/workers/${worker.apiId}/${action}`,undefined,revisionHeaders(worker.revision)),worker.active?'Radnik je deaktiviran.':'Radnik je ponovno aktivan.');
  }
  async function apiToggleCard(id){
    const worker=workerById(id);if(currentRole!=='admin'||!worker)return;
    if(!worker.cardApiId){toast('Dodijeli novu RFID karticu kroz profil radnika.');return;}
    if(worker.cardStatus!=='Aktivna'){toast('Blokirana kartica se ne aktivira ponovno; dodijeli novu karticu.');return;}
    await mutateApi(()=>BSS_API.post(`/rfid-cards/${worker.cardApiId}/block`),'RFID kartica je blokirana.');
  }

  async function apiSaveShift(id){
    if(currentRole!=='admin')return;
    const existing=id?shiftById(id):null,body={name:$('#shiftName')?.value.trim(),startTime:$('#shiftStart')?.value,endTime:$('#shiftEnd')?.value,breakMinutes:Number($('#shiftBreak')?.value),toleranceMinutes:Number($('#shiftTolerance')?.value)};
    if(!body.name||!body.startTime||!body.endTime||!Number.isInteger(body.breakMinutes)||!Number.isInteger(body.toleranceMinutes)){toast('Provjeri podatke smjene.');return;}
    await mutateApi(()=>existing?BSS_API.patch(`/shifts/${existing.apiId}`,body,revisionHeaders(existing.revision)):BSS_API.post('/shifts',body),'Smjena je spremljena.');
  }

  async function apiSubmitVacation(){
    if(currentRole!=='worker')return;
    const label=$('#vacType')?.value,body={typeCode:typeCode[label]||'annual_leave',startDate:$('#vacStart')?.value,endDate:$('#vacEnd')?.value,note:$('#vacNote')?.value.trim()||undefined};
    await mutateApi(()=>BSS_API.post('/leave-requests',body),'Zahtjev je poslan voditelju.');
  }
  async function apiDecideRequest(id,status,noteOverride=''){
    const request=state.requests.find(item=>item.id===Number(id));if(!request||!['admin','manager'].includes(currentRole))return;
    const decision=status==='Odobreno'?'approve':'reject',note=noteOverride||$('#requestDecisionNote')?.value.trim()||'';
    if(decision==='reject'&&!note){toast('Kod odbijanja upiši razlog.');return;}
    await mutateApi(()=>BSS_API.post(`/leave-requests/${request.apiId}/${decision}`,{note},revisionHeaders(request.revision)),status==='Odobreno'?'Zahtjev je odobren.':'Zahtjev je odbijen.');
  }
  async function apiCancelVacation(id){
    const request=state.requests.find(item=>item.id===Number(id));if(!request||currentRole!=='worker')return;
    await mutateApi(()=>BSS_API.post(`/leave-requests/${request.apiId}/cancel`,undefined,revisionHeaders(request.revision)),'Zahtjev je poništen.');
  }

  function asIso(date,time){return new Date(`${date}T${time}:00`).toISOString();}
  async function apiSubmitCorrection(){
    if(currentRole!=='worker')return;
    const date=$('#corrDate')?.value,start=$('#corrStart')?.value,end=$('#corrEnd')?.value,reason=$('#corrReason')?.value.trim();
    const record=state.records.find(item=>item.workerId===currentWorker().id&&item.date===date);
    if(!record?.apiId||!start||!end||!reason){toast('Odaberi postojeći zapis te unesi ispravno vrijeme i razlog.');return;}
    await mutateApi(()=>BSS_API.post('/correction-requests',{attendanceDayId:record.apiId,newCheckIn:asIso(date,start),newCheckOut:asIso(date,end),reason}),'Zahtjev za korekciju je poslan.');
  }
  async function apiUpdateCorrection(id,status){
    const correction=state.corrections.find(item=>item.id===Number(id));if(!correction||!['admin','manager'].includes(currentRole))return;
    const decision=status==='Odobreno'?'approve':'reject',note=decision==='reject'?'Odbijeno nakon provjere evidencije.':'Odobreno nakon provjere evidencije.';
    await mutateApi(()=>BSS_API.post(`/correction-requests/${correction.apiId}/${decision}`,{note},revisionHeaders(correction.revision)),status==='Odobreno'?'Korekcija je odobrena.':'Korekcija je odbijena.');
  }
  async function apiCancelCorrection(id){
    const correction=state.corrections.find(item=>item.id===Number(id));if(!correction||currentRole!=='worker')return;
    await mutateApi(()=>BSS_API.post(`/correction-requests/${correction.apiId}/cancel`,undefined,revisionHeaders(correction.revision)),'Korekcija je poništena.');
  }

  async function apiDownloadReport(format){
    if(!['admin','manager','accountant'].includes(currentRole)||!['csv','xlsx','pdf'].includes(format))return;
    reportFilters=normalizeReportFilters(reportFilters);const bounds=monthBounds(reportFilters.month),department=departmentByName(reportFilters.department),worker=reportFilters.workerId==='Svi'?null:workerById(reportFilters.workerId);
    apiLoading=true;
    try{
      let created=await BSS_API.post('/report-exports',{reportType:reportType[reportFilters.type],format,periodFrom:bounds.start,periodTo:bounds.end,departmentId:department?.apiId||null,workerId:worker?.apiId||null,attendanceStatus:null});
      for(let attempt=0;created.status!=='ready'&&attempt<10;attempt+=1){await new Promise(resolve=>setTimeout(resolve,250));created=await BSS_API.get(`/report-exports/${created.id}`);}
      if(created.status!=='ready')throw new Error('Izvještaj još nije spreman za preuzimanje.');
      const file=await BSS_API.download(created.downloadUrl||`/report-exports/${created.id}/download`);downloadBlob(file.blob,file.fileName);
      await hydrateApi();render();toast(`${format.toUpperCase()} izvještaj je preuzet.`);
    }catch(error){apiError=apiMessage(error);render();toast(apiError);}
    finally{apiLoading=false;}
  }

  async function apiSaveAccess(id){
    const user=accessUserById(id);if(currentRole!=='admin'||!user)return;
    const roleValue=$('#accessRole')?.value,status=$('#accessStatus')?.value,departments=[...document.querySelectorAll('.accessDept:checked')].map(item=>departmentByName(item.value)?.apiId).filter(Boolean);
    const body={role:apiRole[roleValue],status:status==='Aktivan'?'active':'blocked',departmentIds:apiRole[roleValue]==='manager'?departments:[]};
    await mutateApi(()=>BSS_API.patch(`/users/${user.apiId}`,body,revisionHeaders(user.revision)),'Korisnički pristup je spremljen.');
  }
  async function apiToggleAccess(id){
    const user=accessUserById(id);if(currentRole!=='admin'||!user)return;
    await mutateApi(()=>BSS_API.patch(`/users/${user.apiId}`,{status:user.status==='Aktivan'?'blocked':'active'},revisionHeaders(user.revision)),user.status==='Aktivan'?'Račun je blokiran.':'Račun je aktiviran.');
  }
  async function apiSendInvitation(){
    if(currentRole!=='admin')return;
    const email=$('#inviteEmail')?.value.trim().toLowerCase(),roleValue=$('#inviteRole')?.value,departments=[...document.querySelectorAll('.accessDept:checked')].map(item=>departmentByName(item.value)?.apiId).filter(Boolean),worker=state.workers.find(item=>item.email.toLowerCase()===email);
    if(!email||!apiRole[roleValue]){toast('Unesi email i ulogu.');return;}
    if(apiLoading)return;apiLoading=true;
    try{
      const result=await BSS_API.post('/users',{email,role:apiRole[roleValue],workerId:worker?.apiId||null,departmentIds:apiRole[roleValue]==='manager'?departments:[]});
      await hydrateApi();render();
      const modal=$('#modal');
      modal.innerHTML=`<div class="modal-card"><div class="modal-head"><div><h2>Pozivnica je spremna</h2><div class="small-muted">Sigurnu poveznicu dostavi korisniku zasebnim provjerenim kanalom.</div></div><button class="close-btn" data-bss-action="closeModal()">×</button></div><div class="notice info">Poveznica se prikazuje samo sada i vrijedi do ${escapeHtml(new Date(result.expiresAt).toLocaleString('hr-HR'))}.</div><label>Poveznica za aktivaciju<input readonly value="${escapeHtml(result.invitationUrl)}" aria-label="Poveznica za aktivaciju"></label><div class="btns"><button class="btn" data-bss-action="closeModal()">Gotovo</button></div></div>`;
      showModal(modal);
    }catch(error){render();toast(apiMessage(error));}
    finally{apiLoading=false;}
  }

  async function apiSaveSettings(){
    if(currentRole!=='admin')return;
    const body={name:$('#setName')?.value.trim(),taxIdentifier:$('#setOib')?.value.trim(),timezone:$('#setTimezone')?.value,approvedLeaveVisibility:$('#setLeaveVisibility')?.value};
    await mutateApi(()=>BSS_API.patch('/organization',body,revisionHeaders(state.company.revision)),'Postavke tvrtke su spremljene.');
  }
  function apiOpenDepartmentModal(id=null){
    if(currentRole!=='admin')return;const item=id?departmentById(id):null,modal=$('#modal');
    modal.innerHTML=`<div class="modal-card"><div class="modal-head"><h2>${item?'Uredi odjel':'Dodaj odjel'}</h2><button class="close-btn" data-bss-action="closeModal()">×</button></div><div class="form"><label>Naziv<input id="departmentName" value="${escapeHtml(item?.name||'')}"></label></div><div class="btns"><button class="btn" data-bss-action="saveDepartment(${item?item.id:'null'})">Spremi</button><button class="btn secondary" data-bss-action="closeModal()">Odustani</button></div></div>`;showModal(modal);
  }
  async function apiSaveDepartment(id){
    const item=id?departmentById(id):null,name=$('#departmentName')?.value.trim();if(!name)return toast('Unesi naziv odjela.');
    await mutateApi(()=>item?BSS_API.patch(`/departments/${item.apiId}`,{name},revisionHeaders(item.revision)):BSS_API.post('/departments',{name}),'Odjel je spremljen.');
  }
  async function apiToggleDepartment(id){
    const item=departmentById(id);if(!item||currentRole!=='admin')return;
    await mutateApi(()=>BSS_API.patch(`/departments/${item.apiId}`,{status:item.active?'blocked':'active'},revisionHeaders(item.revision)),item.active?'Odjel je deaktiviran.':'Odjel je aktiviran.');
  }
  function apiOpenHolidayModal(id=null){
    if(currentRole!=='admin')return;const item=id?state.holidays.find(value=>value.id===Number(id)):null,year=calendarYear||Number(DEMO_TODAY.slice(0,4)),modal=$('#modal');
    modal.innerHTML=`<div class="modal-card"><div class="modal-head"><h2>${item?'Uredi neradni dan':'Dodaj neradni dan'}</h2><button class="close-btn" data-bss-action="closeModal()">×</button></div><div class="form form-grid"><label>Datum<input id="holidayDate" type="date" min="${year}-01-01" max="${year}-12-31" value="${escapeHtml(item?.date||`${year}-12-24`)}"></label><label>Naziv<input id="holidayName" value="${escapeHtml(item?.name||'')}"></label></div><div class="btns"><button class="btn" data-bss-action="saveHoliday(${item?item.id:'null'})">Spremi</button><button class="btn secondary" data-bss-action="closeModal()">Odustani</button></div></div>`;showModal(modal);
  }
  async function replaceHolidays(items,message){
    await mutateApi(()=>BSS_API.put('/holidays',items.map(item=>({date:item.date,name:item.name})),revisionHeaders(state.holidayRevision)),message);
  }
  async function apiSaveHoliday(id){
    const date=$('#holidayDate')?.value,name=$('#holidayName')?.value.trim();if(!date||!name)return toast('Unesi datum i naziv.');
    const items=state.holidays.filter(item=>item.id!==Number(id));items.push({date,name});await replaceHolidays(items,'Neradni dan je spremljen.');
  }
  async function apiToggleHoliday(id){
    const item=state.holidays.find(value=>value.id===Number(id));if(!item)return;
    await replaceHolidays(state.holidays.filter(value=>value.id!==item.id),'Neradni dan je uklonjen iz kalendara.');
  }
  async function apiSetSharedLeaveVisibility(value){
    if(currentRole!=='admin'||!Object.hasOwn(visibilityLabel,value))return;
    await mutateApi(()=>BSS_API.patch('/organization',{approvedLeaveVisibility:value},revisionHeaders(state.company.revision)),'Vidljivost zajedničkog godišnjeg je spremljena.');
  }

  function apiViewShifts(){
    const isAdmin=currentRole==='admin';
    return `${title('Smjene i pravila','Zadana smjena radnika i obračunska pravila.',isAdmin?'<button class="btn" data-bss-action="openShiftModal()">Dodaj smjenu</button>':'')}
      <section class="card table-card"><div class="table-card-heading"><h2>Popis smjena</h2>${pill(`${state.shifts.length} smjena`)}</div><div class="table-wrap"><table class="compact-table"><thead><tr><th>Smjena</th><th>Vrijeme</th><th>Pauza</th><th>Tolerancija</th><th>Radnici</th><th>Radnja</th></tr></thead><tbody>${state.shifts.map(shift=>`<tr><td><b>${escapeHtml(shift.name)}</b></td><td>${escapeHtml(shift.start)} – ${escapeHtml(shift.end)}</td><td>${shift.breakMinutes} min</td><td>${shift.tolerance} min</td><td><button class="table-link" data-bss-action="openShiftWorkers(${shift.id})">${state.workers.filter(worker=>worker.shiftId===shift.id&&worker.active).length} · prikaži</button></td><td>${isAdmin?`<button class="table-detail-btn" data-bss-action="openShiftModal(${shift.id})">Uredi</button>`:'Samo čitanje'}</td></tr>`).join('')}</tbody></table></div></section>`;
  }
  function apiViewRoles(){
    const users=filteredAccessUsers();
    return `${title('Prava pristupa','Računi i uloge iz sigurnog backend opsega.','<button class="btn" data-bss-action="openInviteModal()">Pozovi korisnika</button>')}
      <section class="card table-card"><div class="table-card-heading"><h2>Korisnički računi</h2>${pill(`${users.length} računa`)}</div><div class="table-wrap"><table class="access-table"><thead><tr><th>Korisnik</th><th>Uloga</th><th>Opseg</th><th>Status</th><th>Radnje</th></tr></thead><tbody>${users.map(user=>`<tr><td><b>${escapeHtml(workerById(user.workerId)?.name||user.email)}</b><br><span class="small-muted">${escapeHtml(user.email)}</span></td><td>${escapeHtml(user.role)}</td><td>${escapeHtml(user.departments?.join(', ')||'Vlastiti ili organizacijski opseg')}</td><td>${pill(user.status)}</td><td><div class="table-actions"><button data-bss-action="openAccessModal(${user.id})">Uredi</button><button class="${user.status==='Aktivan'?'danger':''}" data-bss-action="toggleAccessUser(${user.id})">${user.status==='Aktivan'?'Blokiraj':'Aktiviraj'}</button></div></td></tr>`).join('')}</tbody></table></div></section>`;
  }
  function apiViewSettings(){
    const departments=state.departments.slice().sort((a,b)=>a.name.localeCompare(b.name,'hr')),holidays=state.holidays.slice().sort((a,b)=>a.date.localeCompare(b.date));
    let content='';
    if(settingsTab==='overview')content=`<div class="admin-kpis"><button data-bss-action="navigate('workers')"><span>Aktivni radnici</span><b>${activeWorkers().length}</b></button><button data-bss-action="setSettingsTab('organization')"><span>Aktivni odjeli</span><b>${departments.filter(item=>item.active).length}</b></button><button data-bss-action="navigate('shifts')"><span>Smjene</span><b>${state.shifts.length}</b></button><button data-bss-action="setSettingsTab('holidays')"><span>Neradni dani</span><b>${holidays.length}</b></button></div>`;
    if(settingsTab==='company')content=`<section class="card"><div class="card-heading"><h2>Tvrtka i pravilo vidljivosti</h2></div><div class="form form-grid"><label>Naziv<input id="setName" value="${escapeHtml(state.company.name)}"></label><label>OIB<input id="setOib" value="${escapeHtml(state.company.oib)}"></label><label>Vremenska zona<select id="setTimezone"><option ${state.company.timezone==='Europe/Zagreb'?'selected':''}>Europe/Zagreb</option><option ${state.company.timezone==='Europe/Berlin'?'selected':''}>Europe/Berlin</option></select></label><label>Zajednički godišnji<select id="setLeaveVisibility">${Object.entries(visibilityLabel).map(([value,label])=>`<option value="${value}" ${state.sharedLeaveVisibility===value?'selected':''}>${label}</option>`).join('')}</select></label></div><button class="btn" data-bss-action="saveSettings()">Spremi</button></section>`;
    if(settingsTab==='organization')content=`<section class="card"><div class="card-heading"><h2>Odjeli</h2><button class="btn small" data-bss-action="openDepartmentModal()">Dodaj odjel</button></div><div class="organization-list">${departments.map(item=>`<div class="organization-item"><div><b>${escapeHtml(item.name)}</b><span>${state.workers.filter(worker=>worker.apiDepartmentId===item.apiId&&worker.active).length} aktivnih radnika</span></div><div>${pill(item.active?'Aktivan':'Neaktivan')}<div class="table-actions"><button data-bss-action="openDepartmentModal(${item.id})">Uredi</button><button class="${item.active?'danger':''}" data-bss-action="toggleDepartment(${item.id})">${item.active?'Deaktiviraj':'Aktiviraj'}</button></div></div></div>`).join('')}</div></section>`;
    if(settingsTab==='holidays')content=`<section class="card"><div class="card-heading"><h2>Neradni dani ${calendarYear}.</h2><button class="btn" data-bss-action="openHolidayModal()">Dodaj dan</button></div><div class="holiday-list">${holidays.map(item=>`<div class="holiday-item"><time>${escapeHtml(isoLabel(item.date))}</time><div><b>${escapeHtml(item.name)}</b></div><div class="table-actions"><button data-bss-action="openHolidayModal(${item.id})">Uredi</button><button class="danger" data-bss-action="toggleHoliday(${item.id})">Ukloni</button></div></div>`).join('')||'<div class="empty-state">Nema neradnih dana.</div>'}</div></section>`;
    return `${title('Postavke i administracija','Postavke spremljene u organizacijskom opsegu.',pill(APP_STAGE))}${settingsTabs()}${content}`;
  }

  function sharedEntriesForDate(iso){return(state.sharedLeaveEntries||[]).filter(item=>item.startDate<=iso&&item.endDate>=iso);}
  function sharedMonth(year,index){
    const first=new Date(year,index,1),offset=(first.getDay()+6)%7,days=new Date(year,index+1,0).getDate();let cells='';
    for(let empty=0;empty<offset;empty+=1)cells+='<span class="day empty"></span>';
    for(let day=1;day<=days;day+=1){const iso=`${year}-${String(index+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`,items=sharedEntriesForDate(iso),names=items.map(item=>item.employeeName).join(', ');cells+=`<button class="day ${items.length?'approved':''}" data-bss-action="showSharedLeaveDay('${iso}')" ${items.length?'':'disabled'} aria-label="${escapeHtml(`${isoLabel(iso)}${names?`: ${names}`:''}`)}">${day}${items.length?`<span class="event-count">${items.length}</span>`:''}</button>`;}
    return `<div class="month"><h3>${escapeHtml(first.toLocaleDateString('hr-HR',{month:'long'}))}</h3><div class="weekdays"><span>P</span><span>U</span><span>S</span><span>Č</span><span>P</span><span>S</span><span>N</span></div><div class="days">${cells}</div></div>`;
  }
  function apiViewSharedLeave(){
    const entries=(state.sharedLeaveEntries||[]).filter(item=>item.startDate.slice(0,4)<=String(calendarYear)&&item.endDate.slice(0,4)>=String(calendarYear)),months=calendarMode==='year'?Array.from({length:12},(_,index)=>sharedMonth(calendarYear,index)).join(''):sharedMonth(calendarYear,calendarMonth);
    const control=currentRole==='admin'?`<div class="scope-switch">${Object.entries(visibilityLabel).map(([value,label])=>`<button class="${state.sharedLeaveVisibility===value?'active':''}" data-bss-action="setSharedLeaveVisibility('${value}')">${label}</button>`).join('')}</div>`:`<b>${escapeHtml(visibilityLabel[state.sharedLeaveVisibility]||'Dopušteni opseg')}</b>`;
    return `${title('Zajednički godišnji','Samo imena i odobrena razdoblja godišnjeg odmora.',pill(visibilityLabel[state.sharedLeaveVisibility]||'Dopušteni opseg'))}<section class="card shared-leave-scope-card"><div class="shared-scope-readonly"><span>Vidljivost</span>${control}</div><p>Bez bolovanja, razloga odsutnosti i drugih privatnih podataka.</p></section><div class="card"><div class="calendar-toolbar"><div class="calendar-controls"><button data-bss-action="changeCalendarPeriod(-1)">‹</button><b>${calendarMode==='year'?calendarYear:new Date(calendarYear,calendarMonth,1).toLocaleDateString('hr-HR',{month:'long',year:'numeric'})}</b><button data-bss-action="changeCalendarPeriod(1)">›</button></div><div class="view-switch"><button class="${calendarMode==='month'?'active':''}" data-bss-action="setCalendarMode('month')">Mjesec</button><button class="${calendarMode==='year'?'active':''}" data-bss-action="setCalendarMode('year')">Godina</button></div></div></div><div class="${calendarMode==='year'?'year-grid':'single-month'}">${months}</div><section class="card table-card"><div class="table-card-heading"><h2>Odobrena razdoblja</h2>${pill(`${entries.length} razdoblja`)}</div><div class="table-wrap"><table class="compact-table"><thead><tr><th>Zaposlenik</th><th>Od</th><th>Do</th></tr></thead><tbody>${entries.map(item=>`<tr><td><b>${escapeHtml(item.employeeName)}</b></td><td>${escapeHtml(isoLabel(item.startDate))}</td><td>${escapeHtml(isoLabel(item.endDate))}</td></tr>`).join('')||'<tr><td colspan="3"><div class="empty-state">Nema odobrenih godišnjih u dopuštenom opsegu.</div></td></tr>'}</tbody></table></div></section>`;
  }
  function apiShowSharedLeaveDay(iso){
    const items=sharedEntriesForDate(iso);if(!items.length)return;const modal=$('#modal');
    modal.innerHTML=`<div class="modal-card"><div class="modal-head"><h2>${escapeHtml(isoLabel(iso))}</h2><button class="close-btn" data-bss-action="closeModal()">×</button></div><div class="shared-leave-day-list">${items.map(item=>`<div class="shared-leave-person"><span class="avatar">${initials(item.employeeName)}</span><div><b>${escapeHtml(item.employeeName)}</b><span>${escapeHtml(rangeLabel(item.startDate,item.endDate))}</span></div></div>`).join('')}</div></div>`;showModal(modal);
  }

  function apiViewTerminal(){
    const terminal=state.terminal,events=terminal.recentEvents||[];
    if(!terminal.apiId)return `${title('Terminali','Uparivanje sigurnog RFID terminala.',pill('Nije uparen'))}<section class="card"><h2>Nema uparenog terminala</h2><p>Administrator može upariti uređaj jednokratnim aktivacijskim kodom.</p>${currentRole==='admin'?'<button class="btn" data-bss-action="pairTerminal()">Upari terminal</button>':''}</section>`;
    return `${title('Status terminala','Heartbeat i sinkronizirani RFID događaji iz backend API-ja.',pill(terminal.online?'Online':'Offline'))}<section class="card terminal-hero"><div><div class="eyebrow">${escapeHtml(terminal.location)}</div><h2>${escapeHtml(terminal.name)}</h2><p>Zadnji heartbeat: ${escapeHtml(terminal.lastHeartbeat)}</p></div>${currentRole==='admin'?`<button class="btn red" data-bss-action="revokeTerminal()">Opozovi terminal</button>`:''}</section><section class="card table-card"><div class="table-card-heading"><h2>Sinkronizirani događaji</h2>${pill(`${events.length} događaja`)}</div>${terminalEventsTable(events,'Još nema terminalskih događaja.')}</section>`;
  }
  function apiPairTerminal(){
    if(currentRole!=='admin')return;const modal=$('#modal');
    modal.innerHTML=`<div class="modal-card"><div class="modal-head"><h2>Upari terminal</h2><button class="close-btn" data-bss-action="closeModal()">×</button></div><div class="form"><label>Naziv<input id="terminalName"></label><label>Lokacija<input id="terminalLocation"></label><label>Aktivacijski kod<input id="terminalCode" type="password"></label></div><div class="btns"><button class="btn" data-bss-action="pairTerminal(true)">Upari</button><button class="btn secondary" data-bss-action="closeModal()">Odustani</button></div></div>`;showModal(modal);
  }
  async function apiPairTerminalSubmit(submit=false){
    if(!submit)return apiPairTerminal();
    const body={name:$('#terminalName')?.value.trim(),location:$('#terminalLocation')?.value.trim(),activationCode:$('#terminalCode')?.value};
    if(!body.name||!body.location||!body.activationCode)return toast('Popuni sve podatke terminala.');
    apiLoading=true;
    try{const result=await BSS_API.post('/terminals/pair',body);await hydrateApi();render();const modal=$('#modal');modal.innerHTML=`<div class="modal-card"><div class="modal-head"><h2>Terminal je uparen</h2><button class="close-btn" data-bss-action="closeModal()">×</button></div><div class="notice info">Spremi vjerodajnicu sada; prikazuje se samo jednom.</div><div class="muted-box"><code>${escapeHtml(result.deviceCredential)}</code></div><button class="btn" data-bss-action="closeModal()">Gotovo</button></div>`;showModal(modal);}catch(error){render();toast(apiMessage(error));}finally{apiLoading=false;}
  }
  async function apiRevokeTerminal(){
    if(currentRole!=='admin'||!state.terminal.apiId)return;
    await mutateApi(()=>BSS_API.post(`/terminals/${state.terminal.apiId}/revoke`,undefined,revisionHeaders(state.terminal.revision)),'Terminal je opozvan.');
  }

  function disabledDemoAction(){
    toast('Demo simulator je isključen; produkcijski podaci dolaze isključivo iz backend API-ja.');
  }

  Object.assign(root,{
    login:apiLogin,acceptInvitation:apiAcceptInvitation,logout:apiLogout,openWorkerModal:apiOpenWorkerModal,saveWorker:apiSaveWorker,toggleWorkerActive:apiToggleWorker,toggleCard:apiToggleCard,
    saveShift:apiSaveShift,toggleShift:()=>toast('Smjena s povijesnim zapisima ne deaktivira se u MVP-u.'),submitVacationRequest:apiSubmitVacation,decideRequest:apiDecideRequest,cancelVacationRequest:apiCancelVacation,
    submitCorrection:apiSubmitCorrection,updateCorrection:apiUpdateCorrection,cancelCorrection:apiCancelCorrection,downloadReport:apiDownloadReport,
    saveAccessUser:apiSaveAccess,toggleAccessUser:apiToggleAccess,sendInvitation:apiSendInvitation,sendPasswordReset:()=>toast('Reset lozinke nije dio zaključanog MVP ugovora.'),resendInvitation:()=>toast('Ponovno slanje pozivnice nije dio zaključanog MVP ugovora.'),cancelInvitation:()=>toast('Poništavanje pozivnice nije dio zaključanog MVP ugovora.'),
    saveSettings:apiSaveSettings,openDepartmentModal:apiOpenDepartmentModal,saveDepartment:apiSaveDepartment,toggleDepartment:apiToggleDepartment,openHolidayModal:apiOpenHolidayModal,saveHoliday:apiSaveHoliday,toggleHoliday:apiToggleHoliday,setSharedLeaveVisibility:apiSetSharedLeaveVisibility,
    saveJobPosition:()=>toast('Radna mjesta nisu zaseban MVP entitet.'),toggleJobPosition:()=>toast('Radna mjesta nisu zaseban MVP entitet.'),
    viewShifts:apiViewShifts,viewRoles:apiViewRoles,viewSettings:apiViewSettings,viewSharedLeave:apiViewSharedLeave,showSharedLeaveDay:apiShowSharedLeaveDay,viewTerminal:apiViewTerminal,pairTerminal:apiPairTerminalSubmit,revokeTerminal:apiRevokeTerminal,
    simulateTerminalOffline:disabledDemoAction,restoreTerminal:disabledDemoAction,simulateRfid:disabledDemoAction,
    toggleTerminalConnection:disabledDemoAction,syncOfflineQueue:disabledDemoAction,toggleDemoMode:disabledDemoAction,resetDemo:disabledDemoAction
  });

  void bootstrapApi();
})(typeof globalThis==='object'?globalThis:window);
