import { AppError } from "../domain/errors.js";

const VALIDATION_CODES = new Set(["23503", "23514", "22P02", "22001", "22003", "22007"]);

export function normalizeDatabaseError(error: unknown): never {
  const code = typeof error === "object" && error !== null && "code" in error ? String(error.code) : "";
  if (code === "23505") {
    throw new AppError("CONFLICT", "Zapis s istom jedinstvenom vrijednošću ili aktivnim stanjem već postoji.");
  }
  if (VALIDATION_CODES.has(code)) {
    throw new AppError("VALIDATION_FAILED", "Povezani zapis, datum ili vrijednost nisu valjani.");
  }
  throw error;
}
