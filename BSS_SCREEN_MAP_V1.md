# BSS Screen Map v1.1

| Stavka | Vrijednost |
| --- | --- |
| Status | **POST-FREEZE RECONCILED / BSS OS REVIEW REQUIRED** |
| Autoritet proizvoda | `BSS_V1_PRODUCT_CONTRACT.md` v1.0 — `ACCEPTED / FROZEN` |
| Autoritet implementacije i HTTP ugovora | protected `main` / `openapi/bss-mvp-api-v1.yaml` v1.4 |
| Pregledani protected-main baseline | `29b00c0f63af0b3ffbd2d828550c882b9096fd05` |
| Povijesna frontend referenca | frontend v1.0.0 na `91323c7cdbbbbf7b965c4926c94a11af6d31bf62`; nije samostalni autoritet za aktualni proizvod |
| Izvori aktualnog UI-ja | `src/views/registry.js`, `app.js`, `src/adapters/api-state.js`, `src/adapters/api-bindings.js` |
| Broj registriranih ekrana | 17 |
| Uloge | Admin, Voditelj, Radnik, Knjigovodstvo |

Ova mapa usklađuje stabilne frontend screen ID-eve s frozen Product Contractom i aktualnom implementacijom. Postojanje OpenAPI operacije nije dokaz da postoji odgovarajući UI. `CONTRACT-DEFINED GAP` znači da je capability u frozen Product Contractu, ali aktualni frontend nema potpun ekran/pattern; ne znači `IMPLEMENTED`, `EVIDENCE PROVEN` ni spremnost za Staging/Pilot.

## Reconciliation matrix

| Screen ID / pattern | Klasifikacija | Aktualne uloge i podatkovni opseg | Aktualno vlasništvo | Potrebno usklađenje / granica |
| --- | --- | --- | --- | --- |
| `home` | CURRENT / KEEP | sve uloge; sažetak unutar serverom dopuštenog opsega | dashboard sažetak | zadržati clarity-first sažetak bez dekorativne analitike |
| `attendance` | CURRENT BUT UPDATE | Admin tenant-wide; Voditelj dodijeljeni odjeli | evidencija, radnici, smjene, odjeli | Admin-only recalculation i period readiness nemaju aktualni UI; ostaju gapovi ispod |
| `mytime` | CURRENT / KEEP | Radnik self-only; Admin ima postojeći demonstracijski ulaz, ne novu permisiju | vlastita evidencija i pokretanje zahtjeva za korekciju | server ostaje autoritet; Admin demo pristup ne proširuje Product Contract Radnika |
| `workers` | CURRENT BUT UPDATE | Admin read/write; Voditelj read-only za dodijeljene odjele | radnici, odjeli, smjene, RFID | ukloniti/sakrivati legacy Job Position prezentaciju u produkcijskom patternu; zaseban Job Position entitet je out of scope |
| `worker` | CURRENT BUT UPDATE | Admin tenant-wide; Voditelj read-only u dodijeljenim odjelima | detalj radnika, evidencija, leave, RFID | Profil mora ostati worker + department + shift + RFID; legacy Job Position polje je superseded demo prezentacija |
| `shifts` | CURRENT / KEEP | Admin read/write; Voditelj scoped/reference read | smjene | Voditelj nema administratorske mutacije; server provodi zabranu |
| `requests` | CURRENT BUT UPDATE | Admin sve; Voditelj dodijeljeni odjeli; Radnik own create/view/cancel pending | leave zahtjevi, saldo i odluke | retroaktivni zahtjev za zaključani period zahtijeva governed reopen; aktualni UI nema period-aware recovery pattern |
| `vacations` | CURRENT BUT UPDATE | Admin tenant-wide; Voditelj dodijeljeni odjeli; Radnik self-only | leave pregled, saldo, blagdani | Knjigovodstvo nema aktualni navigacijski ekran; njegove odobrene/minimizirane podatke posjeduje reporting/shared-calendar pattern, ne ovaj screen |
| `sharedLeave` | CURRENT / KEEP | sve uloge prema konfiguriranom tenant/department/self scopeu | odobreni annual-leave kalendar, organizacijska vidljivost | samo ime i odobreni `annual_leave` datumi; bez razloga, bilješki, salda, bolesti ili drugih privatnih podataka |
| `corrections` | CURRENT BUT UPDATE | Admin sve; Voditelj dodijeljeni odjeli; Radnik own create/view/cancel pending; Knjigovodstvo nema pristup | correction workflow | finalized/closed period mora fail-closed i ponuditi kontrolirani Admin recovery izvan Radnik/Voditelj ovlasti |
| `reports` | CURRENT BUT UPDATE | Admin tenant-wide; Voditelj dodijeljeni odjeli; Knjigovodstvo tenant-wide uz privacy-minimized `correction_log` | client-rendered preview, export jobs i download | server-authoritative preview, period lifecycle, locked `periodVersionId` izbor/provenance i export verification nemaju potpun aktualni UI; eksplicitni gapovi su ispod |
| `terminal` | CURRENT BUT UPDATE | Admin upravlja; Voditelj read-only za event-effective dodijeljene odjele | terminal status, pair/revoke i sync history | credential rotation i Admin-only reconciliation nemaju potpun aktualni UI; device ingestion/heartbeat nisu web-screen akcije |
| `terminalDemo` | DEMO/PREVIEW-ONLY | Admin/Voditelj samo kada je eksplicitni demo mode uključen | lokalni RFID simulator | nikada ne poziva produkcijski API niti zapisuje produkcijski attendance/audit |
| `flow` | DEMO/PREVIEW-ONLY | Admin/Voditelj samo u eksplicitnom demo modeu | statični prodajni/demo sadržaj | nije poslovni runtime niti implementacijski dokaz |
| `roles` | CURRENT / KEEP | samo Admin | korisnici, pozivnice, uloge i department scope | frontend skrivanje nije sigurnosna granica; RBAC je server-side deny-by-default |
| `audit` | CURRENT / KEEP | samo Admin | append-only audit pregled | nema frontend mutacije niti pristupa drugih uloga |
| `settings` | CURRENT BUT UPDATE | samo Admin | organizacija, odjeli, blagdani i sustav | legacy Job Position sekcija je superseded demo pattern; onboarding/import nisu implementirani kroz ovaj ekran |
| Legacy Job Position controls/presentation | SUPERSEDED / DEPRECATE | nema autoritativne v1 uloge ili data scopea | samo povijesni demo state/presentation | ne uvoditi bazu, API, permisiju ili persistence; buduće uklanjanje je fokusirani frontend cleanup, ne Product Contract promjena |

