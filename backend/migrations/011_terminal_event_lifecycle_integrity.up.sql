CREATE TABLE worker_status_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  worker_id uuid NOT NULL,
  status varchar(16) NOT NULL CHECK (status IN ('active', 'blocked')),
  effective_from timestamptz NOT NULL,
  effective_to timestamptz,
  recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE (organization_id, id),
  UNIQUE (organization_id, worker_id, effective_from),
  CONSTRAINT worker_status_version_worker_same_tenant
    FOREIGN KEY (organization_id, worker_id)
    REFERENCES workers(organization_id, id) ON DELETE RESTRICT,
  CHECK (effective_to IS NULL OR effective_to > effective_from)
);

CREATE UNIQUE INDEX worker_status_versions_current_unique
  ON worker_status_versions (organization_id, worker_id)
  WHERE effective_to IS NULL;
CREATE INDEX worker_status_versions_effective_lookup_idx
  ON worker_status_versions (organization_id, worker_id, effective_from DESC, effective_to);

-- Pre-migration lifecycle history cannot be reconstructed safely from mutable state.
-- Existing status becomes authoritative only from this migration forward.
INSERT INTO worker_status_versions (organization_id, worker_id, status, effective_from)
SELECT organization_id, id, status, transaction_timestamp()
FROM workers;

ALTER TABLE worker_status_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE worker_status_versions FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON worker_status_versions
  USING (organization_id = bss_current_organization_id())
  WITH CHECK (organization_id = bss_current_organization_id());

CREATE FUNCTION bss_track_worker_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  changed_at timestamptz;
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO worker_status_versions (
      organization_id, worker_id, status, effective_from
    ) VALUES (NEW.organization_id, NEW.id, NEW.status, NEW.created_at);
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    changed_at := NEW.updated_at;
    UPDATE worker_status_versions
    SET effective_to = changed_at
    WHERE organization_id = OLD.organization_id
      AND worker_id = OLD.id
      AND effective_to IS NULL;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Missing current status version for worker %', OLD.id USING ERRCODE = '23514';
    END IF;
    INSERT INTO worker_status_versions (
      organization_id, worker_id, status, effective_from
    ) VALUES (NEW.organization_id, NEW.id, NEW.status, changed_at);
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION bss_track_worker_status() FROM PUBLIC;

CREATE TRIGGER workers_track_status
AFTER INSERT OR UPDATE OF status ON workers
FOR EACH ROW EXECUTE FUNCTION bss_track_worker_status();

ALTER TABLE terminal_credentials
  ADD COLUMN acknowledgement_key_version integer;

WITH ranked_credentials AS (
  SELECT id, row_number() OVER (
    PARTITION BY organization_id, terminal_id ORDER BY valid_from, id
  )::integer AS acknowledgement_key_version
  FROM terminal_credentials
)
UPDATE terminal_credentials c
SET acknowledgement_key_version = ranked.acknowledgement_key_version
FROM ranked_credentials ranked
WHERE ranked.id = c.id;

ALTER TABLE terminal_credentials
  ALTER COLUMN acknowledgement_key_version SET NOT NULL,
  ALTER COLUMN acknowledgement_key_version SET DEFAULT 1,
  ADD CONSTRAINT terminal_acknowledgement_key_version_positive
    CHECK (acknowledgement_key_version > 0),
  ADD CONSTRAINT terminal_acknowledgement_key_version_unique
    UNIQUE (organization_id, terminal_id, acknowledgement_key_version);

CREATE INDEX terminal_credentials_acknowledgement_lookup_idx
  ON terminal_credentials (organization_id, terminal_id, id, acknowledgement_key_version);

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
  ORDER BY c.valid_from DESC, c.acknowledgement_key_version DESC
  LIMIT 1
$$;

REVOKE ALL ON FUNCTION bss_terminal_credential_lookup(uuid) FROM PUBLIC;

ALTER TABLE attendance_events DROP CONSTRAINT attendance_events_processing_status_check;
ALTER TABLE attendance_events ALTER COLUMN processing_status TYPE varchar(32);
ALTER TABLE attendance_events ADD CONSTRAINT attendance_events_processing_status_check
  CHECK (processing_status IN ('queued', 'accepted', 'rejected', 'reconciliation_required'));

