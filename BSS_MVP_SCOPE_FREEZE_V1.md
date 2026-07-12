# BSS MVP Scope Freeze v1.0

| Stavka | Odluka |
| --- | --- |
| Status | **FROZEN** |
| Datum zaključavanja | 12.07.2026. |
| Product Owner | Tomislav Bognar |
| Izvor istine | Ovaj dokument + `bss-mvp-scope-v1.json` |
| Tehnička osnova | Demo 3.0, Design System v1.0 i Brand Book v1.0 |
| Sljedeća faza | Refactor v1 |

## 1. Definicija proizvoda

BSS MVP je responzivna web/PWA aplikacija i RFID/NFC terminalski sustav za sigurnu evidenciju radnog vremena, upravljanje godišnjim odmorima i korekcijama te provjerljive izvještaje uz jasna prava pristupa i audit trag.

MVP nije ERP, obračun plaće ni sustav kontrole pristupa vratima.

## 2. Cilj pilota

Pilot obuhvaća jednu tvrtku, 10–30 radnika, jedan stvarni terminal i četiri tjedna rada. Uspješan je kada nema izgubljenih ni dvostrukih terminalskih zapisa, prava pristupa su poslužiteljski provedena, a administrator može zaključiti mjesec i ponovno proizvesti isti izvještaj bez ručnog prepisivanja.

## 3. Funkcije unutar MVP-a

### Organizacija i ljudi

- podaci jedne organizacije i njezina vremenska zona;
- odjeli i radna mjesta;
- radnici, korisnički računi i statusi;
- smjene, pauze, tolerancije i smjena preko ponoći;
- godišnji fond i kalendar blagdana/neradnih dana;
- RFID/NFC kartice, blokiranje i povijest dodjele.

### Evidencija radnog vremena

- dolazak i odlazak RFID/NFC karticom;
- pregled aktivnih, završenih, zakašnjelih i nepotpunih evidencija;
- plan, evidentirano vrijeme, saldo i prekovremeni minuti;
- izvor događaja i sljediva povijest promjene;
- zahtjev radnika za korekciju, odluka ovlaštene osobe i nepromijenjen izvorni trag.

### Godišnji odmori i odsutnosti

- osobni zahtjev s provjerom fonda i preklapanja;
- izračun radnih dana bez vikenda i organizacijskih blagdana;
- odobravanje ili odbijanje s razlogom i auditom;
- administratorov godišnji kalendar cijele tvrtke;
- voditeljev kalendar dodijeljenih odjela;
- radnikov prikaz isključivo vlastitih zahtjeva i fonda.

### Izvještaji

- mjesečni sažetak, detaljna evidencija, odstupanja, odobrene odsutnosti i korekcije;
- isti filtrirani dataset na ekranu, u CSV-u i u XLSX-u;
- serverom generirani, verzionirani i provjerljivi izvozi s checksumom;
- zaključavanje mjeseca i ponavljanje izvoza iz spremljenih filtara;
- izvještaj priprema evidenciju, ali ne računa plaću, poreze ni doprinose.

### Terminal i offline rad

- uparivanje i opoziv identiteta terminala;
- lokalno trajno spremanje događaja prije pozitivne potvrde radniku;
- jedinstveni `device_event_id`, slijed, vrijeme uređaja i vrijeme primitka;
- potpisani batch paketi, idempotentni prihvat i izričita potvrda servera;
- offline red, sinkronizacija nakon povratka veze i heartbeat;
- blokirana ili nepoznata kartica ne stvara prihvaćenu evidenciju;
- dijagnostika i vidljiv status sinkronizacije.

### Sigurnost i upravljanje

- autentikacija i sesije na poslužitelju;
- RBAC i opseg podataka provjereni na svakom API zahtjevu;
- nepromjenjiv append-only audit za prijave, prava, kartice, korekcije, odluke i izvoze;
- izolacija organizacije, rate limiting, zaštita tajni i šifrirane sigurnosne kopije;
- strukturirani logovi, terminalske metrike i upozorenja;
- responzivna web/PWA aplikacija, pristupačnost i hrvatsko sučelje.

## 4. Funkcije izvan MVP-a

Sljedeće se ne projektira, ne implementira i ne dodaje „usput” u MVP:

- skladište i inventar;
- ERP integracija ili ERP modul;
- GPS praćenje i geofencing;
- AI analitika, predviđanja ili biometrijsko prepoznavanje;
- obračun plaće, poreza, doprinosa ili isplata;
- otvaranje vrata i kontrola fizičkog pristupa;
- CRM;
- nativna iOS/Android aplikacija;
- Kubernetes, mikroservisi ili druga prerana infrastrukturna složenost;
- marketinške kampanje, naplata i pretplate.

Operativni email za pozivnicu, potvrdu računa i oporavak pristupa dopušten je kao dio sigurne autentikacije. To nije modul za kampanje.

## 5. Uloge i granice podataka

| Uloga | Smije | Ne smije |
| --- | --- | --- |
| Administrator | Upravljati organizacijom, radnicima, smjenama, karticama, korisnicima i terminalom; vidjeti i izvesti podatke cijele tvrtke; odlučivati o zahtjevima i korekcijama | Zaobići audit, mijenjati izvorne terminalske događaje ili pristupiti drugoj organizaciji |
| Voditelj | Vidjeti radnike, evidenciju, kalendar i izvještaje samo dodijeljenih odjela; odobriti/odbiti njihove zahtjeve i korekcije; vidjeti stanje terminala bez upravljačkih kontrola | Vidjeti drugi odjel, upravljati organizacijom/korisnicima/terminalom ili mijenjati izvorni događaj |
| Knjigovođa | Vidjeti odobrene evidencijske podatke i izvještaje cijele tvrtke; stvarati CSV/XLSX izvoz | Mijenjati radnike, evidenciju, zahtjeve, kartice, prava, postavke ili terminal |
| Radnik | Vidjeti samo vlastitu evidenciju, fond i zahtjeve; poslati korekciju ili zahtjev; poništiti vlastiti zahtjev na čekanju | Vidjeti identitet/podatke kolega, donositi odluke, izvoziti poslovne izvještaje ili upravljati sustavom |