## Contract-defined UI gaps

| Gap / budući pattern | OpenAPI operacije na pregledanom baselineu | Dopuštene uloge | Status i vlasništvo |
| --- | --- | --- | --- |
| Attendance recalculation/provenance | `recalculateAttendanceDay` | samo Admin, otvoren period, reason/revision/audit | CONTRACT-DEFINED GAP; pripada budućem attendance recovery patternu, ne tvrdi se da ga `attendance` danas implementira |
| Period lifecycle i blocker recovery | `getAttendancePeriod`, `startAttendancePeriodReview`, `finalizeAttendancePeriod`, `closeAttendancePeriod`, `reopenAttendancePeriod` | read: Admin, scoped Voditelj, Knjigovodstvo; tranzicije: samo Admin | CONTRACT-DEFINED GAP; budući period-control pattern uz reporting/attendance, s conflict, blocked-finalization i recovery stanjima |
| Server-authoritative report preview | `createReportPreview` | Admin tenant-wide, Voditelj scoped, Knjigovodstvo tenant-wide | CONTRACT-DEFINED GAP; aktualni `reports` ekran renderira preview iz client-side statea i još nije vezan na službeni preview dataset |
| Report/export verification | `verifyReportExport` | Admin tenant-wide, Voditelj scoped, Knjigovodstvo tenant-wide | CONTRACT-DEFINED GAP; budući verification/provenance pattern u `reports` |
| Terminal credential rotation | `rotateTerminalCredential` | samo Admin | CONTRACT-DEFINED GAP; budući security-sensitive terminal management pattern |
| Terminal-event reconciliation | `resolveTerminalEventReconciliation` | samo Admin, reason/audit/provenance | CONTRACT-DEFINED GAP; budući terminal recovery pattern; Voditelj ostaje read-only |
| Customer onboarding | nema aktualne OpenAPI operacije ni registriranog screena | samo ovlašteni onboarding/Admin kontekst prema frozen contractu | CONTRACT-DEFINED GAP; ne preusmjeravati u `settings` i ne tvrditi implementaciju |
| Atomic CSV/XLSX employee import | nema aktualne OpenAPI operacije ni registriranog screena | samo Admin | CONTRACT-DEFINED GAP; create-only preview/validate/review/atomic commit/cancel pattern tek kroz zaseban fokusirani rad |

## Navigacijska i sigurnosna pravila

- Admin vidi organizacijske ekrane; `worker` i demonstracijski ulaz u `mytime` ne mijenjaju server-side role-operation matricu.
- Voditelj vidi timske ekrane i samo radnike/događaje iz dodijeljenih, uključujući event-effective povijesne, odjela. Ne smije recalculation, period transition, terminal mutation/reconciliation, user/role ili audit operacije.
- Radnik vidi samo vlastite sate, godišnji, zahtjeve i korekcije te privacy-minimized zajednički kalendar. Ne smije poslovne reporte ni tuđe podatke.
- Knjigovodstvo vidi reporting, period state i privacy-minimized approved-leave podatke prema frozen contractu. Ne smije raw attendance drill-down, correction workflow/free text, worker/terminal/user administraciju ni audit log.
- `terminalDemo` i `flow` pojavljuju se samo u eksplicitnom demo modeu. Preview/demo podaci i vjerodajnice nikada se ne promoviraju u live tenant.
- Nedopušteni screen ID može vratiti frontend na `home`, ali backend neovisno mora vratiti odgovarajući `401/403` i zadržati tenant/data-scope granicu.
- Svaki aktualni ili budući workflow mora imati meaningful loading, empty, error, forbidden, stale/conflict, offline/degraded (gdje je primjenjivo), destructive confirmation i recovery stanja te keyboard/accessibility/responsive ponašanje iz frozen Product Contracta.

## Stabilnost i change control

Registrirani screen ID-evi ostaju stabilne frontend reference dok fokusirana, versionirana promjena ne dokaže potrebu za preimenovanjem ili uklanjanjem. Stabilan ID nije dokaz potpunog UI capabilityja. Backend integracija, Design Foundation, Figma ili Storybook ne smiju proširiti ulogu, data scope, workflow ili poslovno stanje izvan frozen Product Contracta. Ova v1.1 reconciliation promjena ne mijenja runtime, OpenAPI, bazu, hardver niti Product Contract i ostaje predmet BSS OS reviewa.
