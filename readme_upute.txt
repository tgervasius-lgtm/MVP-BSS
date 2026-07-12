BSS Smart Systems – Demo 3.0 u izradi

Trenutna razvojna faza:
- Sprint 1: Dashboard i navigacija – spremno za pregled
- Sprint 2: Evidencija radnog vremena – spremno za pregled
- produkcijski backend počinje tek nakon završetka svih sedam Demo 3.0 sprintova

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
- računanje radnih dana bez vikenda i hrvatskih blagdana u 2026.
- kontrola vlastitih preklapanja i upozorenje na preklapanja u odjelu
- zahtjevi za godišnji i korekcije s odobravanjem i audit tragom
- funkcionalni CSV i stvarni XLSX izvoz prema aktivnim filtrima
- status terminala i offline red
- izolirani RFID simulator koji ne mijenja službenu evidenciju
- prodajni demo način koji se može isključiti
- lokalno spremanje demo-podataka u preglednik

Važna granica:
Ovo je statičan demonstrator. Nema stvarnu prijavu korisnika, centralnu bazu,
backend API ni vezu s fizičkim terminalom. Plan za pilot backend nalazi se u
datoteci BACKEND_MVP_PLAN.md.

Lokalno pokretanje:
Poslužiti mapu bilo kojim statičnim HTTP serverom. Otvaranje index.html izravno
kao file:// nije preporučeno zbog service workera.
