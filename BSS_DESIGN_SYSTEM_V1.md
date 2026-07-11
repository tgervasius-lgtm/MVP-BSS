# BSS Design System v1.0

Status: aktivno u Demo 3.0  
Jezik sučelja: hrvatski  
Podržane teme: svijetla i tamna  
Živi vodič: `/design-system/`

## 1. Svrha i granice

BSS Design System definira zajednički vizualni i interakcijski jezik za evidenciju radnog vremena, odsutnosti, odobravanja, izvještaje i RFID terminal. U ovoj fazi ne mijenja poslovnu logiku niti dodaje module.

Design System v1.0 obuhvaća:

- semantičke boje i svijetlu/tamnu temu;
- tipografsku skalu;
- razmake, radijuse, sjene i trajanja animacija;
- gumbe, kartice, oznake, obrasce, tablice i navigaciju;
- interakcijska stanja;
- responsive pravila;
- pristupačnost;
- smjernice za ikone;
- živi HTML vodič i pravila korištenja tokena.

Brand Book, nova produkcijska SVG biblioteka ikona i strukturni refaktor JavaScripta pripadaju sljedećim fazama.

## 2. Načela

1. **Jasno prije gustoće.** Najvažniji status i sljedeća radnja moraju biti vidljivi bez uputa.
2. **Uloga određuje pogled.** Radnik vidi sebe, voditelj dodijeljene odjele, administrator cijelu tvrtku.
3. **Status nije samo boja.** Tekst, ikona ili oblik uvijek prenose isto značenje.
4. **Mobilno je radno okruženje.** Telefon je primarni operativni ekran, a ne umanjeni desktop.
5. **Jedan izvor istine.** Poslovni CSS koristi tokene iz `design-system/tokens.css`.
6. **Predvidljivost prije efekta.** Animacija potvrđuje promjenu; ne smije usporavati rad.

## 3. Tokeni

### 3.1. Razina tokena

- **Primitive** opisuju vrijednost: `--bss-color-brand-600`, `--bss-space-4`.
- **Semantički tokeni** opisuju namjenu: `--bss-color-bg-surface`, `--bss-color-text-muted`.
- **Privremeni aliasi** (`--teal`, `--surface`, `--line`) održavaju kompatibilnost Demo 3.0 do BSS Refactora v1.

Nova komponenta ne smije izravno koristiti primitive ako postoji odgovarajući semantički token.

```css
.component {
  padding: var(--bss-space-4);
  color: var(--bss-color-text);
  background: var(--bss-color-bg-surface);
  border: 1px solid var(--bss-color-border);
  border-radius: var(--bss-radius-lg);
}
```

### 3.2. Brand

Primarna brand boja je teal. Za glavnu radnju koristi se `--bss-color-action-primary`; za tekstualni naglasak `--bss-color-accent-text`. Ta dva tokena namjerno nisu ista u tamnoj temi zbog kontrasta.

### 3.3. Statusi

| Značenje | Token teksta | Token površine | Primjeri |
| --- | --- | --- | --- |
| Uspjeh | `--bss-color-success` | `--bss-color-success-soft` | prisutan, odobreno, sinkronizirano |
| Upozorenje | `--bss-color-warning` | `--bss-color-warning-soft` | na čekanju, kašnjenje, provjera |
| Greška | `--bss-color-danger` | `--bss-color-danger-soft` | odbijeno, blokirano, offline |
| Informacija | `--bss-color-info` | `--bss-color-info-soft` | kontekst i obavijest |

Status mora imati čitljiv naziv. Sama zelena, žuta ili crvena površina nije dovoljan signal.

## 4. Tipografija

Primarni font je sistemski sans-serif niz definiran tokenom `--bss-font-sans`. Time sučelje radi bez vanjskog font servisa i brzo se prikazuje i na terminalu.

| Razina | Token | Veličina | Primjena |
| --- | --- | --- | --- |
| 3xl | `--bss-font-size-3xl` | 32 px | glavni naslov ekrana |
| 2xl | `--bss-font-size-2xl` | 24 px | istaknuti sažetak |
| xl | `--bss-font-size-xl` | 18 px | naslov kartice |
| md | `--bss-font-size-md` | 14 px | osnovni tekst |
| sm | `--bss-font-size-sm` | 12 px | pomoćni tekst |
| xs | `--bss-font-size-xs` | 10 px | oznake i meta-podaci |

Naslovi koriste tijesan prored i negativan razmak slova samo na većim veličinama. Dulji tekst koristi `--bss-line-height-relaxed`.

## 5. Razmaci, oblik i dubina

Razmaci slijede bazu od 4 px: 4, 8, 12, 16, 20, 24, 32, 40 i 48 px. Vrijednost izvan skale dopuštena je samo za precizno poravnanje postojeće komponente i mora se ukloniti u refaktoru.

- `--bss-radius-sm`: male interne oznake;
- `--bss-radius-md`: kontrole i gumbi;
- `--bss-radius-lg`: kompaktne kartice;
- `--bss-radius-xl`: glavne kartice i paneli;
- `--bss-radius-full`: statusne oznake i prekidači.

Sjena ne označava status. Koristi se samo za hijerarhiju površina i aktivne slojeve.

## 6. Komponente

### Gumb

