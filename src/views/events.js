(function registerViewEvents(root){
  'use strict';

  const actionNames=Object.freeze([
    'applyAttendanceFilters','applyAuditFilters','applyReportFilters','applyRequestSearch','applyWorkerSearch',
    'cancelInvitation','cancelVacationRequest','changeCalendarPeriod','clearAttendanceFilters','clearAuditFilters',
    'clearRequestFilters','closeDrawer','closeModal','decideRequest','demoOfflineScan','demoScan','demoUnknownCard',
    'downloadReport','login','logout','navigate','openAccessModal','openAttendanceRecord','openAttendanceReview',
    'openAttendanceStatus','openCancelRequest','openCorrectionsFromRecord','openDepartmentModal','openDrawer',
    'openHolidayModal','openInviteModal','openJobPositionModal','openRequestDecision','openResetDemoDialog',
    'openShiftModal','openWorker','openWorkerModal','openWorkerStatus','refreshWorkerJobOptions','resendInvitation',
    'resetDemo','restoreTerminal','saveAccessUser','saveDepartment','saveHoliday','saveJobPosition','saveSettings',
    'saveShift','saveWorker','sendInvitation','sendPasswordReset','setAccessStatusFilter','setAttendanceView',
    'setCalendarMode','setMyTimeMonth','setReportType','setRequestStatusFilter','setSettingsTab',
    'setVacationDepartment','setWorkerDetailTab','setWorkerTab','showVacationDay','simulateTerminalOffline',
    'startCorrectionFromRecord','submitCorrection','submitVacationRequest','switchRole','toggleAccessDepartmentFields',
    'toggleAccessUser','toggleCard','toggleDemoMode','toggleDepartment','toggleHoliday','toggleJobPosition','toggleShift',
    'toggleTheme','toggleWorkerActive','updateCorrection','updateCorrectionPreview','updateReportDepartment',
    'updateVacationRequestPreview'
  ]);
  const allowedActions=new Set(actionNames);

  function splitArguments(source){
    if(!source.trim())return[];
    const tokens=[];
    let token='',quote='',escaped=false;
    for(const char of source){
      if(escaped){token+=char;escaped=false;continue;}
      if(char==='\\'){token+=char;escaped=true;continue;}
      if(quote){token+=char;if(char===quote)quote='';continue;}
      if(char==="'"||char==='"'){quote=char;token+=char;continue;}
      if(char===','){tokens.push(token.trim());token='';continue;}
      token+=char;
    }
    if(quote)throw new Error('Nezatvoren argument akcije.');
    tokens.push(token.trim());
    return tokens;
  }

  function parseArgument(token,element){
    if(token==='this.value')return element?.value;
    if(token==='null')return null;
    if(token==='true')return true;
    if(token==='false')return false;
    if(/^-?\d+(?:\.\d+)?$/.test(token))return Number(token);
    const quote=token[0];
    if((quote==="'"||quote==='"')&&token.at(-1)===quote){
      return token.slice(1,-1).replace(/\\([\\'"nrt])/g,(match,char)=>({n:'\n',r:'\r',t:'\t'}[char]||char));
    }
    throw new Error(`Nedopušten argument akcije: ${token}`);
  }

  function parse(expression,element){
    const match=String(expression||'').trim().match(/^([A-Za-z][A-Za-z0-9_]*)\((.*)\)$/s);
    if(!match||!allowedActions.has(match[1]))return null;
    try{return {name:match[1],args:splitArguments(match[2]).map(token=>parseArgument(token,element))};}
    catch(error){return null;}
  }

  function dispatch(expression,element,event){
    const action=parse(expression,element);
    const handler=action&&root[action.name];
    if(typeof handler!=='function')return false;
    if(event?.cancelable&&element?.tagName==='A')event.preventDefault();
    handler(...action.args);
    return true;
  }

  function onClick(event){
    const target=event.target instanceof root.Element?event.target:null;
    const actionElement=target?.closest('[data-bss-action]');
    if(actionElement){dispatch(actionElement.dataset.bssAction,actionElement,event);return;}
    const backdrop=target?.closest('[data-bss-backdrop]');
    if(backdrop&&target===backdrop)dispatch(`${backdrop.dataset.bssBackdrop}()`,backdrop,event);
  }

  function onChange(event){
    const target=event.target instanceof root.Element?event.target:null;
    if(target?.matches('[data-bss-change]'))dispatch(target.dataset.bssChange,target,event);
  }

  function onKeydown(event){
    if(event.key!=='Enter')return;
    const target=event.target instanceof root.Element?event.target:null;
    const actionElement=target?.closest('[role="button"][data-bss-action]');
    if(!actionElement||['BUTTON','INPUT','SELECT','TEXTAREA','A'].includes(actionElement.tagName))return;
    event.preventDefault();
    dispatch(actionElement.dataset.bssAction,actionElement,event);
  }

  function start(document=root.document){
    if(!document||document.documentElement.dataset.bssEventsBound==='true')return;
    document.documentElement.dataset.bssEventsBound='true';
    document.addEventListener('click',onClick);
    document.addEventListener('change',onChange);
    document.addEventListener('keydown',onKeydown);
  }

  const events=Object.freeze({actionNames,parse,dispatch,start});
  const views=Object.freeze({...root.BSSCore?.views,events});
  root.BSSCore=Object.freeze({...root.BSSCore,views});
  start();

  if(typeof module==='object'&&module.exports)module.exports=events;
})(typeof globalThis==='object'?globalThis:window);
