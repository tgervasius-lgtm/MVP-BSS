-- Backend MVP Phase B: operational endpoints, terminal authentication and report artifacts.

ALTER TABLE organizations
  ADD COLUMN approved_leave_visibility varchar(16) NOT NULL DEFAULT 'department'
    CHECK (approved_leave_visibility IN ('team', 'department', 'organization'));

ALTER TABLE terminals
  ADD COLUMN last_sequence bigint NOT NULL DEFAULT 0 CHECK (last_sequence >= 0);

ALTER TABLE report_exports DROP CONSTRAINT report_exports_format_check;
ALTER TABLE report_exports ADD CONSTRAINT report_exports_format_check
  CHECK (format IN ('csv', 'xlsx', 'pdf'));

ALTER TABLE report_exports DROP CONSTRAINT report_exports_status_check;
ALTER TABLE report_exports ADD CONSTRAINT report_exports_status_check
  CHECK (status IN ('queued', 'processing', 'ready', 'failed', 'expired'));

ALTER TABLE report_exports
  ALTER COLUMN dataset_version TYPE varchar(64) USING dataset_version::text,
  ADD COLUMN report_type varchar(32) NOT NULL DEFAULT 'monthly_summary'
    CHECK (report_type IN ('monthly_summary', 'attendance_journal', 'exceptions', 'approved_absences', 'correction_log')),
  ADD COLUMN content bytea,
  ADD COLUMN mime_type varchar(120),
  ADD COLUMN file_name varchar(240);

UPDATE report_exports
SET report_type = COALESCE(filters->>'reportType', 'monthly_summary')
WHERE filters ? 'reportType';

CREATE INDEX report_exports_history_idx
  ON report_exports (organization_id, created_at DESC, id DESC);

CREATE UNIQUE INDEX correction_requests_pending_day_unique
  ON correction_requests (organization_id, attendance_day_id)
  WHERE status = 'pending';

CREATE INDEX leave_requests_scope_idx
  ON leave_requests (organization_id, status, start_date, end_date, worker_id);

CREATE FUNCTION bss_terminal_credential_lookup(p_terminal_id uuid)
RETURNS TABLE (
  organization_id uuid,
  terminal_id uuid,
  terminal_status varchar,
  credential_hash bytea,
  credential_ciphertext bytea,
  credential_iv bytea,
  credential_auth_tag bytea,
  key_version smallint,
  valid_from timestamptz,
  valid_to timestamptz,
  revoked_at timestamptz
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
