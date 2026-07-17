(function registerApiState(root){
  'use strict';

  const roleLabels={admin:'Administrator',manager:'Voditelj',worker:'Radnik',accountant:'Knjigovođa'};
  const requestLabels={pending:'Na čekanju',approved:'Odobreno',rejected:'Odbijeno',cancelled:'Poništeno'};
  const leaveLabels={annual_leave:'Godišnji odmor',paid_leave:'Plaćeni dopust',unpaid_leave:'Neplaćeni dopust',free_day:'Slobodan dan'};
  const attendanceLabels={active:'Aktivno',complete:'Uredno',late:'Kašnjenje',incomplete:'Nepotpun zapis',corrected:'Ispravljeno'};
  const terminalEventLabels={queued:'Čeka sinkronizaciju',synced:'Sinkronizirano',duplicate:'Duplikat',rejected:'Odbijeno'};

  function localTime(value){
    if(!value)return'';
    return new Date(value).toLocaleTimeString('hr-HR',{hour:'2-digit',minute:'2-digit',hour12:false});
  }
  function localDateTime(value){
    if(!value)return'';
    return new Date(value).toLocaleString('hr-HR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}).replace(',','.');
  }
  function dateRange(year){return{from:`${year}-01-01`,to:`${year}-12-31`};}
  function settledValue(result,fallback){return result?.status==='fulfilled'?result.value:fallback;}

  async function hydrate(api,session,today){
    const role=session.user.role,year=today.slice(0,4),range=dateRange(year);
    const clientIds=new Map();let sequence=0;
    const id=value=>{
      if(!value)return 0;
      const key=String(value);
      if(!clientIds.has(key))clientIds.set(key,++sequence);
      return clientIds.get(key);
    };

    const tasks={dashboard:api.get('/dashboard-summary',{date:today}),holidays:api.getWithMeta('/holidays',{year})};
    Object.assign(tasks,{
      leaveRequests:api.get('/leave-requests',range),leaveBalances:api.get('/leave-balances',{year}),
      approvedLeave:api.get('/approved-leave-calendar',range)
    });
    if(role!=='accountant')tasks.corrections=api.get('/correction-requests',range);
    if(['admin','manager'].includes(role)){
      Object.assign(tasks,{
        departments:api.get('/departments'),workers:api.get('/workers',{limit:200}),shifts:api.get('/shifts'),
        attendance:api.get('/attendance',{...range,limit:200}),terminals:api.get('/terminals')
      });
    }else if(role==='worker'&&session.effectiveScope.selfWorkerId){
      Object.assign(tasks,{
        departments:api.get('/departments'),shifts:api.get('/shifts'),
        selfWorker:api.get(`/workers/${session.effectiveScope.selfWorkerId}`),
        attendance:api.get(`/workers/${session.effectiveScope.selfWorkerId}/attendance`,range)
      });
    }
    if(role==='admin')Object.assign(tasks,{organization:api.get('/organization'),users:api.get('/users',{limit:200}),audit:api.get('/audit-events',{...range,limit:200})});
    if(['admin','manager','accountant'].includes(role))tasks.reports=api.get('/report-exports',{limit:50});

    const keys=Object.keys(tasks),results=await Promise.allSettled(Object.values(tasks));
    const data=Object.fromEntries(keys.map((key,index)=>[key,settledValue(results[index],null)]));
    const failedIndex=results.findIndex(result=>result.status==='rejected');
    if(failedIndex>=0)throw results[failedIndex].reason;

    const departments=(data.departments||[]).map(item=>({id:id(item.id),apiId:item.id,name:item.name,code:item.name.slice(0,8).toLocaleUpperCase('hr'),managerId:null,active:item.status==='active',revision:item.revision}));
    const departmentNames=new Map(departments.map(item=>[item.apiId,item.name]));
    const shifts=(data.shifts||[]).map(item=>({id:id(item.id),apiId:item.id,name:item.name,start:item.startTime,end:item.endTime,breakMinutes:item.breakMinutes,tolerance:item.toleranceMinutes,active:true,revision:item.revision}));
    const shiftIds=new Map(shifts.map(item=>[item.apiId,item.id]));
    const workerSource=data.workers?.items||(data.selfWorker?[data.selfWorker]:[]);
    const workers=workerSource.map(item=>({
      id:id(item.id),apiId:item.id,code:item.code,name:item.name,email:item.email||'',dept:departmentNames.get(item.departmentId)||'—',apiDepartmentId:item.departmentId,
      jobTitle:item.code,shiftId:shiftIds.get(item.shiftId)||0,apiShiftId:item.shiftId,status:'Odsutna',card:'',cardApiId:null,cardStatus:'Nije dodijeljena',todayStart:'',
      active:item.status==='active',vacationAllowance:item.annualLeaveAllowance,revision:item.revision
    }));
    const workerByApi=new Map(workers.map(item=>[item.apiId,item]));
    const ensureWorker=apiId=>{
      if(!apiId)return null;
      if(workerByApi.has(apiId))return workerByApi.get(apiId);
      const user=(data.users?.items||[]).find(item=>item.workerId===apiId);
      const worker={id:id(apiId),apiId,code:String(apiId).slice(0,8),name:user?.email||`Radnik ${String(apiId).slice(0,8)}`,email:user?.email||'',dept:'—',apiDepartmentId:null,jobTitle:'',shiftId:0,apiShiftId:null,status:'Odsutna',card:'',cardApiId:null,cardStatus:'Nije dodijeljena',todayStart:'',active:true,vacationAllowance:0,revision:'0'};
      workers.push(worker);workerByApi.set(apiId,worker);return worker;
    };
    ensureWorker(session.effectiveScope.selfWorkerId);

    if(['admin','manager'].includes(role)){
      const cardResults=await Promise.allSettled(workerSource.map(worker=>api.get(`/workers/${worker.id}/rfid-cards`)));
      cardResults.forEach((result,index)=>{
        if(result.status!=='fulfilled')return;
        const worker=workerByApi.get(workerSource[index]?.id),card=result.value.find(item=>item.status==='active')||result.value[0];
        if(worker&&card){worker.card=card.maskedUid;worker.cardApiId=card.id;worker.cardStatus=card.status==='active'?'Aktivna':'Blokirana';worker.cardRevision=card.revision;}
      });
    }

    const records=(data.attendance?.items||[]).map(item=>{
      const worker=ensureWorker(item.workerId);
      const record={id:id(item.id),apiId:item.id,workerId:worker.id,date:item.workDate,start:localTime(item.checkIn),end:localTime(item.checkOut),breakMinutes:item.breakMinutes,status:attendanceLabels[item.status]||item.status,workedMinutes:item.workedMinutes,plannedMinutes:item.plannedMinutes,balanceMinutes:item.balanceMinutes,revision:item.revision};
      if(item.workDate===today&&worker){worker.todayStart=record.start;worker.status=item.checkIn&&!item.checkOut?(item.status==='late'?'Kasni':'Prisutan'):record.status;}
      return record;
    });

    const requests=(data.leaveRequests?.items||[]).map(item=>{
      const worker=ensureWorker(item.workerId);
      if(item.status==='approved'&&today>=item.startDate&&today<=item.endDate&&worker)worker.status='Godišnji';
      return {id:id(item.id),apiId:item.id,workerId:worker.id,type:leaveLabels[item.typeCode]||item.typeCode,typeCode:item.typeCode,start:item.startDate,end:item.endDate,note:item.note||'',workingDays:item.workingDays,status:requestLabels[item.status]||item.status,submittedAt:localDateTime(item.submittedAt),decidedBy:item.decidedBy,decidedAt:localDateTime(item.decidedAt),decisionNote:item.decisionNote||'',revision:item.revision};
    });
    const recordByApi=new Map(records.map(item=>[item.apiId,item]));
    const corrections=(data.corrections?.items||[]).map(item=>{
      const record=recordByApi.get(item.attendanceDayId),worker=ensureWorker(item.workerId);
      return {id:id(item.id),apiId:item.id,attendanceDayApiId:item.attendanceDayId,workerId:worker.id,date:record?.date||String(item.newValues?.checkIn||'').slice(0,10),oldStart:localTime(item.oldValues?.checkIn),oldEnd:localTime(item.oldValues?.checkOut),newStart:localTime(item.newValues?.checkIn),newEnd:localTime(item.newValues?.checkOut),reason:item.reason,status:requestLabels[item.status]||item.status,decisionNote:item.decisionNote||'',revision:item.revision};
    });
    const balances=new Map((data.leaveBalances?.items||[]).map(item=>[item.workerId,item]));
    workers.forEach(worker=>{const balance=balances.get(worker.apiId);if(balance){worker.vacationAllowance=balance.allowanceDays;worker.leaveBalance=balance;}});

    const users=(data.users?.items||[]).map(item=>({id:id(item.id),apiId:item.id,workerId:ensureWorker(item.workerId)?.id||null,email:item.email,role:roleLabels[item.role]||item.role,roleCode:item.role,departments:(item.departmentIds||[]).map(departmentId=>departmentNames.get(departmentId)||departmentId),apiDepartmentIds:item.departmentIds||[],status:item.status==='active'?'Aktivan':'Blokiran',lastLogin:'',revision:item.revision}));
    const audit=(data.audit?.items||[]).map(item=>({id:id(item.id),apiId:item.id,time:localDateTime(item.createdAt),user:item.actorType==='terminal'?'Terminal':users.find(user=>user.apiId===item.actorId)?.email||item.actorType, module:item.module,action:item.action,entityType:item.entityType,entityId:item.entityId,requestId:item.requestId}));
    const reportHistory=(data.reports?.items||[]).map(item=>({id:id(item.id),apiId:item.id,action:item.status==='ready'?'Generiran':'Status',format:item.format.toLocaleUpperCase('hr'),type:item.reportType,period:`${item.filters.periodFrom} – ${item.filters.periodTo}`,scope:'Poslužiteljski opseg',rows:item.rowCount||0,time:localDateTime(item.createdAt),status:item.status,downloadUrl:item.downloadUrl}));
    const terminalItem=(data.terminals||[])[0]||null;
    let syncEvents=[];
    if(terminalItem){
      try{syncEvents=(await api.get(`/terminals/${terminalItem.id}/sync-events`,range)).items||[];}catch{syncEvents=[];}
    }
    const terminal=terminalItem?{
      id:id(terminalItem.id),apiId:terminalItem.id,name:terminalItem.name,location:terminalItem.location,online:terminalItem.status==='online',unsynced:terminalItem.queueDepth||0,scans:syncEvents.length,
      lastSync:terminalItem.lastSeenAt?localDateTime(terminalItem.lastSeenAt):'Nema sinkronizacije',lastHeartbeat:terminalItem.lastSeenAt?localDateTime(terminalItem.lastSeenAt):'Nema heartbeat-a',version:'',queue:[],revision:terminalItem.revision,
      recentEvents:syncEvents.map(item=>({eventId:item.deviceEventId,workerId:ensureWorker(item.workerId)?.id||0,label:ensureWorker(item.workerId)?.name||'Nepoznata kartica',type:item.eventType==='check_in'?'Prijava':'Odjava',time:localTime(item.occurredAt),mode:'API',status:terminalEventLabels[item.status]||item.status})),syncRuns:[]
    }:{id:null,apiId:null,name:'Nema uparenog terminala',location:'',online:false,unsynced:0,scans:0,lastSync:'Nema podataka',lastHeartbeat:'Nema podataka',version:'',queue:[],recentEvents:[],syncRuns:[],revision:'0'};

    const organization=data.organization||session.organization;
    const company={name:organization.name,oib:organization.taxIdentifier||'',address:'',timezone:organization.timezone,workTime:'',contactEmail:'',phone:'',defaultVacationAllowance:20,revision:organization.revision};
    const holidays=(data.holidays?.data||[]).map(item=>({id:id(item.id),apiId:item.id,date:item.date,name:item.name,type:'Neradni dan',protected:false,active:true,revision:item.revision}));
    const state={version:9,demoMode:false,sharedLeaveVisibility:data.approvedLeave?.visibility||'department',sharedLeaveEntries:data.approvedLeave?.items||[],company,departments,jobPositions:[],holidays,holidayRevision:data.holidays?.etag||'0',shifts,workers,accessUsers:users,invitations:[],security:{inviteValidityHours:72,passwordResetValidityMinutes:30,sessionMinutes:480},records,requests,corrections,audit,terminal,lastScan:null,lastReport:reportHistory[0]?`${reportHistory[0].format} · ${reportHistory[0].time}`:'Nije još generiran',reportHistory,leaveBalances:data.leaveBalances?.items||[],dashboard:data.dashboard};
    return {state,role,session,dashboard:data.dashboard,selfWorkerId:id(session.effectiveScope.selfWorkerId)};
  }

  const apiState=Object.freeze({hydrate,roleLabels,requestLabels,leaveLabels,attendanceLabels});
  root.BSSCore=Object.freeze({...root.BSSCore,apiState});
  if(typeof module==='object'&&module.exports)module.exports=apiState;
})(typeof globalThis==='object'?globalThis:window);
