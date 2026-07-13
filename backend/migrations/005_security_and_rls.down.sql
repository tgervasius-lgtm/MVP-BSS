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
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', table_name);
    EXECUTE format('ALTER TABLE %I DISABLE ROW LEVEL SECURITY', table_name);
  END LOOP;
END;
$$;
DROP POLICY IF EXISTS tenant_isolation ON organizations;
ALTER TABLE organizations DISABLE ROW LEVEL SECURITY;
DROP FUNCTION IF EXISTS bss_refresh_lookup(bytea);
DROP FUNCTION IF EXISTS bss_session_lookup(bytea);
DROP FUNCTION IF EXISTS bss_auth_lookup(text);
DROP FUNCTION IF EXISTS bss_current_organization_id();
DROP TRIGGER IF EXISTS audit_events_immutable ON audit_events;
DROP TRIGGER IF EXISTS attendance_events_immutable ON attendance_events;
DROP FUNCTION IF EXISTS bss_reject_immutable_change();