Skrivanje gumba nije sigurnosna kontrola. API izvodi organizaciju, ulogu i opseg odjela iz provjerene sesije ili identiteta uređaja.

## 6. Stabilni statusni kodovi

Statusni kod je dio ugovora i ne prevodi se. Hrvatska oznaka pripada prikazu.

| Entitet | Kodovi |
| --- | --- |
| Evidencija dana | `active`, `complete`, `late`, `incomplete`, `corrected` |
| Zahtjev za godišnji | `pending`, `approved`, `rejected`, `cancelled` |
| Zahtjev za korekciju | `pending`, `approved`, `rejected`, `cancelled` |
| Terminalski događaj | `queued`, `synced`, `duplicate`, `rejected` |
| RFID kartica | `active`, `blocked` |
| Korisnik/radnik | `active`, `blocked` |

## 7. Zaključana poslovna pravila

1. Server je jedini autoritet za službeni identitet, ulogu, opseg i poslovni zapis.
2. Svaki poslovni zapis pripada jednoj organizaciji; međusobni pristup organizacija mora biti nemoguć i testiran.
3. Događaj čuva UTC vrijeme uređaja i primitka; radni dan računa se u vremenskoj zoni organizacije uz DST pravila.
4. Smjena smije trajati najviše 16 sati i mora podržati prelazak preko ponoći.
5. Terminalski događaji su append-only i idempotentni po `(terminal_id, device_event_id)`.
6. Evidencija se ne prepisuje bez traga; ispravak ide kroz zahtjev, odluku i audit stare/nove vrijednosti.
7. Aktivne i nepotpune evidencije ne ulaze u zaključani mjesečni zbroj dok nisu riješene.
8. Dani godišnjeg računaju se bez vikenda i blagdana organizacije za odgovarajuću godinu.
9. Radnik može poništiti samo vlastiti zahtjev u statusu `pending`.
10. Audit je append-only i bilježi aktera, vrijeme, radnju, entitet te stare i nove vrijednosti.
11. Ekran, CSV i XLSX za iste filtre moraju koristiti isti dataset, broj redaka i zbroj minuta.
12. Spremljeni izvoz ima filtre, autora, vrijeme, verziju i checksum te se može ponovno proizvesti.
13. MVP ne računa plaću, poreze ni doprinose.
14. Service Worker ne sprema autentificirane API ni privatne korisničke odgovore.

## 8. Kriteriji prihvata pilota

- Nema izgubljenog zapisa nakon najmanje 24 sata simuliranog offline rada.
- Ponovno slanje istog terminalskog paketa ne stvara duplikate.
- Radnik API-jem ne može dohvatiti tuđe podatke; voditelj ne može dohvatiti nedodijeljeni odjel.
- Blokirana kartica ne može stvoriti prihvaćeni dolazak.
- Odobrena korekcija transakcijski ažurira dnevni zapis i stvara audit događaj sa starom i novom vrijednošću.
- Broj radnih dana godišnjeg odgovara kalendaru organizacije za odabranu godinu.
- CSV i XLSX imaju isti broj redaka i isti zbroj minuta za iste filtre.
- Sigurnosna kopija može se obnoviti u probnom okruženju unutar dogovorenog RTO-a.
- Administrator može zaključiti mjesec i reproducirati isti izvoz iz spremljenih filtara.
- Četverotjedni pilot s 10–30 radnika i jednim terminalom završava bez ručnog prepisivanja evidencije.

## 9. Kontrola promjene opsega

Ovaj opseg je FROZEN. Nova funkcija ili promjena zaključanog pravila zahtijeva:

1. pisani prijedlog s poslovnim razlogom;
2. procjenu utjecaja na vrijeme, trošak, sigurnost, privatnost, UX i testove;
3. odluku Product Ownera Tomislava Bognara;
4. novu verziju ovog dokumenta i `bss-mvp-scope-v1.json`;
5. zaseban backlog/PR – bez tihog širenja aktivne faze.

Ispravak greške, sigurnosni popravak i tehničko razdvajanje koje ne mijenja korisničko ponašanje nisu proširenje opsega, ali i dalje moraju biti testirani i pregledani.

## 10. Redoslijed nakon zaključavanja

1. **Refactor v1** – ista funkcija i isti dizajn, modularna i testabilna frontend struktura.
2. **Backend contract** – OpenAPI, ER dijagram, validacijska pravila, kodovi pogrešaka i sekvence web punch/device sync.
3. **Backend MVP** – PostgreSQL, autentikacija/RBAC, audit, terminalski API i server export.
4. **Integracija hardvera i pilot** – stvarni terminal, migracija početnih podataka, obuka i četverotjedna provjera.
5. **Odluka o lansiranju** – tek nakon prolaska kriterija pilota.

Refactor v1 ne smije promijeniti zaključani opseg ni postojeći odobreni izgled. `main` i produkcija mijenjaju se samo uz izričito odobrenje Product Ownera.
