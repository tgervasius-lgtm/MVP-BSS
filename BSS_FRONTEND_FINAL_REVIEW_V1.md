# BSS završni pregled frontenda v1.0

| Stavka | Vrijednost |
| --- | --- |
| Status | **PROVEDENO — FRONTEND FREEZE v1.0.0 CANDIDATE** |
| Datum završne provjere | 13.07.2026. |
| Aplikacijski baseline | `main` na `91323c7cdbbbbf7b965c4926c94a11af6d31bf62` |
| Obuhvat | 17 registriranih ekrana, četiri uloge, desktop i mobilni quality gate |
| Pravilo | Preglednost ispred kompleksnosti; tablica prije grafa; bez tihog širenja MVP-a |
| Backend | Nije implementiran niti pokrenut u ovom paketu |

## 1. Završni zaključak

Odobreni UX/UI Cleanup v1.1, KPI drill-downovi, zajednički godišnji kao privatno minimizirana frontend demonstracija i cache invalidation hotfix spojeni su u `main`. Frontend više nema otvorenu P0 ili P1 UX/UI stavku koja blokira predaju backend programeru.

Završno stanje:

1. početni dashboard administratora i voditelja ima najviše četiri klikabilna KPI-ja;
2. tjedni i dekorativni grafovi uklonjeni su; ostali su samo kompaktni kružni sažeci mjesečnih sati i godišnjeg fonda;
3. radnici, smjene, zahtjevi, terminali, prava i audit prvenstveno koriste tablične prikaze;
4. radnikova Početna i Moji sati više ne ponavljaju isti mjesečni sažetak;
5. administratorov cjelogodišnji kalendar ostaje, uz kompaktnije tablične sažetke;
6. izvještaji koriste filtre, tablični pregled, XLSX kao poslovni i CSV kao tehnički izlaz;
7. vidljivi KPI, broj ili status koji predstavlja skup podataka vodi na detalj ili filtrirani pregled;
8. Service Worker navigaciju dohvaća network-first/no-cache i uklanja stare app-shell cacheve;
9. nije dodana backend funkcija niti je promijenjen backend ugovor.

## 2. Zaključana BSS pravila prikaza

- svaki ekran ima jednu primarnu poslovnu svrhu;
- najviše četiri primarna KPI-ja na početnom ekranu;
- graf se koristi samo kada odnos čini bržim za razumjeti;
- operativni popisi na desktopu su tablice, a na mobitelu kompaktni retci ili kontrolirano pomične tablice;
- kartica grupira upozorenje, odluku ili sažetak i nije zamjena za svaki red podataka;
- radnik vidi samo sebe, voditelj dodijeljene odjele, knjigovođa odobrene izvještajne podatke, a administrator organizaciju;
- hrvatska oznaka je prikaz, dok API i pohrana koriste stabilne engleske kodove;
- aktivne, nepotpune i neslužbene vrijednosti odvojene su od zaključanih obračunskih vrijednosti;
- CSV, XLSX i svaki naknadno odobreni PDF moraju nastati iz istog serverskog, verzioniranog dataseta;
- demo alati nikada nisu dio produkcijske navigacije ni službenog poslovnog zapisa.

## 3. Freeze stanje po ekranima

