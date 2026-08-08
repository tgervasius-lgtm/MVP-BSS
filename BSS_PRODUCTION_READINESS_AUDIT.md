# BSS Deep Code Audit & Production Readiness

| Stavka | Vrijednost |
| --- | --- |
| Datum | 18. 7. 2026. |
| Opseg | cijeli repozitorij, frontend v1.0.0 + Backend MVP Faza B |
| Grana | `agent/bss-backend-phase-b-v1` |
| Cilj | neovisni senior code review; bez novih funkcionalnosti |
| Senior-review spremnost | **93/100** nakon zelenog PR CI-ja |
| Preporuka za rewrite | **NE** |

## Zaključak

Sustav nije kandidat za prepisivanje. Osnovni arhitektonski izbor — modularni monolit, PostgreSQL transakcije, eksplicitni SQL, server-side RBAC i `FORCE ROW LEVEL SECURITY` — primjeren je MVP-u i ostavlja dobar put za daljnji razvoj. Audit nije samo ponovno pokrenuo testove: pronađene su i ispravljene greške u tenant scopeu, concurrencyju, migracijskim invariantama, sesijama, terminalskom redoslijedu, vremenskim zonama, cacheiranju i produkcijskoj konfiguraciji.

Ukupno je potvrđeno i ispravljeno **66 konkretnih problema** u dva audit prolaza. Drugi prolaz dodatno je zatvorio stale-invitation preuzimanje računa, auth TOCTOU utrke, preranu terminalsku vjerodajnicu, moguće curenje PostgreSQL detalja u log, nezaštićene lokalne `.env` datoteke i nepouzdan clean-clone workflow. Najveći preostali dug su dvije prevelike backend service datoteke i legacy frontend composition root. To opravdava postupno izdvajanje modula, ali ne rewrite. Funkcionalni MVP može ići na senior review bez velikog prethodnog refaktora. Produkcijski pilot i dalje ovisi o izboru hostinga, managed PostgreSQL-u, secret/KMS sustavu, backup/restore drill-u, monitoringu i load testu; to nisu promjene koje se mogu pošteno “automatski” zaključiti u repozitoriju.

## Metoda i dokaz

Pregledani su arhitektura, svi TypeScript/JavaScript moduli, SQL migracije i grantovi, OpenAPI, frontend/API adapteri, service worker, workflowi, testovi, dokumentacija i produkcijska konfiguracija. Korišteni su strict TypeScript, ESLint, Redocly, Node testovi, Playwright/axe, dependency audit, statičko pretraživanje mrtvog i rizičnog koda te ručni pregled transakcijskih i tenant granica.

Finalni dokaz mora biti vezan uz isti PR commit:

- frontend lint + **104/104** unit/regression testa + deterministički build;
- backend TypeScript + Redocly + **32/32** lokalna unit/contract testa;
- PostgreSQL integracijski suite uz `BSS_REQUIRE_POSTGRES_TESTS=true` — lokalno se ne smije lažno proglasiti prolaznim bez PostgreSQL-a;
- migracije `001`–`008`, stvarna `NOBYPASSRLS` runtime uloga i dvije organizacije;
- full-stack Chromium desktop/mobile + axe protiv stvarnog Fastify/PostgreSQL procesa;
- produkcijski dependency audit bez high/critical nalaza.

## Pronađeni i ispravljeni problemi

### Arhitektura, modularnost i održivost

