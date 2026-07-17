# BSS Backend MVP – Faza B Report

## Rezultat

Faza B implementira svih 54 operation ID-jeva OpenAPI-ja `1.1.0` i povezuje frontend na stvarni same-origin API. Produkcijski runtime započinje praznim stanjem, obnavlja sesiju preko `/me` i poslovne podatke čita/mijenja isključivo preko PostgreSQL-a.

| Prioritet | Isporuka |
| --- | --- |
| Autentikacija | login, invitation accept, refresh rotacija, logout, `/me` |
| Organizacija | kontrolirani bootstrap, read/update tenanta, odjeli i korisnici |
| Radnici | create/read/update, soft deactivate/activate, manager scope |
| RFID | assignment/block, HMAC UID, pair/revoke, batch check-in/out |
| Evidencija | scopeani popis, vlastiti prikaz, minute, saldo, statusi |
| Smjene | create/read/update i zadana smjena radnika |
| Godišnji | fond, create/read/approve/reject/cancel, zajednički kalendar |
| Korekcije | create/read/approve/reject/cancel, revizija i audit |
| Dashboard | najviše četiri role-scoped KPI-ja s drill-down filtrima |
| Izvještaji | preview, povijest, CSV/XLSX/PDF, checksum i download |
| Frontend | API adapter, role hydration, stvarne mutacije, bez local business statea |

## Dokazi kvalitete

- frontend: lint, 100 unit/regression testova i deterministički build;
- backend: TypeScript, Redocly OpenAPI, contract i security/unit testovi;
- PostgreSQL CI: svih sedam migracija, `NOBYPASSRLS`, cross-tenant zabrane i cijeli poslovni tok;
- reports: parsirani XLSX, PDF header/font, UTF-8 CSV i SHA-256;
- browser CI: desktop + mobile Chromium, stvarni login, svi admin ekrani, stvarni create-worker API/DB roundtrip i axe.

Lokalno okruženje bez PostgreSQL binarija ne glumi integracijski PASS; autoritativni rezultat daje obvezni GitHub PostgreSQL quality gate na točnom PR commitu.

## Namjerno izvan MVP-a

Višenedjeljni roster, self-service tenant lifecycle, e-mail provider, MFA/SSO, objektna pohrana/queue, payroll, GPS, biometrika, kontrola vrata, ERP i billing. Te stavke nisu potrebne da bi OpenAPI v1.1 i frozen frontend v1.0.0 bili funkcionalni.

## Merge i deploy

Grana se ne spaja automatski u `main`. Cloudflare Pages preview provjerava statički frontend artefakt, ali funkcionalni backend zahtijeva Node/Fastify + PostgreSQL hosting. Produkcija se ne dira bez zasebnog odobrenja.
