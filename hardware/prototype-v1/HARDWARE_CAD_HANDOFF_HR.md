# BSS terminal — CAD handoff za prototip V1

## 1. Cilj

Izraditi jedan funkcionalan, prezentacijski uredan zidni terminal za pilot-validaciju BSS proizvoda. Kućište mora biti servisabilno, sigurno za komponente i prikladno za izradu u SolidWorksu te izvoz u STEP, STL i DXF.

## 2. Zaključana arhitektura prototipa

- Raspberry Pi 5
- Nextion 4,3-inčni zaslon
- MFRC522 RFID/NFC modul
- aktivni buzzer
- vanjsko napajanje
- zidna, vodoravna orijentacija
- NFC antena/modul smije biti izdvojen od Raspberry Pi ploče radi smanjenja smetnji

## 3. Obvezni CAD izlazi

1. `BSS-Terminal-V1-Assembly.SLDASM`
2. `BSS-Terminal-V1-Front.SLDPRT`
3. `BSS-Terminal-V1-Rear.SLDPRT`
4. `BSS-Terminal-V1-Internal-Bracket.SLDPRT`
5. `BSS-Terminal-V1.step`
6. `BSS-Terminal-V1-print.stl`
7. `BSS-Terminal-V1-front-cutout.dxf`
8. PDF tehnički crtež s kotama, tolerancijama, presjecima i eksplodiranim prikazom

## 4. Pravila konstrukcije

- Prednja maska mora imati kontrolirani radijus rubova; nije prihvatljiv samo pravokutni blok.
- Zaslon mora biti poravnat i mehanički učvršćen, ne samo zalijepljen.
- Servisni pristup mora biti sa stražnje strane bez skidanja cijelog terminala sa zida.
- Raspberry Pi mora biti na distancerima, s pristupom konektorima i minimalnim zračnim razmakom oko hladnjaka.
- Kabeli se vode odvojeno od NFC zone.
- Otvori za ventilaciju ne smiju omogućiti izravan dodir elektronike prstom ili alatom u normalnoj uporabi.
- Kućište mora imati fizičko rasterećenje napojnog kabela.
- Vijci s prednje strane nisu dopušteni osim ako su dio namjerne industrijske estetike.

## 5. Materijal i izrada

Za prvi komad preferira se 3D tisak iz PETG-a ili ASA-e. PLA se ne preporučuje za terminal koji može biti izložen toplini i dugotrajnom radu. Preporučena početna debljina stijenke je 2,5–3,0 mm, uz lokalna ojačanja oko vijaka, zaslona i zidnog nosača.

## 6. Tolerancije i montaža

- Opća prototipna tolerancija: ±0,30 mm
- Dosjedi zaslona i konektora moraju se definirati prema izmjerenim fizičkim dijelovima.
- Rupe za vijke moraju biti dimenzionirane prema stvarnom odabranom vijčanom spoju.
- Ugradbeni otvori ne smiju se zaključavati samo prema marketinškim dimenzijama proizvoda.

## 7. HOLD točke prije finalnog CAD-a

Finalni STEP/STL ne smije se označiti spremnim za proizvodnju dok nisu fizički ili iz službenih mehaničkih nacrta potvrđeni:

- točan Nextion model i njegova revizija
- točan Raspberry Pi 5 hladnjak/ventilator
- točan položaj i izvedba napojnog konektora
- odabrani RFID nosač i udaljenost očitanja kroz prednju masku
- stvarne dimenzije buzzera i kabelskih konektora
- odabrani način zidne montaže

## 8. Acceptance kriteriji

- sve komponente stanu bez savijanja kabela i pritiska na konektore
- zaslon je centriran i nema vidljivih praznina
- RFID očitanje radi kroz završnu prednju masku
- uređaj se može otvoriti i ponovno zatvoriti najmanje 20 puta bez oštećenja navoja
- termalni test od 60 minuta ne uzrokuje throttling Raspberry Pi-ja
- nema oštrih rubova, klimanja ni vidljivih improviziranih spojeva
- završni model uključuje zaobljenja, presjeke, eksplodirani prikaz i montažne kote

## 9. BOM struktura

BOM mora sadržavati: proizvođača, točan model, količinu, dimenzije, masu, dobavljača, cijenu, status dostupnosti, alternativu, potrebni alat i napomenu o kompatibilnosti. Neverified artikli moraju biti označeni `HOLD`, a ne predstavljeni kao zaključani izbor.
