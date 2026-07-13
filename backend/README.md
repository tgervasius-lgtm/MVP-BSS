# BSS Backend MVP – Faza A

Modularni Fastify/TypeScript servis za zaključani Frontend v1.0.0. Ovaj direktorij ne mijenja frontend runtime niti njegov UX/UI.

## Lokalno

Preduvjeti: Node.js 22+ i PostgreSQL 16+.

```bash
cd backend
cp .env.example .env
npm ci
npm run migrate
npm run dev
```

API je pod `/api/v1`; infrastrukturni liveness endpoint je `/healthz`. Produkcija zahtijeva HTTPS, sigurne HttpOnly/SameSite kolačiće i zasebnu `NOBYPASSRLS` runtime ulogu.
`RFID_UID_PEPPER` je obvezna produkcijska tajna od najmanje 32 znaka i ne smije se dijeliti s cookie/device tajnama.

## Quality gate

```bash
npm run check
BSS_TEST_DATABASE_URL='postgres://…' BSS_REQUIRE_POSTGRES_TESTS=true npm run test:integration
```

Lokalni integration test se preskače samo kada PostgreSQL URL nije zadan. U GitHub CI-ju PostgreSQL test je obvezan.

## Implementirani dio ugovora

OpenAPI `1.0.0` ima 40 putanja i 51 odobrenu operaciju. Faza A implementira 30 operacija: auth/sesije i invitation accept, dashboard, organizaciju, odjele, blagdane, korisnike, radnike, smjene, RFID assignment/block, fond godišnjeg, report preview i terminal sync-event timeline.

Preostale odobrene operacije pripadaju procesiranju evidencije/terminala, zahtjevima, korekcijama, izvoznom workeru i audit read modelu u kasnijim fazama. To nisu otvorene contract odluke: njihove sheme i scope već su zaključani u OpenAPI v1.

Readiness odluke su u `../BACKEND_READINESS_REPORT.md`, arhitektura u `../BACKEND_ARCHITECTURE.md`, a strojna screen/API matrica u `contracts/frontend-screen-api-map-v1.json`.
