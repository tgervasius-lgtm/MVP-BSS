export const DEFAULT_PROFILE = Object.freeze({
  industry: 'Proizvodnja',
  employees: 68,
  locations: 2,
  shifts: 2
});

const INDUSTRIES = new Set(['Proizvodnja', 'Građevina', 'Logistika', 'Trgovina', 'Ured', 'Ostalo']);

function boundedInteger(value, fallback, min, max) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(parsed, min), max);
}

export function createCompanyProfile(input = {}) {
  return Object.freeze({
    industry: INDUSTRIES.has(input.industry) ? input.industry : DEFAULT_PROFILE.industry,
    employees: boundedInteger(input.employees, DEFAULT_PROFILE.employees, 5, 1000),
    locations: boundedInteger(input.locations, DEFAULT_PROFILE.locations, 1, 50),
    shifts: boundedInteger(input.shifts, DEFAULT_PROFILE.shifts, 1, 4)
  });
}

export function getProfileSummary(profile) {
  const terminals = Math.max(profile.locations, Math.ceil(profile.employees / 40));
  const planned = Math.max(1, Math.round(profile.employees * 0.76));
  const present = Math.max(0, planned - Math.max(2, Math.round(planned * 0.1)));
  return Object.freeze({ terminals, planned, present });
}
