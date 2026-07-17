# BSS Backend Readiness Report

| Stavka | Odluka |
| --- | --- |
| Datum pregleda | 13. 7. 2026. |
| Frontend ugovor | **FROZEN** `v1.0.0` / `frontend-v1.0.0` |
| OpenAPI ugovor | **APPROVED** `1.0.0`, `FULL_PASS_APPROVED` |
| Opseg ugovora | 40 putanja / 51 jedinstvena operacija / 68 shema |
| Implementirano u Fazi A | 30 ugovornih operacija |
| Presuda | **FULL PASS — BACKEND MVP FAZA A** |
| Otvorene readiness stavke | **0** |
| Frontend promjene | Nema |

## 1. Izvršni zaključak

Backend Faza A zadovoljava sve preduvjete za siguran nastavak razvoja bez promjene zamrznutog UX/UI-ja. OpenAPI više nije nacrt: verzioniran je kao `1.0.0`, svih 17 frontend ekrana ima odobren ugovorni status, a tri demo-only ekrana ostaju namjerno isključena iz produkcijskog API-ja.

Zatvorene su sve ranije ugovorne praznine:

- RFID read/assignment s normalizacijom, maskiranjem i keyed HMAC hashom UID-a;
- serverski autoritativni fond godišnjeg;
- report preview iz istih normaliziranih filtera i query obitelji kao budući izvoz;
- atomski prihvat pozivnice, postavljanje lozinke i otvaranje sigurne sesije;
- vremenski poredan read model terminalskih sync događaja;
- dedicated dashboard summary s najviše četiri klikabilna KPI-ja;
- update/block odjela i zasebna aggregate revizija godišnjeg kalendara blagdana;
- zaključan HMAC-SHA256 v1 uređajni potpis u OpenAPI-ju.

Preostale neimplementirane OpenAPI operacije pripadaju planiranim fazama evidencije, odluka, izvoza i terminalskog procesiranja. One nisu otvorena readiness odluka: njihove sheme, uloge, scope, statusi i sigurnosna pravila već su zaključani u v1 ugovoru.

## 2. PostgreSQL model i relacije

Potvrđen je PostgreSQL 16 shared-database/shared-schema model. Svaka poslovna tablica ima `organization_id`, a tenant relacije koriste složene `(organization_id, id)` strane ključeve. Baza zato odbija cross-tenant veze čak i kada aplikacijski sloj pogriješi.

| Domena | Glavne tablice | Zaključano pravilo |
| --- | --- | --- |
| Tenant | `organizations` | tenant se izvodi iz provjerene sesije |
| Ljudi i raspored | `departments`, `shifts`, `workers`, `rfid_cards`, `holidays`, `holiday_calendars` | povijesni zapisi se blokiraju, ne brišu; kalendar ima aggregate revision |
| Identitet | `users`, `user_department_scopes`, `user_invitations`, `auth_sessions` | uloga/scope dolaze iz sesije; pozivnica se prihvaća jednom |
| Terminal | `terminals`, `terminal_credentials`, `terminal_request_nonces`, `terminal_sync_events`, `attendance_events` | nonce sprečava replay; sync/raw dokazi su append-only |
| Evidencija | `attendance_days`, `attendance_month_locks` | izvedeni dan odvojen je od izvornog događaja |
| Odluke | `leave_requests`, `correction_requests` | odluka i revizija ostaju dokazive |
| Izvještaji | `report_exports` | verzija dataseta/predloška, zbrojevi, checksum i privatni storage key |
| Audit | `audit_events` | append-only before/after događaj s actorom i `requestId` |

Migracija `006_contract_completion` nadograđuje već objavljene migracije bez prepisivanja njihove povijesti.

## 3. Multi-tenant izolacija

Izolacija tvrtki provodi se u četiri neovisna sloja:

1. organizacija se izvodi iz provjerene session/device identity, nikada iz bodyja ili queryja;
2. svaki repository poziv otvara transakciju i postavlja `SET LOCAL bss.organization_id`;
3. sve tenant tablice imaju `ENABLE` i `FORCE ROW LEVEL SECURITY`;
4. složeni tenant FK-ovi odbijaju cross-tenant relacije.

Produkcijski runtime mora biti `NOSUPERUSER NOBYPASSRLS` i ne smije biti vlasnik tablica. GitHub quality gate to provjerava stvarnim PostgreSQL 16 servisom i negativnim cross-tenant testom.

## 4. RBAC

| Resurs/radnja | Administrator | Voditelj | Radnik | Knjigovodstvo |
| --- | --- | --- | --- | --- |
| Organizacija, odjeli, korisnici | puni pristup | čitanje dodijeljenih odjela | nema | nema |
| Radnici i smjene | puni pristup | čitanje dodijeljenih odjela | vlastiti osobni tokovi | nema |
| Godišnji i korekcije | cijela organizacija | odluke u dodijeljenim odjelima | vlastiti read/create/cancel | izvještajni read prema ugovoru |
| Izvještaji | create/read/download | operativni scope | nema | create/read/download |
| Terminali | read/pair/revoke | read-only | nema | nema |
| Audit | read-only | nema | nema | nema |

RBAC se provjerava u HTTP policyju i ponovno u scoped SQL-u. Frontend skrivanje kontrola nije sigurnosna granica.

## 5. Autentikacija, sesije i uređajna sigurnost

