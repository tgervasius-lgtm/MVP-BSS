# BSS Support & Incident Operating System

| Polje | Vrijednost |
|---|---|
| Status | `PROPOSED` |
| Verzija | `0.1` |
| Datum | `2026-08-05` |
| Vlasnik | BSS Product Owner |
| Povezani issue | `#75` |
| Primjena | Demo, dry run, kontrolirani pilot i buduća produkcijska podrška |
| Ne predstavlja | Ugovorni SLA, 24/7 dežurstvo, produkcijsku spremnost ili dokazanu dostupnost |

## 1. Svrha

Ovaj dokument definira kako BSS zaprima, razvrstava, istražuje, rješava i komunicira korisničke probleme i incidente.

Cilj je spriječiti sljedeće pogreške:

1. kupac ne zna kome se javiti;
2. kvar terminala zaustavi evidenciju jer nema ručnog fallbacka;
3. tehnički problem i moguća povreda osobnih podataka tretiraju se jednako;
4. BSS obeća rok rješavanja koji nije operativno sposoban ispuniti;
5. incident se zatvori bez dokaza da je usluga stvarno vraćena;
6. originalni zapisi evidencije mijenjaju se bez autorizacije i audit traga;
7. isti problem se ponavlja jer nema post-incident analize i korektivne radnje.

Ovaj dokument je operativni baseline. Stvarni kontaktni kanali, radno vrijeme, dežurstva i ugovorni rokovi moraju biti posebno odobreni prije live pilota.

## 2. Autoritativni izvori i granice

Povezani izvori:

- `docs/bss-os/PILOT_READINESS_PACKAGE.md` — go/no-go gateovi za live pilot;
- `docs/bss-os/GDPR_DATA_GOVERNANCE_BASELINE.md` — uloge voditelja i izvršitelja obrade;
- `docs/bss-os/LEGAL_OPERATIONS_TEMPLATE_PACK.md` — incident i breach predlošci;
- `docs/bss-os/ADR-001-INFRASTRUCTURE-BASELINE.md` — predložena infrastruktura i operativni zahtjevi;
- `docs/bss-os/PRODUCT_FEATURE_REGISTRY.md` — stvarni status funkcija;
- `BSS_READINESS_MATRIX.md` — tehnička spremnost;
- issue `#55` — autoritativni software baseline;
- issue `#59` — infrastruktura, monitoring, backup i restore;
- issue `#60` — hardware metrologija i prihvat terminala;
- issue `#64` i `#66` — privacy/legal evidence;
- issue `#75` — Support & Incident OS workstream.

Pravila:

- support dokumentacija ne smije tvrditi da postoji monitoring, on-call ili restore capability dok dokaz ne postoji;
- javni GitHub ne smije sadržavati stvarna imena kupaca, radnika, tajne, logove sa osobnim podacima ili povjerljive detalje incidenta;
- korisnički support slučaj nije automatski sigurnosni incident;
- sigurnosni incident nije automatski potvrđena povreda osobnih podataka;
- odluku o regulatornoj prijavi donosi kupac-voditelj obrade uz pravni/privacy proces, ne obični support agent;
- incident se ne rješava brisanjem ili tihom izmjenom izvornog attendance zapisa.

## 3. Pojmovi

### 3.1 Support zahtjev

Pitanje, pomoć ili manja poteškoća bez dokaza o prekidu ključne usluge.

Primjeri:

- korisnik ne zna gdje se nalazi izvještaj;
- administrator treba pomoć s dodjelom uloge;
- pitanje o statusu godišnjeg odmora;
- zahtjev za objašnjenjem postojećeg ponašanja.

### 3.2 Defekt

Dokazano ponašanje proizvoda koje odstupa od dokumentiranog ili očekivanog rezultata.

### 3.3 Incident

Događaj koji uzrokuje ili može uzrokovati prekid usluge, gubitak funkcije, pogrešne podatke, sigurnosni rizik ili materijalni utjecaj na kupca.

### 3.4 Problem

Temeljni uzrok jednog ili više incidenata. Incident se može privremeno riješiti workaroundom, dok problem ostaje otvoren do trajne korekcije.

