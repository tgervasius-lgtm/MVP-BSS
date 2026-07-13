# BSS zajednički kalendar godišnjih — prijedlog za MVP Scope v1.1

Status: **prijedlog; nije implementirano**  
Opseg: mogući dodatak nakon zasebnog odobrenja MVP Scopea v1.1  
Utjecaj na trenutačni frontend i backend ugovor: **nema**

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

## Kriteriji prihvata za buduću implementaciju

1. Administrator može odabrati `tim`, `odjel` ili `organizacija`.
2. Radnik vidi samo ime i odobreno razdoblje unutar dopuštenog opsega.
3. Neodobreni zahtjevi i sve druge vrste odsutnosti nisu prisutni ni u odgovoru poslužitelja ni u sučelju.
4. Promjena opsega je auditirana.
5. Testovi potvrđuju izolaciju između organizacija i zabranu pristupa izvan zadanog opsega.
6. Privatni podaci nisu dostupni kroz DOM, izvoz, cache ni mrežni odgovor.

## Granica odluke

Ovaj dokument je samo **prijedlog za MVP Scope v1.1**. Prije implementacije potrebno je zasebno odobriti poslovni opseg, zaštitu podataka, administratorsku postavku i proširenje backend ugovora. PR #20 ne implementira ovaj kalendar i ne mijenja postojeći API nacrt.
