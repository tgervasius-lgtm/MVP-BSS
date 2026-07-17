import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export function createOpaqueToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashToken(token: string): Buffer {
  return createHash("sha256").update(token, "utf8").digest();
}

export function tokenHashMatches(token: string, expected: Buffer): boolean {
  const actual = hashToken(token);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
