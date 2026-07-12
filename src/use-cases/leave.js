(function registerLeaveUseCases(root){
  'use strict';

  const statuses = root.BSSCore?.contracts?.requestStatus;

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

  const leave = Object.freeze({validateSubmission,createRequest,decide,cancel});
  const useCases = Object.freeze({...root.BSSCore?.useCases,leave});
  root.BSSCore = Object.freeze({...root.BSSCore,useCases});

  if(typeof module === 'object' && module.exports) module.exports = leave;
})(typeof globalThis === 'object' ? globalThis : window);
