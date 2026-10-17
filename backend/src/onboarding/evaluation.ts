import { checksum, CONTRACT_VERSION, ONBOARDING_VERSION, type Blocker, type Profile, type SoftwarePrerequisites, type Step } from "./model.js";

export type Snapshot = {
  organization: { configured: boolean; timezone: string; fingerprint: string } | null;
  departments: { active: number; fingerprint: string };
  shifts: { active: number; fingerprint: string };
  holidays: { fingerprint: string };
  calendars: { fingerprint: string };
  workers: { active: number; invalid: number; fingerprint: string };
  users: { admins: number; fingerprint: string };
  invitations: { pending: number; fingerprint: string };
  scopes: { fingerprint: string };
  terminals: { paired: number; fingerprint: string };
  credentials: { fingerprint: string };
  cards: { covered: number; fingerprint: string };
};
function validTimezone(value: string | undefined): boolean {
  if (!value) return false;
  try { return new Intl.DateTimeFormat("hr-HR", { timeZone: value }).resolvedOptions().timeZone.length > 0; } catch { return false; }
}
// This slice has no trusted external verifier or approval authority. Software
// observations and submitted references must never become a live approval.
export function evaluateSnapshot(profile: Profile, snapshot: Snapshot) {
  const softwarePrerequisites: SoftwarePrerequisites = {
    company: snapshot.organization?.configured === true && validTimezone(snapshot.organization.timezone)
      && snapshot.departments.active > 0 && snapshot.shifts.active > 0,
    people: snapshot.workers.active > 0 && snapshot.workers.invalid === 0,
    access: snapshot.users.admins > 0,
    terminal: snapshot.terminals.paired > 0 && snapshot.cards.covered >= snapshot.workers.active && snapshot.workers.active > 0
  };
  const blockers: Blocker[] = [];
  const add = (step: Step, code: string, message: string) => blockers.push({ step, code, message });
  if (!softwarePrerequisites.company) add("COMPANY_SETUP", "COMPANY_CONFIGURATION_INCOMPLETE", "Provjerite tvrtku, vremensku zonu, aktivne odjele i smjene.");
  if (!softwarePrerequisites.people) add("PEOPLE_IMPORT", "WORKFORCE_CONFIGURATION_INCOMPLETE", "Potrebni su aktivni radnici s aktivnim odjelom i smjenom.");
  if (!softwarePrerequisites.access) add("ACCESS_SETUP", "ADMIN_ACCESS_INCOMPLETE", "Potreban je aktivan administratorski račun s postavljenom lozinkom.");
  if (!softwarePrerequisites.terminal) add("TERMINAL_SETUP", "TERMINAL_APPLICABILITY_UNVERIFIED", "Primjenjivost terminala i RFID-a ili njihova potpuna priprema nisu potvrđene.");
  add("DRY_RUN", "CUSTOMER_CONFIGURATION_UNVERIFIED", "Korisnička potvrda konfiguracije, blagdana, pristupa i primjenjivih koraka nije neovisno provjerena.");
  add("DRY_RUN", "INDEPENDENT_DRY_RUN_UNVERIFIED", "Nedostaje provjeren dokaz neovisne druge osobe o probnom radu.");
  add("DRY_RUN", "OPERATIONS_PRIVACY_UNVERIFIED", "Ciljno okruženje, privatnost, oporavak i primjenjiva fizička provjera nisu potvrđeni.");
  add("DRY_RUN", "OPERATOR_AUTHORITY_UNAVAILABLE", "Put provjere ovlasti imenovanog BSS operatora nije implementiran.");
  if (profile === "DEMO" || profile === "INTERNAL") add("DRY_RUN", "PROFILE_NOT_LIVE", "Ovaj profil ne predstavlja odobrenje rada s korisničkim podacima.");
  let stage: "DRAFT" | Step = "DRY_RUN";
  if (!snapshot.organization) stage = "DRAFT";
  else if (!softwarePrerequisites.company) stage = "COMPANY_SETUP";
  else if (!softwarePrerequisites.people) stage = "PEOPLE_IMPORT";
  else if (!softwarePrerequisites.access) stage = "ACCESS_SETUP";
  else if (!softwarePrerequisites.terminal) stage = "TERMINAL_SETUP";
  return { configurationChecksum: checksum([ONBOARDING_VERSION, CONTRACT_VERSION, profile, snapshot]),
    stage, softwarePrerequisites, blockers, readyForGoLive: false as const, goLiveApproved: false as const };
}
