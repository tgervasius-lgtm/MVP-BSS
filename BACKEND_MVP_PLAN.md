# BSS pilot backend – izvedbeni plan

Ovaj dokument opisuje sedmu razvojnu točku. Backend još nije implementiran u ovoj statičnoj objavi; cilj je jasno odvojiti ono što demo pokazuje od onoga što pilot mora stvarno jamčiti.

## 1. Cilj pilota

Pilot za jednu tvrtku treba sigurno evidentirati RFID dolaske i odlaske, raditi tijekom kratkog prekida interneta, provoditi prava pristupa na poslužitelju, voditi godišnje odmore i korekcije te stvarati provjerljive mjesečne izvoze.

Pilot se smatra uspješnim kada 10–30 radnika tijekom četiri tjedna koristi jedan terminal bez izgubljenih i dvostrukih zapisa, a administrator može završiti mjesečnu evidenciju bez ručnog prepisivanja.

## 2. Predložena arhitektura

- Web aplikacija: postojeći responzivni UI, nakon izdvajanja u frontend build.
- API: TypeScript + Node.js (Fastify ili NestJS), REST preko HTTPS-a.
- Baza: PostgreSQL; svaki poslovni zapis sadrži `organization_id`.
- Autentikacija: korisničke sesije s kratkotrajnim pristupnim tokenom i rotirajućim refresh tokenom u sigurnom HttpOnly kolačiću.
- Terminal: zaseban identitet uređaja, aktivacijski kod pri uparivanju i rotirajuća tajna po uređaju.
- Pozadinski poslovi: red za obradu izvoza, upozorenja i ponovnu sinkronizaciju.
- Datoteke: privatna objektna pohrana za generirane izvještaje, s kratkotrajnim potpisanim poveznicama.
- Nadzor: strukturirani logovi, metrike sinkronizacije i upozorenje kada se terminal ne javi unutar zadanog intervala.

## 3. Minimalni model podataka

| Tablica | Ključna polja | Važno pravilo |
| --- | --- | --- |
| `organizations` | id, naziv, OIB, vremenska zona | OIB jedinstven |
| `users` | id, organization_id, email, password_hash, role, worker_id | email jedinstven unutar organizacije |
| `departments` | id, organization_id, naziv | voditelj se veže na jedan ili više odjela |
| `workers` | id, organization_id, department_id, shift_id, status, annual_leave_allowance | deaktiviranje ne briše povijest |
| `rfid_cards` | id, organization_id, worker_id, uid_hash, status, valid_from, valid_to | aktivni UID jedinstven unutar organizacije |
| `shifts` | id, organization_id, naziv, početak, završetak, pauza, tolerancija | podržati smjenu preko ponoći |
| `terminals` | id, organization_id, naziv, lokacija, secret_hash, last_seen_at, status | tajna se može rotirati i opozvati |
| `attendance_events` | id, organization_id, terminal_id, worker_id, device_event_id, occurred_at, received_at, event_type | `terminal_id + device_event_id` jedinstven radi idempotencije |
| `attendance_days` | id, organization_id, worker_id, work_date, check_in, check_out, break_minutes, status | izvedeni/odobreni dnevni zapis |
| `leave_requests` | id, organization_id, worker_id, type, start_date, end_date, working_days, status, approver_id | spriječiti vlastita preklapanja |
| `correction_requests` | id, organization_id, attendance_day_id, old_values, new_values, reason, status, approver_id | stara i nova vrijednost ostaju trajno |
| `audit_events` | id, organization_id, actor_type, actor_id, action, entity_type, entity_id, before_json, after_json, created_at | append-only; bez naknadnog uređivanja |
| `report_exports` | id, organization_id, filter_json, format, created_by, storage_key, checksum | ponovljiv i provjerljiv izvoz |

Brisanje radnika, kartice ili smjene ne smije kaskadno izbrisati povijesne evidencije. Osobni podaci se nakon propisanog roka anonimiziraju kontroliranim postupkom.

## 4. API opseg pilota

### Korisnici i prava

- `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`
- `GET /me`
- `GET/POST/PATCH /workers`
- `POST /workers/:id/deactivate`
- `GET/POST/PATCH /shifts`
- `POST /rfid-cards/:id/block`

### Evidencija i terminal

- `POST /terminals/pair`
- `POST /terminal/v1/events/batch` – prima više lokalnih događaja i vraća prihvaćene `device_event_id` vrijednosti
- `POST /terminal/v1/heartbeat`
- `GET /attendance?from=&to=&department_id=&worker_id=&status=`
- `GET /workers/:id/attendance`

### Odsutnosti i korekcije