| ID | Ozbiljnost | Problem | Ispravak |
| --- | --- | --- | --- |
| ARC-01 | visoka | Transakcijski lifecycle bio je implementiran na više mjesta; rollback greška mogla je vratiti neispravan klijent u pool ili sakriti izvornu grešku. | Uveden je zajednički `withTransaction`; neispravan klijent se odbacuje, a dvostruka greška ostaje vidljiva kao `AggregateError`. |
| ARC-02 | srednja | Tenant helper mogao je otvoriti nepotrebne/ugniježđene DB veze. | Tenant kontekst sada koristi isti transakcijski klijent kroz cijelu operaciju. |
| ARC-03 | srednja | Validacija UUID-a, revizije, datuma, cursora i DB grešaka bila je raspršena. | Izdvojeni su `http/schema`, `services/validation`, `cursors`, `database-errors` i `dataset-version`. |
| ARC-04 | niska | Četiri dokazano nepozvane legacy frontend funkcije povećavale su površinu za održavanje. | Uklonjeni su mrtvi mjesečni/KPI/request helperi; compatibility fixture ostavljen je jer ga regresijski ugovor još namjerno provjerava. |
| ARC-05 | srednja | TypeScript dopuštao je labavije opcionalne vrijednosti i implicitno nepokrivene grane. | Uključeni su stroži compiler i ESLint gateovi te dodani ciljano tipizirani helperi. |
| ARC-06 | srednja | Root `check` nije provjeravao oba dijela sustava, a frontend release workflow bi nakon promjene pokrenuo backend bez instaliranih ovisnosti. | Root gate sada provjerava frontend i backend; zamrznuti frontend release eksplicitno koristi `check:frontend`. |
| ARC-07 | niska | Terminalski integracijski scenarij koristio je fiksni datum sljedećeg dana pa je rezultat ovisio o vremenu pokretanja CI-ja. | Valjani slijed koristi deterministički prošli datum, dok zaseban dinamički test i dalje dokazuje odbijanje događaja iz budućnosti. |
| ARC-08 | srednja | Backend README je upućivao na `.env`, ali runtime, migrator i bootstrap ga nisu učitavali pa dokumentirani clean clone nije radio. | Sve environment-dependent skripte učitavaju opcionalni `backend/.env`, uz prednost stvarnih procesnih varijabli; contract test zaključava taj ugovor. |
| ARC-09 | srednja | Novi developer nije imao jednu provjerenu mapu strukture ni siguran redoslijed za migraciju i okomitu novu funkciju. | Dodan je `DEVELOPER_GUIDE.md`, Node 22 pin, reproducibilni Compose setup, migracijski checklist i mali end-to-end razvojni put iza postojećeg ugovora. |

### Multi-tenant izolacija, RBAC i integritet podataka

| ID | Ozbiljnost | Problem | Ispravak |
| --- | --- | --- | --- |
| TEN-01 | kritična | Jedan attendance dohvat nije dovoljno branio organizacijski/scope kontekst u svim slojevima. | Dodane su service obrane, department/self provjere i negativni cross-tenant testovi. |
| TEN-02 | visoka | Runtime DB grantovi bili su implicitni i širi nego što je nužno. | Dodan je eksplicitni least-privilege grant predložak: bez migracijskog ledgera, tenant kreiranja i općeg `DELETE`; runtime mora biti `NOSUPERUSER NOBYPASSRLS`. |
| TEN-03 | visoka | Sam RLS nije dovoljan ako aplikacija prihvati tenant iz requesta. | Tenant se izvodi isključivo iz verificirane sesije/device identiteta i postavlja s `SET LOCAL`; route body/query nema `organizationId`. |
| TEN-04 | visoka | Aktivni radnik mogao je biti vezan uz blokirani odjel ili smjenu, a odjel se mogao blokirati dok ima aktivne radnike. | Create/update/activate zaključava i zahtijeva aktivan odjel i smjenu; blokiranje odjela odbija aktivne veze. |
| TEN-05 | visoka | Migracije nisu zaključavale sve identity/card invariante koje servis pretpostavlja. | Migracija `008` normalizira e-mailove i dodaje unique/check invariante za radnički e-mail, user↔worker, jednu aktivnu RFID karticu, uloge i worker vezu. |
| TEN-06 | visoka | Smanjenje fonda godišnjeg moglo je pasti ispod već odobrenih i rezerviranih dana. | Worker row se zaključava i nova vrijednost provjerava za svaku pogođenu godinu prije updatea. |
| TEN-07 | visoka | Korekcija se mogla odobriti nakon što se attendance zapis promijenio izvan njezina `before` snapshota. | Approval zaključava oba retka i uspoređuje aktualni zapis sa snapshotom; stale zahtjev vraća 409 bez promjene podataka. |
| TEN-08 | visoka | Promjena zadnjeg aktivnog administratora mogla je ostaviti tenant bez administratora. | Aktivni administratori se zaključavaju i zadnji se ne može blokirati ni degradirati. |
| TEN-09 | visoka | Blokiranje/deaktivacija identiteta nije u svim tokovima odmah opozivala sesije. | Blokiranje usera i deaktivacija povezanog radnika opozivaju aktivne sesije u istoj transakciji. |
| TEN-10 | srednja | RFID block nije bio potpuno idempotentan i mogao je nepotrebno povećavati reviziju/audit. | Kartica se prvo zaključava; već blokirana kartica vraća postojeće stanje bez nove mutacije. |
| TEN-11 | srednja | Shift, attendance, clock offset, terminal name/location i credential period oslanjali su se previše na aplikacijsku validaciju. | Migracija `008` dodaje DB check constraints za redoslijed i tvrde granice. |
| TEN-12 | srednja | Unique indeksi na normaliziranim legacy podacima mogli su pasti nejasnom greškom ili prikriti duplikate. | Migracija ima preflight koji namjerno prekida s konkretnom porukom; dvosmisleni podaci se nikada automatski ne brišu. |

