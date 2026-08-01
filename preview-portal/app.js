import { INITIAL_STATE, ROLES, startDemo, selectRole, registerEmployee, approveLeave, resolveCorrection, generateReport, resetDemo } from './state.js';

let state = { ...INITIAL_STATE };
const byId = (id) => document.getElementById(id);
const elements = {
  welcome: byId('welcomeView'), demo: byId('demoView'), start: byId('startButton'), reset: byId('resetButton'),
  scan: byId('scanButton'), count: byId('presentCount'), screen: byId('terminalScreen'), feed: byId('activityFeed'),
  objective: byId('objectiveText'), status: byId('objectiveStatus'), roleLabel: byId('roleLabel'),
  approveLeave: byId('approveLeaveButton'), leaveStatus: byId('leaveStatus'), workerArrival: byId('workerArrival'),
  workerMessage: byId('workerMessage'), workerRow: byId('workerRow'), resolveCorrection: byId('resolveCorrectionButton'),
  correctionStatus: byId('correctionStatus'), generateReport: byId('generateReportButton'), reportStatus: byId('reportStatus')
};

function renderRole() {
  elements.roleLabel.textContent = ROLES[state.activeRole];
  document.querySelectorAll('.role-view').forEach((view) => view.classList.add('hidden'));
  byId(`${state.activeRole}View`).classList.remove('hidden');
  document.querySelectorAll('.role-button').forEach((button) => {
    const active = button.dataset.role === state.activeRole;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });
}

function renderAttendance() {
  elements.count.textContent = String(state.presentCount);
  if (state.scanned) {
    elements.screen.classList.add('success');
    elements.screen.innerHTML = '<span class="terminal-icon">✓</span><strong>Dobro došli, Ivan Horvat</strong><small>07:01 · Prijava evidentirana</small>';
    elements.scan.disabled = true;
    elements.scan.textContent = 'Prijava je evidentirana';
    elements.objective.textContent = 'Zadatak je završen. Isti događaj vidljiv je kroz sve relevantne uloge.';
    elements.status.textContent = 'Završeno';
    elements.status.classList.add('complete');
    elements.workerArrival.textContent = '07:01';
    elements.workerMessage.textContent = 'Vaša današnja prijava uspješno je evidentirana na terminalu Ulaz proizvodnja.';
    elements.workerRow.textContent = '07:01 – smjena u tijeku';
    if (!byId('ivanEvent')) {
      const event = document.createElement('li');
      event.id = 'ivanEvent';
      event.innerHTML = '<span>07:01</span> Ivan Horvat se prijavio putem RFID terminala.';
      elements.feed.append(event);
    }
  } else {
    elements.screen.classList.remove('success');
    elements.screen.innerHTML = '<span class="terminal-icon">RFID</span><strong>Spremno za prijavu</strong><small>Terminal: Ulaz proizvodnja</small>';
    elements.scan.disabled = false;
    elements.scan.textContent = 'Simuliraj karticu Ivana Horvata';
    elements.objective.textContent = 'Evidentirajte dolazak Ivana Horvata na virtualnom terminalu.';
    elements.status.textContent = 'U tijeku';
    elements.status.classList.remove('complete');
    elements.workerArrival.textContent = '—';
    elements.workerMessage.textContent = 'Vaša današnja prijava još nije evidentirana.';
    elements.workerRow.textContent = 'Čeka prijavu';
    byId('ivanEvent')?.remove();
  }
}

function renderLeave() {
  elements.leaveStatus.textContent = state.leaveApproved ? 'Odobreno' : 'Čeka odluku';
  elements.leaveStatus.classList.toggle('complete', state.leaveApproved);
  elements.approveLeave.disabled = state.leaveApproved;
  elements.approveLeave.textContent = state.leaveApproved ? 'Zahtjev je odobren' : 'Odobri zahtjev';
}

function renderCorrection() {
  elements.correctionStatus.textContent = state.correctionResolved ? 'Korekcija potvrđena' : 'Za provjeru';
  elements.correctionStatus.classList.toggle('complete', state.correctionResolved);
  elements.resolveCorrection.disabled = state.correctionResolved;
  elements.resolveCorrection.textContent = state.correctionResolved ? 'Korekcija je evidentirana' : 'Potvrdi korekciju';
}

function renderReport() {
  elements.reportStatus.textContent = state.reportGenerated ? 'Spreman za preuzimanje' : 'Nije generiran';
  elements.reportStatus.classList.toggle('complete', state.reportGenerated);
  elements.generateReport.disabled = state.reportGenerated;
  elements.generateReport.textContent = state.reportGenerated ? 'Izvještaj je generiran' : 'Generiraj izvještaj';
}

function render() {
  elements.welcome.classList.toggle('hidden', state.started);
  elements.demo.classList.toggle('hidden', !state.started);
  renderRole();
  renderAttendance();
  renderLeave();
  renderCorrection();
  renderReport();
}

elements.start.addEventListener('click', () => { state = startDemo(state); render(); });
elements.scan.addEventListener('click', () => { state = registerEmployee(state); render(); });
elements.approveLeave.addEventListener('click', () => { state = approveLeave(state); render(); });
elements.resolveCorrection.addEventListener('click', () => { state = resolveCorrection(state); render(); });
elements.generateReport.addEventListener('click', () => { state = generateReport(state); render(); });
elements.reset.addEventListener('click', () => { state = resetDemo(); render(); });
document.querySelectorAll('.role-button').forEach((button) => button.addEventListener('click', () => {
  state = selectRole(state, button.dataset.role);
  render();
}));

render();
