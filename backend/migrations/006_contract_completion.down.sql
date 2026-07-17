DROP FUNCTION IF EXISTS bss_invitation_lookup(bytea);
DROP INDEX IF EXISTS correction_requests_report_idx;
DROP INDEX IF EXISTS attendance_days_report_idx;
DROP INDEX IF EXISTS attendance_events_terminal_received_idx;
ALTER TABLE terminal_credentials
  DROP COLUMN IF EXISTS key_version,
  DROP COLUMN IF EXISTS credential_auth_tag,
  DROP COLUMN IF EXISTS credential_iv,
  DROP COLUMN IF EXISTS credential_ciphertext;
DROP TABLE IF EXISTS terminal_sync_events;
DROP TABLE IF EXISTS terminal_request_nonces;
DROP TABLE IF EXISTS holiday_calendars;
ALTER TABLE terminals DROP CONSTRAINT IF EXISTS terminals_status_check;
UPDATE terminals SET status = CASE status WHEN 'online' THEN 'active' WHEN 'offline' THEN 'active' WHEN 'revoked' THEN 'blocked' ELSE status END;
ALTER TABLE terminals ADD CONSTRAINT terminals_status_check
  CHECK (status IN ('active', 'blocked', 'revoked'));
ALTER TABLE leave_requests DROP CONSTRAINT IF EXISTS leave_requests_leave_type_check;
UPDATE leave_requests SET leave_type = CASE leave_type
  WHEN 'annual_leave' THEN 'annual'
  WHEN 'paid_leave' THEN 'other'
  WHEN 'unpaid_leave' THEN 'unpaid'
  WHEN 'free_day' THEN 'other'
  ELSE leave_type END;
ALTER TABLE leave_requests ADD CONSTRAINT leave_requests_leave_type_check
  CHECK (leave_type IN ('annual', 'unpaid', 'other'));
