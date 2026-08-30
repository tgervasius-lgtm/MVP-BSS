ALTER TABLE attendance_month_locks
  ALTER COLUMN locked_by DROP NOT NULL,
  ALTER COLUMN locked_at DROP NOT NULL,
  ALTER COLUMN dataset_version DROP NOT NULL,
  ALTER COLUMN dataset_version DROP DEFAULT,
  ADD COLUMN id uuid NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN status varchar(16) NOT NULL DEFAULT 'finalized',
  ADD COLUMN revision bigint NOT NULL DEFAULT 1 CHECK (revision > 0),
  ADD COLUMN review_started_by uuid,
  ADD COLUMN review_started_at timestamptz,
  ADD COLUMN closed_by uuid,
  ADD COLUMN closed_at timestamptz,
  ADD COLUMN reopened_by uuid,
  ADD COLUMN reopened_at timestamptz,
  ADD COLUMN transition_reason text,
  ADD COLUMN dataset_checksum_sha256 varchar(64),
  ADD COLUMN calculation_versions jsonb NOT NULL DEFAULT '["legacy-unversioned"]'::jsonb,
  ADD COLUMN template_version varchar(40) NOT NULL DEFAULT 'legacy-unversioned',
  ADD COLUMN dataset_snapshot jsonb,
  ADD COLUMN provenance_status varchar(24) NOT NULL DEFAULT 'legacy_unavailable',
  ADD CONSTRAINT attendance_month_locks_id_unique UNIQUE (organization_id, id),
  ADD CONSTRAINT attendance_month_locks_status_check
    CHECK (status IN ('open', 'review', 'finalized', 'closed')),
  ADD CONSTRAINT attendance_month_locks_reason_check
    CHECK (transition_reason IS NULL OR length(btrim(transition_reason)) >= 3),
  ADD CONSTRAINT attendance_month_locks_checksum_check
    CHECK (dataset_checksum_sha256 IS NULL OR dataset_checksum_sha256 ~ '^[a-f0-9]{64}$'),
  ADD CONSTRAINT attendance_month_locks_provenance_check
    CHECK (provenance_status IN ('none', 'complete', 'legacy_unavailable')),
  ADD CONSTRAINT attendance_month_review_actor_same_tenant
    FOREIGN KEY (organization_id, review_started_by) REFERENCES users(organization_id, id) ON DELETE RESTRICT,
  ADD CONSTRAINT attendance_month_close_actor_same_tenant
    FOREIGN KEY (organization_id, closed_by) REFERENCES users(organization_id, id) ON DELETE RESTRICT,
  ADD CONSTRAINT attendance_month_reopen_actor_same_tenant
    FOREIGN KEY (organization_id, reopened_by) REFERENCES users(organization_id, id) ON DELETE RESTRICT,
  ADD CONSTRAINT attendance_month_lifecycle_consistency CHECK (
    status IN ('open', 'review') OR (
      locked_by IS NOT NULL AND locked_at IS NOT NULL
      AND provenance_status IN ('complete', 'legacy_unavailable')
    )
  ),
  ADD CONSTRAINT attendance_month_complete_provenance CHECK (
    provenance_status <> 'complete' OR (
      dataset_version IS NOT NULL
      AND dataset_checksum_sha256 IS NOT NULL
      AND dataset_snapshot IS NOT NULL
      AND locked_by IS NOT NULL
      AND locked_at IS NOT NULL
    )
  );

-- The production migrator is the table owner but remains NOSUPERUSER and
-- NOBYPASSRLS. FORCE RLS would otherwise hide every tenant from this global
-- legacy backfill. This migration runs transactionally; FORCE is restored
-- before commit and any failure rolls the setting back with the migration.
ALTER TABLE attendance_month_locks NO FORCE ROW LEVEL SECURITY;
UPDATE attendance_month_locks
SET transition_reason = 'Legacy month lock retained without reproducible dataset provenance.'
WHERE transition_reason IS NULL;
ALTER TABLE attendance_month_locks FORCE ROW LEVEL SECURITY;

ALTER TABLE attendance_month_locks
  ALTER COLUMN provenance_status SET DEFAULT 'none';

CREATE TABLE attendance_period_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  period_id uuid NOT NULL,
  year integer NOT NULL CHECK (year BETWEEN 2020 AND 2100),
  month integer NOT NULL CHECK (month BETWEEN 1 AND 12),
  period_revision bigint NOT NULL CHECK (period_revision > 0),
  dataset_snapshot jsonb NOT NULL,
  dataset_checksum_sha256 varchar(64) NOT NULL CHECK (dataset_checksum_sha256 ~ '^[a-f0-9]{64}$'),
  calculation_versions jsonb NOT NULL,
  template_version varchar(40) NOT NULL CHECK (length(btrim(template_version)) > 0),
  finalized_by uuid NOT NULL,
  finalized_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  reason text NOT NULL CHECK (length(btrim(reason)) >= 3),
  request_id varchar(128) NOT NULL,
  UNIQUE (organization_id, id),
  UNIQUE (organization_id, period_id, period_revision),
  UNIQUE (organization_id, request_id),
  CONSTRAINT attendance_period_version_period_same_tenant
    FOREIGN KEY (organization_id, period_id)
    REFERENCES attendance_month_locks(organization_id, id) ON DELETE RESTRICT,
  CONSTRAINT attendance_period_version_actor_same_tenant
    FOREIGN KEY (organization_id, finalized_by)
    REFERENCES users(organization_id, id) ON DELETE RESTRICT
);

