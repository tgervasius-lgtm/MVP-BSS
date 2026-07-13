# BSS završni pregled frontenda v1.0

| Stavka | Vrijednost |
| --- | --- |
| Status | **SPREMAN ZA ODLUKU PRODUCT OWNERA** |
| Datum pregleda | 13.07.2026. |
| Polazna verzija | `main` na `ec4b92c` (spojeni Refactor v1 R6) |
| Obuhvat | 17 registriranih ekrana, četiri uloge, desktop i mobilni quality gate |
| Pravilo | Preglednost ispred kompleksnosti; tablica prije grafa; bez tihog širenja MVP-a |
| Backend | Nije implementiran niti pokrenut u ovom paketu |

## 1. Zaključak

Frontend je funkcionalno dovoljno potpun za predaju backend programeru. Završni pregled nije pronašao potrebu za novim modulom. Najveći UX dug je prevelik broj kartica i paralelnih sažetaka na nekoliko ekrana, dok su najvrjedniji dijelovi već dobro postavljene tablice, jasne uloge, godišnji pregled i kontrolirani tijek odobravanja.

Preporuka je:

1. ne dodavati nove funkcije prije pilota;
2. svesti operativne početne ekrane na četiri ključne brojke i jednu tablicu iznimaka;
3. ukloniti tjedni graf i ne uvoditi dekorativne grafove; kompaktni kružni prikaz dopušten je samo za mjesečne sate i godišnji fond;
4. zadržati cjelogodišnji kalendar administratora, ali njegove dodatne sažetke pretvoriti u kompaktne tablice ili odvojene prikaze;
5. izvještaje oblikovati kao provjerljiv tablični rezultat s primarnim XLSX izlazom; PDF je opravdan prijedlog, ali zahtijeva izričitu izmjenu zaključanog opsega;
6. backend spojiti preko postojećih adaptera i use-case granica, bez izravnog vezanja DOM-a na HTTP pozive.

## 2. Kako je pregled napravljen

- inventarizirani su svi ekrani iz `src/views/registry.js` i sve uloge iz navigacijskih pravila;
- svaki dopušteni ekran renderiran je za administratora, voditelja, radnika i knjigovođu;
- provjereni su naslovi, kartice, KPI sažeci, tablice, grafovi, obrasci i akcije;
- u stvarnom pregledniku pregledani su najgušći tokovi: administratorska evidencija, izvještaji, godišnji pregled te radnikova početna i osobna evidencija;
- postojeći R6 quality gate pokriva sve dopuštene ekrane u desktop Chromiumu i mobilnom iPhone 13 prikazu, horizontalni overflow, uloge, teme i ozbiljne axe povrede.

Ovo je pregled arhitekture informacija i spremnosti za backend, a ne redizajn. U ovom paketu namjerno nema promjene ponašanja aplikacije.

## 3. Zaključana BSS pravila prikaza

1. Svaki ekran mora imati jednu primarnu poslovnu svrhu.
2. Najviše četiri primarna KPI-ja na početnom ekranu; ostalo pripada tablici ili izvještaju.
3. Graf se koristi samo ako odnos čini bržim za razumjeti. Dopušteni su kompaktni kružni prikazi mjesečnih sati i godišnjeg fonda; tjedni, linijski i ukrasni grafovi nisu dio MVP-a.
4. Operativni popisi na desktopu su tablice; na mobitelu su kompaktni retci ili kontrolirano horizontalno pomične tablice.
5. Kartica služi za upozorenje, odluku ili sažetak, ne kao zamjena za svaki red podataka.
6. Radnik vidi samo svoje podatke; voditelj samo dodijeljene odjele; knjigovođa samo odobrene izvještajne podatke; administrator cijelu organizaciju.
7. Hrvatska oznaka je prikaz. API i pohrana koriste stabilne engleske kodove iz zaključanog opsega.
8. Aktivne, nepotpune i neslužbene vrijednosti moraju biti jasno odvojene od zaključenih obračunskih vrijednosti.
9. CSV, XLSX i svaki naknadno odobreni PDF moraju nastati iz istog verzioniranog skupa podataka.
10. Demo alati nikada nisu dio produkcijske navigacije ni službenog poslovnog zapisa.

## 4. Pregled i odluka po ekranima

