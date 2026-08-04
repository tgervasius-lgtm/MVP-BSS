import { ROLES, configureDemo, getGuide, startDemo, selectRole, registerEmployee, approveLeave, resolveCorrection, generateReport, replaceWorkerCard, submitWorkerLeave, decideWorkerLeave, resetDemo } from './state.js';
import { getIndustryContext } from './industry-context.js';
import { createAnalytics, ANALYTICS_EVENTS } from './analytics.js';
import { createActivityFeedItem, createLivingOfficeController, renderInitialActivityFeed } from './living-office.js';
import { createBusinessSummaryPanel } from './business-summary.js';
import { createKpiDetailsPanel } from './kpi-details.js';
import { createRfidCardElement, createTerminalFeedback } from './terminal-effects.js';
import { createTerminalFixtures, createTerminalStatusPanel } from './terminal-status.js';
import { createCommandCenterPanel } from './command-center.js';
import { createCancellableDelay } from './cancellable-delay.js';
import { buildOperationalMetrics } from './operational-metrics.js';
import { installWorkspaceTabs } from './workspace-tabs.js';

const enhancementStyles = document.createElement('link');
enhancementStyles.rel = 'stylesheet';
enhancementStyles.href = 'enhancements.css';
document.head.append(enhancementStyles);

let state = resetDemo();
let previousRole = state.activeRole;
let completionTracked = false;
let experienceMode = 'free';
let scanPending = false;
let scanEventTime = '07:01';
let activityFeedIndustry = null;
const analytics = createAnalytics();
const terminalFeedback = createTerminalFeedback({ audioFactory: () => new (window.AudioContext || window.webkitAudioContext)() });
const scanDelay = createCancellableDelay();
const byId = (id) => document.getElementById(id);
const adminView = byId('adminView');
byId('previewCompatKpis')?.remove();
adminView.querySelector('.metrics')?.remove();
const commandCenter = createCommandCenterPanel();
byId('adminOverviewPanel').prepend(commandCenter.element);
const elements = {
  welcome: byId('welcomeView'), demo: byId('demoView'), reset: byId('resetButton'), restart: byId('restartButton'), roleSwitcher: document.querySelector('.role-switcher'),
  profileForm: byId('profileForm'), industry: byId('industryInput'), employees: byId('employeesInput'), locations: byId('locationsInput'), shifts: byId('shiftsInput'),
  modeInputs: document.querySelectorAll('input[name="experienceMode"]'), activeProfile: byId('activeProfile'),
  profileIndustry: byId('profileIndustry'), profileEmployees: byId('profileEmployees'), profileMeta: byId('profileMeta'), companyContext: byId('companyContext'),
  scan: byId('scanButton'), count: byId('presentCount'), planned: byId('plannedCount'), screen: byId('terminalScreen'), feed: byId('activityFeed'),
  objective: byId('objectiveText'), status: byId('objectiveStatus'), roleLabel: byId('roleLabel'), approveLeave: byId('approveLeaveButton'),
  leaveStatus: byId('leaveStatus'), workerArrival: byId('workerArrival'), workerMessage: byId('workerMessage'), workerRow: byId('workerRow'),
  workerShiftStatus: byId('workerShiftStatus'), workerRowDetail: byId('workerRowDetail'), workerRowStatus: byId('workerRowStatus'), workerLocation: byId('workerLocation'), workerCardStatus: byId('workerCardStatus'), workerShiftProgressLabel: byId('workerShiftProgressLabel'), workerShiftProgressBar: byId('workerShiftProgressBar'),
  workerLeaveForm: byId('workerLeaveForm'), workerLeaveStart: byId('workerLeaveStart'), workerLeaveDays: byId('workerLeaveDays'), workerLeaveButton: byId('workerLeaveRequestButton'), workerLeaveStatus: byId('workerLeaveRequestStatus'), workerLeaveSummary: byId('workerLeaveSummary'),
  workerLeaveManagerCard: byId('workerLeaveManagerCard'), managerWorkerLeavePeriod: byId('managerWorkerLeavePeriod'), managerWorkerLeaveDays: byId('managerWorkerLeaveDays'), managerWorkerLeaveStatus: byId('managerWorkerLeaveStatus'), approveWorkerLeave: byId('approveWorkerLeaveButton'), rejectWorkerLeave: byId('rejectWorkerLeaveButton'), managerRequestBadge: byId('managerRequestBadge'),
  replaceCard: byId('replaceCardButton'), adminWorkerCardCode: byId('adminWorkerCardCode'), adminWorkerCardStatus: byId('adminWorkerCardStatus'), adminWorkerLastPunch: byId('adminWorkerLastPunch'), adminWorkerCardAudit: byId('adminWorkerCardAudit'), adminLeaveQueueText: byId('adminLeaveQueueText'), adminLeaveQueueCount: byId('adminLeaveQueueCount'),
  adminCorrectionPriorityIcon: byId('adminCorrectionPriorityIcon'), adminCorrectionPriorityTitle: byId('adminCorrectionPriorityTitle'), adminCorrectionPriorityMeta: byId('adminCorrectionPriorityMeta'), adminCorrectionPriorityCount: byId('adminCorrectionPriorityCount'),
  resolveCorrection: byId('resolveCorrectionButton'), correctionStatus: byId('correctionStatus'), generateReport: byId('generateReportButton'), reportStatus: byId('reportStatus'), reportPreview: byId('reportPreview'),
  guideTitle: byId('guideTitle'), guideStep: byId('guideStep'), guideText: byId('guideText'), guideDetails: byId('guideDetails'), guideProgressBar: byId('guideProgressBar'), guideProgress: byId('guideProgress'), completion: byId('completionView')
};