| Ekran | Završno stanje | Freeze odluka |
| --- | --- | --- |
| `home` | najviše četiri KPI-ja, bez tjednog grafa | KPI-jevi otvaraju prisutne, zapise za provjeru, današnje odsutne i zahtjeve na čekanju |
| `attendance` | sažetak + središnja tablica | statusni sažeci služe kao filtri; nema paralelnog kartičnog popisa |
| `mytime` | jedan kompaktni kružni mjesečni sažetak + osobna tablica | saldo, odrađeno/planirano i oznaka za provjeru bez dupliciranih KPI kartica |
| `workers` | tablični popis i kompaktni mobilni redci | stabilan detalj radnika ostaje zaseban ekran |
| `worker` | tabovi Profil, Evidencija, Godišnji i Kartica | admin uređuje; voditelj čita samo dopušteni opseg |
| `shifts` | tablični pregled | voditelj nema administratorske mutacije |
| `requests` | filtrirana tablica i kontrolirani obrazac | radnik vidi vlastite, admin/voditelj odlučuju samo u opsegu |
| `vacations` | cjelogodišnji admin/voditelj pogled i osobni radnički pogled | fond i dodatni sažeci ostaju kompaktni; radnik nema tuđe podatke |
| `sharedLeave` | frontend demonstracija za sve uloge | samo ime i odobreno razdoblje; bez bolovanja, razloga, napomena i API rute |
| `corrections` | tablica povijesti i odluka | nova korekcija polazi iz konkretnog attendance zapisa |
| `reports` | filtri, tabovi, tablični preview i povijest izvoza | XLSX primarni poslovni, CSV tehnički; PDF izvan v1 opsega |
| `terminal` | tablica terminala i sinkronizacijskih događaja | kartica samo za stvarnu iznimku; voditelj read-only |
| `roles` | tablice korisnika i matrice prava | poziv/izmjena u kontroliranom dijalogu; nema brojčanih ukrasa |
| `audit` | tablica Vrijeme–Akter–Radnja–Modul–Entitet–Rezultat | detalj je nepromjenjiv; službeni append-only zapis preuzima backend |
| `settings` | sekcije Tvrtka–Odjeli–Radni kalendar–Sustav | bez dekorativnih readiness KPI-ja |
| `terminalDemo`, `flow` | vidljivi samo adminu/voditelju u demo modu | nikada se ne spajaju na službeni API, audit ni pilot podatke |

Potpuna navigacijska i uloga-matrica nalazi se u `BSS_SCREEN_MAP_V1.md`.

## 4. Granice prije backend rada

Frontend je frozen, ali sljedeće odluke pripadaju Backend Contract Reviewu:

- potvrda error envelopea, paginacije, revizija i vremenskih formata;
- serversko izvođenje organizacije, uloge i odjela iz provjerene sesije;
- jedinstveni dataset za ekran, CSV i XLSX;
- session/BFF, hosting, PostgreSQL, queue, privatna pohrana, terminalski identitet i retencija;
- PDF/PDF-A i produkcijski zajednički godišnji ostaju Scope v1.1 odluke.

`loading`, `empty`, `error`, `forbidden` i `stale` mrežna stanja smiju se implementirati tijekom API spajanja koristeći postojeći Design System. To nisu nove poslovne funkcije i ne smiju promijeniti zaključani tijek ili opseg podataka.

## 5. Quality gate za freeze

Freeze je prihvatljiv samo kada:

1. lint prolazi bez greške;
2. svi unit, integration, DOM, dokumentacijski i Service Worker testovi prolaze;
3. build reproducibilno proizvodi Cloudflare Pages `dist/` paket;
4. svi desktop i mobilni Chromium scenariji prolaze bez nedopuštenog overflowa;
5. ključni runtime, Design System i Brand Book nemaju ozbiljne axe povrede;
6. OpenAPI se parsira i sadrži zaključanih 33 putanje i 43 operacije;
7. release dokument, handoff manifest i Screen Map navode isti baseline, 17 ekrana i četiri uloge.

## 6. Odluka za predaju

BSS Frontend v1.0.0 spreman je za backend programera na razini stabilnog UX/UI demonstratora, ugovora i strukture. Službeni paket čine `BSS_FRONTEND_RELEASE_V1.md`, `BSS_BACKEND_HANDOFF_V1.md`, `BSS_SCREEN_MAP_V1.md`, `BSS_REPORTING_PROFILE_V1.md`, `BSS_DESIGN_SYSTEM_V1.md`, `bss-frontend-handoff-v1.json` i `openapi/bss-mvp-api-v1.yaml`.

Prvi sljedeći razvojni korak je Backend Contract Review. Ovaj freeze ne predstavlja dovršen backend ni odobrenje za stvarne osobne podatke.
