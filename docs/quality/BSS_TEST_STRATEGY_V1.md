# BSS MVP — strategija testiranja V1

## Cilj

Testni program mora dokazati poslovnu ispravnost, multi-tenant izolaciju, sigurnost autentikacije, konzistentnost evidencije vremena i pouzdanost terminalskog toka. Cilj nije umjetnih 100 % pokrivenosti, nego potpuna pokrivenost kritičnih rizika.

## Obvezni gateovi

1. TypeScript i lint bez upozorenja koja se tretiraju kao greška.
2. Unit i contract testovi.
3. PostgreSQL migracije od prazne baze do aktualne verzije.
4. RLS test s runtime ulogom bez `BYPASSRLS`.
5. Integracijski API testovi nad stvarnim PostgreSQL-om.
6. E2E desktop i mobile Chromium.
7. Accessibility smoke test.
8. Production dependency audit.
9. Build oba dijela sustava.

## P0 tokovi

- prijava, refresh, odjava i opoziv sesije
- deaktivirani korisnik ili organizacija ne mogu dobiti novu sesiju
- admin organizacije A nikada ne vidi ili mijenja podatke organizacije B
- RFID credential izvan `valid_from`/`valid_to` ili opozvan credential mora biti odbijen
- ponovljeni terminalski događaj ne smije dvostruko knjižiti radno vrijeme
- paralelni clock-in/clock-out zahtjevi moraju završiti deterministički
- pozivnica za već aktiviran račun ne smije resetirati lozinku
- odobreni godišnji mora biti vidljiv u zajedničkom kalendaru; zahtjev na čekanju ne smije biti javno vidljiv
- export mora odgovarati filtriranom prikazu i tenant scopeu
- audit zapis mora nastati za kritične administrativne promjene

## P1 tokovi

- CRUD radnika, smjena, RFID dodjela i godišnji fond
- pagination i cursor validacija
- report preview i generiranje izvještaja
- terminal sync retry i idempotency
- RBAC za admina, voditelja, radnika i knjigovodstvo
- validacija datuma, vremenskih zona i prelaska preko ponoći

## Negativni testovi

- nedostajući tenant kontekst
- lažni ili istekao token
- nepoznata RFID kartica
- dupli email unutar organizacije
- pokušaj izmjene immutable zapisa
- preveliki payload
- nevaljani cursor
- database timeout i rollback
- djelomični kvar tijekom višekoračne transakcije

## Performance pragovi za pilot

Prije pilot-deploya provesti barem:

- 50 virtualnih terminala
- 500 aktivnih korisnika
- burst od 20 terminalskih događaja u sekundi
- 60-minutni soak test
- p95 API latencija ispod 500 ms za standardne CRUD tokove u pilot okruženju
- potvrda da nema curenja konekcija, nekontroliranog rasta memorije ni lock contention incidenta

## Izvještavanje

Svaki release kandidat mora imati strojno generirani izvještaj s commit SHA, verzijom Nodea/PostgreSQL-a, popisom izvršenih gateova, brojem testova, preskočenim testovima i razlogom preskakanja. Preskočeni P0 test blokira release.
