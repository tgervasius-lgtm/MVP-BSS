-- Inactive source lifecycle only. No routes, runtime grants or global scheduler.
-- One local state vocabulary feeds constraints and partial indexes; no schema
-- helper or function privilege is introduced. format(%L) quotes only constants.
DO $migration$
DECLARE
  state_parsing CONSTANT text := 'PARSING';
  state_needs_mapping CONSTANT text := 'NEEDS_MAPPING';
  state_ready CONSTANT text := 'READY';
  state_invalid CONSTANT text := 'INVALID';
  state_committed CONSTANT text := 'COMMITTED';
  state_cancelled CONSTANT text := 'CANCELLED';
  state_expired CONSTANT text := 'EXPIRED';
  state_failed CONSTANT text := 'FAILED';
BEGIN
  EXECUTE format($ddl$
ALTER TABLE worker_import_sessions
  DROP CONSTRAINT worker_import_sessions_state_check,
  DROP CONSTRAINT worker_import_sessions_total_check,
  DROP CONSTRAINT worker_import_sessions_check2,
  ADD COLUMN source_format text CHECK (source_format IN ('csv','xlsx')),
  ADD COLUMN source_delimiter text CHECK (source_delimiter IN (',',';')),
  ADD COLUMN mapping_checksum text CHECK (mapping_checksum ~ '^[a-f0-9]{64}$'),
  ADD COLUMN parse_lease uuid,
  ADD COLUMN parse_expires_at timestamptz,
  ADD CONSTRAINT worker_import_state CHECK (state IN
    (%1$L,%2$L,%3$L,%4$L,%5$L,%6$L,%7$L,%8$L)),
  ADD CONSTRAINT worker_import_total CHECK (total BETWEEN 0 AND 1000
    AND (state NOT IN (%3$L,%4$L,%5$L,%2$L) OR total > 0)),
  ADD CONSTRAINT worker_import_terminal CHECK
    ((state IN (%1$L,%2$L,%3$L,%4$L)) = (terminal_at IS NULL)),
  ADD CONSTRAINT worker_import_source_identity CHECK
    ((source_format IS NULL) = (source_delimiter IS NULL)),
  ADD CONSTRAINT worker_import_parse_lease CHECK
    ((state = %1$L AND source_format IS NOT NULL AND parse_lease IS NOT NULL
      AND parse_expires_at IS NOT NULL AND parse_expires_at = created_at + interval '10 seconds' AND total = 0 AND preview_checksum IS NULL)
     OR (state <> %1$L AND parse_lease IS NULL AND parse_expires_at IS NULL)),
  ADD CONSTRAINT worker_import_mapping_ready CHECK
    (source_format IS NULL OR state NOT IN (%3$L,%5$L) OR mapping_checksum IS NOT NULL);

$ddl$, state_parsing, state_needs_mapping, state_ready, state_invalid, state_committed, state_cancelled, state_expired, state_failed);
  EXECUTE format($ddl$
DROP INDEX worker_import_expiry_idx;
CREATE INDEX worker_import_expiry_idx ON worker_import_sessions(organization_id, expires_at)
  WHERE state IN (%1$L,%2$L,%3$L,%4$L);
CREATE INDEX worker_import_parse_expiry_idx ON worker_import_sessions(organization_id, parse_expires_at)
  WHERE state = %1$L;
DROP INDEX worker_import_retention_idx;
CREATE INDEX worker_import_retention_idx ON worker_import_sessions(organization_id, terminal_at)
  WHERE state IN (%6$L,%7$L,%8$L);

$ddl$, state_parsing, state_needs_mapping, state_ready, state_invalid, state_committed, state_cancelled, state_expired, state_failed);
END;
$migration$;

ALTER TABLE worker_import_staging
  ALTER COLUMN rows_json DROP NOT NULL,
  ADD COLUMN source_json jsonb CHECK (jsonb_typeof(source_json) = 'object'
    AND octet_length(source_json::text) <= 8388608),
  ADD COLUMN mapping_json jsonb CHECK (jsonb_typeof(mapping_json) = 'object'
    AND octet_length(mapping_json::text) <= 2097152),
  ADD COLUMN mapping_issues jsonb NOT NULL DEFAULT '[]'::jsonb CHECK
    (jsonb_typeof(mapping_issues) = 'array' AND jsonb_array_length(mapping_issues) <= 6000
     AND octet_length(mapping_issues::text) <= 1048576),
  ADD CONSTRAINT worker_import_staged_values CHECK (rows_json IS NOT NULL OR source_json IS NOT NULL),
  ADD CONSTRAINT worker_import_staged_mapping CHECK (mapping_json IS NULL OR source_json IS NOT NULL);

CREATE OR REPLACE FUNCTION bss_protect_worker_import_session() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.state = 'COMMITTED' THEN
    RAISE EXCEPTION 'Committed import evidence is immutable' USING ERRCODE = '23514';
  END IF;
  IF TG_OP = 'UPDATE' AND (NEW.organization_id, NEW.id, NEW.uploader_id, NEW.created_at, NEW.expires_at,
    NEW.file_checksum, NEW.create_key_hash, NEW.create_fingerprint, NEW.parser_version, NEW.schema_version, NEW.policy_version,
    NEW.source_format, NEW.source_delimiter)
    IS DISTINCT FROM (OLD.organization_id, OLD.id, OLD.uploader_id, OLD.created_at, OLD.expires_at,
    OLD.file_checksum, OLD.create_key_hash, OLD.create_fingerprint, OLD.parser_version, OLD.schema_version, OLD.policy_version,
    OLD.source_format, OLD.source_delimiter) THEN
    RAISE EXCEPTION 'Import identity and expiry are immutable' USING ERRCODE = '23514';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;

COMMENT ON TABLE worker_import_staging IS 'Private bounded source/mapping/normalized values, never raw bytes. Purge atomically on terminal state. Existing Admin tenant FORCE RLS and revoked runtime grants remain.';
