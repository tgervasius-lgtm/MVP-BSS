# BSS Customer Discovery & Outreach Pack

| Polje | Vrijednost |
|---|---|
| Status | `PROPOSED` |
| Verzija | `0.1` |
| Datum | `2026-08-05` |
| Vlasnik | BSS Product Owner |
| Povezani issue | `#73` |
| Nadređeni workstream | `#68` i `docs/bss-os/SALES_CUSTOMER_ONBOARDING_OS.md` |
| Primjena | Prvi kontakt, discovery, kvalifikacija, demo poziv, follow-up i odluka o sljedećem koraku |
| Ne zamjenjuje | Privatni CRM, odobreni cjenik, potpisanu ponudu, ugovor, pravni savjet ili tehnički go-live dokaz |

## 1. Svrha

Ovaj dokument daje Tomislavu, njegovu bratu i budućem BSS prodajnom članu praktičan, ponovljiv način za:

1. pronaći realno zanimljivu tvrtku;
2. uspostaviti profesionalan prvi kontakt;
3. razumjeti kako tvrtka danas evidentira radno vrijeme;
4. provjeriti postoji li dovoljno jak problem;
5. utvrditi odgovara li tvrtka stvarnom BSS MVP opsegu;
6. dogovoriti demo bez lažnih obećanja;
7. pravilno pratiti interes i sljedeću radnju;
8. zatvoriti ili odgoditi priliku bez beskonačnog naganjanja.

Cilj discovery razgovora nije odmah prodati BSS. Cilj je doći do poštenog odgovora na pitanje:

> Ima li ova tvrtka problem koji BSS može stvarno riješiti u kontroliranom pilotu, uz prihvatljiv opseg, vrijeme i rizik?

## 2. Obvezne granice

### 2.1 Što se ne smije tvrditi

Dok odgovarajući dokaz ne postoji, ne smije se govoriti:

- da je BSS potpuno produkcijski spreman;
- da već radi kod više stvarnih klijenata;
- da je pilot dostupan odmah na bilo koji datum;
- da je određena cijena konačna ili odobrena;
- da BSS jamči GDPR usklađenost kupca;
- da BSS zamjenjuje računovodstveni ili payroll sustav;
- da sustav ne može pogriješiti ili pasti;
- da je neka funkcija gotova ako postoji samo u Previewu, mockupu, issueu ili otvorenom PR-u;
- da RFID/NFC terminal automatski rješava svaki problem evidencije;
- da BSS smije automatski donositi disciplinske odluke o radnicima.

### 2.2 Dopušten statusni jezik

| Status | Vanjsko značenje |
|---|---|
| `RELEASED` | Funkcija je dio jasno deklarirane izdane verzije. |
| `IMPLEMENTED` | Funkcija postoji u kodu, ali možda još ima release ili produkcijske gateove. |
| `PREVIEW` | Funkcija ili tok postoji samo u demonstracijskom okruženju. |
| `PROPOSED` | Postoji definiran prijedlog, ali nema odobrene isporuke. |
| `BLOCKED` | Funkcija ili proces ne može sigurno prijeći dalje dok se blocker ne zatvori. |
| `ROADMAP` | Smjer ili buduća ideja bez obećanog roka. |

Najsigurnija rečenica je:

> "To možemo pokazati kao Preview ili planirani tok, ali nećemo ga predstavljati kao izdanu produkcijsku funkciju dok ne prođe odgovarajuće provjere."

### 2.3 Privatnost prospect podataka

Javni GitHub repozitorij smije sadržavati samo:

- proces;
- prazne obrasce;
- fiktivne primjere;
- odobrene poruke;
- anonimne agregirane lekcije.

Ne smije sadržavati:

- stvarna imena kontakata;
- izravne e-mail adrese;
- brojeve telefona;
- privatne LinkedIn profile;
- detaljne bilješke o pojedincima;
- povjerljive informacije tvrtke;
- fotografije lokacije kupca;
- ugovore i ponude sa stvarnim podacima;
- osobne podatke radnika.

Takvi podaci moraju biti u privatnom CRM-u ili drugom odobrenom ograničenom sustavu.

## 3. Koga prvo kontaktirati

### 3.1 Najbolji rani profil

Najbolje prve tvrtke obično imaju:

- 10–100 radnika u početnom opsegu;
- jednu glavnu lokaciju;
- jednu ili više smjena;
- papir, Excel ili stariji sustav koji im stvara probleme;
- česte ručne korekcije dolazaka i odlazaka;
- voditelje koji troše vrijeme na provjeru prisutnosti;
- vidljiv problem s godišnjima, korekcijama ili izvještajima;
- osobu koja može odlučiti o pilotu;
- osobu koja bi bila administrator ili voditelj pilota;
- spremnost na ograničen pilot, ne odmah puni rollout.