### Autentikacija, sesije i sigurnost

| ID | Ozbiljnost | Problem | Ispravak |
| --- | --- | --- | --- |
| SEC-01 | kritična | Produkcija je mogla krenuti s implicitnim DB URL-om, HTTP originom, nesigurnim cookiejem ili placeholder tajnama. | `loadConfig` je fail-fast za produkciju i zahtijeva HTTPS, secure cookies, eksplicitni DB URL i tri različite snažne tajne. |
| SEC-02 | visoka | DB TLS mogao je biti isključen ili koristiti neprovjeren certifikat. | Produkcija zahtijeva TLS s `rejectUnauthorized`; privatni CA ulazi kroz `DATABASE_SSL_CA`. |
| SEC-03 | visoka | Generički `TRUST_PROXY=true` mogao je učiniti rate limit/logove ovisnima o napadačevom headeru. | Produkcija prihvaća samo `false` ili eksplicitan IP/CIDR popis proxyja. |
| SEC-04 | kritična | Konkurentna uporaba istog refresh tokena mogla je otvoriti više aktivnih potomaka ili ne zabilježiti reuse. | Rotacija je atomska; reuse opoziva aktivnu sesijsku obitelj i zapisuje sigurnosni audit. |
| SEC-05 | srednja | Predugi session TTL mogao se postaviti greškom konfiguracije. | Access je ograničen na 24 sata, refresh na 365 dana i uvijek mora biti dulji od accessa. |
| SEC-06 | srednja | Ponovljeni logout bez valjanog access cookieja nije bio potpuno idempotentan. | Logout koristi refresh kad postoji, sigurno prihvaća istekle/nedostajuće vjerodajnice, uvijek čisti cookieje, a infrastrukturne greške ne skriva. |
| SEC-07 | visoka | Istekla/neprihvaćena pozivnica mogla je trajno zauzeti e-mail i onemogućiti novi poziv. | Neaktivni placeholder se zaključava i ponovno koristi; stari pozivi se opozivaju, novi token je jednokratan, aktivni račun ostaje konflikt. |
| SEC-08 | visoka | Blokirana organizacija ili korisnik mogli su proći dio auth/device lookup toka. | Login, resolve, refresh, invitation i terminal nakon lookup-a ponovno zahtijevaju aktivan tenant/identitet. |
| SEC-09 | srednja | Klijentski request ID mogao je ući u logove/audit kao pouzdan podatak. | Server generira UUID request ID i ignorira ulazni request-id header. |
| SEC-10 | visoka | Osjetljivi cookie, authorization i terminalski potpisi mogli su završiti u strukturiranom logu. | Pino redaction uklanja session/authorization/signature/nonce/set-cookie vrijednosti. |
| SEC-11 | srednja | Dependency chain za XLSX imao je poznati zastarjeli `uuid` podpaket. | Zaključan je podržani override i oba production dependency audita moraju biti čista. |
| SEC-12 | srednja | GitHub Actions koristile su promjenjive tagove. | `checkout` i `setup-node` zaključani su na pune commit SHA vrijednosti. |
| SEC-13 | kritična | Ručno zaostala, još valjana pozivnica za već aktivan račun mogla je ponovno postaviti njegovu lozinku u nekonzistentnom/importiranom stanju baze; accept/reinvite su uzimali lockove obrnutim redom. | Accept zahtijeva blokirani placeholder i atomski aktivira samo još blokiranog korisnika iste uloge; user→invitation lock order podudara se s reinvite tokom, a stale/konkurentna promjena vraća generički 401 i rollbacka cijelu transakciju. |
| SEC-14 | visoka | Login i refresh su identitet provjeravali prije transakcije pa je konkurentno blokiranje tenanta/korisnika ili promjena uloge mogla stvoriti odmah nevaljanu novu sesiju. | Prije session inserta transakcija zaključava i ponovno provjerava aktivnu organizaciju i korisnika; login dodatno zahtijeva nepromijenjenu ulogu. |
| SEC-15 | visoka | Root `.gitignore` nije štitio `.env` datoteke, pa je dokumentirani lokalni setup povećavao rizik slučajnog commita tajni. | Ignorirani su `.env` i `.env.*`, uz eksplicitnu dozvolu samo za `.env.example`; contract test sprečava regresiju. |
| SEC-16 | srednja | Strukturirani PostgreSQL error objekt može sadržavati `detail`, query ili parametre s poslovnim/osobnim podacima. | Logger sada uz sigurnosne headere redigira DB `detail`, `where`, `query`, `internalQuery` i `parameters`, dok zadržava siguran error code i request ID. |

