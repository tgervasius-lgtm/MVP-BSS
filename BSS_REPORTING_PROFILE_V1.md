# BSS profil poslovnih izvještaja v1.0

| Stavka | Odluka |
| --- | --- |
| Status | **FROZEN za BSS Frontend v1.0.0 i backend contract review** |
| Aplikacijski baseline | `91323c7cdbbbbf7b965c4926c94a11af6d31bf62` |
| Cilj | Profesionalni, provjerljivi tablični izvještaji bez dekorativne analitike |
| Obvezni FROZEN izlazi | CSV i pravi XLSX |
| Predloženi izlaz | PDF/PDF-A, tek nakon odobrenja Scope v1.1 |
| Izvor podataka | Jedan serverski, verzionirani dataset za ekran i sve izvoze |
| Granica | Izvještaj priprema evidenciju; ne računa plaću, poreze ni doprinose |

Frontend v1.0.0 potvrđuje filtre, tablični pregled i format korisničkog toka. Trenutačni browser-generirani XLSX/CSV su demonstracijski; službeni izvoz, autorizirani dataset, checksum, privatna pohrana i audit preuzima backend prema ovom profilu.

## 1. Dizajnerski smjer

BSS izvještaj treba izgledati kao službeni poslovni dokument, a ne kao marketinški dashboard. Smjer je namjerno sličan ozbiljnim njemačkim sustavima za `Arbeitszeiterfassung`: jasan naziv dokumenta, precizno razdoblje, tablični redovi, zbrojevi, trag nastanka i bez nepotrebnih grafova.

Obvezna pravila:

- crno-bijeli ispis mora ostati potpuno razumljiv;
- boja je pomoćni signal, nikada jedini nositelj statusa;
- svaki dokument navodi organizaciju, vremensku zonu, razdoblje, filtre, autora i vrijeme nastanka;
- status se prikazuje tekstom, a transportni kod ostaje u strojno čitljivom izlazu;
- aktivni i nepotpuni zapisi jasno su izdvojeni i ne ulaze u zaključane zbrojeve;
- svaki izvoz ima verziju predloška, verziju dataseta i SHA-256 checksum;
- isti upit mora biti ponovljiv iz spremljenih filtara.

## 2. Zaključani katalog izvještaja

| Kod | Hrvatski naziv | Poslovna svrha | Primarni red |
| --- | --- | --- | --- |
| `monthly_summary` | Mjesečni sažetak | Predaja kontroliranih mjesečnih zbrojeva po radniku | jedan radnik |
| `attendance_journal` | Evidencija radnog vremena | Dnevni dokaz dolaska, odlaska, pauze, plana i salda | jedan radnik/dan |
| `exceptions` | Odstupanja | Popis kašnjenja, nepotpunih i ispravljenih zapisa za rješavanje | jedno odstupanje |
| `approved_absences` | Odobrene odsutnosti | Planiranje i dokaz odobrenih godišnjih/slobodnih dana | jedan odobreni period |
| `correction_log` | Protokol korekcija | Sljedivost izvorne i nove vrijednosti, odluke i aktera | jedna korekcija |

Novi tip izvještaja nije dio ovog profila bez odluke o promjeni opsega.

## 3. Zajednički metapodaci

Svaki CSV/XLSX i naknadno odobreni PDF mora sadržavati:

- `organization_name` i službeni identifikator organizacije;
- `timezone` u IANA obliku, primjerice `Europe/Zagreb`;
- `period_from` i `period_to`;
- primijenjeni odjel, radnik i status ili izričitu vrijednost `all`;
- `generated_at` u UTC-u i lokalnu prikaznu vrijednost;
- `generated_by` kao serverski utvrđenog korisnika;
- `dataset_version`, `template_version` i `export_id`;
- `row_count`, zbroj službenih minuta i SHA-256 checksum;
- oznaku `NOT_PAYROLL`.

## 4. XLSX standard

### Radne knjige

Svaka datoteka ima najviše tri lista:

1. `Izvjestaj` – glavni tablični rezultat;
2. `Sazetak` – kontrolni zbrojevi po odjelu ili radniku, samo ako ih vrsta izvještaja zahtijeva;
3. `Metapodaci` – svi filtri, verzije, autor, vrijeme i checksum kao parovi ključ–vrijednost.

### Oblikovanje

- pravi Office Open XML `.xlsx`;
- zamrznut red zaglavlja i uključen autofilter;
- jedan zapis po retku, bez spojenih ćelija u podatkovnom području;
- datumi su Excel datumi, vremena/minute numeričke vrijednosti s prikaznim formatom, ne tekst;
- trajanje veće od 24 sata koristi format `[h]:mm`;
- neutralna tamna zaglavlja, tanki rubovi i naizmjenično vrlo blago sjenčanje redaka;
- status ima tekstualnu vrijednost; boja je samo dodatak;
- kontrolni zbroj na dnu ne ulazi u autofilter podatkovnih redaka;
- širine stupaca su čitljive bez ručnog širenja, ali nema dekorativnih praznih stupaca;
- formula se koristi samo za prikaz, dok službeni zbrojevi dolaze sa servera i uspoređuju se pri generiranju.

