# BSS backend – migrations, backup and recovery

## Production role separation

Use three database identities:

- `bss_owner`: `NOLOGIN`, owns tables/functions;
- `bss_migrator`: temporary/deployment identity allowed to assume `bss_owner`;
- `bss_app`: `LOGIN NOSUPERUSER NOBYPASSRLS`, runtime DML plus execution of the four security-definer identity lookup functions.

The application must never connect as owner, superuser or a role with `BYPASSRLS`. Apply `deploy/runtime-grants.sql` after migrations and repeat grants for newly introduced tables/functions.

Runtime secrets must come from the platform secret/KMS store. At minimum this includes `DATABASE_URL`, `RFID_UID_PEPPER`, cookie/session deployment settings and the terminal credential encryption key. Rotate the RFID pepper only through a planned card re-enrollment migration because its HMAC output is the lookup key.

## Migrations

```bash
cd backend
npm ci
DATABASE_URL='postgres://…' DATABASE_SSL=true npm run migrate
```

The runner:

1. takes a PostgreSQL advisory lock;
2. verifies SHA-256 checksums of already applied migrations;
3. runs each new migration in its own transaction;
4. records it in `bss_schema_migrations` only after success.

Applied migrations are immutable. Production uses forward-only expand/migrate/contract changes. `migrate:down` is blocked unless `BSS_ALLOW_DOWN_MIGRATIONS=true`; that flag is forbidden in production. A failed deployment rolls application code back to the previous compatible release. A bad committed schema change is corrected with a new forward migration.

## Backup policy for the pilot

- managed PostgreSQL with encrypted storage and point-in-time recovery;
- continuous WAL archive with target RPO of 15 minutes;
- daily encrypted logical backup in a separate account/region;
- 35-day pilot retention, subject to the final GDPR/contract retention decision;
- quarterly restore drill before general production, monthly during the pilot;
- target RTO: four hours for pilot service restoration.

Before every destructive/contract migration, create a named recovery point and a verified logical snapshot:

```bash
pg_dump "$DATABASE_URL" --format=custom --no-owner --no-acl --file=bss-pre-migration.dump
pg_restore --list bss-pre-migration.dump > bss-pre-migration.contents.txt
```

Backup files contain personal data. Encrypt them, restrict access, log access and never store them in Git or public object storage.

## Restore drill

1. Create an isolated empty database at the same PostgreSQL major version.
2. Restore the latest base/PITR snapshot to the selected recovery time.
3. Apply only migrations newer than that snapshot.
4. Run `BSS_REQUIRE_POSTGRES_TESTS=true npm run test:integration` against the restored database.
5. Reconcile organization, worker, raw attendance-event and audit-event counts.
6. Verify that the runtime role still cannot cross tenant RLS.
7. Record duration, recovery point, checksums and approver; then securely destroy the drill database.

Restore to production requires an incident lead and data owner approval. Never overwrite the only production database during a drill.
