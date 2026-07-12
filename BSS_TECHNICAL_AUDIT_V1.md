# BSS tehnički audit v1.0

| Stavka | Vrijednost |
| --- | --- |
| Status | Dovršeno – ulazna kontrola za Refactor v1 |
| Datum | 12.07.2026. |
| Product Owner | Tomislav Bognar |
| Repozitorij | `tgervasius-lgtm/MVP-BSS` |
| Pregledana osnova | `main` nakon spajanja PR-ova #9, #10 i #11 (`29353f8`) |
| Produkcijska objava | `https://mvp-bss.pages.dev/` |
| Povezani dokument | `BSS_MVP_SCOPE_FREEZE_V1.md` |

## 1. Izvršni zaključak

Demo 3.0 je kvalitetna izvršiva specifikacija BSS proizvoda: potvrđuje uloge, poslovne tijekove, izgled, responzivnost, RFID/offline koncept i sadržaj izvještaja. Nije produkcijska arhitektura i u njega se ne smiju unositi stvarni podaci radnika.

Najveća vrijednost postojećeg rada nije privremena pohrana u pregledniku, nego već definirano ponašanje koje se mora sačuvati regresijskim testovima. Najveći rizik bio bi izravno priključiti stvarni backend na monolitni demo bez prethodnog razdvajanja prikaza, poslovnih pravila, stanja i infrastrukturnih adaptera.

Odluka audita je zato:

1. zamrznuti MVP opseg dokumentom `BSS_MVP_SCOPE_FREEZE_V1.md` i manifestom `bss-mvp-scope-v1.json`;
2. provesti Refactor v1 bez promjene odobrenog izgleda i ponašanja;
3. tek nakon toga zaključati API ugovor, model podataka i terminalski protokol;
4. izgraditi produkcijski backend i provesti četverotjedni pilot.

## 2. Pregledana osnova i mjerljivi nalazi

Audit obuhvaća aplikaciju, Design System, Brand Book, PWA ponašanje, automatske testove, plan backenda i aktivnu Cloudflare Pages objavu.

| Pokazatelj | Stanje na dan audita | Značenje |
| --- | ---: | --- |
| `app.js` | 2.025 redaka | Cijela aplikacija, poslovna pravila i prikaz u jednoj datoteci |
| Funkcije u `app.js` | 255 | Široka međusobna povezanost bez jasnih granica modula |
| Inline `onclick` veze | 146 | Događaji su vezani uz generirani HTML i otežavaju strogi CSP |
| Dodjele u `innerHTML` | 15 | Zahtijevaju centralizirano sigurno renderiranje i provjeru XSS-a |
| Pozivi `localStorage` | 11 | Klijent je trenutačno jedini izvor stanja i demo identiteta |
| `styles.css` | 411 redaka | Funkcionalan, ali bez slojeva po komponentama i ekranima |
| Testovi prije audita | 60/60 prolazi | Dobra regresijska osnova, dominantno JSDOM |
| Produkcijske stranice | 3/3 vraćaju HTTP 200 | Demo, Design System i Brand Book aktivni su na Cloudflareu |

### Potvrđene snage

- Opseg proizvoda je uzak i poslovno razumljiv.
- Četiri uloge već imaju vidljivo različite navigacije i opsege podataka.
- Evidencija, godišnji odmori, korekcije, izvještaji i terminal čine povezan tijek.
- Demo modelira idempotentni terminalski događaj, offline red i heartbeat.
- Dizajn je responzivan, podržava tipkovnicu, smanjeno kretanje, svijetlu i tamnu temu.
- Design System v1.0 i Brand Book v1.0 daju zaključane vizualne tokene i pravila uporabe.
- Regresijska baza od 60 testova smanjuje rizik strukturnog refaktora.
- Plan produkcijskog backenda već opisuje PostgreSQL, poslužiteljski RBAC, audit i pilot.

## 3. Nalazi i prioriteti

### P0 – blokira stvarne podatke i pilot

