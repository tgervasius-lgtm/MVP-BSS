-- Run with psql as the migration owner after creating a NOLOGIN owner/migrator
-- and a separate LOGIN runtime role. Example:
--   psql "$DATABASE_URL" --set=runtime_role=bss_app --file=backend/deploy/runtime-grants.sql
\if :{?runtime_role}
\else
  \echo 'Missing required psql variable: runtime_role'
  \quit 3
\endif

GRANT CONNECT ON DATABASE :DBNAME TO :"runtime_role";
GRANT USAGE ON SCHEMA public TO :"runtime_role";
REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM :"runtime_role";
GRANT SELECT ON ALL TABLES IN SCHEMA public TO :"runtime_role";
GRANT INSERT ON TABLE
  departments, shifts, workers, holidays, rfid_cards,
  users, user_department_scopes, user_invitations, auth_sessions,
  terminals, terminal_credentials, attendance_events, attendance_days,
  leave_requests, correction_requests, report_exports, audit_events,
  holiday_calendars, terminal_request_nonces, terminal_sync_events
TO :"runtime_role";
GRANT UPDATE ON TABLE
  organizations, departments, shifts, workers, holidays, rfid_cards,
  users, user_invitations, auth_sessions, terminals, terminal_credentials,
  attendance_days, leave_requests, correction_requests, report_exports,
  holiday_calendars
TO :"runtime_role";
GRANT DELETE ON TABLE holidays, user_department_scopes, terminal_request_nonces TO :"runtime_role";
REVOKE ALL PRIVILEGES ON TABLE bss_schema_migrations FROM :"runtime_role";
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO :"runtime_role";
GRANT EXECUTE ON FUNCTION bss_auth_lookup(text) TO :"runtime_role";
GRANT EXECUTE ON FUNCTION bss_session_lookup(bytea) TO :"runtime_role";
GRANT EXECUTE ON FUNCTION bss_refresh_lookup(bytea) TO :"runtime_role";
GRANT EXECUTE ON FUNCTION bss_invitation_lookup(bytea) TO :"runtime_role";
GRANT EXECUTE ON FUNCTION bss_terminal_credential_lookup(uuid) TO :"runtime_role";

-- Migrations always use the separate owner/migrator role. The runtime role must
-- remain NOSUPERUSER NOBYPASSRLS and must not own tables.
ALTER ROLE :"runtime_role" NOSUPERUSER NOBYPASSRLS;
