-- Inactive foundation only. No tenant/profile creation or approval HTTP path.
-- Existing production roles receive no new grants from this migration.
CREATE TABLE onboarding_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  profile varchar(16) NOT NULL CHECK (profile IN ('DEMO','INTERNAL','PILOT','PRODUCTION')),
  contract_version varchar(80) NOT NULL CHECK (length(btrim(contract_version)) BETWEEN 1 AND 80),
  provisioning_reference varchar(200) NOT NULL CHECK (length(btrim(provisioning_reference)) BETWEEN 1 AND 200),
  revision bigint NOT NULL DEFAULT 1 CHECK (revision > 0),
  evaluated_checksum varchar(64) CHECK (evaluated_checksum ~ '^[a-f0-9]{64}$'),
  evaluated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE (organization_id,id),
  UNIQUE (organization_id,profile),
  CHECK ((evaluated_checksum IS NULL) = (evaluated_at IS NULL))
);
CREATE TABLE onboarding_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  session_id uuid NOT NULL,
  step varchar(24) NOT NULL CHECK (step IN ('COMPANY_SETUP','PEOPLE_IMPORT','ACCESS_SETUP','TERMINAL_SETUP','DRY_RUN')),
  reference varchar(500) NOT NULL CHECK (length(btrim(reference)) BETWEEN 1 AND 500),
  note varchar(1000),
  submitted_by uuid NOT NULL,
  submitted_revision bigint NOT NULL CHECK (submitted_revision > 1),
  configuration_checksum varchar(64) NOT NULL CHECK (configuration_checksum ~ '^[a-f0-9]{64}$'),
  submitted_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  FOREIGN KEY (organization_id,session_id) REFERENCES onboarding_sessions(organization_id,id) ON DELETE RESTRICT,
  FOREIGN KEY (organization_id,submitted_by) REFERENCES users(organization_id,id) ON DELETE RESTRICT,
  UNIQUE (organization_id,session_id,step,reference)
);
CREATE TABLE onboarding_evaluations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  session_id uuid NOT NULL,
  revision bigint NOT NULL CHECK (revision > 1),
  configuration_checksum varchar(64) NOT NULL CHECK (configuration_checksum ~ '^[a-f0-9]{64}$'),
  evaluated_by uuid NOT NULL,
  evaluated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  blocker_codes jsonb NOT NULL CHECK (jsonb_typeof(blocker_codes)='array' AND jsonb_array_length(blocker_codes) BETWEEN 1 AND 100),
  FOREIGN KEY (organization_id,session_id) REFERENCES onboarding_sessions(organization_id,id) ON DELETE RESTRICT,
  FOREIGN KEY (organization_id,evaluated_by) REFERENCES users(organization_id,id) ON DELETE RESTRICT,
  UNIQUE (organization_id,session_id,revision)
);
CREATE INDEX onboarding_evidence_session_idx ON onboarding_evidence (organization_id,session_id,submitted_revision,id);

DO $$
DECLARE target text;
BEGIN
  FOREACH target IN ARRAY ARRAY['onboarding_sessions','onboarding_evidence','onboarding_evaluations'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY',target);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY',target);
    EXECUTE format('CREATE POLICY admin_tenant_isolation ON %I
      USING (organization_id=bss_current_organization_id() AND current_setting(''bss.actor_role'',true)=''admin'')
      WITH CHECK (organization_id=bss_current_organization_id() AND current_setting(''bss.actor_role'',true)=''admin'')',target);
    -- Separate migration-owner SELECT is required for fail-closed down guards
    -- under NOSUPERUSER/NOBYPASSRLS. Runtime never owns these tables.
    EXECUTE format('CREATE POLICY migration_owner_read ON %I FOR SELECT
      USING (current_user=pg_get_userbyid((SELECT relowner FROM pg_class WHERE oid=%L::regclass)))',target,'public.'||target);
    EXECUTE format('REVOKE ALL ON %I FROM PUBLIC',target);
  END LOOP;
END $$;

CREATE FUNCTION bss_protect_onboarding_session() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Onboarding history is immutable; reviewed forward recovery required'; END IF;
  IF (NEW.id,NEW.organization_id,NEW.profile,NEW.contract_version,NEW.provisioning_reference,NEW.created_at)
     IS DISTINCT FROM (OLD.id,OLD.organization_id,OLD.profile,OLD.contract_version,OLD.provisioning_reference,OLD.created_at)
     OR NEW.revision <> OLD.revision+1 THEN
    RAISE EXCEPTION 'Onboarding identity is immutable and revision must advance once';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER onboarding_session_identity BEFORE UPDATE OR DELETE ON onboarding_sessions
FOR EACH ROW EXECUTE FUNCTION bss_protect_onboarding_session();
CREATE TRIGGER onboarding_evidence_immutable BEFORE UPDATE OR DELETE ON onboarding_evidence
FOR EACH ROW EXECUTE FUNCTION bss_reject_immutable_change();
CREATE TRIGGER onboarding_evaluations_immutable BEFORE UPDATE OR DELETE ON onboarding_evaluations
FOR EACH ROW EXECUTE FUNCTION bss_reject_immutable_change();

CREATE FUNCTION bss_bound_onboarding_evidence() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE parent_revision bigint;
BEGIN
  SELECT revision INTO parent_revision FROM onboarding_sessions
    WHERE organization_id=NEW.organization_id AND id=NEW.session_id FOR UPDATE;
  IF parent_revision IS NULL OR NEW.submitted_revision <> parent_revision+1 THEN
    RAISE EXCEPTION 'Onboarding evidence requires the current tenant session revision';
  END IF;
  IF (SELECT count(*) FROM onboarding_evidence WHERE organization_id=NEW.organization_id AND session_id=NEW.session_id)>=100 THEN
    RAISE EXCEPTION 'Onboarding evidence reference limit reached';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER onboarding_evidence_bound BEFORE INSERT ON onboarding_evidence
FOR EACH ROW EXECUTE FUNCTION bss_bound_onboarding_evidence();
REVOKE ALL ON FUNCTION bss_protect_onboarding_session(),bss_bound_onboarding_evidence() FROM PUBLIC;
