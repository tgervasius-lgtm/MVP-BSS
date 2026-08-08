import { AppError } from "../domain/errors.js";

const DAY_MS = 86_400_000;
const MAX_SHIFT_MINUTES = 16 * 60;

function parseDateOnly(value: string): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return Number.NaN;
  const timestamp = Date.parse(`${value}T00:00:00.000Z`);
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString().slice(0, 10) === value
    ? timestamp
    : Number.NaN;
}

export function requireBoundedDateRange(from: string, to: string, maximumInclusiveDays = 366): void {
  const fromTime = parseDateOnly(from);
  const toTime = parseDateOnly(to);
  if (!Number.isFinite(fromTime) || !Number.isFinite(toTime) || toTime < fromTime) {
    throw new AppError("VALIDATION_FAILED", "Početni datum mora biti valjan i prije završnog datuma.");
  }
  if ((toTime - fromTime) / DAY_MS + 1 > maximumInclusiveDays) {
    throw new AppError("VALIDATION_FAILED", `Razdoblje ne smije biti dulje od ${maximumInclusiveDays} dana.`);
  }
}

function clockMinutes(value: string): number {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);
  return match ? Number(match[1]) * 60 + Number(match[2]) : Number.NaN;
}

export function shiftDurationMinutes(startTime: string, endTime: string): number {
  const start = clockMinutes(startTime);
  const end = clockMinutes(endTime);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return Number.NaN;
  const duration = (end - start + 24 * 60) % (24 * 60);
  return duration === 0 ? 24 * 60 : duration;
}

export function requireValidShiftWindow(startTime: string, endTime: string, breakMinutes: number): void {
  const duration = shiftDurationMinutes(startTime, endTime);
  if (!Number.isFinite(duration) || !Number.isSafeInteger(breakMinutes) || breakMinutes < 0 ||
      duration > MAX_SHIFT_MINUTES || breakMinutes >= duration) {
    throw new AppError(
      "VALIDATION_FAILED",
      "Smjena mora trajati najviše 16 sati, a pauza mora biti kraća od smjene."
    );
  }
}
