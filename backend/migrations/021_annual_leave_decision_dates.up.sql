-- Internal covered-date decisions. Runtime permissions are withheld until the read side is ready.
CREATE TABLE annual_leave_decision_dates (
  organization_id uuid NOT NULL,
  request_id uuid NOT NULL,
  confirmed_revision bigint NOT NULL CHECK (confirmed_revision > 1),
  absence_date date NOT NULL,
  absence_type text NOT NULL CHECK (absence_type = 'annual_leave'),
  confirmed_by uuid NOT NULL,
  approved_revision bigint CHECK (approved_revision = confirmed_revision + 1),
  PRIMARY KEY (organization_id, request_id, confirmed_revision, absence_date),
  FOREIGN KEY (organization_id, request_id) REFERENCES leave_requests(organization_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (organization_id, confirmed_by) REFERENCES users(organization_id, id) ON DELETE RESTRICT
);

CREATE UNIQUE INDEX annual_leave_approved_dates_by_request ON annual_leave_decision_dates
  (organization_id, request_id, absence_date) WHERE approved_revision IS NOT NULL;

ALTER TABLE annual_leave_decision_dates ENABLE ROW LEVEL SECURITY;
ALTER TABLE annual_leave_decision_dates FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON annual_leave_decision_dates
  USING (organization_id = bss_current_organization_id())
  WITH CHECK (organization_id = bss_current_organization_id());
CREATE POLICY migration_owner_read ON annual_leave_decision_dates FOR SELECT
  USING (current_user = pg_get_userbyid((SELECT relowner FROM pg_class WHERE oid = 'public.annual_leave_decision_dates'::regclass)));
REVOKE ALL ON annual_leave_decision_dates FROM PUBLIC;