### 3.2 Preporučeni sektori za istraživanje

Prioritet nisu sektori zbog imena, nego zbog operativnog problema. Potencijalno zanimljivi su:

- proizvodnja;
- skladišta i logistika;
- metalna industrija;
- građevinske i servisne tvrtke sa stalnim lokacijama;
- čišćenje i facility management;
- manji trgovački i ugostiteljski lanci;
- autoservisi i radionice;
- domovi, ustanove i organizacije sa smjenskim radom;
- druge tvrtke s više radnika, smjenama i ručnom administracijom.

Za prvi pilot treba izbjegavati izrazito složene organizacije s velikim brojem lokacija, sindikalnim ili integracijskim zahtjevima koje BSS još ne može kontrolirano podržati.

### 3.3 Koga unutar tvrtke tražiti

Najčešći relevantni kontakti:

- vlasnik ili direktor manje tvrtke;
- direktor operacija;
- voditelj proizvodnje ili skladišta;
- HR ili kadrovska administracija;
- osoba odgovorna za evidenciju radnog vremena;
- administracija ili računovodstvo, ako oni ručno pripremaju sate;
- IT kao tehnički evaluator, ali ne nužno poslovni decision-maker.

Prvi cilj nije doći do "najviše osobe" pod svaku cijenu. Cilj je doći do osobe koja zna kako proces stvarno radi i može uključiti osobu koja odlučuje.

## 4. Pre-call research checklist

Početno istraživanje ograničiti na približno 10–15 minuta.

### 4.1 Prikupiti

- naziv tvrtke;
- djelatnost;
- javno dostupnu lokaciju ili lokacije;
- približan broj radnika ako je javno razumno procjenjiv;
- postoje li naznake smjenskog rada;
- javni kontakt kanal;
- razlog zašto bi evidencija radnog vremena mogla biti relevantna;
- tko je BSS owner prilike;
- jedna rečenica hipoteze problema.

### 4.2 Ne prikupljati

- privatne adrese zaposlenika;
- privatne brojeve i e-mailove bez poslovne potrebe;
- obiteljske ili osobne podatke decision-makera;
- informacije koje nisu relevantne za BSS;
- masovno scrapeane podatke;
- osjetljive informacije iz neprovjerenih izvora.

### 4.3 Hipoteza prije kontakta

Obrazac:

> "Tvrtka [NAZIV] možda ima problem s [PROCES] jer [JAVNO VIDLJIVA OPERATIVNA ZNAČAJKA]. To moramo potvrditi discovery razgovorom."

Primjer s potpuno fiktivnom tvrtkom:

> "Tvrtka Slavonija Metal Test d.o.o. možda ima veći broj ručnih korekcija i sporiju pripremu sati jer radi u dvije smjene na jednoj proizvodnoj lokaciji."

## 5. Prvi telefonski kontakt

### 5.1 Cilj poziva

Cilj prvog poziva nije odraditi cijelu prodaju. Cilj je:

- potvrditi relevantnu osobu;
- u 20–40 sekundi objasniti razlog poziva;
- dogovoriti 15–25 minuta discovery razgovora;
- ili dobiti jasan razlog zašto prilika nije relevantna.

### 5.2 Uvod preko centrale ili recepcije

> "Dobar dan. Zovem iz Bognar Smart Systems. Razvijamo sustav za evidenciju radnog vremena putem RFID/NFC terminala i web sučelja. Trebao bih kratko razgovarati s osobom koja kod vas vodi evidenciju radnog vremena ili odlučuje o takvim sustavima. Možete li me uputiti kome se najbolje javiti?"

Ne tražiti odmah "direktora" bez razloga. To često zvuči generički i prodajno.

### 5.3 Uvod relevantnoj osobi

> "Dobar dan, ovdje Tomislav Bognar iz Bognar Smart Systems. Razvijamo jednostavniji sustav za evidenciju radnog vremena za tvrtke koje još imaju dosta ručne administracije, Excela ili nepovezanih podataka. Ne zovem da vam odmah nešto prodam. Želio bih u kratkom razgovoru razumjeti kako vi danas vodite dolaske, korekcije i izvještaje te postoji li uopće problem koji bi bilo smisleno pokazati kroz demo. Imate li ovaj ili neki drugi dan 15 do 20 minuta?"

### 5.4 Kraća izravna verzija

> "Dobar dan, Tomislav Bognar iz BSS-a. Razvijamo RFID/NFC evidenciju radnog vremena s web pregledom za upravu, voditelje i radnike. Trenutačno provjeravamo s hrvatskim tvrtkama gdje postoje stvarni problemi s Excelom, korekcijama i pregledom prisutnosti. Tko je kod vas najbolja osoba za jedan kratak razgovor o tome?"

### 5.5 Kada osoba odmah pita za cijenu

