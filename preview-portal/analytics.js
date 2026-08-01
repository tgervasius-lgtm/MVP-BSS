const ALLOWED_EVENTS = new Set([
  'demo_configured',
  'demo_started',
  'mission_completed',
  'role_viewed',
  'demo_completed',
  'lead_intent_selected',
  'demo_restarted'
]);

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

export function createAnalyticsEvent(name, payload = {}, now = () => Date.now()) {
  if (!ALLOWED_EVENTS.has(name)) throw new TypeError(`Unsupported analytics event: ${name}`);

  const event = {
    name,
    timestamp: now(),
    schemaVersion: 1,
    payload: {}
  };

  if (payload.industry) event.payload.industry = sanitizeText(payload.industry);
  if (payload.role) event.payload.role = sanitizeText(payload.role);
  if (payload.mission) event.payload.mission = sanitizeText(payload.mission);
  if (payload.intent) event.payload.intent = sanitizeText(payload.intent);

  const employees = boundedNumber(payload.employees, 5, 1000);
  const locations = boundedNumber(payload.locations, 1, 50);
  const shifts = boundedNumber(payload.shifts, 1, 4);
  const progress = boundedNumber(payload.progress, 0, 100);

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
