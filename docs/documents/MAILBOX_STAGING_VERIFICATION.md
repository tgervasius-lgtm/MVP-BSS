# Sandučić — provjera prije aktivacije

Status: `PREPARED / NOT EXECUTED`, 2026-10-07.
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
4. Stvarni podržani ClamAV engine s aktualnim potpisima, ScanPDF i politikom odbijanja šifriranih PDF-ova. Limiti skeniranja/rekurzije/streama moraju pokrivati dopuštenih 5 MiB i alarmirati prekoračenja.
5. Backend ima dostupan lokalni Unix socket s minimalnim pravima. Postojeći adapter ne podržava zamjenu proizvoljnim udaljenim TCP scannerom. Način pakiranja backend+scanner mora biti provjeren na odabranom runtimeu.
6. Testni keyring pohranjen izvan repozitorija; zasebno zaštićena kopija ključeva dostupna operatoru obnove. Stari ključevi sačuvani dok postoje pripadajući zapisi/backupi.
7. Dvije sintetičke tvrtke, dva radnika u prvoj te admin, accountant i manager računi. Pripremiti testni ugovor i mjesečnu platnu listu bez stvarnih osobnih podataka.

Tek u odobrenom izoliranom testnom okruženju operator konfigurira `DOCUMENTS_ENABLED`, `DOCUMENTS_KEYS_JSON`, `DOCUMENTS_ACTIVE_KEY_ID`, `DOCUMENTS_CLAMD_SOCKET` i po potrebi `DOCUMENTS_QUOTA_BYTES`. Nikad ispisivati vrijednosti ključeva u zapis, terminal capture ili chat.

## Scenariji i očekivani rezultat

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
| M11 | Zaustaviti scanner, izazvati timeout i prekoračenje scan limita | Upload odbijen; ništa se ne sprema; nema bypassa ni sirovog scanner izlaza u logovima. |
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

| Dokaz | Stanje pri pripremi ovog postupka |
|---|---|
| Spojeni kod #257 | MERGED; potvrđeno iz aktualnog GitHuba |
| Repo CI | Evidencija #257; nije ponovno izvođeno niti predstavljeno kao staging dokaz |
| Stvarni ClamAV engine i potpisi | UNAVAILABLE u ovom radnom okruženju |
| Provisionirani staging i stvarne sesije | UNVERIFIED; nema potvrđene instance za ovaj postupak |
| Izolirani restore ciphertexta i keyringa | NOT EXECUTED |
| Kapacitet, monitoring i alarmi scannera | NOT EXECUTED |
| Politika retentiona, pristupa nakon prestanka rada i zakonite dostave | Otvoreni acceptance uvjeti prije stvarnih dokumenata |

Prije stvarnih dokumenata moraju proći svi obvezni tehnički scenariji, restore i operativne/privacy odluke iz implementacijskog dokumenta. Staging PASS ne dodjeljuje automatski Pilot/Production PASS. Aktivacija za stvarne radnike zahtijeva zasebno vlasničko release odobrenje.

Rollback: odobrenim release putem postaviti `DOCUMENTS_ENABLED=false`; sačuvati shemu, ciphertext, keyring i backup. Ne pokretati migration down nad nepraznom bazom niti brisati ključeve.
