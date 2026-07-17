-- Complete the versioned v1 contract without rewriting already published migrations.

ALTER TABLE leave_requests DROP CONSTRAINT leave_requests_leave_type_check;
ALTER TABLE leave_requests ADD CONSTRAINT leave_requests_leave_type_check
  CHECK (leave_type IN ('annual_leave', 'paid_leave', 'unpaid_leave', 'free_day'));

ALTER TABLE terminals DROP CONSTRAINT terminals_status_check;
UPDATE terminals SET status = CASE status WHEN 'active' THEN 'offline' WHEN 'blocked' THEN 'revoked' ELSE status END;
ALTER TABLE terminals ADD CONSTRAINT terminals_status_check
  CHECK (status IN ('online', 'offline', 'revoked'));

CREATE TABLE holiday_calendars (
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  year integer NOT NULL CHECK (year BETWEEN 2020 AND 2100),
  revision bigint NOT NULL DEFAULT 0 CHECK (revision >= 0),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (organization_id, year)
);

INSERT INTO holiday_calendars (organization_id, year, revision)
SELECT organization_id, EXTRACT(YEAR FROM holiday_date)::integer, MAX(revision)
FROM holidays
GROUP BY organization_id, EXTRACT(YEAR FROM holiday_date)::integer
ON CONFLICT (organization_id, year) DO NOTHING;

ALTER TABLE holiday_calendars ENABLE ROW LEVEL SECURITY;
ALTER TABLE holiday_calendars FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON holiday_calendars
  USING (organization_id = bss_current_organization_id())
  WITH CHECK (organization_id = bss_current_organization_id());

CREATE TABLE terminal_request_nonces (
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  terminal_id uuid NOT NULL,
  nonce varchar(128) NOT NULL,
  request_timestamp timestamptz NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (organization_id, terminal_id, nonce),
  CONSTRAINT terminal_nonce_same_tenant FOREIGN KEY (organization_id, terminal_id)
    REFERENCES terminals(organization_id, id) ON DELETE CASCADE,
  CHECK (expires_at > request_timestamp)
);

ALTER TABLE terminal_request_nonces ENABLE ROW LEVEL SECURITY;
ALTER TABLE terminal_request_nonces FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON terminal_request_nonces
  USING (organization_id = bss_current_organization_id())
  WITH CHECK (organization_id = bss_current_organization_id());

CREATE TABLE terminal_sync_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  terminal_id uuid NOT NULL,
  device_event_id uuid NOT NULL,
  sequence bigint NOT NULL CHECK (sequence > 0),
  worker_id uuid,
  occurred_at timestamptz NOT NULL,
  received_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  event_type varchar(16) NOT NULL CHECK (event_type IN ('check_in', 'check_out')),
  status varchar(16) NOT NULL CHECK (status IN ('queued', 'synced', 'duplicate', 'rejected')),
  rejection_code varchar(64),
  request_id varchar(128) NOT NULL,
  UNIQUE (organization_id, id),
  CONSTRAINT sync_event_terminal_same_tenant FOREIGN KEY (organization_id, terminal_id)
    REFERENCES terminals(organization_id, id) ON DELETE RESTRICT,
  CONSTRAINT sync_event_worker_same_tenant FOREIGN KEY (organization_id, worker_id)
    REFERENCES workers(organization_id, id) ON DELETE RESTRICT
);

CREATE INDEX terminal_sync_events_timeline_idx
  ON terminal_sync_events (organization_id, terminal_id, received_at DESC, id DESC);

CREATE TRIGGER terminal_sync_events_immutable
BEFORE UPDATE OR DELETE ON terminal_sync_events
FOR EACH ROW EXECUTE FUNCTION bss_reject_immutable_change();

ALTER TABLE terminal_sync_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE terminal_sync_events FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON terminal_sync_events
  USING (organization_id = bss_current_organization_id())
  WITH CHECK (organization_id = bss_current_organization_id());

ALTER TABLE terminal_credentials
  ADD COLUMN credential_ciphertext bytea,
  ADD COLUMN credential_iv bytea,
  ADD COLUMN credential_auth_tag bytea,
  ADD COLUMN key_version smallint NOT NULL DEFAULT 1 CHECK (key_version > 0);

CREATE INDEX attendance_events_terminal_received_idx
  ON attendance_events (organization_id, terminal_id, received_at DESC, id DESC);
CREATE INDEX attendance_days_report_idx
  ON attendance_days (organization_id, work_date, worker_id, status);
CREATE INDEX correction_requests_report_idx
  ON correction_requests (organization_id, created_at, status);

CREATE FUNCTION bss_invitation_lookup(p_token_hash bytea)
RETURNS TABLE (
  invitation_id uuid,
  organization_id uuid,
  user_id uuid,
  email varchar,
  role varchar,
  status varchar,
  worker_id uuid,
  user_revision bigint,
  organization_name varchar,
  tax_identifier varchar,
  timezone varchar,
  organization_revision bigint,
  department_ids uuid[],
  expires_at timestamptz,
  accepted_at timestamptz,
  revoked_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
SET row_security = off
AS $$
  SELECT i.id, i.organization_id, u.id, u.email, u.role, u.status, u.worker_id,
         u.revision, o.name, o.tax_identifier, o.timezone, o.revision,
         COALESCE(array_agg(ds.department_id) FILTER (WHERE ds.department_id IS NOT NULL), ARRAY[]::uuid[]),
         i.expires_at, i.accepted_at, i.revoked_at
  FROM user_invitations i
  JOIN users u ON u.organization_id = i.organization_id AND lower(u.email) = lower(i.email)
  JOIN organizations o ON o.id = i.organization_id
  LEFT JOIN user_department_scopes ds
    ON ds.organization_id = u.organization_id AND ds.user_id = u.id
  WHERE i.token_hash = p_token_hash
  GROUP BY i.id, u.id, o.id
$$;

REVOKE ALL ON FUNCTION bss_invitation_lookup(bytea) FROM PUBLIC;
