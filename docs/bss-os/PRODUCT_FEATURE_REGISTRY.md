# BSS Product Feature Registry

Last reviewed: 2026-09-01 for #131/AUDIT A affected rows

Important: Backend MVP Phase B is now merged into the authoritative protected `main` baseline through PR #99. The resulting baseline commit is `198b2ce9f1ad73b7b72058a930cf005cbb35a0da`. `MERGED` in this registry means the capability is present in repository code at that baseline; it does **not** mean deployed, production-ready, legally approved or physically validated.

The authoritative baseline has since advanced to `b904eca3c047c01da7a78e376269e94ed1d2fb48`. Issues #143/#145/#144/#146 are merged and the #133 targeted AUDIT A recheck passed. `BSS_V1_PRODUCT_CONTRACT.md` v1.0 is the accepted/frozen #131 product-scope authority; its requirements do not change an implementation row to `MERGED`.

PR #99 integration evidence includes green required repository checks, PostgreSQL-backed integration coverage, full-stack browser/accessibility coverage, dependency/security checks and CodeQL with `js/missing-rate-limiting = 0`. OpenAPI also declares the shared `429 RateLimited` response for operations that have runtime rate limits. Production infrastructure, shared/distributed rate limiting, observability, restore drills, hardware and live-pilot evidence remain separate.

## Status model

- UI: `NONE`, `DESIGNED`, `DEMO`, `IMPLEMENTED`, `RELEASED`, `RELEASE CANDIDATE`
- Core implementation: `NONE`, `PARTIAL`, `MERGED`
- Production: `NOT DEPLOYED`, `STATIC PREVIEW`, `STAGING`, `PRODUCTION`, or an explicit external blocker

## Identity, tenancy and access

| ID | Capability | MVP | UI | Core implementation | Security/test evidence | Production | Primary evidence / next action |
|---|---|---:|---|---|---|---|---|
| IAM-001 | Login with secure browser session | Yes | IMPLEMENTED | MERGED | Auth, session and full-stack coverage integrated through PR #99 | NOT DEPLOYED | External security review and staging verification before production |
| IAM-002 | Session refresh and logout/revocation | Yes | IMPLEMENTED | MERGED | Refresh rotation, reuse handling, logout/revocation and concurrency coverage | NOT DEPLOYED | Verify production cookie/proxy configuration in staging |
| IAM-003 | User invitation and one-time activation | Yes | IMPLEMENTED | MERGED | One-time token, password hashing, transaction, stale invitation and race-condition coverage | NOT DEPLOYED | Validate customer onboarding policy and email delivery flow |
| IAM-004 | Role-based access control | Yes | DEMO / IMPLEMENTED | MERGED | OpenAPI role declarations, service authorization and negative contract coverage; frozen Product Contract v1.0 contains the consolidated matrix | NOT DEPLOYED | Align any remaining contract gaps and re-prove in staging before Pilot |
| IAM-005 | Multi-tenant isolation with PostgreSQL RLS | Yes | N/A | MERGED | PostgreSQL 16, `NOBYPASSRLS`, tenant transactions and cross-tenant tests | NOT DEPLOYED | Re-prove in staging and independent security review |
| IAM-006 | Organization lifecycle and active-status enforcement | Yes | IMPLEMENTED | MERGED | Login/refresh/invitation/device validation and tenant-scoped transactions | NOT DEPLOYED | Final pilot policy review |

## Organization and workforce administration

| ID | Capability | MVP | UI | Core implementation | Security/test evidence | Production | Primary evidence / next action |
|---|---|---:|---|---|---|---|---|
| ORG-001 | Organization settings and profile | Yes | IMPLEMENTED | MERGED | API contract, tenant scoping and revision semantics | NOT DEPLOYED | Confirm final fields and permissions before pilot |
| ORG-002 | Department create/update/block | Yes | IMPLEMENTED | MERGED | Phase A contract, PostgreSQL constraints and tenant coverage | NOT DEPLOYED | Preserve optimistic revision/validation behavior |
| ORG-003 | Worker registry and employment status | Yes | IMPLEMENTED | MERGED | Tenant-scoped services, lifecycle rules, session revocation and contract tests | NOT DEPLOYED | Complete final role visibility matrix |
| ORG-004 | Shift definitions and worker assignment | Yes | IMPLEMENTED | MERGED | API/data implementation, active-dependency invariants and regression tests | NOT DEPLOYED | Validate schedule edge cases with pilot scenarios |
| ORG-005 | Holiday calendar and revision semantics | Yes | IMPLEMENTED | MERGED | Separate calendar ETag/revision contract and tenant-holiday coverage | NOT DEPLOYED | Verify regional holiday administration |

