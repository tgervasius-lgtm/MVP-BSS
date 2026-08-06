# BSS Smart Systems

BSS je modularni monolit za evidenciju radnog vremena, RFID terminale, godišnje odmore, korekcije i poslovne izvještaje. Frontend v1.0.0 je zaključani prikazni ugovor; autoritativni podaci i poslovna pravila nalaze se u Fastify/TypeScript backendu i PostgreSQL-u.

## Tehnologije i granice

- Node.js 22.9+, TypeScript 5, Fastify 5
- PostgreSQL 16, eksplicitni SQL, transakcije i `FORCE ROW LEVEL SECURITY`
- REST `/api/v1`, OpenAPI 1.1.0 (43 putanje, 54 operacije)
- browser sesije u `HttpOnly`, `SameSite=Strict`, produkcijski `Secure` kolačićima
- isti origin za frontend i API; service worker nikada ne cacheira `/api/`
- nema mikroservisa, queuea, object storagea, MFA/SSO-a, payrolla ni ERP integracije u MVP-u

## Struktura

| Putanja | Odgovornost |
| --- | --- |
| `backend/src/http` | rute, JSON Schema, Origin zaštita i stabilni error envelope |
| `backend/src/services` | auth, workforce, evidencija, odluke, izvještaji i terminalski tok |
| `backend/src/db` | pool, zajednički transakcijski lifecycle, tenant kontekst, migracije i bootstrap |
| `backend/migrations` | nepromjenjive checksumirane migracije `001`–`008` |
| `backend/deploy` | najmanji runtime grantovi i per-tenant maintenance SQL |
| `openapi` | strojni API ugovor |
| `src/adapters/api*` | API klijent, role-aware hidratacija i stvarne frontend mutacije |
| `tests` / `backend/test` | frontend, browser, contract, sigurnosni i PostgreSQL testovi |

## Lokalno pokretanje

Preduvjeti: Node.js 22.9+, npm 10+ i Docker Compose (ili vlastiti PostgreSQL 16).

```bash
nvm use
npm ci
npm --prefix backend ci
docker compose -f compose.dev.yml up -d postgres
cp backend/.env.example backend/.env
npm run build
npm --prefix backend run migrate
npm --prefix backend run bootstrap
npm --prefix backend run dev
```

Prije jednokratnog `bootstrap` koraka zamijenite lokalnu administratorsku lozinku u `backend/.env`, a nakon njega je uklonite. Backend skripte automatski učitavaju tu ignoriranu lokalnu datoteku. Potpuni clean-clone postupak, odvojena testna baza i siguran put za novu migraciju/funkciju: [DEVELOPER_GUIDE.md](DEVELOPER_GUIDE.md).

- aplikacija: `http://127.0.0.1:3000/`
- liveness: `/healthz`
- readiness (uključuje PostgreSQL): `/readyz`

## Quality gate

```bash
npm run check
npm run test:e2e
npm audit --omit=dev --audit-level=high

npm --prefix backend audit --omit=dev --audit-level=high

BSS_TEST_DATABASE_URL='postgres://…' \
BSS_REQUIRE_POSTGRES_TESTS=true \
npm --prefix backend run test:integration
```

Integracijski test mora raditi nad stvarnim PostgreSQL-om. Ne postavljati `FULL PASS` na temelju preskočenog DB testa.

## Produkcijski minimum

1. Migracije pokreće zaseban migrator; runtime je `NOSUPERUSER NOBYPASSRLS` i nije vlasnik tablica.
2. Nakon migracija primijeniti `backend/deploy/runtime-grants.sql`.
3. Konfiguracija u produkciji mora imati HTTPS origin, secure cookies, eksplicitni DB URL i nasumične terminal/RFID tajne.
4. Uključiti PITR, kriptirane backup kopije, restore drill, nadzor `/readyz`, error ratea, latencije i DB poola.
5. Per-tenant `backend/deploy/maintenance.sql` izvršavati planiranim platformskim poslom radi čišćenja isteklih binarnih izvještaja, nonceova i starih sesija.
6. Produkcijski deploy i merge u `main` zahtijevaju zasebno odobrenje.

Detaljan runbook: [backend/OPERATIONS.md](backend/OPERATIONS.md).

## Autoritativna dokumentacija

- [BACKEND_ARCHITECTURE.md](BACKEND_ARCHITECTURE.md) — arhitektura i granice
- [DEVELOPER_GUIDE.md](DEVELOPER_GUIDE.md) — clean clone, struktura, migracije i razvojni workflow
- [BACKEND_READINESS_REPORT.md](BACKEND_READINESS_REPORT.md) — ugovorna spremnost Faze B
- [BSS_PRODUCTION_READINESS_AUDIT.md](BSS_PRODUCTION_READINESS_AUDIT.md) — dubinski audit i preostali tehnički dug
- [BSS_BACKEND_HANDOFF_V1.md](BSS_BACKEND_HANDOFF_V1.md) — predaja backend developeru
- [openapi/bss-mvp-api-v1.yaml](openapi/bss-mvp-api-v1.yaml) — API ugovor
- [BSS_SCREEN_MAP_V1.md](BSS_SCREEN_MAP_V1.md) — frontend ekrani
- [BSS_REPORTING_PROFILE_V1.md](BSS_REPORTING_PROFILE_V1.md) — pravila izvještavanja

`readme_upute.txt` je zadržan samo kao kratka poveznica za starije bookmarke; ovaj README je izvor istine.
