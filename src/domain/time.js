(function registerTimeDomain(root){
  'use strict';

  function isoToDate(iso){ return new Date(`${iso}T12:00:00`); }

  function timeToMinutes(value){
    if(!/^\d{2}:\d{2}$/.test(value || '')) return null;
    const [hour,minute] = value.split(':').map(Number);
    return hour * 60 + minute;
  }

  function recordMinutes(record,{includeActive=false,today='',now=''}={}){
    const start = timeToMinutes(record?.start);
    let end = timeToMinutes(record?.end);
    if(start === null) return 0;
    if(end === null && includeActive && record?.date === today) end = timeToMinutes(now);
    if(end === null) return 0;
    if(end < start) end += 1440;
    return Math.max(0,end-start-Number(record?.breakMinutes||0));
  }

  function formatMinutes(minutes){
    const value = Math.max(0,Math.round(Number(minutes)||0));
    return `${Math.floor(value/60)}:${String(value%60).padStart(2,'0')} h`;
  }

  function businessDays(start,end,holidayDates=[]){
    if(!start || !end || end < start) return 0;
    const holidays = holidayDates instanceof Set ? holidayDates : new Set(holidayDates);
    let count = 0;
    const cursor = isoToDate(start);
    const finish = isoToDate(end);
    while(cursor <= finish){
      const iso = cursor.toISOString().slice(0,10);
      const day = cursor.getDay();
      if(day !== 0 && day !== 6 && !holidays.has(iso)) count += 1;
      cursor.setDate(cursor.getDate()+1);
    }
    return count;
  }

  function plannedShiftMinutes(shift){
    if(!shift) return 0;
    const start = timeToMinutes(shift.start);
    const rawEnd = timeToMinutes(shift.end);
    if(start === null || rawEnd === null) return 0;
    const end = rawEnd <= start ? rawEnd+1440 : rawEnd;
    return Math.max(0,end-start-Number(shift.breakMinutes||0));
  }

  function intervalsOverlap(startA,endA,startB,endB){
    return startA <= endB && startB <= endA;
  }

  const time = Object.freeze({
    isoToDate,
    timeToMinutes,
    recordMinutes,
    formatMinutes,
    businessDays,
    plannedShiftMinutes,
    intervalsOverlap
  });
  root.BSSCore = Object.freeze({...root.BSSCore,time});

  if(typeof module === 'object' && module.exports) module.exports = time;
})(typeof globalThis === 'object' ? globalThis : window);
