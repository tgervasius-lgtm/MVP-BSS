# BSS Developer Guide

Ovaj dokument je provjeren put od čistog klona do lokalnog BSS sustava. Frontend `v1.0.0`, OpenAPI `1.1.0` i migracije `001`–`008` trenutačni su ugovor; promjena poslovnog ponašanja prvo mora promijeniti taj ugovor i pripadajuće testove.

## 1. Čisti lokalni start

Preduvjeti su Git, Node.js 22.9+, npm 10+ i Docker s Compose podrškom. `.nvmrc` zaključava Node major verziju; minimalna minor verzija potrebna je zbog sigurnog opcionalnog `.env` učitavanja.

```bash
git clone https://github.com/tgervasius-lgtm/MVP-BSS.git
cd MVP-BSS
nvm install
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

Prije `bootstrap` naredbe zamijenite `BSS_BOOTSTRAP_ADMIN_PASSWORD` u lokalnom `backend/.env`. Bootstrap se izvršava samo jednom za novu bazu; nakon toga uklonite bootstrap lozinku iz datoteke. `.env` je ignoriran u Gitu, ali i dalje sadrži tajne i ne smije se slati drugoj osobi.

Backend skripte `dev`, `migrate`, `bootstrap` i `start` učitavaju opcionalni `backend/.env`; već postavljene procesne varijable imaju prednost. Produkcija mora koristiti platform secret store, ne `.env` ni `compose.dev.yml`.

Nakon starta:

- aplikacija i API: `http://127.0.0.1:3000/` i `/api/v1`;
- liveness: `http://127.0.0.1:3000/healthz`;
- PostgreSQL readiness: `http://127.0.0.1:3000/readyz`.

Ako Docker nije dopušten, pokrenite vlastiti PostgreSQL 16 i promijenite samo `DATABASE_URL`. Aplikacijski proces u produkciji nikada ne smije koristiti owner/superuser ulogu.

## 2. Struktura i izvori istine

| Putanja | Što developer mijenja ovdje |
| --- | --- |
| `openapi/bss-mvp-api-v1.yaml` | javni REST ugovor, role metapodaci i response modeli |
| `backend/src/http` | Fastify rute, JSON Schema i HTTP zaštite |
| `backend/src/services` | poslovna pravila i tenant-scopeani SQL |
| `backend/src/db` | transakcijski lifecycle, pool, migrator i bootstrap |
| `backend/migrations` | nepromjenjivi parovi `NNN_*.up.sql` / `NNN_*.down.sql` |
| `backend/deploy` | runtime grantovi i maintenance SQL |
| `src/adapters` | frontend API klijent, hidracija i binding mutacija |
| `backend/contracts/frontend-screen-api-map-v1.json` | ekran → OpenAPI operation matrica i hash ugovora |
| `backend/test` / `tests` | unit, contract, PostgreSQL, frontend i browser regresije |

Za arhitektonske granice pročitajte `BACKEND_ARCHITECTURE.md`; za poznati dug i produkcijske rizike `BSS_PRODUCTION_READINESS_AUDIT.md`; za operacije, backup i restore `backend/OPERATIONS.md`.

## 3. Provjere prije promjene

```bash
npm run check
npm run test:e2e
npm audit --omit=dev --audit-level=high
npm --prefix backend audit --omit=dev --audit-level=high
```

PostgreSQL integracijski suite radi nad odvojenom privremenom bazom na portu 5433. Ne usmjeravajte ga na razvojnu, dijeljenu ili produkcijsku bazu.

```bash
docker compose -f compose.dev.yml --profile test up -d postgres-test

BSS_TEST_DATABASE_URL='postgres://postgres:postgres@127.0.0.1:5433/bss_test' \
BSS_REQUIRE_POSTGRES_TESTS=true \
npm --prefix backend run test:integration
```

