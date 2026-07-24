# BSS API — consumer guide V1

Autoritativni strojni ugovor ostaje `openapi/bss-mvp-api-v1.yaml`. Ovaj dokument definira pravila korištenja API-ja za frontend, terminal i buduće integracije.

## Osnovna pravila

- Klijent ne smije pretpostavljati tenant iz korisničkog unosa; tenant kontekst dolazi iz autorizirane sesije ili terminalskog credentiala.
- Svaki mutation request mora imati stabilan client request ID kada postoji rizik ponavljanja.
- Terminalski događaji moraju koristiti idempotency identifikator koji preživljava retry i privremeni offline rad.
- Datumi i vremena šalju se u ISO 8601 formatu. Poslovni prikaz koristi vremensku zonu organizacije.
- Klijent mora obrađivati dokumentirane error kodove, a ne parsirati slobodni tekst poruke.

## Auth tok

1. Login vraća kratkotrajnu autorizacijsku sesiju i mehanizam za refresh.
2. Refresh se koristi samo kada je access sesija istekla ili je blizu isteka.
3. Nakon neuspješnog refresha klijent briše lokalno stanje sesije i vraća korisnika na login.
4. Logout mora opozvati server-side sesiju; lokalno brisanje tokena samo po sebi nije dovoljno.
5. Klijent ne smije automatski beskonačno ponavljati 401/403 zahtjeve.

## Error handling

Klijent mora razlikovati najmanje:

- `400` — nevaljan zahtjev ili validacija
- `401` — sesija/credential nije valjan
- `403` — identitet je valjan, ali nema ovlast
- `404` — resurs nije pronađen unutar dopuštenog tenant scopea
- `409` — konflikt stanja, duplikat ili concurrency problem
- `422` — poslovno neizvediv zahtjev
- `429` — rate limit; primijeniti kontrolirani backoff
- `5xx` — privremena server-side greška; prikazati generičnu poruku i correlation ID

## Retry politika

- GET: najviše dva automatska pokušaja uz exponential backoff.
- Mutation bez idempotency ključa: bez automatskog retryja.
- Mutation s potvrđenim idempotency ključem: kontrolirani retry.
- 400, 401, 403, 404 i 422 ne ponavljaju se automatski.
- 429 poštuje `Retry-After` kada je dostupan.

## Terminal

Terminal mora lokalno evidentirati događaj prije slanja, uključujući:

- jedinstveni event ID
- terminal ID
- credential/karticu u sigurnom obliku
- lokalno vrijeme događaja
- verziju terminalskog softvera
- broj pokušaja slanja

Nakon potvrde servera događaj se označava sinkroniziranim. Neuspješan odgovor ne smije proizvesti novi event ID za isti fizički događaj.

## Frontend

Frontend mora koristiti centralizirani API adapter. Direktni `fetch` pozivi iz view sloja nisu dopušteni. Cache invalidation mora biti vezan uz uspješan mutation i dataset/version signal, ne uz proizvoljne timeoutove.

## Verzije

Breaking promjena zahtijeva novu API verziju ili kontrolirano prijelazno razdoblje. OpenAPI, Fastify schema, testni contract fixture i frontend binding moraju proći isti CI gate prije mergea.