### Concurrency, terminal i vremenski rubni slučajevi

| ID | Ozbiljnost | Problem | Ispravak |
| --- | --- | --- | --- |
| CON-01 | visoka | Konkurentni godišnji zahtjevi mogli su zajedno prijeći raspoloživi fond. | Worker row lock serijalizira izračun i insert; više-godišnji zahtjev provjerava svaku godinu. |
| CON-02 | visoka | Više terminala istog tenanta moglo je uzeti worker lockove različitim redom i završiti u deadlocku. | Batch uzima transakcijski advisory lock po tenantu i zadržava idempotentni sequence/device-event ugovor. |
| CON-03 | visoka | Kasni `check_in` nakon ranije primljenog `check_out` događaja ostavljao je nekonzistentan dan. | Valjani par se deterministički rekoncilira; nemoguć redoslijed vraća `CHECK_IN_AFTER_CHECK_OUT`. |
| CON-04 | visoka | Noćna smjena mogla je pogrešno računati kašnjenje nakon ponoći. | Minute se normaliziraju preko granice dana i uspoređuju sa snapshotom noćne smjene. |
| CON-05 | visoka | Terminal je mogao poslati događaj značajno u budućnosti ili predug attendance interval. | Budući događaji iznad tolerancije i intervali iznad 16 sati odbijaju se; raw dokaz ostaje append-only. |
| CON-06 | visoka | Device auth se mogao osloniti samo na raniji credential lookup. | Nakon HMAC provjere transakcija ponovno zaključava terminal i provjerava terminal/organization status; decrypt ili signature greška fail-closed vraća generički 401. |
| CON-07 | srednja | Neograničeni batch, sequence, offset, queue depth i nonce povećavali su DoS/resource rizik. | HTTP/OpenAPI tvrdo ograničavaju batch na 500, body na 1 MiB i sva numerička/string polja. |
| CON-08 | srednja | DST i datum organizacije bili su izvedeni iz browserove lokalne zone. | Frontend koristi organizacijsku IANA zonu, DST-aware pretvorbu, odbija nepostojeće wall-clock vrijeme i testira ljetni/zimski pomak. |
| CON-09 | visoka | Novi DB time-order constraint zabranio je privremeni `check_out` bez `check_in`, iako offline terminalski ugovor namjerno podržava naknadnu rekoncilijaciju događaja. | Constraint sada dopušta samo taj nepotpuni međukorak; čim postoje oba vremena, baza i dalje zahtijeva ispravan redoslijed i najviše 16 sati. PostgreSQL integracija pokriva oba smjera dolaska. |
| CON-10 | visoka | Terminal credential lookup vraćao je `valid_from`, ali servis nije odbijao vjerodajnicu prije početka njezina perioda valjanosti. | Device auth provjerava obje granice perioda prije dekripcije i potpisa; PostgreSQL integracija dokazuje fail-closed ponašanje prije `valid_from`. |