> "Imamo nekoliko radnih modela, ali još ne želim izgovoriti broj bez osnovnih informacija o broju radnika, lokacija, terminala i opsegu podrške. Cijena još nije formalno odobrena za vanjske ponude. Prvo možemo provjeriti odgovara li vam sustav, a konkretna ponuda bi išla tek nakon jasnog opsega."

### 5.6 Kada osoba kaže da nema vremena

> "Razumijem. Mogu poslati vrlo kratak e-mail s dvije rečenice i prijedlogom termina. Koji je najbolji poslovni kontakt ili je bolje da se javim ponovno određeni dan?"

### 5.7 Kada osoba kaže da nije zainteresirana

> "U redu, hvala vam na jasnom odgovoru. Da vas više ne kontaktiramo bez novog razloga: je li problem u tome što već imate sustav koji vam odgovara ili vam evidencija trenutačno nije prioritet?"

Ne raspravljati i ne pritiskati. Razlog je vrijedan podatak, ali odgovor nije obvezan.

## 6. Prvi e-mail

### 6.1 Predmet poruke

Mogući predmeti:

- `Kratko pitanje o evidenciji radnog vremena u [TVRTKA]`
- `RFID/NFC evidencija radnog vremena — 15 min razgovora`
- `Kako danas rješavate dolaske, korekcije i izvještaje?`
- `BSS — provjera interesa za kontrolirani pilot`

Izbjegavati:

- `REVOLUCIONARNI SUSTAV`;
- `POSEBNA PONUDA`;
- `UŠTEDITE 50%` bez dokaza;
- umjetnu hitnost i velika slova.

### 6.2 Standardni prvi e-mail

> Poštovani,
>
> moje ime je Tomislav Bognar i razvijamo Bognar Smart Systems — sustav za evidenciju radnog vremena putem RFID/NFC terminala i web sučelja.
>
> Trenutačno razgovaramo s tvrtkama koje imaju ručni unos, Excel, česte korekcije ili slab pregled prisutnosti i sati. Cilj nije odmah slati ponudu, nego u kratkom razgovoru provjeriti kako vaš proces danas izgleda i bi li naš MVP uopće imao smisla za vašu tvrtku.
>
> Biste li imali 15–20 minuta za kratak razgovor tijekom sljedećih dana?
>
> Važno: sustav je još u završnoj fazi tehničke i operativne pripreme. Demo i pilot ne predstavljamo kao gotovu produkcijsku uslugu prije završnih provjera.
>
> Lijep pozdrav,
> Tomislav Bognar
> Bognar Smart Systems

### 6.3 Kraći e-mail nakon telefonskog kontakta

> Poštovani,
>
> hvala na kratkom telefonskom razgovoru. Kao što smo spomenuli, BSS razvija RFID/NFC evidenciju radnog vremena s web pregledima za upravu, voditelje, radnike i knjigovodstvo.
>
> Predlažem 20-minutni razgovor kako bismo prošli vaš sadašnji proces, broj radnika/lokacija, glavne poteškoće i vidjeli ima li smisla organizirati demo.
>
> Predloženi termini:
> - [TERMIN 1]
> - [TERMIN 2]
>
> Lijep pozdrav,
> Tomislav Bognar

## 7. LinkedIn ili kratka poslovna poruka

> Pozdrav [IME], razvijamo Bognar Smart Systems — RFID/NFC evidenciju radnog vremena s web pregledom za upravu, voditelje i radnike. Trenutačno razgovaramo s hrvatskim tvrtkama koje imaju dosta ručnih korekcija, Excela ili slab pregled prisutnosti. Ne šaljem odmah ponudu; zanima me 15-minutni razgovor da vidimo postoji li kod vas stvaran problem koji bi imao smisla pokazati kroz demo. Je li to tema za vas ili neku drugu osobu u tvrtki?

Kod platformi s kratkim limitom:

> Pozdrav, razvijamo BSS RFID/NFC evidenciju radnog vremena. Tražimo tvrtke za kratak discovery razgovor o Excelu, korekcijama i pregledima prisutnosti. Tko je kod vas prava osoba za ovu temu?

## 8. Discovery razgovor

### 8.1 Trajanje i struktura

Preporučeno trajanje: 20–35 minuta.

1. Uvod i cilj — 2 minute
2. Sadašnji proces — 8–12 minuta
3. Problemi i posljedice — 5–8 minuta
4. Opseg, odluka i vrijeme — 5–8 minuta
5. Sažetak i sljedeći korak — 3–5 minuta

### 8.2 Otvaranje razgovora

> "Hvala vam na vremenu. Moj cilj danas nije prezentirati svaki ekran niti vas uvjeravati pod svaku cijenu. Želim razumjeti kako danas evidentirate radno vrijeme, gdje nastaju problemi i odgovara li vaš slučaj realnom BSS MVP opsegu. Na kraju možemo pošteno odlučiti ima li smisla demo, kasniji kontakt ili nikakav daljnji korak."

