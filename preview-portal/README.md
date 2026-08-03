# BSS Preview Portal

Personalizirani, lokalni BSS sandbox za demonstracije potencijalnim pilot-klijentima.

## Pokretanje

```bash
cd preview-portal
npm run serve
```

Otvoriti `http://localhost:4173`.

## Testovi

```bash
cd preview-portal
npm test
```

## Trenutni tok

1. Posjetitelj bez registracije unosi samo djelatnost, broj zaposlenika, broj lokacija i broj smjena.
2. Portal ne traži imena zaposlenika, OIB ni druge osobne podatke.
3. Posjetitelj bira slobodno istraživanje ili otvoreni pregled uz preporuke.
4. Sve demo-uloge i njihove operativne radnje dostupne su odmah.
5. Radnje se mogu izvršiti bilo kojim redom; zajedničko stanje i pokazatelji ažuriraju se lokalno.
6. Napredak prikazuje koje su mogućnosti isprobane, ali ne zaključava niti zatvara sustav.
7. Promjena profila i reset aktivnosti ostaju deterministički.

Portal ne koristi produkcijski API, autentikaciju ni bazu podataka.
