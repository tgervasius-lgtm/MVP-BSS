# BSS Backend MVP – Handoff v1

| Stavka | Vrijednost |
| --- | --- |
| Frontend | frozen `v1.0.0`; UX/UI nije mijenjan |
| Frontend baseline | `91323c7cdbbbbf7b965c4926c94a11af6d31bf62` |
| API | OpenAPI `1.1.0`, 43 putanje / 54 operacije |
| Backend | Faza B implementirana na grani `agent/bss-backend-phase-b-v1` |
| Baza | PostgreSQL 16, migracije `001`–`007` |
| Runtime | frontend i API na istom originu |
| Produkcija | nije automatski objavljena niti spojena u `main` |

## Što se predaje

Backend implementira autentikaciju, organizacijski model, radnike, smjene, RFID, evidenciju, godišnje, korekcije, KPI-je, audit i CSV/XLSX/PDF izvještaje. Frontend koristi `src/adapters/api.js`, `api-state.js` i `api-bindings.js`; produkcijski poslovni podaci dolaze samo iz `/api/v1` i PostgreSQL-a.

Server je jedini autoritet za identitet, scope, poslovne podatke, zbrojeve i odluke; frontend je prikazni i interakcijski klijent.

Strojni ugovor je `openapi/bss-mvp-api-v1.yaml`, a ekran/operation matrica `backend/contracts/frontend-screen-api-map-v1.json`.

## Lokalno podizanje

Preduvjeti su Node.js 22+ i PostgreSQL 16+.

```bash
npm ci
npm --prefix backend ci
npm run build

DATABASE_URL='postgres://postgres:postgres@127.0.0.1:5432/bss' \
DATABASE_SSL=false \
npm --prefix backend run migrate

DATABASE_URL='postgres://postgres:postgres@127.0.0.1:5432/bss' \
DATABASE_SSL=false \
BSS_BOOTSTRAP_ORGANIZATION_NAME='BSS d.o.o.' \
BSS_BOOTSTRAP_ADMIN_EMAIL='admin@example.hr' \
BSS_BOOTSTRAP_ADMIN_PASSWORD='promijeni-ovu-sigurnu-lozinku' \
npm --prefix backend run bootstrap

NODE_ENV=development \
PUBLIC_ORIGIN=http://127.0.0.1:3000 \
DATABASE_URL='postgres://postgres:postgres@127.0.0.1:5432/bss' \
DATABASE_SSL=false \
FRONTEND_ROOT=../dist \
RFID_UID_PEPPER='najmanje-32-nasumicna-znaka-1234' \
DEVICE_CREDENTIAL_ENCRYPTION_KEY='najmanje-32-nasumicna-znaka-5678' \
TERMINAL_ACTIVATION_CODE='jednokratni-uparivacki-kod' \
npm --prefix backend run dev
```

`bootstrap` se izvršava jednom po novoj instalaciji. Odbit će postojeći administratorski e-mail. Produkcijske tajne dolaze iz platformskog secret/KMS sustava, nikad iz Git repozitorija.

## Quality gate

```bash
npm run lint
npm test
npm run build
npm --prefix backend run lint
npm --prefix backend run lint:openapi
npm --prefix backend run test:unit
npm --prefix backend run build

BSS_TEST_DATABASE_URL='postgres://…' \
BSS_REQUIRE_POSTGRES_TESTS=true \
npm --prefix backend run test:integration
```

GitHub `BSS quality gate` dodatno podiže PostgreSQL, migrira, bootstrapira tenant, pokreće Fastify s pravim frontend buildom te izvršava desktop i mobilni Chromium + axe. `BSS backend quality gate` obvezno izvršava RLS i cijeli poslovni integracijski tok.

## Operativne obveze prije pilota

1. Kreirati odvojene DB uloge za migrator i `NOSUPERUSER NOBYPASSRLS` runtime.
2. Konfigurirati HTTPS, secure cookies, trust proxy i platform secret store.
3. Uključiti managed PostgreSQL PITR i provesti restore drill.
4. Postaviti nadzor `/healthz`, HTTP error rate/latency, DB poola, rejected terminal events i terminal last-seen.
5. Osigurati managed provisioning kanal za terminalsku RFID hash tajnu i device credential.
6. Definirati retention osobnih podataka prije stvarnih zaposlenika.

## Uloge

- `admin`: tenant-wide master podaci, odluke, terminali, izvještaji i audit;
- `manager`: dodijeljeni odjeli, odluke i operativni izvještaji;
- `worker`: vlastiti profil/evidencija/zahtjevi/korekcije;
- `accountant`: odobreni privatno minimizirani podaci i izvještaji, bez master mutacija.

Frontend policy služi prikazu. Backend RBAC + SQL scope + RLS su jedina autorizacijska granica.

## Izvještaji

XLSX je glavni poslovni izvoz, CSV tehnički, PDF čitljivi poslovni dokument. Sva tri koriste isti dataset i SHA-256. Artefakt vrijedi 24 sata i dohvaća se autentificiranom download rutom. Izvoz veći od 100.000 redaka traži uži period/filtar.

## Terminal

Admin uparuje terminal aktivacijskim kodom i jednokratno preuzima device credential. Terminal zasebnim sigurnim provisioning kanalom dobiva RFID HMAC tajnu. Batch mora biti sortiran po rastućem sequenceu. Raw događaji se ne mijenjaju; duplikati su idempotentni, nonce sprečava replay, a heartbeat ne potvrđuje offline red.

## Poznate granice

- plan je jedna zadana smjena po radniku;
- nema self-service kreiranja/brisanja tenanta;
- nema e-mail providera, MFA/SSO ni reset lozinke;
- izvještajni artefakti su privremeno u PostgreSQL-u, ne u object storageu;
- nema payrolla, GPS-a, biometrije, kontrole vrata, ERP integracije ni billinga;
- Cloudflare Pages preview sam po sebi nije funkcionalni backend deploy.

Detaljne odluke: `BACKEND_ARCHITECTURE.md`. Aktualni gate: `BACKEND_READINESS_REPORT.md`. Rezultat Faze B: `BACKEND_PHASE_B_REPORT.md`.