### 8.3 Pitanja o sadašnjem procesu

- Kako radnici danas evidentiraju dolazak i odlazak?
- Koristite li papir, Excel, kartice, postojeći terminal ili kombinaciju?
- Tko svakodnevno provjerava evidenciju?
- Kako rješavate zaboravljenu prijavu ili pogrešno vrijeme?
- Tko smije ispraviti zapis?
- Postoji li audit ili trag tko je što promijenio?
- Kako voditelji vide tko je prisutan?
- Kako radnik vidi svoje sate i nepravilnosti?
- Kako se podnose i odobravaju godišnji odmori?
- Kako podaci dolaze do računovodstva?
- Koliko se toga ručno prepisuje?
- Koliko sustava ili tablica sudjeluje u procesu?

### 8.4 Pitanja o opsegu

- Koliko ukupno imate radnika?
- Koliko bi ih bilo u prvom pilot-opsegu?
- Koliko lokacija imate?
- Koliko smjena postoji?
- Ima li noćnog i prekovremenog rada?
- Postoje li terenski radnici ili bi pilot bio samo na jednoj lokaciji?
- Koliko terminala bi realno trebalo u početnom opsegu?
- Tko bi bio administrator sustava?
- Koliko voditelja treba zaseban pregled?
- Treba li računovodstvu samo pregled/izvoz ili očekuju payroll obračun?

### 8.5 Pitanja o problemu

- Koji je najčešći problem u sadašnjem procesu?
- Što vam oduzima najviše vremena?
- Gdje najčešće dolazi do pogrešaka ili rasprave?
- Koliko često nedostaju prijave ili su vremena pogrešna?
- Koliko osoba sudjeluje u ispravljanju podataka?
- Kada se problem najviše osjeti — dnevno, tjedno ili kod obračuna mjeseca?
- Što se događa ako se ništa ne promijeni sljedećih godinu dana?
- Postoji li konkretan razlog zašto ovu temu razmatrate sada?

Ne nuditi uštedu prije nego osoba opiše problem svojim riječima.

### 8.6 Pitanja o postojećem sustavu

- Što vam se sviđa u sadašnjem rješenju?
- Što vam nedostaje?
- Koliko je sustav pouzdan?
- Imate li ugovornu obvezu prema postojećem dobavljaču?
- Možete li izvesti postojeće podatke?
- Postoje li integracije bez kojih ne možete?
- Je li problem u alatu, procesu, disciplini korištenja ili svemu zajedno?

### 8.7 Pitanja o odluci

- Tko mora sudjelovati u odluci o pilotu?
- Tko daje tehničko odobrenje?
- Tko vodi zaštitu podataka i obavijest radnicima?
- Tko bi svakodnevno vodio pilot?
- Postoji li budžet ili se prvo mora dokazati vrijednost?
- Kada bi najranije imalo smisla testirati rješenje?
- Koji događaj ili rok utječe na odluku?
- Što bi za vas bio dokaz uspješnog pilota?

### 8.8 Pitanja o privatnosti i prihvaćanju

- Kako danas obavještavate radnike o evidenciji?
- Postoje li posebne interne procedure ili radničko vijeće?
- Tko kod vas odlučuje o rokovima čuvanja i pristupima?
- Imate li već DPO-a, pravnika ili vanjskog stručnjaka?
- Postoji li zabrinutost da sustav postane alat za nepotrebno praćenje?
- Koje podatke smatrate nužnima, a koje ne želite prikupljati?

BSS mora jasno reći da biometrija, GPS i profiliranje radnika nisu dio MVP-a.

### 8.9 Pitanja o instalaciji

- Postoji li prikladno mjesto za terminal?
- Ima li stabilne struje i mreže?
- Kakva je očekivana frekvencija prolazaka radnika?
- Postoji li rizik prašine, vlage, udara ili neovlaštenog pristupa?
- Tko može odobriti montažu?
- Postoji li fallback kada terminal ili mreža ne rade?

Ovo nije konačna instalacijska inspekcija; služi samo za rani fit.

## 9. Pravilo tri razine problema

Nakon discoveryja problem klasificirati:

### Razina A — jaka bol

- problem je čest;
- troši vrijeme više osoba;
- stvara pogreške, kašnjenje ili sporove;
- uprava želi promjenu;
- postoji vremenski razlog za djelovanje.

### Razina B — stvaran, ali ne hitan problem

- postoji nezadovoljstvo;
- posljedice nisu dovoljno velike;
- nema jasnog roka ili vlasnika;
- demo ima smisla, ali pilot još ne.

### Razina C — zanimljivost bez problema

