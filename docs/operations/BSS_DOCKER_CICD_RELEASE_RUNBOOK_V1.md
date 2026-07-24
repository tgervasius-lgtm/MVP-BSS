# BSS — Docker, CI/CD i release runbook V1

## Namjena

Ovaj runbook definira minimalni kontrolirani put od clean clonea do release kandidata. Ne odobrava produkcijski deploy i ne zamjenjuje hosting, KMS, WAF, monitoring ni PITR odluke.

## Lokalni razvoj

1. Koristiti Node verziju definiranu u `.nvmrc`.
2. Kopirati dokumentirane `.env.example` datoteke bez commita tajni.
3. Pokrenuti razvojni PostgreSQL kroz `compose.dev.yml`.
4. Instalirati frontend i backend ovisnosti zaključanim lockfileovima.
5. Izvršiti migracije.
6. Pokrenuti root quality gate prije otvaranja PR-a.

## CI redoslijed

Svaki PR mora izvršiti:

1. clean checkout
2. provjeru runtime verzije
3. locked dependency install
4. production dependency audit
5. lint i TypeScript
6. OpenAPI validaciju
7. unit/contract testove
8. PostgreSQL migracije i integracijske testove
9. frontend/backend build
10. E2E Chromium i accessibility smoke
11. upload testnih izvještaja kao artifact

P0 test se ne smije preskočiti. CI koji je zelen samo zato što je kritični test uvjetno isključen nije valjan release gate.

## Docker pravila

- Development i test baza moraju biti odvojene.
- Test baza mora biti efemerna i ne smije koristiti production podatke.
- Container ne smije raditi kao root kada to nije nužno.
- Tajne se ne ugrađuju u image niti se prosljeđuju kroz build argumente.
- Image mora biti reproducibilan i vezan uz commit SHA.
- Healthcheck mora provjeravati stvarnu spremnost aplikacije, ne samo otvoren port.
- Migracije se izvršavaju kao kontrolirani release korak, ne nekontrolirano pri svakom restartu svake replike.

## Release kandidat

Release kandidat mora sadržavati:

- commit SHA
- OpenAPI verziju
- migration head
- frontend i backend build artifact
- SBOM ili popis production ovisnosti
- testni izvještaj
- poznate rizike
- rollback proceduru

## Rollback

Rollback aplikacije i rollback baze nisu ista operacija. Prije migracije koja gubi podatke potreban je eksplicitan backup i odobrena rollback/forward-fix odluka. Down migracija ne smije se automatski pretpostaviti sigurnom.

## Produkcijski preduvjeti koji još nisu riješeni samim repozitorijem

- odabrani hosting i privatna mreža
- managed PostgreSQL s potvrđenim backupom i PITR-om
- centralizirano upravljanje tajnama/KMS
- WAF i shared rate limiting
- centralizirani logovi, metrike, tracing i alerting
- incident runbook i odgovorne osobe
- domain, TLS i DNS operativni model
- restore drill i load/soak test u okruženju sličnom produkciji

Bez ovih stavki sustav može biti kvalitetan release kandidat, ali nije operativno spreman za stvarne klijente.