- `GET/POST /leave-requests`
- `POST /leave-requests/:id/approve`
- `POST /leave-requests/:id/reject`
- `GET/POST /correction-requests`
- `POST /correction-requests/:id/approve`
- `POST /correction-requests/:id/reject`

### Izvještaji i audit

- `POST /report-exports`
- `GET /report-exports/:id`
- `GET /audit-events`

Svaki endpoint mora iz organizacije i uloge u sesiji izvesti dopušteni opseg. Klijentov `organization_id`, `role` ili popis odjela nikada se ne smatra dokazom ovlasti.

## 5. Offline i sinkronizacijski protokol terminala

1. Terminal pri svakom očitanju stvara UUID `device_event_id`, lokalno vrijeme, vrstu događaja i monotonu sekvencu.
2. Događaj se prvo trajno sprema lokalno, tek zatim terminal daje pozitivnu potvrdu radniku.
3. Online terminal šalje paket događaja potpisan svojom tajnom; server provjerava terminal, vremenski prozor i potpis.
4. Server radi idempotentni insert na jedinstveni ključ `(terminal_id, device_event_id)` i vraća popis potvrđenih događaja.
5. Terminal briše samo događaje koje je server izričito potvrdio.
6. Događaji sa sumnjivim vremenom, blokiranom karticom ili nepoznatim UID-om ulaze u zaseban status za pregled; ne nestaju bez traga.
7. Sat terminala sinkronizira se preko NTP-a. API čuva i vrijeme uređaja i vrijeme primitka kako bi se odstupanje moglo dokazati.

## 6. Sigurnost i privatnost

- Argon2id za lozinke, obvezan MFA za administratorske račune prije šire produkcije.
- TLS za sav promet; tajne nikada u frontend repozitoriju ni Netlify varijablama dostupnima klijentu.
- RBAC i opseg odjela provjeravaju se u API-ju, ne samo skrivanjem gumba.
- Rate limiting za prijavu i terminalske endpointove; zaključavanje i obavijest nakon sumnjivih pokušaja.
- Šifrirane sigurnosne kopije baze, dokumentiran povrat i redoviti test obnove.
- Audit zapis za prijavu, promjenu prava, kartice, korekciju, odobrenje i izvoz.
- Definirani rokovi čuvanja podataka, izvoz podataka ispitanika i postupak anonimizacije prema ugovoru i GDPR obvezama.
- Dnevni pregled neuspjelih sinkronizacija i alarm za neuobičajeno velik broj ručnih korekcija.

## 7. Redoslijed izvedbe

### Faza A – temelj (1. tjedan)

- PostgreSQL migracije, organizacija, korisnici, uloge, odjeli, radnici, kartice i smjene.
- Prijava, sesije i backend provjera prava.
- Automatski test izolacije dviju organizacija i opsega voditelja.

### Faza B – terminal i evidencija (2. tjedan)

- Uparivanje terminala, batch događaji, idempotencija i heartbeat.
- Izgradnja dnevnih zapisa iz događaja i prikaz filtra evidencije.
- Test prekida veze, ponovnog slanja i dvostrukog paketa.

### Faza C – odobravanja i izvoz (3. tjedan)

- Godišnji odmori s kalendarom blagdana po godini.
- Korekcije s transakcijskim odobrenjem i auditom.
- CSV/XLSX izvoz na backendu i kontrolni zbroj datoteke.

### Faza D – pilot i stabilizacija (4. tjedan)

- Uvoz stvarnih radnika i kartica, obuka administratora i voditelja.
- Paralelno vođenje postojeće evidencije prvih pet radnih dana.
- Praćenje terminala, dnevna provjera odstupanja i ispravci samo kroz definirani tijek.
- Završna odluka prema kriterijima prihvata, uz popis onoga što ulazi u produkcijsku fazu.

## 8. Kriteriji prihvata

- Nema izgubljenog zapisa nakon najmanje 24 sata simuliranog offline rada.
- Ponovno slanje istog paketa ne stvara duplikate.
- Radnik API-jem ne može dohvatiti tuđe podatke; voditelj ne može dohvatiti drugi odjel.
- Blokirana kartica ne može stvoriti prihvaćeni dolazak.
- Odobrena korekcija atomski ažurira dnevni zapis i stvara audit događaj sa starom i novom vrijednošću.
- Broj radnih dana godišnjeg odgovara službenom kalendaru za godinu i organizaciju.
- CSV i XLSX imaju isti broj redaka i isti zbroj minuta za iste filtre.
- Obnova sigurnosne kopije prolazi u probnom okruženju.
- Administrator može zaključiti mjesec i reproducirati isti izvoz iz spremljenih filtara.
