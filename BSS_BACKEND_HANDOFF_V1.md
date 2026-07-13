# BSS predaja backend programeru v1.0

| Stavka | Vrijednost |
| --- | --- |
| Status | **FRONTEND SPREMAN ZA BACKEND CONTRACT** |
| Polazna verzija | `main` na `ec4b92c` |
| Frontend pregled | `BSS_FRONTEND_FINAL_REVIEW_V1.md` |
| Strojni manifest | `bss-frontend-handoff-v1.json` |
| API nacrt | `openapi/bss-mvp-api-v1.yaml` |
| Izvještaji | `BSS_REPORTING_PROFILE_V1.md` |
| Opseg | `BSS_MVP_SCOPE_FREEZE_V1.md` + `bss-mvp-scope-v1.json` |
| Važno | Ovaj paket ne sadrži backend implementaciju ni produkcijski deploy |

## 1. Što backend programer preuzima

BSS frontend je statičan, responzivan demonstracijski runtime s četiri uloge, 16 registriranih ekrana, izdvojenim domenskim pravilima, RBAC politikama, use-caseovima i zamjenjivim runtime adapterima. Demo stanje trenutačno živi u pregledniku i služi samo kao referentni dataset i dokaz korisničkih tokova.

Zadatak backenda nije prepisati cijeli frontend, nego:

1. postaviti serverski autoritet za identitet, opseg, podatke i poslovna pravila;
2. implementirati ugovor iz OpenAPI nacrta nakon zajedničkog contract reviewa;
3. zamijeniti demo repozitorije/adapterske granice HTTP implementacijama;
4. sačuvati postojeće uloge, tokove, statuse i zabrane iz FROZEN opsega;
5. osigurati idempotenciju terminala, append-only audit i reproducibilne izvještaje.

## 2. Lokalno pokretanje i quality gate

Za čisti checkout:

```bash
npm ci
npm run check
npm run test:e2e
npm run serve:dist
```

`npm run check` izvršava lint, unit/integration testove i deterministički build. `npm run test:e2e` prije testa ponovno gradi `dist/` te provodi desktop i mobilne Chromium scenarije i axe provjere.

Ne uvoditi backend tajne u ovaj repozitorij, `app.js`, Cloudflare Pages varijable dostupne klijentu, service worker ili build artefakte.

## 3. Frontend arhitektura koju treba sačuvati

| Sloj | Datoteke | Odgovornost | Backend veza |
| --- | --- | --- | --- |
| Ugovori | `src/domain/contracts.js` | uloge i prikazne oznake statusa | transportne kodove mapirati na hrvatske oznake u jednom mapperu |
| Vrijeme | `src/domain/time.js` | čisti prikazni izračuni i pomoćne funkcije | službene zbrojeve, blagdane i timezone odluke vraća server |
| Politike | `src/policies/access.js` | UX vidljivost i zaštita toka | nije sigurnosna granica; API uvijek ponovno provjerava ovlast |
| Use-caseovi | `src/use-cases/*` | deterministične poslovne odluke bez DOM-a | koristiti za klijentsku validaciju, ali server je jedini autoritet |
| Runtime adapter | `src/adapters/runtime.js` | demo storage, sat i ID | zamijeniti data/auth/clock adapterima; ne zvati `fetch` iz view funkcija |
| Registry prikaza | `src/views/registry.js` | zaključan popis 16 ekrana | zadržati stabilne ID-eve ekrana tijekom integracije |
| Registry događaja | `src/views/events.js` | dopuštene UI akcije bez inline JS/evala | akcije pozivaju use-case/repository sloj, ne grade URL u DOM-u |
| View runtime | `app.js` | trenutačni renderi i demo podaci | postupno izvlačiti screen controllere; bez velikog jednokratnog rewritea |

`app.js` je nakon R6 sigurniji i modularno omeđen, ali i dalje nosi velik dio renderiranja i demo seed podataka. Backend integraciju treba raditi vertikalno ekran po ekran, uz kompatibilni demo adapter dok svaka cjelina ne prođe contract test.

## 4. Vlasništvo podataka

### Server je jedini izvor istine

- autentificirani korisnik, uloga, organizacija i dodijeljeni odjeli;
- radnici, korisnički računi, odjeli, smjene, blagdani i RFID kartice;
- terminalski identiteti, tajne, događaji, slijed, heartbeat i stanje sinkronizacije;
- izvorni attendance događaji i izvedeni/odobreni dnevni zapisi;
- fond godišnjeg, radni dani, preklapanja, zahtjevi i odluke;
- korekcije, izvorne/nove vrijednosti i transakcijska primjena;
- audit događaji;
- službeni zbrojevi, zaključavanje mjeseca, verzije dataseta i izvozi.

### Frontend smije biti izvor istine samo za

- aktivni ekran i otvoreni/zatvoreni modal;
- temu sučelja;
- privremene filtre koji još nisu spremljeni kao službeni export;
- nedovršeni sadržaj obrasca do slanja;
- demo podatke isključivo kada je pokrenut eksplicitni demo adapter.

