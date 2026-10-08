# Sandučić — provjera prije aktivacije

Status: `PDF POLICY OWNER ACCEPTED / IMPLEMENTATION FOR REVIEW / CI PENDING / ACTIVATION BLOCKED`, 2026-10-08.
Current policy: [PDF acceptance policy](PDF_ACCEPTANCE_POLICY.md). Historical ClamAV-only failure evidence below is retained; it does not describe a fixed upstream engine.
Osnova: spojeni PR #257, commit `773f5bb0377c84048f149f09295199aeb620ebeb`.
Ovaj postupak ne odobrava hosting, trošak, deployment, migraciju stvarne baze ni uključivanje funkcije. Koristiti samo sintetičke dokumente i odvojeno testno okruženje.

## Potvrđeno stanje i granica dokaza

- GitHub čuva kod i CI dokaze. Cloudflare Pages (`wrangler.toml`, projekt `mvp-bss`) isporučuje frontend/Preview.
- [ADR-001](../bss-os/ADR-001-INFRASTRUCTURE-BASELINE.md) ima status `PROPOSED`: Render Frankfurt je prijedlog za zaseban Fastify backend i PostgreSQL, ne dokaz korištenja ili provisioninga.
- [Readiness Matrix](../../BSS_READINESS_MATRIX.md) i [Control Board](../bss-os/CONTROL_BOARD.md) ostavljaju staging i operativnu obnovu otvorenima.
- [Implementacija sandučića](WORKER_DOCUMENT_MAILBOX_V1.md) zadano je isključena. Sintetički Preview nema stvarni upload/PDF.
- `backend/test/helpers/document-fixture.ts` koristi zamjenski scanner. PostgreSQL testovi potvrđuju bazu/RLS, ne učinkovitost stvarnog ClamAV enginea. Testovi socket protokola također nisu malware-detection dokaz.
- Središnji koordinacijski Board/Mapa pročitani su iz priloženih kopija; aktualne središnje verzije nisu potvrđene: `SOURCE_FRESHNESS_UNVERIFIED`. To ne zatvara niti ponovno otvara povijesne zadatke.

## Ulazni uvjeti

Operator prije pokretanja zabilježi okruženje, SHA, datum i vlastiti identitet u privatni operativni zapis. Ne stavljati tajne ili privatni inventar u Git.

1. Potvrđen zaseban testni backend, baza i release put; nikakva veza s production podacima, bazom ili ključevima.
2. Odobren deployment testnog okruženja. Izbor pružatelja i eventualni trošak zahtijevaju vlastitu odluku; ovaj dokument ih ne pretpostavlja.
3. Migracija 014 primijenjena odobrenim putem i runtime račun bez superuser/BYPASSRLS ovlasti. Pregledati [runtime grants](../../backend/deploy/runtime-grants.sql) zajedno s dodatnim mailbox grantovima iz implementacijskog dokumenta; ne dodjeljivati blanket prava.
4. Instaliran i verificiran qpdf 12.4.2 te util-linux prlimit, privatni tmpfs i granice iz PDF acceptance policyja. Stvarni podržani ClamAV engine s aktualnim potpisima, ScanPDF i politikom odbijanja šifriranih PDF-ova. Limiti skeniranja/rekurzije/streama moraju pokrivati dopuštenih 5 MiB i alarmirati prekoračenja.
5. Backend ima dostupan lokalni Unix socket s minimalnim pravima. Postojeći adapter ne podržava zamjenu proizvoljnim udaljenim TCP scannerom. Način pakiranja backend+scanner mora biti provjeren na odabranom runtimeu.
6. Testni keyring pohranjen izvan repozitorija; zasebno zaštićena kopija ključeva dostupna operatoru obnove. Stari ključevi sačuvani dok postoje pripadajući zapisi/backupi.
7. Dvije sintetičke tvrtke, dva radnika u prvoj te admin, accountant i manager računi. Pripremiti testni ugovor i mjesečnu platnu listu bez stvarnih osobnih podataka.

