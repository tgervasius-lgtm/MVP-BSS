# BSS — developer handoff checklist V1

## Ulazni kriterij

Novi developer mora dobiti pristup repozitoriju, dokumentiranim environment varijablama, testnom okruženju i vlasniku poslovnih odluka. Produkcijske tajne se ne šalju kroz chat, README ili `.env` datoteke u repozitoriju.

## Prvi radni dan

- [ ] Kloniran repozitorij bez lokalnih skrivenih datoteka prethodnog developera
- [ ] Aktivirana Node verzija iz `.nvmrc`
- [ ] Frontend i backend instalirani zaključanim lockfileovima
- [ ] Development PostgreSQL pokrenut
- [ ] Migracije prolaze od prazne baze
- [ ] Seed/demo podaci učitani prema dokumentiranoj proceduri
- [ ] Root quality gate prolazi
- [ ] Aplikacija otvorena lokalno i izvršen osnovni login/clock-in tok

## Obvezno razumijevanje arhitekture

Developer mora moći objasniti:

- gdje završava frontend, a počinje backend odgovornost
- kako se postavlja tenant kontekst
- kako RLS štiti podatke
- kako rade sesije i refresh
- gdje se provodi RBAC
- kako terminalski credential i RFID događaji prolaze kroz sustav
- kako se pokreću migracije i što je rollback rizik
- koji dokument je autoritativni API ugovor

## Siguran put za novu funkciju

1. definirati poslovni slučaj i tenant/RBAC pravila
2. ažurirati API ugovor
3. napisati negativne i cross-tenant testove
4. implementirati transakcijsku i validacijsku logiku
5. povezati frontend kroz centralni adapter
6. dodati audit događaj kada je potrebno
7. provjeriti migration/rollback utjecaj
8. pokrenuti sve CI gateove
9. dokumentirati operativni utjecaj

## Zabranjene prečice

- direktni SQL bez tenant zaštite
- pristup bazi kroz privilegiranu ulogu u runtimeu
- direktni `fetch` iz view komponente
- tajne u source codeu ili CI logovima
- ručne izmjene produkcijske baze bez migracije i zapisa
- gašenje testa da bi pipeline postao zelen
- merge u `main` bez reviewa za promjene autentikacije, RLS-a, migracija ili terminalskog toka

## Handoff izlazni kriterij

Novi developer je spreman preuzeti projekt kada samostalno može:

- podići sustav iz clean clonea
- pronaći i objasniti kritične module
- dodati malu funkciju s ugovorom, testom i migracijom
- dijagnosticirati neuspjeli CI gate
- izvršiti backup/restore probu u testnom okruženju
- objasniti preostale production rizike bez predstavljanja preview deploya kao produkcije

## Vlasništvo odluka

Tehničke odluke koje mijenjaju cijenu, scope MVP-a, obradu osobnih podataka, uređaj, ugovorne obveze ili operativni rizik moraju se vratiti osnivačima BSS-a na odobrenje. Developer ne smije takve odluke prikriveno zaključati kroz implementaciju.