Frontend ne smije službeni poslovni zapis, ulogu ili organizaciju čuvati kao autoritativnu vrijednost u `localStorage`.

## 5. Uloge i serverski opseg

| Uloga | Serverski opseg | Dozvoljene promjene |
| --- | --- | --- |
| `admin` | cijela vlastita organizacija | radnici, smjene, kartice, korisnici, postavke, zahtjevi, korekcije, terminal i izvozi |
| `manager` | samo dodijeljeni odjeli | odluke o zahtjevima/korekcijama u opsegu; operativni izvještaji; bez organizacijskih i terminalskih mutacija |
| `worker` | samo vlastiti `worker_id` | novi/poništen vlastiti zahtjev i nova vlastita korekcija |
| `accountant` | odobreni izvještajni podaci organizacije | stvaranje/preuzimanje službenog izvještaja; bez mutacije poslovnih entiteta |

API ne prihvaća `organization_id`, `role`, `department_ids` ili `worker_id` iz klijenta kao dokaz prava. Vrijednosti se izvode iz provjerene sesije, a traženi filtar smije samo dodatno suziti taj opseg.

## 6. Ekrani i resursi

Potpuna strojno čitljiva mapa nalazi se u `bss-frontend-handoff-v1.json`. Sažetak:

| Ekran | Primarno čita | Primarno mijenja |
| --- | --- | --- |
| `home` | serverski dashboard sažetak i iznimke | ništa |
| `attendance` | `attendance_days`, radnici, smjene, odjeli | ništa iz tablice; korekcija ide kroz poseban zahtjev |
| `mytime` | vlastiti attendance sažetak i zapisi | `correction_requests` |
| `workers`, `worker` | radnici, odjeli, smjene, kartice | admin: radnik/kartica; manager: bez mutacije |
| `shifts` | smjene i broj dodijeljenih radnika | admin: smjena |
| `requests`, `vacations` | zahtjevi, fond, blagdani, preklapanja | radnik: create/cancel; admin/manager: approve/reject |
| `corrections` | zahtjevi za korekciju i izvorni zapis | radnik: create/cancel; admin/manager: approve/reject |
| `reports` | spremljeni filtri, preview dataset, export status | create export i download kratkotrajne poveznice |
| `terminal` | terminali, heartbeat, sync događaji | admin: pair/revoke; manager: read-only |
| `roles` | korisnici, uloge i scope | admin: poziv/izmjena/blokiranje |
| `audit` | append-only audit | ništa |
| `settings` | organizacija, odjeli, blagdani | admin: dopuštene postavke |
| `terminalDemo`, `flow` | lokalni demo seed/statični sadržaj | nikad službeni API |

## 7. HTTP i transportna pravila

- osnovna verzija: `/api/v1`;
- JSON koristi `camelCase`; baza može koristiti `snake_case`, ali mapiranje je na serveru;
- identifikatori su nepredvidivi stringovi/UUID, nikada inkrementalni broj iz klijenta;
- vrijeme događaja je RFC 3339 UTC, a radni datum zasebni `YYYY-MM-DD` u vremenskoj zoni organizacije;
- trajanja se prenose kao cijele minute;
- paginirani odgovor vraća `items` i `page` (`cursor`, `nextCursor`, `total` kada je pouzdano);
- mutacija vraća novi `revision`/ETag ili eksplicitni konflikt pri zastarjelom zapisu;
- validacijska greška ima stabilni `code`, korisnički siguran `message`, `fieldErrors` i `requestId`;
- sva odobravanja i korekcije moraju biti atomske;
- privatni odgovori imaju `Cache-Control: no-store` i nikada ne ulaze u service-worker cache;
- download izvještaja ide preko kratkotrajne potpisane poveznice, ne javnog Pages asseta.

Preporučeni kodovi infrastrukture: `UNAUTHENTICATED`, `FORBIDDEN`, `NOT_FOUND`, `VALIDATION_FAILED`, `CONFLICT`, `STALE_REVISION`, `RATE_LIMITED`, `INTERNAL_ERROR`. Domenski kodovi use-caseova ostaju stabilni i mapiraju se bez parsiranja poruke.

## 8. Obvezna stanja ekrana za API integraciju

Ovo nisu nove poslovne funkcije, nego nužna stanja stvarne mrežne aplikacije:

| Stanje | Prikaz | Pravilo |
| --- | --- | --- |
| `loading` | skeleton tablice ili kratki indikator | ne prikazivati stare brojke kao nove |
| `empty` | jasan razlog i aktivni filtri | razlikovati „nema podataka” od „nema prava” |
| `error` | sigurna poruka + `requestId` + pokušaj ponavljanja | bez stack tracea i tehničkih tajni |
| `forbidden` | objašnjenje da opseg nije dopušten | ne preusmjeravati na ekran s djelomično učitanim tuđim podacima |
| `stale` | upozorenje i ponovno učitavanje | mutaciju ne prepisati preko novije revizije |
| `offline` | samo za terminalski uređaj i javni PWA shell | poslovne web mutacije ne glumiti uspješnima bez servera |