### 3.5 Sigurnosni incident

Sumnja ili potvrda neovlaštenog pristupa, kompromitacije credentiala, zloupotrebe računa, izlaganja tajne, napada ili druge povrede povjerljivosti, integriteta ili dostupnosti.

### 3.6 Moguća povreda osobnih podataka

Sigurnosni događaj koji može uključivati slučajno ili nezakonito uništenje, gubitak, izmjenu, neovlašteno otkrivanje ili pristup osobnim podacima.

Oznaka `POTENTIAL PERSONAL DATA BREACH` pokreće privacy/legal workflow. Ne znači automatski da je povreda potvrđena ili da je potrebna prijava nadzornom tijelu.

## 4. Statusi support slučaja

| Status | Značenje |
|---|---|
| `NEW` | zahtjev je zaprimljen, ali još nije klasificiran |
| `ACKNOWLEDGED` | BSS je potvrdio primitak i naveo sljedeći korak |
| `TRIAGE` | utjecaj, opseg i prioritet se provjeravaju |
| `INVESTIGATING` | tehnički vlasnik aktivno istražuje |
| `WAITING_FOR_CUSTOMER` | potreban je podatak ili radnja kupca |
| `WORKAROUND_ACTIVE` | privremeni postupak omogućuje nastavak rada |
| `FIX_IN_PROGRESS` | trajna korekcija je u izradi ili provjeri |
| `MONITORING` | usluga je vraćena i prati se stabilnost |
| `RESOLVED` | funkcija je vraćena i dokaz provjeren |
| `CLOSED` | kupac je obaviješten, evidence je spremljen i follow-up zabilježen |
| `DUPLICATE` | slučaj je povezan s postojećim incidentom |
| `CANCELLED` | prijava nije više relevantna uz zabilježen razlog |

`RESOLVED` i `CLOSED` nisu isto. Incident se zatvara tek nakon komunikacije, dokaza i evidentiranih korektivnih radnji.

## 5. Severity matrica

### 5.1 SEV-1 — kritično

Kriteriji:

- cijela pilot-firma ne može evidentirati dolazak/odlazak i nema funkcionalnog automatiziranog puta;
- potvrđen ili vrlo vjerojatan cross-tenant pristup;
- masovno pogrešno zapisivanje ili gubitak attendance događaja;
- potpuni backend ili authentication outage tijekom aktivne pilot smjene;
- kompromitacija produkcijske tajne ili administrativnog credentiala;
- incident koji može imati neposredan ozbiljan utjecaj na osobne podatke.

Obvezne radnje:

- odmah imenovati Incident Commandera;
- aktivirati ručni fallback;
- zamrznuti rizične deployeve i promjene;
- uključiti tehničkog, customer-comms i po potrebi privacy/security vlasnika;
- čuvati evidence i vremensku liniju;
- ne davati neprovjerene uzroke ili rokove kupcu.

### 5.2 SEV-2 — visoko

Kriteriji:

- jedan terminal ili jedna lokacija ne rade, ali ostatak sustava radi;
- ključni administratorski tok ne radi;
- izvještaj ili attendance rezultat je materijalno pogrešan za više osoba;
- ozbiljna degradacija bez potpune nedostupnosti;
- ponavljajući auth ili sync problem s jasnim operativnim utjecajem;
- sigurnosni događaj ograničenog opsega koji zahtijeva hitnu provjeru.

### 5.3 SEV-3 — standardno

Kriteriji:

- pojedinačni korisnik ili nekritična funkcija ne rade;
- postoji jednostavan workaround;
- manja pogreška prikaza bez utjecaja na izvorne podatke;
- pitanje o konfiguraciji ili workflowu koje blokira jednu osobu;
- povremena poteškoća bez dokaza o širem incidentu.

### 5.4 SEV-4 — zahtjev / informacija

Kriteriji:

- pitanje, edukacija ili zahtjev za buduću funkciju;
- copy/UI prijedlog;
- zahtjev koji nije defekt;
- komercijalno ili roadmap pitanje.