### API, frontend integracija, error handling i cache

| ID | Ozbiljnost | Problem | Ispravak |
| --- | --- | --- | --- |
| API-01 | visoka | ID/query i `If-Match` ulazi nisu svugdje imali jednako strogu validaciju; jedan regex nije mogao kompajlirati Fastify. | UUID i pozitivni bigint ETag format centralizirani su u Fastifyju i OpenAPI-ju; dodan je test stvarne registracije svih ruta. |
| API-02 | visoka | Dio listi vraćao je samo prvu stranicu ili je mogao dohvatiti nekontroliran raspon. | Attendance, workers, users, leave, corrections, audit, exports i terminal timeline koriste bounded cursor pagination; frontend skuplja sve potrebne stranice. |
| API-03 | srednja | Datumski rasponi i report veličina mogli su uzrokovati velik query/memorijski artefakt. | Rasponi su strogo validirani, report je ograničen na 10.000 redaka i nikad se tiho ne reže. |
| API-04 | visoka | OpenAPI operation mogao je postojati bez registrirane Fastify rute. | Contract test normalizira svih 54 path/method parova i provjerava `app.hasRoute`. |
| API-05 | srednja | Problem response i neočekivane DB greške nisu bili dovoljno centralizirani. | Stabilni error envelope, očekivano mapiranje constraint grešaka, generički 500 i strukturirano server-side logiranje. |
| API-06 | visoka | Paralelni frontend 401 odgovori mogli su rotirati refresh cookie više puta. | Jedna in-flight rotacija dijeli se unutar taba i koordinira verzijom između tabova. |
| API-07 | srednja | Zaglavljeni fetch mogao je beskonačno držati UI resurse. | Svi API pozivi imaju 20-sekundni `AbortController` timeout i stabilnu poruku greške. |
| API-08 | visoka | Service worker mogao je vratiti stari shell ili cacheirati privatni API. | Nova cache verzija, `skipWaiting`, `clientsClaim`, network-first/no-store navigacija, network-only `/api/` i brisanje samo starih `bss-*` cacheva. |
| API-09 | srednja | Frontend je dohvaćao RFID kartice neograničeno paralelno. | Eager dohvat je ograničen na osam paralelnih zahtjeva; veća strukturna optimizacija evidentirana je kao preostali dug. |
| API-10 | srednja | Report output je bio izložen formula injectionu i ponovnom učitavanju fonta. | CSV/XLSX neutraliziraju opasne početne znakove; PDF fontovi se učitavaju jednom i rezultat ima SHA-256. |

### Performance, resursi, migracije i operacije

