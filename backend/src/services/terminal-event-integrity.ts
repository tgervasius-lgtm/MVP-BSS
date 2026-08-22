import { timingSafeEqual } from "node:crypto";
import type { TenantTransaction } from "../db/tenant.js";
import { decryptDeviceCredential } from "../security/device-credentials.js";
import { hashToken } from "../security/tokens.js";
import { verifyTerminalAcknowledgement } from "../security/terminal-acknowledgement.js";
import type { TerminalEventWrite, TerminalLifecycleEvidence } from "./contracts.js";

type CardRow = {
  id: string;
  worker_id: string;
  status: "active" | "blocked";
  valid_from: string | Date;
  valid_to: string | Date | null;
};

type WorkerStatusRow = {
  id: string;
  status: "active" | "blocked";
};

type DepartmentAssignmentRow = { id: string; department_id: string };

type AcknowledgementCredentialRow = {
  credential_hash: Buffer;
  credential_ciphertext: Buffer | null;
  credential_iv: Buffer | null;
  credential_auth_tag: Buffer | null;
  valid_from: string | Date;
  valid_to: string | Date | null;
  revoked_at: string | Date | null;
};

export type TerminalEventIntegrityResult = {
  outcome: "accepted" | "rejected" | "reconciliation_required";
  code: string | null;
  workerId: string | null;
  effectiveDepartmentId: string | null;
  card: CardRow | null;
  evidence: TerminalLifecycleEvidence;
};

function iso(value: string | Date): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function result(
  outcome: TerminalEventIntegrityResult["outcome"],
  code: string | null,
  delaySeconds: number | null,
  verified: boolean,
  extra: Partial<TerminalLifecycleEvidence> = {},
  card: CardRow | null = null,
  workerId: string | null = null,
  effectiveDepartmentId: string | null = null
): TerminalEventIntegrityResult {
  return {
    outcome,
    code,
    workerId,
    effectiveDepartmentId,
    card,
    evidence: { decision: outcome, code, acknowledgement: { verified, delaySeconds }, ...extra }
  };
}