### 5.5 Obvezne dodatne oznake

Severity ne zamjenjuje domenske oznake:

- `SECURITY_REVIEW_REQUIRED`;
- `POTENTIAL_PERSONAL_DATA_BREACH`;
- `DATA_INTEGRITY_RISK`;
- `HARDWARE`;
- `INFRASTRUCTURE`;
- `SOFTWARE`;
- `AUTHENTICATION`;
- `TERMINAL_SYNC`;
- `REPORTING`;
- `CUSTOMER_ACTION_REQUIRED`.

## 6. Predloženi interni ciljevi reakcije

Ovo su `PROPOSED INTERNAL TARGETS` za planiranje i tabletop vježbe. Nisu ugovorni SLA i ne smiju se slati kupcu kao obveza bez odobrenja.

| Severity | Predložena potvrda primitka tijekom dogovorenih pilot sati | Predloženi ritam ažuriranja | Primarni cilj |
|---|---:|---:|---|
| SEV-1 | 15 minuta | svakih 30 minuta | zaštititi podatke i aktivirati fallback |
| SEV-2 | 60 minuta | svaka 2 sata | ograničiti utjecaj i vratiti ključni tok |
| SEV-3 | isti radni dan | jednom dnevno dok je aktivno | workaround ili plan korekcije |
| SEV-4 | 2 radna dana | prema dogovoru | odgovor, edukacija ili roadmap odluka |

Prije live pilota moraju biti odobreni:

- support radni sati;
- službeni kontaktni kanal;
- zamjena vlasnika kada je primarna osoba nedostupna;
- pravilo za vikend, blagdan i noćnu smjenu;
- customer-facing response commitment;
- što je uključeno u cijenu, a što je izvan ugovorenog supporta.

## 7. Support kanali i vlasništvo

### 7.1 Kandidati kanala

| Kanal | Status | Namjena |
|---|---|---|
| support e-mail | `TBD` | standardni support i dokaziva komunikacija |
| telefonski broj | `TBD` | samo SEV-1/SEV-2 tijekom dogovorenih sati |
| privatni ticket/CRM alat | `TBD` | autoritativni case zapis |
| status stranica | `TBD` | širi incidenti i planirano održavanje |
| javni GitHub | `PROHIBITED FOR CUSTOMER DATA` | samo javni proizvodni proces i anonimizirani predlošci |

### 7.2 Obvezne uloge

| Uloga | Odgovornost |
|---|---|
| Support owner | prima i održava support zapis |
| Triage owner | potvrđuje severity, domenu i opseg |
| Incident Commander | vodi SEV-1/SEV-2 incident i odluke |
| Technical owner | dijagnostika, workaround, fix i dokaz |
| Customer communications owner | šalje provjerena ažuriranja kupcu |
| Privacy/security owner | vodi sigurnosnu i privacy eskalaciju |
| Product Owner | odobrava scope, customer commitment i konačne poslovne odluke |
| Customer owner | potvrđuje utjecaj, fallback i prihvat vraćene usluge |

Jedna osoba može privremeno imati više uloga u ranoj fazi, ali svaka uloga mora biti eksplicitno imenovana u incidentu.

## 8. Minimalni incident intake

Svaki slučaj mora imati:

- case/incident ID;
- datum i vrijeme prijave;
- kanal prijave;
- firmu i lokaciju u privatnom sustavu;
- osobu koja prijavljuje;
- opis očekivanog i stvarnog ponašanja;
- vrijeme prvog uočenog problema;
- pogođene korisnike, terminale, lokacije i funkcije;
- je li evidencija rada zaustavljena ili samo degradirana;
- postoji li ručni fallback;
- screenshot ili correlation ID bez nepotrebnih osobnih podataka;
- zadnju poznatu uspješnu radnju;
- nedavne deployeve, konfiguracije ili hardware promjene;
- početni severity;
- domenske oznake;
- named owner i sljedeći korak;
- datum sljedećeg ažuriranja.

Ne tražiti lozinke, privatne ključeve, cijeli RFID UID, production tajne ili nepotrebne podatke radnika.

## 9. Triage postupak

