import type { TerminalLifecycleEvidence, TerminalSyncEventView } from "./contracts.js";

export type TerminalSyncEventRow = {
  id: string;
  terminal_id: string;
  device_event_id: string;
  sequence: string | number;
  worker_id: string | null;
  occurred_at: Date | string;
  acknowledged_at: Date | string | null;
  received_at: Date | string;
  event_type: TerminalSyncEventView["eventType"];
  status: TerminalSyncEventView["status"];
  rejection_code: string | null;
  attendance_event_id: string | null;
  acknowledgement_verified: boolean;
  lifecycle_evidence: TerminalLifecycleEvidence | string;
};

function iso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

export function terminalSyncEventView(row: TerminalSyncEventRow): TerminalSyncEventView {
  return {
    id: row.id,
    terminalId: row.terminal_id,
    deviceEventId: row.device_event_id,
    sequence: Number(row.sequence),
    workerId: row.worker_id,
    occurredAt: iso(row.occurred_at),
    acknowledgedAt: row.acknowledged_at ? iso(row.acknowledged_at) : null,
    receivedAt: iso(row.received_at),
    eventType: row.event_type,
    status: row.status,
    rejectionCode: row.rejection_code,
    attendanceEventId: row.attendance_event_id,
    acknowledgementVerified: row.acknowledgement_verified,
    lifecycleEvidence: typeof row.lifecycle_evidence === "string"
      ? JSON.parse(row.lifecycle_evidence) as TerminalLifecycleEvidence
      : row.lifecycle_evidence
  };
}
