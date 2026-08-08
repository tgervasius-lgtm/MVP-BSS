# BSS zajednički kalendar godišnjih – MVP Scope v1.1

Status: **frontend i backend implementirani**
API: `GET /api/v1/approved-leave-calendar` + `approvedLeaveVisibility` na organizaciji

## Svrha i privatnost

Zaposlenik može vidjeti već odobrene godišnje unutar administratorom dopuštenog opsega radi planiranja rada. API vraća isključivo:

- ime zaposlenika;
- početak i završetak odobrenog godišnjeg.

Ne vraća bolovanje, druge vrste odsutnosti, razlog, napomene, fond, pending/odbijene/poništene zahtjeve ni medicinske ili obiteljske podatke.

## Vidljivost

| Postavka | Najveći dopušteni opseg |
| --- | --- |
| `team` | vlastiti tim; u MVP modelu mapira se na vlastiti odjel |
| `department` | vlastiti odjel / voditeljevi dodijeljeni odjeli |
| `organization` | cijela vlastita organizacija |

RLS uvijek prvo ograničava organizaciju. Manager scope nikad se ne širi izvan dodijeljenih odjela. Promjena administratorske postavke koristi reviziju i stvara audit događaj.

## Kriteriji prihvata

- samo `approved` + `annual_leave` ulaze u odgovor;
- worker odgovor ne sadrži razlog ni napomene;
- sva četiri korisnička tipa mogu otvoriti read-only ekran u dopuštenom opsegu;
- promjena vidljivosti dostupna je samo administratoru;
- API, DOM, cache i izvještaji ne otkrivaju isključene privatne podatke;
- integracijski test potvrđuje tenant izolaciju i minimalni oblik odgovora.

Izvoz zajedničkog kalendara nije uveden. Postojeći izvještaj odobrenih odsutnosti ostaje zasebna ovlaštena reporting funkcija.
