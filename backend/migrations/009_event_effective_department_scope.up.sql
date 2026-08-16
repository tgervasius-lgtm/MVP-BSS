CREATE TABLE worker_department_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  worker_id uuid NOT NULL,
  department_id uuid NOT NULL,
  effective_from timestamptz NOT NULL,
  effective_to timestamptz,
  recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE (organization_id, id),
  UNIQUE (organization_id, worker_id, effective_from),
  CONSTRAINT worker_department_assignment_worker_same_tenant
    FOREIGN KEY (organization_id, worker_id)
    REFERENCES workers(organization_id, id) ON DELETE RESTRICT,
  CONSTRAINT worker_department_assignment_department_same_tenant
    FOREIGN KEY (organization_id, department_id)
    REFERENCES departments(organization_id, id) ON DELETE RESTRICT,
  CHECK (effective_to IS NULL OR effective_to > effective_from)
);

CREATE UNIQUE INDEX worker_department_assignments_current_unique
  ON worker_department_assignments (organization_id, worker_id)
  WHERE effective_to IS NULL;
CREATE INDEX worker_department_assignments_effective_lookup_idx
  ON worker_department_assignments (organization_id, worker_id, effective_from DESC, effective_to);

-- The current department is authoritative only from this migration forward.
-- Earlier assignment periods are not inferred from mutable worker state.
INSERT INTO worker_department_assignments (
  organization_id, worker_id, department_id, effective_from
)
SELECT organization_id, id, department_id, transaction_timestamp()
FROM workers;

ALTER TABLE worker_department_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE worker_department_assignments FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON worker_department_assignments
  USING (organization_id = bss_current_organization_id())
  WITH CHECK (organization_id = bss_current_organization_id());

CREATE FUNCTION bss_track_worker_department_assignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  changed_at timestamptz;
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO worker_department_assignments (
      organization_id, worker_id, department_id, effective_from
    ) VALUES (NEW.organization_id, NEW.id, NEW.department_id, NEW.created_at);
  ELSIF NEW.department_id IS DISTINCT FROM OLD.department_id THEN
    changed_at := NEW.updated_at;
    UPDATE worker_department_assignments
    SET effective_to = changed_at
    WHERE organization_id = OLD.organization_id
      AND worker_id = OLD.id
      AND effective_to IS NULL;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Missing current department assignment for worker %', OLD.id USING ERRCODE = '23514';
    END IF;
    INSERT INTO worker_department_assignments (
      organization_id, worker_id, department_id, effective_from
    ) VALUES (NEW.organization_id, NEW.id, NEW.department_id, changed_at);
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION bss_track_worker_department_assignment() FROM PUBLIC;

CREATE TRIGGER workers_track_department_assignment
AFTER INSERT OR UPDATE OF department_id ON workers
FOR EACH ROW EXECUTE FUNCTION bss_track_worker_department_assignment();

ALTER TABLE attendance_events
  ADD COLUMN effective_department_id uuid,
  ADD CONSTRAINT attendance_event_department_same_tenant
    FOREIGN KEY (organization_id, effective_department_id)
    REFERENCES departments(organization_id, id) ON DELETE RESTRICT;

ALTER TABLE terminal_sync_events
  ADD COLUMN effective_department_id uuid,
  ADD CONSTRAINT sync_event_department_same_tenant
    FOREIGN KEY (organization_id, effective_department_id)
    REFERENCES departments(organization_id, id) ON DELETE RESTRICT;

CREATE INDEX attendance_events_department_occurred_idx
  ON attendance_events (organization_id, effective_department_id, occurred_at DESC, id DESC)
  WHERE effective_department_id IS NOT NULL;
CREATE INDEX terminal_sync_events_department_timeline_idx
  ON terminal_sync_events (organization_id, effective_department_id, terminal_id, received_at DESC, id DESC)
  WHERE effective_department_id IS NOT NULL;

COMMENT ON COLUMN attendance_events.effective_department_id IS
  'Immutable department effective at occurred_at; NULL means no authoritative department evidence and is manager-invisible.';
COMMENT ON COLUMN terminal_sync_events.effective_department_id IS
  'Immutable department effective at occurred_at; NULL means no authoritative department evidence and is manager-invisible.';
