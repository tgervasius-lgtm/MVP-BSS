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
  reconciliation_resolution?: "accepted" | "rejected" | null;
  reconciliation_attendance_day_id?: string | null;
  reconciliation_created_at?: Date | string | null;
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
      : row.lifecycle_evidence,
    reconciliation: row.reconciliation_resolution && row.reconciliation_created_at ? {
      resolution: row.reconciliation_resolution,
      attendanceDayId: row.reconciliation_attendance_day_id ?? null,
      createdAt: iso(row.reconciliation_created_at)
    } : null
  };
}

// Parameter 8 is the authenticated role; Managers retain their existing read surface.
export const terminalSyncHistorySelect = `SELECT e.id, e.terminal_id, e.device_event_id, e.sequence, e.worker_id, e.occurred_at,
           e.acknowledged_at, e.received_at, e.event_type, e.status, e.rejection_code,
           e.attendance_event_id, e.acknowledgement_verified, e.lifecycle_evidence,
           r.resolution AS reconciliation_resolution, r.attendance_day_id AS reconciliation_attendance_day_id,
           r.created_at AS reconciliation_created_at
         FROM terminal_sync_events e
         LEFT JOIN terminal_event_reconciliations r ON r.attendance_event_id = e.attendance_event_id
           AND r.organization_id = e.organization_id AND $8::text = 'admin'`;