export async function resolveTerminalEventIntegrity(
  client: TenantTransaction,
  terminalId: string,
  deviceCredentialEncryptionKey: string,
  event: TerminalEventWrite,
  batchSentAt: string,
  now = new Date()
): Promise<TerminalEventIntegrityResult> {
  const occurredAt = Date.parse(event.occurredAt);
  const acknowledgedAt = Date.parse(event.acknowledgedAt);
  const delaySeconds = Number.isFinite(occurredAt) && Number.isFinite(acknowledgedAt)
    ? Math.floor((acknowledgedAt - occurredAt) / 1000)
    : null;
  const acknowledgement = {
    keyId: event.acknowledgementKeyId,
    keyVersion: event.acknowledgementKeyVersion,
    clockStatus: event.clockStatus
  };
  const finish = (
    outcome: TerminalEventIntegrityResult["outcome"],
    code: string | null,
    verified: boolean,
    extra: Partial<TerminalLifecycleEvidence> = {},
    card: CardRow | null = null,
    workerId: string | null = null,
    effectiveDepartmentId: string | null = null
  ) => result(outcome, code, delaySeconds, verified, {
    ...extra,
    acknowledgement: { verified, delaySeconds, ...acknowledgement }
  }, card, workerId, effectiveDepartmentId);

  const credentialResult = await client.query<AcknowledgementCredentialRow>(
    `SELECT credential_hash, credential_ciphertext, credential_iv, credential_auth_tag,
       valid_from, valid_to, revoked_at
     FROM terminal_credentials
     WHERE terminal_id = $1 AND id = $2 AND acknowledgement_key_version = $3`,
    [terminalId, event.acknowledgementKeyId, event.acknowledgementKeyVersion]
  );
  const credential = credentialResult.rows[0];
  if (!credential || !credential.credential_ciphertext || !credential.credential_iv || !credential.credential_auth_tag) {
    return finish("rejected", "ACKNOWLEDGEMENT_KEY_UNKNOWN", false);
  }
  const keyValidFrom = new Date(credential.valid_from).getTime();
  const keyValidTo = credential.valid_to ? new Date(credential.valid_to).getTime() : Number.POSITIVE_INFINITY;
  const keyRevokedAt = credential.revoked_at ? new Date(credential.revoked_at).getTime() : Number.POSITIVE_INFINITY;
  let deviceCredential: string;
  try {
    deviceCredential = decryptDeviceCredential(deviceCredentialEncryptionKey, {
      ciphertext: credential.credential_ciphertext,
      iv: credential.credential_iv,
      authTag: credential.credential_auth_tag
    });
  } catch {
    return finish("rejected", "ACKNOWLEDGEMENT_KEY_UNAVAILABLE", false);
  }
  const credentialHash = hashToken(deviceCredential);
  const credentialMatches = credentialHash.length === credential.credential_hash.length
    && timingSafeEqual(credentialHash, credential.credential_hash);
  const verified = credentialMatches && verifyTerminalAcknowledgement(deviceCredential, terminalId, event);
  if (!verified) return finish("rejected", "INVALID_ACKNOWLEDGEMENT", false);
  if (!Number.isFinite(acknowledgedAt) || acknowledgedAt < keyValidFrom || acknowledgedAt >= Math.min(keyValidTo, keyRevokedAt)) {
    return finish("rejected", "ACKNOWLEDGEMENT_KEY_INACTIVE", true);
  }
  if (delaySeconds === null || delaySeconds < 0) {
    return finish("rejected", "ACKNOWLEDGEMENT_BEFORE_EVENT", true);
  }
  if (acknowledgedAt > Date.parse(batchSentAt)) {
    return finish("rejected", "ACKNOWLEDGEMENT_AFTER_BATCH_SENT", true);
  }
  if (acknowledgedAt > now.getTime() + 5 * 60_000) {
    return finish("reconciliation_required", "ACKNOWLEDGEMENT_CLOCK_AMBIGUOUS", true);
  }
  if (event.clockStatus !== "trusted" || Math.abs(event.deviceClockOffsetSeconds) > 300) {
    return finish("reconciliation_required", "DEVICE_CLOCK_HEALTH_UNCERTAIN", true);
  }

  const cards = await client.query<CardRow>(
    `SELECT id, worker_id, status, valid_from, valid_to
     FROM rfid_cards
     WHERE uid_hash = decode($1, 'hex')
       AND valid_from <= $2
       AND (valid_to IS NULL OR valid_to > $3)
     ORDER BY valid_from DESC
     LIMIT 2`,
    [event.cardUidHash, event.occurredAt, event.acknowledgedAt]
  );
  if (cards.rows.length > 1) {
    return finish("reconciliation_required", "AMBIGUOUS_CARD_HISTORY", true);
  }
  const card = cards.rows[0];
  if (!card) {
    const knownCard = await client.query<{ present: boolean }>(
      "SELECT EXISTS (SELECT 1 FROM rfid_cards WHERE uid_hash = decode($1, 'hex')) AS present",
      [event.cardUidHash]
    );
    return finish(
      "rejected",
      knownCard.rows[0]?.present ? "CARD_INACTIVE_AT_ACKNOWLEDGEMENT" : "CARD_NOT_ASSIGNED",
      true
    );
  }
  if (card.status === "blocked" && !card.valid_to) {
    return finish(
      "reconciliation_required", "CARD_HISTORY_INCONSISTENT", true,
      { rfidCardId: card.id, rfidValidFrom: iso(card.valid_from), rfidValidTo: null },
      card, card.worker_id
    );
  }

  const department = await client.query<DepartmentAssignmentRow>(
    `SELECT id, department_id FROM worker_department_assignments
     WHERE worker_id = $1 AND effective_from <= $2 AND (effective_to IS NULL OR effective_to > $2)
     ORDER BY effective_from DESC LIMIT 2`,
    [card.worker_id, event.occurredAt]
  );
  if (department.rows.length !== 1) {
    return finish(
      "reconciliation_required", "DEPARTMENT_HISTORY_UNAVAILABLE", true,
      { rfidCardId: card.id, rfidValidFrom: iso(card.valid_from), rfidValidTo: card.valid_to ? iso(card.valid_to) : null },
      card, card.worker_id
    );
  }
  const effectiveDepartmentId = department.rows[0]!.department_id;

  const workerStatuses = await client.query<WorkerStatusRow>(
    `SELECT id, status FROM worker_status_versions
     WHERE worker_id = $1
       AND effective_from <= $2
       AND (effective_to IS NULL OR effective_to > $3)
     ORDER BY effective_from DESC
     LIMIT 2`,
    [card.worker_id, event.occurredAt, event.acknowledgedAt]
  );
  const workerStatus = workerStatuses.rows[0];
  const cardEvidence: Partial<TerminalLifecycleEvidence> = {
    rfidCardId: card.id,
    rfidValidFrom: iso(card.valid_from),
    rfidValidTo: card.valid_to ? iso(card.valid_to) : null,
    departmentAssignmentId: department.rows[0]!.id
  };
  if (workerStatuses.rows.length > 1 || !workerStatus) {
    const blocked = await client.query<{ present: boolean }>(
      `SELECT EXISTS (
         SELECT 1 FROM worker_status_versions
         WHERE worker_id = $1 AND status = 'blocked'
           AND effective_from < $3
           AND (effective_to IS NULL OR effective_to > $2)
       ) AS present`,
      [card.worker_id, event.occurredAt, event.acknowledgedAt]
    );
    return finish(
      blocked.rows[0]?.present ? "rejected" : "reconciliation_required",
      blocked.rows[0]?.present ? "WORKER_INACTIVE_AT_ACKNOWLEDGEMENT" : "WORKER_STATUS_HISTORY_UNAVAILABLE",
      true,
      cardEvidence,
      card,
      card.worker_id,
      effectiveDepartmentId
    );
  }
  const workerEvidence: Partial<TerminalLifecycleEvidence> = {
    ...cardEvidence,
    workerStatusVersionId: workerStatus.id,
    workerStatus: workerStatus.status
  };
  if (workerStatus.status !== "active") {
    return finish(
      "rejected", "WORKER_INACTIVE_AT_ACKNOWLEDGEMENT", true,
      workerEvidence, card, card.worker_id, effectiveDepartmentId
    );
  }
  return finish(
    "accepted", null, true,
    workerEvidence,
    card, card.worker_id, effectiveDepartmentId
  );
}
