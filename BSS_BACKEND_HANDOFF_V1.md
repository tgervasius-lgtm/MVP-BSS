# BSS Backend MVP – Handoff v1

| Stavka | Vrijednost |
| --- | --- |
| Frontend | frozen `v1.0.0`; UX/UI nije mijenjan |
| Frontend baseline | `91323c7cdbbbbf7b965c4926c94a11af6d31bf62` |
| API | OpenAPI `1.1.0`, 43 putanje / 54 operacije |
| Backend | Faza B implementirana na grani `agent/bss-backend-phase-b-v1` |
| Baza | PostgreSQL 16, migracije `001`–`008` |
| Runtime | frontend i API na istom originu |
| Readiness | **FULL PASS**, 0 otvorenih readiness stavki |
| Produkcija | nije automatski objavljena niti spojena u `main` |

## Što se predaje

Backend implementira autentikaciju, organizacijski model, radnike, smjene, RFID, evidenciju, godišnje, korekcije, KPI-je, audit i CSV/XLSX/PDF izvještaje. Frontend koristi `src/adapters/api.js`, `api-state.js` i `api-bindings.js`; produkcijski poslovni podaci dolaze samo iz `/api/v1` i PostgreSQL-a.

Production-readiness audit i popis tehničkog duga nalaze se u `BSS_PRODUCTION_READINESS_AUDIT.md`. Taj dokument je obvezno početno štivo za sljedećeg backend developera; ne mijenja frozen poslovni ugovor.

Server je jedini autoritet za identitet, scope, poslovne podatke, zbrojeve i odluke; frontend je prikazni i interakcijski klijent.

Strojni ugovor je `openapi/bss-mvp-api-v1.yaml`, a ekran/operation matrica `backend/contracts/frontend-screen-api-map-v1.json`.

## Lokalno podizanje

Autoritativni clean-clone postupak, mapa strukture, migracijski workflow i checklist za sigurnu novu funkciju nalaze se u `DEVELOPER_GUIDE.md`. Kratki put s lokalnim PostgreSQL-om iz `compose.dev.yml` je:

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

Prije `bootstrap` koraka postavlja se lokalna administratorska lozinka u ignoriranom `backend/.env`-u, a nakon izvršavanja se uklanja. `bootstrap` se izvršava jednom po novoj instalaciji i odbit će postojeći administratorski e-mail. Produkcijske tajne dolaze iz platformskog secret/KMS sustava, nikad iz Git repozitorija.

## Quality gate

```bash
npm run check
npm audit --omit=dev --audit-level=high
npm --prefix backend audit --omit=dev --audit-level=high

BSS_TEST_DATABASE_URL='postgres://…' \
BSS_REQUIRE_POSTGRES_TESTS=true \
npm --prefix backend run test:integration
```

GitHub `BSS quality gate` dodatno podiže PostgreSQL, migrira, bootstrapira tenant, pokreće Fastify s pravim frontend buildom te izvršava desktop i mobilni Chromium + axe. `BSS backend quality gate` obvezno izvršava RLS i cijeli poslovni integracijski tok.

## Operativne obveze prije pilota

1. Kreirati odvojene DB uloge za migrator i `NOSUPERUSER NOBYPASSRLS` runtime.
2. Konfigurirati HTTPS, secure cookies, trust proxy i platform secret store.
3. Uključiti managed PostgreSQL PITR i provesti restore drill.
4. Postaviti `/healthz` liveness, `/readyz` readiness te nadzor HTTP error rate/latency, DB poola, rejected terminal events i terminal last-seen.
5. Osigurati managed provisioning kanal za terminalsku RFID hash tajnu i device credential.
6. Definirati retention osobnih podataka prije stvarnih zaposlenika.
7. Zakazati per-tenant `backend/deploy/maintenance.sql` i alarmirati svaki neuspjeh.
8. Provesti load/soak test s realističnim volumenom te spremiti p95/p99 i ključne PostgreSQL query planove.

## Uloge

- `admin`: tenant-wide master podaci, odluke, terminali, izvještaji i audit;
- `manager`: dodijeljeni odjeli, odluke i operativni izvještaji;
- `worker`: vlastiti profil/evidencija/zahtjevi/korekcije;
- `accountant`: odobreni privatno minimizirani podaci i izvještaji, bez master mutacija.

Frontend policy služi prikazu. Backend RBAC + SQL scope + RLS su jedina autorizacijska granica.

## Izvještaji

XLSX je glavni poslovni izvoz, CSV tehnički, PDF čitljivi poslovni dokument. Sva tri koriste isti dataset i SHA-256. Artefakt vrijedi 24 sata i dohvaća se autentificiranom download rutom. Izvoz veći od 10.000 redaka traži uži period/filtar.

## Terminal

Admin uparuje terminal aktivacijskim kodom i jednokratno preuzima device credential. Terminal zasebnim sigurnim provisioning kanalom dobiva RFID HMAC tajnu. Batch mora biti sortiran po rastućem sequenceu. Raw događaji se ne mijenjaju; duplikati su idempotentni, nonce sprečava replay, a heartbeat ne potvrđuje offline red.

Prije šire produkcije treba definirati KMS key-rotation postupak i RFID re-enrollment strategiju; `keyVersion` je priprema, ne dovršena automatizirana rotacija.

## Poznate granice

- plan je jedna zadana smjena po radniku;
- nema self-service kreiranja/brisanja tenanta;
- nema e-mail providera, MFA/SSO ni reset lozinke;
- izvještajni artefakti su privremeno u PostgreSQL-u, ne u object storageu;
- nema payrolla, GPS-a, biometrije, kontrole vrata, ERP integracije ni billinga;
- Cloudflare Pages preview sam po sebi nije funkcionalni backend deploy.
- rate limit je po instanci i za horizontalno skaliranje zahtijeva WAF ili shared store;
- reporti su sinkroni do 10.000 redaka, a terminalski batch serijski radi očuvanja redoslijeda;
- dva velika service modula razdvajaju se inkrementalno, bez rewritea.

Detaljne odluke: `BACKEND_ARCHITECTURE.md`. Aktualni gate: `BACKEND_READINESS_REPORT.md`. Rezultat Faze B: `BACKEND_PHASE_B_REPORT.md`.