| ID | Ozbiljnost | Problem | Ispravak |
| --- | --- | --- | --- |
| OPS-01 | visoka | Timeline upiti i cleanup nisu imali odgovarajuće indekse. | Migracija `008` dodaje indekse za attendance/leave/correction/audit timeline te expiry/revoked cleanup. |
| OPS-02 | srednja | DB pool je bio implicitne veličine i bez jasnih timeouta. | `DATABASE_POOL_MAX` je ograničen (default 10, max 100), uz connect/idle/query/statement timeout. |
| OPS-03 | visoka | Istečeni report `bytea`, nonce i session retci mogli su neograničeno rasti. | Dodan je idempotentni per-tenant `deploy/maintenance.sql`; audit i raw događaji se ne brišu. |
| OPS-04 | visoka | Liveness nije razlikovao živ proces od nedostupne baze. | `/healthz` ostaje procesni liveness, `/readyz` provjerava PostgreSQL i vraća 503. |
| OPS-05 | srednja | Migracijski/down workflow mogao je biti nejasan ili djelomično primijenjen. | Migracije su checksumirane, advisory-lockane, svaka u vlastitoj transakciji; production down je zabranjen, rollback je forward-compatible aplikacijski rollback. |
| OPS-06 | srednja | Produkcijski build nije jamčio migracijske SQL artefakte. | Build kopira migracije i CI pokreće compiled migration smoke. |
| OPS-07 | srednja | Graceful shutdown i idle pool greške nisu bili obrađeni. | SIGINT/SIGTERM zatvaraju Fastify pa pool; neočekivana idle DB greška se logira bez curenja resursa. |
| OPS-08 | srednja | Dokumentacija je još opisivala statički demo i stare limite/migracije. | Dodan je glavni README, aktualizirani Architecture/Readiness/Handoff/Operations/OpenAPI i legacy upute pretvorene u pointer. |
| OPS-09 | visoka | Primjer DB URL-a koristio je nepostojeću ulogu, a integracijske upute nisu davale izoliranu testnu bazu pa je novi developer mogao zapeti ili testirati nad pogrešnim podacima. | Lokalni primjer odgovara Compose bazi; zaseban profile pokreće `bss_test` na portu 5433 u `tmpfs`-u, uz izričitu zabranu dijeljene/produkcijske baze. |

## Potvrđene kontrole koje nisu zahtijevale promjenu

- Svi poslovni retci nose tenant ključ, relevantne relacije koriste složeni tenant FK, a poslovne tablice imaju `ENABLE` + `FORCE RLS`.
- Raw terminalski događaji i audit nemaju mutation API; DB triggeri sprečavaju update/delete autoritativnog dokaza.
- Lozinke su Argon2id, opaque tokeni i RFID UID spremaju se samo kao hash/HMAC, a device credential je AES-256-GCM enkriptiran.
- Manager, worker i accountant imaju odvojene HTTP permission i SQL scope granice; frontend skrivanje nije tretirano kao autorizacija.
- CSV/XLSX/PDF koriste isti autoritativni dataset i checksum; frontend ne računa službene poslovne total-e.

## Što nije moguće ili nije opravdano automatski ispraviti

