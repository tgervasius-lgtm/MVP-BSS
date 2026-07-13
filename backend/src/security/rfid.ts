import { createHmac } from "node:crypto";
import { AppError } from "../domain/errors.js";

export function normalizeRfidUid(uid: string): string {
  const normalized = uid.replace(/[:\s-]/g, "").toUpperCase();
  if (!/^[0-9A-F]{8,64}$/.test(normalized) || normalized.length % 2 !== 0) {
    throw new AppError("VALIDATION_FAILED", "RFID UID mora biti valjana heksadecimalna vrijednost.", {
      uid: ["Očekuje se 8–64 heksadecimalna znaka."]
    });
  }
  return normalized;
}

export function hashRfidUid(uid: string, pepper: string): Buffer {
  return createHmac("sha256", pepper).update(normalizeRfidUid(uid), "utf8").digest();
}

export function maskRfidUid(uid: string): string {
  const normalized = normalizeRfidUid(uid);
  return `****${normalized.slice(-4)}`;
}
