-- Reservation foundation. The current HTTP workflow does not create these rows.
-- No runtime grants are added by this migration.
ALTER TABLE leave_requests
  ADD COLUMN reservation_submitted_by uuid,
  ADD COLUMN reservation_submission_key text,
  ADD COLUMN reservation_submission_hash text,
  ADD CONSTRAINT leave_reservation_submitter_same_tenant
    FOREIGN KEY (organization_id, reservation_submitted_by)
    REFERENCES users(organization_id, id) ON DELETE RESTRICT,
  ADD CONSTRAINT leave_reservation_submission_complete CHECK (
    (reservation_submitted_by IS NULL AND reservation_submission_key IS NULL AND reservation_submission_hash IS NULL)
    OR
    (leave_type = 'annual_leave' AND reservation_submitted_by IS NOT NULL
      AND reservation_submission_key IS NOT NULL AND reservation_submission_key ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$'
      AND reservation_submission_hash IS NOT NULL AND reservation_submission_hash ~ '^[a-f0-9]{64}$')
  );

CREATE UNIQUE INDEX leave_reservation_submission_unique
  ON leave_requests (organization_id, reservation_submitted_by, reservation_submission_key)
  WHERE reservation_submission_key IS NOT NULL;

CREATE TABLE annual_leave_reservations (
  organization_id uuid NOT NULL,
  request_id uuid NOT NULL,
  calendar_year integer NOT NULL CHECK (calendar_year BETWEEN 1 AND 9999),
  requested_days integer NOT NULL CHECK (requested_days BETWEEN 1 AND 366),
  reserved_days integer NOT NULL CHECK (reserved_days BETWEEN 0 AND requested_days),
  PRIMARY KEY (organization_id, request_id, calendar_year),
  FOREIGN KEY (organization_id, request_id) REFERENCES leave_requests(organization_id, id) ON DELETE RESTRICT
);

ALTER TABLE annual_leave_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE annual_leave_reservations FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON annual_leave_reservations
  USING (organization_id = bss_current_organization_id())
  WITH CHECK (organization_id = bss_current_organization_id());
-- Migration owners need global visibility to refuse a destructive rollback under FORCE RLS.
CREATE POLICY migration_owner_read ON annual_leave_reservations FOR SELECT
  USING (current_user = pg_get_userbyid((SELECT relowner FROM pg_class WHERE oid = 'public.annual_leave_reservations'::regclass)));
REVOKE ALL ON annual_leave_reservations FROM PUBLIC;
