-- Inactive internal foundation: no HTTP route, upload parser or cleanup scheduler
-- is registered by this migration. No runtime role receives automatic grants.
CREATE TABLE worker_import_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  uploader_id uuid NOT NULL,
  state text NOT NULL CHECK (state IN ('READY','INVALID','COMMITTED','CANCELLED','EXPIRED')),
  revision bigint NOT NULL DEFAULT 1 CHECK (revision > 0),
  create_key_hash text NOT NULL CHECK (create_key_hash ~ '^[a-f0-9]{64}$'),
  create_fingerprint text NOT NULL CHECK (create_fingerprint ~ '^[a-f0-9]{64}$'),
  file_checksum text NOT NULL CHECK (file_checksum ~ '^[a-f0-9]{64}$'),
  parser_version varchar(80) NOT NULL,
  schema_version varchar(80) NOT NULL,
  policy_version varchar(80) NOT NULL,
  total integer NOT NULL CHECK (total BETWEEN 1 AND 1000),
  blocked integer NOT NULL CHECK (blocked BETWEEN 0 AND total),
  preview_checksum text CHECK (preview_checksum ~ '^[a-f0-9]{64}$'),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  expires_at timestamptz NOT NULL,
  terminal_at timestamptz,
  UNIQUE (organization_id, id),
  UNIQUE (organization_id, create_key_hash),
  FOREIGN KEY (organization_id, uploader_id) REFERENCES users(organization_id, id) ON DELETE RESTRICT,
  CHECK (expires_at = created_at + interval '24 hours'),
  CHECK ((state IN ('READY','INVALID')) = (terminal_at IS NULL)),
  CHECK (state <> 'READY' OR (blocked = 0 AND preview_checksum IS NOT NULL))
);
CREATE INDEX worker_import_expiry_idx ON worker_import_sessions(organization_id, expires_at)
  WHERE state IN ('READY','INVALID');
CREATE INDEX worker_import_retention_idx ON worker_import_sessions(organization_id, terminal_at)
  WHERE state IN ('CANCELLED','EXPIRED');

CREATE TABLE worker_import_staging (
  organization_id uuid NOT NULL,
  session_id uuid NOT NULL,
  rows_json jsonb NOT NULL CHECK (jsonb_typeof(rows_json) = 'array'
    AND jsonb_array_length(rows_json) BETWEEN 1 AND 1000 AND octet_length(rows_json::text) <= 2097152),
  PRIMARY KEY (organization_id, session_id),
  FOREIGN KEY (organization_id, session_id) REFERENCES worker_import_sessions(organization_id, id) ON DELETE RESTRICT
);
CREATE TABLE worker_import_commits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  session_id uuid NOT NULL,
  idempotency_key_hash text NOT NULL CHECK (idempotency_key_hash ~ '^[a-f0-9]{64}$'),
  request_fingerprint text NOT NULL CHECK (request_fingerprint ~ '^[a-f0-9]{64}$'),
  preview_checksum text NOT NULL CHECK (preview_checksum ~ '^[a-f0-9]{64}$'),
  approved_by uuid NOT NULL,
  committed_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  created_count integer NOT NULL CHECK (created_count BETWEEN 1 AND 1000),
  UNIQUE (organization_id, id),
  UNIQUE (organization_id, session_id),
  FOREIGN KEY (organization_id, session_id) REFERENCES worker_import_sessions(organization_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (organization_id, approved_by) REFERENCES users(organization_id, id) ON DELETE RESTRICT
);
CREATE TABLE worker_import_commit_workers (
  organization_id uuid NOT NULL,
  commit_id uuid NOT NULL,
  worker_id uuid NOT NULL,
  row_number integer NOT NULL CHECK (row_number BETWEEN 2 AND 1001),
  PRIMARY KEY (organization_id, commit_id, row_number),
  UNIQUE (organization_id, worker_id),
  FOREIGN KEY (organization_id, commit_id) REFERENCES worker_import_commits(organization_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (organization_id, worker_id) REFERENCES workers(organization_id, id) ON DELETE RESTRICT
);

DO $$
DECLARE relation text;
BEGIN
  FOREACH relation IN ARRAY ARRAY['worker_import_sessions', 'worker_import_staging',
      'worker_import_commits', 'worker_import_commit_workers'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', relation);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', relation);
    EXECUTE format('CREATE POLICY admin_tenant_isolation ON %I
      USING (organization_id = bss_current_organization_id() AND current_setting(''bss.actor_role'', true) = ''admin'')
      WITH CHECK (organization_id = bss_current_organization_id() AND current_setting(''bss.actor_role'', true) = ''admin'')', relation);
  END LOOP;
END;
$$;
CREATE TRIGGER worker_import_commits_immutable BEFORE UPDATE OR DELETE ON worker_import_commits
FOR EACH ROW EXECUTE FUNCTION bss_reject_immutable_change();
CREATE TRIGGER worker_import_commit_workers_immutable BEFORE UPDATE OR DELETE ON worker_import_commit_workers
FOR EACH ROW EXECUTE FUNCTION bss_reject_immutable_change();

CREATE FUNCTION bss_protect_worker_import_session() RETURNS trigger LANGUAGE plpgsql AS $$
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
CREATE TRIGGER worker_import_session_identity BEFORE UPDATE OR DELETE ON worker_import_sessions
FOR EACH ROW EXECUTE FUNCTION bss_protect_worker_import_session();

COMMENT ON TABLE worker_import_staging IS 'Private normalized values only; delete atomically on commit/cancel, deny access at absolute expiry. No raw upload.';
