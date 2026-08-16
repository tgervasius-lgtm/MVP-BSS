import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export type TerminalAcknowledgementEvent = Readonly<{
  acknowledgementKeyId: string;
  acknowledgementKeyVersion: number;
  deviceEventId: string;
  sequence: number;
  occurredAt: string;
  eventType: "check_in" | "check_out";
  cardUidHash: string;
  deviceClockOffsetSeconds: number;
  clockStatus: "trusted" | "uncertain";
  acknowledgedAt: string;
  acknowledgementSignature: string;
}>;

export const ACKNOWLEDGEMENT_CONTEXT = "BSS-TERMINAL-ACK-V2";
export const ACKNOWLEDGEMENT_KEY_CONTEXT = "BSS-TERMINAL-ACK-KEY-V1";

export function deriveTerminalAcknowledgementKey(
  deviceCredential: string | Buffer,
  terminalId: string,
  acknowledgementKeyId: string,
  acknowledgementKeyVersion: number
): Buffer {
  return createHmac("sha256", deviceCredential)
    .update([
      ACKNOWLEDGEMENT_KEY_CONTEXT,
      terminalId,
      acknowledgementKeyId,
      String(acknowledgementKeyVersion)
    ].join("\n"), "utf8")
    .digest();
}

export function canonicalTerminalAcknowledgement(
  terminalId: string,
  event: Omit<TerminalAcknowledgementEvent, "acknowledgementSignature">
): string {
  return [
    ACKNOWLEDGEMENT_CONTEXT,
    terminalId,
    event.acknowledgementKeyId,
    String(event.acknowledgementKeyVersion),
    event.deviceEventId,
    String(event.sequence),
    event.occurredAt,
    event.eventType,
    event.cardUidHash.toLowerCase(),
    String(event.deviceClockOffsetSeconds),
    event.clockStatus,
    event.acknowledgedAt
  ].join("\n");
}

export function signTerminalAcknowledgement(
  deviceCredential: string | Buffer,
  terminalId: string,
  event: Omit<TerminalAcknowledgementEvent, "acknowledgementSignature">
): string {
  const acknowledgementKey = deriveTerminalAcknowledgementKey(
    deviceCredential,
    terminalId,
    event.acknowledgementKeyId,
    event.acknowledgementKeyVersion
  );
  return createHmac("sha256", acknowledgementKey)
    .update(canonicalTerminalAcknowledgement(terminalId, event), "utf8")
    .digest("hex");
}

export function verifyTerminalAcknowledgement(
  deviceCredential: string | Buffer,
  terminalId: string,
  event: TerminalAcknowledgementEvent
): boolean {
  if (!/^[0-9a-f]{64}$/.test(event.acknowledgementSignature)) return false;
  const expected = Buffer.from(signTerminalAcknowledgement(deviceCredential, terminalId, event), "hex");
  const candidate = Buffer.from(event.acknowledgementSignature, "hex");
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}

export function terminalEventFingerprint(terminalId: string, event: TerminalAcknowledgementEvent): Buffer {
  return createHash("sha256")
    .update(canonicalTerminalAcknowledgement(terminalId, event), "utf8")
    .update("\n", "utf8")
    .update(event.acknowledgementSignature, "utf8")
    .digest();
}
