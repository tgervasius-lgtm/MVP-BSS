import { INITIAL_STATE, ROLES, configureDemo, getGuide, startDemo, selectRole, registerEmployee, approveLeave, resolveCorrection, reviewWorker, generateReport, resetDemo } from './state.js';

let state = resetDemo();
const byId = (id) => document.getElementById(id);
const elements = {
  welcome: byId('welcomeView'), demo: byId('demoView'), start: byId('startButton'), reset: byId('resetButton'), restart: byId('restartButton'),
  profileForm: byId('profileForm'), industry: byId('industryInput'), employees: byId('employeesInput'), locations: byId('locationsInput'), shifts: byId('shiftsInput'),
  profileIndustry: byId('profileIndustry'), profileEmployees: byId('profileEmployees'), profileMeta: byId('profileMeta'), companyContext: byId('companyContext'),
  scan: byId('scanButton'), count: byId('presentCount'), planned: byId('plannedCount'), screen: byId('terminalScreen'), feed: byId('activityFeed'),
  objective: byId('objectiveText'), status: byId('objectiveStatus'), roleLabel: byId('roleLabel'),
  approveLeave: byId('approveLeaveButton'), leaveStatus: byId('leaveStatus'), workerArrival: byId('workerArrival'),
  workerMessage: byId('workerMessage'), workerRow: byId('workerRow'), reviewWorker: byId('reviewWorkerButton'),
  resolveCorrection: byId('resolveCorrectionButton'), correctionStatus: byId('correctionStatus'),
  generateReport: byId('generateReportButton'), reportStatus: byId('reportStatus'),
  guideStep: byId('guideStep'), guideText: byId('guideText'), guideProgress: byId('guideProgress'), completion: byId('completionView')
};

function profileInput() {
  return {
    industry: elements.industry.value,
    employees: elements.employees.value,
    locations: elements.locations.value,
    shifts: elements.shifts.value
  };
}

function renderProfile() {
  const { profile, summary } = state;
  elements.profileIndustry.textContent = profile.industry;
  elements.profileEmployees.textContent = `${profile.employees} zaposlenika`;
  elements.profileMeta.textContent = `${profile.locations} lokacija · ${summary.terminals} terminala · ${profile.shifts} smjene`;
  elements.companyContext.textContent = `Simulacija za djelatnost ${profile.industry.toLowerCase()} · ${profile.employees} zaposlenika`;
  elements.count.textContent = String(state.presentCount);
  elements.planned.textContent = `od ${summary.planned} planirana`;
}

function renderRole(guide) {
  elements.roleLabel.textContent = guide.complete ? 'Završeno' : ROLES[state.activeRole];
  document.querySelectorAll('.role-view').forEach((view) => view.classList.add('hidden'));
  elements.completion.classList.toggle('hidden', !guide.complete);
  if (!guide.complete) byId(`${state.activeRole}View`).classList.remove('hidden');
  document.querySelectorAll('.role-button').forEach((button) => {
    const active = !guide.complete && button.dataset.role === state.activeRole;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });
}

function renderGuide(guide) {
  elements.guideStep.textContent = String(Math.min(guide.completed + 1, guide.total));
  elements.guideText.textContent = guide.guide;
  elements.guideProgress.style.width = `${guide.progress}%`;
}

function renderAttendance() {
  elements.count.textContent = String(state.presentCount);
  if (state.scanned) {
    elements.screen.classList.add('success');
    elements.screen.innerHTML = '<span class="terminal-icon">✓</span><strong>Dobro došli, Ivan Horvat</strong><small>07:01 · Prijava evidentirana</small>';
    elements.scan.disabled = true;
    elements.scan.textContent = 'Prijava je evidentirana';
    elements.objective.textContent = 'Zadatak je završen. Nastavljate kao administrator.';
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
    elements.scan.disabled = false;
    elements.status.classList.remove('complete');
    byId('ivanEvent')?.remove();
  }
}

function renderAction(button, status, done, pendingText, doneText) {
  status.textContent = done ? doneText : pendingText;
  status.classList.toggle('complete', done);
  button.disabled = done;
}

function render() {
  const guide = getGuide(state);
  elements.welcome.classList.toggle('hidden', state.started);
  elements.demo.classList.toggle('hidden', !state.started);
  renderProfile();
  renderRole(guide);
  renderGuide(guide);
  renderAttendance();
  renderAction(elements.resolveCorrection, elements.correctionStatus, state.correctionResolved, 'Za provjeru', 'Korekcija potvrđena');
  renderAction(elements.approveLeave, elements.leaveStatus, state.leaveApproved, 'Čeka odluku', 'Odobreno');
  renderAction(elements.generateReport, elements.reportStatus, state.reportGenerated, 'Nije generiran', 'Spreman za preuzimanje');
  elements.reviewWorker.disabled = state.workerReviewed;
  elements.reviewWorker.textContent = state.workerReviewed ? 'Podaci su potvrđeni' : 'Potvrdi da su podaci jasni';
}

function apply(action) {
  state = action(state);
  render();
}

elements.profileForm.addEventListener('input', () => {
  state = configureDemo(state, profileInput());
  render();
});
elements.profileForm.addEventListener('submit', (event) => {
  event.preventDefault();
  state = configureDemo(state, profileInput());
  apply(startDemo);
});
elements.scan.addEventListener('click', () => apply(registerEmployee));
elements.resolveCorrection.addEventListener('click', () => apply(resolveCorrection));
elements.approveLeave.addEventListener('click', () => apply(approveLeave));
elements.reviewWorker.addEventListener('click', () => apply(reviewWorker));
elements.generateReport.addEventListener('click', () => apply(generateReport));
elements.reset.addEventListener('click', () => { state = resetDemo(); render(); });
elements.restart.addEventListener('click', () => { state = startDemo(resetDemo(state.profile)); render(); });
document.querySelectorAll('.role-button').forEach((button) => button.addEventListener('click', () => {
  state = selectRole(state, button.dataset.role);
  render();
}));

render();
