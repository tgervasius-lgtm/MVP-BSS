# BSS Backend Readiness Report

| Stavka | Odluka |
| --- | --- |
| Datum pregleda | 13. 7. 2026. |
| Frontend ugovor | **FROZEN** `v1.0.0` / `frontend-v1.0.0` |
| OpenAPI | `openapi/bss-mvp-api-v1.yaml`, 33 putanje / 43 operacije |
| Presuda | **UVJETNI PASS ZA BACKEND MVP – FAZU A** |
| Implementirano u Fazi A | 22 ugovorne operacije, PostgreSQL model/migracije, auth, sesije, RBAC, organizacije, odjeli, korisnici, radnici, smjene, blagdani i blokiranje kartice |
| Frontend promjene | Nema |

## 1. Izvršni zaključak

Frontend v1.0.0 je dovoljan i stabilan ugovor za početak arhitekturnog temelja. Model podataka, tenant granica, četiri uloge, sigurnosna sesija, audit i migracijski postupak mogu se zaključati bez promjene UX/UI-ja. Zato je Faza A započeta odmah.

Presuda nije bezuvjetni prolaz za cijeli backend MVP. OpenAPI je i dalje označen kao `DRAFT_FOR_CONTRACT_REVIEW`, a šest skupina postojećih frontend potreba nije potpuno opisano. Te praznine ne blokiraju Fazu A, ali su obvezni contract gate prije odgovarajućih kasnijih faza. Nisu tiho pretvorene u nove funkcije niti je zamrznuti OpenAPI izmijenjen.

## 2. PostgreSQL model i relacije

Potvrđen je shared-database/shared-schema PostgreSQL 16 model. Svaka poslovna tablica ima `organization_id`; relacije koriste složene `(organization_id, id)` strane ključeve gdje god se spajaju tenant resursi. Time baza odbija povezivanje, primjerice, radnika iz tvrtke A sa smjenom tvrtke B.

| Domena | Tablice | Ključno pravilo |
| --- | --- | --- |
| Tenant | `organizations` | jedina tenant root tablica; nema klijentskog izbora tenant ID-a |
| Ljudi i raspored | `departments`, `shifts`, `workers`, `rfid_cards`, `holidays` | blokiranje umjesto hard deletea; smjena preko ponoći je valjana |
| Identitet | `users`, `user_department_scopes`, `user_invitations`, `auth_sessions` | uloga i scope dolaze iz sesije; tokeni su pohranjeni samo kao hash |
| Terminal | `terminals`, `terminal_credentials`, `attendance_events` | raw događaj je append-only; `(terminal_id, device_event_id)` je idempotency ključ |
| Evidencija | `attendance_days`, `attendance_month_locks` | izvedeni dan odvojen je od izvornog događaja; mjesec ima dataset verziju |
| Odluke | `leave_requests`, `correction_requests` | stanje i odluka ostaju povijesno dokazivi; nema izravnog uređivanja raw događaja |
| Izvještaji | `report_exports` | filtri, format, verzija dataseta/predloška, zbrojevi, storage key i SHA-256 |
| Trag | `audit_events` | append-only prije/poslije zapis s actorom i `requestId` |

Model je spreman za Fazu A. Relacije za kasnije faze postoje rano kako se identiteti i FK pravila ne bi naknadno mijenjali pod stvarnim podacima.

## 3. Multi-tenant arhitektura

Potvrđena je potpuna izolacija tvrtki u četiri sloja:

1. organizacija se izvodi iz provjerene sesije, nikada iz bodyja/queryja;
2. svaki repository poziv otvara transakciju i postavlja `SET LOCAL bss.organization_id`;
3. PostgreSQL `ENABLE` + `FORCE ROW LEVEL SECURITY` ograničava sve tenant tablice;
4. složeni tenant FK-ovi sprečavaju cross-tenant relacije i kada aplikacijski kod pogriješi.

Produkcijski runtime mora biti `NOSUPERUSER NOBYPASSRLS` i ne smije biti vlasnik tablica. Migracijska/owner uloga je odvojena. CI test stvara baš takvu runtime ulogu te provjerava da čitanje vidi samo jedan tenant, a cross-tenant insert pada.

## 4. RBAC

| Resurs/radnja | Administrator | Voditelj | Radnik | Knjigovodstvo |
| --- | --- | --- | --- | --- |
| Organizacija, odjeli, korisnici | puni pristup | samo čitanje dodijeljenih odjela | nema | nema |
| Radnici i smjene | puni pristup | čitanje dodijeljenih odjela | samo vlastiti podaci kroz osobne rute | nema |
| Zahtjevi/korekcije | cijela tvrtka | odluke samo za dodijeljene odjele | vlastiti create/cancel/read | nema |
| Izvještaji | create/read/download | operativni scope | nema | create/read/download, bez poslovnih mutacija |
| Terminali | read/pair/revoke | read-only | nema | nema |
| Audit | read-only pregled | nema | nema | nema |

RBAC se provodi u HTTP policyju i ponovno u scoped SQL upitu. Frontend skrivanje gumba ostaje isključivo UX pomoć.

## 5. Autentikacija, sesije i sigurnost

