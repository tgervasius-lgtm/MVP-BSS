-- Run once per tenant with the owner/migrator identity. FORCE RLS remains active,
-- therefore the tenant context is mandatory even for the table owner.
-- Example:
--   psql "$DATABASE_URL" --set=tenant_id=00000000-0000-0000-0000-000000000000 \
--     --file=backend/deploy/maintenance.sql
\if :{?tenant_id}
\else
  \echo 'Missing required psql variable: tenant_id'
  \quit 3
\endif

BEGIN;
SELECT set_config('bss.organization_id', :'tenant_id', true);
SET LOCAL statement_timeout = '30s';

-- Keep export metadata/checksums for traceability, but release expired binary
-- payloads that otherwise accumulate in PostgreSQL.
UPDATE report_exports
SET status = 'expired', content = NULL, mime_type = NULL, file_name = NULL
WHERE expires_at < clock_timestamp()
  AND (content IS NOT NULL OR status <> 'expired');

DELETE FROM terminal_request_nonces
WHERE expires_at < clock_timestamp();

-- Session rows are operational security material, not the authoritative audit
-- trail. Login/logout/reuse evidence remains in immutable audit_events.
DELETE FROM auth_sessions
WHERE COALESCE(revoked_at, refresh_expires_at) < clock_timestamp() - interval '30 days';

COMMIT;
