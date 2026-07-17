DROP FUNCTION IF EXISTS bss_terminal_credential_lookup(uuid);

ALTER TABLE organizations DROP COLUMN IF EXISTS approved_leave_visibility;
ALTER TABLE terminals DROP COLUMN IF EXISTS last_sequence;

DROP INDEX IF EXISTS leave_requests_scope_idx;
DROP INDEX IF EXISTS correction_requests_pending_day_unique;
DROP INDEX IF EXISTS report_exports_history_idx;

ALTER TABLE report_exports
  DROP COLUMN IF EXISTS file_name,
  DROP COLUMN IF EXISTS mime_type,
  DROP COLUMN IF EXISTS content,
  DROP COLUMN IF EXISTS report_type;

DELETE FROM report_exports;
ALTER TABLE report_exports
  ALTER COLUMN dataset_version TYPE uuid USING dataset_version::uuid;

ALTER TABLE report_exports DROP CONSTRAINT report_exports_status_check;
ALTER TABLE report_exports ADD CONSTRAINT report_exports_status_check
  CHECK (status IN ('queued', 'processing', 'ready', 'failed'));

DELETE FROM report_exports WHERE format = 'pdf';
ALTER TABLE report_exports DROP CONSTRAINT report_exports_format_check;
ALTER TABLE report_exports ADD CONSTRAINT report_exports_format_check
  CHECK (format IN ('csv', 'xlsx'));
