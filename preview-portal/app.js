import { ROLES, configureDemo, getGuide, startDemo, selectRole, registerEmployee, approveLeave, resolveCorrection, reviewWorker, generateReport, resetDemo } from './state.js';
import { getIndustryContext } from './industry-context.js';
import { createAnalytics, ANALYTICS_EVENTS } from './analytics.js';
import { createLivingOfficeController } from './living-office.js';
import { createBusinessSummaryPanel } from './business-summary.js';
import { createKpiDetailsPanel } from './kpi-details.js';
import { createRfidCardElement, createTerminalFeedback } from './terminal-effects.js';
import { createTerminalFixtures, createTerminalStatusPanel } from './terminal-status.js';
import { createCommandCenterPanel } from './command-center.js';

const enhancementStyles = document.createElement('link');
enhancementStyles.rel = 'stylesheet';
enhancementStyles.href = 'enhancements.css';
document.head.append(enhancementStyles);

let state = resetDemo();
let previousRole = state.activeRole;
let previousCompleted = 0;
let completionTracked = false;
const analytics = createAnalytics();
const terminalFeedback = createTerminalFeedback({ audioFactory: () => new (window.AudioContext || window.webkitAudioContext)() });
const byId = (id) => document.getElementById(id);
const elements = {
  welcome: byId('welcomeView'), demo: byId('demoView'), reset: byId('resetButton'), restart: byId('restartButton'),
  profileForm: byId('profileForm'), industry: byId('industryInput'), employees: byId('employeesInput'), locations: byId('locationsInput'), shifts: byId('shiftsInput'),
  profileIndustry: byId('profileIndustry'), profileEmployees: byId('profileEmployees'), profileMeta: byId('profileMeta'), companyContext: byId('companyContext'),
  scan: byId('scanButton'), count: byId('presentCount'), planned: byId('plannedCount'), screen: byId('terminalScreen'), feed: byId('activityFeed'),
  objective: byId('objectiveText'), status: byId('objectiveStatus'), roleLabel: byId('roleLabel'), approveLeave: byId('approveLeaveButton'),
  leaveStatus: byId('leaveStatus'), workerArrival: byId('workerArrival'), workerMessage: byId('workerMessage'), workerRow: byId('workerRow'), reviewWorker: byId('reviewWorkerButton'),
  resolveCorrection: byId('resolveCorrectionButton'), correctionStatus: byId('correctionStatus'), generateReport: byId('generateReportButton'), reportStatus: byId('reportStatus'),
  guideStep: byId('guideStep'), guideText: byId('guideText'), guideProgress: byId('guideProgress'), completion: byId('completionView')
};

const soundToggle = document.createElement('button');
soundToggle.type = 'button';
soundToggle.className = 'terminal-sound-toggle';
soundToggle.setAttribute('aria-pressed', 'false');
soundToggle.textContent = 'Zvuk: isključen';
soundToggle.addEventListener('click', () => {
  const enabled = terminalFeedback.setEnabled(!terminalFeedback.isEnabled());
  soundToggle.setAttribute('aria-pressed', String(enabled));
  soundToggle.textContent = enabled ? 'Zvuk: uključen' : 'Zvuk: isključen';
});
elements.scan.insertAdjacentElement('beforebegin', soundToggle);

const livingOffice = document.createElement('section');
livingOffice.className = 'living-office hidden';
livingOffice.setAttribute('aria-live', 'polite');
livingOffice.innerHTML = '<span class="living-office-dot" aria-hidden="true"></span><div><time id="livingOfficeTime">06:58</time><p id="livingOfficeEvent">Tvrtka se priprema za početak smjene.</p></div>';
elements.demo.prepend(livingOffice);
const livingOfficeTime = byId('livingOfficeTime');
const livingOfficeEvent = byId('livingOfficeEvent');
const livingController = createLivingOfficeController({ onFrame(frame) { livingOfficeTime.textContent = frame.time; livingOfficeEvent.textContent = frame.event; } });

