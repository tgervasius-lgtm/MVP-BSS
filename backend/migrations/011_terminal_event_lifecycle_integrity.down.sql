DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM attendance_events WHERE acknowledged_at IS NOT NULL)
     OR EXISTS (SELECT 1 FROM attendance_events WHERE processing_status = 'reconciliation_required')
     OR EXISTS (SELECT 1 FROM terminal_sync_events WHERE acknowledged_at IS NOT NULL)
     OR EXISTS (SELECT 1 FROM terminal_sync_events WHERE status = 'reconciliation_required')
     OR EXISTS (SELECT 1 FROM terminal_event_reconciliations)
     OR EXISTS (SELECT 1 FROM terminal_credentials WHERE acknowledgement_key_version > 1)
     OR EXISTS (SELECT 1 FROM worker_status_versions WHERE effective_to IS NOT NULL) THEN
    RAISE EXCEPTION 'Refusing to remove terminal acknowledgement evidence; recover forward instead';
  END IF;
END;
$$;

DROP INDEX terminal_sync_events_reconciliation_idx;
DROP TABLE terminal_event_reconciliations;

ALTER TABLE terminal_sync_events
  DROP CONSTRAINT sync_event_attendance_event_same_tenant,
  DROP CONSTRAINT sync_event_acknowledgement_metadata_complete,
  DROP COLUMN lifecycle_evidence,
  DROP COLUMN acknowledgement_verified,
  DROP COLUMN clock_status,
  DROP COLUMN acknowledgement_key_version,
  DROP COLUMN acknowledgement_key_id,
  DROP COLUMN acknowledged_at,
  DROP COLUMN attendance_event_id;

ALTER TABLE attendance_events
  DROP CONSTRAINT attendance_event_acknowledgement_complete,
  DROP COLUMN lifecycle_evidence,
  DROP COLUMN event_fingerprint,
  DROP COLUMN acknowledgement_signature,
  DROP COLUMN acknowledgement_proof_status,
  DROP COLUMN clock_status,
  DROP COLUMN acknowledgement_key_version,
  DROP COLUMN acknowledgement_key_id,
  DROP COLUMN acknowledged_at;

ALTER TABLE terminal_sync_events DROP CONSTRAINT terminal_sync_events_status_check;
ALTER TABLE terminal_sync_events ADD CONSTRAINT terminal_sync_events_status_check
  CHECK (status IN ('queued', 'synced', 'duplicate', 'rejected'));

ALTER TABLE attendance_events DROP CONSTRAINT attendance_events_processing_status_check;
ALTER TABLE attendance_events ADD CONSTRAINT attendance_events_processing_status_check
  CHECK (processing_status IN ('queued', 'accepted', 'rejected'));

DROP TRIGGER workers_track_status ON workers;
DROP FUNCTION bss_track_worker_status();
DROP TABLE worker_status_versions;

DROP INDEX terminal_credentials_acknowledgement_lookup_idx;
CREATE OR REPLACE FUNCTION bss_terminal_credential_lookup(p_terminal_id uuid)
RETURNS TABLE (
  organization_id uuid, terminal_id uuid, terminal_status varchar,
  credential_hash bytea, credential_ciphertext bytea, credential_iv bytea,
  credential_auth_tag bytea, key_version smallint, valid_from timestamptz,
  valid_to timestamptz, revoked_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
SET row_security = off
AS $$
  SELECT c.organization_id, c.terminal_id, t.status, c.credential_hash,
         c.credential_ciphertext, c.credential_iv, c.credential_auth_tag,
         c.key_version, c.valid_from, c.valid_to, c.revoked_at
  FROM terminal_credentials c
  JOIN terminals t
    ON t.organization_id = c.organization_id AND t.id = c.terminal_id
  WHERE c.terminal_id = p_terminal_id
  ORDER BY c.valid_from DESC
  LIMIT 1
$$;
REVOKE ALL ON FUNCTION bss_terminal_credential_lookup(uuid) FROM PUBLIC;
ALTER TABLE terminal_credentials
  DROP CONSTRAINT terminal_acknowledgement_key_version_unique,
  DROP CONSTRAINT terminal_acknowledgement_key_version_positive,
  DROP COLUMN acknowledgement_key_version;
