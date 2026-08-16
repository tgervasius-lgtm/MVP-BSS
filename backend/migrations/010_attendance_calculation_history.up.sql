CREATE TABLE organization_timezone_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  timezone varchar(64) NOT NULL CHECK (length(btrim(timezone)) > 0),
  effective_from timestamptz NOT NULL,
  effective_to timestamptz,
  recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE (organization_id, id),
  UNIQUE (organization_id, effective_from),
  CHECK (effective_to IS NULL OR effective_to > effective_from)
);

CREATE UNIQUE INDEX organization_timezone_versions_current_unique
  ON organization_timezone_versions (organization_id)
  WHERE effective_to IS NULL;
CREATE INDEX organization_timezone_versions_effective_lookup_idx
  ON organization_timezone_versions (organization_id, effective_from DESC, effective_to);

CREATE TABLE shift_configuration_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  shift_id uuid NOT NULL,
  version bigint NOT NULL CHECK (version > 0),
  name varchar(100) NOT NULL CHECK (length(btrim(name)) >= 2),
  start_time time NOT NULL,
  end_time time NOT NULL,
  break_minutes integer NOT NULL CHECK (break_minutes BETWEEN 0 AND 960),
  tolerance_minutes integer NOT NULL CHECK (tolerance_minutes BETWEEN 0 AND 240),
  status varchar(16) NOT NULL CHECK (status IN ('active', 'blocked')),
  effective_from timestamptz NOT NULL,
  effective_to timestamptz,
  recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE (organization_id, id),
  UNIQUE (organization_id, shift_id, version),
  UNIQUE (organization_id, shift_id, effective_from),
  CONSTRAINT shift_configuration_version_shift_same_tenant
    FOREIGN KEY (organization_id, shift_id)
    REFERENCES shifts(organization_id, id) ON DELETE RESTRICT,
  CHECK (effective_to IS NULL OR effective_to > effective_from)
);

CREATE UNIQUE INDEX shift_configuration_versions_current_unique
  ON shift_configuration_versions (organization_id, shift_id)
  WHERE effective_to IS NULL;
CREATE INDEX shift_configuration_versions_effective_lookup_idx
  ON shift_configuration_versions (organization_id, shift_id, effective_from DESC, effective_to);

CREATE TABLE worker_shift_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  worker_id uuid NOT NULL,
  shift_id uuid NOT NULL,
  effective_from timestamptz NOT NULL,
  effective_to timestamptz,
  recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE (organization_id, id),
  UNIQUE (organization_id, worker_id, effective_from),
  CONSTRAINT worker_shift_assignment_worker_same_tenant
    FOREIGN KEY (organization_id, worker_id)
    REFERENCES workers(organization_id, id) ON DELETE RESTRICT,
  CONSTRAINT worker_shift_assignment_shift_same_tenant
    FOREIGN KEY (organization_id, shift_id)
    REFERENCES shifts(organization_id, id) ON DELETE RESTRICT,
  CHECK (effective_to IS NULL OR effective_to > effective_from)
);

CREATE UNIQUE INDEX worker_shift_assignments_current_unique
  ON worker_shift_assignments (organization_id, worker_id)
  WHERE effective_to IS NULL;
CREATE INDEX worker_shift_assignments_effective_lookup_idx
  ON worker_shift_assignments (organization_id, worker_id, effective_from DESC, effective_to);

-- Existing mutable state is authoritative only from this migration forward.
-- Earlier intervals are intentionally not guessed.
INSERT INTO organization_timezone_versions (organization_id, timezone, effective_from)
SELECT id, timezone, transaction_timestamp() FROM organizations;

INSERT INTO shift_configuration_versions (
  organization_id, shift_id, version, name, start_time, end_time,
  break_minutes, tolerance_minutes, status, effective_from
)
SELECT organization_id, id, 1, name, start_time, end_time,
  break_minutes, tolerance_minutes, status, transaction_timestamp()
FROM shifts;

INSERT INTO worker_shift_assignments (
  organization_id, worker_id, shift_id, effective_from
)
SELECT organization_id, id, shift_id, transaction_timestamp()
FROM workers;

ALTER TABLE organization_timezone_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_timezone_versions FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON organization_timezone_versions
  USING (organization_id = bss_current_organization_id())
  WITH CHECK (organization_id = bss_current_organization_id());

ALTER TABLE shift_configuration_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_configuration_versions FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON shift_configuration_versions
  USING (organization_id = bss_current_organization_id())
  WITH CHECK (organization_id = bss_current_organization_id());

ALTER TABLE worker_shift_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE worker_shift_assignments FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON worker_shift_assignments
  USING (organization_id = bss_current_organization_id())
  WITH CHECK (organization_id = bss_current_organization_id());

