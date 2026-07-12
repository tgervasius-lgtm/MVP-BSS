BSS Smart Systems – Demo 3.0 u izradi

Trenutna razvojna faza:
- Sprint 1: Dashboard i navigacija – spremno za pregled
- Sprint 2: Evidencija radnog vremena – spremno za pregled
- Sprint 3: Godišnji odmori – spremno za pregled
- Sprint 4: Izvještaji – spremno za pregled
- Sprint 5: RFID terminal – spremno za pregled
- Sprint 6: Postavke i administracija – spremno za pregled
- Sprint 7: Dizajn i završno poliranje – spremno za pregled
- produkcijski backend razmatra se tek nakon odobrenja završnog Demo 3.0 pregleda

Objavljena aplikacija:
https://mvp-bss.pages.dev/

Kako se objavljuje:
- GitHub repozitorij povezan je s Cloudflare Pages.
- Spajanje odobrene promjene na granu main pokreće Cloudflare objavu.
- Produkcija se ne spaja niti objavljuje bez Tomislavove potvrde.

Što demo stvarno radi:
- operativni dashboard s KPI-jevima, upozorenjima i tjednim trendom
- odvojeni prikaz zadnjih prijava i odjava
- grupirana navigacija i brojači otvorenih odluka
- operativna evidencija sa zasebnim prikazima svih zapisa, odstupanja i aktivnih prijava
- izračun plana smjene, završenih sati, salda i prekovremenog rada
- detalj svakog zapisa s izvorom, smjenom i statusom korekcije
- osobna mjesečna evidencija radnika i korekcija pokrenuta iz konkretnog zapisa
- odvojeni prikazi administratora, voditelja, radnika i knjigovođe
- responzivni desktop administratorski prikaz i mobilna navigacija
- filtriranje evidencije po mjesecu, odjelu, statusu i radniku
- dodavanje i uređivanje radnika, jedinstveni email i RFID UID
- aktiviranje/deaktiviranje radnika i blokiranje kartice
- dodavanje i uređivanje smjena te dodjela smjene radniku
- godišnji kalendar: administrator vidi cijelu firmu i cijelu godinu
- radnik vidi isključivo vlastite odsutnosti
- statusi zahtjeva Na čekanju, Odobreno, Odbijeno i Poništeno
- odluka s napomenom, vremenom, ulogom donositelja i audit tragom
- fond godišnjeg odvojen na odobreno, rezervirano i dostupno
- upozorenja preklapanja za administratora i voditelja bez otkrivanja kolega radniku
- poništavanje vlastitog zahtjeva na čekanju i vraćanje rezerviranih dana
- računanje radnih dana bez vikenda i hrvatskih blagdana u 2026.
- kontrola vlastitih preklapanja i upozorenje na preklapanja u odjelu
- zahtjevi za godišnji i korekcije s odobravanjem i audit tragom
- pet poslovnih izvještaja: mjesečni sažetak, detaljna evidencija, odstupanja, odobrene odsutnosti i korekcije
- mjesečni sažetak po radniku sa satima, planom, saldom, prekovremenim, odstupanjima i odobrenim odsutnostima
- isti mjesec, odjel i radnik određuju pregled, CSV i XLSX
- administrator izvozi cijelu tvrtku, voditelj samo dodijeljene odjele, a knjigovođa ima read-only izvoz
- UTF-8 CSV s hrvatskim nazivom datoteke te formatirani XLSX sa zamrznutim zaglavljem i automatskim filtrom
- povijest generiranja i preuzimanja s audit tragom, opsegom i brojem redaka
- izvještaji ne računaju plaću, poreze ni doprinose
- identitet, heartbeat, signal, firmware i dijagnostika RFID terminala
- lokalni offline red sa stvarnim događajima i jedinstvenim ID-evima
- sinkronizacija s brojem primljenih, prihvaćenih i ponovljenih događaja
- idempotentna zaštita koja isti ID ne sprema dvaput
- lokalno odbijanje nepoznate kartice bez punjenja offline reda
- administratorske kontrole veze i read-only pregled događaja dodijeljenih odjela za voditelja
- izolirani RFID simulator koji ne mijenja službenu evidenciju
- postavke tvrtke s provjerom OIB-a, kontakta, fonda godišnjeg i sigurnosnih rokova
- upravljanje odjelima i radnim mjestima uz zaštitu aktivnih veza s radnicima
- konfigurirani odjeli, radna mjesta i smjene u obrascu radnika te podrška za radnika bez RFID kartice
- zakonski blagdani i interni neradni dani koji ulaze u obračun godišnjeg odmora
- korisnički računi s ulogama administratora, voditelja, radnika i knjigovođe
- opseg odjela voditelja, blokiranje računa, demo reset lozinke i zaštita glavnog administratora
- pozivnice sa statusom, rokom valjanosti, ponovnim slanjem i poništavanjem
- filtriranje audit traga po modulu i tekstu
- završni prodajni prikaz procesa od RFID kartice do CSV/XLSX izvoza
- stabilna desktop bočna navigacija i mobilna navigacija sa sigurnim rubovima uređaja
- čitljiviji mobilni obrasci, kartice, modali i široke tablice s vodoravnim pomicanjem
- pristupačna aktivna navigacija, preskok na sadržaj, dinamički naslov stranice i fokusabilne tablice
- zatvaranje modala i izbornika tipkom Escape te zadržavanje fokusa unutar aktivnog sloja
- potvrda prije vraćanja početnih demo-podataka
- nenametljive animacije s punom podrškom za smanjeno kretanje
- prodajni demo način koji se može isključiti
- lokalno spremanje demo-podataka u preglednik

Važna granica:
Ovo je statičan demonstrator. Nema stvarnu autentikaciju, slanje emaila,
centralnu bazu, backend API ni vezu s fizičkim terminalom. Plan za pilot backend nalazi se u
datoteci BACKEND_MVP_PLAN.md.

Lokalno pokretanje:
Poslužiti mapu bilo kojim statičnim HTTP serverom. Otvaranje index.html izravno
kao file:// nije preporučeno zbog service workera.
