# BSS Backend Readiness Report

| Stavka | Stanje |
| --- | --- |
| Datum pregleda | 17. 7. 2026. |
| Frontend ugovor | Frontend `v1.0.0`, bez UX/UI promjena |
| OpenAPI | `1.1.0`, status `MVP_IMPLEMENTED` |
| Pokrivenost | 43 putanje / 54 operacije / 54 implementirane operacije |
| Migracije | `001`–`007`, PostgreSQL 16 |
| Faza | Backend MVP – Faza B |
| Readiness | **FULL PASS — PostgreSQL i full-stack browser CI zeleni** |
| Otvorene readiness stavke | **0** |

## Izvršni zaključak

Faza B implementira cijeli verzionirani OpenAPI ugovor i povezuje produkcijski frontend runtime sa stvarnim API-jem. Poslovni podaci više se ne učitavaju iz `localStoragea` niti se u produkcijskom toku mijenjaju demo funkcijama. Browser koristi `/api/v1`, sigurne sesijske kolačiće i podatke koje backend dohvaća iz PostgreSQL-a.

Isporučeni su:

- login, invitation accept, refresh rotacija, logout i `/me`;
- organizacija, odjeli, korisnici, radnici, smjene, blagdani i RFID lifecycle;
- terminal pairing, HMAC potpisani batch, idempotencija, heartbeat i sync timeline;
- radna evidencija, vlastiti prikaz, dashboard KPI-ji i scopeani drill-down podaci;
- godišnji fond, zahtjevi, odobravanje, odbijanje, poništavanje i privatno minimizirani zajednički kalendar;
- korekcije s optimistic concurrencyjem, zaključavanjem i append-only auditom;
- preview te CSV, XLSX i PDF izvještaji iz istog serverskog dataseta;
- API-only frontend adapteri i stvarni Chromium/PostgreSQL CI scenarij.

## PostgreSQL i multi-tenant model

Primjenjuje se shared-database/shared-schema model. Sve poslovne tablice nose `organization_id`; tenant relacije imaju složene `(organization_id, id)` strane ključeve. Svaki zahtjev otvara transakciju, postavlja provjereni tenant preko `SET LOCAL`, a `ENABLE` + `FORCE ROW LEVEL SECURITY` odbijaju tuđe retke.

Produkcijski runtime mora biti zasebna `NOSUPERUSER NOBYPASSRLS` uloga koja nije vlasnik tablica. Migrator je odvojena uloga. Integracijski test stvara stvarnu `NOBYPASSRLS` ulogu, dvije organizacije i negativno provjerava cross-tenant čitanje i pisanje.

| Domena | Autoritativne tablice | Ključno pravilo |
| --- | --- | --- |
| Tenant i organizacija | `organizations`, `departments` | tenant nikad ne dolazi iz bodyja/queryja |
| Identitet | `users`, `user_invitations`, `auth_sessions`, `user_department_scopes` | tokeni su hashirani; invitation token je jednokratan |
| Radnici i plan | `workers`, `shifts`, `holidays`, `rfid_cards` | povijesni entiteti se blokiraju, ne brišu |
| Evidencija | `attendance_events`, `attendance_days` | raw događaj je append-only, dan je izvedeni zapis |
| Odluke | `leave_requests`, `correction_requests` | revizija i odluka mijenjaju se atomski |
| Terminal | `terminals`, `terminal_credentials`, `terminal_request_nonces`, `terminal_sync_events` | HMAC, nonce, slijed i idempotencija |
| Izvještaji | `report_exports` | filtri, verzije, sadržaj, checksum i rok preuzimanja |
| Audit | `audit_events` | append-only before/after trag s `requestId` |

## RBAC i scope

| Resurs | Administrator | Voditelj | Radnik | Knjigovodstvo |
| --- | --- | --- | --- | --- |
| Organizacija, odjeli, korisnici | read/write | odjeli read | odjeli read | — |
| Radnici i smjene | read/write | dodijeljeni odjeli read | vlastiti profil + smjene read | — |
| Evidencija | organizacija read | dodijeljeni odjeli read | samo vlastita | — |
| Godišnji | organizacija + odluke | odluke u dodijeljenim odjelima | vlastiti create/read/cancel | samo odobreni, bez napomena |
| Korekcije | organizacija + odluke | odluke u dodijeljenim odjelima | vlastiti create/read/cancel | — |
| Izvještaji | create/read/download | vlastiti scope | — | create/read/download |
| Terminali | read/pair/revoke | read-only | — | — |
| Audit | read-only | — | — | — |

HTTP RBAC i SQL scope provjeravaju se neovisno. Skrivanje kontrole u frontendu nije sigurnosna granica.

## Autentikacija i sigurnost

