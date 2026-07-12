# BSS Demo 3.0 – kontrolirani razvojni plan

Demo 3.0 izrađuje se prije produkcijskog MVP-a i stvarnog backenda. Objavljeni Demo 2.0 služi kao stabilna baza. Svaki sprint ide kroz zasebnu granu, testove, GitHub PR i Cloudflare Pages razvojni deploy; `main` se ne mijenja bez izričitog Tomislavovog odobrenja.

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
| 1 | Dashboard i navigacija | Spremno za pregled |
| 2 | Evidencija radnog vremena | Spremno za pregled |
| 3 | Godišnji odmori | Spremno za pregled |
| 4 | Izvještaji | Spremno za pregled |
| 5 | RFID terminal | Spremno za pregled |
| 6 | Postavke i administracija | Spremno za pregled |
| 7 | Dizajn i završno poliranje | Spremno za pregled |

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
- Sve postojeće funkcije i automatske provjere moraju proći prije PR-a.

## Sprint 2 – kriteriji prihvata

- Administrator ima jedinstveni pregled svih zapisa, zapisa za provjeru i aktivnih prijava današnjeg dana.
- Voditelj na svakom filtru, sažetku i detalju vidi samo dodijeljene odjele.
- Evidentirani sati, plan smjene, saldo i prekovremeno računaju se iz istih zapisa i pravila smjene.
- Aktivni i nepotpuni zapisi ne ulaze u usporedbu završenih sati s planom.
- Svaki zapis ima detalj s izvorom, dodijeljenom smjenom, pauzom, saldom i statusom korekcije.
- Radnik vidi samo svoje zapise i može promijeniti mjesec osobne evidencije.
- Zahtjev za korekciju može krenuti iz konkretnog zapisa, ali izvorni zapis ostaje nepromijenjen do odobrenja.
- Budući datumi, jednaka vremena, duplikati i evidencije dulje od 16 sati odbijaju se prije slanja korekcije.
- RFID simulator ostaje odvojen od službene evidencije.
- Svi testovi uloga, privatnosti, izračuna i postojećih funkcija moraju proći prije PR-a.

## Sprint 3 – kriteriji prihvata

- Administrator vidi godišnji pregled cijele firme, svih 12 mjeseci i filtar odjela.
- Voditelj vidi samo zahtjeve i kalendar dodijeljenih odjela.
- Radnik vidi isključivo svoje zahtjeve, razdoblja, fond i odluke; imena kolega iz preklapanja nisu mu otkrivena.
- Zahtjevi imaju statuse Na čekanju, Odobreno, Odbijeno i Poništeno te potpunu povijest odluke.
- Odbijanje zahtjeva zahtijeva razlog ili prijedlog izmjene; odluka bilježi ulogu, vrijeme i napomenu u audit tragu.
- Radnik može poništiti samo vlastiti zahtjev na čekanju, nakon čega se rezervirani dani vraćaju u raspoloživi fond.
- Odobreni i zahtjevi na čekanju prikazuju se u kalendaru; odbijeni i poništeni ostaju samo u povijesti.
- Fond razlikuje odobrene, rezervirane, preostale i stvarno dostupne dane za novi zahtjev.
- Radni dani računaju se bez vikenda i hrvatskih blagdana u 2026.
- Novi zahtjev odbija prošli datum, nevaljano razdoblje, vlastito preklapanje i prekoračenje raspoloživog fonda.
- Upozorenje preklapanja pomaže planiranju kapaciteta, ali ne donosi automatsku odluku umjesto voditelja.
- Svi postojeći i novi testovi moraju proći prije PR-a.

## Sprint 4 – kriteriji prihvata

- Modul ima pet jasno odvojenih izvještaja: mjesečni sažetak, detaljnu evidenciju, odstupanja, odobrene odsutnosti i korekcije vremena.
- Mjesečni sažetak daje jedan red po radniku te iz istih zapisa računa završene evidencije, evidentirane sate, plan, saldo, prekovremeno, stavke za provjeru i odobrene dane odsutnosti.
- Administrator može obuhvatiti cijelu tvrtku ili filtrirati odjel i radnika.
- Voditelj vidi i izvozi samo dodijeljene odjele; nevaljani filtar izvan njegova opsega automatski se odbacuje.
- Knjigovođa ima pregled i CSV/XLSX izvoz cijele tvrtke bez prava izmjene službenih podataka.
- Radnik nema pristup poslovnim izvještajima; osobne sate i odsutnosti i dalje vidi na vlastitim ekranima.
- Mjesec, odjel, radnik i vrsta izvještaja određuju isti skup redaka na ekranu, u CSV-u i u XLSX-u.
- CSV je UTF-8, koristi točku-zarez i pravilno štiti navodnike; naziv datoteke jasno sadrži vrstu, mjesec i godinu.
- XLSX je stvarna formatirana Excel radna knjiga sa stiliziranim zaglavljem, prilagođenim širinama stupaca, zamrznutim prvim retkom i automatskim filtrom.
- Generiranje i preuzimanje bilježe ulogu, opseg, razdoblje, vrstu i broj redaka u povijesti i audit tragu.
- Izvještaji pripremaju evidencijske podatke, ali ne računaju plaću, poreze ni doprinose.
- Svi postojeći i novi testovi moraju proći prije PR-a.

## Sprint 5 – kriteriji prihvata

