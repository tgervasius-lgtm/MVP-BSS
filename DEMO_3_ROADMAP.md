# BSS Demo 3.0 – kontrolirani razvojni plan

Demo 3.0 izrađuje se prije produkcijskog MVP-a i stvarnog backenda. Objavljeni Demo 2.0 služi kao stabilna baza. Svaki sprint ide kroz zasebnu granu, testove, GitHub PR i Netlify preview; `main` se ne mijenja bez izričitog odobrenja.

## Opseg koji ostaje obvezan

- evidencija radnog vremena
- RFID/NFC terminal i offline ponašanje
- radnici, kartice i smjene
- godišnji odmori i korekcije
- CSV/XLSX izvještaji
- prava pristupa i audit trag

Demo 3.0 ne uključuje skladište, ERP, GPS/geofencing, AI analitiku, payroll obračun, otvaranje vrata, inventar ni CRM.

## Sprintovi

| Sprint | Paket | Status |
| --- | --- | --- |
| 1 | Dashboard i navigacija | U izradi |
| 2 | Evidencija radnog vremena | Čeka |
| 3 | Godišnji odmori | Čeka |
| 4 | Izvještaji | Čeka |
| 5 | RFID terminal | Čeka |
| 6 | Postavke i administracija | Čeka |
| 7 | Dizajn i završno poliranje | Čeka |

## Sprint 1 – kriteriji prihvata

- Administrator odmah vidi prisutne, kašnjenja, odsutne, godišnji, bolovanja, otvorene odluke, prekovremene sate i zapise za provjeru.
- KPI-jevi se računaju iz istog skupa podataka kao evidencija i izvještaji; nema nepovezanih statičnih brojki.
- Dashboard prikazuje tjedni odnos prijava i odjava.
- Zadnje prijave i zadnje odjave prikazane su kao zasebni operativni događaji.
- Upozorenja vode na odgovarajući ekran za rješavanje.
- Navigacija je grupirana po poslovnom zadatku i prilagođena ulozi.
- Otvoreni zahtjevi i korekcije imaju vidljive brojače.
- Voditelj na dashboardu i dalje vidi samo dodijeljene odjele.
- Mobilna navigacija ostaje dostupna bez horizontalnog preljeva.
- Sve postojeće funkcije i svih 11 automatskih provjera moraju proći prije PR-a.

## Pravilo završetka sprinta

Sprint je dovršen tek kada su provedene strukturna, sadržajna i jezično-formatna provjera, automatski testovi, vizualna provjera desktopa i mobitela te Netlify deploy-preview. Produkcijski deploy nije dio automatskog završetka sprinta.
