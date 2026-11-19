-- Inactive extension of the internal authority registry. No runtime grants are installed here.
ALTER TABLE bss_internal.grants DROP CONSTRAINT grants_action_check;
ALTER TABLE bss_internal.grants ADD CONSTRAINT grants_action_check
  CHECK (action IN ('PROVISION_TENANT','VERIFY_ONBOARDING','APPROVE_GO_LIVE','MANAGE_ANNUAL_LEAVE_EXCEPTION_GRANT'));

CREATE TABLE public.annual_leave_exception_grants (
  organization_id uuid NOT NULL,
  administrator_id uuid NOT NULL,
  administrator_revision bigint NOT NULL CHECK (administrator_revision > 0),
  revision bigint NOT NULL DEFAULT 1 CHECK (revision > 0),
  active boolean NOT NULL,
  changed_by uuid NOT NULL REFERENCES bss_internal.people(id) ON DELETE RESTRICT,
  operation_id uuid NOT NULL UNIQUE REFERENCES bss_internal.operations(id) ON DELETE RESTRICT,
  changed_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (organization_id, administrator_id),
  FOREIGN KEY (organization_id, administrator_id) REFERENCES public.users(organization_id, id) ON DELETE RESTRICT
);
ALTER TABLE public.annual_leave_exception_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.annual_leave_exception_grants FORCE ROW LEVEL SECURITY;
CREATE POLICY internal_operator ON public.annual_leave_exception_grants
  USING (organization_id = bss_current_organization_id() AND current_setting('bss.internal_runtime', true) = 'on')
  WITH CHECK (
    organization_id = bss_current_organization_id() AND current_setting('bss.internal_runtime', true) = 'on'
    AND EXISTS (
      SELECT 1 FROM bss_internal.operations op
      WHERE op.id = operation_id AND op.person_id = changed_by AND NOT op.used
        AND op.scope_key = current_setting('bss.internal_scope', true)
        AND op.person_id::text = current_setting('bss.internal_person', true)
        AND op.intent->>'action' = 'MANAGE_ANNUAL_LEAVE_EXCEPTION_GRANT' AND op.intent->'scope'->>'kind' = 'TENANT'
        AND lower(op.intent->'scope'->>'targetId') = organization_id::text
        AND lower(op.payload->>'administratorId') = administrator_id::text
        AND active = (op.payload->>'decision' = 'grant')
    )
  );
CREATE POLICY named_administrator_read ON public.annual_leave_exception_grants FOR SELECT
  USING (organization_id = bss_current_organization_id()
    AND current_setting('bss.actor_role', true) = 'admin'
    AND administrator_id::text = current_setting('bss.actor_id', true));
CREATE POLICY migration_owner_read ON public.annual_leave_exception_grants FOR SELECT
  USING (current_user = pg_get_userbyid((SELECT relowner FROM pg_class WHERE oid = 'public.annual_leave_exception_grants'::regclass)));
REVOKE ALL ON public.annual_leave_exception_grants FROM PUBLIC;
