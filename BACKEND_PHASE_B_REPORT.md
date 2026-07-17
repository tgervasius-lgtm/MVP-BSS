# BSS Backend MVP – Faza B Report

## Rezultat

Faza B implementira svih 54 operation ID-jeva OpenAPI-ja `1.1.0` i povezuje frontend na stvarni same-origin API. Produkcijski runtime započinje praznim stanjem, obnavlja sesiju preko `/me` i poslovne podatke čita/mijenja isključivo preko PostgreSQL-a.

Status: **FULL PASS**. Otvorene readiness stavke: **0**.

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

- frontend: lint, 104 unit/regression testa i deterministički build;
- backend: TypeScript, Redocly OpenAPI, contract i security/unit testovi;
- PostgreSQL CI: svih osam migracija, `NOBYPASSRLS`, cross-tenant zabrane i cijeli poslovni tok;
- reports: parsirani XLSX, PDF header/font, UTF-8 CSV i SHA-256;
- browser CI: desktop + mobile Chromium, stvarni login, svi admin ekrani, stvarni create-worker API/DB roundtrip i axe.

Lokalno okruženje bez PostgreSQL binarija ne glumi integracijski PASS; autoritativni rezultat daje obvezni GitHub PostgreSQL quality gate na točnom PR commitu.

Obvezni `BSS backend quality gate` i `BSS quality gate` završili su zeleno na implementacijskom commitu `c04587c99902d03218897ee07cd84e537bdb8716`.

Naknadni production-readiness hardening ne dodaje funkcije ni mijenja UX. Njegovi nalazi, ispravci i platformske obveze vode se u `BSS_PRODUCTION_READINESS_AUDIT.md` i zahtijevaju novi zeleni PR gate.

## Namjerno izvan MVP-a

Višenedjeljni roster, self-service tenant lifecycle, e-mail provider, MFA/SSO, objektna pohrana/queue, payroll, GPS, biometrika, kontrola vrata, ERP i billing. Te stavke nisu potrebne da bi OpenAPI v1.1 i frozen frontend v1.0.0 bili funkcionalni.

## Merge i deploy

Grana se ne spaja automatski u `main`. Cloudflare Pages preview provjerava statički frontend artefakt, ali funkcionalni backend zahtijeva Node/Fastify + PostgreSQL hosting. Produkcija se ne dira bez zasebnog odobrenja.
