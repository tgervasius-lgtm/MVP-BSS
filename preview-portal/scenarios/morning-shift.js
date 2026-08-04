export const MORNING_SHIFT_SCENARIO = Object.freeze({
  id: 'morning-shift-v1',
  title: 'Početak jutarnje smjene',
  company: 'BSSProject d.o.o.',
  steps: Object.freeze([
    Object.freeze({ id: 'attendance', role: 'admin', event: 'EMPLOYEE_CHECKED_IN', title: 'Evidentirajte dolazak Ivana Horvata.', guide: 'U modulu Uprava > Terminali prislonite virtualnu RFID karticu i pratite promjenu broja prisutnih.' }),
    Object.freeze({ id: 'correction', role: 'admin', event: 'CORRECTION_RESOLVED', title: 'Potvrdite nedostajuću odjavu.', guide: 'Pregledajte predloženu korekciju Petra Novaka i ostavite audit trag.' }),
    Object.freeze({ id: 'leave', role: 'manager', event: 'LEAVE_APPROVED', title: 'Odlučite o zahtjevu za godišnji.', guide: 'Provjerite kapacitet tima i odobrite zahtjev Ane Kovač.' }),
    Object.freeze({ id: 'worker-leave', role: 'worker', event: 'WORKER_LEAVE_SUBMITTED', title: 'Pošaljite zahtjev radnika.', guide: 'U Radničkom modulu Godišnji pošaljite simulirani zahtjev Ivana Horvata.' }),
    Object.freeze({ id: 'report', role: 'accounting', event: 'REPORT_GENERATED', title: 'Pripremite obračunski paket.', guide: 'Generirajte simulirani izvještaj za knjigovodstvo.' })
  ])
});