ALTER TABLE terminal_sync_events DROP CONSTRAINT terminal_sync_events_status_check;
ALTER TABLE terminal_sync_events ALTER COLUMN status TYPE varchar(32);
ALTER TABLE terminal_sync_events ADD CONSTRAINT terminal_sync_events_status_check
  CHECK (status IN ('queued', 'synced', 'duplicate', 'rejected', 'reconciliation_required'));

ALTER TABLE attendance_events
  ADD COLUMN acknowledged_at timestamptz,
  ADD COLUMN acknowledgement_key_id uuid,
  ADD COLUMN acknowledgement_key_version integer,
  ADD COLUMN clock_status varchar(16),
  ADD COLUMN acknowledgement_proof_status varchar(16) NOT NULL DEFAULT 'unknown'
    CHECK (acknowledgement_proof_status IN ('unknown', 'verified', 'invalid')),
  ADD COLUMN acknowledgement_signature bytea,
  ADD COLUMN event_fingerprint bytea,
  ADD COLUMN lifecycle_evidence jsonb NOT NULL DEFAULT
    '{"decision":"reconciliation_required","code":"LEGACY_EVIDENCE_UNAVAILABLE","acknowledgement":{"verified":false,"delaySeconds":null}}'::jsonb,
  ADD CONSTRAINT attendance_event_acknowledgement_complete CHECK (
    (acknowledged_at IS NULL AND acknowledgement_key_id IS NULL
      AND acknowledgement_key_version IS NULL AND clock_status IS NULL
      AND acknowledgement_signature IS NULL AND event_fingerprint IS NULL
      AND acknowledgement_proof_status = 'unknown')
    OR
    (acknowledged_at IS NOT NULL AND acknowledgement_key_id IS NOT NULL
      AND acknowledgement_key_version IS NOT NULL AND acknowledgement_key_version > 0
      AND clock_status IN ('trusted', 'uncertain') AND acknowledgement_signature IS NOT NULL
      AND acknowledgement_proof_status IN ('verified', 'invalid')
      AND octet_length(acknowledgement_signature) = 32
      AND event_fingerprint IS NOT NULL AND octet_length(event_fingerprint) = 32)
  );

ALTER TABLE terminal_sync_events
  ADD COLUMN attendance_event_id uuid,
  ADD COLUMN acknowledged_at timestamptz,
  ADD COLUMN acknowledgement_key_id uuid,
  ADD COLUMN acknowledgement_key_version integer,
  ADD COLUMN clock_status varchar(16),
  ADD COLUMN acknowledgement_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN lifecycle_evidence jsonb NOT NULL DEFAULT
    '{"decision":"reconciliation_required","code":"LEGACY_EVIDENCE_UNAVAILABLE","acknowledgement":{"verified":false,"delaySeconds":null}}'::jsonb,
  ADD CONSTRAINT sync_event_attendance_event_same_tenant
    FOREIGN KEY (organization_id, attendance_event_id)
    REFERENCES attendance_events(organization_id, id) ON DELETE RESTRICT,
  ADD CONSTRAINT sync_event_acknowledgement_metadata_complete CHECK (
    (acknowledged_at IS NULL AND acknowledgement_key_id IS NULL
      AND acknowledgement_key_version IS NULL AND clock_status IS NULL)
    OR
    (acknowledged_at IS NOT NULL AND acknowledgement_key_id IS NOT NULL
      AND acknowledgement_key_version IS NOT NULL AND acknowledgement_key_version > 0
      AND clock_status IN ('trusted', 'uncertain'))
  );

CREATE INDEX terminal_sync_events_reconciliation_idx
  ON terminal_sync_events (organization_id, received_at DESC, id DESC)
  WHERE status = 'reconciliation_required';

