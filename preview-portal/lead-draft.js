const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeLeadDraft(input = {}) {
  return Object.freeze({
    company: String(input.company ?? '').trim().slice(0, 100),
    contact: String(input.contact ?? '').trim().slice(0, 100),
    email: String(input.email ?? '').trim().toLowerCase().slice(0, 160),
    interest: String(input.interest ?? '').trim().slice(0, 20)
  });
}

export function validateLeadDraft(input = {}) {
  const draft = normalizeLeadDraft(input);
  const errors = {};

  if (draft.company.length < 2) errors.company = 'Unesite naziv tvrtke.';
  if (draft.contact.length < 2) errors.contact = 'Unesite ime kontakt osobe.';
  if (!EMAIL_PATTERN.test(draft.email)) errors.email = 'Unesite ispravnu e-mail adresu.';
  if (!['online', 'live', 'pilot'].includes(draft.interest)) errors.interest = 'Odaberite vrstu interesa.';

  return Object.freeze({ valid: Object.keys(errors).length === 0, draft, errors: Object.freeze(errors) });
}

export function createLeadSummary(input = {}, profile = {}) {
  const result = validateLeadDraft(input);
  if (!result.valid) throw new TypeError('Lead draft is invalid.');

  const lines = [
    'BSS Preview Portal — zahtjev za kontakt',
    `Tvrtka: ${result.draft.company}`,
    `Kontakt: ${result.draft.contact}`,
    `E-mail: ${result.draft.email}`,
    `Interes: ${result.draft.interest}`,
    `Djelatnost: ${String(profile.industry ?? 'Nije navedeno')}`,
    `Zaposlenici: ${Number.parseInt(profile.employees, 10) || 'Nije navedeno'}`,
    `Lokacije: ${Number.parseInt(profile.locations, 10) || 'Nije navedeno'}`,
    `Smjene: ${Number.parseInt(profile.shifts, 10) || 'Nije navedeno'}`
  ];

  return lines.join('\n');
}