- Argon2id (`64 MiB`, tri prolaza, paralelizam 1) za lozinke.
- Kriptografski slučajni 256-bitni opaque access i refresh tokeni; baza čuva samo SHA-256 hash.
- Access TTL 15 minuta, refresh TTL 30 dana; refresh se jednokratno rotira.
- Ponovna uporaba već rotiranog refresh tokena opoziva aktivne sesije korisnika.
- `bss_session` i `bss_refresh` su `HttpOnly`, `SameSite=Strict`, a u produkciji obvezno `Secure` uz HTTPS.
- Unsafe session zahtjev mora imati točan same-origin `Origin`; CORS nije otvoren.
- Login ima rate limit i jedinstvenu sigurnu poruku koja ne otkriva postoji li račun.
- Privatni API odgovori imaju `Cache-Control: no-store, private`; cookie/token zaglavlja su redaktirana iz logova.
- `If-Match`/revision sprječava izgubljene konkurentne promjene.

Zamrznuti `LoginRequest` nema tenant selektor. MVP zato zahtijeva globalno jedinstven normalizirani login e-mail. Više računa iste osobe u više organizacija ostaje za MVP 2.0 ili verzionirani login ugovor.

MFA za administratore ostaje obvezni production-hardening gate prije šire produkcije; nije dodan u Fazu A jer nije u postojećem OpenAPI/UX ugovoru.

## 6. Audit i korekcije

`attendance_events` i `audit_events` imaju database trigger koji odbija `UPDATE` i `DELETE`. Korekcija nikad ne prepisuje izvorni terminalski događaj. U kasnijoj Fazi B/C odobrenje korekcije mora u jednoj transakciji:

1. zaključati zahtjev i `attendance_day`;
2. provjeriti `pending` stanje, tenant, ulogu, odjel i reviziju;
3. spremiti stare i tražene vrijednosti;
4. ažurirati samo izvedeni `attendance_day` i označiti ga `corrected`;
5. zaključiti zahtjev;
6. dodati audit `before/after` s istim `requestId`;
7. commitati sve ili ništa.

Nakon mjesečnog locka korekcija zahtijeva eksplicitni reopen/ovlašteni postupak koji treba zaključati prije implementacije B3; izravni edit ostaje zabranjen.

## 7. Migracije, backup i rollback

Migracije su numerirane, checksumirane, zaključane PostgreSQL advisory lockom i svaka radi u zasebnoj transakciji. Primijenjena datoteka ne smije se mijenjati. Produkcija koristi forward-only expand/migrate/contract; `down` je blokiran bez eksplicitne non-production varijable.

Pilot strategija: managed PostgreSQL, šifrirani PITR, RPO 15 minuta, dnevni odvojeni logički backup, cilj RTO četiri sata i dokumentirani restore drill. Detalji su u `backend/OPERATIONS.md`.

## 8. OpenAPI prema svih 17 ekrana

Pregledano je svih 17 registriranih ekrana. Četrnaest je runtime, a `sharedLeave`, `terminalDemo` i `flow` ostaju izvan produkcijskog API-ja. Strojna matrica je `backend/contracts/frontend-screen-api-map-v1.json`.

| Rezultat | Ekrani |
| --- | --- |
| Pokriveni postojećim operacijama | `attendance`, `mytime`, `shifts`, `corrections`, `audit` |
| Sastavljivi uz zaključavanje server agregacije | `home` |
| Djelomični ugovor – treba verzionirani contract dodatak | `workers`, `worker`, `requests`, `vacations`, `reports`, `terminal`, `roles`, `settings` |
| Namjerno bez produkcijskog API-ja | `sharedLeave`, `terminalDemo`, `flow` |

Otvorene ugovorne praznine:

- RFID read/assign; nacrt ima samo block;
- leave balance, konflikt i department-capacity sažeci;
- report preview iz istog dataseta kao izvoz;
- terminal sync-event read model;
- prihvat pozivnice/postavljanje lozinke i adapter dostave;
- update/block odjela i eksplicitna aggregate revizija kalendara blagdana;
- konačna HMAC ili mTLS odluka za `deviceSignature` prije B5.

Faza A implementira postojeće operacije bez izmjene OpenAPI datoteke. `PUT /holidays` privremeno koristi reviziju organizacije kao aggregate `If-Match`; to mora biti eksplicitno zapisano pri sljedećoj verziji ugovora.

## 9. MVP i MVP 2.0

### Ulazi u MVP

- četiri zaključane uloge i potpuna tenant/department/self izolacija;
- organizacije, odjeli, radnici, korisnici, smjene, blagdani i RFID;
- sigurne sesije;
- terminal pairing/batch/heartbeat i offline idempotencija;
- attendance days, godišnji, korekcije, audit;
- CSV/XLSX službeni izvještaji;
- backup, restore test, logovi i minimalne metrike.

### Ostaje za MVP 2.0 ili zasebno odobrenje

- zajednički kalendar godišnjih iz Scope v1.1;
- PDF/PDF-A poslovni izvoz;
- MFA UX i administracija (sigurnosni gate može biti uveden infrastrukturno prije produkcije);
- jedan identitet u više organizacija/tenant selector;
- payroll, GPS/geofencing, biometrika, kontrola vrata, ERP/CRM, native aplikacije, billing i ostale FROZEN iznimke.

## 10. Readiness gate za nastavak

Faza A može ići na pregled sada. Prije B2/B3/B4/B5 treba odobriti samo ugovorne dodatke relevantne toj fazi. Nema dozvole za merge u `main`, produkcijski deploy, stvarne osobne podatke ili frontend redizajn bez zasebnog odobrenja.
