import { AppError } from "../domain/errors.js";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type TimelineCursor = Readonly<{ at: string; id: string }>;

export function decodeUuidCursor(cursor: string | undefined): string | null {
  if (!cursor) return null;
  try {
    const value = Buffer.from(cursor, "base64url").toString("utf8");
    if (!UUID_PATTERN.test(value)) throw new Error();
    return value;
  } catch {
    throw new AppError("VALIDATION_FAILED", "Kursor stranice nije valjan.");
  }
}

export function encodeUuidCursor(id: string): string {
  return Buffer.from(id, "utf8").toString("base64url");
}

export function decodeTimelineCursor(cursor: string | undefined): TimelineCursor | null {
  if (!cursor) return null;
  try {
    const parsed = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")) as {
      at?: unknown;
      receivedAt?: unknown;
      id?: unknown;
    };
    // `receivedAt` keeps already issued terminal cursors valid while all new
    // cursor families use the same opaque `{at,id}` envelope.
    const at = parsed.at ?? parsed.receivedAt;
    if (typeof at !== "string" || Number.isNaN(Date.parse(at)) || typeof parsed.id !== "string" || !UUID_PATTERN.test(parsed.id)) {
      throw new Error();
    }
    return { at, id: parsed.id };
  } catch {
    throw new AppError("VALIDATION_FAILED", "Kursor stranice nije valjan.");
  }
}

export function encodeTimelineCursor(at: string | Date, id: string): string {
  const normalized = at instanceof Date ? at.toISOString() : at;
  return Buffer.from(JSON.stringify({ at: normalized, id }), "utf8").toString("base64url");
}
