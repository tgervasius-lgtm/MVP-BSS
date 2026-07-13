# BSS Frontend Release v1.0.0

| Stavka | Vrijednost |
| --- | --- |
| Status | **FRONTEND FROZEN — SPREMAN ZA BACKEND CONTRACT REVIEW** |
| Release | `v1.0.0` |
| Git tag | `frontend-v1.0.0` |
| Postojeća package/demo oznaka | `3.0.0` ostaje interna oznaka demonstratora; službeni freeze identificira Git tag |
| Datum freezea | 13.07.2026. |
| Provjereni aplikacijski baseline | `main` na `91323c7cdbbbbf7b965c4926c94a11af6d31bf62` |
| Produkcija | `https://mvp-bss.pages.dev/` |
| Sljedeći korak | Backend Contract Review; backend implementacija još nije započeta |

## 1. Svrha releasea

Ovaj release zaključava BSS frontend demonstrator kao stabilnu referencu za predaju backend programeru. Release ne uvodi nove funkcije, ne mijenja UX/UI i ne sadrži backend implementaciju. Aplikacijski kod ostaje jednak provjerenom produkcijskom baselineu `91323c7`; promjene u freeze paketu ograničene su na release i handoff dokumentaciju te njihove automatske provjere.

Frontend je referentni prikaz korisničkih tokova, uloga, statusa, tablica, filtara, odobravanja, izvještaja i RFID/NFC terminalskog toka. Poslovni podaci u ovoj verziji su demonstracijski i nisu serverski autoritet.

## 2. Zaključane funkcije frontenda

### Zajedničko

- četiri demonstracijske uloge: administrator, voditelj, radnik i knjigovođa;
- 17 registriranih ekrana s kontrolom vidljivosti po ulozi;
- svijetla i tamna tema te responzivan desktop i mobilni prikaz;
- pristupačne kontrole, tipkovnička navigacija, vidljiv fokus i tekstualni statusi;
- PWA app shell s offline fallbackom za statičke resurse;
- Service Worker cache `bss-refactor-v1-r7`, network-first navigacija i automatsko uklanjanje starih cacheva;
- svi vidljivi KPI-jevi, statusni sažeci i brojčane kartice vode na odgovarajući detalj ili filtrirani popis.

### Evidencija i radnici

- početni pregled s najviše četiri ključna, klikabilna KPI-ja;
- tablična evidencija radnog vremena s filtrima za operativne iznimke;
- radnikov kompaktni mjesečni sažetak odrađenih i planiranih sati, salda i zapisa za provjeru;
- popis radnika, detalj radnika, smjene i RFID kartice u granicama demonstracijske uloge;
- zahtjevi za korekciju s pregledom izvornog i predloženog zapisa te demonstracijskom odlukom.

### Godišnji i zahtjevi

- zahtjevi za godišnji/slobodni dan, statusi i demonstracijski tijek odobravanja ili odbijanja;
- administratorski i voditeljski godišnji kalendar za cijelu godinu;
- radnik vidi samo vlastiti godišnji, fond i odobrena razdoblja;
- kompaktni kružni prikaz iskorištenog, planiranog i raspoloživog fonda;
- zajednički kalendar prikazuje samo ime zaposlenika i odobreni godišnji u demonstracijskom opsegu tim–odjel–organizacija;
- zajednički kalendar ne prikazuje bolovanje, razlog, napomenu ni druge privatne podatke.

### Izvještaji, upravljanje i terminal

- izvještaji s filtrima, tabličnim pregledom i zaključanim katalogom vrsta;
- XLSX kao glavni poslovni demonstracijski izvoz, CSV kao tehnički izvoz;
- terminalski pregled, sinkronizacijski događaji i odvojeni RFID simulator u demo modu;
- tablični pregled prava pristupa, audit zapisa i administrativnih postavki;
- Design System v1.0 i Brand Book v1.0 dostupni su kao zasebni živi vodiči.

Detaljna mapa ekrana i uloga nalazi se u `BSS_SCREEN_MAP_V1.md` i `bss-frontend-handoff-v1.json`.

## 3. Ograničenja releasea