const workspaceTabs = installWorkspaceTabs();

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
livingOffice.setAttribute('aria-label', 'Simulirana aktivnost sustava');
livingOffice.innerHTML = '<span class="living-office-dot" aria-hidden="true"></span><span class="living-office-label">Uživo</span><time id="livingOfficeTime">06:58</time><div class="living-office-copy"><strong id="livingOfficeActor">BSS sustav</strong><small id="livingOfficeEvent">Priprema početka smjene</small></div>';
elements.demo.prepend(livingOffice);
const livingOfficeTime = byId('livingOfficeTime');
const livingOfficeActor = byId('livingOfficeActor');
const livingOfficeEvent = byId('livingOfficeEvent');
function renderLivingOfficeFrame(frame) {
  livingOfficeTime.textContent = frame.time;
  livingOfficeActor.textContent = frame.actor;
  livingOfficeEvent.textContent = [frame.action, frame.detail].filter(Boolean).join(' · ');
}
const livingController = createLivingOfficeController({
  onFrame: renderLivingOfficeFrame,
  autoAdvance: !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
  resetControl: null,
  getIndustry: () => state.profile.industry,
  startStep: 2
});

const kpiPanel = createKpiDetailsPanel({ getMetrics: () => buildOperationalMetrics({
  profile: state.profile,
  summary: state.summary,
  presentCount: state.presentCount
}) });
commandCenter.element.insertAdjacentElement('afterend', kpiPanel.element);
commandCenter.element.querySelectorAll('[data-kpi]').forEach((trigger) => {
  const open = () => kpiPanel.show(trigger.dataset.kpi, trigger);
  trigger.addEventListener('click', open);
});

function profileInput() {
  return { industry: elements.industry.value, employees: elements.employees.value, locations: elements.locations.value, shifts: elements.shifts.value };
}

function selectedExperienceMode() {
  return [...elements.modeInputs].find((input) => input.checked)?.value === 'assisted' ? 'assisted' : 'free';
}