const directorView = byId('directorView');
const commandCenter = createCommandCenterPanel();
directorView.prepend(commandCenter.element);
const kpiPanel = createKpiDetailsPanel();
directorView.append(kpiPanel.element);
const kpiIds = ['present', 'late', 'absent'];
document.querySelectorAll('#directorView .metrics .metric').forEach((metric, index) => {
  const kpiId = kpiIds[index];
  metric.dataset.kpi = kpiId;
  metric.tabIndex = 0;
  metric.setAttribute('role', 'button');
  metric.setAttribute('aria-label', `Otvori detalje: ${metric.querySelector('span')?.textContent ?? ''}`);
  const open = () => kpiPanel.show(kpiId, metric);
  metric.addEventListener('click', open);
  metric.addEventListener('keydown', (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); open(); } });
});

function profileInput() {
  return { industry: elements.industry.value, employees: elements.employees.value, locations: elements.locations.value, shifts: elements.shifts.value };
}

function renderTerminalNetwork(context) {
  directorView.querySelector('.terminal-status-panel')?.remove();
  const panel = createTerminalStatusPanel(createTerminalFixtures({ terminals: state.summary.terminals, primaryArea: context.area }));
  directorView.append(panel);
}

function renderProfile() {
  const { profile, summary } = state;
  const context = getIndustryContext(profile.industry);
  elements.profileIndustry.textContent = profile.industry;
  elements.profileEmployees.textContent = `${profile.employees} zaposlenika`;
  elements.profileMeta.textContent = `${profile.locations} lokacija · ${summary.terminals} terminala · ${profile.shifts} smjene`;
  elements.companyContext.textContent = `${profile.industry} · ${profile.employees} zaposlenika · ${context.moment}`;
  elements.count.textContent = String(state.presentCount);
  elements.planned.textContent = `od ${summary.planned} planirana`;
  document.documentElement.dataset.industry = profile.industry.toLowerCase();
  const terminalLabel = elements.screen.querySelector('small');
  if (terminalLabel && !state.scanned) terminalLabel.textContent = `Terminal: ${context.area}`;
  const managerHeading = document.querySelector('#managerView .eyebrow');
  if (managerHeading) managerHeading.textContent = context.manager;
  const teamHeading = document.querySelector('#managerView .workspace .panel .eyebrow');
  if (teamHeading) teamHeading.textContent = `${context.team} · ${Math.max(5, Math.round(profile.employees * 0.35))} radnika`;
  renderTerminalNetwork(context);
}

function animateRoleChange() {
  if (previousRole === state.activeRole) return;
  const activeView = byId(`${state.activeRole}View`);
  activeView?.classList.remove('role-enter');
  requestAnimationFrame(() => activeView?.classList.add('role-enter'));
  previousRole = state.activeRole;
}

function renderSummary(complete) {
  elements.completion.querySelector('.business-summary')?.remove();
  if (!complete) return;
  elements.completion.insertBefore(createBusinessSummaryPanel({ profile: state.profile, summary: state.summary, presentCount: state.presentCount }), elements.restart);
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
  if (!guide.complete) animateRoleChange();
  if (state.activeRole !== 'director' || guide.complete) kpiPanel.hide();
  renderSummary(guide.complete);
}

function renderGuide(guide) {
  elements.guideStep.textContent = String(Math.min(guide.completed + 1, guide.total));
  elements.guideText.textContent = guide.guide;
  elements.guideProgress.style.width = `${guide.progress}%`;
  livingOffice.classList.toggle('hidden', !state.started || guide.complete);
  if (state.started && !guide.complete) livingController.start(); else livingController.stop();
  commandCenter.update({
    profile: state.profile,
    summary: state.summary,
    presentCount: state.presentCount,
    completed: guide.completed,
    total: guide.total
  });
}

