# BSS Product Feature Registry

Last reviewed: 2026-08-05

Important: this register reflects the current repository topology before Backend MVP Phase B is consolidated into `main`. A feature implemented only in PR #27 is not marked as released or production-ready.

## Status model

- UI: `NONE`, `DESIGNED`, `DEMO`, `IMPLEMENTED`
- Core implementation: `NONE`, `PARTIAL`, `IN REVIEW`, `MERGED`
- Production: `NOT DEPLOYED`, `STAGING`, `PRODUCTION`

## Identity, tenancy and access

| ID | Capability | MVP | UI | Core implementation | Security/test evidence | Production | Primary evidence / next action |
|---|---|---:|---|---|---|---|---|
| IAM-001 | Login with secure browser session | Yes | IMPLEMENTED | IN REVIEW | Auth, contract and concurrency coverage exists on PR #27 | NOT DEPLOYED | Integrate PR #27 into `main`; external security review before production |
| IAM-002 | Session refresh and logout/revocation | Yes | IMPLEMENTED | IN REVIEW | Session checks and user/organization revalidation documented on PR #27 | NOT DEPLOYED | Consolidate baseline and rerun full-stack checks |
| IAM-003 | User invitation and one-time activation | Yes | IMPLEMENTED | IN REVIEW | One-time token, password hashing, transaction and stale invitation handling | NOT DEPLOYED | Verify after final integration |
| IAM-004 | Role-based access control | Yes | DEMO / IMPLEMENTED | IN REVIEW | OpenAPI role declarations and negative contract coverage are partial readiness evidence | NOT DEPLOYED | Complete authoritative role-operation matrix before pilot |
| IAM-005 | Multi-tenant isolation with PostgreSQL RLS | Yes | N/A | IN REVIEW | PostgreSQL 16, NOBYPASSRLS and cross-tenant CI evidence exists on PR #27 | NOT DEPLOYED | Preserve migration/RLS semantics during integration; external threat review |
| IAM-006 | Organization lifecycle and active-status enforcement | Yes | IMPLEMENTED | IN REVIEW | Login/refresh organization validation and tenant transactions | NOT DEPLOYED | Final integration and pilot policy review |

## Organization and workforce administration

| ID | Capability | MVP | UI | Core implementation | Security/test evidence | Production | Primary evidence / next action |
|---|---|---:|---|---|---|---|---|
| ORG-001 | Organization settings and profile | Yes | IMPLEMENTED | IN REVIEW | API contract and tenant scoping | NOT DEPLOYED | Confirm final fields and permissions after PR #27 integration |
| ORG-002 | Department create/update/block | Yes | IMPLEMENTED | IN REVIEW | Phase A contract and PostgreSQL coverage | NOT DEPLOYED | Preserve optimistic revision/validation behavior |
| ORG-003 | Worker registry and employment status | Yes | IMPLEMENTED | IN REVIEW | Tenant-scoped service and contract tests | NOT DEPLOYED | Complete final role visibility matrix |
| ORG-004 | Shift definitions and worker assignment | Yes | IMPLEMENTED | IN REVIEW | API/data implementation and regression tests | NOT DEPLOYED | Validate schedule edge cases after stable baseline |
| ORG-005 | Holiday calendar and revision semantics | Yes | IMPLEMENTED | IN REVIEW | Separate calendar ETag/revision contract | NOT DEPLOYED | Verify conflict handling and tenant holidays in final integration |

## Time, attendance and terminal flows

| ID | Capability | MVP | UI | Core implementation | Security/test evidence | Production | Primary evidence / next action |
|---|---|---:|---|---|---|---|---|
| TIME-001 | RFID/NFC clock-in and clock-out | Yes | DEMO / IMPLEMENTED | IN REVIEW | Terminal credential, event and business-flow tests exist on PR #27 | NOT DEPLOYED | Integrate backend and connect real terminal prototype |
| TIME-002 | Current presence and attendance dashboard | Yes | IMPLEMENTED | IN REVIEW | Dedicated dashboard summary and drill-down contracts | NOT DEPLOYED | Verify real API binding after baseline merge |
| TIME-003 | Attendance records and filtering | Yes | IMPLEMENTED | IN REVIEW | Bounded filters, tenant scope and contract tests | NOT DEPLOYED | Confirm pagination, timezone and export consistency |
| TIME-004 | Manual attendance correction | Yes | IMPLEMENTED | IN REVIEW | Audit and role constraints documented/tested | NOT DEPLOYED | Define final approval and retention policy |
| TIME-005 | Missing/irregular event review queue | Yes | IMPLEMENTED | IN REVIEW | Frontend drill-down and backend Phase B flow | NOT DEPLOYED | Confirm business rules with pilot employers |
| TIME-006 | Terminal offline sync event ingestion | Yes | DEMO / IMPLEMENTED | IN REVIEW | Device request model, replay boundaries and sync timeline | NOT DEPLOYED | Run real device retry/idempotency/offline tests |
| TIME-007 | Terminal sync-event timeline | Yes | IMPLEMENTED | IN REVIEW | Newest-first keyset pagination and tenant filters | NOT DEPLOYED | Verify production retention and operational visibility |
| TIME-008 | Device credential validity, revocation and rotation | Yes | ADMIN UI PARTIAL | IN REVIEW | `valid_from`, revocation and expiry checks; KMS remains open | NOT DEPLOYED | Implement managed secret/KMS rotation process |