- osoba samo razgledava;
- postojeći sustav zadovoljava potrebe;
- nema ownershipa, budžeta ni vremena;
- traže funkcije izvan MVP-a;
- nema razloga za daljnji aktivni rad.

Ne pokušavati pretvoriti Razinu C u hitan pilot pritiskom.

## 10. Kvalifikacijski rezultat

Svaku kategoriju ocijeniti od 0 do 2.

| Kategorija | 0 | 1 | 2 |
|---|---|---|---|
| Jačina problema | problem nije potvrđen | smetnja | značajna operativna bol |
| Učestalost | rijetko | povremeno | dnevno/tjedno |
| MVP fit | zahtijeva ključne funkcije izvan opsega | djelomičan fit | odgovara MVP-u |
| Pilot-opseg | prevelik ili nejasan | moguće uz smanjenje | 1 lokacija, kontroliran broj radnika |
| Decision-maker | nije poznat | influencer uključen | decision-maker uključen |
| Operativni owner | nema ga | moguć, ali nepotvrđen | imenovan |
| Vrijeme | nema roka | 3–12 mjeseci | odluka unutar 90 dana |
| Privatnost/legal | odbijaju proces | treba edukaciju | prihvaćaju DPA/DPIA/notice gate |
| Tehnički uvjeti | zasad neprihvatljivi | rješivi | odgovaraju pilotu |
| Komercijalni put | nema budžeta ni modela odluke | nejasno | postoji realan put do odluke |

Maksimum: 20.

- `16–20`: snažan kandidat za demo i pilot pre-check.
- `12–15`: kvalificirana prilika; zatvoriti rupe prije pilot obećanja.
- `8–11`: nurture; bez intenzivnog trošenja vremena.
- `0–7`: zatvoriti ili diskvalificirati.

Hard blocker uvijek nadjačava rezultat.

## 11. Hard blockeri

Bez obzira na rezultat, pilot se ne obećava kada kupac zahtijeva:

- payroll obračun kao obvezni uvjet;
- biometriju, GPS, geofencing ili stalno praćenje;
- otvaranje vrata;
- punu mobilnu aplikaciju prije pilota;
- produkciju prije završnih BSS gateova;
- nekontrolirani custom development;
- brisanje ili izmjenu originalnih evidencija bez traga;
- izbjegavanje DPA/DPIA/obavijesti radnicima;
- automatsko kažnjavanje radnika;
- neprihvatljiv sigurnosni ili etički model;
- rok koji BSS ne može pošteno podržati.

## 12. Sažetak razgovora

Na kraju razgovora izgovoriti sažetak:

> "Da provjerim jesam li dobro razumio: danas koristite [SADAŠNJI PROCES], najveći problem je [PROBLEM], u prvom opsegu bilo bi [RADNICI/LOKACIJE/SMJENE], a odluku uključuju [ULOGE]. Najvažnije vam je dokazati [MJERILO USPJEHA]. Jesam li nešto bitno pogrešno shvatio?"

Zatim dogovoriti samo jedan sljedeći korak.

Mogući sljedeći koraci:

- demo;
- dodatni razgovor s decision-makerom;
- tehnički/site pre-check;
- privatnost/legal razgovor;
- nurture do konkretnog datuma;
- zatvaranje prilike.

## 13. Poziv na demo

### 13.1 Kada demo ima smisla

Demo organizirati kada su potvrđeni:

- stvaran problem;
- barem djelomičan MVP fit;
- relevantna osoba;
- realan sljedeći korak;
- razumijevanje da je Preview demonstracija, ne produkcija.

### 13.2 E-mail poziv na demo

> Poštovani,
>
> hvala na otvorenom razgovoru. Prema onome što smo prošli, najveće teme su:
>
> - [PROBLEM 1]
> - [PROBLEM 2]
> - [PROBLEM 3]
>
> Predlažem kontrolirani BSS demo od približno 30 minuta. Pokazali bismo relevantne tokove za upravu, voditelja, radnika i knjigovodstvo, uz jasno razlikovanje Preview funkcija od onoga što je tehnički implementirano i onoga što još ima produkcijske gateove.
>
> Predloženi termini:
> - [TERMIN 1]
> - [TERMIN 2]
>
> Za demo nije potrebno slati stvarne podatke radnika. Koristit ćemo isključivo fiktivne ili agregirane podatke.
>
> Lijep pozdrav,
> Tomislav Bognar

### 13.3 Tko treba biti na demu

Poželjno:

- osoba koja razumije sadašnji proces;
- decision-maker;
- budući operativni administrator;
- po potrebi HR/računovodstvo/IT.

Nije nužno odmah uključiti deset osoba. Bolje je imati 2–4 relevantne osobe.

## 14. Follow-up cadence

### Dan 0 — prvi kontakt

Poslati relevantnu, personaliziranu poruku.

### Dan 3 — prvi follow-up