function renderManagerProfile(metrics, context) {
  const roster = [...byId('managerTeamRoster').children];
  const visibleRosterIndexes = metrics.teamSize < 3 ? new Set([0, 2].slice(0, metrics.teamSize)) : new Set([0, 1, 2]);
  const rosterStates = [
    { meta: `06:56 · ${context.area}`, status: 'Prisutna', tone: 'success' },
    metrics.teamLate > 0
      ? { meta: '07:08 · Potrebna provjera', status: 'Kasni', tone: 'warning' }
      : { meta: `07:01 · ${context.area}`, status: 'Prisutan', tone: 'success' },
    metrics.teamSick > 0
      ? { meta: 'Odobreno bolovanje', status: 'Odsutna', tone: 'info' }
      : { meta: `06:58 · ${context.area}`, status: 'Prisutna', tone: 'success' }
  ];
  roster.forEach((item, index) => {
    item.hidden = !visibleRosterIndexes.has(index);
    const presentation = rosterStates[index];
    item.querySelector('small').textContent = presentation.meta;
    const status = item.querySelector('.roster-status');
    status.textContent = presentation.status;
    status.className = `roster-status ${presentation.tone}`;
  });

  const [primaryUnit, secondaryUnit] = context.units;
  byId('managerPrimaryUnit').textContent = primaryUnit;
  byId('managerSecondaryUnit').textContent = secondaryUnit;
  byId('managerPrimaryUnitStatus').textContent = metrics.teamPresent > 0 ? 'Popunjeno' : 'Potrebna zamjena';
  const unavailable = metrics.teamLate + metrics.teamSick;
  byId('managerSecondaryUnitStatus').textContent = metrics.teamSize < 3
    ? 'Nije potrebno'
    : unavailable > 0
      ? `${unavailable} ${plural(unavailable, 'zamjena', 'zamjene', 'zamjena')}`
      : 'Popunjeno';

  const dailyPlanned = metrics.teamSize * 8;
  const coverageAfterLeave = Math.round((Math.max(0, metrics.teamSize - 1) / Math.max(metrics.teamSize, 1)) * 100);
  byId('managerLeaveCoverage').textContent = `${coverageAfterLeave}%`;
  const recordedRatios = [0.94, 0.97, 0.91];
  const exceptionRatios = [2 / 24, 1 / 24, 3 / 24];
  const rows = [...byId('managerDailyRows').querySelectorAll('tr')];
  rows.forEach((row, index) => {
    const recorded = Math.round(dailyPlanned * recordedRatios[index]);
    const exceptions = Math.min(metrics.teamSize, Math.round(metrics.teamSize * exceptionRatios[index]));
    row.querySelector('[data-manager-planned]').textContent = `${formatNumber(dailyPlanned)} h`;
    row.querySelector('[data-manager-recorded]').textContent = `${formatNumber(recorded)} h`;
    row.querySelector('[data-manager-exceptions]').textContent = String(exceptions);
  });
}

function formatHoursMinutes(value) {
  const totalMinutes = Math.max(0, Math.round(value));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes === 0 ? `${hours} h` : `${hours} h ${minutes} min`;
}

function renderWorkerProfile(metrics, context) {
  const recordedMinutes = 128 * 60;
  const nightMinutes = Math.round((metrics.nightHours / Math.max(metrics.monthlyHours, 1)) * recordedMinutes);
  const overtimeMinutes = Math.round((metrics.overtimeHours / Math.max(metrics.monthlyHours, 1)) * recordedMinutes);
  const regularMinutes = Math.max(0, recordedMinutes - nightMinutes - overtimeMinutes);
  const hourGroups = [
    { id: 'workerRegular', minutes: regularMinutes },
    { id: 'workerOvertime', minutes: overtimeMinutes },
    { id: 'workerNight', minutes: nightMinutes }
  ];

  byId('workerContext').textContent = `Ivan Horvat · ${context.team}`;
  byId('workerNextShiftContext').textContent = `sutra · ${context.team.toLocaleLowerCase('hr-HR')}`;
  byId('workerOvertimeSummary').textContent = formatHoursMinutes(overtimeMinutes);
  for (const group of hourGroups) {
    const label = formatHoursMinutes(group.minutes);
    byId(`${group.id}Hours`).textContent = label;
    byId(`${group.id}Bar`).style.setProperty('--share', `${(group.minutes / recordedMinutes) * 100}%`);
  }
  byId('workerHoursComposition').setAttribute(
    'aria-label',
    `${formatHoursMinutes(regularMinutes)} redovnih, ${formatHoursMinutes(overtimeMinutes)} prekovremenih i ${formatHoursMinutes(nightMinutes)} noćnih sati`
  );
}

