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

## Quality gate

```bash
npm run check
BSS_TEST_DATABASE_URL='postgres://…' BSS_REQUIRE_POSTGRES_TESTS=true npm run test:integration
```

Lokalni integration test se preskače samo kada PostgreSQL URL nije zadan. U GitHub CI-ju PostgreSQL test je obvezan.

## Implementirani dio ugovora

Faza A implementira 22 od 43 postojećih OpenAPI operacija: auth/sesije, organizaciju, odjele, blagdane, korisničke račune, radnike, smjene i blokiranje RFID kartice. Preostale operacije pripadaju evidenciji, zahtjevima, korekcijama, izvještajima, auditu i terminalu u kasnijim fazama.

Readiness odluke su u `../BACKEND_READINESS_REPORT.md`, arhitektura u `../BACKEND_ARCHITECTURE.md`, a strojna screen/API matrica u `contracts/frontend-screen-api-map-v1.json`.