## 9. Redoslijed integracije

### B0 – contract review

- Product Owner potvrđuje završni frontend pregled, P0 odluke i PDF odluku;
- backend i frontend programer prolaze `openapi/bss-mvp-api-v1.yaml`;
- zaključavaju error envelope, paginaciju, revizije i vremenske formate;
- dodaju automatsku OpenAPI validaciju i generated client ili tipizirani ručni adapter.

### B1 – identitet i read-only master podaci

- login/refresh/logout i `/me`;
- organizacija, odjeli, radnici i smjene kao read-only API adapter;
- serverski RBAC test s najmanje dvije organizacije i dva odjela;
- demo adapter ostaje dostupan samo lokalno/testno.

### B2 – evidencija i detalj radnika

- read-only attendance query i osobna evidencija;
- serverski sažeci minuta, plan i saldo;
- stranice `attendance`, `mytime`, `workers`, `worker` i `shifts` prelaze na API;
- contract test uspoređuje broj redaka i zbroj minuta s referentnim seedom.

### B3 – zahtjevi i korekcije

- create/cancel/approve/reject s revizijom i atomskim auditom;
- blagdani, fond i radni dani računaju se na serveru;
- radnik, voditelj i admin prolaze pozitivne i negativne scope testove.

### B4 – izvještaji i audit

- preview dataset i spremljeni export nastaju iz istog query servisa;
- CSV/XLSX generira pozadinski posao, sprema checksum i privatni objekt;
- audit je append-only i dostupan samo dopuštenom opsegu;
- PDF se ne implementira bez izmjene scopea.

### B5 – terminal

- pair/revoke, uređajni identitet, HMAC/mTLS odluka i rotacija tajne;
- batch idempotencija po `(terminal_id, device_event_id)`;
- heartbeat, offline red, dvostruko slanje i odstupanje sata;
- test najmanje 24 sata simuliranog offline rada.

Redoslijed se ne preskače: terminalske mutacije ne smiju biti prvi backend endpoint spojen na još neprovjereni identitet i tenant isolation.

## 10. Izvještaji

FROZEN ugovor podržava `csv` i `xlsx`. Profesionalni format i kontrolne provjere opisani su u `BSS_REPORTING_PROFILE_V1.md`. PDF/PDF-A je pripremljen kao prijedlog jer odgovara željenom poslovnom načinu predaje, ali nije dio OpenAPI enum-a dok Product Owner ne odobri Scope v1.1.

Backend mora spremiti najmanje:

- normalizirane filtre;
- autora i njegov provjereni scope;
- verziju dataseta i predloška;
- broj redaka i službeni zbroj minuta;
- format, storage key, checksum, status i vremena;
- audit događaje stvaranja i preuzimanja.

## 11. Sigurnosne blokade

- nema produkcijskih osobnih podataka u statičnom seedu, Git repozitoriju ili browser storageu;
- nema tajni u frontendu;
- nema autorizacije samo skrivanjem gumba;
- nema `organization_id` iz bodyja kao filtera ovlasti;
- nema uređivanja izvornog terminalskog događaja;
- nema hard deletea povijesnog radnika, kartice, smjene, zahtjeva ili audita;
- nema javnih URL-ova izvještaja;
- nema cacheiranja privatnog API odgovora;
- nema spajanja `terminalDemo` podataka u službenu evidenciju;
- nema payroll izračuna, GPS-a, biometrike, kontrole vrata ili ERP proširenja.

## 12. Otvorene tehničke odluke

Ove odluke moraju biti zapisane ADR-om prije implementacije odgovarajućeg dijela:

1. Fastify ili NestJS unutar već odabranog Node.js/TypeScript smjera;
2. hosting API-ja i PostgreSQL-a te način upravljanja tajnama;
3. session-cookie/BFF detalji i MFA plan za administratore;
4. queue i privatna objektna pohrana za izvoze;
5. HMAC ili mTLS identitet terminala;
6. hrvatski kalendar blagdana i organizacijske iznimke;
7. retention/anonymization rokovi i ugovorna GDPR pravila;
8. ulazi li PDF/A-2u u Scope v1.1.

Frontend ne treba samostalno odabrati ove infrastrukturne odluke.

## 13. Definition of Done za backend handoff

Predaja je prihvaćena kada backend programer može:

- podići frontend i pokrenuti cijeli quality gate;
- iz manifesta odrediti koji ekran čita i mijenja koji resurs;
- iz OpenAPI nacrta napraviti contract review bez nagađanja uloga i statusa;
- objasniti koja je vrijednost serverski, a koja klijentski autoritet;
- implementirati prvu read-only vertikalu bez izravne izmjene view HTML-a;
- napisati tenant/scope negativne testove prije stvarnih podataka;
- potvrditi da demo alati, produkcija i backend tajne ostaju strogo odvojeni.

Nakon prihvata ovog paketa sljedeći korak je contract review, ne automatsko spajanje backenda u `main` ili produkciju.