CREATE INDEX attendance_period_versions_period_idx
  ON attendance_period_versions (organization_id, year, month, finalized_at DESC, id DESC);

CREATE TABLE attendance_period_transitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  period_id uuid NOT NULL,
  from_status varchar(16) NOT NULL CHECK (from_status IN ('open', 'review', 'finalized', 'closed')),
  to_status varchar(16) NOT NULL CHECK (to_status IN ('open', 'review', 'finalized', 'closed')),
  resulting_revision bigint NOT NULL CHECK (resulting_revision > 0),
  actor_id uuid NOT NULL,
  reason text NOT NULL CHECK (length(btrim(reason)) >= 3),
  before_dataset_version uuid,
  after_dataset_version uuid,
  before_dataset_checksum_sha256 varchar(64),
  after_dataset_checksum_sha256 varchar(64),
  idempotency_key varchar(128) NOT NULL CHECK (length(btrim(idempotency_key)) BETWEEN 8 AND 128),
  request_id varchar(128) NOT NULL,
  result_json jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE (organization_id, id),
  UNIQUE (organization_id, idempotency_key),
  CONSTRAINT attendance_period_transition_period_same_tenant
    FOREIGN KEY (organization_id, period_id)
    REFERENCES attendance_month_locks(organization_id, id) ON DELETE RESTRICT,
  CONSTRAINT attendance_period_transition_actor_same_tenant
    FOREIGN KEY (organization_id, actor_id)
    REFERENCES users(organization_id, id) ON DELETE RESTRICT,
  CONSTRAINT attendance_period_transition_before_version_same_tenant
    FOREIGN KEY (organization_id, before_dataset_version)
    REFERENCES attendance_period_versions(organization_id, id) ON DELETE RESTRICT,
  CONSTRAINT attendance_period_transition_after_version_same_tenant
    FOREIGN KEY (organization_id, after_dataset_version)
    REFERENCES attendance_period_versions(organization_id, id) ON DELETE RESTRICT,
  CHECK (before_dataset_checksum_sha256 IS NULL OR before_dataset_checksum_sha256 ~ '^[a-f0-9]{64}$'),
  CHECK (after_dataset_checksum_sha256 IS NULL OR after_dataset_checksum_sha256 ~ '^[a-f0-9]{64}$')
);

CREATE INDEX attendance_period_transitions_period_idx
  ON attendance_period_transitions (organization_id, period_id, created_at, id);

ALTER TABLE report_exports
  ADD COLUMN period_version_id uuid,
  ADD COLUMN dataset_checksum_sha256 varchar(64),
  ADD COLUMN calculation_versions jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN scope_department_ids uuid[] NOT NULL DEFAULT ARRAY[]::uuid[],
  ADD CONSTRAINT report_export_period_version_same_tenant
    FOREIGN KEY (organization_id, period_version_id)
    REFERENCES attendance_period_versions(organization_id, id) ON DELETE RESTRICT,
  ADD CONSTRAINT report_export_dataset_checksum_check
    CHECK (dataset_checksum_sha256 IS NULL OR dataset_checksum_sha256 ~ '^[a-f0-9]{64}$');

CREATE INDEX report_exports_period_version_idx
  ON report_exports (organization_id, period_version_id, created_at DESC)
  WHERE period_version_id IS NOT NULL;

ALTER TABLE attendance_period_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_period_versions FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON attendance_period_versions
  USING (organization_id = bss_current_organization_id())
  WITH CHECK (organization_id = bss_current_organization_id());

ALTER TABLE attendance_period_transitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_period_transitions FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON attendance_period_transitions
  USING (organization_id = bss_current_organization_id())
  WITH CHECK (organization_id = bss_current_organization_id());

CREATE TRIGGER attendance_period_versions_immutable
BEFORE UPDATE OR DELETE ON attendance_period_versions
FOR EACH ROW EXECUTE FUNCTION bss_reject_immutable_change();

CREATE TRIGGER attendance_period_transitions_immutable
BEFORE UPDATE OR DELETE ON attendance_period_transitions
FOR EACH ROW EXECUTE FUNCTION bss_reject_immutable_change();

CREATE FUNCTION bss_protect_locked_report_export()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.period_version_id IS NOT NULL
     OR (TG_OP = 'UPDATE' AND NEW.period_version_id IS NOT NULL) THEN
    RAISE EXCEPTION 'Locked report exports are immutable';
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER report_exports_protect_locked
BEFORE UPDATE OR DELETE ON report_exports
FOR EACH ROW EXECUTE FUNCTION bss_protect_locked_report_export();

COMMENT ON TABLE attendance_month_locks IS
  'Tenant-scoped attendance period lifecycle. Finalized and closed states are immutable until an audited reopen transition.';
COMMENT ON TABLE attendance_period_versions IS
  'Immutable finalized dataset, calculation and template provenance used to reproduce or verify locked reports.';
COMMENT ON TABLE attendance_period_transitions IS
  'Append-only actor, reason, revision and before/after dataset evidence for attendance period transitions.';