> Poštovani,
>
> samo kratko provjeravam jeste li uspjeli vidjeti moju poruku o evidenciji radnog vremena. Najviše nas zanima kako tvrtke danas rješavaju ručne korekcije, pregled prisutnosti i pripremu podataka za računovodstvo.
>
> Ima li ova tema smisla za kratak razgovor ili je kod vas već dobro riješena?
>
> Lijep pozdrav,
> Tomislav

### Dan 8 — završni aktivni follow-up

> Poštovani,
>
> javljam se još jednom kako vam ne bih slao ponovljene poruke bez potrebe. Ako su evidencija radnog vremena, korekcije ili smjenski pregled trenutačno relevantni, rado bih organizirao 15-minutni razgovor.
>
> Ako tema nije aktualna, dovoljno je kratko odgovoriti i neću dalje pratiti ovu priliku bez novog konkretnog razloga.
>
> Lijep pozdrav,
> Tomislav

### Dan 21–30

- bez odgovora: `NURTURE` ili `LOST_NO_RESPONSE`;
- postaviti datum mogućeg ponovnog kontakta samo kada postoji razlog;
- ne slati generičke poruke svaki mjesec.

### Nakon discovery razgovora

Follow-up poslati isti ili sljedeći radni dan.

> Poštovani,
>
> hvala na razgovoru. Moj sažetak:
>
> - sadašnji proces: [SAŽETAK]
> - najveći problem: [PROBLEM]
> - prvi mogući opseg: [OPSEG]
> - ključne osobe: [ULOGE, BEZ NEPOTREBNIH OSOBNIH PODATAKA]
> - otvorene teme: [TEME]
> - dogovoreni sljedeći korak: [KORAK I DATUM]
>
> Molim vas javite ako sam nešto pogrešno zapisao.
>
> Lijep pozdrav,
> Tomislav Bognar

## 15. Objection handling

Cilj nije "pobijediti" prigovor. Cilj je razumjeti je li prigovor:

- stvaran blocker;
- nedostatak informacija;
- odgoda;
- pristojan način odbijanja.

### 15.1 "Mi već imamo Excel i to nam radi"

> "To je potpuno moguće. Ne tvrdimo da svaka tvrtka mora zamijeniti Excel. Zanima me samo koliko ručnog rada, provjera i korekcija postoji oko njega. Ako je proces brz, točan i svima jasan, možda BSS trenutno nije potreban."

Pitanje:

> "Koliko osoba sudjeluje u pripremi i provjeri evidencije na kraju mjeseca?"

### 15.2 "Već imamo drugi sustav"

> "Dobro je da sustav već postoji. Ne želimo mijenjati nešto što vam radi. Koji dio vam je najbolji, a postoji li nešto što vam i dalje stvara problem?"

Ako nema problema, zatvoriti ili nurture.

### 15.3 "To će biti preskupo"

> "Cijena još nije formalno odobrena i ne želim vas uvjeravati bez stvarnog opsega. Prvo trebamo znati broj radnika, lokacija, terminala, instalaciju i podršku. Nakon toga se može pošteno usporediti cijena s današnjim troškom ručnog rada i grešaka."

Ne koristiti radne raspone kao gotovu ponudu.

### 15.4 "Radnici neće prihvatiti praćenje"

> "To je legitimna tema. MVP nije zamišljen za GPS, biometriju ili stalno praćenje kretanja. Evidentira događaje potrebne za radno vrijeme, uz jasna pravila pristupa i obavijest radnicima. Prije stvarnog pilota kupac mora riješiti transparentnost, DPIA i druge potrebne korake."

### 15.5 "Je li to GDPR compliant?"

> "BSS gradi tehničke i organizacijske kontrole za zakonitu obradu, ali nećemo dati bezuvjetnu pravnu garanciju. Kupac ostaje odgovoran za svrhu, pravni temelj, transparentnost i odluke o radnicima, a BSS za svoje obveze izvršitelja obrade. Prije live pilota tražimo DPA, customer-specific DPIA, obavijest radnicima i provjeru podizvršitelja."

### 15.6 "Što ako terminal ili internet ne radi?"

> "To je jedan od ključnih pilot scenarija. Terminalski tok mora imati kontrolirano ponašanje za privremeni offline rad, retry i idempotency, a kupac mora imati dokumentirani fallback. Nećemo tvrditi da je taj dio spreman za live pilot dok ne bude tehnički i operativno dokazano."

### 15.7 "Trebamo obračun plaće"

> "BSS MVP priprema i prikazuje evidenciju radnog vremena i izvještaje. Ne predstavlja payroll sustav i ne računa plaću, poreze ili doprinose. Ako je payroll uvjet prvog projekta, trenutačno nismo odgovarajući dobavljač."

### 15.8 "Trebamo mobilnu aplikaciju i GPS"

