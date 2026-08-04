export const ANALYTICS_EVENTS = Object.freeze({
  DEMO_CONFIGURED: 'demo_configured',
  MODE_SELECTED: 'mode_selected',
  DEMO_STARTED: 'demo_started',
  MISSION_COMPLETED: 'mission_completed',
  ROLE_VIEWED: 'role_viewed',
  DEMO_COMPLETED: 'demo_completed',
  DEMO_RESTARTED: 'demo_restarted'
});

const ALLOWED_EVENTS = new Set(Object.values(ANALYTICS_EVENTS));

function sanitizeText(value, maxLength = 40) {
  return String(value ?? '')
    .trim()
    .replace(/[^\p{L}\p{N} _-]/gu, '')
    .slice(0, maxLength);
}

function boundedNumber(value, min, max) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return undefined;
  return Math.min(Math.max(parsed, min), max);
}

function flattenPayload(payload) {
  const profile = payload.profile ?? {};
  return {
    ...payload,
    industry: payload.industry ?? profile.industry,
    employees: payload.employees ?? profile.employees,
    locations: payload.locations ?? profile.locations,
    shifts: payload.shifts ?? profile.shifts,
    progress: payload.progress ?? payload.step
  };
}

export function createAnalyticsEvent(name, payload = {}, now = () => Date.now()) {
  if (!ALLOWED_EVENTS.has(name)) throw new TypeError(`Unsupported analytics event: ${name}`);

  const input = flattenPayload(payload);
  const event = {
    name,
    timestamp: now(),
    schemaVersion: 1,
    payload: {}
  };

  if (input.industry) event.payload.industry = sanitizeText(input.industry);
  if (input.role) event.payload.role = sanitizeText(input.role);
  if (input.mission) event.payload.mission = sanitizeText(input.mission);
  if (input.mode === 'free' || input.mode === 'assisted') event.payload.mode = input.mode;

  const employees = boundedNumber(input.employees, 5, 1000);
  const locations = boundedNumber(input.locations, 1, 50);
  const shifts = boundedNumber(input.shifts, 1, 4);
  const progress = boundedNumber(input.progress, 0, 100);

  if (employees !== undefined) event.payload.employeeBand = employees <= 20 ? '5-20' : employees <= 50 ? '21-50' : employees <= 100 ? '51-100' : employees <= 250 ? '101-250' : '251+';
  if (locations !== undefined) event.payload.locationBand = locations === 1 ? '1' : locations <= 3 ? '2-3' : '4+';
  if (shifts !== undefined) event.payload.shifts = shifts;
  if (progress !== undefined) event.payload.progress = progress;

  return Object.freeze({ ...event, payload: Object.freeze(event.payload) });
}

export function createMemoryAnalyticsSink() {
  const events = [];
  return Object.freeze({
    track(name, payload) {
      const event = createAnalyticsEvent(name, payload);
      events.push(event);
      return event;
    },
    snapshot() {
      return events.slice();
    },
    clear() {
      events.length = 0;
    }
  });
}

export const createAnalytics = createMemoryAnalyticsSink;