function renderTerminalNetwork(context) {
  const network = byId('adminTerminalNetwork');
  network.querySelector('.terminal-status-panel')?.remove();
  const panel = createTerminalStatusPanel(createTerminalFixtures({ terminals: state.summary.terminals, primaryArea: context.area }));
  network.append(panel);
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
  const managerCoverage = Math.round((metrics.teamPresent / Math.max(metrics.teamSize, 1)) * 100);
  byId('managerCoverageLabel').textContent = `${managerCoverage}%`;
  byId('managerCoverageBar').style.width = `${managerCoverage}%`;
  byId('managerCoverageBar').parentElement.setAttribute('aria-valuenow', String(managerCoverage));
  const managerPlannedHours = metrics.teamSize * 40;
  const managerRecordedHours = Math.round(managerPlannedHours * 0.956);
  byId('managerPlannedHours').textContent = `${formatNumber(managerPlannedHours)} h`;
  byId('managerRecordedHours').textContent = `${formatNumber(managerRecordedHours)} h`;
  byId('managerOvertimeHours').textContent = `${Math.max(1, Math.round(metrics.teamSize * 0.46))} h`;
  renderManagerProfile(metrics, context);
  byId('monthlyHours').textContent = formatNumber(metrics.monthlyHours);
  byId('regularHours').textContent = formatNumber(metrics.regularHours);
  byId('nightHours').textContent = formatNumber(metrics.nightHours);
  byId('overtimeHours').textContent = formatNumber(metrics.overtimeHours);
  const reportShares = {
    regular: (metrics.regularHours / Math.max(metrics.monthlyHours, 1)) * 100,
    night: (metrics.nightHours / Math.max(metrics.monthlyHours, 1)) * 100,
    overtime: (metrics.overtimeHours / Math.max(metrics.monthlyHours, 1)) * 100
  };
  byId('regularHoursBar').style.width = `${reportShares.regular}%`;
  byId('nightHoursBar').style.width = `${reportShares.night}%`;
  byId('overtimeHoursBar').style.width = `${reportShares.overtime}%`;
  byId('reportRegularPreview').textContent = formatNumber(metrics.regularHours);
  byId('reportNightPreview').textContent = formatNumber(metrics.nightHours);
  byId('reportOvertimePreview').textContent = formatNumber(metrics.overtimeHours);
  byId('reportRegularShare').textContent = formatPercent(reportShares.regular);
  byId('reportNightShare').textContent = formatPercent(reportShares.night);
  byId('reportOvertimeShare').textContent = formatPercent(reportShares.overtime);
  renderWorkerProfile(metrics, context);
  elements.workerLocation.textContent = context.area;
  byId('adminAuditArea').textContent = context.area;
  byId('adminAuditManager').textContent = context.manager;
  byId('adminWorkerContext').textContent = `${context.team} · Jutarnja smjena`;
  document.documentElement.dataset.industry = profile.industry.toLowerCase();
  const terminalLabel = elements.screen.querySelector('small');
  if (terminalLabel && !state.scanned) terminalLabel.textContent = `Terminal: ${context.area}`;
  byId('managerTeamLabel').textContent = context.team;
  if (activityFeedIndustry !== profile.industry) {
    renderInitialActivityFeed(elements.feed, profile.industry);
    activityFeedIndustry = profile.industry;
  }
  renderTerminalNetwork(context);
}

function formatNumber(value) {
  return new Intl.NumberFormat('hr-HR').format(value);
}

function formatPercent(value) {
  return `${new Intl.NumberFormat('hr-HR', { maximumFractionDigits: 1 }).format(value)}%`;
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
  if (state.activeRole !== 'admin') kpiPanel.hide();
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
  if (state.started && !guide.complete && !state.scanned) livingController.start(); else livingController.stop();
  commandCenter.update({
    profile: state.profile,
    summary: state.summary,
    presentCount: state.presentCount
  });
}

