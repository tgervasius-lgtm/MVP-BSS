-- Run with psql as the migration owner after creating a NOLOGIN owner/migrator
-- and a separate LOGIN runtime role. Example:
--   psql "$DATABASE_URL" --set=runtime_role=bss_app --file=backend/deploy/runtime-grants.sql
\if :{?runtime_role}
\else
  \echo 'Missing required psql variable: runtime_role'
  \quit
\endif

GRANT CONNECT ON DATABASE :DBNAME TO :"runtime_role";
GRANT USAGE ON SCHEMA public TO :"runtime_role";
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO :"runtime_role";
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO :"runtime_role";
GRANT EXECUTE ON FUNCTION bss_auth_lookup(text) TO :"runtime_role";
GRANT EXECUTE ON FUNCTION bss_session_lookup(bytea) TO :"runtime_role";
GRANT EXECUTE ON FUNCTION bss_refresh_lookup(bytea) TO :"runtime_role";

-- The runtime role must remain NOSUPERUSER NOBYPASSRLS and must not own tables.
ALTER ROLE :"runtime_role" NOSUPERUSER NOBYPASSRLS;