function renderAttendance() {
  const context = getIndustryContext(state.profile.industry);
  elements.count.textContent = String(state.presentCount);
  if (state.scanned) {
    elements.screen.classList.add('success');
    elements.screen.innerHTML = `<span class="terminal-icon">✓</span><strong>Dobro došli, Ivan Horvat</strong><small>07:01 · ${context.area}</small>`;
    elements.scan.disabled = true;
    elements.scan.textContent = 'Prijava je evidentirana';
    elements.objective.textContent = 'Zadatak je završen. Nastavljate kao administrator.';
    elements.status.textContent = 'Završeno';
    elements.status.classList.add('complete');
    elements.workerArrival.textContent = '07:01';
    elements.workerMessage.textContent = `Vaša današnja prijava uspješno je evidentirana na terminalu ${context.area}.`;
    elements.workerRow.textContent = '07:01 – smjena u tijeku';
    if (!byId('ivanEvent')) {
      const event = document.createElement('li');
      event.id = 'ivanEvent';
      event.innerHTML = `<span>07:01</span> Ivan Horvat se prijavio · ${context.area}.`;
      elements.feed.append(event);
    }
  } else {
    elements.screen.classList.remove('success');
    elements.screen.innerHTML = `<span class="terminal-icon">RFID</span><strong>Spremno za prijavu</strong><small>Terminal: ${context.area}</small>`;
    elements.scan.disabled = false;
    elements.scan.textContent = 'Simuliraj karticu Ivana Horvata';
    elements.status.textContent = 'U tijeku';
    elements.status.classList.remove('complete');
    byId('ivanEvent')?.remove();
  }
}

function renderAction(button, status, done, pendingText, doneText) {
  status.textContent = done ? doneText : pendingText;
  status.classList.toggle('complete', done);
  button.disabled = done;
}

function trackProgress(guide) {
  if (guide.completed > previousCompleted) {
    analytics.track(ANALYTICS_EVENTS.MISSION_COMPLETED, { step: guide.completed, profile: state.profile });
    previousCompleted = guide.completed;
  }
  if (guide.complete && !completionTracked) {
    analytics.track(ANALYTICS_EVENTS.DEMO_COMPLETED, { profile: state.profile });
    completionTracked = true;
  }
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
  trackProgress(guide);
}

function apply(action) { state = action(state); render(); }

async function simulateRfidScan() {
  if (state.scanned || elements.scan.disabled) return;
  elements.scan.disabled = true;
  elements.screen.append(createRfidCardElement());
  elements.screen.classList.add('reading');
  await new Promise((resolve) => window.setTimeout(resolve, 520));
  apply(registerEmployee);
  void terminalFeedback.playSuccess();
}

elements.profileForm.addEventListener('input', () => { state = configureDemo(state, profileInput()); analytics.track(ANALYTICS_EVENTS.DEMO_CONFIGURED, { profile: state.profile }); render(); });
elements.profileForm.addEventListener('submit', (event) => { event.preventDefault(); state = configureDemo(state, profileInput()); analytics.track(ANALYTICS_EVENTS.DEMO_STARTED, { profile: state.profile }); apply(startDemo); });
elements.scan.addEventListener('click', simulateRfidScan);
elements.resolveCorrection.addEventListener('click', () => apply(resolveCorrection));
elements.approveLeave.addEventListener('click', () => apply(approveLeave));
elements.reviewWorker.addEventListener('click', () => apply(reviewWorker));
elements.generateReport.addEventListener('click', () => apply(generateReport));
elements.reset.addEventListener('click', () => { livingController.stop(); kpiPanel.hide(); state = resetDemo(); previousRole = state.activeRole; previousCompleted = 0; completionTracked = false; render(); });
elements.restart.addEventListener('click', () => { analytics.track(ANALYTICS_EVENTS.DEMO_RESTARTED, { profile: state.profile }); livingController.reset(); kpiPanel.hide(); state = startDemo(resetDemo(state.profile)); previousRole = state.activeRole; previousCompleted = 0; completionTracked = false; render(); });
document.querySelectorAll('.role-button').forEach((button) => button.addEventListener('click', () => { state = selectRole(state, button.dataset.role); analytics.track(ANALYTICS_EVENTS.ROLE_VIEWED, { role: state.activeRole, profile: state.profile }); render(); }));

render();
