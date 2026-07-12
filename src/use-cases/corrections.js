(function registerCorrectionUseCases(root){
  'use strict';

  const statuses = root.BSSCore?.contracts?.requestStatus;
  const attendance = root.BSSCore?.useCases?.attendance;

  function validateSubmission({workerId,date,newStart,newEnd,reason,today,records,corrections,timeToMinutes}){
    if(!date||(!newStart&&!newEnd)||!reason)return {ok:false,code:'REQUIRED_FIELDS'};
    if(date>today)return {ok:false,code:'FUTURE_DATE'};
    const startMinutes=timeToMinutes(newStart),endMinutes=timeToMinutes(newEnd);
    if((newStart&&startMinutes===null)||(newEnd&&endMinutes===null))return {ok:false,code:'INVALID_TIME'};
    if(newStart&&newEnd&&startMinutes===endMinutes)return {ok:false,code:'EQUAL_TIMES'};
    if(newStart&&newEnd){
      const duration=(endMinutes<startMinutes?endMinutes+1440:endMinutes)-startMinutes;
      if(duration>960)return {ok:false,code:'TOO_LONG',duration};
    }
    const duplicate=(corrections||[]).find(correction=>
      correction.workerId===Number(workerId)&&correction.date===date&&correction.status===statuses.PENDING
    );
    if(duplicate)return {ok:false,code:'DUPLICATE_PENDING',duplicate};
    const record=(records||[]).find(item=>item.workerId===Number(workerId)&&item.date===date);
    const oldStart=record?.start||'',oldEnd=record?.end||'';
    if(newStart===oldStart&&newEnd===oldEnd)return {ok:false,code:'UNCHANGED',record};
    return {ok:true,record,oldStart,oldEnd};
  }

  function createRequest({id,workerId,date,oldStart,oldEnd,newStart,newEnd,reason}){
    return {
      id,
      workerId:Number(workerId),
      date,
      oldStart,
      oldEnd,
      newStart,
      newEnd,
      reason,
      status:statuses.PENDING
    };
  }

  function decide(correction,{status,record,workerId,shiftBreakMinutes,id}){
    if(!correction||correction.status!==statuses.PENDING)return {ok:false,code:'NOT_PENDING'};
    if(![statuses.APPROVED,statuses.REJECTED].includes(status))return {ok:false,code:'INVALID_STATUS'};
    const result={ok:true,correction:{...correction,status},record:null,created:false};
    if(status===statuses.APPROVED){
      const applied=attendance.applyApprovedCorrection({correction,record,workerId,shiftBreakMinutes,id});
      result.record=applied.record;
      result.created=applied.created;
    }
    return result;
  }

  const corrections = Object.freeze({validateSubmission,createRequest,decide});
  const useCases = Object.freeze({...root.BSSCore?.useCases,corrections});
  root.BSSCore = Object.freeze({...root.BSSCore,useCases});

  if(typeof module === 'object' && module.exports) module.exports = corrections;
})(typeof globalThis === 'object' ? globalThis : window);
