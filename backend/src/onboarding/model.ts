import { createHash } from "node:crypto";
import { AppError } from "../domain/errors.js";
import type { ActorContext } from "../domain/types.js";

export const PROFILES = ["DEMO", "INTERNAL", "PILOT", "PRODUCTION"] as const;
export type Profile = typeof PROFILES[number];
export const STEPS = ["COMPANY_SETUP", "PEOPLE_IMPORT", "ACCESS_SETUP", "TERMINAL_SETUP", "DRY_RUN"] as const;
export type Step = typeof STEPS[number];
export const ONBOARDING_VERSION = "h2-onboarding-evidence-v1";
export const CONTRACT_VERSION = "BSS-v1.0";
export type EvidenceInput = { step: Step; reference: string; note?: string };
export type EvidenceWrite = { configurationChecksum: string; items: EvidenceInput[] };
export type Evidence = EvidenceInput & {
  id: string; submittedBy: string; submittedAt: string; configurationChecksum: string;
  verification: "UNVERIFIED"; stale: boolean;
};
export type Blocker = { step: Step; code: string; message: string };
export type SoftwarePrerequisites = { company: boolean; people: boolean; access: boolean; terminal: boolean };
export type Onboarding = {
  id: string; revision: string; profile: Profile; contractVersion: string;
  stage: "DRAFT" | Step; configurationChecksum: string; evaluatedConfigurationChecksum: string | null;
  evaluatedAt: string | null; revalidationRequired: boolean;
  readyForGoLive: false; goLiveApproved: false; softwarePrerequisites: SoftwarePrerequisites;
  blockers: Blocker[]; submittedEvidence: Evidence[];
};
export interface OnboardingService {
  get(actor: ActorContext, requestId: string): Promise<Onboarding>;
  record(actor: ActorContext, revision: string, input: EvidenceWrite, requestId: string): Promise<Onboarding>;
  evaluate(actor: ActorContext, revision: string, checksum: string, requestId: string): Promise<Onboarding>;
}
export function checksum(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}
export function invalid(): never {
  throw new AppError("VALIDATION_FAILED", "Neispravni podaci pripreme korisnika.");
}
export function requireChecksum(value: unknown): asserts value is string {
  if (typeof value !== "string" || !/^[a-f0-9]{64}$/.test(value)) invalid();
}
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) invalid();
  return value as Record<string, unknown>;
}
function bounded(value: unknown, min: number, max: number, multiline = false): string {
  if (typeof value !== "string") invalid();
  const text = (value as string).trim();
  const controls = multiline ? /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/ : /[\u0000-\u001f\u007f]/;
  if ([...text].length < min || [...text].length > max || controls.test(text)) invalid();
  return text;
}
export function normalizeWrite(value: unknown): EvidenceWrite {
  const body = record(value);
  if (Object.keys(body).some(key => !["configurationChecksum", "items"].includes(key))) invalid();
  requireChecksum(body.configurationChecksum);
  if (!Array.isArray(body.items) || body.items.length < 1 || body.items.length > 20) invalid();
  const items = (body.items as unknown[]).map(value => {
    const item = record(value);
    if (Object.keys(item).some(key => !["step", "reference", "note"].includes(key)) || !STEPS.includes(item.step as Step)) invalid();
    return { step: item.step as Step, reference: bounded(item.reference, 1, 500),
      ...(item.note === undefined ? {} : { note: bounded(item.note, 0, 1000, true) }) };
  });
  const identities = items.map(item => JSON.stringify([item.step, item.reference]));
  if (new Set(identities).size !== identities.length) invalid();
  return { configurationChecksum: body.configurationChecksum, items };
}
