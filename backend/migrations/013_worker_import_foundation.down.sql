-- Must also see other tenants when run by the NOSUPERUSER/NOBYPASSRLS owner.
-- An exception rolls these transactional ALTERs back, restoring FORCE RLS.
ALTER TABLE worker_import_sessions NO FORCE ROW LEVEL SECURITY;
ALTER TABLE worker_import_commits NO FORCE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM worker_import_sessions) OR EXISTS (SELECT 1 FROM worker_import_commits) THEN
    RAISE EXCEPTION 'Refusing to remove worker import data. Use reviewed forward recovery.';
  END IF;
END;
$$;
DROP TABLE worker_import_commit_workers;
DROP TABLE worker_import_commits;
DROP TABLE worker_import_staging;
DROP TABLE worker_import_sessions;
DROP FUNCTION bss_protect_worker_import_session();