1. Potvrditi primitak bez nagađanja uzroka.
2. Provjeriti sigurnost ljudi i opreme ako postoji fizički/hardware problem.
3. Odrediti utjecaj: jedan korisnik, jedan terminal, jedna lokacija, jedna firma ili više firmi.
4. Provjeriti data integrity rizik.
5. Provjeriti sigurnosne i privacy oznake.
6. Dodijeliti inicijalni severity.
7. Aktivirati odgovarajući fallback.
8. Imenovati Incident Commandera za SEV-1/SEV-2.
9. Sačuvati vremensku liniju i evidence.
10. Odrediti sljedeće customer update vrijeme.
11. Razdvojiti workaround od trajne korekcije.
12. Nakon vraćanja usluge provesti verifikaciju s kupcem.

Severity se može povećati ili smanjiti samo uz zabilježen razlog.

## 10. Standardni fallback postupci

### 10.1 Terminal nema struju ili se ne uključuje

1. Kupac ne otvara kućište bez odobrenog postupka.
2. Provjeriti utičnicu, napajanje, vidljiva oštećenja i indikator.
3. Aktivirati ručni attendance obrazac.
4. Zabilježiti početak prekida i sve pogođene smjene.
5. Ne pokušavati više nekontroliranih restartova ako postoji znak pregrijavanja ili električnog problema.
6. Dogovoriti zamjenu, servis ili onsite provjeru.
7. Nakon vraćanja terminala reconciliirati ručne zapise uz audit razlog.

### 10.2 Internet ne radi, terminal je funkcionalan

1. Utvrditi podržava li odobrena verzija lokalni queue/offline način.
2. Ako je offline queue `PROVEN`, terminal nastavlja lokalno evidentirati i prikazuje offline status.
3. Ako offline queue nije dokazano podržan, aktivirati ručni obrazac.
4. Ne stvarati višestruke RFID pokušaje koji mogu proizvesti duplikate.
5. Nakon povratka mreže provjeriti idempotency, redoslijed i sync status.
6. Usporediti broj lokalnih, sinkroniziranih i ručnih zapisa.

### 10.3 Backend/API nije dostupan

1. Potvrditi je li problem lokalni ili širi.
2. Provjeriti health, monitoring i posljednji deploy samo u odobrenom operativnom sustavu.
3. Aktivirati ručni fallback ili dokazani offline terminal način.
4. Zamrznuti deployeve koji nisu dio incident responsea.
5. Ne pokretati destruktivne migracije ili ručne DB izmjene kao brzi pokušaj.
6. Nakon oporavka provjeriti tenant izolaciju, auth, attendance roundtrip i reporting.

### 10.4 Korisnik se ne može prijaviti

1. Provjeriti je li incident jedan korisnik ili više korisnika.
2. Provjeriti status računa, ulogu, organizaciju i session/refresh ponašanje.
3. Ne tražiti korisničku lozinku.
4. Reset/reinvite koristiti samo kroz odobren tok.
5. Ako admin pristup nije dostupan cijeloj firmi, podići severity.
6. Svaku promjenu uloge ili računa auditirati.

### 10.5 Pogrešan attendance zapis

1. Sačuvati originalni događaj i njegov identifikator.
2. Utvrditi je li problem terminal, vrijeme, timezone, shift pravilo, duplikat, sync ili ljudska pogreška.
3. Ne brisati i ne prepisivati original bez odobrenog procesa.
4. Ovlaštena osoba kupca unosi korekciju s razlogom.
5. Audit mora prikazati tko, kada, što i zašto je promijenio.
6. Ako je pogođeno više radnika ili izvještaj, razmotriti SEV-2 i data-integrity oznaku.

### 10.6 Izvještaj ili export je pogrešan

1. Zaustaviti korištenje spornog izvještaja za obračun ili vanjsku odluku.
2. Sačuvati parametre, period, tenant i verziju ugovora.
3. Usporediti sirove attendance zapise, korekcije i generirani rezultat.
4. Ne tvrditi da BSS radi payroll ako to nije odobrena funkcija.
5. Nakon korekcije provjeriti deterministički isti period i regresijske testove.

