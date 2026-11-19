-- Explicit pilot composition only, after 023. No runtime privileges are installed.
CREATE TABLE public.annual_leave_exception_proposals (
  organization_id uuid NOT NULL,
  request_id uuid NOT NULL,
  proposal_revision bigint NOT NULL CHECK (proposal_revision > 1),
  administrator_id uuid NOT NULL,
  grant_revision bigint NOT NULL CHECK (grant_revision > 0),
  reason text NOT NULL CHECK (length(btrim(reason)) BETWEEN 1 AND 500),
  dates jsonb NOT NULL CHECK (jsonb_typeof(dates) = 'array' AND jsonb_array_length(dates) BETWEEN 1 AND 366),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (organization_id, request_id, proposal_revision),
  FOREIGN KEY (organization_id, request_id) REFERENCES public.leave_requests(organization_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (organization_id, administrator_id) REFERENCES public.users(organization_id, id) ON DELETE RESTRICT
);

CREATE TABLE public.annual_leave_exception_confirmations (
  organization_id uuid NOT NULL,
  request_id uuid NOT NULL,
  proposal_revision bigint NOT NULL,
  confirmation_revision bigint NOT NULL CHECK (confirmation_revision = proposal_revision + 1),
  worker_user_id uuid NOT NULL,
  confirmed_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (organization_id, request_id, proposal_revision),
  FOREIGN KEY (organization_id, request_id, proposal_revision)
    REFERENCES public.annual_leave_exception_proposals(organization_id, request_id, proposal_revision) ON DELETE RESTRICT,
  FOREIGN KEY (organization_id, worker_user_id) REFERENCES public.users(organization_id, id) ON DELETE RESTRICT
);

ALTER TABLE public.annual_leave_exception_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.annual_leave_exception_proposals FORCE ROW LEVEL SECURITY;
ALTER TABLE public.annual_leave_exception_confirmations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.annual_leave_exception_confirmations FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_proposal_read ON public.annual_leave_exception_proposals FOR SELECT USING (
  organization_id = bss_current_organization_id() AND (
    current_setting('bss.actor_role', true) IN ('admin', 'manager')
    OR (current_setting('bss.actor_role', true) = 'worker' AND EXISTS (
      SELECT 1 FROM public.leave_requests l
      WHERE l.organization_id = annual_leave_exception_proposals.organization_id AND l.id = annual_leave_exception_proposals.request_id
        AND l.reservation_submitted_by::text = current_setting('bss.actor_id', true)
    ))
  )
);
CREATE POLICY admin_proposal_insert ON public.annual_leave_exception_proposals FOR INSERT WITH CHECK (
  organization_id = bss_current_organization_id()
  AND current_setting('bss.actor_role', true) = 'admin'
  AND administrator_id::text = current_setting('bss.actor_id', true)
  AND EXISTS (
    SELECT 1 FROM public.annual_leave_exception_grants g
    WHERE g.organization_id = annual_leave_exception_proposals.organization_id
      AND g.administrator_id = annual_leave_exception_proposals.administrator_id
      AND g.active AND g.revision = annual_leave_exception_proposals.grant_revision
  )
);
CREATE POLICY tenant_confirmation_read ON public.annual_leave_exception_confirmations FOR SELECT USING (
  organization_id = bss_current_organization_id()
  AND (current_setting('bss.actor_role', true) IN ('admin', 'manager')
    OR (current_setting('bss.actor_role', true) = 'worker'
      AND worker_user_id::text = current_setting('bss.actor_id', true)))
);
CREATE POLICY worker_confirmation_insert ON public.annual_leave_exception_confirmations FOR INSERT WITH CHECK (
  organization_id = bss_current_organization_id()
  AND current_setting('bss.actor_role', true) = 'worker'
  AND worker_user_id::text = current_setting('bss.actor_id', true)
  AND EXISTS (
    SELECT 1 FROM public.leave_requests l
    WHERE l.organization_id = annual_leave_exception_confirmations.organization_id AND l.id = annual_leave_exception_confirmations.request_id
      AND l.reservation_submitted_by = worker_user_id AND l.status = 'pending' AND l.revision = confirmation_revision
  )
);

CREATE POLICY migration_owner_read ON public.annual_leave_exception_proposals FOR SELECT
  USING (current_user = pg_get_userbyid((SELECT relowner FROM pg_class WHERE oid = 'public.annual_leave_exception_proposals'::regclass)));
CREATE POLICY migration_owner_read ON public.annual_leave_exception_confirmations FOR SELECT
  USING (current_user = pg_get_userbyid((SELECT relowner FROM pg_class WHERE oid = 'public.annual_leave_exception_confirmations'::regclass)));
REVOKE ALL ON public.annual_leave_exception_proposals, public.annual_leave_exception_confirmations FROM PUBLIC;