> "To nije dio prvog MVP-a. Mobilna aplikacija i GPS/geofencing ne smiju se obećati kao dio prvog pilota. Možemo evidentirati zahtjev za roadmap, ali odluka i rok ne postoje."

### 15.9 "Možemo li krenuti idući tjedan?"

> "Ne mogu obećati live pilot prije završnih software, infrastruktura, hardware, privacy i dry-run gateova. Možemo odmah odraditi discovery i demo, a realni termin pilota potvrditi tek kada readiness dokazi budu zatvoreni."

### 15.10 "Pošaljite samo ponudu"

> "Mogu poslati okvir strukture, ali odgovorna ponuda traži barem broj radnika, lokacija, terminala, instalacijske uvjete i opseg podrške. Bez toga bi broj bio nagađanje i mogao bi biti pogrešan za obje strane."

## 16. No-response, lost i disqualified pravila

### 16.1 `LOST_NO_RESPONSE`

Koristiti kada:

- prošla su dva razumna follow-upa;
- nema odgovora;
- nema novog konkretnog razloga za kontakt;
- ne postoji dogovoreni budući datum.

### 16.2 `NURTURE`

Koristiti kada:

- problem postoji;
- tajming nije sada;
- postoji konkretan događaj ili datum za ponovni razgovor;
- osoba je pristala na kasniji kontakt.

Obvezno zapisati datum i razlog.

### 16.3 `LOST_EXISTING_SOLUTION`

Postojeće rješenje zadovoljava potrebe i nema dovoljno jakog problema.

### 16.4 `LOST_PRICE_OR_BUDGET`

Kupac ne vidi financijski put ni nakon jasnog opsega. Ne koristiti prije konkretne ponude kao automatsku pretpostavku.

### 16.5 `DISQUALIFIED_SCOPE`

Ključni zahtjevi su izvan MVP-a.

### 16.6 `DISQUALIFIED_PRIVACY_OR_ETHICS`

Kupac odbija obvezne privacy/legal korake ili traži neprihvatljivo praćenje i automatizirane disciplinske odluke.

## 17. Minimalni discovery zapis u privatnom CRM-u

### Identifikacija

- interni opportunity ID;
- tvrtka;
- djelatnost;
- lokacija;
- izvor lead-a;
- BSS owner;
- datum prvog kontakta.

### Proces

- sadašnji način evidencije;
- broj radnika u pilot-opsegu;
- lokacije;
- smjene;
- terminali;
- korekcije;
- godišnji;
- reporting/računovodstvo;
- postojeće integracije.

### Problem

- glavni problem;
- učestalost;
- posljedica;
- osobe koje problem pogađa;
- razlog za djelovanje sada.

### Odluka

- decision-maker;
- influencer;
- operativni owner;
- privacy/legal owner;
- tehnički/site owner;
- okvirni proces odluke;
- očekivani datum odluke.

### Kvalifikacija

- score 0–20;
- hard blockeri;
- fit kategorija;
- status prilike;
- jedan sljedeći korak;
- datum sljedećeg koraka;
- sažetak dogovora.

## 18. Fiktivni primjer

Svi podaci u ovom primjeru su izmišljeni.

### 18.1 Tvrtka

- Opportunity ID: `TEST-OPP-001`
- Naziv: `Slavonija Metal Test d.o.o.`
- Djelatnost: proizvodnja metalnih dijelova
- Radnici: 42 ukupno
- Pilot-opseg: 28 radnika
- Lokacije: 1
- Smjene: 2
- Trenutačno: papir + Excel

### 18.2 Potvrđeni problem

- voditelj svaki dan skuplja ručne ispravke;
- administracija krajem mjeseca prepisuje podatke;
- radnici ne vide jednostavno stanje svojih sati;
- direktor nema dnevni pregled prisutnosti;
- godišnji se podnose usmeno ili porukom.

### 18.3 Blockeri

- žele samo jednu lokaciju u pilotu: prihvatljivo;
- payroll nije obvezan: prihvatljivo;
- traže dokaz offline ponašanja: otvoreni tehnički gate;
- žele pravnu provjeru prije radničkih podataka: obvezno i prihvatljivo.

### 18.4 Score

| Kategorija | Ocjena |
|---|---:|
| Jačina problema | 2 |
| Učestalost | 2 |
| MVP fit | 2 |
| Pilot-opseg | 2 |
| Decision-maker | 2 |
| Operativni owner | 2 |
| Vrijeme | 1 |
| Privatnost/legal | 2 |
| Tehnički uvjeti | 1 |
| Komercijalni put | 1 |
| **Ukupno** | **17/20** |

### 18.5 Odluka

- Status: `QUALIFIED`
- Sljedeći korak: kontrolirani demo s direktorom, voditeljem i administracijom
- Pilot nije obećan
- Otvoreni gateovi: backend baseline, staging, hardware prihvat, DPIA/DPA i dry run