Tek u odobrenom izoliranom testnom okruženju operator konfigurira `DOCUMENTS_ENABLED`, `DOCUMENTS_KEYS_JSON`, `DOCUMENTS_ACTIVE_KEY_ID`, `DOCUMENTS_CLAMD_SOCKET` i po potrebi `DOCUMENTS_QUOTA_BYTES`. Nikad ispisivati vrijednosti ključeva u zapis, terminal capture ili chat.

## Scenariji i očekivani rezultat

PR #259 dodaje `backend/test/operational/mailbox-runtime.test.ts` i posao `Mailbox real scanner and synthetic restore` u postojeći backend CI. Koristi privremeni PostgreSQL 16, pravi ClamAV sa službenim potpisima i lokalnim Unix socketom, čist sintetički PDF/EICAR PDF, fail-closed test te pg_dump/pg_restore u novu bazu uz zasebnu kopiju testnog keyringa. Izvršenje zahtijeva eksplicitni `synthetic-ci-only` marker, loopback URL i kontrolnu bazu `bss_test`. Fixture uklanja samo resurse koje je sam stvorio. Nema novih npm ovisnosti, cloud računa ni deploymenta; CI zahtijeva apt pakete i pristup službenom signature mirroru. Nedostupan mirror/engine prekida posao, bez preskakanja.

Predviđena automatska pokrivenost obuhvaća clean/EICAR, nedostupan socket, dva key ID-a, obnovljene hashove/RLS/audit i novi upload. Potvrđeni rezultati i neizvršene provjere navedeni su ispod; prisutnost testa sama nije PASS. Ne zamjenjuje M01–M15 u stvarnom deployed stagingu, encrypted/obfuscated/polyglot PDF korpus, sesije, praćenje potpisa, dugotrajni kapacitet, off-platform backup ili provider PITR. Sintetičko izmjereno vrijeme nije prihvaćeni production RTO. Privremeni backup i ključevi ne izvoze se kao javni CI artifact.

| ID | Radnja | Uvjet prolaza |
|---|---|---|
| M01 | Provjeriti isključenu funkciju kroz stvarni backend | Config prijavljuje isključeno; nema fallbacka na demo niti dostupne privatne pohrane. |
| M02 | Accountant odabire sintetičkog radnika i učitava čisti PDF | Stvarni scanner prihvaća sadržaj; nastaje nacrt; radnik ga još ne vidi. |
| M03 | Provjeriti ime/šifru primatelja i objaviti nacrt | Samo namijenjeni radnik vidi objavljeni dokument, kategoriju i mjesec. |
| M04 | Preuzeti PDF nakon postojeće BSS prijave | Sadržaj odgovara izvornom SHA-256; nema dodatne PDF lozinke; odgovor je private/no-store, attachment i nosniff. |
| M05 | Drugi radnik i drugi tenant pokušavaju izravan ID/list/download | Nema tuđih metapodataka ni PDF bajtova. Ponoviti i kroz stvarni runtime DB račun. |
| M06 | Manager pokušava list/upload/publish/download | Pristup nije dopušten samo zbog voditeljske uloge. |
| M07 | Ponoviti isti upload UUID, zatim izmijenjeni sadržaj s istim UUID | Točan retry vraća isti zapis; izmijenjeni sadržaj daje konflikt, bez drugog dokumenta. |
| M08 | Objaviti/povući sa zastarjelom revision/If-Match | Konflikt; nema tihog prepisivanja novije odluke. |
| M09 | Povlačenje objavljenog dokumenta i novo preuzimanje | Novo preuzimanje odbijeno za sve uloge; ranije preuzeta kopija ne može se opozvati. |
| M10 | Odjava/promjena identiteta/blokiranje korisnika | Nema zaostalih privatnih podataka u UI-u; opozvana sesija ne dopušta novi pristup kroz backend. |
| M11 | Učiniti parser/scanner nedostupnim, izazvati timeout i prekoračenje limita | Upload odbijen; ništa se ne sprema; nema bypassa ni sirovog scanner izlaza u logovima. |
| M12 | EICAR sigurni testni uzorak kroz engine te valjani PDF s testnim uzorkom kroz upload | Engine detektira uzorak, API odbija upload prije spremanja. Običan EICAR tekst odbijen PDF provjerom nije dokaz rada scannera. |
| M13 | Šifrirani, oštećeni, obfuskovani i kontrolirani polyglot PDF fixturei | Svaki ima unaprijed definiran očekivani ishod; šifrirani PDF odbijen; rezultati provjereni na stvarnom engineu. Ne koristiti živi malware. |
| M14 | PDF preko 5 MiB, testna quota i višestruki istodobni uploadi | Odbijanje prema ugovoru; nema prekoračenja kvote ni duplikata. Mjeriti latenciju/RSS i ponašanje procesa pri restartu. |
| M15 | Pregledati audit/log/cache | Audit sadrži potrebne identifikatore i radnje; bez sadržaja, naziva datoteke, naslova ili iznosa. PDF nije u service-worker cacheu, localStorageu ili IndexedDB-u. |

