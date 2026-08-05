# BSS Readiness Matrix

Ovaj dokument je jedinstveni izvor istine za spremnost BSS-a. Cilj nije tvrditi da je sustav bez greške, nego spriječiti skrivene rupe, neprovjerene pretpostavke i ovisnost o jednom programeru.

## Statusi

- `DONE` — dovršeno i postoji dokaz u repozitoriju ili CI-u
- `AUTOMATED` — kontinuirano se provjerava na PR-u, `main` grani ili rasporedu
- `PARTIAL` — postoji temelj, ali izlazni kriterij još nije potpuno zatvoren
- `OPEN` — nije završeno; mora imati vlasnika, dokaz i plan zatvaranja
- `EXTERNAL` — ovisi o hostingu, uređaju, dobavljaču, pravnom ili poslovnom koraku izvan repozitorija

## Pravilo ažuriranja

Svaka promjena koja utječe na arhitekturu, podatke, sigurnost, deployment, terminal, privatnost ili developer handoff mora ažurirati relevantni redak i dodati poveznicu na dokaz. Status se ne smije postaviti na `DONE` bez reproducibilnog dokaza.

| Područje | Izlazni kriterij | Trenutni status | Dokaz / sljedeći dokaz |
|---|---|---:|---|
| MVP opseg | Sve funkcije imaju jasan `in scope`, `out of scope` i acceptance kriterij | PARTIAL | OpenAPI, screen map, readiness dokumenti; konačni feature freeze prije pilota |
| Arhitektura | Granice frontend/backend/terminal/baza su dokumentirane; nema skrivenih runtime ovisnosti | PARTIAL | `BACKEND_ARCHITECTURE.md`, developer guide; završna provjera nakon integracije |
| Frontend kvaliteta | Lint, testovi, build, accessibility i ključni E2E tokovi prolaze | AUTOMATED | BSS quality gate |
| Backend kvaliteta | TypeScript, build, unit/contract/integration testovi i PostgreSQL tokovi prolaze | AUTOMATED | Backend/full-stack quality gateovi |
| API ugovor — struktura | OpenAPI je sintaktički i strukturno valjan, nema neriješenih referenci, duplih operation ID-jeva ni nedostajućih path parametara | AUTOMATED | `redocly.yaml` + BSS API and dependency governance gate |
| API-runtime usklađenost | Implementirani endpointi, statusi i response sheme odgovaraju OpenAPI ugovoru | PARTIAL | Postojeći contract testovi; proširiti automatski runtime drift dokaz za sve operacije |
| Baza i migracije | Clean database migrira od nule; rollback/forward strategija je dokumentirana | PARTIAL | PostgreSQL migration CI; produkcijski rehearsal ostaje otvoren |
| Tenant izolacija | Cross-tenant pristup je tehnički blokiran i regresijski testiran | AUTOMATED | RLS i cross-tenant CI testovi |
| Autentikacija i sesije | Login, refresh, logout, invitation i revocation imaju testirane sigurnosne granice | PARTIAL | Backend audit i auth/concurrency testovi; vanjski security review prije produkcije |
| RBAC | Svaka operacija ima dopuštene uloge i negativne testove | PARTIAL | OpenAPI RBAC deklaracije i contract testovi; potpuna matrica prije pilota |
| Audit log | Kritične radnje ostavljaju neizmjenjiv, tenant-scoped i razumljiv trag | PARTIAL | Backend implementacija; retention i zaštita pseudonima ostaju otvoreni |
| Tajne i ključevi | Nema tajni u Git povijesti; rotacija, KMS i incident postupak su definirani | PARTIAL | `.env` zaštita, security gate; produkcijski KMS/rotacija je EXTERNAL |
| Static security | CodeQL i dependency audit prolaze kontinuirano | AUTOMATED | BSS security gate |
| CI/CD workflow ispravnost | Workflow YAML, izrazi i ugrađene shell skripte statički se provjeravaju prije mergea | AUTOMATED | BSS workflow static validation; actionlint v1.7.12 s provjerenim binary checksumom |
| GitHub Actions supply chain | Sve remote Action ovisnosti koriste nepromjenjivu punu commit SHA referencu | AUTOMATED | Immutable-reference policy + svi postojeći workflowi pinani na potvrđene SHA vrijednosti |
| Dependency održavanje | Zaključane verzije, automatske nadogradnje i pregled novih ranjivosti/licencija | AUTOMATED | Dependabot, npm audit i GitHub dependency review |
| SBOM | Frontend i backend CycloneDX inventar se generira, validira i arhivira | AUTOMATED | BSS dependency inventory; potvrđen artefakt za aktualni `main` commit |
| PR veličina i rizik | Veliki i višepodručni PR-ovi dobivaju automatsko upozorenje | AUTOMATED | PR size/risk guardrail u `main` |
| PR dokumentacija | Cilj, rizik, testni dokaz i rollback su obvezni | AUTOMATED | BSS PR governance gate |
| Vlasništvo koda | Kritični dijelovi imaju formalnog vlasnika | DONE | `.github/CODEOWNERS` |
| Branch zaštita | `main` blokira direktan push, traži zelene checkove i review | EXTERNAL | GitHub repository settings; integracija nema permission za čitanje ili promjenu branch protectiona, zato ručno potvrditi required checks i CODEOWNERS review |
| Unit testovi | Ključna poslovna pravila imaju stabilne, brze testove | PARTIAL | Postojeći suite; coverage pragovi se tek trebaju formalizirati |
| Integration testovi | API, baza, migracije i RLS rade u stvarnom PostgreSQL-u | AUTOMATED | GitHub CI PostgreSQL 16 testovi |
| E2E testovi | Glavni tokovi svih uloga rade kroz browser i backend | PARTIAL | Postojeći Playwright/axe tokovi; proširiti nakon finalne integracije |
| Accessibility | WCAG kritični problemi automatski blokiraju regresiju | AUTOMATED | axe u quality gateu |
| Performance | Definirani SLO-i, load/soak testovi i query planovi za kritične upite | OPEN | Potrebni realni volumeni i produkcijski slična okolina |
| Rate limiting i abuse | Login, terminal i osjetljivi endpointi imaju shared ograničenja | EXTERNAL | Hosting/WAF/shared store odluka prije produkcije |
| Backup | Automatski backup, enkripcija, retention i vlasnik procesa | EXTERNAL | Hosting odluka i dokumentirani raspored |
| Restore/PITR | Restore je stvarno izveden i izmjeren, ne samo dokumentiran | OPEN | Obvezan restore drill prije prvog plaćenog klijenta |
| Disaster recovery | RTO/RPO, odgovorne osobe i komunikacija incidenta su definirani | OPEN | Incident i DR runbook prije produkcije |
| Deployment | Reproducibilan image/build, healthcheck, rollback i odvojena okruženja | PARTIAL | Docker/Compose i runbook; finalni hosting ostaje EXTERNAL |
| Cloud konfiguracija | DNS, TLS, WAF, mreža, tajne i pristupi su evidentirani | EXTERNAL | Infrastructure inventory nakon izbora hostinga |
| Observability | Strukturirani logovi, metrics, traces, alerti i dashboardi | OPEN | Odabrati provider i definirati minimalne alarme |
| Error tracking | Produkcijske greške imaju grouping, release i owner podatke | OPEN | Uvesti prije pilota |
| Uptime i health | Vanjski health check i upozorenje za nedostupnost | OPEN | Uvesti nakon staging/production deploya |
| Privatnost/GDPR | Svrhe, pravna osnova, retention, DPA, izvoz i brisanje su definirani | OPEN | Pravni pregled i data map prije stvarnih osobnih podataka |
| Data minimization | Ne prikupljaju se nepotrebni osobni, IP ili device podaci | PARTIAL | Audit postoji; finalna retention odluka otvorena |
| Evidencija pristupa | Admin i support pristupi produkcijskim podacima su kontrolirani i auditirani | OPEN | Definirati support model i break-glass proceduru |
| Terminal sigurnost | Device identitet, potpisivanje, nonce/replay, rotacija i revocation su testirani | PARTIAL | Ugovori postoje; fizički terminal i provisioning rehearsal otvoreni |
| Offline terminal | Queue, idempotency, clock drift i recovery ponašanje su definirani | PARTIAL | API principi postoje; realni hardware test ostaje otvoren |
| Hardware BOM | Točni SKU-ovi, dimenzije, kompatibilnost i zamjene su potvrđeni | EXTERNAL | Fizička metrologija i zaključani prototip |
| Kućište i termika | Finalni CAD, tolerancije, ventilacija i montaža potvrđeni prototipom | EXTERNAL | SolidWorks/STEP nakon stvarnih mjera komponenti |
| RFID pouzdanost | Doseg, orijentacija, metalno kućište i pogrešna očitanja testirani | OPEN | Bench test na stvarnom prototipu |
| Developer onboarding | Clean clone do lokalnog rada je moguć samo iz dokumentacije | PARTIAL | `DEVELOPER_GUIDE.md`; obvezan neovisni clean-room test |
| Operativna dokumentacija | Deploy, rollback, backup, restore, incident i troubleshooting postoje | PARTIAL | Dio runbookova postoji; produkcijski detalji nakon hostinga |
| Frontend handoff artefakt | Immutable frontend tag reproducibilno daje validiran ZIP, manifest, checksum i release asset | AUTOMATED | PR verify + post-merge publish workflow; verify i publish potvrđeni na aktualnom `main` |
| Handoff paket | Kod, dokumenti, API, DB, testovi, tajne-popis i otvoreni rizici su predani | PARTIAL | Postojeći handoff artefakti; finalizirati cijeli sustav na feature freezeu |
| Vendor lock-in | Repo, domena, cloud, tajne, billing i administracija ostaju pod BSS kontrolom | OPEN | Napraviti access/ownership register prije vanjskog programera |
| Licencije | Novouvedene dependency licence su automatski provjerene i neprihvaćene licence blokirane | AUTOMATED | GitHub dependency review s eksplicitnom SPDX allowlistom |
| Release verzioniranje | Tag, changelog, migracije i artefakti su reproducibilni | PARTIAL | Frontend release proces postoji; objediniti za cijeli sustav |
| Neovisni audit | Senior reviewer provjerava arhitekturu, auth, RLS, GDPR i operacije | OPEN | Planirati nakon feature freezea, prije prvog plaćenog klijenta |
| Penetration test | Vanjski test stvarnog staging/production sustava | OPEN | Nakon hostinga i prije većeg komercijalnog rollouta |

## Nezaobilazni release blocker kriteriji

BSS se ne smije označiti kao `production ready` dok nisu zatvoreni najmanje:

1. branch protection i obvezni CI checkovi;
2. staging okruženje jednako produkcijskom po ključnim servisima;
3. stvarni backup + uspješan restore/PITR drill;
4. monitoring, error tracking i incident alerti;
5. GDPR data map, retention i ugovorne obveze;
6. load test kritičnih endpointa i query planovi;
7. fizički terminal provisioning, offline i recovery test;
8. neovisni senior security/architecture review;
9. clean-room developer onboarding test;
10. dokumentiran ownership svih računa, domena, cloud resursa i tajni.

## Način rada bez slijepih točaka

Za svaki novi modul ili servis prvo se dodaju: vlasnik, threat model, testna strategija, podaci koje obrađuje, dependency/SBOM pokrivenost, deployment i rollback, observability te handoff dokumentacija. Funkcionalnost nije završena samo zato što radi u pregledniku.