- nema stvarnog login/session sustava, API-ja, baze podataka ni serverskog RBAC-a;
- demonstracijska promjena uloge nije sigurnosna kontrola;
- demo stanje i seed podaci žive u pregledniku i ne smiju se koristiti kao službena evidencija;
- frontend izračuni sati, fonda, blagdana i salda služe demonstraciji; službene vrijednosti mora vratiti server;
- odobravanja, korekcije i audit u demonstratoru nisu transakcijski ni append-only serverski zapisi;
- frontend XLSX/CSV potvrđuju format i UX, ali nisu službeni obračunski dokumenti;
- PDF/PDF-A izvoz nije dio FROZEN MVP ugovora; ostaje odluka Scopea v1.1;
- zajednički godišnji je frontend demonstracija i nema backend rutu;
- `terminalDemo` i `flow` su prodajni demo alati i ne smiju se spojiti na službeni API ili audit;
- PWA offline podrška obuhvaća app shell; poslovne web mutacije ne smiju glumiti uspjeh bez servera;
- frontend nije payroll, ERP, CRM, GPS, biometrija, kontrola vrata, skladište ni native mobilna aplikacija;
- službeno je automatizirano Chromium desktop/mobilno testiranje; Safari i Firefox ostaju za pilot compatibility provjeru.

## 4. Stavke koje preuzima backend

Backend rad započinje contract reviewom, ne izravnom implementacijom nasumičnih endpointa.

1. Zaključati OpenAPI nacrt: error envelope, paginaciju, revizije/ETag, datume, vrijeme i timezone.
2. Implementirati identitet, session cookie, organizacijski tenant, uloge i opseg odjela.
3. Uvesti PostgreSQL modele, migracije, seed samo za razvoj i serverske validacije.
4. Postaviti server kao jedini autoritet za radnike, smjene, RFID kartice, evidenciju, fond godišnjeg, zahtjeve i korekcije.
5. Osigurati atomska odobravanja, zaštitu od zastarjele revizije i append-only audit.
6. Implementirati službene tablične datasete i privatne CSV/XLSX izvoze s checksumom i kratkotrajnim download URL-om.
7. Implementirati terminalski identitet, idempotentni batch, heartbeat, offline red, rotaciju tajne i zaštitu od ponovnog slanja.
8. Dodati tenant/scope negativne testove, observability, sigurnosne headere za privatni API i politiku retencije.
9. Spojiti frontend preko postojećih adaptera, use-caseova i stabilnih screen ID-eva, vertikalno ekran po ekran.
10. Tijekom API integracije implementirati `loading`, `empty`, `error`, `forbidden` i `stale` mrežna stanja bez promjene zaključane poslovne logike.

## 5. Službeni handoff paket

| Dokument | Uloga u predaji |
| --- | --- |
| `BSS_BACKEND_HANDOFF_V1.md` | arhitektura, vlasništvo podataka, redoslijed backend integracije i sigurnosne blokade |
| `openapi/bss-mvp-api-v1.yaml` | nacrt API ugovora: 33 putanje i 43 operacije, bez backend implementacije |
| `BSS_REPORTING_PROFILE_V1.md` | poslovni format XLSX/CSV, metapodaci, zbrojevi i kontrolne provjere |
| `BSS_DESIGN_SYSTEM_V1.md` | zaključani tokeni, komponente, responsive i accessibility ugovor |
| `BSS_SCREEN_MAP_V1.md` | ljudski čitljiva mapa 17 ekrana, uloga, načina rada i backend domena |
| `bss-frontend-handoff-v1.json` | strojno čitljiva mapa ekrana, autoriteta, izvoza i isključenog opsega |
| `BSS_MVP_SCOPE_FREEZE_V1.md` | zaključani poslovni opseg i eksplicitna isključenja |
| `BSS_SHARED_LEAVE_CALENDAR_SCOPE_V1_1.md` | privatnosna granica frontend demonstracije zajedničkog godišnjeg |

## 6. Quality gate

Release kandidat mora proći:

```bash
npm ci
npm run lint
npm test
npm run build
npm run test:e2e
```

Obvezni rezultat je nula lint grešaka, svi unit/integration/dokumentacijski testovi zeleni, deterministički Cloudflare Pages build i svi desktop/mobilni Chromium + axe scenariji zeleni.

## 7. Freeze pravila

Nakon taga `frontend-v1.0.0`:

- nema novih frontend funkcija bez nove odluke o opsegu;
- nema UX/UI redizajna u backend integracijskom PR-u;
- backend ugovor se mijenja kroz contract review i verzionirani OpenAPI diff;
- demonstracijski alati ostaju fizički i podatkovno odvojeni od stvarnog runtimea;
- hitni frontend popravak mora biti malen, imati regresijski test i novu patch verziju;
- `main` i produkcija mijenjaju se isključivo kroz pregledani PR i zeleni quality gate.

## 8. Release odluka

`frontend-v1.0.0` označava stabilan frontend demonstrator i službenu referencu za backend programera. Ne označava dovršen backend ni produkcijski sustav za stvarne osobne podatke. Prvi sljedeći razvojni korak je Backend Contract Review nad dokumentima iz ovog paketa.