CREATE FUNCTION bss_track_organization_timezone()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  changed_at timestamptz;
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO organization_timezone_versions (organization_id, timezone, effective_from)
    VALUES (NEW.id, NEW.timezone, NEW.created_at);
  ELSIF NEW.timezone IS DISTINCT FROM OLD.timezone THEN
    changed_at := NEW.updated_at;
    UPDATE organization_timezone_versions
    SET effective_to = changed_at
    WHERE organization_id = OLD.id AND effective_to IS NULL;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Missing current timezone version for organization %', OLD.id USING ERRCODE = '23514';
    END IF;
    INSERT INTO organization_timezone_versions (organization_id, timezone, effective_from)
    VALUES (NEW.id, NEW.timezone, changed_at);
  END IF;
  RETURN NEW;
END;
$$;

CREATE FUNCTION bss_track_shift_configuration()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  changed_at timestamptz;
  next_version bigint;
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO shift_configuration_versions (
      organization_id, shift_id, version, name, start_time, end_time,
      break_minutes, tolerance_minutes, status, effective_from
    ) VALUES (
      NEW.organization_id, NEW.id, 1, NEW.name, NEW.start_time, NEW.end_time,
      NEW.break_minutes, NEW.tolerance_minutes, NEW.status, NEW.created_at
    );
  ELSIF (NEW.name, NEW.start_time, NEW.end_time, NEW.break_minutes, NEW.tolerance_minutes, NEW.status)
        IS DISTINCT FROM
        (OLD.name, OLD.start_time, OLD.end_time, OLD.break_minutes, OLD.tolerance_minutes, OLD.status) THEN
    changed_at := NEW.updated_at;
    UPDATE shift_configuration_versions
    SET effective_to = changed_at
    WHERE organization_id = OLD.organization_id AND shift_id = OLD.id AND effective_to IS NULL
    RETURNING version + 1 INTO next_version;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Missing current configuration version for shift %', OLD.id USING ERRCODE = '23514';
    END IF;
    INSERT INTO shift_configuration_versions (
      organization_id, shift_id, version, name, start_time, end_time,
      break_minutes, tolerance_minutes, status, effective_from
    ) VALUES (
      NEW.organization_id, NEW.id, next_version, NEW.name, NEW.start_time, NEW.end_time,
      NEW.break_minutes, NEW.tolerance_minutes, NEW.status, changed_at
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE FUNCTION bss_track_worker_shift_assignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  changed_at timestamptz;
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO worker_shift_assignments (
      organization_id, worker_id, shift_id, effective_from
    ) VALUES (NEW.organization_id, NEW.id, NEW.shift_id, NEW.created_at);
  ELSIF NEW.shift_id IS DISTINCT FROM OLD.shift_id THEN
    changed_at := NEW.updated_at;
    UPDATE worker_shift_assignments
    SET effective_to = changed_at
    WHERE organization_id = OLD.organization_id AND worker_id = OLD.id AND effective_to IS NULL;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Missing current shift assignment for worker %', OLD.id USING ERRCODE = '23514';
    END IF;
    INSERT INTO worker_shift_assignments (
      organization_id, worker_id, shift_id, effective_from
    ) VALUES (NEW.organization_id, NEW.id, NEW.shift_id, changed_at);
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION bss_track_organization_timezone() FROM PUBLIC;
REVOKE ALL ON FUNCTION bss_track_shift_configuration() FROM PUBLIC;
REVOKE ALL ON FUNCTION bss_track_worker_shift_assignment() FROM PUBLIC;

CREATE TRIGGER organizations_track_timezone
AFTER INSERT OR UPDATE OF timezone ON organizations
FOR EACH ROW EXECUTE FUNCTION bss_track_organization_timezone();

CREATE TRIGGER shifts_track_configuration
AFTER INSERT OR UPDATE OF name, start_time, end_time, break_minutes, tolerance_minutes, status ON shifts
FOR EACH ROW EXECUTE FUNCTION bss_track_shift_configuration();

CREATE TRIGGER workers_track_shift_assignment
AFTER INSERT OR UPDATE OF shift_id ON workers
FOR EACH ROW EXECUTE FUNCTION bss_track_worker_shift_assignment();

ALTER TABLE attendance_days
  ADD COLUMN calculation_version varchar(40) NOT NULL DEFAULT 'legacy-unversioned',
  ADD COLUMN configuration_snapshot jsonb NOT NULL DEFAULT '{"provenanceStatus":"legacy_unavailable"}'::jsonb,
  ADD COLUMN current_calculation_id uuid;

ALTER TABLE attendance_events
  ADD COLUMN attendance_day_id uuid,
  ADD COLUMN timezone_version_id uuid,
  ADD COLUMN timezone_name varchar(64),
  ADD COLUMN resolved_local_at timestamp without time zone,
  ADD COLUMN resolved_utc_offset_seconds integer,
  ADD CONSTRAINT attendance_event_day_same_tenant
    FOREIGN KEY (organization_id, attendance_day_id)
    REFERENCES attendance_days(organization_id, id) ON DELETE RESTRICT,
  ADD CONSTRAINT attendance_event_timezone_same_tenant
    FOREIGN KEY (organization_id, timezone_version_id)
    REFERENCES organization_timezone_versions(organization_id, id) ON DELETE RESTRICT,
  ADD CONSTRAINT attendance_event_interpretation_complete CHECK (
    (
      attendance_day_id IS NULL
      AND timezone_version_id IS NULL
      AND timezone_name IS NULL
      AND resolved_local_at IS NULL
      AND resolved_utc_offset_seconds IS NULL
    ) OR (
      attendance_day_id IS NOT NULL
      AND processing_status = 'accepted'
      AND timezone_version_id IS NOT NULL
      AND timezone_name IS NOT NULL
      AND length(btrim(timezone_name)) > 0
      AND resolved_local_at IS NOT NULL
      AND resolved_utc_offset_seconds IS NOT NULL
      AND resolved_utc_offset_seconds BETWEEN -86400 AND 86400
    )
  );

CREATE INDEX attendance_events_day_source_idx
  ON attendance_events (organization_id, attendance_day_id, occurred_at, id)
  WHERE attendance_day_id IS NOT NULL AND processing_status = 'accepted';

CREATE TABLE attendance_calculations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  attendance_day_id uuid NOT NULL,
  calculation_version varchar(40) NOT NULL CHECK (length(btrim(calculation_version)) > 0),
  configuration_snapshot jsonb NOT NULL,
  source_event_ids uuid[] NOT NULL CHECK (cardinality(source_event_ids) > 0),
  before_json jsonb,
  after_json jsonb NOT NULL,
  reason text NOT NULL CHECK (length(btrim(reason)) >= 3),
  actor_type varchar(16) NOT NULL CHECK (actor_type IN ('terminal', 'user')),
  actor_id uuid NOT NULL,
  supersedes_id uuid,
  affected_from date NOT NULL,
  affected_to date NOT NULL,
  request_id varchar(128) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE (organization_id, id),
  CONSTRAINT attendance_calculation_day_same_tenant
    FOREIGN KEY (organization_id, attendance_day_id)
    REFERENCES attendance_days(organization_id, id) ON DELETE RESTRICT,
  CONSTRAINT attendance_calculation_supersedes_same_tenant
    FOREIGN KEY (organization_id, supersedes_id)
    REFERENCES attendance_calculations(organization_id, id) ON DELETE RESTRICT,
  CHECK (affected_to >= affected_from)
);