| ID | Rizik | Preostala stavka | Zašto nije automatski promijenjeno / preporuka |
| --- | --- | --- | --- |
| REM-01 | srednji | `PgMvpService` (~1.400 redaka) i `PgPhaseAService` (~1.350) imaju previše odgovornosti. | Razdvojiti inkrementalno po domenama attendance/leave/corrections/reporting/terminal/workforce nakon senior pregleda. Veliki jednokratni refactor sada bi povećao rizik; rewrite nije potreban. |
| REM-02 | srednji | `app.js` je i dalje velik legacy composition/render modul. | Frozen frontend ugovor i 104 regresijska testa smanjuju rizik. Izdvajati ekran po ekran samo uz isti UX; ne vraćati mock poslovno stanje. |
| REM-03 | srednji | RFID hidratacija je bounded N+1 (jedan dohvat po radniku). | Za veće tenante treba batch/lazy endpoint ili server-side projection, što mijenja API ugovor i nije dio ovog audita bez novih funkcija. |
| REM-04 | srednji | Terminal batch je namjerno serijski i per-tenant zaključan. | Ispravno je za pilot i čuva redoslijed; prije većeg broja terminala napraviti load test i po potrebi particionirati lock po workeru uz kanonski lock order. |
| REM-05 | srednji | Report se generira sinkrono i cijeli artefakt je u memoriji/PostgreSQL `bytea`. | Limit 10.000/24 h kontrolira MVP. Queue, streaming i private object storage uvode se tek kad mjerenje pokaže potrebu. |
| REM-06 | srednji | Rate limit je memorijski i po instanci. | Za više replika treba Cloudflare/WAF ili dijeljeni Redis limiter; odluka o platformi još nije donesena. |
| REM-07 | srednji | RLS custom GUC je defense-in-depth za ispravan runtime, ne izolacija od kompromitirane DB vjerodajnice koja može slati proizvoljni SQL. | Runtime mora ostati nedostupan korisniku i najmanje privilegiran. Za hostile-credential model trebaju security-definer gateway funkcije ili odvojene tenant uloge — zasebna sigurnosna arhitektonska odluka. |
| REM-08 | srednji | Nema automatizirane rotacije RFID peppera i terminal encryption ključa unatoč `keyVersion` metapodatku. | Rotacija zahtijeva KMS, dual-read period i plan re-enrollmenta; dokumentirati i provježbati prije šire produkcije. |
| REM-09 | visoki za produkciju, nije code-review blocker | Nisu odabrani Node hosting, managed PostgreSQL, KMS, observability ni incident platforma. | Izabrati platformu, zatim dodati platform-specific IaC, smoke i alerting. Cloudflare Pages sam nije backend hosting. |
| REM-10 | visoki za stvarne podatke | Backup/PITR/restore drill i GDPR retention nisu izvršivi samo iz repozitorija. | Vlasnik podataka i operator moraju odobriti retention, uključiti PITR i evidentirati uspješan restore drill prije pilota. |
| REM-11 | srednji | Nema mjerljivog load/soak profila ni query plana na realističnoj količini podataka. | Prije pilota generirati reprezentativne volumene, pratiti p95/p99, pool i `EXPLAIN (ANALYZE, BUFFERS)` za dashboard, timeline i report. |
| REM-12 | niski | Browser E2E je Chromium desktop/mobile; nema automatiziranog WebKit/Firefox gatea ni ručnog screen-reader zapisa. | Dodati prije šire javne distribucije ako matrica podržanih browsera uključuje Safari/Firefox. |
| REM-13 | niski | `team` visibility trenutno se mapira na odjel jer MVP nema zaseban team entitet. | To je dokumentirana scope granica; ne stvarati novi model bez product odluke. |
| REM-14 | niski | E-mail korisnika je globalno jedinstven, iako je većina domena tenant-scoped. | Trenutačni login ugovor koristi e-mail bez tenant identifikatora. Promjena zahtijeva novu auth odluku, migraciju i UX; nije za tihi refactor. |
| REM-15 | niski | API sheme postoje i u OpenAPI-ju i u Fastify JSON Schema kodu; contract test dokazuje rute/operation ID, ne svaku semantičku razliku schema-to-schema. | Dugoročno generirati server/client tipove ili route sheme iz jednog izvora. Trenutačno hash, Redocly i ciljane contract provjere smanjuju drift. |
| REM-16 | niski | Nema generičkog retryja za PostgreSQL deadlock/serialization failure. | Trenutačni kanonski lockovi uklanjaju poznate raceove. Retry dodati samo na idempotentnoj service granici ako produkcijska metrika pokaže potrebu. |
| REM-17 | niski | CI Postgres service koristi major tag umjesto immutable image digest-a. | Zaključati digest nakon što tim odredi cadence za sigurnosne nadogradnje; slijepo zamrzavanje imagea može zaustaviti patch updateove. |
| REM-18 | srednji | SAST/secret scan i DAST nisu obvezni gateovi repozitorija. | Uključiti CodeQL/secret protection i staging DAST nakon organizacijskog odabira GitHub/security alata. Dependency audit i ručni secure-code pregled već su uključeni. |
| REM-19 | srednji, privatnost | IP adresa i user-agent spremaju se kao neslani SHA-256 pseudonimi u sesiji; IP ima mali prostor vrijednosti i hash nije anonimnost. | Senior, DPO i security trebaju odlučiti pravnu osnovu, minimalni retention i treba li podatak ukloniti ili HMAC-irati posebnim rotirajućim ključem. To se ne smije tiho promijeniti bez incident/audit zahtjeva. |