## 19. Discovery quality checklist

Prije označavanja prilike kao `QUALIFIED` provjeriti:

- [ ] Potvrđen je stvaran problem, ne samo opći interes.
- [ ] Poznat je sadašnji proces.
- [ ] Poznat je osnovni pilot-opseg.
- [ ] MVP ne ovisi o hard disqualifieru.
- [ ] Identificirana je osoba koja odlučuje ili jasan put do nje.
- [ ] Postoji mogući operativni owner.
- [ ] Privacy/legal koraci nisu odbijeni.
- [ ] Postoji razlog za djelovanje i okvirno vrijeme.
- [ ] Dogovoren je točno jedan sljedeći korak.
- [ ] Sljedeći korak ima datum i BSS ownera.
- [ ] Nije izrečena neodobrena cijena ili rok.
- [ ] Stvarni osobni podaci nisu zapisani u javnom GitHubu.

## 20. Demo handoff zapis

Prije demo prezentacije osoba koja vodi discovery mora predati:

- jednu rečenicu o tvrtki;
- tri najvažnija problema;
- relevantne uloge na sastanku;
- pilot-opseg;
- hard blockere;
- otvorena pitanja;
- koje BSS tokove pokazati;
- koje tokove ne pokazivati kao gotove;
- očekivanu odluku nakon demo sastanka.

## 21. Mjerenje kvalitete outreach procesa

Pratiti mjesečno, bez spremanja osobnih podataka u javni repo:

- broj istraženih tvrtki;
- broj kvalitetnih prvih kontakata;
- stopa odgovora;
- broj discovery razgovora;
- broj kvalificiranih prilika;
- broj demoa;
- broj pilot-kandidata;
- glavni razlozi `LOST` i `DISQUALIFIED`;
- prosječno vrijeme između kontakta i sljedeće radnje;
- prilike bez sljedeće radnje;
- broj slučajeva u kojima je kupac tražio funkciju izvan MVP-a.

Broj poslanih poruka sam po sebi nije uspjeh. Važniji su kvaliteta razgovora, potvrđen problem i disciplina sljedeće radnje.

## 22. Review i odobravanje vanjskih poruka

Prije stvarne kampanje Product Owner mora potvrditi:

- naziv tvrtke i brand koji se koristi;
- službeni e-mail i potpis;
- točan opis proizvoda;
- status Previewa;
- postoji li dopušteni poziv na pilot;
- koje datume se smije spominjati;
- cijenu ili zabranu spominjanja cijene;
- kontakt kanal za odgovor;
- pravila opt-outa i ponovnog kontakta;
- gdje se pohranjuju lead podaci.

Promjena ključne prodajne tvrdnje zahtijeva novu verziju ovog paketa ili odobrenu messaging bilješku.

## 23. Evidence index

| Evidence ID | Dokaz | Status prije vanjske uporabe |
|---|---|---|
| `OUT-001` | odobren opis BSS-a u jednoj rečenici | OPEN |
| `OUT-002` | odobren službeni e-mail potpis | OPEN |
| `OUT-003` | odobren telefonski uvod | OPEN |
| `OUT-004` | odobren prvi e-mail | OPEN |
| `OUT-005` | odobrene follow-up poruke | OPEN |
| `OUT-006` | privatni CRM ili ograničeni lead register | OPEN |
| `OUT-007` | discovery obrazac testiran fiktivnim podacima | DRAFT COMPLETE |
| `OUT-008` | qualification score testiran | DRAFT COMPLETE |
| `OUT-009` | odobren demo poziv | OPEN |
| `OUT-010` | Product Feature Registry usklađen s vanjskim tvrdnjama | OPEN |
| `OUT-011` | pricing pravilo potvrđeno za outreach | BLOCKED BY `#71` EVIDENCE |
| `OUT-012` | live-pilot messaging odobren | BLOCKED BY READINESS GATES |
| `OUT-013` | stvarni opt-out i privacy proces za business contacts | OPEN |
| `OUT-014` | prvi outreach dry run između osnivača | OPEN |

## 24. Definition of done za verziju 0.1

Verzija 0.1 je dokumentacijski završena kada:

- ovaj dokument bude mergean u `main`;
- centralni BSS OS indeks upućuje na njega;
- svi primjeri ostanu fiktivni;
- Product Owner pregleda skripte i pitanja;
- Tomislav i brat provedu jedan testni poziv jedan s drugim;
- jedna fiktivna prilika prođe research, poziv, discovery, scoring i demo handoff;
- ne postoji neodobrena cijena, datum, referenca ili produkcijska tvrdnja.

Vanjska uporaba nije automatski odobrena samim mergeom. Status može prijeći na `APPROVED FOR CONTROLLED OUTREACH` tek nakon zatvaranja relevantnih `OUT-*` dokaza.