function renderAttendance() {
  const context = getIndustryContext(state.profile.industry);
  const arrivalTime = scanEventTime;
  elements.count.textContent = String(state.presentCount);
  elements.screen.classList.remove('reading');
  if (state.scanned) {
    elements.screen.classList.add('success');
    elements.screen.innerHTML = `<span class="terminal-icon">✓</span><strong>Dobro došli, Ivan Horvat</strong><small>${arrivalTime} · ${context.area}</small>`;
    elements.scan.disabled = true;
    elements.scan.textContent = 'Prijava je evidentirana';
    elements.objective.textContent = 'RFID prijava je evidentirana i svi povezani pregledi su ažurirani.';
    elements.status.textContent = 'Završeno';
    elements.status.classList.add('complete');
    elements.workerArrival.textContent = arrivalTime;
    elements.workerShiftStatus.textContent = 'Smjena u tijeku';
    elements.workerShiftStatus.classList.add('complete');
    elements.workerMessage.textContent = `Vaša današnja prijava uspješno je evidentirana na terminalu ${context.area}.`;
    elements.workerRow.textContent = `${arrivalTime} – smjena u tijeku`;
    elements.workerRowDetail.textContent = `${context.area} · odlazak nije evidentiran`;
    elements.workerRowStatus.textContent = 'Aktivno';
    elements.workerRowStatus.classList.remove('warning');
    elements.workerRowStatus.classList.add('success');
    elements.workerShiftProgressLabel.textContent = 'Smjena je započela';
    elements.workerShiftProgressBar.style.width = '3%';
    elements.workerShiftProgressBar.parentElement.setAttribute('aria-valuenow', '3');
    elements.adminWorkerLastPunch.textContent = `${arrivalTime} · ${context.area}`;
    if (!byId('ivanEvent')) {
      elements.feed.querySelectorAll('[data-actor="Ivan Horvat"]').forEach((event) => event.remove());
      const event = createActivityFeedItem(document, {
        time: arrivalTime, actor: 'Ivan Horvat', action: 'Prijava', detail: context.area,
        tone: 'success', initials: 'IH', industry: state.profile.industry.toLocaleLowerCase('hr-HR'), index: 'rfid'
      }, { id: 'ivanEvent' });
      if (event) elements.feed.prepend(event);
    }
    livingController.stop();
    renderLivingOfficeFrame({ time: arrivalTime, actor: 'Ivan Horvat', action: 'Prijava evidentirana', detail: context.area });
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
    elements.workerMessage.textContent = 'RFID kartica trenutačno se očitava na terminalu.';
  } else {
    elements.screen.classList.remove('success');
    elements.screen.innerHTML = `<span class="terminal-icon">RFID</span><strong>Spremno za prijavu</strong><small>Terminal: ${context.area}</small>`;
    elements.scan.disabled = false;
    elements.scan.textContent = 'Simuliraj karticu Ivana Horvata';
    elements.objective.textContent = 'Evidentirajte dolazak Ivana Horvata na virtualnom terminalu.';
    elements.status.textContent = 'U tijeku';
    elements.status.classList.remove('complete');
    elements.workerArrival.textContent = 'Nije evidentiran';
    elements.workerShiftStatus.textContent = 'Čeka prijavu';
    elements.workerShiftStatus.classList.remove('complete');
    elements.workerMessage.textContent = 'Vaša današnja prijava još nije evidentirana.';
    elements.workerRow.textContent = 'Čeka prijavu';
    elements.workerRowDetail.textContent = 'Današnja smjena';
    elements.workerRowStatus.textContent = 'Otvoreno';
    elements.workerRowStatus.classList.add('warning');
    elements.workerRowStatus.classList.remove('success');
    elements.workerShiftProgressLabel.textContent = 'Smjena nije započela';
    elements.workerShiftProgressBar.style.width = '0%';
    elements.workerShiftProgressBar.parentElement.setAttribute('aria-valuenow', '0');
    elements.adminWorkerLastPunch.textContent = 'Čeka današnju prijavu';
    byId('ivanEvent')?.remove();
  }
}