### 10.7 Sumnja na sigurnosni incident

1. Ne brisati logove i ne resetirati sve sustave bez plana očuvanja evidencea.
2. Ograničiti pristup i opozvati kompromitirani credential prema odobrenom postupku.
3. Aktivirati privacy/security ownera.
4. Odvojiti potvrđene činjenice od pretpostavki.
5. Provjeriti tenant, opseg podataka, vrijeme i potencijalne primatelje.
6. Ako osobni podaci mogu biti pogođeni, dodati `POTENTIAL_PERSONAL_DATA_BREACH`.
7. BSS kao izvršitelj bez nepotrebnog odgađanja obavještava kupca-voditelja prema ugovoru i legal workflowu.
8. Support tim ne donosi sam odluku o prijavi AZOP-u ili obavještavanju radnika.

## 11. Ručni attendance fallback

Kupac prije live pilota mora imati odobren obrazac koji sadrži najmanje:

- datum;
- lokaciju;
- identifikator radnika prema odobrenom procesu;
- planiranu smjenu;
- vrijeme dolaska;
- vrijeme odlaska;
- pauzu gdje je relevantno;
- razlog ručnog zapisa;
- incident ID;
- osobu koja je zapis zaprimila;
- osobu koja je odobrila naknadni unos;
- datum i vrijeme reconciliacije u BSS;
- referencu na audit zapis.

Ručni fallback ne smije prikupljati više osobnih podataka nego što je potrebno za evidenciju.

## 12. Customer communication predlošci

### 12.1 Potvrda primitka

> Zaprimili smo prijavu `[ID]` u `[vrijeme]`. Trenutno provjeravamo opseg i utjecaj. Sljedeće ažuriranje šaljemo do `[vrijeme]`. Molimo nemojte ponavljati istu radnju ako bi mogla proizvesti duple zapise. Za nastavak evidencije koristite `[odobreni fallback]`.

### 12.2 Aktivna istraga

> Incident `[ID]` je klasificiran kao `[severity]`. Potvrđeni utjecaj trenutno obuhvaća `[opseg]`. Uzrok još nije potvrđen. Aktivni workaround je `[postupak]`. Sljedeće ažuriranje šaljemo do `[vrijeme]`.

### 12.3 Workaround

> Usluga još nije potpuno vraćena. Za privremeni nastavak rada koristite `[workaround]`. Originalne zapise nemojte brisati ni ručno prepisivati. Naknadna reconciliacija provest će se uz audit trag.

### 12.4 Vraćena usluga

> Funkcija je vraćena u `[vrijeme]` i trenutno je u fazi praćenja. Provjerili smo `[dokazi]`. Molimo potvrdite rezultat za `[konkretan test]`. Ručne zapise nastale tijekom prekida još treba reconciliirati prema dogovorenom postupku.

### 12.5 Zatvaranje

> Incident `[ID]` zatvaramo nakon potvrde vraćene usluge i dovršene komunikacije. Sažetak utjecaja: `[opis]`. Privremeni workaround: `[opis]`. Trajna korekcija ili follow-up: `[akcija/issue]`. Nisu potvrđene druge pogođene funkcije osim `[opseg]`.

### 12.6 Sigurnost/privacy

> Istražujemo sigurnosni događaj `[ID]`. Trenutno su potvrđene samo sljedeće činjenice: `[činjenice]`. BSS je aktivirao sigurnosni i privacy postupak te čuva evidence. Daljnje regulatorne i komunikacijske odluke vode se kroz odgovorni controller/privacy proces.

## 13. Pravila komunikacije

- ne koristiti riječ `sigurno` dok istraga nije završena;
- ne navoditi root cause prije dokaza;
- ne obećavati točno vrijeme popravka bez potvrđenog plana;
- svaki update mora imati vrijeme sljedećeg updatea;
- koristiti isti incident ID u svim kanalima;
- odvojiti customer impact od tehničkih detalja;
- ne slati tajne, cijele logove ili osobne podatke e-mailom bez odobrenog sigurnog kanala;
- ne okrivljavati kupca ili treću stranu bez potvrđenih činjenica;
- za širi outage koristiti jedan autoritativni status, ne različite poruke različitim kupcima.