- Argon2id lozinke; najmanje 12 znakova na HTTP ugovoru.
- 256-bitni opaque access/refresh tokeni; PostgreSQL čuva samo SHA-256 hash.
- Access 15 minuta, refresh 30 dana, jednokratna rotacija i detekcija reusea.
- `HttpOnly`, `SameSite=Strict`, produkcijski `Secure`; produkcija zahtijeva HTTPS.
- Unsafe browser mutacije zahtijevaju točan same-origin `Origin`.
- Login i invitation accept imaju rate limit i generičku poruku greške.
- Pozivnica vraća jednokratnu poveznicu u URL fragmentu; čisti token se ne sprema niti logira.
- RFID UID se normalizira i HMAC-SHA-256 hashira; raw UID se ne sprema.
- Terminalska vjerodajnica se prikazuje jednom, hashira i AES-256-GCM enkriptira u mirovanju.
- Terminalski zahtjev potpisuje method/path/body hash/timestamp/nonce; nonce je jednokratan.
- API i HTML navigacije imaju `no-store`; service worker izričito zaobilazi `/api/`.
- CSP, Permissions Policy, HSTS u produkciji i redakcija cookie/authorization logova su uključeni.

## Poslovna pravila

- Prijava/odjava koristi vremensku zonu organizacije i snapshot smjene.
- Dupli `deviceEventId` je idempotentan; niži ili ponovljeni slijed se odbija.
- Heartbeat ne pomiče ingest cursor i zato ne može preskočiti offline red.
- Odjava prije prijave i smjena dulja od 16 sati se odbijaju.
- Godišnji izostavlja vikende i tenant blagdane, sprečava preklapanje te rezervira pending + approved dane.
- Zajednički kalendar vraća samo ime i odobreno razdoblje godišnjeg, bez razloga i bolovanja.
- Korekcija nikada ne mijenja raw terminalski događaj; mijenja izvedeni dan i stvara audit.
- Izvoz iznad 100.000 redaka ne skraćuje se tiho nego traži uži filtar.
- CSV neutralizira spreadsheet formule; XLSX ima filter, zamrznuto zaglavlje i poslovni format; PDF ugrađuje font s hrvatskim znakovima.

## OpenAPI i frontend usklađenost

`backend/contracts/frontend-screen-api-map-v1.json` zaključava SHA-256 OpenAPI-ja i mapira svaki runtime ekran na operation ID-jeve. Contract test odbija:

- nedostajuću rutu ili operation ID;
- duplikat operation ID-ja;
- nepokriven ekran;
- promijenjeni OpenAPI bez ažuriranog hasha;
- status različit od `MVP_IMPLEMENTED`.

Frontend učitava prazno API stanje, pokušava obnoviti sesiju i zatim hidrira samo podatke dopuštene ulozi. Sve mutacije koriste API, `If-Match` reviziju i ponovno učitavanje autoritativnog stanja. Demo simulator i reset su u produkcijskom runtimeu onemogućeni.

## Migracije, backup i rollback

Migracije su numerirane, checksumirane, zaštićene advisory lockom i svaka se izvršava u vlastitoj transakciji. Objavljena migracija se ne prepisuje. Produkcijski rollback je aplikacijski rollback uz kompatibilnu forward migraciju; development down zahtijeva `BSS_ALLOW_DOWN_MIGRATIONS=true`.

Operativni minimum ostaje: managed PostgreSQL, enkripcija, PITR s ciljem RPO 15 minuta, dnevni logički backup, RTO četiri sata i periodični restore drill. Detalji su u `backend/OPERATIONS.md`.

## MVP granice, ne otvoreni readiness kvarovi

- Organizacija se kreira kontroliranim `bootstrap` korakom; tenant nema self-service hard delete.
- Raspored u MVP-u znači zadana smjena radnika. Rotacije, višenedjeljni roster i zamjene ostaju za MVP 2.0.
- Izvještajni artefakt se u MVP-u čuva u PostgreSQL-u 24 sata. Objektna pohrana i asinkroni queue su skaliranje za MVP 2.0.
- Pozivnica se generira i ručno dostavlja provjerenim kanalom; provider za e-mail nije dio ugovora.
- MFA, SSO, payroll, GPS, biometrika, kontrola vrata, ERP integracije i billing nisu dio MVP-a.
- PDF je poslovni PDF; PDF/A arhivska konverzija nije obećana ovim runtime ugovorom.

## Završni gate

| Provjera | Očekivanje |
| --- | --- |
| Frontend lint / unit / build | PASS |
| Backend TypeScript / OpenAPI / unit / contract / build | PASS |
| PostgreSQL migracije, RLS, auth i cijeli poslovni tok | PASS — `BSS backend quality gate` |
| CSV/XLSX/PDF struktura i checksum | PASS |
| Chromium desktop + mobile protiv stvarnog API-ja/PostgreSQL-a | PASS — `BSS quality gate` |
| Cloudflare preview | informativan samo za statički shell; Node API zahtijeva backend hosting |

Obje obvezne GitHub provjere zelene su na implementacijskom commitu `c04587c99902d03218897ee07cd84e537bdb8716`. Nema otvorenih ugovornih ni readiness stavki za Backend MVP Fazu B.

Ovaj dokument ne odobrava merge u `main` ni produkcijski deploy.
