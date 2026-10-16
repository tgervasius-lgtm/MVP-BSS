-- Stop ingestion/cleanup and wait for every parser/commit before rollback.
DO $$
BEGIN
  IF EXISTS(SELECT 1 FROM worker_import_runtime WHERE lease_expires_at>clock_timestamp())
    OR EXISTS(SELECT 1 FROM worker_import_sessions WHERE source_format IS NOT NULL
      AND state IN ('PARSING','NEEDS_MAPPING','READY','INVALID')) THEN
    RAISE EXCEPTION 'Stop imports and purge/cancel active source sessions before runtime rollback' USING ERRCODE='23514';
  END IF;
END $$;
DROP INDEX worker_import_global_expiry_idx;
DROP INDEX worker_import_global_parse_expiry_idx;
DROP FUNCTION bss_import_cleanup();
DROP FUNCTION bss_import_lease(uuid,text);
DROP FUNCTION bss_import_admit(text,uuid);
DROP FUNCTION bss_import_healthy();
DROP POLICY import_cleanup_audit ON audit_events;
DROP POLICY import_maintenance_owner ON worker_import_staging;
DROP POLICY import_maintenance_owner ON worker_import_sessions;
DROP TABLE worker_import_attempts;
DROP TABLE worker_import_runtime;