## 14. Evidence i vremenska linija

Za SEV-1/SEV-2 voditi vremensku liniju:

- vrijeme prve dojave;
- vrijeme potvrde primitka;
- početni i promijenjeni severity;
- ključne provjere i rezultate;
- deploy/config događaje;
- workaround aktivaciju;
- sve customer updateove;
- vrijeme vraćanja funkcije;
- verification dokaz;
- vrijeme closurea;
- vlasnika post-incident reviewa.

Evidence mora biti minimalan, relevantan i zaštićen. Osobni podaci se maskiraju ili pseudonimiziraju gdje je moguće.

## 15. Recovery verification

Incident se ne proglašava riješenim samo zato što je servis ponovno `up`.

Provjera prema vrsti incidenta može uključivati:

- login, refresh i logout;
- tenant i RBAC negativne provjere;
- jedan kontrolirani RFID/attendance roundtrip;
- offline queue i sync idempotency;
- audit zapis korekcije;
- izvještaj za poznati testni period;
- health i error-rate stabilnost;
- restore ili rollback dokaz;
- kupčevu potvrdu konkretnog poslovnog toka.

## 16. Post-incident review

Obvezan za:

- svaki SEV-1;
- ponavljajući SEV-2;
- sigurnosni incident;
- moguću povredu osobnih podataka;
- incident s pogrešnim ili izgubljenim attendance podacima;
- incident koji je probio odobreni interni cilj;
- incident koji je pokazao da fallback ne funkcionira.

Minimalna struktura:

1. što se dogodilo;
2. poslovni i podatkovni utjecaj;
3. vremenska linija;
4. što je dobro funkcioniralo;
5. što nije funkcioniralo;
6. tehnički root cause ili status istrage;
7. contributing factors;
8. zašto postojeće kontrole nisu spriječile ili ranije otkrile problem;
9. corrective actions s vlasnikom i rokom;
10. test kojim se dokazuje da se problem neće tiho ponoviti;
11. treba li ažurirati runbook, trening, monitoring, ugovor ili proizvod.

Post-incident review nije dokument za traženje krivca.

## 17. Predložene metrike

Metrike se ne koriste kao marketinške tvrdnje dok nema dovoljno stvarnih podataka.

- broj slučajeva po severityju;
- vrijeme do potvrde primitka;
- vrijeme do aktivnog workarounda;
- vrijeme do vraćanja usluge;
- broj ponovljenih incidenata;
- broj ručnih attendance zapisa tijekom prekida;
- postotak uspješno reconciliiranih zapisa;
- broj incidenta bez jasnog ownera;
- broj incidenta bez closure evidencea;
- broj sigurnosnih/privacy eskalacija;
- customer-confirmed resolution rate;
- corrective actions zatvorene u roku.

## 18. Tabletop scenariji

### T-01: Terminal bez struje na početku smjene

Očekivani dokaz:

- support intake;
- SEV klasifikacija;
- ručni fallback;
- hardware eskalacija;
- customer update;
- reconciliacija testnih zapisa;
- closure evidence.

### T-02: Internet prekid i offline queue

Očekivani dokaz:

- potvrda podržane verzije;
- lokalni event count;
- idempotent sync nakon povratka mreže;
- bez duplikata;
- customer potvrda.

### T-03: Backend outage tijekom aktivne smjene

Očekivani dokaz:

- Incident Commander;
- fallback;
- monitoring signal;
- rollback ili recovery odluka;
- attendance roundtrip nakon oporavka;
- status update ritam.

### T-04: Pogrešan izvještaj za više radnika

Očekivani dokaz:

- zaustavljeno korištenje izvještaja;
- očuvani originalni podaci;
- data-integrity analiza;
- korekcija i regresijski test;
- kupčeva verifikacija.

### T-05: Sumnja na cross-tenant pristup

Očekivani dokaz:

- SEV-1;
- security/privacy owner;
- evidence preservation;
- ograničenje pristupa;
- controller notification workflow;
- bez neovlaštene regulatorne odluke support tima.

