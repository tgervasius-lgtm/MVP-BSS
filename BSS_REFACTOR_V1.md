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
| R2 | Adapteri za pohranu, sat, ID i demo podatke | Dovršeno u ovoj grani |
| R3 | Use-case funkcije za evidenciju, godišnje i korekcije | Dovršeno u ovoj grani |
| R4 | Prikazi po ekranima i uklanjanje inline handlera | Dovršeno u ovoj grani |
| R5 | CSS slojevi i uklanjanje legacy aliasa | Sljedeće |
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

## R2 – infrastrukturni adapteri

- `src/adapters/runtime.js` jedina je granica za lokalnu pohranu, JSON stanje, trenutačno vrijeme i generiranje demo ID-a.
- Pohrana koristi memorijski fallback kada `localStorage` nije dostupan ili odbije zapis.
- State store prihvaća samo očekivanu verziju i za nevaljan/stari zapis vraća odvojenu kopiju početnog stanja.
- Sat i ID generator mogu se zamijeniti determinističkim implementacijama u testu.
- Monotoni ID ostaje jedinstven i kada više zapisa nastane u istoj milisekundi.
- `app.js` više ne poziva `localStorage` ni `Date.now()` izravno.

### Kriterij prolaza R2

- postojeći spremljeni Demo 3.0 podaci i tema ostaju kompatibilni;
- prijava, odjava, promjena uloge i reset stanja prolaze istim tijekom kao prije;
- nevaljan JSON i pogrešna verzija pohrane ne ruše aplikaciju;
- zamrznuti sat daje ponovljive oznake vremena i budući rok pozivnice;
- više uzastopnih ID-a ostaje jedinstveno;
- svi R1 i postojeći regresijski testovi prolaze.

## R3 – poslovni use-caseovi

- `src/use-cases/attendance.js` izračunava jedinstveni sažetak evidencije i čisto primjenjuje odobrenu korekciju na postojeći ili novi dnevni zapis.
- `src/use-cases/leave.js` validira, stvara, odobrava/odbija i poništava zahtjev bez ovisnosti o DOM-u.
- `src/use-cases/corrections.js` validira zahtjev, čuva izvorne vrijednosti i provodi odluku kroz attendance use-case.
- Poslovna greška vraća stabilan kod; `app.js` kod prevodi u postojeću hrvatsku poruku.
- UI funkcije čitaju polja, provjeravaju ulogu/opseg, pozivaju use-case i renderiraju rezultat.

### Kriterij prolaza R3

- godišnji odbija nevaljano/prošlo razdoblje, drugu godinu, neradne dane, vlastito preklapanje i prekoračenje fonda;
- samo zahtjev na čekanju može biti odobren, odbijen ili poništen;
- odbijanje godišnjeg i dalje zahtijeva razlog;
- korekcija odbija budući datum, nevaljano/jednako vrijeme, više od 16 sati, duplikat i nepromijenjenu vrijednost;
- odobrena korekcija čuva audit te stvara ili ažurira točno jedan dnevni zapis;
- sažeci evidencije ostaju brojčano jednaki Demo 3.0 rezultatu;
- svi R1, R2 i postojeći regresijski testovi prolaze.

## R4 – registry prikaza i događaja

- `src/views/registry.js` zaključava dopuštene ekrane i jedini bira pripadajuću view funkciju.
- `src/views/events.js` centralno obrađuje klik, promjenu vrijednosti i tipku Enter kroz delegirane događaje.
- Dopušten je samo eksplicitni popis akcija; ne koristi se `eval`, `Function` ni izvršavanje proizvoljnog atributa.
- Argumenti akcije podržavaju samo string, broj, boolean, `null` i kontroliranu vrijednost aktivnog polja.
- Sve `onclick`, `onchange` i `onkeydown` veze zamijenjene su `data-bss-*` atributima.
- Drawer i modal zatvaraju se preko zasebne backdrop akcije, samo kada je pogođena sama pozadina.

### Kriterij prolaza R4

- izvor i renderirani DOM nemaju inline JavaScript event atribute;
- nepoznata akcija i izraz izvan dopuštene gramatike ne mogu se izvršiti;
- svi dopušteni ekrani prolaze kroz screen registry, a nepoznat ekran sigurno pada na početni prikaz;
- klik, promjena selecta i tipka Enter zadržavaju postojeće ponašanje;
- drawer, modal, navigacija, tabovi, obrasci i administrativne radnje prolaze regresiju;
- svi R1–R3 i postojeći testovi prolaze.

## Kriterij prolaza R1

- četiri uloge vide isti opseg kao prije;
- noćne smjene, aktivni zapisi, pauze, blagdani i preklapanja daju isti rezultat;
- svi postojeći testovi prolaze;
- novi moduli imaju izravne testove;
- nema promjene izgleda ni produkcijske objave;
- Cloudflare branch preview učitava nove module i radi iza postojeće Access politike.