Za mrežne ishode koristiti [OpenAPI](../../openapi/bss-mvp-api-v1.yaml), bez mijenjanja ugovora radi testa. Audit `download_issued` potvrđuje autorizaciju bajtova, ne primitak ili čitanje.

## Obnova baze i ključeva — izolirani drill

Ovo je zahtjev za dokaz, ne automatska naredba protiv postojeće baze. Operator mora unaprijed potvrditi izvor i prazno izolirano odredište te odobreni backup/restore alat. Ne koristiti testni fixture koji privremeno mijenja sheme protiv stvarnog staginga ili production baze.

1. U testnoj bazi objaviti najmanje dva PDF-a pod testnim ključem K1; sačuvati njihove hashove bez sadržaja u operativnom zapisu.
2. Dodati K2 kao aktivni ključ, sačuvati K1 za dekripciju, zatim objaviti treći PDF. Provjeriti preuzimanje svih triju.
3. Izraditi zaštićenu kopiju baze i zasebno zaštićenu kopiju keyringa odobrenim alatom. Provjeriti da je backup baza obuhvatio i ciphertext i metapodatke; kopija samo sheme nije dovoljna.
4. Obnoviti u zasebnu bazu i zaseban backend s istom identificiranom verzijom koda. Obnoviti potrebne runtime uloge/grantove prema odobrenom postupku; ne kopirati produkcijske tajne.
5. U obnovljenom okruženju s potpunim K1+K2 keyringom provjeriti hashove svih PDF-ova, stanje nacrt/objavljeno/povučeno, audit, tenant/worker izolaciju i novi upload sa stvarnim scannerom.
6. U dodatnoj izoliranoj instanci bez K1 dokazati da se K1 dokument ne može preuzeti i da se ne vraća oštećen sadržaj. Zabilježiti potrebu povrata K1; ne brisati originalni ključ ni backup.
7. Izmjeriti trajanje obnove i točku zadnjeg obnovljenog dokumenta. RPO/RTO se prihvaćaju iz mjerenja; ne prepisivati ciljeve iz ADR-a kao postignute rezultate.
8. Privatno zabilježiti backup identitet, verziju sheme, key ID-eve (bez vrijednosti), operatora, vrijeme i rezultate. Postupak čišćenja testnih resursa zasebno odobriti; ovaj dokument ne odobrava brisanje.

## Zapis rezultata i izlazni kriterij

Za svaki M01–M15 i svaki korak obnove zabilježiti `PASS`, `FAIL`, `UNAVAILABLE` ili `SKIPPED`, komandu/radnju, vrijeme i privatnu referencu dokaza. `UNAVAILABLE` i `SKIPPED` nisu prolaz.

