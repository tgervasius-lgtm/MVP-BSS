import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export type DeviceRequestToSign = Readonly<{
  method: string;
  path: string;
  body: string | Buffer;
  timestamp: string;
  nonce: string;
}>;

export function canonicalDeviceRequest(request: DeviceRequestToSign): string {
  const bodyHash = createHash("sha256").update(request.body).digest("hex");
  return [request.method.toUpperCase(), request.path, bodyHash, request.timestamp, request.nonce].join("\n");
}

export function signDeviceRequest(secret: string | Buffer, request: DeviceRequestToSign): string {
  return createHmac("sha256", secret).update(canonicalDeviceRequest(request), "utf8").digest("hex");
}

export function isDeviceTimestampFresh(timestamp: string, now: Date = new Date(), maxSkewSeconds = 300): boolean {
  const received = Date.parse(timestamp);
  return Number.isFinite(received) && Math.abs(now.getTime() - received) <= maxSkewSeconds * 1000;
}

export function verifyDeviceSignature(
  secret: string | Buffer,
  request: DeviceRequestToSign,
  signature: string,
  now: Date = new Date(),
  maxSkewSeconds = 300
): boolean {
  if (!isDeviceTimestampFresh(request.timestamp, now, maxSkewSeconds) || !/^[0-9a-f]{64}$/.test(signature)) return false;
  const expected = Buffer.from(signDeviceRequest(secret, request), "hex");
  const candidate = Buffer.from(signature, "hex");
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}