| ID | Nalaz | Dokaz/rizik | Obvezna kontrola |
| --- | --- | --- | --- |
| P0-01 | Nema API-ja, baze ni poslužiteljske autentikacije | Uloge, sesija i poslovni podaci nalaze se u pregledniku; korisnik ih može izmijeniti | Backend mora biti jedini autoritet za identitet, ovlasti i službene zapise |
| P0-02 | Nema provedene izolacije organizacija | `organization_id` nije poslužiteljski izveden ni provjeren | Svaki upit i zapis moraju biti ograničeni organizacijom iz sesije/identiteta uređaja |
| P0-03 | Aplikacija je monolit | 2.025 redaka, 255 funkcija i prikaz, stanje, pravila i pohrana u istoj datoteci | Refactor v1 mora razdvojiti domenu, politike, adaptere, prikaze i ulaznu točku |
| P0-04 | Terminal je simulator | Offline red nije trajno spremište uređaja; nema stvarnog uparivanja, potpisa ni potvrđenog brisanja | Uvesti identitet uređaja, lokalni trajni red, potpisane batch pakete, idempotenciju i heartbeat |
| P0-05 | Vrijeme nije autoritativno | Demo koristi vrijeme preglednika, fiksne 2026. podatke i demo datume | Server čuva UTC, organizacija definira vremensku zonu, a pravila pokrivaju DST i smjene preko ponoći |
| P0-06 | Audit je promjenjivo klijentsko stanje | Korisnik može izmijeniti ili obrisati lokalni audit | Produkcijski audit mora biti append-only, poslužiteljski i bez naknadnog uređivanja |
| P0-07 | Izvozi nisu službeni obračunski artefakti | CSV/XLSX nastaju na klijentu bez spremljenog skupa filtara, checksum-a i zaključavanja mjeseca | Server mora stvarati ponovljiv izvoz iz snimke podataka i spremiti checksum |

### P1 – mora biti riješeno prije pilota

| ID | Nalaz | Dokaz/rizik | Obvezna kontrola |
| --- | --- | --- | --- |
| P1-01 | Renderiranje i događaji nisu spremni za strogi CSP | 146 inline `onclick` veza i ručne HTML predloške teško je potpuno zaštititi | Ukloniti inline handlere, koristiti delegirane događaje i zajedničke sigurne renderere |
| P1-02 | Cloudflare i konfiguracija repozitorija nisu usklađeni | `netlify.toml` definira zaglavlja, ali produkcija je Cloudflare; CSP, `frame-ancestors` i Permissions Policy nisu potpuni | Dodati Cloudflare `_headers`, ukloniti zastarjelu Netlify konfiguraciju nakon provjere i uvesti CSP u fazama |
| P1-03 | Validacija je raspoređena po UI funkcijama | Pravila i hrvatske poruke nisu zajedničke sheme ni stabilni kodovi pogreške | Jedna shema/pravilo po use-caseu; API vraća stabilan kod, UI ga prevodi |
| P1-04 | PWA strategija može postati opasna uz privatni API | Service Worker koristi široki cache-first obrazac za GET resurse | Autentificirani API i privatni odgovori moraju biti `network-only` i nikada u javnom cacheu |
| P1-05 | Nema operativne spremnosti | Nisu implementirani strukturirani logovi, metrike, alarmi, backup ni test obnove | Definirati observability, RPO/RTO, šifrirani backup i probnu obnovu prije pilota |
| P1-06 | CI ne provodi cijelu kvalitetnu ogradu | Nema linta, typechecka ni verzioniranog browser E2E paketa | CI mora provesti unit/integration, Playwright desktop+mobile, a11y i build provjeru |
| P1-07 | Pristupačnost nije automatizirano mjerena u stvarnom browseru | Postoje semantičke provjere i ručni QA, ali nema axe/screen-reader regresije | Dodati axe, tipkovničke scenarije i ručnu provjeru čitačem ekrana za ključne tokove |
| P1-08 | Sigurnosna pravila postoje kao plan, ne kao provedba | Nema rate limita, MFA, rotacije tokena, tajni uređaja ni sigurnosnih logova | Provesti kontrole iz `BACKEND_MVP_PLAN.md` prije stvarnih korisnika |

### P2 – održivost nakon odvajanja arhitekture

| ID | Nalaz | Posljedica | Plan |
| --- | --- | --- | --- |
| P2-01 | CSS i legacy aliasi nisu razdvojeni po odgovornosti | Teže je pratiti regresije i ukloniti zastarjele stilove | Slojevi: tokens, base, components, layouts, screens, utilities |
| P2-02 | Statusi, datumi i demo fixturei su stringovi u više mjesta | Moguće neslaganje filtera, oznaka i izvoza | Stabilni kodovi iz scope manifesta; lokalizirane oznake na rubu UI-ja |
| P2-03 | Nema adaptera za sat, ID, pohranu i mrežu | Testovi ovise o globalnom browser stanju | Uvesti zamjenjive adaptere i determinističke fixturee |
| P2-04 | Četiri Brand Book Figma framea čekaju popunu | Dokumentacija u Figmi nije jednaka dovršenom web/PDF paketu | Popuniti kada Figma Starter MCP kvota ponovno bude dostupna; nije blokada za Refactor v1 |