## RFID administration

| ID | Capability | MVP | UI | Core implementation | Security/test evidence | Production | Primary evidence / next action |
|---|---|---:|---|---|---|---|---|
| RFID-001 | Assign RFID credential to worker | Yes | IMPLEMENTED | IN REVIEW | UID normalization, HMAC hashing and tenant isolation | NOT DEPLOYED | Confirm physical card workflow and permissions |
| RFID-002 | Replace/revoke RFID credential | Yes | DEMO / IMPLEMENTED | IN REVIEW | Audit trail and credential state transitions | NOT DEPLOYED | Verify real terminal propagation and compromise workflow |
| RFID-003 | Masked RFID display | Yes | IMPLEMENTED | IN REVIEW | Raw UID excluded from responses; masked representation only | NOT DEPLOYED | Confirm logs and support tooling never expose raw UID |

## Leave and absence

| ID | Capability | MVP | UI | Core implementation | Security/test evidence | Production | Primary evidence / next action |
|---|---|---:|---|---|---|---|---|
| LEAVE-001 | Worker submits leave request | Yes | IMPLEMENTED | IN REVIEW | Contract, date validation and tenant scope | NOT DEPLOYED | Verify mobile UX and business-day rules |
| LEAVE-002 | Manager approves or rejects request | Yes | IMPLEMENTED | IN REVIEW | Role checks, status transitions and audit | NOT DEPLOYED | Confirm escalation/delegation policy for pilots |
| LEAVE-003 | Authoritative leave allowance and remaining days | Yes | IMPLEMENTED | IN REVIEW | Approved/planned/remaining/available working-day calculations | NOT DEPLOYED | Validate carryover and local legal policy with accountant/legal advisor |
| LEAVE-004 | Shared approved-leave calendar | Yes, scope v1.1 | DEMO / IMPLEMENTED | PARTIAL / IN REVIEW | Frontend privacy minimization exists; authoritative visibility rules require final backend confirmation | NOT DEPLOYED | Confirm team/department/organization visibility policy and tests |
| LEAVE-005 | Tenant holiday-aware leave calculation | Yes | IMPLEMENTED | IN REVIEW | Weekend and tenant-holiday calculation coverage | NOT DEPLOYED | Verify region-specific holiday administration |

## Reports, accounting and exports

| ID | Capability | MVP | UI | Core implementation | Security/test evidence | Production | Primary evidence / next action |
|---|---|---:|---|---|---|---|---|
| REPORT-001 | Report type and filter selection | Yes | IMPLEMENTED | IN REVIEW | Approved report types and server validation | NOT DEPLOYED | Confirm final pilot reporting catalogue |
| REPORT-002 | Bounded report preview | Yes | IMPLEMENTED | IN REVIEW | Limit 200, deterministic dataset version and server totals | NOT DEPLOYED | Verify performance and stale-preview behavior |
| REPORT-003 | XLSX export | Yes | IMPLEMENTED / HANDOFF | IN REVIEW | Primary business export in product scope; generator exists on PR #27 | NOT DEPLOYED | Validate output with payroll/accounting sample cases |
| REPORT-004 | CSV export | Yes | IMPLEMENTED / HANDOFF | IN REVIEW | Technical export path in scope | NOT DEPLOYED | Verify encoding, locale and delimiter compatibility |
| REPORT-005 | Accounting-role restricted access | Yes | IMPLEMENTED | IN REVIEW | RBAC declarations and contract coverage | NOT DEPLOYED | Complete least-privilege role matrix |

## Audit and accountability

