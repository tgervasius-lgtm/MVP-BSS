BSS Smart Systems – Demo 3.0 u izradi

Trenutna razvojna faza:
- Sprint 1: Dashboard i navigacija
- produkcijski backend počinje tek nakon završetka svih sedam Demo 3.0 sprintova

Objavljena aplikacija:
https://bespoke-cascaron-e4aab9.netlify.app/

Kako se objavljuje:
- GitHub repozitorij je povezan s Netlifyjem.
- Svaki novi commit na grani main pokreće novu Netlify objavu.
- Nije potrebno ručno povlačiti mapu u Netlify Drop.

Što demo stvarno radi:
- operativni dashboard s KPI-jevima, upozorenjima i tjednim trendom
- odvojeni prikaz zadnjih prijava i odjava
- grupirana navigacija i brojači otvorenih odluka
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
