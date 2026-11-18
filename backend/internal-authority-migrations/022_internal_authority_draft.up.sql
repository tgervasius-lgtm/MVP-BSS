-- Inactive D3 registry. No customer runtime or operational identities are granted access.
CREATE SCHEMA bss_internal;
REVOKE ALL ON SCHEMA bss_internal FROM PUBLIC;

CREATE TABLE bss_internal.people (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  active boolean NOT NULL DEFAULT true,
  lock_marker integer NOT NULL DEFAULT 0
);
CREATE TABLE bss_internal.identities (
  issuer text NOT NULL,
  subject text NOT NULL,
  person_id uuid NOT NULL REFERENCES bss_internal.people(id),
  lock_marker integer NOT NULL DEFAULT 0,
  PRIMARY KEY (issuer, subject),
  UNIQUE (issuer, subject, person_id)
);
CREATE TABLE bss_internal.sessions (
  token_hash text PRIMARY KEY CHECK (token_hash ~ '^[a-f0-9]{64}$'),
  lock_marker integer NOT NULL DEFAULT 0,
  csrf_hash text NOT NULL CHECK (csrf_hash ~ '^[a-f0-9]{64}$'),
  person_id uuid NOT NULL,
  issuer text NOT NULL,
  subject text NOT NULL,
  authenticated_at bigint NOT NULL,
  expires_at bigint NOT NULL CHECK (expires_at > authenticated_at),
  revoked boolean NOT NULL DEFAULT false,
  FOREIGN KEY (issuer, subject, person_id) REFERENCES bss_internal.identities(issuer, subject, person_id)
);
CREATE TABLE bss_internal.targets (
  scope_key text PRIMARY KEY CHECK (scope_key ~ '^[a-f0-9]{64}$'),
  scope jsonb NOT NULL,
  lock_marker integer NOT NULL DEFAULT 0,
  revision bigint NOT NULL DEFAULT 1 CHECK (revision > 0),
  configuration_hash text NOT NULL CHECK (configuration_hash ~ '^[a-f0-9]{64}$'),
  evidence_hash text NOT NULL CHECK (evidence_hash ~ '^[a-f0-9]{64}$'),
  release_id text NOT NULL CHECK (length(release_id) BETWEEN 1 AND 200),
  preparer_ids uuid[] NOT NULL
);
CREATE TABLE bss_internal.grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id uuid NOT NULL REFERENCES bss_internal.people(id),
  action text NOT NULL CHECK (action IN ('PROVISION_TENANT','VERIFY_ONBOARDING','APPROVE_GO_LIVE')),
  scope_key text NOT NULL REFERENCES bss_internal.targets(scope_key),
  revision bigint NOT NULL DEFAULT 1 CHECK (revision > 0),
  valid_from bigint NOT NULL,
  expires_at bigint NOT NULL CHECK (expires_at > valid_from),
  revoked boolean NOT NULL DEFAULT false,
  lock_marker integer NOT NULL DEFAULT 0,
  UNIQUE (person_id, action, scope_key)
);
CREATE TABLE bss_internal.operations (
  id uuid PRIMARY KEY,
  person_id uuid NOT NULL REFERENCES bss_internal.people(id),
  session_hash text NOT NULL REFERENCES bss_internal.sessions(token_hash),
  grant_id uuid NOT NULL REFERENCES bss_internal.grants(id),
  grant_revision bigint NOT NULL,
  scope_key text NOT NULL REFERENCES bss_internal.targets(scope_key),
  target_revision bigint NOT NULL,
  target_hash text NOT NULL,
  intent jsonb NOT NULL,
  payload jsonb NOT NULL,
  fingerprint text NOT NULL CHECK (fingerprint ~ '^[a-f0-9]{64}$'),
  proof_authenticated_at bigint,
  proof_expires_at bigint,
  used boolean NOT NULL DEFAULT false
);
CREATE TABLE bss_internal.flows (
  state_hash text PRIMARY KEY CHECK (state_hash ~ '^[a-f0-9]{64}$'),
  cookie_hash text NOT NULL,
  nonce text NOT NULL UNIQUE,
  verifier_ciphertext bytea,
  verifier_iv bytea,
  verifier_tag bytea,
  started_at bigint NOT NULL,
  expires_at bigint NOT NULL CHECK (expires_at > started_at),
  session_hash text REFERENCES bss_internal.sessions(token_hash),
  operation_id uuid REFERENCES bss_internal.operations(id),
  used boolean NOT NULL DEFAULT false,
  CHECK ((session_hash IS NULL) = (operation_id IS NULL))
);
CREATE TABLE bss_internal.receipts (
  operation_id uuid PRIMARY KEY REFERENCES bss_internal.operations(id),
  original_person_id uuid NOT NULL REFERENCES bss_internal.people(id),
  grant_revision bigint NOT NULL,
  result jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE TABLE bss_internal.audit (
  operation_id uuid PRIMARY KEY REFERENCES bss_internal.receipts(operation_id),
  original_person_id uuid NOT NULL REFERENCES bss_internal.people(id),
  grant_revision bigint NOT NULL,
  fingerprint text NOT NULL,
  target_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

-- Global internal directory. Customer roles receive no schema usage.
DO $$ DECLARE relation text; BEGIN
  FOREACH relation IN ARRAY ARRAY['people','identities','grants'] LOOP
    EXECUTE format('ALTER TABLE bss_internal.%I ENABLE ROW LEVEL SECURITY', relation);
    EXECUTE format('ALTER TABLE bss_internal.%I FORCE ROW LEVEL SECURITY', relation);
    EXECUTE format('CREATE POLICY internal_only ON bss_internal.%I USING (current_setting(''bss.internal_runtime'',true)=''on'') WITH CHECK (current_setting(''bss.internal_runtime'',true)=''on'')', relation);
  END LOOP;
END $$;
ALTER TABLE bss_internal.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bss_internal.sessions FORCE ROW LEVEL SECURITY;
CREATE POLICY session_binding ON bss_internal.sessions
  USING (token_hash=current_setting('bss.internal_session',true))
  WITH CHECK (token_hash=current_setting('bss.internal_session',true));
ALTER TABLE bss_internal.flows ENABLE ROW LEVEL SECURITY;
ALTER TABLE bss_internal.flows FORCE ROW LEVEL SECURITY;
CREATE POLICY flow_binding ON bss_internal.flows
  USING (state_hash=current_setting('bss.internal_flow',true))
  WITH CHECK (state_hash=current_setting('bss.internal_flow',true));
ALTER TABLE bss_internal.targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE bss_internal.targets FORCE ROW LEVEL SECURITY;
CREATE POLICY target_binding ON bss_internal.targets
  USING (scope_key=current_setting('bss.internal_scope',true))
  WITH CHECK (scope_key=current_setting('bss.internal_scope',true));
ALTER TABLE bss_internal.operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE bss_internal.operations FORCE ROW LEVEL SECURITY;
CREATE POLICY operation_binding ON bss_internal.operations
  USING (person_id::text=current_setting('bss.internal_person',true) OR EXISTS (
    SELECT 1 FROM bss_internal.grants g WHERE g.scope_key=operations.scope_key
      AND g.action=operations.intent->>'action' AND NOT g.revoked
      AND g.person_id::text=current_setting('bss.internal_person',true)
      AND g.valid_from<=extract(epoch FROM clock_timestamp()) AND g.expires_at>extract(epoch FROM clock_timestamp())
  ));
DO $$ DECLARE relation text; BEGIN
  FOREACH relation IN ARRAY ARRAY['receipts','audit'] LOOP
    EXECUTE format('ALTER TABLE bss_internal.%I ENABLE ROW LEVEL SECURITY', relation);
    EXECUTE format('ALTER TABLE bss_internal.%I FORCE ROW LEVEL SECURITY', relation);
    EXECUTE format('CREATE POLICY operation_binding ON bss_internal.%I USING (EXISTS (SELECT 1 FROM bss_internal.operations o WHERE o.id=operation_id)) WITH CHECK (EXISTS (SELECT 1 FROM bss_internal.operations o WHERE o.id=operation_id))', relation);
  END LOOP;
END $$;
REVOKE ALL ON ALL TABLES IN SCHEMA bss_internal FROM PUBLIC;


-- Down guards must see all rows even when the migrator owns FORCE RLS tables.
DO $$ DECLARE relation text; BEGIN
  FOREACH relation IN ARRAY ARRAY['people','identities','sessions','targets','grants','operations','flows','receipts','audit'] LOOP
    EXECUTE format('CREATE POLICY migration_owner_read ON bss_internal.%I FOR SELECT USING (current_user=pg_get_userbyid((SELECT relowner FROM pg_class WHERE oid=%L::regclass)))',
      relation,'bss_internal.'||relation);
  END LOOP;
END $$;

CREATE FUNCTION bss_internal.require_next_revision() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.revision <> OLD.revision+1 THEN
    RAISE EXCEPTION 'Internal authority revisions must increase by one' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER target_revision BEFORE UPDATE OF revision,scope,configuration_hash,evidence_hash,release_id,preparer_ids
  ON bss_internal.targets FOR EACH ROW EXECUTE FUNCTION bss_internal.require_next_revision();
CREATE TRIGGER grant_revision BEFORE UPDATE OF revision,person_id,action,scope_key,valid_from,expires_at,revoked
  ON bss_internal.grants FOR EACH ROW EXECUTE FUNCTION bss_internal.require_next_revision();
