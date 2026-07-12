(function registerAccessPolicies(root){
  'use strict';

  function visibleWorkers(role,workers,roleConfig={}){
    const list = Array.isArray(workers) ? workers : [];
    if(role === 'admin') return list;
    if(role === 'manager'){
      const departments = Array.isArray(roleConfig.departments) ? roleConfig.departments : [];
      return list.filter(worker=>departments.includes(worker.dept));
    }
    if(role === 'worker') return list.filter(worker=>worker.id === Number(roleConfig.userId));
    return [];
  }

  function canViewWorker(role,workerId,workers,roleConfig={}){
    return visibleWorkers(role,workers,roleConfig).some(worker=>worker.id === Number(workerId));
  }

  function canViewScopedEntity(role,workerId,workers,roleConfig={}){
    if(role === 'admin' || role === 'accountant') return true;
    return canViewWorker(role,workerId,workers,roleConfig);
  }

  function canApprove(role){ return role === 'admin' || role === 'manager'; }
  function canManageOrganization(role){ return role === 'admin'; }
  function canExportReports(role){ return role === 'admin' || role === 'manager' || role === 'accountant'; }

  const access = Object.freeze({
    visibleWorkers,
    canViewWorker,
    canViewScopedEntity,
    canApprove,
    canManageOrganization,
    canExportReports
  });
  root.BSSCore = Object.freeze({...root.BSSCore,access});

  if(typeof module === 'object' && module.exports) module.exports = access;
})(typeof globalThis === 'object' ? globalThis : window);