## Time, attendance and terminal flows

| ID | Capability | MVP | UI | Core implementation | Security/test evidence | Production | Primary evidence / next action |
|---|---|---:|---|---|---|---|---|
| TIME-001 | RFID/NFC clock-in and clock-out | Yes | DEMO / IMPLEMENTED | MERGED | Terminal credential, event, replay and business-flow tests integrated through PR #99 | NOT DEPLOYED | Connect and validate real terminal prototype |
| TIME-002 | Current presence and attendance dashboard | Yes | IMPLEMENTED | MERGED | Dashboard summary/drill-down contracts and full-stack integration | NOT DEPLOYED | Verify production-like API latency and refresh behavior |
| TIME-003 | Attendance records and filtering | Yes | IMPLEMENTED | MERGED | Bounded filters, tenant scope and contract tests | NOT DEPLOYED | Confirm pagination, timezone and export consistency at scale |
| TIME-004 | Manual attendance correction | Yes | IMPLEMENTED | MERGED | Audit, stale-snapshot and role constraints tested | NOT DEPLOYED | Define final approval and retention policy |
| TIME-005 | Missing/irregular event review queue | Yes | IMPLEMENTED | MERGED | Frontend drill-down and merged Phase B backend flow | NOT DEPLOYED | Confirm business rules with pilot employers |
| TIME-006 | Terminal offline sync event ingestion | Yes | DEMO / IMPLEMENTED | MERGED | #144 DEC-025 acknowledgement, historical key/lifecycle, immutable fingerprint and Admin reconciliation implementation is merged; fresh PostgreSQL evidence and targeted AUDIT A recheck passed on `b904eca`. | NOT DEPLOYED | Run real-device durable-commit, worker-feedback, power-loss, retry/offline and clock-health tests under #132/AUDIT C. |
| TIME-007 | Terminal sync-event timeline | Yes | IMPLEMENTED | MERGED | Newest-first keyset pagination and tenant filters | NOT DEPLOYED | Verify retention, scale and operational visibility |
| TIME-008 | Device credential validity, revocation and rotation semantics | Yes | ADMIN UI PARTIAL | MERGED | `valid_from`, revocation/expiry checks and device-auth contracts | NOT DEPLOYED | Implement managed KMS/secrets custody and real rotation drill |

## RFID administration

| ID | Capability | MVP | UI | Core implementation | Security/test evidence | Production | Primary evidence / next action |
|---|---|---:|---|---|---|---|---|
| RFID-001 | Assign RFID credential to worker | Yes | IMPLEMENTED | MERGED | UID normalization, HMAC hashing, tenant isolation and mutation controls | NOT DEPLOYED | Confirm physical card workflow and permissions |
| RFID-002 | Replace/revoke RFID credential | Yes | DEMO / IMPLEMENTED | MERGED | Audit trail, credential state transitions and idempotent block behavior | NOT DEPLOYED | Verify real terminal propagation and compromise workflow |
| RFID-003 | Masked RFID display | Yes | IMPLEMENTED | MERGED | Raw UID excluded from responses; masked representation only | NOT DEPLOYED | Confirm logs/support tooling never expose raw UID |
| RFID-004 | Scale-safe RFID listing/hydration policy | Yes operationally | IMPLEMENTED CLIENT FLOW | PARTIAL | Current UI may request one list operation per worker; no authoritative maximum workforce/capacity policy is yet approved | NOT DEPLOYED | Define supported tenant size or implement batched tenant-scoped hydration before choosing a read limiter |

## Leave and absence