- Operativni ekran prikazuje identitet, serijski broj, lokaciju, hardver, verziju, heartbeat, signal, lokalnu pohranu i broj očitanja terminala.
- Dijagnostika odvojeno prikazuje RFID čitač, zvučnu potvrdu, firmware i zauzeće lokalne pohrane.
- Prekid mreže sam po sebi ne stvara lažne evidencije; tek poznato offline očitanje ulazi u lokalni red.
- Svako prihvaćeno očitanje dobiva jedinstveni ID događaja, vrijeme, radnika, radnju, način rada i status sinkronizacije.
- Nepoznata kartica odbija se lokalno, ne ulazi u offline red i ne mijenja službenu evidenciju.
- Nakon povratka veze lokalni se red obrađuje, a rezultat prikazuje primljene, prihvaćene i ponovljene događaje.
- Idempotentna sinkronizacija prepoznaje već prihvaćen ID i ne sprema isti događaj drugi put.
- Administrator može simulirati prekid veze i pokrenuti sinkronizaciju; voditelj bez tih kontrola vidi samo događaje dodijeljenih odjela.
- Radnik i knjigovođa nemaju pristup ekranu upravljanja terminalom.
- Prodajni RFID simulator ostaje jasno odvojen od službene evidencije radnog vremena.
- Online, offline i odbijeni simulirani događaji ažuriraju samo telemetriju, lokalni red i audit trag.
- Svi postojeći i novi testovi moraju proći prije PR-a.

## Sprint 6 – kriteriji prihvata

- Administrator na jednom mjestu vidi spremnost tvrtke, odjela, radnih mjesta, smjena, neradnih dana te korisničkih računa i uloga.
- Podaci tvrtke provjeravaju obvezna polja, email, raspon godišnjeg fonda, sigurnosne rokove i matematički kontrolni broj OIB-a.
- Odjeli i radna mjesta imaju jedinstven naziv i šifru, a radno mjesto uvijek pripada aktivnom odjelu.
- Odjel se ne može deaktivirati dok ima aktivne radnike ili radna mjesta; radno mjesto se ne može deaktivirati dok ima aktivne radnike.
- Radnik se bira samo iz konfiguriranih odjela, radnih mjesta i smjena te se može evidentirati i prije dodjele RFID kartice.
- Deaktiviranje radnika automatski blokira njegov račun i RFID karticu, bez brisanja povijesnih evidencija.
- Zakonski blagdani za 2026. zaključani su, a interni neradni dani mogu se dodati i deaktivirati te odmah utječu na obračun radnih dana godišnjeg odmora.
- Korisnički računi imaju četiri uloge, vidljiv opseg, status, zadnju prijavu, reset lozinke i zaštitu glavnog demo administratora.
- Voditelj mora imati barem jedan dodijeljeni odjel, a promjena njegova opsega odmah ograničava demo prikaz tima i izvještaja.
- Pozivnice provjeravaju jedinstveni email i odjel radnika ili voditelja te podržavaju ponovno slanje i poništavanje statusa.
- Demo ne šalje stvarne emailove, ne pohranjuje lozinke i ne izdaje reset tokene; te granice jasno su navedene u sučelju.
- Audit log se može filtrirati po modulu i pretraživati po korisniku ili radnji.
- Radnik, voditelj i knjigovođa ne mogu otvoriti administratorske postavke ni upravljanje korisničkim računima.
- Aktivna smjena ne može se ugasiti dok ima dodijeljene radnike, a trajanje smjene mora biti veće od nule i najviše 16 sati.
- Svi postojeći i novi testovi moraju proći prije PR-a.

## Sprint 7 – kriteriji prihvata

- Demo na desktopu ima stabilnu bočnu navigaciju, zaseban pomični sadržaj i čitljive široke tablice bez pomicanja cijele stranice.
- Mobilni prikaz koristi cijeli ekran, sigurne rubove uređaja, stalnu donju navigaciju i sadržaj koji ostaje dostupan iznad nje.
- Naslovi, akcije, kartice, obrasci, modali i tablični sažeci prilagođavaju se uskom ekranu bez preklapanja kontrola.
- Aktivna stavka navigacije jasno je označena vizualno i atributom `aria-current`, uključujući detalj odabranog radnika.
- Svaki tablični prikaz može dobiti fokus tipkovnicom i ima opis da se na užem ekranu pomiče vodoravno.
- Glavni sadržaj ima preskočnu poveznicu, a naslov kartice preglednika prati otvoreni modul.
- Drawer i modal imaju dijalošku semantiku, zatvaraju se tipkom Escape, zadržavaju fokus unutar aktivnog sloja i vraćaju ga nakon zatvaranja.
- Reset početnih demo-podataka traži jasnu potvrdu i objašnjava koje će lokalne promjene nestati.
- Animacije ulaska, stanja terminala i RFID očitanja ostaju kratke i nenametljive te se potpuno isključuju kada korisnik traži smanjeno kretanje.
- Završni prodajni prikaz jasno povezuje pet koraka: RFID očitanje, potvrdu, sinkronizaciju, odluku voditelja i CSV/XLSX izvoz.
- PWA metapodaci opisuju hrvatsku poslovnu aplikaciju, samostalni prikaz i aktualnu Sprint 7 predmemoriju.
- Sve četiri uloge, cijeli poslovni tijek i sve funkcije Sprintova 1–6 ostaju regresijski pokriveni.
- Završno poliranje ne dodaje skladište, ERP, GPS/geofencing, AI analitiku, payroll, otvaranje vrata, inventar ni CRM.
- Svi postojeći i novi testovi moraju proći prije PR-a.

## Pravilo završetka sprinta

Sprint je dovršen tek kada su provedene strukturna, sadržajna i jezično-formatna provjera, automatski testovi te vizualna provjera desktopa i mobitela. Razvojna objava ide preko Cloudflare Pages. Produkcijski deploy ili spajanje na `main` nije dio automatskog završetka sprinta.
