# BSS Refactor v1

| Stavka | Vrijednost |
| --- | --- |
| Status | U izradi |
| Početak | 12.07.2026. |
| Osnova | `agent/bss-technical-audit-scope-freeze-v1` |
| Pravilo | Isti izgled, funkcije, podaci i opseg kao Demo 3.0 |
| Produkcija | Ne mijenja se bez odobrenja Product Ownera |

## Cilj

Razdvojiti monolitni frontend u testabilnu domenu, politike, adaptere i prikaze prije priključivanja stvarnog API-ja. Refactor ne dodaje module i ne mijenja zaključana poslovna pravila iz `BSS_MVP_SCOPE_FREEZE_V1.md`.

## Radni paketi

| Paket | Sadržaj | Status |
| --- | --- | --- |
| R1 | Stabilni ugovori, vrijeme i RBAC/scope politike | Dovršeno u ovoj grani |
| R2 | Adapteri za pohranu, sat, ID i demo podatke | Sljedeće |
| R3 | Use-case funkcije za evidenciju, godišnje i korekcije | Čeka |
| R4 | Prikazi po ekranima i uklanjanje inline handlera | Čeka |
| R5 | CSS slojevi i uklanjanje legacy aliasa | Čeka |
| R6 | Build, lint, browser E2E, axe i Cloudflare sigurnosna ograda | Čeka |

## R1 – izdvojena jezgra

- `src/domain/contracts.js` je jedino mjesto za stabilne uloge i domenske statuse koje R1 koristi.
- `src/domain/time.js` sadrži čiste izračune vremena, noćne smjene, minute evidencije, radne dane i preklapanja.
- `src/policies/access.js` sadrži čiste odluke o vidljivosti radnika i entiteta te ovlastima po ulozi.
- `app.js` zadržava kompatibilne funkcije, ali delegira tim modulima.
- Moduli se učitavaju prije aplikacije i dio su PWA predmemorije.
- Izravni testovi jezgre i postojeća regresija moraju prolaziti zajedno.

## Kompatibilnost

R1 namjerno zadržava hrvatske demo oznake statusa i postojeći javni API funkcija jer HTML još koristi inline događaje. Stabilni engleski API kodovi iz `bss-mvp-scope-v1.json` postaju transportni ugovor u backend fazi; mapiranje oznaka bit će jedan od sljedećih use-case adaptera.

## Kriterij prolaza R1

- četiri uloge vide isti opseg kao prije;
- noćne smjene, aktivni zapisi, pauze, blagdani i preklapanja daju isti rezultat;
- svi postojeći testovi prolaze;
- novi moduli imaju izravne testove;
- nema promjene izgleda ni produkcijske objave;
- Cloudflare branch preview učitava nove module i radi iza postojeće Access politike.