CREATE INDEX attendance_calculations_day_timeline_idx
  ON attendance_calculations (organization_id, attendance_day_id, created_at DESC, id DESC);

ALTER TABLE attendance_calculations ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_calculations FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON attendance_calculations
  USING (organization_id = bss_current_organization_id())
  WITH CHECK (organization_id = bss_current_organization_id());

CREATE TRIGGER attendance_calculations_immutable
BEFORE UPDATE OR DELETE ON attendance_calculations
FOR EACH ROW EXECUTE FUNCTION bss_reject_immutable_change();

ALTER TABLE attendance_days
  ADD CONSTRAINT attendance_day_current_calculation_same_tenant
    FOREIGN KEY (organization_id, current_calculation_id)
    REFERENCES attendance_calculations(organization_id, id) ON DELETE RESTRICT;

COMMENT ON TABLE organization_timezone_versions IS
  'Effective-dated organization timezone history; pre-migration history is intentionally unknown.';
COMMENT ON TABLE shift_configuration_versions IS
  'Effective-dated attendance-affecting shift definitions.';
COMMENT ON TABLE worker_shift_assignments IS
  'Effective-dated worker-to-shift assignment history.';
COMMENT ON COLUMN attendance_events.attendance_day_id IS
  'Immutable link from an accepted raw event to the derived attendance day it affected.';
COMMENT ON COLUMN attendance_events.timezone_version_id IS
  'Event-effective BSS timezone configuration used for the one-time UTC-to-local interpretation.';
COMMENT ON COLUMN attendance_events.timezone_name IS
  'IANA timezone name used when the authoritative event was first accepted.';
COMMENT ON COLUMN attendance_events.resolved_local_at IS
  'Immutable local wall-clock timestamp resolved once from occurred_at when the event was accepted.';
COMMENT ON COLUMN attendance_events.resolved_utc_offset_seconds IS
  'Immutable UTC offset that identifies the accepted local occurrence, including a DST fold.';
COMMENT ON COLUMN attendance_calculations.configuration_snapshot IS
  'Event-effective shift/timezone configuration plus immutable source event-time interpretations used by this calculation.';
COMMENT ON TABLE attendance_calculations IS
  'Append-only derivation and explicit-recalculation provenance with before/after evidence.';
