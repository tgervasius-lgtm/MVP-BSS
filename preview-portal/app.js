import { ROLES, configureDemo, getGuide, startDemo, selectRole, registerEmployee, approveLeave, resolveCorrection, reviewWorker, generateReport, resetDemo } from './state.js';
import { getIndustryContext } from './industry-context.js';
import { createAnalytics, ANALYTICS_EVENTS } from './analytics.js';
import { createLivingOfficeController } from './living-office.js';
import { createBusinessSummaryPanel } from './business-summary.js';
import { createKpiDetailsPanel } from './kpi-details.js';
import { createRfidCardElement, createTerminalFeedback } from './terminal-effects.js';
import { createTerminalFixtures, createTerminalStatusPanel } from './terminal-status.js';
import { createCommandCenterPanel } from './command-center.js';
import { createCancellableDelay } from './cancellable-delay.js';
import { buildOperationalMetrics } from './operational-metrics.js';

const enhancementStyles = document.createElement('link');
enhancementStyles.rel = 'stylesheet';
enhancementStyles.href = 'enhancements.css';
document.head.append(enhancementStyles);

let state = resetDemo();
let previousRole = state.activeRole;
let completionTracked = false;
let experienceMode = 'free';
let scanPending = false;
const analytics = createAnalytics();
const terminalFeedback = createTerminalFeedback({ audioFactory: () => new (window.AudioContext || window.webkitAudioContext)() });
const scanDelay = createCancellableDelay();
const byId = (id) => document.getElementById(id);
const elements = {
  welcome: byId('welcomeView'), demo: byId('demoView'), reset: byId('resetButton'), restart: byId('restartButton'), roleSwitcher: document.querySelector('.role-switcher'),
  profileForm: byId('profileForm'), industry: byId('industryInput'), employees: byId('employeesInput'), locations: byId('locationsInput'), shifts: byId('shiftsInput'),
  modeInputs: document.querySelectorAll('input[name="experienceMode"]'), activeProfile: byId('activeProfile'),
  profileIndustry: byId('profileIndustry'), profileEmployees: byId('profileEmployees'), profileMeta: byId('profileMeta'), companyContext: byId('companyContext'),
  scan: byId('scanButton'), count: byId('presentCount'), planned: byId('plannedCount'), screen: byId('terminalScreen'), feed: byId('activityFeed'),
  objective: byId('objectiveText'), status: byId('objectiveStatus'), roleLabel: byId('roleLabel'), approveLeave: byId('approveLeaveButton'),
  leaveStatus: byId('leaveStatus'), workerArrival: byId('workerArrival'), workerMessage: byId('workerMessage'), workerRow: byId('workerRow'), reviewWorker: byId('reviewWorkerButton'),
  resolveCorrection: byId('resolveCorrectionButton'), correctionStatus: byId('correctionStatus'), generateReport: byId('generateReportButton'), reportStatus: byId('reportStatus'),
  guideTitle: byId('guideTitle'), guideStep: byId('guideStep'), guideText: byId('guideText'), guideDetails: byId('guideDetails'), guideProgressBar: byId('guideProgressBar'), guideProgress: byId('guideProgress'), completion: byId('completionView')
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
const kpiPanel = createKpiDetailsPanel({ getMetrics: () => buildOperationalMetrics({
  profile: state.profile,
  summary: state.summary,
  presentCount: state.presentCount
}) });
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

function selectedExperienceMode() {
  return [...elements.modeInputs].find((input) => input.checked)?.value === 'assisted' ? 'assisted' : 'free';
}

function renderTerminalNetwork(context) {
  directorView.querySelector('.terminal-status-panel')?.remove();
  const panel = createTerminalStatusPanel(createTerminalFixtures({ terminals: state.summary.terminals, primaryArea: context.area }));
  directorView.append(panel);
}

function renderProfile() {
  const { profile, summary } = state;
  const context = getIndustryContext(profile.industry);
  const metrics = buildOperationalMetrics({ profile, summary, presentCount: state.presentCount });
  elements.profileIndustry.textContent = profile.industry;
  const employeeLabel = plural(profile.employees, 'zaposlenik', 'zaposlenika', 'zaposlenika');
  elements.profileEmployees.textContent = `${profile.employees} ${employeeLabel}`;
  elements.profileMeta.textContent = `${profile.locations} ${plural(profile.locations, 'lokacija', 'lokacije', 'lokacija')} · ${summary.terminals} ${plural(summary.terminals, 'terminal', 'terminala', 'terminala')} · ${profile.shifts} ${plural(profile.shifts, 'smjena', 'smjene', 'smjena')}`;
  elements.companyContext.textContent = `${profile.industry} · ${profile.employees} ${employeeLabel} · ${context.moment}`;
  const activeProfileText = `${profile.industry} · ${profile.employees} ${employeeLabel}`;
  if (elements.activeProfile.textContent !== activeProfileText) elements.activeProfile.textContent = activeProfileText;
  elements.count.textContent = String(state.presentCount);
  elements.planned.textContent = `od ${summary.planned} ${plural(summary.planned, 'planiranog zaposlenika', 'planirana zaposlenika', 'planiranih zaposlenika')}`;
  byId('lateCount').textContent = String(metrics.late);
  byId('absentCount').textContent = String(metrics.absent);
  byId('managerTeamSize').textContent = String(metrics.teamSize);
  byId('managerPresentCount').textContent = String(metrics.teamPresent);
  byId('managerLateCount').textContent = String(metrics.teamLate);
  byId('managerSickCount').textContent = String(metrics.teamSick);
  byId('monthlyHours').textContent = formatNumber(metrics.monthlyHours);
  byId('regularHours').textContent = formatNumber(metrics.regularHours);
  byId('nightHours').textContent = formatNumber(metrics.nightHours);
  byId('overtimeHours').textContent = formatNumber(metrics.overtimeHours);
  document.documentElement.dataset.industry = profile.industry.toLowerCase();
  const terminalLabel = elements.screen.querySelector('small');
  if (terminalLabel && !state.scanned) terminalLabel.textContent = `Terminal: ${context.area}`;
  const managerHeading = document.querySelector('#managerView .eyebrow');
  if (managerHeading) managerHeading.textContent = context.manager;
  byId('managerTeamLabel').textContent = context.team;
  renderTerminalNetwork(context);
}

function formatNumber(value) {
  return new Intl.NumberFormat('hr-HR').format(value);
}

function plural(value, one, few, many) {
  const mod10 = value % 10;
  const mod100 = value % 100;
  if (value === 1) return one;
  if (mod10 >= 2 && mod10 <= 4 && !(mod100 >= 12 && mod100 <= 14)) return few;
  return many;
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
  elements.roleLabel.textContent = ROLES[state.activeRole];
  elements.roleSwitcher.classList.remove('hidden');
  document.querySelectorAll('.role-view').forEach((view) => view.classList.add('hidden'));
  elements.completion.classList.toggle('hidden', !guide.complete);
  byId(`${state.activeRole}View`).classList.remove('hidden');
  document.querySelectorAll('.role-button').forEach((button) => {
    const active = button.dataset.role === state.activeRole;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });
  animateRoleChange();
  if (state.activeRole !== 'director') kpiPanel.hide();
  renderSummary(guide.complete);
}

function renderGuide(guide) {
  const guideTitle = guide.complete
    ? 'Isprobali ste sve ključne mogućnosti.'
    : 'Vaše demo okruženje je spremno.';
  const guideStep = String(guide.completed);
  const guideText = guide.complete
    ? 'Sve ključne mogućnosti su isprobane. Demo sustav možete nastaviti slobodno koristiti.'
    : guide.guide;
  if (elements.guideTitle.textContent !== guideTitle) elements.guideTitle.textContent = guideTitle;
  if (elements.guideStep.textContent !== guideStep) elements.guideStep.textContent = guideStep;
  if (elements.guideText.textContent !== guideText) elements.guideText.textContent = guideText;
  elements.guideProgress.style.width = `${guide.progress}%`;
  elements.guideProgressBar.setAttribute('aria-valuemax', String(guide.total));
  elements.guideProgressBar.setAttribute('aria-valuenow', String(guide.completed));
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
  elements.screen.classList.remove('reading');
  if (state.scanned) {
    elements.screen.classList.add('success');
    elements.screen.innerHTML = `<span class="terminal-icon">✓</span><strong>Dobro došli, Ivan Horvat</strong><small>07:01 · ${context.area}</small>`;
    elements.scan.disabled = true;
    elements.scan.textContent = 'Prijava je evidentirana';
    elements.objective.textContent = 'RFID prijava je evidentirana i svi povezani pregledi su ažurirani.';
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
  } else if (scanPending) {
    elements.screen.classList.remove('success');
    elements.screen.classList.add('reading');
    elements.screen.innerHTML = `<span class="terminal-icon">RFID</span><strong>Očitavanje kartice</strong><small>Terminal: ${context.area}</small>`;
    elements.screen.append(createRfidCardElement());
    elements.scan.disabled = true;
    elements.scan.textContent = 'Kartica se očitava…';
    elements.objective.textContent = 'Terminal provjerava simuliranu RFID karticu.';
    elements.status.textContent = 'Očitavanje';
    elements.status.classList.remove('complete');
  } else {
    elements.screen.classList.remove('success');
    elements.screen.innerHTML = `<span class="terminal-icon">RFID</span><strong>Spremno za prijavu</strong><small>Terminal: ${context.area}</small>`;
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

function renderAction(button, status, done, pendingText, doneText) {
  status.textContent = done ? doneText : pendingText;
  status.classList.toggle('complete', done);
  button.disabled = done;
  button.removeAttribute('title');
}

function trackProgress(guide) {
  if (guide.complete && !completionTracked) {
    analytics.track(ANALYTICS_EVENTS.DEMO_COMPLETED, { profile: state.profile });
    completionTracked = true;
  }
}

function render() {
  const guide = getGuide(state);
  elements.welcome.classList.toggle('hidden', state.started);
  elements.demo.classList.toggle('hidden', !state.started);
  elements.reset.classList.toggle('hidden', !state.started);
  elements.activeProfile.classList.toggle('hidden', !state.started);
  renderProfile();
  renderRole(guide);
  renderGuide(guide);
  renderAttendance();
  renderAction(elements.resolveCorrection, elements.correctionStatus, state.correctionResolved, 'Za provjeru', 'Korekcija potvrđena');
  renderAction(elements.approveLeave, elements.leaveStatus, state.leaveApproved, 'Čeka odluku', 'Odobreno');
  renderAction(elements.generateReport, elements.reportStatus, state.reportGenerated, 'Spreman za generiranje', 'Spreman za preuzimanje');
  elements.reviewWorker.disabled = state.workerReviewed;
  elements.reviewWorker.removeAttribute('title');
  elements.reviewWorker.textContent = state.workerReviewed ? 'Podaci su potvrđeni' : 'Potvrdi da su podaci jasni';
  trackProgress(guide);
}

function apply(action, mission) {
  const before = getGuide(state);
  state = action(state);
  const after = getGuide(state);
  if (mission && after.completed > before.completed) {
    analytics.track(ANALYTICS_EVENTS.MISSION_COMPLETED, {
      mission,
      progress: after.progress,
      profile: state.profile
    });
  }
  render();
}

async function simulateRfidScan() {
  if (state.scanned || scanPending || elements.scan.disabled) return;
  scanPending = true;
  render();
  const active = await scanDelay.wait(520);
  if (!active || !state.started) {
    scanPending = false;
    if (state.started) render();
    return;
  }
  scanPending = false;
  apply(registerEmployee, 'rfid_check_in');
  void terminalFeedback.playSuccess();
}

elements.profileForm.addEventListener('input', () => { state = configureDemo(state, profileInput()); analytics.track(ANALYTICS_EVENTS.DEMO_CONFIGURED, { profile: state.profile }); render(); });
elements.profileForm.addEventListener('submit', (event) => {
  event.preventDefault();
  experienceMode = selectedExperienceMode();
  state = configureDemo(state, profileInput());
  analytics.track(ANALYTICS_EVENTS.MODE_SELECTED, { mode: experienceMode, profile: state.profile });
  analytics.track(ANALYTICS_EVENTS.DEMO_STARTED, { mode: experienceMode, profile: state.profile });
  elements.guideDetails.open = experienceMode === 'assisted';
  apply(startDemo);
  elements.guideTitle.setAttribute('tabindex', '-1');
  elements.guideTitle.focus();
});
elements.scan.addEventListener('click', simulateRfidScan);
elements.resolveCorrection.addEventListener('click', () => apply(resolveCorrection, 'correction_resolved'));
elements.approveLeave.addEventListener('click', () => apply(approveLeave, 'leave_approved'));
elements.reviewWorker.addEventListener('click', () => apply(reviewWorker, 'worker_reviewed'));
elements.generateReport.addEventListener('click', () => apply(generateReport, 'report_generated'));
elements.reset.addEventListener('click', () => {
  scanDelay.cancel();
  scanPending = false;
  livingController.stop();
  kpiPanel.hide();
  state = resetDemo(state.profile);
  previousRole = state.activeRole;
  completionTracked = false;
  elements.guideDetails.open = false;
  render();
  byId('welcomeTitle')?.setAttribute('tabindex', '-1');
  byId('welcomeTitle')?.focus();
});
elements.restart.addEventListener('click', () => { scanDelay.cancel(); scanPending = false; analytics.track(ANALYTICS_EVENTS.DEMO_RESTARTED, { profile: state.profile }); livingController.reset(); kpiPanel.hide(); state = startDemo(resetDemo(state.profile)); previousRole = state.activeRole; completionTracked = false; render(); });
document.querySelectorAll('.role-button').forEach((button) => button.addEventListener('click', () => { state = selectRole(state, button.dataset.role); analytics.track(ANALYTICS_EVENTS.ROLE_VIEWED, { role: state.activeRole, profile: state.profile }); render(); }));

render();
