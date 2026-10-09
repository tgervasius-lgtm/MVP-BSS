-- Refuse data loss even for a NOSUPERUSER/NOBYPASSRLS migration owner.
-- The migrator wraps this in a transaction; refusal restores FORCE RLS.
ALTER TABLE worker_import_sessions NO FORCE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM worker_import_sessions WHERE source_format IS NOT NULL) THEN
    RAISE EXCEPTION 'Refusing to remove source import data. Use reviewed forward recovery.';
  END IF;
END $$;
ALTER TABLE worker_import_sessions FORCE ROW LEVEL SECURITY;
DROP INDEX worker_import_expiry_idx;
DROP INDEX worker_import_parse_expiry_idx;
DROP INDEX worker_import_retention_idx;
ALTER TABLE worker_import_staging
  DROP CONSTRAINT worker_import_staged_values,
  DROP CONSTRAINT worker_import_staged_mapping,
  DROP COLUMN source_json, DROP COLUMN mapping_json, DROP COLUMN mapping_issues,
  ALTER COLUMN rows_json SET NOT NULL;
DO $migration$
DECLARE
  state_ready CONSTANT text := 'READY';
  state_invalid CONSTANT text := 'INVALID';
BEGIN
  EXECUTE format($ddl$
ALTER TABLE worker_import_sessions
  DROP CONSTRAINT worker_import_state, DROP CONSTRAINT worker_import_total,
  DROP CONSTRAINT worker_import_terminal, DROP CONSTRAINT worker_import_source_identity,
  DROP CONSTRAINT worker_import_parse_lease, DROP CONSTRAINT worker_import_mapping_ready,
  DROP COLUMN source_format, DROP COLUMN source_delimiter, DROP COLUMN mapping_checksum,
  DROP COLUMN parse_lease, DROP COLUMN parse_expires_at,
  ADD CONSTRAINT worker_import_sessions_state_check CHECK (state IN (%1$L,%2$L,'COMMITTED','CANCELLED','EXPIRED')),
  ADD CONSTRAINT worker_import_sessions_total_check CHECK (total BETWEEN 1 AND 1000),
  ADD CONSTRAINT worker_import_sessions_check2 CHECK ((state IN (%1$L,%2$L)) = (terminal_at IS NULL));
CREATE INDEX worker_import_expiry_idx ON worker_import_sessions(organization_id, expires_at)
  WHERE state IN (%1$L,%2$L);
CREATE INDEX worker_import_retention_idx ON worker_import_sessions(organization_id, terminal_at)
  WHERE state IN ('CANCELLED','EXPIRED');
$ddl$, state_ready, state_invalid);
END;
$migration$;
CREATE OR REPLACE FUNCTION bss_protect_worker_import_session() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.state = 'COMMITTED' THEN
    RAISE EXCEPTION 'Committed import evidence is immutable' USING ERRCODE = '23514';
  END IF;
  IF TG_OP = 'UPDATE' AND (NEW.organization_id, NEW.id, NEW.uploader_id, NEW.created_at, NEW.expires_at,
    NEW.file_checksum, NEW.create_key_hash, NEW.create_fingerprint, NEW.parser_version, NEW.schema_version, NEW.policy_version)
    IS DISTINCT FROM (OLD.organization_id, OLD.id, OLD.uploader_id, OLD.created_at, OLD.expires_at,
    OLD.file_checksum, OLD.create_key_hash, OLD.create_fingerprint, OLD.parser_version, OLD.schema_version, OLD.policy_version) THEN
    RAISE EXCEPTION 'Import identity and expiry are immutable' USING ERRCODE = '23514';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;