### T-06: Kompromitiran administratorski credential

Očekivani dokaz:

- opoziv sessiona/credentiala;
- audit review;
- scope assessment;
- reset/reinvite po odobrenom postupku;
- customer communication.

## 19. Fiktivni incident dry run

### Scenarij

Fiktivna firma `Pilottest d.o.o.` ima jedan terminal i 25 radnika. U 06:55 terminal se uključuje, ali nema mrežnu vezu. Backend je dostupan drugim korisnicima.

### Intake

- incident ID: `INC-DEMO-001`;
- prijava: 07:02;
- utjecaj: jedna lokacija, jedan terminal, jutarnja smjena;
- početni severity: `SEV-2`;
- oznake: `HARDWARE`, `TERMINAL_SYNC`, `CUSTOMER_ACTION_REQUIRED`;
- podaci nisu izgubljeni prema lokalnom statusu, ali sync nije potvrđen.

### Radnje

1. BSS potvrđuje primitak i zabranjuje ponavljanje RFID pokušaja.
2. Provjerava se je li offline queue dio dokazano podržane verzije.
3. Budući da dry run još nema dokaz offline queuea, aktivira se ručni obrazac.
4. Kupac bilježi dolaske 25 radnika ručno.
5. Tehnički owner utvrđuje neispravan mrežni kabel.
6. Veza se vraća u 07:28.
7. Izvršava se jedan kontrolirani terminal event.
8. Ručni zapisi se unose kao autorizirane korekcije uz incident ID i audit razlog.
9. Kupac potvrđuje da je evidencija potpuna.
10. Incident prelazi u `MONITORING`, zatim `RESOLVED` i `CLOSED`.

### Nalaz

- workaround je spriječio gubitak evidencije;
- nije dokazano da offline queue radi, pa feature ostaje `BLOCKED/PARTIAL` do tehničkog testa;
- corrective action: dodati cable/LED/network check u instalacijski checklist;
- corrective action: provesti zaseban offline-sync tabletop nakon issuea #55;
- nijedan stvarni osobni podatak nije korišten.

## 20. Live-pilot support gate

Status ostaje `BLOCKED` dok ne postoje svi sljedeći dokazi:

| ID | Dokaz | Status |
|---|---|---|
| SUP-001 | odobren support kanal | `OPEN` |
| SUP-002 | odobreno support radno vrijeme | `OPEN` |
| SUP-003 | imenovan primary i backup owner | `OPEN` |
| SUP-004 | customer-facing support terms | `OPEN` |
| SUP-005 | monitoring i alert routing dokaz | `OPEN` |
| SUP-006 | terminal fallback dry run | `OPEN` |
| SUP-007 | backend outage tabletop | `OPEN` |
| SUP-008 | auth incident tabletop | `OPEN` |
| SUP-009 | privacy/security tabletop | `OPEN` |
| SUP-010 | restore/rollback dokaz | `OPEN` |
| SUP-011 | ručni attendance obrazac odobren | `OPEN` |
| SUP-012 | incident intake alat odabran | `OPEN` |
| SUP-013 | customer communication predlošci odobreni | `OPEN` |
| SUP-014 | post-incident review predložak testiran | `OPEN` |
| SUP-015 | support metrics i review cadence odobreni | `OPEN` |

## 21. Approval statusi

- `PROPOSED`: dokument postoji, ali operativni resursi i termini nisu potvrđeni;
- `INTERNAL READY`: vlasnici, kanali, ciljevi i tabletopovi su potvrđeni testnim podacima;
- `PILOT APPROVED`: support model je odobren za točno određenu pilot-firmu i ugovoreni opseg;
- `CONTRACTED`: customer-facing obveze postoje u potpisanom dokumentu;
- `PROVEN`: stvarni incident ili kontrolirana vježba dokazali su da postupak radi.

Merge ovog dokumenta mijenja samo status dokumentacije. Ne podiže support model na `INTERNAL READY`, `PILOT APPROVED`, `CONTRACTED` ili `PROVEN`.
