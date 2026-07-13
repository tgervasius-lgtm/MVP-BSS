# BSS zajednički kalendar godišnjih — frontend demonstracija i prijedlog za MVP Scope v1.1

Status: **frontend demonstracija je implementirana; backend nije implementiran**  
Opseg: prijedlog za MVP Scope v1.1 koji prije produkcijske primjene zahtijeva zasebno odobrenje  
Utjecaj na backend ugovor: **nema; postojeći API nacrt nije promijenjen**

## Svrha

Zaposlenicima omogućiti zajednički, samo-za-čitanje pregled već odobrenih godišnjih odmora radi lakšeg planiranja rada. Prikaz mora slijediti načelo najmanje potrebne količine podataka.

## Vidljivost

Administrator odabire jednu dopuštenu razinu vidljivosti:

| Postavka | Zaposlenik vidi |
|---|---|
| Tim | odobrene godišnje članova vlastitog tima |
| Odjel | odobrene godišnje zaposlenika vlastitog odjela |
| Organizacija | odobrene godišnje svih zaposlenika organizacije |

Postavka određuje najveći dopušteni opseg. Korisnik nikada ne smije dobiti podatke izvan vlastite organizacije. Produkcijski backend mora provjeriti organizaciju, ulogu i postavljeni opseg prije vraćanja podataka; filtriranje samo u pregledniku nije dovoljno.

## Dopušteni podaci u prikazu

Za svaki odobreni godišnji prikazuju se isključivo:

- ime i prezime zaposlenika
- početak i završetak odobrenog godišnjeg odmora

Kalendar je samo za čitanje. Ne omogućuje podnošenje, odobravanje, odbijanje ni uređivanje zahtjeva.

## Podaci koji se ne smiju prikazati

- bolovanje ili drugi zdravstveni status
- razlog odsutnosti
- vrsta odsutnosti različita od odobrenog godišnjeg odmora
- napomene zaposlenika ili odobravatelja
- stanje fonda i broj preostalih dana
- zahtjevi na čekanju, odbijeni ili poništeni zahtjevi
- medicinski, obiteljski ili drugi privatni podaci

## Pravila prikaza

- Prikazuju se samo zahtjevi sa statusom **Odobreno** i vrstom **Godišnji odmor**.
- Dnevni, mjesečni i godišnji prikaz koriste isti autorizirani skup podataka.
- Pretraga i filtri ne smiju proširiti administratorom zadani opseg.
- Promjena administratorske postavke ulazi u audit trag s vremenom, administratorom i starom/novom vrijednošću.
- Izvoz zajedničkog kalendara nije dio ovog prijedloga.

## Što frontend demo radi

- ekran je dostupan administratoru, voditelju, radniku i knjigovođi;
- administrator u demo-stanju bira `tim`, `odjel` ili `organizacija`;
- svi korisnici vide samo odobrene godišnje unutar trenutačno dopuštenog opsega;
- kalendar i tablica prikazuju samo ime zaposlenika te početni i završni datum;
- klik na zauzeti dan otvara isti privatno minimizirani skup podataka;
- demo ne šalje zahtjev poslužitelju i ne uvodi novu API rutu.

## Kriteriji prihvata za buduću backend implementaciju

1. Administrator može odabrati `tim`, `odjel` ili `organizacija`.
2. Radnik vidi samo ime i odobreno razdoblje unutar dopuštenog opsega.
3. Neodobreni zahtjevi i sve druge vrste odsutnosti nisu prisutni ni u odgovoru poslužitelja ni u sučelju.
4. Promjena opsega je auditirana.
5. Testovi potvrđuju izolaciju između organizacija i zabranu pristupa izvan zadanog opsega.
6. Privatni podaci nisu dostupni kroz DOM, izvoz, cache ni mrežni odgovor.

## Granica odluke

Ovaj ekran ostaje **prijedlog za MVP Scope v1.1** na produkcijskoj razini. PR #21 implementira samo frontend demo nad lokalnim demo-podacima. Prije stvarnog spajanja podataka potrebno je zasebno odobriti poslovni opseg, zaštitu podataka, administratorsku postavku i proširenje backend ugovora. Produkcijski backend mora vratiti već autoriziran i privatno minimiziran skup; frontend filtriranje nije sigurnosna granica.