- Argon2id za lozinke (`64 MiB`, tri prolaza, paralelizam 1).
- 256-bitni opaque access/refresh tokeni; baza čuva samo SHA-256 hash.
- Access TTL 15 minuta, refresh TTL 30 dana i jednokratna refresh rotacija.
- Reuse rotiranog refresh tokena opoziva aktivne sesije korisnika.
- `HttpOnly`, `SameSite=Strict`, produkcijski `Secure` kolačići i obvezan HTTPS.
- Unsafe browser zahtjevi moraju imati točan same-origin `Origin`.
- Login i invitation accept imaju rate limit i ne otkrivaju postoji li račun/token.
- Pozivnica se atomski označava prihvaćenom, postavlja Argon2id lozinka, opozivaju se druge aktivne pozivnice i otvara sesija.
- RFID UID nikada se ne vraća ni auditira: spremaju se samo maska i HMAC-SHA256 hash s `RFID_UID_PEPPER` tajnom.
- Device signature je zaključan na HMAC-SHA256 v1 canonical request, ±300 s clock skew, jednokratni nonce i `skip replay` pravilo.
- Tajna terminala predviđena je za enkripciju u mirovanju s key-version poljem; runtime tajne pripadaju platformskom secret/KMS adapteru.

MVP login e-mail ostaje globalno jedinstven jer frozen login body nema tenant selector. Više organizacija po jednom identitetu ostaje MVP 2.0.

## 6. Pet dovršenih ugovora

| Ugovor | Endpoint | Implementacijsko jamstvo |
| --- | --- | --- |
| RFID assignment | `GET/POST /workers/{workerId}/rfid-cards` | tenant/manager scope; UID HMAC-hashiran; odgovor je maskiran |
| Fond godišnjeg | `GET /leave-balances` | radni dani se računaju na serveru, bez vikenda i organizacijskih blagdana; approved/planned/remaining/available |
| Report preview | `POST /report-previews` | najviše 200 redaka, serverski zbrojevi, deterministički `datasetVersion`, pet odobrenih tipova izvještaja |
| Invitation accept | `POST /auth/invitations/accept` | one-time token, expiry/revocation provjera, Argon2id, audit i nova sigurna sesija u jednoj transakciji |
| Terminal sync events | `GET /terminals/{terminalId}/sync-events` | tenant scope, filtri, newest-first keyset pagination i append-only izvor |

## 7. Audit i korekcije

`attendance_events`, `terminal_sync_events` i `audit_events` imaju trigger koji odbija `UPDATE` i `DELETE`. Korekcija nikada ne prepisuje izvorni terminalski dokaz. Kasnija implementacija approval toka mora u jednoj transakciji zaključati zahtjev i izvedeni dan, provjeriti scope/reviziju, zapisati before/after, ažurirati samo `attendance_day` i dodati audit događaj.

## 8. Migracije, backup i rollback

Migracije su numerirane, checksumirane, zaključane PostgreSQL advisory lockom i izvršavaju se svaka u zasebnoj transakciji. Objavljena migracija se ne mijenja. Produkcijski model je forward-only expand/migrate/contract; development `down` zahtijeva eksplicitni flag.

Operativni minimum: managed PostgreSQL, šifrirani PITR, RPO 15 minuta, dnevni odvojeni logički backup, cilj RTO četiri sata i redoviti restore drill. Detalji su u `backend/OPERATIONS.md`.

## 9. Usklađenost s Frontendom v1.0.0

Strojna matrica `backend/contracts/frontend-screen-api-map-v1.json` ima:

- 14 runtime ekrana sa statusom `covered`;
- tri namjerno isključena demo/proposal ekrana: `sharedLeave`, `terminalDemo`, `flow`;
- nula `partial` ili `derived` statusa;
- prazan `contractGatesBeforeLaterPhases` popis.

KPI-ji su serverski scopeani, dashboard vraća najviše četiri stavke i svaka sadrži deterministički drill-down ekran i filtre. Report preview i fond godišnjeg vraćaju server-authoritative totals/dataset version.

## 10. MVP nasuprot MVP 2.0

### MVP v1

- četiri zaključane uloge i tenant/department/self izolacija;
- organizacije, odjeli, korisnici, radnici, smjene, blagdani i RFID;
- sigurne sesije i invitation accept;
- attendance, godišnji, korekcije i audit prema odobrenom ugovoru;
- terminal pairing, HMAC batch/heartbeat, offline idempotencija i sync read model;
- tablični preview i CSV/XLSX službeni izvozi;
- backup, restore, logovi i minimalne metrike.

### MVP 2.0 ili zasebno odobrenje

- zajednički kalendar godišnjih iz Scope v1.1;
- PDF/PDF-A poslovni izvoz;
- jedan identitet u više organizacija/tenant selector;
- payroll, GPS/geofencing, biometrika, kontrola vrata, ERP/CRM, native aplikacije i billing;
- retention/anonymization politike nakon pravnog/GDPR odobrenja.

## 11. Završni readiness gate

| Gate | Status |
| --- | --- |
| OpenAPI versioniran i jedinstveni operation ID-jevi | PASS |
| Svi frozen runtime ekrani ugovorno pokriveni | PASS |
| PostgreSQL relacije, RLS i cross-tenant zabrane | PASS |
| Auth, invitation accept i sigurne sesije | PASS |
| RBAC i manager/worker scope | PASS |
| RFID, fond godišnjeg, report preview i terminal sync read model | PASS |
| Audit, migracije, backup i rollback pravila | PASS |
| Unit, HTTP contract, build i PostgreSQL integration quality gate | PASS |
| Otvorene readiness stavke | **0** |

Ova presuda ne odobrava merge u `main`, produkcijski deploy ili stvarne osobne podatke. Za to ostaju potrebni standardni PR pregled i zasebna odluka vlasnika projekta.