## 4. Procjena spremnosti

| Područje | Demo/prodaja | Refactor v1 | Stvarni pilot danas |
| --- | --- | --- | --- |
| Poslovni tokovi i sadržaj | Spremno | Sačuvati bez promjene | Nije dovoljno bez servera |
| Vizualni sustav | Spremno | Koristiti postojeće tokene | Spremno kao frontend osnova |
| Uloge i privatnost | Vizualno demonstrirano | Centralizirati politike | Nije sigurno bez poslužiteljske provedbe |
| RFID/offline | Koncept demonstriran | Izdvojiti port/adapter | Nije stvarni uređaj ni trajni red |
| Podaci i audit | Demo stanje | Izdvojiti modele | Nije službena ni nepromjenjiva evidencija |
| Izvještaji | Sadržajno definirani | Izdvojiti zajednički dataset | Nisu ponovljivi poslužiteljski artefakti |
| Testovi | Dobra JSDOM regresija | Dodati granice modula i browser CI | Nema sigurnosnih/integracijskih testova backenda |
| Operacije | Cloudflare statična objava radi | Uskladiti build i zaglavlja | Nema nadzora, backupa ni recoveryja |

## 5. Odluka o Refactoru v1

Refactor v1 je strukturna faza. Ne mijenja odobreni dizajn, nazive modula, uloge, poslovna pravila ni MVP opseg. U istoj fazi ne uvodi se frontend framework niti stvarni backend jer bi istodobna migracija otežala dokazivanje regresije.

### Ciljana granica modula

```text
src/
  app/          pokretanje, usmjeravanje i sastavljanje ovisnosti
  domain/       čisti modeli, izračuni i poslovna pravila
  policies/     RBAC i opseg odjela/radnika
  use-cases/    naredbe i upiti aplikacije
  adapters/     demo pohrana, sat, ID, izvoz i budući HTTP klijent
  views/        ekrani, komponente, formatiranje i događaji
  fixtures/     isključivo demo podaci
```

### Redoslijed izvedbe

1. Uvesti ES module build, lint i formatter bez promjene izlaza aplikacije.
2. Izdvojiti stabilne kodove, datumske funkcije, izračune sati i radnih dana kao čistu domenu.
3. Izdvojiti RBAC i scope politike te zadržati postojeće testove privatnosti.
4. Izdvojiti adaptere za `localStorage`, sat, ID, datoteke i terminalski simulator.
5. Podijeliti prikaze po ekranima, ukloniti inline handlere i centralizirati sigurno renderiranje.
6. Razdvojiti CSS slojeve uz postojeće Design System tokene.
7. Dodati Cloudflare `_headers`, sigurno PWA cache pravilo i postupno pooštravanje CSP-a.
8. U CI dodati build, lint, unit/integration, Playwright desktop+mobile i axe provjere.

### Kriteriji završetka Refactora v1

- Svi postojeći testovi i novi testovi granica modula prolaze.
- Ključni tokovi imaju isti tekst, podatke, uloge i rezultat kao Demo 3.0.
- Nema inline event handlera; nesigurni HTML ulazi imaju jednu kontroliranu granicu.
- `localStorage` se koristi samo kroz demo adapter koji se može zamijeniti HTTP adapterom.
- Vrijeme, ID i mreža mogu se zamijeniti u testovima.
- Browser QA prolazi za četiri uloge, mobilni i desktop prikaz te obje teme.
- Cloudflare preview ima dogovorena sigurnosna zaglavlja i nema privatnog API cachea.
- Nema novih funkcija izvan zamrznutog opsega.

## 6. Sljedeće kontrolne točke

| Faza | Izlaz | Uvjet za prolaz |
| --- | --- | --- |
| Audit + scope freeze | Ovaj dokument, scope dokument i strojno čitljiv manifest | Product Owner potvrđuje zaključani opseg |
| Refactor v1 | Modularni frontend istog ponašanja | Testovi i stvarni browser QA bez regresije |
| Backend contract | OpenAPI, ER dijagram, statusi, validacije i terminalske sekvence | Pregled sigurnosti i poslovnih pravila |
| Backend MVP | API, PostgreSQL, auth/RBAC, audit, terminal sync i export | Integracijski i sigurnosni kriteriji prolaze |
| Pilot | 10–30 radnika, jedan terminal, četiri tjedna | Nema izgubljenih/dupliciranih zapisa; mjesečni izvoz ponovljiv |

`main` i produkcija ne mijenjaju se iz ove faze bez izričitog odobrenja Product Ownera.
