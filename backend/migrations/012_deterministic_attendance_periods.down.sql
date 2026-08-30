-- The production migrator owns these tables but remains NOSUPERUSER and
-- NOBYPASSRLS. Temporarily removing FORCE inside the migration transaction is
-- required for a global evidence guard; otherwise every tenant row is hidden.
-- A refusal aborts the transaction and restores FORCE RLS automatically.
ALTER TABLE attendance_month_locks NO FORCE ROW LEVEL SECURITY;
ALTER TABLE attendance_period_transitions NO FORCE ROW LEVEL SECURITY;
ALTER TABLE attendance_period_versions NO FORCE ROW LEVEL SECURITY;
ALTER TABLE report_exports NO FORCE ROW LEVEL SECURITY;
ALTER TABLE audit_events NO FORCE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (
       SELECT 1 FROM attendance_month_locks
       WHERE provenance_status <> 'legacy_unavailable'
     )
     OR EXISTS (SELECT 1 FROM attendance_period_transitions)
     OR EXISTS (SELECT 1 FROM attendance_period_versions)
     OR EXISTS (SELECT 1 FROM report_exports WHERE period_version_id IS NOT NULL)
     OR EXISTS (
       SELECT 1 FROM audit_events
       WHERE action LIKE 'attendance_period.%'
          OR (action = 'report_export.create' AND NULLIF(after_json->>'periodVersionId', '') IS NOT NULL)
     ) THEN
    RAISE EXCEPTION 'Refusing to remove deterministic attendance-period provenance. Use a reviewed forward recovery migration.';
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS attendance_period_transitions_immutable ON attendance_period_transitions;
DROP TRIGGER IF EXISTS attendance_period_versions_immutable ON attendance_period_versions;
DROP TRIGGER IF EXISTS report_exports_protect_locked ON report_exports;
DROP FUNCTION IF EXISTS bss_protect_locked_report_export();

DROP INDEX IF EXISTS report_exports_period_version_idx;
ALTER TABLE report_exports
  DROP CONSTRAINT IF EXISTS report_export_dataset_checksum_check,
  DROP CONSTRAINT IF EXISTS report_export_period_version_same_tenant,
  DROP COLUMN IF EXISTS scope_department_ids,
  DROP COLUMN IF EXISTS calculation_versions,
  DROP COLUMN IF EXISTS dataset_checksum_sha256,
  DROP COLUMN IF EXISTS period_version_id;

DROP TABLE IF EXISTS attendance_period_transitions;
DROP TABLE IF EXISTS attendance_period_versions;

ALTER TABLE attendance_month_locks
  DROP CONSTRAINT IF EXISTS attendance_month_lifecycle_consistency,
  DROP CONSTRAINT IF EXISTS attendance_month_complete_provenance,
  DROP CONSTRAINT IF EXISTS attendance_month_reopen_actor_same_tenant,
  DROP CONSTRAINT IF EXISTS attendance_month_close_actor_same_tenant,
  DROP CONSTRAINT IF EXISTS attendance_month_review_actor_same_tenant,
  DROP CONSTRAINT IF EXISTS attendance_month_locks_provenance_check,
  DROP CONSTRAINT IF EXISTS attendance_month_locks_checksum_check,
  DROP CONSTRAINT IF EXISTS attendance_month_locks_reason_check,
  DROP CONSTRAINT IF EXISTS attendance_month_locks_status_check,
  DROP CONSTRAINT IF EXISTS attendance_month_locks_id_unique,
  DROP COLUMN IF EXISTS provenance_status,
  DROP COLUMN IF EXISTS dataset_snapshot,
  DROP COLUMN IF EXISTS template_version,
  DROP COLUMN IF EXISTS calculation_versions,
  DROP COLUMN IF EXISTS dataset_checksum_sha256,
  DROP COLUMN IF EXISTS transition_reason,
  DROP COLUMN IF EXISTS reopened_at,
  DROP COLUMN IF EXISTS reopened_by,
  DROP COLUMN IF EXISTS closed_at,
  DROP COLUMN IF EXISTS closed_by,
  DROP COLUMN IF EXISTS review_started_at,
  DROP COLUMN IF EXISTS review_started_by,
  DROP COLUMN IF EXISTS revision,
  DROP COLUMN IF EXISTS status,
  DROP COLUMN IF EXISTS id;

ALTER TABLE attendance_month_locks
  ALTER COLUMN dataset_version SET DEFAULT gen_random_uuid();
UPDATE attendance_month_locks SET dataset_version = gen_random_uuid() WHERE dataset_version IS NULL;
ALTER TABLE attendance_month_locks
  ALTER COLUMN dataset_version SET NOT NULL,
  ALTER COLUMN locked_by SET NOT NULL,
  ALTER COLUMN locked_at SET NOT NULL;

ALTER TABLE attendance_month_locks FORCE ROW LEVEL SECURITY;
ALTER TABLE report_exports FORCE ROW LEVEL SECURITY;
ALTER TABLE audit_events FORCE ROW LEVEL SECURITY;
