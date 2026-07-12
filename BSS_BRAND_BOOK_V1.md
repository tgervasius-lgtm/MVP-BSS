# BSS Brand Book v1.0

Datum: 11.07.2026.  
Brand: Bognar Smart Systems (BSS)  
Status: radni identitet zaključan za fazu v1.0  
Izvor dizajnerskih tokena: BSS Design System v1.0  
Živi vodič: `/brand-book/`  
Figma: <https://www.figma.com/design/HI03ocj8PdwblksreWuDvk>

## 1. Uloga Brand Booka

Brand Book definira kako BSS izgleda, govori i nastupa izvan pojedinog ekrana aplikacije. Ne mijenja poslovni opseg proizvoda. Design System ostaje izvor istine za digitalne tokene i komponente; Brand Book ih prevodi na web-stranicu, prodaju, dokumente, uređaj, pakiranje i korisničke upute.

Redoslijed projekta ostaje:

1. Demo 3.0;
2. BSS Design System v1.0;
3. BSS Brand Book v1.0;
4. tehnički audit i zamrzavanje funkcionalnog opsega;
5. BSS Refactor v1;
6. backend i produkcijska arhitektura.

## 2. Brand platforma

### Puni naziv

Prvo spominjanje: **Bognar Smart Systems (BSS)**. Nakon toga: **BSS**.

BSS je brand proizvoda i projekta. Na ugovorima, ponudama, računima i pravnim dokumentima mora stajati puni registrirani naziv izdavatelja. Brand ne zamjenjuje pravnu osobu.

### Kategorija

BSS je povezani SaaS + IoT sustav za evidenciju radnog vremena, odsutnosti i RFID/NFC terminala.

### Ciljna skupina

Male i srednje tvrtke kojima trebaju:

- brzo uvođenje;
- jasan pregled prema ulozi;
- manji ukupni trošak od složenih enterprise sustava;
- pouzdan rad terminala i u uvjetima nestabilne mreže;
- kontrolirani izvještaji i audit trag.

### Brand promise

**Od podatka na terenu do jasne odluke.**

### Opis proizvoda

BSS je povezani sustav za evidenciju radnog vremena, odsutnosti i RFID/NFC terminala za male i srednje tvrtke.

### Osobnost

- moderno, ali ne trendovski kratkotrajno;
- tehnološki napredno, ali razumljivo;
- profesionalno, ali ne hladno;
- samouvjereno, ali bez superlativa;
- praktično, mirno i precizno.

## 3. Znak i logotip

Službeni v1 znak formalizira postojeći znak iz Demo 3.0: geometrijsko bijelo slovo **B** u zaobljenom BSS teal kvadratu.

Varijante:

- `bss-symbol.svg` - samostalni znak;
- `bss-logo-primary.svg` - primarni lockup za svijetlu podlogu;
- `bss-logo-reversed.svg` - varijanta za tamnu podlogu;
- `bss-logo-monochrome.svg` - jednobojna varijanta.

### Zaštitni prostor

Najmanje ¼ širine znaka sa svake strane.

### Minimalne veličine

- samostalni znak: 24 px digitalno ili 8 mm u tisku;
- puni lockup: 140 px digitalno ili 38 mm u tisku.

### Nije dopušteno

- rastezanje ili sabijanje;
- rotiranje;
- promjena odnosa znaka i teksta;
- nasumična boja ili gradijent;
- sjaj, 3D, bevel, dvostruki obrub ili dekorativna sjena;
- postavljanje preko fotografije bez dovoljnog kontrasta;
- prepisivanje slova drugim fontom.

## 4. Boje

Brand Book koristi paletu iz `design-system/tokens.css`.

| Uloga | Naziv | HEX | Primjena |
| --- | --- | --- | --- |
| Primarna | BSS Teal | `#0F766E` | znak, glavna radnja, važna oznaka |
| Tamna | Deep Green | `#062A26` | tamne površine, terminal, prezentacije |
| Signal | Signal Teal | `#14B8A6` | digitalni naglasak i veza |
| Svijetla | Mint 50 | `#ECFDF5` | blaga brand površina |
| Neutralna | Neutral 50 | `#F8FBF9` | pozadina |
| Tekst | Ink | `#17352B` | primarni tekst |
| Pomoćni tekst | Muted | `#5F796F` | objašnjenje i meta-podaci |

Preporučeni omjer je približno 60% neutralnih površina, 30% duboke zelene i 10% teal naglaska.

Statusne boje proizvoda nisu marketinške dekorativne boje. Zelena, amber, crvena i plava prenose točno definirano stanje.

## 5. Tipografija

### Digitalni proizvod

