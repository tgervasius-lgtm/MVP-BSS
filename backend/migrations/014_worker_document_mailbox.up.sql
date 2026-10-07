-- No automatic runtime grants or deployment activation.
CREATE TABLE worker_documents (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  worker_id uuid NOT NULL,
  uploaded_by uuid NOT NULL,
  upload_id uuid NOT NULL,
  fingerprint char(64) NOT NULL CHECK (fingerprint ~ '^[a-f0-9]{64}$'),
  title varchar(120) NOT NULL CHECK (length(trim(title)) BETWEEN 2 AND 120),
  category text NOT NULL CHECK (category IN ('payslip','contract','other')),
  period varchar(7) CHECK (period ~ '^20[0-9]{2}-(0[1-9]|1[0-2])$'),
  state text NOT NULL DEFAULT 'draft' CHECK (state IN ('draft','published','withdrawn')),
  byte_length integer NOT NULL CHECK (byte_length BETWEEN 1 AND 5242880),
  ciphertext bytea NOT NULL CHECK (octet_length(ciphertext) = byte_length),
  nonce bytea NOT NULL CHECK (octet_length(nonce) = 12),
  tag bytea NOT NULL CHECK (octet_length(tag) = 16),
  key_id varchar(40) NOT NULL,
  revision bigint NOT NULL DEFAULT 1 CHECK (revision > 0),
  created_at timestamptz NOT NULL DEFAULT date_trunc('milliseconds', clock_timestamp()),
  published_at timestamptz,
  UNIQUE (organization_id, id),
  UNIQUE (organization_id, uploaded_by, upload_id),
  FOREIGN KEY (organization_id, worker_id) REFERENCES workers(organization_id,id) ON DELETE RESTRICT,
  FOREIGN KEY (organization_id, uploaded_by) REFERENCES users(organization_id,id) ON DELETE RESTRICT,
  CHECK (category <> 'payslip' OR period IS NOT NULL),
  CHECK (state <> 'draft' OR published_at IS NULL),
  CHECK (state <> 'published' OR published_at IS NOT NULL)
);
CREATE INDEX worker_documents_mailbox_idx ON worker_documents(organization_id, worker_id, created_at DESC, id DESC);
CREATE INDEX worker_documents_admin_idx ON worker_documents(organization_id, created_at DESC, id DESC);

CREATE FUNCTION bss_document_access(p_worker uuid, p_state text, p_write boolean) RETURNS boolean
LANGUAGE sql STABLE SET search_path = public, pg_temp AS $$
  SELECT EXISTS (SELECT 1 FROM users u WHERE u.organization_id = bss_current_organization_id()
    AND u.id = nullif(current_setting('bss.actor_id',true),'')::uuid AND u.status = 'active'
    AND u.role = current_setting('bss.actor_role',true)
    AND (u.role IN ('admin','accountant') OR (NOT p_write AND u.role = 'worker' AND u.worker_id = p_worker AND p_state = 'published')))
$$;
ALTER TABLE worker_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE worker_documents FORCE ROW LEVEL SECURITY;
CREATE POLICY documents_read ON worker_documents FOR SELECT USING
  (organization_id = bss_current_organization_id() AND bss_document_access(worker_id,state,false));
CREATE POLICY documents_insert ON worker_documents FOR INSERT WITH CHECK
  (organization_id = bss_current_organization_id() AND bss_document_access(worker_id,state,true)
    AND uploaded_by = nullif(current_setting('bss.actor_id',true),'')::uuid AND state = 'draft' AND revision = 1);
CREATE POLICY documents_update ON worker_documents FOR UPDATE USING
  (organization_id = bss_current_organization_id() AND bss_document_access(worker_id,state,true)) WITH CHECK
  (organization_id = bss_current_organization_id() AND bss_document_access(worker_id,state,true));
-- No DELETE policy; document destruction/retention requires a separately reviewed lifecycle.
CREATE FUNCTION bss_protect_worker_document() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF (to_jsonb(NEW) - ARRAY['state','revision','published_at']) IS DISTINCT FROM
     (to_jsonb(OLD) - ARRAY['state','revision','published_at']) THEN
    RAISE EXCEPTION 'Document identity and content are immutable' USING ERRCODE='23514';
  END IF;
  IF NEW.revision <> OLD.revision + 1 OR NOT ((OLD.state = 'draft' AND NEW.state IN ('published','withdrawn'))
    OR (OLD.state = 'published' AND NEW.state = 'withdrawn')) THEN
    RAISE EXCEPTION 'Invalid document transition' USING ERRCODE='23514';
  END IF;
  IF OLD.state <> 'draft' OR NEW.state <> 'published' THEN
    IF NEW.published_at IS DISTINCT FROM OLD.published_at THEN RAISE EXCEPTION 'Publication timestamp is immutable' USING ERRCODE='23514'; END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER worker_document_identity BEFORE UPDATE ON worker_documents FOR EACH ROW EXECUTE FUNCTION bss_protect_worker_document();
