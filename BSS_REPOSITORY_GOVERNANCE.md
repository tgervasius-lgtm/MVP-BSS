# BSS Repository Governance

Ovaj dokument definira minimalna pravila pod kojima drugi developer može sigurno nastaviti BSS MVP. Pravila vrijede za svaku promjenu, uključujući hitne ispravke i promjene ovisnosti. Zeleni CI nije zamjena za poslovni review, ali crveni ili preskočeni gate uvijek blokira merge.

## Jednokratne GitHub postavke vlasnika

Za `main` treba uključiti branch ruleset ili branch protection sa sljedećim pravilima:

1. promjene ulaze samo kroz pull request;
2. najmanje jedno odobrenje osobe koja nije autor promjene;
3. novi commit poništava prethodno odobrenje;
4. svi review razgovori moraju biti riješeni;
5. grana mora biti ažurna s ciljnom granom prije mergea;
6. obvezni su statusi `BSS quality gate / quality`, `BSS CodeQL security gate / JavaScript and TypeScript security analysis`, `BSS secret scan / gitleaks` i `BSS dependency review / dependency-review`;
7. zabranjeni su force push i brisanje `main` grane;
8. pravila vrijede i za administratore; iznimka mora biti vremenski ograničena i evidentirana;
9. dopušten je samo squash merge kako bi jedna poslovna promjena ostala jedan reverzibilan commit.

U postavkama sigurnosti repozitorija treba uključiti Dependabot alerts i security updates, code-scanning rezultate za repozitorijski CodeQL workflow, secret scanning i push protection. Ne uključivati paralelni CodeQL default setup uz postojeći napredni workflow. Workflowi u repozitoriju daju provjeru na PR-u; GitHub postavka ih pretvara u kontrolu koju nije moguće slučajno zaobići.

Nazive statusa potvrditi u GitHub sučelju nakon prvog izvršavanja workflowa i tek tada ih označiti obveznima. Path-filtered `BSS backend quality gate / quality` ostaje dodatna ciljana provjera i ne postavlja se kao obvezni status jer se na PR-u bez backend promjene namjerno ne pokreće.

## Pravilo za svaku promjenu

- Jedan PR rješava jedan poslovni cilj i ne sadrži usputni veliki refaktor.
- Autor ispunjava repozitorijski PR predložak, uključujući opseg, rizik, rollback i dokaz.
- Promjena javnog ponašanja prvo ažurira OpenAPI i pripadajuće contract testove.
- Promjena tenant podataka mora imati negativni RBAC i cross-tenant dokaz.
- Migracija se nikad ne prepravlja nakon primjene; dodaje se novi numerirani `up/down` par, RLS/constrainti i najmanji runtime grantovi.
- Tajne, `.env`, produkcijski podaci i osobni podaci ne ulaze u repozitorij, test fixture ni CI log.
- Veliki postojeći moduli smiju se samo smanjivati. Nova logika ide u manji domenski modul iza postojećeg ugovora.
- Merge nije dopušten dok svi obvezni statusi nisu zeleni na točnom odobrenom commitu.
- Produkcijski deploy je zasebna odluka i zahtijeva operativni checklist, backup/restore dokaz i plan povrata.

## Minimalni dokaz prije reviewa

```bash
npm ci
npm --prefix backend ci
npm run check
npm audit --audit-level=high
npm --prefix backend audit --audit-level=high
```

Stvarni PostgreSQL integracijski test i full-stack Chromium/axe test moraju proći u GitHub CI-ju. Lokalno preskočen PostgreSQL test nije prolaz. Za promjenu koja utječe na UI autor prilaže scenarij ili snimku, a za migraciju dokaz clean-base i upgrade-base izvršavanja.

## Vlasništvo i iznimke

Vlasnik proizvoda odobrava poslovni opseg i produkcijski rollout. Reviewer odobrava kod, testove, sigurnosni i operativni utjecaj. Autor ne odobrava vlastiti PR.

Ako je iznimka stvarno nužna, u PR-u mora pisati koji se gate zaobilazi, zašto, tko je odobrio, koliko dugo iznimka vrijedi i koji issue vraća kontrolu. Sigurnosni, tenant/RBAC, migracijski i secret-scan gateovi nemaju tihu iznimku.
