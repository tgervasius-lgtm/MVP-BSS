(function registerAttendanceUseCases(root){
  'use strict';

  function summarize(records,{today,recordMinutes,plannedShiftMinutes}){
    const list = Array.isArray(records) ? records : [];
    const completed = list.filter(record=>record.end);
    const workedMinutes = completed.reduce((sum,record)=>sum+recordMinutes(record),0);
    const plannedMinutes = completed.reduce((sum,record)=>sum+plannedShiftMinutes(record.workerId),0);
    const overtimeMinutes = completed.reduce((sum,record)=>sum+Math.max(0,recordMinutes(record)-plannedShiftMinutes(record.workerId)),0);
    return {
      records:list.length,
      completed:completed.length,
      active:list.filter(record=>record.date===today&&!record.end).length,
      late:list.filter(record=>record.status==='Kašnjenje').length,
      incomplete:list.filter(record=>record.status==='Nepotpun zapis').length,
      corrected:list.filter(record=>record.status==='Ispravljeno').length,
      review:list.filter(record=>['Kašnjenje','Nepotpun zapis'].includes(record.status)).length,
      workedMinutes,
      plannedMinutes,
      balanceMinutes:workedMinutes-plannedMinutes,
      overtimeMinutes
    };
  }

  function applyApprovedCorrection({correction,record,workerId,shiftBreakMinutes=0,id}){
    const created = !record;
    const next = created ? {
      id,
      workerId:Number(workerId),
      date:correction.date,
      start:correction.newStart,
      end:correction.newEnd,
      breakMinutes:Number(shiftBreakMinutes||0),
      status:'Ispravljeno'
    } : {
      ...record,
      start:correction.newStart,
      end:correction.newEnd,
      status:'Ispravljeno'
    };
    if(!created && next.end && !next.breakMinutes) next.breakMinutes=Number(shiftBreakMinutes||0);
    return {record:next,created};
  }

  const attendance = Object.freeze({summarize,applyApprovedCorrection});
  const useCases = Object.freeze({...root.BSSCore?.useCases,attendance});
  root.BSSCore = Object.freeze({...root.BSSCore,useCases});

  if(typeof module === 'object' && module.exports) module.exports = attendance;
})(typeof globalThis === 'object' ? globalThis : window);
