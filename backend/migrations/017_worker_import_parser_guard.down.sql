-- Disable/drain ingestion first. Preserve workers, sessions and results.
DO $$
BEGIN
  IF NOT pg_try_advisory_xact_lock(237,1701)
    OR EXISTS(SELECT 1 FROM worker_import_runtime WHERE lease_expires_at>clock_timestamp())
    OR EXISTS(SELECT 1 FROM worker_import_sessions WHERE source_format IS NOT NULL
      AND state IN ('PARSING','NEEDS_MAPPING','READY','INVALID')) THEN
    RAISE EXCEPTION 'Stop imports and purge/cancel active source sessions before parser rollback' USING ERRCODE='23514';
  END IF;
END $$;
DROP FUNCTION bss_import_parser_budget(uuid);