| Dokaz | Potvrđeno stanje 2026-10-07 |
|---|---|
| Spojeni kod #257 | MERGED; potvrđeno iz aktualnog GitHuba |
| Repo CI | PR #259, SHA `cca20143ca4e255261ecd522b2c772ff7a799353`: backend quality i Ubuntu/Windows compatibility PASS; operativni job FAIL. Ostali dovršeni governance/change-impact/secrets/workflow-static/Trivy/security gateovi PASS; BSS quality još traje u trenutku zapisa. |
| Stvarni ClamAV engine i potpisi | CI: ClamAV 1.5.4, službeni DB 28146; čist PDF prihvaćen, samostalni EICAR odbijen. PDF s ugrađenom EICAR datotekom nije odbijen: M12 FAIL. |
| Provisionirani staging i stvarne sesije | UNVERIFIED; nema potvrđene instance za ovaj postupak |
| Izolirani restore ciphertexta i keyringa | CI PASS: šifrirani pg_dump + zasebna kopija ključeva, pg_restore u novu sintetičku bazu, tri PDF-a pod K1/K2, hashovi/audit/FORCE RLS/tuđi pristup/nedostajući K1/novi upload. Izmjereno 743 ms za sintetičku obnovu i provjeru; nije staging RTO. |
| Kapacitet, monitoring i alarmi scannera | NOT EXECUTED |
| Politika retentiona, pristupa nakon prestanka rada i zakonite dostave | Otvoreni acceptance uvjeti prije stvarnih dokumenata |

