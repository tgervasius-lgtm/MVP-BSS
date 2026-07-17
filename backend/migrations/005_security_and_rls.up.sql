CREATE FUNCTION bss_reject_immutable_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION '% is append-only', TG_TABLE_NAME USING ERRCODE = '55000';
END;
$$;

CREATE TRIGGER attendance_events_immutable
BEFORE UPDATE OR DELETE ON attendance_events
FOR EACH ROW EXECUTE FUNCTION bss_reject_immutable_change();

CREATE TRIGGER audit_events_immutable
BEFORE UPDATE OR DELETE ON audit_events
FOR EACH ROW EXECUTE FUNCTION bss_reject_immutable_change();

CREATE FUNCTION bss_current_organization_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT nullif(current_setting('bss.organization_id', true), '')::uuid
$$;

CREATE FUNCTION bss_auth_lookup(p_email text)
RETURNS TABLE (
  user_id uuid,
  organization_id uuid,
  email varchar,
  password_hash text,
  role varchar,
  status varchar,
  worker_id uuid,
  user_revision bigint,
  organization_name varchar,
  tax_identifier varchar,
  timezone varchar,
  organization_revision bigint,
  department_ids uuid[]
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
SET row_security = off
AS $$
  SELECT u.id, u.organization_id, u.email, u.password_hash, u.role, u.status,
         u.worker_id, u.revision, o.name, o.tax_identifier, o.timezone, o.revision,
         COALESCE(array_agg(s.department_id) FILTER (WHERE s.department_id IS NOT NULL), ARRAY[]::uuid[])
  FROM users u
  JOIN organizations o ON o.id = u.organization_id
  LEFT JOIN user_department_scopes s
    ON s.organization_id = u.organization_id AND s.user_id = u.id
  WHERE lower(u.email) = lower(p_email)
  GROUP BY u.id, o.id
$$;

CREATE FUNCTION bss_session_lookup(p_access_hash bytea)
RETURNS TABLE (
  session_id uuid,
  organization_id uuid,
  user_id uuid,
  email varchar,
  role varchar,
  status varchar,
  worker_id uuid,
  user_revision bigint,
  organization_name varchar,
  tax_identifier varchar,
  timezone varchar,
  organization_revision bigint,
  department_ids uuid[]
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
SET row_security = off
AS $$
  SELECT s.id, s.organization_id, u.id, u.email, u.role, u.status, u.worker_id,
         u.revision, o.name, o.tax_identifier, o.timezone, o.revision,
         COALESCE(array_agg(ds.department_id) FILTER (WHERE ds.department_id IS NOT NULL), ARRAY[]::uuid[])
  FROM auth_sessions s
  JOIN users u ON u.organization_id = s.organization_id AND u.id = s.user_id
  JOIN organizations o ON o.id = s.organization_id
  LEFT JOIN user_department_scopes ds
    ON ds.organization_id = u.organization_id AND ds.user_id = u.id
  WHERE s.access_token_hash = p_access_hash
    AND s.revoked_at IS NULL
    AND s.access_expires_at > clock_timestamp()
    AND u.status = 'active'
    AND o.status = 'active'
  GROUP BY s.id, u.id, o.id
$$;

CREATE FUNCTION bss_refresh_lookup(p_refresh_hash bytea)
RETURNS TABLE (
  session_id uuid,
  organization_id uuid,
  user_id uuid,
  refresh_expires_at timestamptz,
  revoked_at timestamptz,
  revoke_reason varchar
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
SET row_security = off
AS $$
  SELECT s.id, s.organization_id, s.user_id, s.refresh_expires_at, s.revoked_at, s.revoke_reason
  FROM auth_sessions s
  JOIN users u ON u.organization_id = s.organization_id AND u.id = s.user_id
  JOIN organizations o ON o.id = s.organization_id
  WHERE s.refresh_token_hash = p_refresh_hash
    AND u.status = 'active'
    AND o.status = 'active'
$$;

REVOKE ALL ON FUNCTION bss_auth_lookup(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION bss_session_lookup(bytea) FROM PUBLIC;
REVOKE ALL ON FUNCTION bss_refresh_lookup(bytea) FROM PUBLIC;

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON organizations
  USING (id = bss_current_organization_id())
  WITH CHECK (id = bss_current_organization_id());

DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'departments', 'shifts', 'workers', 'holidays', 'rfid_cards',
    'users', 'user_department_scopes', 'user_invitations', 'auth_sessions',
    'terminals', 'terminal_credentials', 'attendance_events', 'attendance_days',
    'leave_requests', 'correction_requests', 'attendance_month_locks',
    'report_exports', 'audit_events'
  ]
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', table_name);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I USING (organization_id = bss_current_organization_id()) WITH CHECK (organization_id = bss_current_organization_id())',
      table_name
    );
  END LOOP;
END;
$$;