| Ekran | Uloge | Nalaz | Odluka za pojednostavljenje | Prioritet |
| --- | --- | --- | --- | --- |
| `home` – administrator/voditelj | admin, manager | Osam odnosno šest KPI-ja, dodatni ukupni sati, tjedni graf, upozorenja i brze akcije stvaraju gustoću. | Zadržati četiri KPI-ja: prisutni, odstupanja, odsutni i zahtjevi na čekanju. Graf zamijeniti tablicom „Dnevni pregled” za zadnjih pet radnih dana. Ukloniti brze akcije koje ponavljaju bočnu navigaciju. | P1 |
| `home` – radnik | worker | Današnji status je jasan, ali četiri KPI-ja, četiri brze akcije i tablica ponavljaju `mytime`. Tablica nepotrebno ponavlja ime radnika. | Početna prikazuje današnji status, preostali godišnji, otvorene zahtjeve i najviše pet zadnjih zapisa. Ukloniti stupac Radnik i duplicirane brze akcije. | P1 |
| `home` – knjigovođa | accountant | Dovoljno jednostavan ulaz u izvještaje. | Zadržati. Ne dodavati dashboard analitiku. | Zadrži |
| `attendance` | admin, manager | Glavna tablica je kvalitetna, ali iznad nje su aktivne kartice, tri pogleda, četiri filtra i četiri dodatna indikatora. | Zadržati tablicu kao središte. Spojiti „Za provjeru” i „Aktivni danas” u spremljene brze filtre; prikazati najviše tri sažetka. Aktivne evidencije prikazati kao filtriranu tablicu, ne zasebne kartice. | P1 |
| `mytime` | worker, admin demo | Dobar osobni obračun, ali KPI-ji ponavljaju naslovni sažetak, stupac Radnik je suvišan, a obrazac korekcije stalno zauzima dno ekrana. | Jedan sažetak mjeseca + tablica bez stupca Radnik. Korekciju otvoriti iz konkretnog retka ili detalja zapisa i unaprijed popuniti datum/vrijeme. | P1 |
| `workers` | admin, manager | Popis koristi velike retke/kartice; sporije se uspoređuju odjel, smjena, kartica i status. | Desktop pretvoriti u tablicu Radnik–Odjel–Smjena–Kartica–Status–Akcija. Mobilno zadržati kompaktne retke. | P1 |
| `worker` | admin, manager | Detalj s karticama/tabsima je razumljiv i sprječava jedan vrlo dugačak ekran. | Zadržati tabove Profil, Evidencija, Godišnji i Kartica. Admin uređuje; voditelj čita dopušteni opseg. | Zadrži |
| `shifts` | admin, manager | Četiri sažetka i popis kartica ponavljaju podatke koje jedna tablica pokazuje preciznije. | Jedna tablica Naziv–Vrijeme–Pauza–Tolerancija–Broj radnika–Status–Akcija. Voditelj bez akcija uređivanja. | P1 |
| `requests` | admin, manager, worker | Statusni KPI-ji i kartice zahtjeva troše mnogo vertikalnog prostora. | Desktop: tablica s filtrima i jasnim akcijama odluke; detalji/razlog u modalu ili proširenom retku. Mobilno: kompaktna kartica. Radnikov novi zahtjev ostaje jedan kontrolirani obrazac. | P1 |
| `vacations` | sve uloge | Administratorov traženi godišnji kalendar postoji, ali ista stranica prikazuje četiri KPI-ja, kapacitet šest odjela, 12 mjeseci, stanje svakog radnika i sve planirane odsutnosti. | Cjelogodišnji kalendar ostaje primarni. Kapacitet odjela pretvoriti u jednu tablicu. Stanja radnika i popis odsutnosti prikazati kao zasebne tablične prikaze/sekcije koje se ne učitavaju istodobno s cijelom godinom. Radnik vidi samo svoj mjesec/godinu i fond. | P0 UX odluka |
| `sharedLeave` | sve uloge | Product Owner odobrio je frontend demonstraciju zajedničkog kalendara. | Prikazati isključivo ime i odobreno razdoblje u opsegu tim–odjel–organizacija. Bez bolovanja, razloga, napomena i backend rute. Produkcijska implementacija ostaje odluka MVP Scopea v1.1. | P0 granica |
| `corrections` | admin, manager, worker | Tijek je uzak i razumljiv; radnički obrazac se djelomično ponavlja u `mytime`. | Zadržati listu odluka. Jedini ulaz u novu korekciju neka bude odabrani zapis; `corrections` prikazuje povijest i status. | P1 |
| `reports` | admin, manager, accountant | Najbliži ciljanoj BSS filozofiji: filtri, tablica i pravi XLSX. Pet velikih tipova, četiri KPI-ja, blok preuzimanja, kontrolni blok i povijest ipak su previše na jednom ekranu. | Jedan red filtara, tabovi vrsta izvještaja, tablični pregled i dva primarna izlaza. XLSX je poslovni izlaz; CSV ostaje tehnički. Ne prikazivati KPI-je koje tablica već zbraja. Povijest izvoza kao zasebna tablica. | P0 ugovor |
| `terminal` | admin, manager | Status, četiri KPI-ja, dijagnostičke kartice i dvije tablice preklapaju se. | Jedna tablica terminala i jedna tablica zadnjih sinkronizacijskih događaja. Posebna kartica samo za stvarnu iznimku/alarm. Voditelj samo čita. | P1 |
| `roles` | admin | Tablice korisnika i matrice prava su dobre; gornji KPI-ji i pozivnice povećavaju gustoću. | Zadržati dvije tablice. Pozivnicu otvoriti kao dijalog. Ukloniti KPI-je koji samo broje retke tablice. | P1 |
| `audit` | admin | Trenutačni zapis izgleda kao lista, iako je audit prirodno tabličan. | Tablica Vrijeme–Akter–Radnja–Modul–Entitet–Rezultat, s postojećim filtrima. Detalj stare/nove vrijednosti u odvojenom prikazu. | P0 ugovor |
| `settings` | admin | Pregledne kartice i readiness pokazatelji ponavljaju sadržaj podsekcija. | Jasne administrativne sekcije/tabs: Tvrtka, Odjeli, Radni kalendar, Sustav. Podatke prikazati kao forme ili tablice; ukloniti dekorativne KPI-je. | P1 |
| `terminalDemo`, `flow` | admin, manager u demo modu | Korisni za prodajni demo, ali nisu poslovni runtime. | Zadržati samo iza `demoMode`; ne spajati na službeni API, audit, produkcijsku navigaciju ni pilot podatke. | P0 granica |

