(function registerContracts(root){
  'use strict';

  const roles = Object.freeze({
    ADMIN: 'admin',
    MANAGER: 'manager',
    WORKER: 'worker',
    ACCOUNTANT: 'accountant'
  });

  const requestStatus = Object.freeze({
    PENDING: 'Na čekanju',
    APPROVED: 'Odobreno',
    REJECTED: 'Odbijeno',
    CANCELLED: 'Poništeno',
    labels: Object.freeze(['Na čekanju','Odobreno','Odbijeno','Poništeno']),
    activeLabels: Object.freeze(['Na čekanju','Odobreno'])
  });

  const attendanceStatus = Object.freeze({
    ACTIVE: 'Aktivno',
    COMPLETE: 'Uredno',
    LATE: 'Kašnjenje',
    INCOMPLETE: 'Nepotpun zapis',
    CORRECTED: 'Ispravljeno'
  });

  const terminalEventStatus = Object.freeze({
    QUEUED: 'Čeka sinkronizaciju',
    SYNCED: 'Sinkronizirano',
    DUPLICATE: 'Duplikat',
    REJECTED: 'Odbijeno'
  });

  const contracts = Object.freeze({roles,requestStatus,attendanceStatus,terminalEventStatus});
  root.BSSCore = Object.freeze({...root.BSSCore,contracts});

  if(typeof module === 'object' && module.exports) module.exports = contracts;
})(typeof globalThis === 'object' ? globalThis : window);