| ID | Capability | MVP | UI | Core implementation | Security/test evidence | Production | Primary evidence / next action |
|---|---|---:|---|---|---|---|---|
| LEAVE-001 | Worker submits leave request | Yes | IMPLEMENTED | MERGED | Contract, date validation, tenant scope and working-day logic | NOT DEPLOYED | Verify mobile UX and pilot business rules |
| LEAVE-002 | Manager approves or rejects request | Yes | IMPLEMENTED | MERGED | Role checks, status transitions, stale-state protection and audit | NOT DEPLOYED | Confirm delegation/escalation policy for pilots |
| LEAVE-003 | Authoritative leave allowance and remaining days | Yes | IMPLEMENTED | MERGED | Approved/planned/remaining calculations and protected allowance reductions | NOT DEPLOYED | Validate carryover and Croatian customer policy with qualified advice |
| LEAVE-004 | Shared approved-leave calendar | Yes, scope v1.1 | DEMO / IMPLEMENTED | MERGED | Privacy-minimized frontend and integrated backend capability | NOT DEPLOYED | Confirm final team/department/organization visibility policy and negative tests before pilot |
| LEAVE-005 | Tenant holiday-aware leave calculation | Yes | IMPLEMENTED | MERGED | Weekend and tenant-holiday calculation coverage | NOT DEPLOYED | Verify region-specific holiday administration |

## Reports, accounting and exports

| ID | Capability | MVP | UI | Core implementation | Security/test evidence | Production | Primary evidence / next action |
|---|---|---:|---|---|---|---|---|
| REPORT-001 | Report type and filter selection | Yes | IMPLEMENTED | MERGED | Approved report types and server validation | NOT DEPLOYED | Confirm final pilot reporting catalogue |
| REPORT-002 | Bounded report preview | Yes | IMPLEMENTED | MERGED | Limit, deterministic dataset version, server totals and runtime rate limit | NOT DEPLOYED | Verify performance and stale-preview behavior |
| REPORT-003 | XLSX export | Yes | IMPLEMENTED / HANDOFF | MERGED | Primary business export path and generator integrated through PR #99 | NOT DEPLOYED | Validate output with accounting/payroll sample cases without claiming payroll calculation |
| REPORT-004 | CSV export | Yes | IMPLEMENTED / HANDOFF | MERGED | Technical export path in scope | NOT DEPLOYED | Verify encoding, locale and delimiter compatibility |
| REPORT-005 | Accounting-role restricted access | Yes | IMPLEMENTED | MERGED | RBAC declarations and contract coverage | NOT DEPLOYED | Complete least-privilege role matrix |

## Audit and accountability

| ID | Capability | MVP | UI | Core implementation | Security/test evidence | Production | Primary evidence / next action |
|---|---|---:|---|---|---|---|---|
| AUDIT-001 | Tenant-scoped audit log | Yes | IMPLEMENTED | MERGED | Critical changes recorded with tenant boundaries; append-only DB controls where applicable | NOT DEPLOYED | Define production retention, storage and export policy |
| AUDIT-002 | Actor, action and entity context | Yes | IMPLEMENTED | MERGED | Contract/service coverage and bounded before/after evidence | NOT DEPLOYED | Confirm privacy minimization for IP/user-agent pseudonyms |
| AUDIT-003 | Structured error logging with secret/SQL redaction | Yes | N/A | MERGED | PostgreSQL details, credentials and sensitive headers redacted in merged backend | NOT DEPLOYED | Integrate with production observability and verify redaction end to end |

## Customer onboarding and employee import

| ID | Capability | MVP | UI | Core implementation | Security/test evidence | Production | Primary evidence / next action |
|---|---:|---|---|---|---|---|---|
| ONBOARD-001 | Resumable company setup through explicit go-live approval | Yes, frozen v1.0 scope | NONE | NONE | Product requirements are frozen; no implementation or environment evidence | NOT DEPLOYED | Create focused implementation/evidence work without bypassing AUDIT C |
| IMPORT-001 | Admin-only atomic CSV/XLSX employee import with validation and preview | Yes, frozen v1.0 scope | NONE | NONE | Canonical fields, no-default rule, all-or-nothing commit and audit requirements are frozen; no importer evidence exists | NOT DEPLOYED | Implement and verify tenant/privacy/idempotency/capacity behavior in focused future work |

## Experience and sales validation