### Preporučeno imenovanje

`BSS_<report-code>_<YYYY-MM>_<scope>_<export-id>.xlsx`

Primjer: `BSS_monthly-summary_2026-07_company_exp-01JZ.xlsx`.

## 5. CSV standard

CSV ostaje tehnički i integracijski izlaz:

- UTF-8 s BOM-om radi pouzdanog otvaranja u lokaliziranom Excelu;
- separator mora biti konfiguriran i zapisan u metapodacima; zadano `;` za HR/DE uredska okruženja;
- ISO datum `YYYY-MM-DD`, vrijeme `HH:mm`, trajanje kao cijeli broj minuta;
- stabilni engleski statusni kodovi;
- bez lokaliziranih formula;
- isti redovi i službeni zbroj minuta kao XLSX za isti `export_id`.

## 6. Predloženi PDF standard

PDF je poslovno opravdan za ispis, arhivu i potpisivanje, ali nije u trenutačnom FROZEN opsegu. Implementirati ga samo nakon pisane odluke Product Ownera i nove verzije scope dokumenta.

Ako bude odobren:

- A4 portrait za sažetak i odsutnosti, A4 landscape za široku dnevnu evidenciju;
- naslov dokumenta, organizacija i razdoblje u zaglavlju;
- filtri i oznaka opsega odmah ispod naslova;
- tablica s ponovljenim zaglavljem na svakoj stranici;
- podnožje `Stranica X od Y`, vrijeme izrade, `export_id` i kratki checksum;
- završni red zbrojeva i izdvojena napomena o nepotpunim zapisima;
- prostor za napomenu/potpis samo na vrstama koje Product Owner odredi;
- ugrađen font s hrvatskim znakovima, označena struktura i dostupan tekst;
- ciljana arhivska usklađenost PDF/A-2u, potvrđena službenom veraPDF validacijom u CI-ju;
- bez grafova, velikih dekorativnih blokova i boje kao jedinog statusnog signala.

## 7. Minimalni stupci

### Mjesečni sažetak

`worker_code`, `worker_name`, `department`, `shift`, `completed_days`, `worked_minutes`, `planned_minutes`, `balance_minutes`, `overtime_minutes`, `exception_count`, `approved_leave_days`.

### Evidencija radnog vremena

`work_date`, `worker_code`, `worker_name`, `department`, `shift`, `check_in`, `check_out`, `break_minutes`, `worked_minutes`, `planned_minutes`, `balance_minutes`, `status_code`, `source`, `correction_state`.

### Odstupanja

`work_date`, `worker_code`, `worker_name`, `department`, `exception_code`, `planned_start`, `actual_start`, `actual_end`, `minutes_delta`, `resolution_state`, `responsible_role`.

### Odobrene odsutnosti

`worker_code`, `worker_name`, `department`, `leave_type_code`, `start_date`, `end_date`, `working_days`, `approved_by`, `approved_at`.

### Protokol korekcija

`request_id`, `worker_code`, `work_date`, `old_check_in`, `old_check_out`, `new_check_in`, `new_check_out`, `reason`, `status_code`, `requested_at`, `decided_by`, `decided_at`, `decision_note`.

## 8. Serverske provjere prije objave izvoza

1. Ponovno provjeriti RBAC i opseg u trenutku generiranja.
2. Zaključati filtar i verziju dataseta u `report_exports`.
3. Isključiti aktivne/nepotpune dane iz službenih zbrojeva prema poslovnom pravilu, ali ih jasno navesti u kontroli.
4. Usporediti `row_count` i službeni zbroj minuta između internog dataseta, CSV-a i XLSX-a.
5. Izračunati checksum završne datoteke i spremiti ga uz izvoz.
6. Datoteku pohraniti privatno; klijentu vratiti kratkotrajnu potpisanu poveznicu.
7. Zapisati audit događaj za zahtjev, završetak i preuzimanje.
8. Za eventualni PDF pokrenuti veraPDF PDF/A-2u provjeru prije statusa `ready`.

## 9. Kriterij prihvata

- ista kombinacija filtara daje isti broj redaka i isti zbroj minuta na ekranu, u CSV-u i XLSX-u;
- XLSX se otvara bez upozorenja u aktualnom Microsoft Excelu i LibreOfficeu;
- sortiranje/filter ne uključuje naslovne i kontrolne retke u podatke;
- trajanja iznad 24 sata prikazuju se ispravno;
- radnik i voditelj ne mogu izvesti podatke izvan vlastitog opsega;
- datoteka se može reproducirati iz spremljenih filtara i verzije dataseta;
- PDF, ako bude odobren, mora proći vizualni desktop/ispis QA, provjeru pristupačnosti i službenu veraPDF validaciju.