## Procjena spremnosti

| Područje | Ocjena | Napomena |
| --- | ---: | --- |
| Arhitektura i modularnost | 89% | dobar modularni monolit i jasan developer put; dva service modula treba postupno razdvojiti |
| Integritet, transakcije i concurrency | 96% | ključni raceovi, stale updatei i device validity rubovi zatvoreni; realni load test tek slijedi |
| Tenant izolacija i RBAC | 96% | dvostruka aplikacijska + RLS granica; DB credential threat model je dokumentiran |
| Auth i sigurnost | 95% | stale pozivnica i session TOCTOU su zatvoreni; KMS rotacija/WAF/SAST ovise o platformi |
| API i frontend integracija | 92% | svih 54 operacija pokriveno; dual schema source ostaje tehnički dug |
| Testovi i CI | 95% | unit/contract/PG/browser/a11y i onboarding contract; nedostaju load, WebKit/Firefox i DAST |
| Operacije i deployment | 81% | reproducibilan lokalni start i kvalitetan runbook; hosting, PITR, monitoring i restore drill nisu još provedeni |
| **Spremnost za neovisni senior code review** | **93%** | spremno nakon zelenih obveznih PR gateova |

## Što senior obvezno treba pregledati

1. potvrditi plan inkrementalnog razdvajanja dvaju velikih service modula bez promjene `MvpService`/OpenAPI ugovora;
2. odobriti RLS threat model i runtime grantove, posebno činjenicu da kompromitirana izravna DB vjerodajnica nije tenant sandbox;
3. odlučiti o retentionu i zaštiti IP/user-agent pseudonima te audit/osobnih podataka;
4. pregledati KMS strategiju rotacije RFID peppera i terminalskog encryption ključa;
5. odobriti stvarni hosting, privatnu mrežu, WAF/shared rate limit, observability i incident runbook;
6. pregledati dokaz prvog PITR restore drilla, load/soak rezultate i ključne PostgreSQL query planove;
7. odlučiti kada objediniti OpenAPI i Fastify schema izvore te kada bounded RFID N+1 opravdava API promjenu.

## Hoće li senior preporučiti prepisivanje?

**Nema tehničkog razloga za rewrite cijelog sustava niti ključne domene.** Senior će vrlo vjerojatno tražiti:

1. postupno razdvajanje `PgMvpService` i `PgPhaseAService` po domenama;
2. jedan izvor API schema/tipova;
3. load test i platformsku produkcijsku infrastrukturu;
4. kasniju ekstrakciju report storagea/queuea i terminal ingest skaliranja samo ako volumen to opravda.

To su inkrementalne promjene s postojećim testovima i OpenAPI ugovorom kao sigurnosnom mrežom. Prepisivanje autha, attendancea, leavea, RLS modela ili cijelog backenda povećalo bi rizik bez odgovarajuće koristi.

Ovaj audit ne odobrava merge u `main` ni produkcijski deploy.