CREATE TABLE terminal_event_reconciliations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  attendance_event_id uuid NOT NULL,
  resolution varchar(16) NOT NULL CHECK (resolution IN ('accepted', 'rejected')),
  reason text NOT NULL CHECK (length(btrim(reason)) >= 3),
  resolved_by uuid NOT NULL,
  attendance_day_id uuid,
  timezone_version_id uuid,
  timezone_name varchar(64),
  resolved_local_at timestamp without time zone,
  resolved_utc_offset_seconds integer,
  before_json jsonb NOT NULL,
  after_json jsonb NOT NULL,
  provenance jsonb NOT NULL,
  request_id varchar(128) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE (organization_id, id),
  UNIQUE (organization_id, attendance_event_id),
  CONSTRAINT terminal_reconciliation_event_same_tenant
    FOREIGN KEY (organization_id, attendance_event_id)
    REFERENCES attendance_events(organization_id, id) ON DELETE RESTRICT,
  CONSTRAINT terminal_reconciliation_actor_same_tenant
    FOREIGN KEY (organization_id, resolved_by)
    REFERENCES users(organization_id, id) ON DELETE RESTRICT,
  CONSTRAINT terminal_reconciliation_day_same_tenant
    FOREIGN KEY (organization_id, attendance_day_id)
    REFERENCES attendance_days(organization_id, id) ON DELETE RESTRICT,
  CONSTRAINT terminal_reconciliation_timezone_same_tenant
    FOREIGN KEY (organization_id, timezone_version_id)
    REFERENCES organization_timezone_versions(organization_id, id) ON DELETE RESTRICT,
  CHECK ((resolution = 'accepted' AND attendance_day_id IS NOT NULL)
    OR (resolution = 'rejected' AND attendance_day_id IS NULL)),
  CHECK ((resolution = 'accepted' AND timezone_version_id IS NOT NULL
      AND timezone_name IS NOT NULL AND resolved_local_at IS NOT NULL
      AND resolved_utc_offset_seconds IS NOT NULL)
    OR (resolution = 'rejected' AND timezone_version_id IS NULL
      AND timezone_name IS NULL AND resolved_local_at IS NULL
      AND resolved_utc_offset_seconds IS NULL))
);

CREATE INDEX terminal_event_reconciliations_timeline_idx
  ON terminal_event_reconciliations (organization_id, created_at DESC, id DESC);

ALTER TABLE terminal_event_reconciliations ENABLE ROW LEVEL SECURITY;
ALTER TABLE terminal_event_reconciliations FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON terminal_event_reconciliations
  USING (organization_id = bss_current_organization_id())
  WITH CHECK (organization_id = bss_current_organization_id());

CREATE TRIGGER terminal_event_reconciliations_immutable
BEFORE UPDATE OR DELETE ON terminal_event_reconciliations
FOR EACH ROW EXECUTE FUNCTION bss_reject_immutable_change();

COMMENT ON TABLE worker_status_versions IS
  'Effective-dated worker activation history used for event-time terminal authorization.';
COMMENT ON COLUMN attendance_events.acknowledged_at IS
  'Immutable terminal time captured after the individual event durable local commit; lifecycle authorization boundary under DEC-025.';
COMMENT ON COLUMN attendance_events.acknowledgement_key_id IS
  'Device-specific historical acknowledgement key identity; the corresponding plaintext credential is never stored here.';
COMMENT ON COLUMN attendance_events.acknowledgement_proof_status IS
  'DEC-025 proof classification. Pre-migration evidence remains unknown and never receives a fabricated receipt.';
COMMENT ON COLUMN attendance_events.clock_status IS
  'Terminal assertion about clock health; HMAC authenticates the assertion but does not prove clock correctness.';
COMMENT ON COLUMN attendance_events.acknowledgement_signature IS
  'Immutable per-device HMAC evidence for the locally acknowledged event payload.';
COMMENT ON COLUMN attendance_events.event_fingerprint IS
  'Immutable payload fingerprint used to reject device_event_id reuse with different evidence.';
COMMENT ON COLUMN attendance_events.lifecycle_evidence IS
  'Immutable event-time worker, card and configuration decision evidence.';
COMMENT ON COLUMN terminal_sync_events.lifecycle_evidence IS
  'Append-only observable decision evidence for accepted, rejected, duplicate or reconciliation-required delivery.';
COMMENT ON TABLE terminal_event_reconciliations IS
  'Append-only Administrator resolution with reason, before/after state and provenance; raw attendance evidence is never rewritten.';
