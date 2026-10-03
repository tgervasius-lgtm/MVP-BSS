(function registerNavigationOperational(root){
  'use strict';

  const primaryByRole=Object.freeze({
    admin:Object.freeze(['home','attendance','workers','sharedLeave','requests','reports']),
    manager:Object.freeze(['home','attendance','workers','vacations','requests']),
    worker:Object.freeze(['home','mytime','vacations','sharedLeave','requests']),
    accountant:Object.freeze(['home','reports','sharedLeave'])
  });

  function primaryItems(role,navigation){
    const ids=primaryByRole[role]||['home'];
    return (navigation[role]||[]).filter(item=>ids.includes(item[0]));
  }

  const navigationOperational=Object.freeze({primaryByRole,primaryItems});
  const views=Object.freeze({...root.BSSCore?.views,navigationOperational});
  root.BSSCore=Object.freeze({...root.BSSCore,views});

  if(typeof module==='object'&&module.exports)module.exports=navigationOperational;
})(typeof globalThis==='object'?globalThis:window);
