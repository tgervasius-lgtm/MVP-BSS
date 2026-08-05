# BSS Readiness Matrix

Ovaj dokument je jedinstveni izvor istine za spremnost BSS-a.

| Područje | Izlazni kriterij | Trenutni status | Dokaz / sljedeći dokaz |
|---|---|---:|---|
| Backend kvaliteta | TypeScript, build, unit/contract/integration testovi i PostgreSQL tokovi prolaze | AUTOMATED | Backend/full-stack quality gateovi |
| API ugovor — struktura | OpenAPI je sintaktički i strukturno valjan | AUTOMATED | `redocly.yaml` + BSS API and dependency governance gate |
| Tenant izolacija | Cross-tenant pristup je tehnički blokiran i regresijski testiran | AUTOMATED | RLS i cross-tenant CI testovi |
| Static security | CodeQL i dependency audit prolaze kontinuirano | AUTOMATED | BSS security gate |
| Secret scanning | Git povijest blokira neodobrene credentiale | AUTOMATED | Gitleaks full-history scan |
| CI/CD workflow ispravnost | Workflow YAML i shell skripte se statički provjeravaju | AUTOMATED | BSS workflow static validation |
| GitHub Actions supply chain | Remote Action ovisnosti koriste pune commit SHA reference | AUTOMATED | Immutable-reference policy |
| Dependency održavanje | Zaključane verzije i automatske nadogradnje | AUTOMATED | Dependabot, npm audit i GitHub dependency review |
| SBOM | Frontend i backend CycloneDX inventar se generira, validira i arhivira | AUTOMATED | BSS dependency inventory |
| PR dokumentacija | Cilj, rizik, testni dokaz i rollback su obvezni | AUTOMATED | BSS PR governance gate |
| Vlasništvo koda | Kritični dijelovi imaju formalnog vlasnika | DONE | `.github/CODEOWNERS` |

## Nezaobilazni release blocker kriteriji
BSS se ne smije označiti kao `production ready` dok nisu zatvoreni hosting, backup/restore, monitoring, GDPR, load test, terminal provisioning, neovisni audit i ownership svih računa/tajni.
