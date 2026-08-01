# BSS Preview Portal

Prvi interaktivni vertical slice za virtualnu tvrtku **BSSProject d.o.o.**

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

1. Posjetitelj pokreće radni dan bez registracije.
2. Ulazi u direktorski pregled.
3. Dobiva zadatak provjeriti početak smjene.
4. Simulira RFID prijavu Ivana Horvata.
5. Broj prisutnih raste s 47 na 48.
6. Aktivnost se pojavljuje u feedu.
7. Reset vraća identično početno stanje.

Portal ne koristi produkcijski API, autentikaciju ni bazu podataka.
