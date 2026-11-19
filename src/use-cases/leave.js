(function registerLeaveUseCases(root){
  'use strict';

  const statuses = root.BSSCore?.contracts?.requestStatus;

  function balanceSummary({workerId,worker,year,requests,balances,businessDays,allowDerived}){
    const balance=balances?.find(item=>item.year===Number(year)&&item.workerId===worker?.apiId)??worker?.leaveBalance;
    if(balance?.year===Number(year)){
      return {
        allowance:balance.allowanceDays,
        used:balance.approvedDays,
        reserved:balance.plannedDays,
        remaining:balance.remainingDays,
        available:balance.availableDays
      };
    }
    if(!allowDerived)return null;

    const annualRequests=requests.filter(request=>
      request.workerId===Number(workerId)&&request.type==='Godišnji odmor'&&request.start.startsWith(String(year)));
    const daysFor=status=>annualRequests.filter(request=>request.status===status)
      .reduce((sum,request)=>sum+businessDays(request.start,request.end),0);
    const allowance=Number(worker?.vacationAllowance||0);
    const used=daysFor(statuses.APPROVED);
    const reserved=daysFor(statuses.PENDING);
    return {allowance,used,reserved,remaining:Math.max(0,allowance-used),available:Math.max(0,allowance-used-reserved)};
  }

  function requestDateLimit(start,today,coveredAnnual){
    const year=coveredAnnual?Number(today.slice(0,4))+1:start.slice(0,4);
    return `${year}-12-31`;
  }

  function coveredRequestPreview(start,end,workerId,balances,holidays){
    const startYear=Number(start.slice(0,4)),endYear=Number(end.slice(0,4));
    const days=(Date.parse(end)-Date.parse(start))/86400000+1;
    if(days>366)return 'Razdoblje ne smije biti dulje od 366 dana.';
    const parts=[];
    let shortfall=false;
    for(let year=startYear;year<=endYear;year+=1){
      const firstDay=year===startYear?start:`${year}-01-01`;
      const lastDay=year===endYear?end:`${year}-12-31`;
      const requested=root.BSSCore.time.businessDays(firstDay,lastDay,holidays);
      if(!requested)continue;
      const balance=balances.find(item=>item.workerId===workerId&&item.year===year);
      if(!balance){
        parts.push(`${year}. · traženo ${requested} · fond se provjerava pri slanju`);
        continue;
      }
      const missing=Math.max(0,requested-balance.availableDays);
      const figures=`${year}. · traženo ${requested} · dostupno ${balance.availableDays}`;
      parts.push(missing?`${figures} · nedostaje ${missing}`:figures);
      shortfall||=missing>0;
    }
    if(!parts.length)return 'Odabrano razdoblje nema radnih dana.';
    const summary=parts.join(' / ');
    return shortfall?`${summary}. Zahtjev možeš poslati.`:summary;
  }

  function validateSubmission({
    workerId,type,start,end,today,year,requests,availableDays,
    businessDays,intervalsOverlap
  }){
    if(!start||!end||end<start)return {ok:false,code:'INVALID_RANGE'};
    if(start<=today)return {ok:false,code:'NOT_FUTURE'};
    if(!start.startsWith(`${year}-`)||!end.startsWith(`${year}-`))return {ok:false,code:'OUTSIDE_YEAR',year};
    const days=businessDays(start,end);
    if(days===0)return {ok:false,code:'NO_WORKING_DAYS'};
    const ownOverlap=(requests||[]).find(request=>
      request.workerId===Number(workerId)&&statuses.activeLabels.includes(request.status)&&
      intervalsOverlap(start,end,request.start,request.end)
    );
    if(ownOverlap)return {ok:false,code:'OVERLAP',overlap:ownOverlap,days};
    if(type==='Godišnji odmor'&&days>Number(availableDays||0)){
      return {ok:false,code:'INSUFFICIENT_BALANCE',available:Number(availableDays||0),days};
    }
    return {ok:true,days};
  }

  function createRequest({id,workerId,type,start,end,note,submittedAt}){
    return {
      id,
      workerId:Number(workerId),
      type,
      start,
      end,
      note:note||'Bez dodatne napomene.',
      status:statuses.PENDING,
      submittedAt
    };
  }

  function decide(request,{status,note,actor,decidedAt}){
    if(!request||request.status!==statuses.PENDING)return {ok:false,code:'NOT_PENDING'};
    if(![statuses.APPROVED,statuses.REJECTED].includes(status))return {ok:false,code:'INVALID_STATUS'};
    if(status===statuses.REJECTED&&!note)return {ok:false,code:'REJECTION_NOTE_REQUIRED'};
    return {
      ok:true,
      request:{
        ...request,
        status,
        decidedBy:actor,
        decidedAt,
        decisionNote:note||(status===statuses.APPROVED?'Odobreno bez dodatne napomene.':'')
      }
    };
  }

  function cancel(request,{workerId,actor='Radnik',decidedAt}){
    if(!request||request.workerId!==Number(workerId)||request.status!==statuses.PENDING){
      return {ok:false,code:'NOT_CANCELLABLE'};
    }
    return {
      ok:true,
      request:{
        ...request,
        status:statuses.CANCELLED,
        decidedBy:actor,
        decidedAt,
        decisionNote:'Zahtjev je poništio radnik.'
      }
    };
  }

  const leave = Object.freeze({balanceSummary,requestDateLimit,coveredRequestPreview,validateSubmission,createRequest,decide,cancel});
  const useCases = Object.freeze({...root.BSSCore?.useCases,leave});
  root.BSSCore = Object.freeze({...root.BSSCore,useCases});

  if(typeof module === 'object' && module.exports) module.exports = leave;
})(typeof globalThis === 'object' ? globalThis : window);