| ID | Capability | MVP | UI | Core implementation | Security/test evidence | Production | Primary evidence / next action |
|---|---|---:|---|---|---|---|---|
| AUDIT-001 | Tenant-scoped audit log | Yes | IMPLEMENTED | IN REVIEW | Critical changes recorded with tenant boundaries | NOT DEPLOYED | Define retention, immutability assurance and export policy |
| AUDIT-002 | Actor, action and entity context | Yes | IMPLEMENTED | IN REVIEW | Contract/service coverage | NOT DEPLOYED | Confirm privacy minimization for IP/user-agent pseudonyms |
| AUDIT-003 | Structured error logging with secret/SQL redaction | Yes | N/A | IN REVIEW | PostgreSQL query/detail/parameter redaction implemented on PR #27 | NOT DEPLOYED | Integrate with production observability and verify redaction |

## Experience and sales validation

| ID | Capability | MVP | UI | Core implementation | Security/test evidence | Production | Primary evidence / next action |
|---|---|---:|---|---|---|---|---|
| UX-001 | Frozen Frontend v1.0.0 baseline | Yes | RELEASED | MERGED | Deterministic build, unit/E2E/axe and immutable release/handoff evidence | STATIC PREVIEW | Maintain as historical frontend contract baseline |
| UX-002 | Public demo login | Sales demo | RELEASED | MERGED | Demo-only credentials and regression coverage | STATIC PREVIEW | Keep clearly separated from production authentication |
| PREVIEW-001 | Personalized company Preview Portal | Sales validation | RELEASE CANDIDATE | IN REVIEW | Extensive unit, E2E, axe, mobile and offline evidence on PR #30 | NOT MERGED | Reconstruct/integrate from stable `main` |
| PREVIEW-002 | Cross-role connected demo workflows | Sales validation | RELEASE CANDIDATE | IN REVIEW | Worker-manager, RFID and accounting simulated flows | NOT MERGED | Preserve simulation boundaries and rerun tests |
| PREVIEW-003 | External prospect access | Sales validation | UI READY | EXTERNAL BLOCKER | Cloudflare Access may intercept anonymous visitors | NOT AVAILABLE GENERALLY | Decide public/allowlisted access and test externally |
| PREVIEW-004 | Lead/contact capture | Sales validation | NONE | NONE | Privacy, retention and ownership not defined | NOT DEPLOYED | Define compliant contact workflow before marketing launch |

## Hardware and platform

| ID | Capability | MVP | UI | Core implementation | Security/test evidence | Production | Primary evidence / next action |
|---|---|---:|---|---|---|---|---|
| HW-001 | Raspberry Pi / display / RFID terminal architecture | Yes | N/A | PARTIAL | BOM and handoff material exist; physical integration not proven | NO PROTOTYPE EVIDENCE IN MAIN | Confirm exact SKUs and measurements |
| HW-002 | Parametric terminal enclosure | Yes | N/A | IN REVIEW ON PR #28 | Parametric OpenSCAD and acceptance criteria | NOT MANUFACTURING READY | Physical metrology, final SolidWorks/STEP/STL |
| HW-003 | Buzzer and local confirmation feedback | Yes | N/A | PROPOSED / PARTIAL | Product requirement known; physical verification pending | NOT DEPLOYED | Prototype and test in real environment |
| OPS-001 | Hardened backend container | Yes | N/A | IN REVIEW ON PR #28 | Non-root/read-only/healthcheck design | NOT DEPLOYED | Retarget/split PR #28 and run container security checks |
| OPS-002 | Staging environment | Yes before pilot | N/A | NONE / EXTERNAL | Required by readiness matrix | NOT DEPLOYED | Select platform and provision production-like staging |
| OPS-003 | Production deployment | Yes before live use | N/A | NONE / EXTERNAL | Hosting/KMS/network/WAF decisions open | NOT DEPLOYED | Architecture decision and controlled deployment plan |
| OPS-004 | Backup and PITR | Yes before live use | N/A | DOCUMENTED / EXTERNAL | Runbook concepts exist; real restore drill missing | NOT PROVEN | Configure and execute restore/PITR drill |
| OPS-005 | Monitoring, alerts and incident response | Yes before live use | N/A | PARTIAL / EXTERNAL | Logging exists; platform observability not proven | NOT DEPLOYED | Implement telemetry, alerting and incident rehearsal |

## Registry completion work

After PR #27 is consolidated into `main`:

1. replace `IN REVIEW` with `MERGED` only where the final integration proves the capability;
2. attach exact PR, commit, migration, endpoint and test-run references;
3. add explicit negative/edge-case evidence for critical RBAC and tenant boundaries;
4. separate software readiness from production deployment status;
5. review the registry with the MVP scope and readiness matrix to remove contradictions.