Dokaz: [backend CI run 37677717422](https://github.com/tgervasius-lgtm/MVP-BSS/actions/runs/37677717422), operativni job `112985406337`. Assertion za odbijanje ugrađenog EICAR PDF-a pada; kasnije provjere u tom testu (nula spremljenih zapisa i nedostupan socket) nisu izvršene i nisu PASS. Zasebni restore test prolazi. Test ostaje obvezan i crven, bez preskakanja ili zamjene očekivanog odbijanja prihvatom.

Lokalno je potvrđeno da PDFKit fixture sadrži stvarni `/EmbeddedFile` i nekomprimirani testni sadržaj. Uzrok propuštanja još nije izoliran; ne pripisivati ga poznatom FlateDecode problemu bez dokaza. Prije aktivacije potrebno je dokazati pouzdano odbijanje tog PDF-a i proširiti reprezentativni korpus; izbor sanacije zahtijeva zasebnu implementaciju i sigurnosni pregled.

Prije stvarnih dokumenata moraju proći svi obvezni tehnički scenariji, restore i operativne/privacy odluke iz implementacijskog dokumenta. Staging PASS ne dodjeljuje automatski Pilot/Production PASS. Aktivacija za stvarne radnike zahtijeva zasebno vlasničko release odobrenje.

Rollback: odobrenim release putem postaviti `DOCUMENTS_ENABLED=false`; sačuvati shemu, ciphertext, keyring i backup. Ne pokretati migration down nad nepraznom bazom niti brisati ključeve.

## 2026-10-08 — izolacija PDF token-boundary propuštanja

Status: `ROOT CAUSE ISOLATED / REMEDIATION PROPOSED / ACTIVATION BLOCKED`.
Reprodukcija: [CI run 37828817734](https://github.com/tgervasius-lgtm/MVP-BSS/actions/runs/37828817734), job `113488517949`, commit `1ee9badce7bb3dc530ed31a1ea56660f7df30fe8`.

- Točan 68-bajtni EICAR payload potvrđen u nekomprimiranom EmbeddedFile streamu.
- ClamAV 1.5.4 izravni CLI s `--debug --scan-pdf=yes` prihvaća isti PDF: rezultat `OK`. BSS socket adapter stoga nije jedini uzrok.
- Trace za EmbeddedFile obj 9 0 navodi 90 ekstrahiranih bajtova umjesto 68; početak skeniranja uključuje dio PDF rječnika.
- Usporedni PDF mijenja samo MIME metapodatak privitka iz `application/octet-stream` u `text/plain` (PDFKit također automatski generira datume/ID-eve). Isti EICAR payload i isti daemon: `text/plain` odbijen; originalni PDF prihvaćen.
- Pregled [ClamAV 1.5.4 pdf.c](https://github.com/Cisco-Talos/clamav/blob/clamav-1.5.4/libclamav/pdf.c#L237) pokazuje da pdf_find_stream koristi prvo podudaranje podniza `stream` bez provjere granice tokena. U ovom fixtureu podniz u MIME imenu prethodi pravom stream tokenu. Trace i usporedba podupiru taj konkretan uzrok.
- Ovaj nekomprimirani slučaj nije dokaz FlateDecode greške iz upstream #1773. Nije dokaz univerzalnog propuštanja svih PDF virusa.
- Originalni upload rejection assertion ostaje obvezan i FAIL. Test nije zamijenjen lakšim MIME fixtureom.
- Zasebni restore K1/K2, hashovi, audit i izolacija ponovno PASS. Backend quality i Windows/Linux compatibility PASS. Lokalni TypeScript PASS; lokalni socket unit test UNAVAILABLE zbog listen EPERM, ne PASS.

### Povijesni prijedlog sanacije — naknadno prihvaćen 08.10.2026.

Preporučeni kandidat: zasebna, ograničena strukturna provjera PDF-a neovisnim održavanim parserom prije spremanja, koja odbija ugrađene datoteke i neprovjerive PDF-ove. Obična pretraga bajtova/regex nije dovoljna jer imena, streamovi i objektni tokovi mogu biti kodirani ili komprimirani. ClamAV ostaje obvezan za dopuštene PDF-ove; nedostupnost parsera/scannera, timeout, oštećenje ili prekoračenje limita odbija upload.

To mijenja politiku prihvaćenih PDF-ova: npr. PDF/A-3 s ugrađenim XML-om više ne bi bio dopušten. Prije runtime implementacije treba prihvatiti taj opseg, odabrati parser nakon provjere licence/ranjivosti/ograničenja te dopuniti API dokumentaciju, deployment dependencies i regresije. Ne popravljati samo EICAR regexom niti preimenovanjem testnog MIME-a.

Alternativa koja čuva prihvat PDF privitaka: dokazano ispravljen/patched scanner ili neovisno izdvajanje i skeniranje svakog privitka, uz ograničenja broja, dubine, ukupnih dekodiranih bajtova, CPU/vremena i fail-closed ponašanje. Obje traže zaseban sigurnosni review i testni korpus; nije opravdano unaprijed tvrditi da nadogradnja enginea rješava problem.

Acceptance prije uklanjanja blokade: originalni reproducer odbijen prije persistencea; čisti obični PDF dopušten; obfuscated/compressed/object-stream fixtures; timeout/limit/parser/scanner-down fail closed; nula document.uploaded audita i ciphertext zapisa pri odbijanju; RBAC/RLS/audit/restore regresije. Odluka o PDF politici nije donesena ovim dijagnostičkim PR-om. Nema runtime izmjene, mergea, deploymenta ni vendor aktivacije.

Board/Mapa pročitani iz dostavljenih kopija (Board sadrži nastavak 08.10.02:59 UTC; Mapa source-refresh zapis 05.10.). Aktualni središnji VersionId-evi nisu dostavljeni niti potvrđeni: `SOURCE_FRESHNESS_UNVERIFIED`. To ne vraća ranije zatvorene zadatke.

## 2026-10-08 — prihvaćena PDF politika i implementacija

Vlasnik je izričito prihvatio odbijanje PDF-ova s ugrađenim datotekama uz zadržavanje ClamAV-a. Implementiran qpdf 12.4.2 pregled svih objekata u odvojenom ograničenom procesu; OpenAPI i upload poruka usklađeni. Dokumenti se ne prepravljaju. Izvorni application/octet-stream EICAR reproducer ostaje u testu i mora biti odbijen kroz upload, a čist PDF mora proći oba sloja. CI rezultat ove izmjene tek treba potvrditi; stariji PASS/FAIL rezultati nisu preneseni na novi SHA. Nema merge/deploy/activation.
