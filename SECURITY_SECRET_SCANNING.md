# BSS Secret Scanning Governance

BSS koristi Gitleaks full-history scan za blokiranje credentiala u trenutačnom kodu i dostupnoj Git povijesti.

## Pravila
1. Stvarni credential se nikada ne dodaje u `.gitleaksignore`.
2. Ako se pronađe stvarni credential, mora se odmah rotirati i procijeniti opseg izlaganja.
3. Lažno pozitivan nalaz smije se ignorirati samo točnim Gitleaks fingerprintom nakon ručne provjere.
4. Ne dopuštaju se široka isključenja pravila, test direktorija ili dokumentacije.