function businessDayEnd(start, days) {
  const date = new Date(`${start}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return null;
  let remaining = Math.max(0, days - 1);
  while (remaining > 0) {
    date.setUTCDate(date.getUTCDate() + 1);
    const weekday = date.getUTCDay();
    if (weekday !== 0 && weekday !== 6) remaining -= 1;
  }
  return date;
}

function formatDate(value) {
  const date = value instanceof Date ? value : new Date(`${value}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return 'Neispravan datum';
  return new Intl.DateTimeFormat('hr-HR', { day: 'numeric', month: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(date);
}

function formatLeavePeriod(request) {
  const end = businessDayEnd(request.start, request.days);
  return `${formatDate(request.start)} – ${formatDate(end)}`;
}

function renderWorkerLeave() {
  const request = state.workerLeaveRequest;
  const pendingBaseRequest = state.leaveApproved ? 0 : 1;
  const workerPending = request?.status === 'pending' ? 1 : 0;
  const pendingCount = pendingBaseRequest + workerPending;
  elements.managerRequestBadge.textContent = String(pendingCount);
  elements.managerRequestBadge.classList.toggle('empty', pendingCount === 0);
  elements.adminLeaveQueueCount.textContent = String(pendingCount);
  elements.adminLeaveQueueText.textContent = pendingCount === 0
    ? 'Nema zahtjeva na čekanju'
    : `${pendingCount} ${pendingCount === 1 ? 'čeka odluku' : 'čekaju odluku'}`;
  const priorityCount = Number(!state.correctionResolved) + pendingCount;
  byId('priorityTitle').textContent = `${priorityCount} ${plural(priorityCount, 'stavka za pažnju', 'stavke za pažnju', 'stavki za pažnju')}`;

  elements.workerLeaveManagerCard.classList.toggle('hidden', !request);
  const formFields = elements.workerLeaveForm.querySelectorAll('input, select');
  for (const field of formFields) field.disabled = Boolean(request);
  elements.workerLeaveButton.disabled = Boolean(request);

  if (!request) {
    elements.workerLeaveButton.textContent = 'Pošalji zahtjev Voditelju';
    elements.workerLeaveStatus.textContent = 'Zahtjev još nije poslan.';
    elements.workerLeaveSummary.textContent = 'nema aktivnog zahtjeva';
    return;
  }

  const labels = {
    pending: 'Čeka odluku Voditelja',
    approved: 'Odobreno',
    rejected: 'Odbijeno'
  };
  const status = labels[request.status];
  const period = formatLeavePeriod(request);
  const dayLabel = plural(request.days, 'radni dan', 'radna dana', 'radnih dana');
  elements.workerLeaveStart.value = request.start;
  elements.workerLeaveDays.value = String(request.days);
  elements.workerLeaveButton.textContent = 'Zahtjev je poslan';
  elements.workerLeaveStatus.textContent = `${period} · ${request.days} ${dayLabel} · ${status}`;
  elements.workerLeaveSummary.textContent = status.toLocaleLowerCase('hr-HR');
  elements.managerWorkerLeavePeriod.textContent = period;
  elements.managerWorkerLeaveDays.textContent = `${request.days} ${dayLabel}`;
  elements.managerWorkerLeaveStatus.textContent = status;
  const canDecide = request.status === 'pending';
  elements.approveWorkerLeave.disabled = !canDecide;
  elements.rejectWorkerLeave.disabled = !canDecide;
}

function renderAdditionalWorkspaces() {
  elements.adminWorkerCardCode.textContent = state.workerCardReplaced ? 'BSS-7304' : 'BSS-2841';
  elements.adminWorkerCardStatus.textContent = state.workerCardReplaced ? 'Nova kartica aktivna' : 'Aktivna';
  elements.workerCardStatus.textContent = state.workerCardReplaced ? 'Nova kartica aktivna' : 'Aktivna';
  elements.replaceCard.disabled = state.workerCardReplaced;
  elements.replaceCard.textContent = state.workerCardReplaced ? 'Kartica je zamijenjena' : 'Zamijeni RFID karticu';
  elements.adminWorkerCardAudit.classList.toggle('hidden', !state.workerCardReplaced);
  elements.adminCorrectionPriorityIcon.classList.toggle('warning', !state.correctionResolved);
  elements.adminCorrectionPriorityIcon.classList.toggle('success', state.correctionResolved);
  elements.adminCorrectionPriorityIcon.textContent = state.correctionResolved ? '✓' : '!';
  elements.adminCorrectionPriorityTitle.textContent = state.correctionResolved ? 'Korekcija potvrđena' : 'Nedostaje odjava';
  elements.adminCorrectionPriorityMeta.textContent = state.correctionResolved ? 'Petar Novak · audit spremljen' : 'Petar Novak · jučer';
  elements.adminCorrectionPriorityCount.textContent = state.correctionResolved ? '✓' : '1';
  elements.reportPreview.classList.toggle('hidden', !state.reportGenerated);
  renderWorkerLeave();
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
  renderAction(elements.generateReport, elements.reportStatus, state.reportGenerated, 'Spreman za generiranje', 'Pregled generiran');
  renderAdditionalWorkspaces();
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
  scanEventTime = livingOfficeTime.textContent || '07:01';
  scanPending = true;
  render();
  const active = await scanDelay.wait(520);
  if (!active || !state.started) {
    scanPending = false;
    if (state.started) render();
    return;
  }
  if ((livingOfficeTime.textContent || '') > scanEventTime) scanEventTime = livingOfficeTime.textContent;
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
elements.workerLeaveForm.addEventListener('submit', (event) => {
  event.preventDefault();
  apply((current) => submitWorkerLeave(current, {
    start: elements.workerLeaveStart.value,
    days: elements.workerLeaveDays.value
  }), 'worker_leave_submitted');
});
elements.approveWorkerLeave.addEventListener('click', () => apply((current) => decideWorkerLeave(current, 'approved')));
elements.rejectWorkerLeave.addEventListener('click', () => apply((current) => decideWorkerLeave(current, 'rejected')));
elements.replaceCard.addEventListener('click', () => apply(replaceWorkerCard));
elements.generateReport.addEventListener('click', () => apply(generateReport, 'report_generated'));

function resetWorkspaceTabs() {
  for (const controller of workspaceTabs) {
    const first = controller.container.querySelector('[role="tab"][data-workspace-tab]');
    if (first) controller.activate(first.id);
  }
}

function resetWorkspaceForms() {
  elements.workerLeaveForm.reset();
}

elements.reset.addEventListener('click', () => {
  scanDelay.cancel();
  scanPending = false;
  scanEventTime = '07:01';
  livingController.reset();
  kpiPanel.hide();
  state = resetDemo(state.profile);
  activityFeedIndustry = null;
  previousRole = state.activeRole;
  completionTracked = false;
  elements.guideDetails.open = false;
  resetWorkspaceForms();
  resetWorkspaceTabs();
  render();
  byId('welcomeTitle')?.setAttribute('tabindex', '-1');
  byId('welcomeTitle')?.focus();
});
elements.restart.addEventListener('click', () => {
  scanDelay.cancel();
  scanPending = false;
  scanEventTime = '07:01';
  analytics.track(ANALYTICS_EVENTS.DEMO_RESTARTED, { profile: state.profile });
  livingController.reset();
  kpiPanel.hide();
  activityFeedIndustry = null;
  state = startDemo(resetDemo(state.profile));
  previousRole = state.activeRole;
  completionTracked = false;
  resetWorkspaceForms();
  resetWorkspaceTabs();
  render();
  elements.guideTitle.setAttribute('tabindex', '-1');
  elements.guideTitle.focus();
});
document.querySelectorAll('.role-button').forEach((button) => button.addEventListener('click', () => { state = selectRole(state, button.dataset.role); analytics.track(ANALYTICS_EVENTS.ROLE_VIEWED, { role: state.activeRole, profile: state.profile }); render(); }));

render();