## 5. Prioritet prije backend spajanja

### P0 – mora biti zaključano prije prvog API adaptera

- prihvatiti ovu matricu ekrana; `sharedLeave` ostaje izolirana frontend demonstracija dok se zasebno ne odobri backend opseg;
- potvrditi da `terminalDemo` i `flow` ostaju isključivo demo;
- definirati `loading`, `empty`, `error`, `forbidden` i `stale` stanje za svaki serverski ekran;
- koristiti samo stabilne statusne kodove iz `bss-mvp-scope-v1.json`;
- server iz provjerene sesije izvodi organizaciju, ulogu i odjele; frontend ih nikada ne šalje kao dokaz ovlasti;
- zaključati jedinstveni dataset za ekran i izvoz;
- odlučiti ulazi li PDF u Scope v1.1. Trenutačni FROZEN scope dopušta CSV/XLSX, ne PDF.

### P1 – provesti tijekom spajanja, bez nove poslovne funkcije

- ukloniti tjedne i dekorativne grafove te duplicirane KPI-je;
- pretvoriti popise radnika, smjena, zahtjeva i audita u tablice na desktopu;
- ukloniti stupac Radnik iz osobnih tablica;
- korekciju pokretati iz konkretnog zapisa;
- godišnji kalendar rasteretiti dodatnih istodobno otvorenih blokova;
- zadržati isti broj poslovnih koraka, ista prava i iste validacije.

### P2 – tek nakon pilot povratne informacije

- dodatna prilagodba gustoće stupaca i ispisa;
- eventualni spremljeni korisnički pogledi ili dodatne vrste izvještaja samo kroz novu odluku o opsegu;
- nikakva prediktivna analitika, payroll, GPS, biometrika ili ERP proširenje.

## 6. Izvještaji po BSS standardu

Detaljna pravila nalaze se u `BSS_REPORTING_PROFILE_V1.md`. Sažetak:

- primarni poslovni izlaz je pravi `.xlsx`, ne HTML datoteka s Excel ekstenzijom;
- zaglavlje, filtri, vremenska zona, datum izrade, autor, verzija skupa podataka i kontrolni zbroj moraju biti vidljivi;
- tablica ima zamrznuto zaglavlje, autofilter, razumljive formate datuma/vremena i završne zbrojeve;
- predloženi PDF slijedi strogi A4 poslovni obrazac nalik njemačkim evidencijskim sustavima: bez dekorativnih grafova, s jasnim periodom, opsegom, numeracijom stranica, zbrojevima i prostorom za napomenu/potpis;
- PDF se ne implementira dok Product Owner izričito ne odobri izmjenu FROZEN opsega.

## 7. Kriterij prihvata frontend pojednostavljenja

Pojednostavljenje je završeno kada:

1. nijedan ekran ne dobije novu poslovnu funkciju;
2. dashboard nema tjedni graf i ima najviše četiri primarna KPI-ja;
3. osobni ekran nema podatke druge osobe ni suvišan stupac Radnik;
4. adminov godišnji pogled i dalje prikazuje cijelu godinu;
5. glavne desktop liste su tablice s jasnim statusom i jednom kolonom akcija;
6. isti filtri daju isti broj redaka i isti zbroj minuta na ekranu, u CSV-u i XLSX-u;
7. svi postojeći unit/integration, desktop, mobilni i axe testovi ostanu zeleni;
8. promjene prođu zaseban pregled Product Ownera prije spajanja u `main`.

## 8. Odluka za predaju

Projekt je spreman za backend programera na razini ugovora i strukture, ali backend implementacija treba početi tek nakon što Product Owner potvrdi P0 odluke. Tehnički predajni paket je u `BSS_BACKEND_HANDOFF_V1.md`, strojno čitljivom `bss-frontend-handoff-v1.json` i nacrtu `openapi/bss-mvp-api-v1.yaml`.
