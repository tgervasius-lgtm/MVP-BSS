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
4. Četiri stvarne demo-uloge — Uprava, Voditelj, Radnik i Knjigovodstvo — dostupne su odmah.
5. Radnje se mogu izvršiti bilo kojim redom; zajedničko stanje i pokazatelji ažuriraju se lokalno.
6. Napredak prikazuje koje su mogućnosti isprobane, ali ne zaključava niti zatvara sustav.
7. Promjena profila i reset aktivnosti ostaju deterministički.

## Radni prostori

- **Uprava** objedinjuje vlasnički pregled i administratorske funkcije: operativni KPI, aktivnosti uživo, korekcije evidencija, RFID kartice i terminalsku mrežu.
- **Voditelj** ima današnji status tima, zahtjeve za godišnji i opsegom ograničen izvještaj tima.
- **Radnik** ima osobni dashboard, današnju smjenu, sate, saldo godišnjeg i funkcionalan lokalni zahtjev za godišnji.
- **Knjigovodstvo** ima vizualnu strukturu fonda sati i tablični preview prije budućeg izvoza.
- Radnički zahtjev postaje vidljiv Voditelju, RFID prijava ažurira Upravu i Radnika, a zamjena kartice čuva zajedničko demo-stanje.

Portal ne koristi produkcijski API, autentikaciju ni bazu podataka.