Inter i sistemski sans-serif niz iz BSS Design Systema koriste se u aplikaciji, terminalu, web-stranici i prezentacijama.

### Službeni dokumenti

Zaključani BSS Master Template koristi:

- **Noto Sans** za naslove, tablice, oznake i operativne podatke;
- **Noto Serif** za duži urednički tekst kada povećava čitljivost.

Svi fontovi u PDF-u moraju biti ugrađeni, a Unicode mapiranje mora biti sačuvano.

## 6. Ton komunikacije

BSS govori jasno, smireno, ljudski i precizno.

### Dobro

- “Zahtjev je spremljen i čeka odluku voditelja.”
- “Terminal nije povezan. Očitanja se čuvaju lokalno.”
- “Pregled za srpanj sadrži 22 zapisa.”

### Izbjegavati

- neprovjerene superlative: “najbolji”, “revolucionaran”, “nevjerojatan”;
- generički AI jezik;
- infantilne poruke i emotikone u greškama;
- neodređene pozive poput “Klikni ovdje”;
- tehnički žargon kad postoji jednostavna hrvatska riječ.

### Struktura poruke

1. što se dogodilo;
2. što to znači;
3. što korisnik može ili treba napraviti.

## 7. Fotografija i ilustracija

Fotografija prikazuje stvarni radni kontekst: terminal u uporabi, ruke, ulaz u pogon, radionicu, gradilište ili skladište. Prednost imaju prirodno svjetlo, dokumentarni kadar i stvaran proizvod.

Izbjegavati:

- generičke AI motive i “robot + hologram” estetiku;
- neon boje i cyberpunk gradijente;
- pretjerano pozirane stock fotografije;
- lažne podatke na sučelju;
- 3D cartoon likove i dekorativnu vizualnu buku.

Ilustracije koriste jednostavne geometrijske linije i najviše dvije brand boje. Tehnički dijagram mora ostati točan i imati tekstualne oznake.

## 8. Terminal i hardver

- Kućište: mat grafitna ili duboko zelena površina.
- Zaslon: BSS teal kao primarni signal, bez “gaming” efekta.
- Stanja: teal = spremno, zelena = prihvaćeno, amber = čekanje, crvena = greška.
- Oznaka: BSS znak, model, serijski broj i kontakt podrške.
- Zvuk: kratak i funkcionalan, usklađen s vizualnim stanjem.
- Naljepnica: `bss-terminal-label.svg`, format 90 × 50 mm.

## 9. Primjene

### Posjetnica

Format 85 × 55 mm. Prednja strana nosi brand promise i lokaciju; stražnja strana osobne podatke. Predložak: `bss-business-card.svg`.

### Prezentacija

Format 16:9. Jedna dominantna duboka zelena i jedan teal naglasak. Naslovnica: `bss-presentation-cover.svg`.

### Ponude i dokumenti

Koriste zaključani minimalistički BSS Master Template: bijela podloga, jednostavna tipografska hijerarhija i bez logotipa na svakoj stranici.

### Korisničke upute

Korak po korak, stvarni snimak sučelja, jasna numeracija i upozorenje neposredno uz radnju na koju se odnosi.

### Web i LinkedIn

Prvo se navodi poslovni problem, zatim konkretno rješenje i dokaz. Jedan primarni poziv na radnju po kontekstu. Objave koriste stvaran primjer, mjerljiv rezultat ili naučenu lekciju.

## 10. Dokumenti i verzioniranje

Obvezni naziv PDF datoteke:

```text
BSS_[TIP-DOKUMENTA]_vX.X_DD.MM.GGGG.pdf
```

Svaka sadržajna izmjena otvara novu verziju. Stara verzija se arhivira i ne prepisuje.

PDF mora biti PDF/A-2u, s ugrađenim fontovima, valjanim Unicode mapiranjem i veraPDF provjerom prije isporuke.

Zaglavlje službenog dokumenta sadrži samo datum dokumenta i oznaku verzije. Dizajn ostaje minimalistički: bijela podloga, bez grafika i bez logotipa na svakoj stranici.

## 11. Odobravanje promjena

Product Owner mora odobriti promjenu:

- službenog znaka ili lockupa;
- primarne brand boje;
- brand promisea ili javnog opisa proizvoda;
- službenog dokumentnog predloška;
- predloška koji se javno distribuira.

Operativne prilagodbe sadržaja unutar postojećih pravila ne stvaraju novu brand odluku, ali i dalje zahtijevaju pravilno verzioniranje dokumenta.

## 12. Granica faze

Brand Book ne dodaje funkcionalnosti aplikaciji i ne mijenja prava pristupa. Nakon zaključavanja ove faze slijedi tehnički audit i zamrzavanje funkcionalnog opsega, a zatim BSS Refactor v1.