- Jedna primarna radnja po lokalnom kontekstu.
- Destruktivna radnja mora imati jasan glagol, crvenu semantiku i potvrdu ako je nepovratna.
- Onemogućeni gumb ne zamjenjuje objašnjenje zašto radnja nije moguća.
- Minimalna visina glavnih kontrola: 44 px.

### Kartica

- Kartica grupira jedan zadatak ili jednu smislenu cjelinu.
- Ugniježđene kartice izbjegavati; koristiti suptilnu površinu ili razdjelnik.
- Cijela kartica može biti klikabilna samo kada ima jednu očekivanu destinaciju.

### Statusna oznaka

- Tekst je obvezan.
- Koristiti kratke, dogovorene statuse: `Odobreno`, `Na čekanju`, `Odbijeno`, `Poništeno`, `Sinkronizirano`.
- Ne uvoditi sinonime za isti status na različitim ekranima.

### Obrazac

- Oznaka ostaje vidljiva iznad polja; placeholder nije oznaka.
- Greška objašnjava što treba ispraviti.
- Datum i vrijeme koriste nativnu kontrolu gdje je pouzdana, uz hrvatski prikaz rezultata.

### Tablica

- Zaglavlje ostaje vidljivo pri okomitom pomaku gdje je to korisno.
- Na mobitelu se tablica pomiče vodoravno i ima vidljivu uputu.
- Primarna informacija ne smije biti dostupna isključivo u skrivenom desnom stupcu.

### Navigacija

- Mobilni prikaz koristi donju navigaciju za najčešće zadatke.
- Desktop koristi stalnu bočnu navigaciju grupiranu po poslovnom smislu.
- Aktivna stavka ima `aria-current="page"`.

## 7. Interakcijska stanja

Svaka interaktivna komponenta mora imati: default, hover gdje postoji pokazivač, focus-visible, active/selected, disabled ako je primjenjivo te loading kada radnja traje.

Focus-visible koristi prsten od 3 px i odmak od 2 px. Fokus se ne uklanja bez jednakovrijedne zamjene.

Standardno trajanje je 180 ms. Veći prijelaz ekrana smije trajati do 280 ms. Kada korisnik traži smanjeno kretanje, animacije i glatki pomak se isključuju.

## 8. Svijetla i tamna tema

Tema se postavlja atributom `data-theme="light|dark"` na `<html>`. Odabir se sprema pod ključem `bss-theme-v1` i dijele ga aplikacija i živi vodič. Ako korisnik još nije odabrao temu, koristi se postavka operativnog sustava.

Komponenta je spremna tek kada je pregledana u obje teme. U tamnoj temi ne invertira se cijela paleta; semantičke površine, rubovi i statusi imaju posebno podešene vrijednosti.

## 9. Responsive pravila

| Raspon | Pravilo |
| --- | --- |
| 0–619 px | jedan stupac, donja navigacija, 44 px kontrole |
| 620–959 px | dva stupca gdje sadržaj ostaje čitljiv |
| 960–1279 px | stalna bočna navigacija, višestupčani radni prikaz |
| 1280+ px | proširene mreže, sadržaj najviše 1380 px |

Breakpoint se koristi kada raspored više nije čitljiv, ne prema nazivu određenog uređaja.

## 10. Pristupačnost

Minimalni kriteriji:

- WCAG AA kontrast: 4.5:1 za redovni tekst i 3:1 za veliki tekst i važne grafičke elemente;
- puna tipkovnička dostupnost;
- vidljiv fokus;
- fokus ostaje u otvorenom modalnom sloju i vraća se na okidač;
- najmanje 44 × 44 px za glavne dodirne kontrole;
- status i greška nisu preneseni samo bojom;
- pravilni naslovi, oznake obrazaca i nazivi regija;
- `aria-live` samo za poruke koje se mijenjaju nakon radnje;
- `prefers-reduced-motion` i `prefers-contrast` imaju podršku.

## 11. Ikone

Produkcijska biblioteka treba biti jedan SVG skup:

- mreža 20 ili 24 px;
- potez 1.75–2 px;
- `fill="none"` i `stroke="currentColor"` za linijske ikone;
- dekorativna ikona ima `aria-hidden="true"`;
- ikona bez tekstualne oznake mora imati pristupačan naziv na gumbu;
- emoji u Demo 3.0 smatraju se privremenim prikazom, ne konačnim brand assetom.

## 12. Quality gate za novu komponentu

Prije prihvaćanja provjeriti:

1. koristi li semantičke tokene bez nove nasumične boje ili razmaka;
2. ima li sva potrebna interakcijska stanja;
3. radi li mišem, tipkovnicom i dodirom;
4. je li čitljiva u svijetloj i tamnoj temi;
5. radi li na 390 px, 768 px, 960 px i 1440 px;
6. poštuje li ulogu i opseg podataka;
7. koristi li dogovoreni hrvatski naziv;
8. prolaze li automatski i vizualni regresijski testovi.

## 13. Put prema Refactoru v1

U BSS Refactoru v1 postojeći aliasi (`--teal`, `--surface`, `--line` i slični) postupno se zamjenjuju semantičkim `--bss-*` tokenima. Poslovne komponente tada se izdvajaju iz monolitnog CSS-a i JavaScripta, ali Design System ostaje isti ugovor između modula.
