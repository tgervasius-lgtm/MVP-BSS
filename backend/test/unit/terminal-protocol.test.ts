import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { signDeviceRequest } from "../../src/security/device-signature.js";
import { hashRfidUid } from "../../src/security/rfid.js";
import { signTerminalAcknowledgement } from "../../src/security/terminal-acknowledgement.js";

test("Python terminal signatures match independent TypeScript protocol implementations", () => {
  const config = { terminalId: randomUUID(), deviceCredential: "synthetic-device-for-protocol-compatibility",
    rfidPepper: "synthetic-pepper-for-protocol-compatibility" };
  const uid = "04:ab-cd ef";
  const timestamp = "2026-10-04T12:00:00.123Z";
  const nonce = randomUUID();
  const event = { acknowledgementKeyId: randomUUID(), acknowledgementKeyVersion: 2,
    deviceEventId: randomUUID(), sequence: 42, occurredAt: timestamp, eventType: "check_in" as const,
    cardUidHash: hashRfidUid(uid, config.rfidPepper).toString("hex"), deviceClockOffsetSeconds: -15,
    clockStatus: "trusted" as const, acknowledgedAt: "2026-10-04T12:00:00.124Z" };
  const path = "/api/v1/terminal/v1/events/batch";
  const body = JSON.stringify({ batchId: randomUUID(), sentAt: timestamp, events: [event] });
  const result = spawnSync(process.env.BSS_PYTHON ?? "python3", ["-m", "terminal.tests.protocol_probe"], {
    cwd: fileURLToPath(new URL("../../../", import.meta.url)), encoding: "utf8", timeout: 10000,
    input: JSON.stringify({ config, uid, event, path, body, timestamp, nonce })
  });
  assert.equal(result.status, 0, result.error?.message ?? result.stderr);
  const python = JSON.parse(result.stdout);
  assert.equal(python.cardHash, event.cardUidHash);
  assert.equal(python.receipt, signTerminalAcknowledgement(config.deviceCredential, config.terminalId, event));
  assert.equal(python.headers["X-BSS-Signature"], signDeviceRequest(config.deviceCredential,
    { method: "POST", path, body, timestamp, nonce }));
});
