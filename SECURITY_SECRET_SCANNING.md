# BSS Secret Scanning Governance

## Svrha

BSS koristi Gitleaks full-history scan kako bi blokirao prepoznatljive API ključeve, tokene, lozinke i druge credentiale u trenutačnom kodu i dostupnoj Git povijesti.

## Pravila

1. Stvarni credential se nikada ne dodaje u `.gitleaksignore`.
2. Ako se pronađe stvarni credential, mora se odmah rotirati, procijeniti opseg izlaganja i po potrebi ukloniti iz Git povijesti.
3. Lažno pozitivan nalaz može se ignorirati samo točnim Gitleaks fingerprintom nakon ručne provjere commita, putanje, pravila i konteksta.
4. Ne dopuštaju se široka isključenja cijelog `generic-api-key` pravila, test direktorija ili dokumentacije.
5. Svaka nova promjena `.gitleaksignore` mora kroz PR opis navesti razlog i dokaz da vrijednost nije stvarni credential.

## Pregled početnih povijesnih nalaza

| Broj | Lokacija | Klasifikacija | Razlog |
|---:|---|---|---|
| 1 | `backend/test/unit/config.test.ts` | Sintetički testni primjer | Ponavljajući `abcdef0123456789` obrazac korišten isključivo za validaciju minimalne duljine konfiguracije. |
| 2 | `README.md` | Dokumentacijski placeholder | Hrvatski tekst koji izričito opisuje najmanje 32 nasumična znaka, nije izdani ključ. |
| 3 | `BSS_BACKEND_HANDOFF_V1.md` | Dokumentacijski placeholder | Isti javni primjer za lokalno razvojno pokretanje. |
| 4 | `backend/README.md` | Dokumentacijski placeholder | Izričita zamjenska bootstrap lozinka za razvojni primjer. |
| 5 | `BACKEND_READINESS_REPORT.md` | Dokumentacijski false positive | Običan sigurnosni opis invitation toka, bez credential vrijednosti. |

Sedam točnih fingerprinta u `.gitleaksignore` odnosi se na ovih pet klasifikacija kroz više povijesnih commitova i redaka. Sirove vrijednosti se namjerno ne ponavljaju u ovom dokumentu.

## CI implementacija

- alat: Gitleaks `8.30.1`;
- izvor: službeni release binary;
- integritet: zaključani SHA-256 prije instalacije;
- opseg: `gitleaks git --log-opts='--all'` uz puni checkout;
- zaštita logova: `--redact=100`;
- dozvole workflowa: samo `contents: read`.
