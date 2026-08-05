# BSS OS Product Memory v1

## Svrha
Ovaj dokument je operativni indeks za buduće promjene BSS proizvoda. Ne zamjenjuje kod, OpenAPI, migracije ni odobrene specifikacije; povezuje ih i definira kako sigurno mijenjati UI, frontend, backend, bazu i poslovne funkcije.

## Izvori istine
Redoslijed autoriteta:
1. kod, migracije i izvršiva konfiguracija u repozitoriju;
2. OpenAPI ugovor za HTTP ponašanje;
3. odobreni scope, arhitektura, handoff i design-system dokumenti;
4. ovaj indeks;
5. chat, privremene bilješke i neodobrene ideje.

Neusklađenost se ne rješava pretpostavkom. Mora se otvoriti issue ili u PR-u jasno navesti koja se odluka mijenja.

## Trenutne temeljne odluke
- Arhitektura: modularni monolit.
- Backend: Node.js 22, TypeScript, Fastify, PostgreSQL 16.
- API: REST `/api/v1`, OpenAPI kao ugovor.
- Tenant model: shared schema, obvezni `organization_id`, FORCE RLS.
- Autorizacija: RBAC plus data scope; deny-by-default.
- Deployment: Cloudflare za postojeći web/preview pipeline; backend hosting se ne smije izmišljati kroz frontend konfiguraciju.
- UX: jasnoća iznad gustoće; bez gamifikacije i dekorativnih KPI-jeva.
- GitHub: `main` je izvor istine; promjene idu kroz PR i obvezne gateove.

## Pravila promjene proizvoda

### 1. UI-only promjena
Primjeri: raspored, navigacija, tipografija, kartice, tablice, responsive ponašanje.

Obvezno:
- ne mijenjati API ni poslovno pravilo bez eksplicitne deklaracije;
- provjeriti desktop, mobilni, tipkovnicu i accessibility;
- Cloudflare preview prije odobrenja;
- ažurirati design-system dokument ako se uvodi novo trajno pravilo.

### 2. Frontend funkcionalna promjena
Primjeri: novi obrazac, workflow, filtriranje, statusi, poziv API-ja.

Obvezno:
- definirani acceptance kriteriji;
- potvrđen postojeći OpenAPI ugovor ili zasebna ugovorna promjena;
- unit/integration i relevantni Playwright testovi;
- nema lokalne autorizacije kao zamjene za backend provjeru.

### 3. Backend funkcionalna promjena
Primjeri: nova poslovna operacija, pravilo godišnjeg, attendance obrada, izvještaj.

Obvezno:
- domenska odgovornost i granica modula;
- RBAC, tenant scope, audit i concurrency analiza;
- OpenAPI i testovi u istom PR-u ili prethodnom ugovornom PR-u;
- bez SQL-a izvan repository/service granice;
- veliki service modul ne smije nekontrolirano rasti; po potrebi prvo ili zajedno izdvojiti novu domensku komponentu.

### 4. Promjena baze
Obvezno:
- nova numerirana migracija; nikad mijenjati checksum već primijenjene migracije;
- expand/backfill/contract pristup za destruktivne promjene;
- rollback ili dokumentirana forward-recovery procedura;
- RLS, tenant FK i indeksna analiza;
- stvarni PostgreSQL test.

### 5. Dodavanje funkcije
Prije koda zapisati:
- problem korisnika;
- uloge koje koriste funkciju;
- što ulazi i ne ulazi u prvu verziju;
- UI tok;
- API/data utjecaj;
- sigurnosni i audit utjecaj;
- acceptance kriterije;
- plan uklanjanja privremenih rješenja.

### 6. Izbacivanje funkcije
Ne brisati odmah. Koraci:
1. označiti funkciju deprecated ili sakriti ulaz;
2. provjeriti usage, podatke, API klijente i audit obveze;
3. ukloniti frontend i pozive;
4. ukloniti backend ugovor tek nakon kompatibilnog razdoblja;
5. podatke i shemu ukloniti zasebnom migracijom uz backup/recovery odluku.

## Klasifikacija rizika

| Razina | Primjeri | Automatski merge |
| --- | --- | --- |
| Niska | docs-only, PR template, oznake | dopušten nakon zelenih gateova |
| Srednja | izolirani UI, nerizični frontend refaktor, testovi | ne; potreban pregled rezultata/previewa |
| Visoka | backend pravila, API, migracije, auth, RBAC, RLS, Cloudflare/produkcija | nikad bez izričitog odobrenja |

## Definition of Ready
Zadatak je spreman za implementaciju tek kada ima:
- jasan cilj i korisničku vrijednost;
- poznate pogođene uloge;
- acceptance kriterije;
- procjenu UI/API/baza/sigurnost utjecaja;
- poznate ovisnosti i granicu scopea.

## Definition of Done
Promjena je završena tek kada:
- acceptance kriteriji prolaze;
- lint, build i relevantni testovi prolaze;
- RBAC, tenant izolacija i audit su pregledani;
- OpenAPI, migracije i dokumentacija su usklađeni;
- Cloudflare preview je pregledan kada postoji deployable UI promjena;
- PR sadrži verifikaciju i rollback/recovery bilješku;
- nema poznatog privremenog duga bez evidentiranog issuea.

## Anti-chaos pravila
- Jedan PR mora imati jednu primarnu svrhu.
- Ne spajati refaktor i veliku novu funkciju bez opravdanja.
- Ne dopuštati paralelne agente na istim datotekama bez dogovorenog ownershipa.
- Ne kopirati poslovnu logiku između frontenda i backenda.
- Ne uvoditi novu biblioteku bez jasne koristi i lifecycle procjene.
- Nakon nekoliko funkcionalnih PR-ova planirati ciljano čišćenje modula koji rastu.
- Crveni gate nije formalnost; promjena se ne spaja.

## Obvezna evidencija odluka
Za odluke koje mijenjaju arhitekturu, ugovor, sigurnost ili trajni UX standard otvoriti ADR dokument u `docs/adr/` s formatom:
- kontekst;
- odluka;
- alternative;
- posljedice;
- migracijski/rollback plan;
- datum i status.

## Kako AI i programeri koriste ovaj dokument
Prije implementacije:
1. pročitati `AGENTS.md`;
2. pronaći relevantni scope, architecture, design i OpenAPI dokument;
3. klasificirati promjenu po vrsti i riziku;
4. navesti pretpostavke u PR-u;
5. ne proširivati scope bez novog odobrenja.

Ovaj dokument se ažurira kada se promijeni trajni razvojni proces ili temeljna odluka proizvoda. Ne koristi se kao dnevni changelog.
