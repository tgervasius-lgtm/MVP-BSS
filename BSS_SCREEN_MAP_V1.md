# BSS Screen Map v1.0

| Stavka | Vrijednost |
| --- | --- |
| Status | **FROZEN ZA FRONTEND v1.0.0** |
| Izvor | `src/views/registry.js`, navigacijska pravila u `app.js` i `bss-frontend-handoff-v1.json` |
| Broj registriranih ekrana | 17 |
| Uloge | administrator, voditelj, radnik, knjigovođa |
| Aplikacijski baseline | `91323c7cdbbbbf7b965c4926c94a11af6d31bf62` |

Ova mapa definira stabilne screen ID-eve koje backend integracija mora sačuvati. „Runtime” znači da ekran pripada stvarnoj budućoj aplikaciji, ali u Frontend v1.0.0 još koristi demo adapter. „Demo” znači da se ekran ne smije spojiti na službeni API bez nove odluke o opsegu.

| Screen ID | Hrvatski prikaz | Uloge | Način | Primarna backend domena | Freeze napomena |
| --- | --- | --- | --- | --- | --- |
| `home` | Početna | sve | runtime | dashboard sažetak i iznimke | najviše četiri klikabilna KPI-ja; bez tjednog grafa |
| `attendance` | Evidencija | admin, manager | runtime | attendance days, radnici, smjene | tablica je primarni prikaz; KPI otvara filtrirani popis |
| `mytime` | Moji sati | worker; admin demo pristup | runtime | vlastita evidencija i sažetak | kompaktni kružni sažetak; korekcija iz odabranog zapisa |
| `workers` | Radnici / Moj tim | admin, manager | runtime | radnici, odjeli, smjene, kartice | tablični popis u dopuštenom opsegu |
| `worker` | Detalj radnika | admin, manager | runtime detalj | radnik, evidencija, godišnji, RFID | stabilni tabovi Profil–Evidencija–Godišnji–Kartica |
| `shifts` | Smjene | admin, manager | runtime | smjene i dodjele | tablični pregled; voditelj nema admin mutacije |
| `requests` | Zahtjevi | admin, manager, worker | runtime | leave requests i odluke | radnik vidi vlastite; odluke samo u dopuštenom opsegu |
| `vacations` | Godišnji / Odsutnosti | sve | runtime | leave calendar, fond, blagdani | admin/voditelj godišnji pregled; radnik samo vlastite podatke |
| `sharedLeave` | Zajednički godišnji | sve | frontend demo | nema rute u odobrenom v1 API ugovoru | samo ime i odobreni godišnji; bez privatnih razloga/statusa |
| `corrections` | Korekcije | admin, manager, worker | runtime | correction requests | povijest i odluke; izvorni attendance događaj ostaje neizmjenjiv |
| `reports` | Izvještaji | admin, manager, accountant | runtime | report preview i exports | XLSX poslovni, CSV tehnički; server daje službeni dataset |
| `terminal` | Terminali | admin, manager | runtime | terminali, heartbeat, sync | voditelj čita; administratorske mutacije provjerava server |
| `terminalDemo` | RFID simulator | admin, manager u demo modu | demo only | nema službene domene | nikada u službeni API, audit ili produkcijske podatke |
| `flow` | Kako radi BSS | admin, manager u demo modu | demo only | statični sadržaj | prodajni prikaz, izvan poslovnog runtimea |
| `roles` | Prava pristupa | admin | runtime | korisnici, uloge i scope | frontend skrivanje nije sigurnosna granica |
| `audit` | Audit log | admin | runtime | append-only audit events | tablični pregled; nema frontend mutacije |
| `settings` | Postavke | admin | runtime | organizacija, odjeli, blagdani | sekcije Tvrtka–Odjeli–Radni kalendar–Sustav |

## Navigacijska pravila

- administrator vidi cijelu organizacijsku navigaciju i skrivene detaljne ekrane `worker` i `mytime`;
- voditelj vidi samo timske ekrane i radnike iz dodijeljenih odjela;
- radnik vidi Početnu, Moje sate, Moj godišnji, Zajednički godišnji, Moje zahtjeve i Moje korekcije;
- knjigovođa vidi Početnu, Izvještaje, Odsutnosti i privatno minimizirani Zajednički godišnji;
- `terminalDemo` i `flow` pojavljuju se samo administratoru/voditelju kada je uključen eksplicitni demo način;
- nedopušteni screen ID vraća korisnika na `home`, ali stvarni API mora neovisno vratiti `403` za zabranjeni resurs.

## Stabilnost ugovora

Backend integracija smije zamijeniti demo izvore podataka, ali ne smije preimenovati screen ID, proširiti ulogu, otkriti širi podatkovni opseg ili spojiti demo ekran na produkcijske podatke bez zasebne odluke i verzionirane izmjene ove mape.
