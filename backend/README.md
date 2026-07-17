# BSS Backend MVP – Faza B

Fastify/TypeScript API za frozen BSS frontend v1.0.0. OpenAPI `1.1.0` ima 54 implementirane operacije nad PostgreSQL-om 16.

## Pokretanje

```bash
cp .env.example .env
npm ci
npm run migrate

BSS_BOOTSTRAP_ORGANIZATION_NAME='BSS d.o.o.' \
BSS_BOOTSTRAP_ADMIN_EMAIL='admin@example.hr' \
BSS_BOOTSTRAP_ADMIN_PASSWORD='sigurna-lozinka-najmanje-12' \
npm run bootstrap

npm run dev
```

Za isti origin prvo u korijenu repozitorija pokrenite `npm run build`, zatim postavite `FRONTEND_ROOT=../dist`. API je pod `/api/v1`, liveness pod `/healthz`, a PostgreSQL readiness pod `/readyz`.

## Provjere

```bash
npm run lint
npm run lint:openapi
npm run test:unit
npm run build

BSS_TEST_DATABASE_URL='postgres://…' \
BSS_REQUIRE_POSTGRES_TESTS=true \
npm run test:integration
```

Integracija provjerava migracije, RLS izolaciju, auth, organizaciju/odjele/radnike/smjene, RFID prijavu/odjavu, godišnji, korekcije, audit te CSV/XLSX/PDF.

## Produkcija

Produkcija zahtijeva eksplicitni `DATABASE_URL`, HTTPS, secure cookies, nasumične `RFID_UID_PEPPER`, `DEVICE_CREDENTIAL_ENCRYPTION_KEY` i `TERMINAL_ACTIVATION_CODE` tajne te runtime DB ulogu `NOSUPERUSER NOBYPASSRLS` koja nije vlasnik tablica. Grant predložak je `deploy/runtime-grants.sql`; per-tenant čišćenje isteklih resursa je `deploy/maintenance.sql`, a operativni runbook `OPERATIONS.md`.

Arhitektura i MVP granice: `../BACKEND_ARCHITECTURE.md`. Deep audit: `../BSS_PRODUCTION_READINESS_AUDIT.md`. Predaja: `../BSS_BACKEND_HANDOFF_V1.md`.
