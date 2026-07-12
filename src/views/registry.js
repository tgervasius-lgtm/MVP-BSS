(function registerScreenRegistry(root){
  'use strict';

  const screens = Object.freeze({
    home:'viewHome',
    attendance:'viewAttendance',
    mytime:'viewMyTime',
    workers:'viewWorkers',
    worker:'viewWorker',
    shifts:'viewShifts',
    requests:'viewRequests',
    vacations:'viewVacations',
    corrections:'viewCorrections',
    reports:'viewReports',
    terminal:'viewTerminal',
    terminalDemo:'viewTerminalDemo',
    flow:'viewFlow',
    roles:'viewRoles',
    audit:'viewAudit',
    settings:'viewSettings'
  });

  function resolve(screen,scope=root){
    const handlerName=screens[screen]||screens.home;
    const handler=scope[handlerName];
    if(typeof handler!=='function')throw new Error(`BSS prikaz nije dostupan: ${handlerName}`);
    return handler;
  }

  function render(screen,scope=root){ return resolve(screen,scope)(); }
  function has(screen){ return Object.hasOwn(screens,screen); }

  const registry=Object.freeze({screens,resolve,render,has});
  const views=Object.freeze({...root.BSSCore?.views,registry});
  root.BSSCore=Object.freeze({...root.BSSCore,views});

  if(typeof module==='object'&&module.exports)module.exports=registry;
})(typeof globalThis==='object'?globalThis:window);