`BSS_REQUIRE_POSTGRES_TESTS=true` je obvezan u CI-ju: preskočen DB test nije prolaz. Testni Postgres koristi `tmpfs`; uklanjanje kontejnera briše samo tu testnu bazu.

## 4. Dodavanje migracije

1. Ne mijenjajte već primijenjene migracije ni njihov checksum.
2. Dodajte sljedeći numerirani par, primjerice `009_naziv.up.sql` i `009_naziv.down.sql`.
3. Svaka tenant tablica mora imati `organization_id`, složene tenant strane ključeve gdje je primjenjivo te `ENABLE` i `FORCE ROW LEVEL SECURITY` policy.
4. Tvrde invariante postavite u PostgreSQL constraint/unique index, a razumljivu validaciju zadržite i u servisu.
5. Za novu tablicu ili funkciju ažurirajte `backend/deploy/runtime-grants.sql` po načelu najmanjih privilegija.
6. Pokrenite migraciju na čistoj bazi i na kopiji prethodne sheme te cijeli PostgreSQL suite.

```bash
npm --prefix backend run migrate

# Isključivo lokalno, samo za zadnju migraciju:
BSS_ALLOW_DOWN_MIGRATIONS=true npm --prefix backend run migrate:down
```

Produkcijski rollback je forward-compatible rollback aplikacije i nova korektivna migracija. `migrate:down` je u produkciji zabranjen.

## 5. Siguran put za novu funkciju

Novi developer ne treba veliki refaktor. Radite okomiti, mali rez ovim redom:

1. dopunite OpenAPI i `frontend-screen-api-map-v1.json` ako se mijenja postojeći ekran;
2. dopunite tipove u `backend/src/services/contracts.ts`;
3. registrirajte strogu JSON Schema rutu i eksplicitne dopuštene uloge;
4. implementirajte poslovno pravilo u odgovarajućem service modulu kroz `withTenant`/`withTransaction`;
5. tenant nikada ne čitajte iz bodyja ili queryja — dolazi samo iz verificirane sesije ili terminalskog identiteta;
6. koristite parametrizirani SQL, zaključavanje i optimistic revision ondje gdje dvije naredbe mogu mijenjati isti zapis;
7. zapišite audit za poslovnu mutaciju, bez lozinki, tokena, RFID UID-a ili privatnih razloga;
8. dodajte unit/contract test, negativni RBAC/cross-tenant test i PostgreSQL integracijski scenarij;
9. tek zatim povežite frontend adapter, bez vraćanja mock podataka;
10. pokrenite cijeli quality gate i ažurirajte handoff/operativnu dokumentaciju.

Velike `PgPhaseAService` i `PgMvpService` datoteke poznati su dug. Izdvajajte domenu inkrementalno iza postojećeg `MvpService` ugovora; nemojte ih prepisivati u jednom zahvatu.

## 6. Česte poteškoće

- `readyz` vraća 503: provjerite radi li `postgres`, `DATABASE_URL` i jesu li migracije primijenjene.
- Login ne radi nakon čistog starta: bootstrap nije izvršen ili koristite drugu lokalnu lozinku.
- Origin/CSRF 403: URL preglednika mora odgovarati `PUBLIC_ORIGIN` vrijednosti, uključujući host i port.
- Produkcijski config se ruši pri startu: to je namjeran fail-fast; provjerite HTTPS, secure cookie, TLS bazu, proxy allowlist i sve tajne.
- Integracijski test je `SKIP`: niste postavili `BSS_TEST_DATABASE_URL`; u obveznom gateu dodajte i `BSS_REQUIRE_POSTGRES_TESTS=true`.

## 7. Definition of done

Promjena je spremna za review kada su OpenAPI, ruta, service pravilo, migracija/grantovi, frontend binding i dokumentacija međusobno usklađeni; svi lokalni gateovi prolaze; stvarni PostgreSQL i browser CI su zeleni; nije dodan tenant input niti oslabljena RLS/RBAC granica; rollback i operativni utjecaj su navedeni u PR-u.