| ID | Capability | MVP | UI | Core implementation | Security/test evidence | Production | Primary evidence / next action |
|---|---|---:|---|---|---|---|---|
| UX-001 | Frozen Frontend v1.0.0 baseline | Yes | RELEASED | MERGED | Deterministic build, unit/E2E/axe and immutable release/handoff evidence | STATIC PREVIEW | Maintain as historical frontend contract baseline |
| UX-002 | Public demo login | Sales demo | RELEASED | MERGED | Demo-only credentials and regression coverage | STATIC PREVIEW | Keep clearly separated from production authentication |
| PREVIEW-001 | Personalized company Preview Portal | Sales validation | RELEASE CANDIDATE | PARTIAL / LEGACY PR #30 | Extensive unit, E2E, axe, mobile and offline evidence exists on stale PR #30 | NOT MERGED | Reconstruct from stable current `main` under issue #58 |
| PREVIEW-002 | Cross-role connected demo workflows | Sales validation | RELEASE CANDIDATE | PARTIAL / LEGACY PR #30 | Worker-manager, RFID and accounting simulated flows proven on old Preview branch | NOT MERGED | Preserve simulation boundaries during reconstruction |
| PREVIEW-003 | External prospect access | Sales validation | UI READY | EXTERNAL BLOCKER | Cloudflare Access may intercept anonymous visitors | NOT AVAILABLE GENERALLY | Decide public/allowlisted access and test externally |
| PREVIEW-004 | Lead/contact capture | Sales validation | NONE | NONE | Privacy, retention and ownership not defined | NOT DEPLOYED | Define compliant contact workflow before marketing launch |

## Hardware and platform

| ID | Capability | MVP | UI | Core implementation | Security/test evidence | Production | Primary evidence / next action |
|---|---|---:|---|---|---|---|---|
| HW-001 | Raspberry Pi / display / RFID terminal architecture | Yes | N/A | PARTIAL | BOM and handoff material exist; physical integration not proven | NO PROTOTYPE EVIDENCE IN MAIN | Confirm exact SKUs and measurements |
| HW-002 | Parametric terminal enclosure | Yes | N/A | PARTIAL / LEGACY PR #28 | Parametric OpenSCAD and acceptance criteria exist on old stacked work | NOT MANUFACTURING READY | Transfer controlled inputs, then physical metrology and final SolidWorks/STEP/STL |
| HW-003 | Buzzer and local confirmation feedback | Yes | N/A | PROPOSED / PARTIAL | Product requirement known; physical verification pending | NOT DEPLOYED | Prototype and test in real environment |
| OPS-001 | Hardened backend container | Yes | N/A | PARTIAL / LEGACY PR #28 | Non-root/read-only/healthcheck design exists but has not been retargeted to current `main` | NOT DEPLOYED | Rebuild/retarget from final backend and scan with Trivy |
| OPS-002 | Staging environment | Yes before pilot | N/A | NONE / EXTERNAL | Required by readiness matrix | NOT DEPLOYED | Select/provision production-like staging |
| OPS-003 | Production deployment | Yes before live use | N/A | NONE / EXTERNAL | Hosting/KMS/network/WAF decisions and evidence remain open | NOT DEPLOYED | Controlled architecture and deployment plan |
| OPS-004 | Backup and PITR | Yes before live use | N/A | DOCUMENTED / EXTERNAL | Governance/runbook concepts exist; real restore drill missing | NOT PROVEN | Configure and execute restore/PITR drill |
| OPS-005 | Monitoring, alerts and incident response | Yes before live use | N/A | PARTIAL / EXTERNAL | Application logging exists; platform observability not proven | NOT DEPLOYED | Implement Sentry/monitoring/alerts and incident rehearsal during staging phase |
| OPS-006 | Shared/distributed rate limiting and abuse protection | Yes before production | N/A | PARTIAL / EXTERNAL | Genuine per-route runtime limits are merged and CodeQL-clean; multi-instance/shared policy is not proven | NOT DEPLOYED | Select WAF/shared-store/proxy model and verify against intended replica topology |

## Registry maintenance from the Phase 0 baseline

1. Treat PR #99 / `198b2ce9...` as the authoritative merged software baseline until a later merged commit changes it.
2. Keep `MERGED` separate from `STAGING`, `PRODUCTION`, legal approval and physical hardware evidence.
3. Attach exact endpoint/test/migration references when a later workstream needs deeper evidence; do not downgrade merged capabilities merely because deployment is still open.
4. Complete the authoritative RBAC matrix and broader API/runtime drift guard before the first live pilot.
5. Resolve the RFID listing/capacity policy with evidence instead of applying an arbitrary limiter.
6. Reconstruct Preview and split PR #28/#31 retained work from current `main`; never treat the stale PR branches as current product state.
7. Review this registry with the MVP scope, Control Board and Readiness Matrix after every material product or architecture change.
