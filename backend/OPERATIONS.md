# BSS backend – migrations, backup and recovery

## Production role separation

Use three database identities:

- `bss_owner`: `NOLOGIN`, owns tables/functions;
- `bss_migrator`: temporary/deployment identity allowed to assume `bss_owner`;
- `bss_app`: `LOGIN NOSUPERUSER NOBYPASSRLS`, najmanji potrebni runtime DML plus izvršavanje pet zaključanih security-definer lookup funkcija.

The application must never connect as owner, superuser or a role with `BYPASSRLS`. Apply `deploy/runtime-grants.sql` after migrations and repeat grants for newly introduced tables/functions. Predložak namjerno ne daje runtimeu `INSERT` nad `organizations`, pristup migracijskom ledgeru ni opći `DELETE`.

RLS custom tenant GUC is an application-safety boundary, not protection from a stolen runtime database credential capable of arbitrary SQL. Keep the database private, rotate the credential, restrict grants and alert unusual connections. A stricter hostile-credential model requires a reviewed security-definer gateway or separate tenant roles.

Runtime secrets must come from the platform secret/KMS store. At minimum this includes `DATABASE_URL`, `RFID_UID_PEPPER`, cookie/session deployment settings and the terminal credential encryption key. Rotate the RFID pepper only through a planned card re-enrollment migration because its HMAC output is the lookup key.

`DEVICE_CREDENTIAL_ENCRYPTION_KEY` rotation needs a dual-read/re-encryption procedure keyed by credential `key_version`; do not simply replace the secret while active terminals exist. `TERMINAL_ACTIVATION_CODE` is a provisioning secret and must be rotated after suspected exposure.

Session TTLs are bounded by the process: access tokens may not exceed 24 hours and refresh tokens may not exceed 365 days. The recommended production defaults remain 15 minutes and 30 days; changing them is a security-policy decision, not a deployment workaround.

Production startup rejects `DATABASE_SSL=false`. PostgreSQL certificates are always verified; when the provider uses a private CA, inject its PEM value through the `DATABASE_SSL_CA` secret instead of disabling verification.

Set `DATABASE_POOL_MAX` per application instance so the sum across all replicas, migration jobs and administrative connections remains below the managed PostgreSQL connection limit. The default is 10 and the application rejects values above 100; reserve capacity for recovery and maintenance connections.

Produkcija odbija generički `TRUST_PROXY=true`. Postavite `false` ili eksplicitan, zarezom odvojen popis IP/CIDR adresa pouzdanih reverse proxyja koji prepisuje, a ne samo prosljeđuje klijentske `Forwarded`/`X-Forwarded-*` headere. Inače IP rate limit i sigurnosni logovi mogu vjerovati podatku napadača.

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

Migration `008` intentionally stops if it finds ambiguous normalized duplicate user/worker/pending-invitation e-mails, multiple active RFID cards for one worker or multiple user accounts linked to one worker. Reconcile those rows with a documented operator decision before retrying; never remove a duplicate automatically in the deploy job.

## Health, readiness and maintenance

- `/healthz` potvrđuje da Node proces radi i služi samo kao liveness.
- `/readyz` izvršava `SELECT 1` kroz runtime pool; 503 znači da instanca ne smije primati promet.
- Nadzirati HTTP 5xx/429, p95/p99 latenciju, iskorištenost poola, PostgreSQL lock/deadlock događaje, odbijene terminalske događaje i `last_seen_at` terminala.
- In-process rate limiting is per replica. Put a shared WAF/rate-limit control in front of more than one application instance and preserve the explicit trusted-proxy list.
- Before pilot, run a representative load/soak test and capture `EXPLAIN (ANALYZE, BUFFERS)` for dashboard, attendance timelines and largest allowed report.

Istekli report `bytea` sadržaj, nonceovi i stare sesije ne smiju neograničeno rasti. Platformski scheduler mora za svaki tenant pokrenuti:

```bash
psql "$DATABASE_URL" \
  --set=tenant_id='00000000-0000-0000-0000-000000000000' \
  --file=deploy/maintenance.sql
```

Pokretati zasebnim owner/migrator identitetom, nikad web runtimeom. `FORCE RLS` ostaje uključen, stoga je tenant ID obvezan. Preporučena početna učestalost je jednom dnevno; platforma mora alarmirati neuspjeh posla.

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
