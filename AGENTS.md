# BSS Codex Operating Rules v2

Status: ACTIVE WHEN MERGED
Scope: repository-wide Codex/development work

## Mission
Develop BSS as a production-grade, multi-tenant workforce-management product without confusing merged software with deployed, released, legally approved, operationally proven, or physically validated product readiness.

Preserve tenant isolation, auditability, least privilege, stable contracts, maintainability, accessibility, predictable UX, recoverability and evidence-based change control.

## Routing rule
This file governs Codex when Codex is actually needed. It does not require every BSS task to be routed through Codex.

Use ChatGPT/GitHub tooling directly for repository reading, PR/issue status, documentation, roadmap analysis and GitHub administration when local development is not required. Use Codex for implementation, local runtime work, debugging, builds/tests that require the checkout, and complex repo-wide code changes.

Do not create local-development work merely to perform a task that can be completed safely through GitHub-native tooling.

## Source-of-truth hierarchy
When sources disagree, do not guess. Stop, identify the conflict and resolve it through an issue or an explicitly reviewed change.

Use this authority order:

1. Merged code, migrations and executable configuration on protected `main`.
2. `openapi/bss-mvp-api-v1.yaml` for HTTP/API contract behavior.
3. `BSS_READINESS_MATRIX.md` for current readiness status and missing evidence.
4. `BSS_MVP_SCOPE_FREEZE_V1.md` plus approved scope-change decisions.
5. `docs/BSS_OS_PRODUCT_MEMORY_V1.md` for product-change discipline and durable technical decisions.
6. `docs/bss-os/README.md` and its linked authoritative BSS OS registers, especially:
   - `docs/bss-os/CONTROL_BOARD.md`
   - `docs/bss-os/DECISION_LOG.md`
   - `docs/bss-os/RISK_REGISTER.md`
   - `docs/bss-os/PRODUCT_FEATURE_REGISTRY.md`
7. Approved architecture, backend handoff and design-system documents relevant to the task.
8. Chat history, screenshots, temporary notes and unapproved ideas last.

GitHub `main`, current PR/issue state and required checks must be re-read before making claims about current implementation status.

## Baseline and branching rules
- Protected `main` is the only authoritative software baseline.
- New work starts from current `main` unless an issue explicitly authorizes a short-lived extraction or stacked branch.
- Historical PRs/branches may be used as reference material, not as an automatic merge source.
- Never wholesale-merge an old broad draft merely because parts of it remain useful.
- One PR should have one primary reviewable purpose.
- Split multi-domain work when practical.
- Never force-push protected or shared branches unless explicitly authorized for a documented recovery case.
- Never bypass required checks, unresolved review threads or branch protections.

## Mandatory change workflow
Before editing:
1. Fetch/re-read the current branch, relevant `main` state and linked issue/PR.
2. Read the relevant source-of-truth documents for the affected domain.
3. State the goal, scope, assumptions, affected roles and acceptance criteria.
4. Classify impact: UI, frontend behavior, backend/API, database, security/privacy, infrastructure, hardware or operations.
5. Identify rollback/recovery requirements before making high-risk changes.

During implementation:
1. Keep the change focused; avoid unrelated refactors.
2. Preserve existing contracts unless the task explicitly changes them.
3. Add or update tests for every behavior change.
4. Do not duplicate business logic across frontend and backend.
5. Do not introduce dependencies without a clear need, license/security review and lifecycle rationale.
6. Do not weaken an existing gate to make a change pass.

Before proposing merge:
1. Run the relevant local lint/test/build checks available for the affected packages.
2. Run focused tests for the changed behavior first, then the applicable broader suite.
3. Inspect the final diff and confirm no unrelated, generated, secret or local-debug files are included.
4. Push only the intended branch and let required GitHub checks establish repository-level evidence.
5. Report skipped/unavailable tests explicitly; never label them PASS.

## Security, tenancy and data rules
- Never weaken tenant isolation, authentication, authorization, audit logging, rate limiting or secret handling to satisfy a test or scanner.
- RBAC is deny-by-default and must be enforced server-side.
- Every tenant-owned data path must preserve organization scope and applicable RLS/data-scope protections.
- Validate external input at system boundaries.
- Security-sensitive mutations require appropriate audit evidence and concurrency/revision handling where the contract expects it.
- Do not commit secrets, tokens, credentials, recovery codes, production data, customer personal data, private access inventories or `.env` files.
- Do not suppress/dismiss a security finding merely to obtain a green check. Prove false-positive/model-gap cases with reproducible evidence and preserve the underlying runtime control.
- Database migrations must be versioned; never rewrite an already-applied migration checksum. Destructive changes require rollback or documented forward-recovery planning.

## API and database rules
- OpenAPI is the contract for HTTP behavior; implementation and OpenAPI must not drift silently.
- New or changed endpoints require operation IDs, schemas, documented roles, stable error behavior and contract tests as applicable.
- Runtime status codes such as authentication, authorization, validation, conflict and rate-limit responses must match the contract.
- Database changes require PostgreSQL-backed verification, tenant/RLS analysis, index implications and migration/recovery evidence appropriate to the change.
- Do not claim a migration, restore, PITR or production database procedure is proven solely because repository tests are green.

## Frontend, UX and Preview rules
- Prioritize clarity over density. Avoid gamification, decorative KPI overload and screens that expose data without a user purpose.
- Role-specific views should emphasize actions the role can actually perform.
- Maintain keyboard navigation, accessible labels, contrast, responsive behavior and meaningful loading/error/empty states.
- Permanent design-rule changes must update the design-system source when that workflow is active.
- Preview Portal is a sales/UX sandbox, not production.
- Preview must use synthetic data and remain isolated from production backend, authentication, secrets and personal data.
- A Preview demo, screenshot or Cloudflare Pages deployment is not proof that production functionality exists.

## Infrastructure and deployment boundaries
Do not treat Cloudflare as the runtime for the entire BSS system.

Current approved architectural direction is defined by `docs/bss-os/ADR-001-INFRASTRUCTURE-BASELINE.md`:
- frontend and Preview delivery: Cloudflare Pages;
- public API edge/DNS/TLS: Cloudflare as applicable;
- backend: Node.js/Fastify runtime on a separate EU application platform; the current proposed baseline is Render Frankfurt;
- database: separate managed PostgreSQL in the EU; the current proposed baseline is Render Frankfurt;
- staging and production must be separate environments with separate databases and secrets.

The infrastructure ADR is a direction, not evidence that staging or production has been provisioned. Do not introduce Cloudflare-runtime constraints into the Node/Fastify backend merely for frontend deployment compatibility.

No direct workstation-to-production deployment is allowed. Production deployment requires the protected release path and its own readiness evidence.

## Hardware boundary
Repository code and documentation cannot prove physical terminal readiness.

Do not claim final enclosure dimensions, mounting, thermal behavior, RFID reliability, offline reliability or production hardware readiness without physical metrology and test evidence. Hardware remains `PARTIAL`/`EXTERNAL` where the Readiness Matrix says so.

## Status and evidence language
Keep these states distinct:
- implemented;
- merged;
- checks green;
- deployed;
- verified in an environment;
- released;
- pilot-accepted;
- production-ready.

A document may be `PROPOSED` without being approved or implemented. A merged PR may be `DONE` for its narrow repository scope without making the product production-ready.

Never use chat agreement, elapsed effort, a screenshot, a checklist signature or an open PR as implementation evidence.

## Risk discipline
Treat these as high-risk by default:
- auth/session changes;
- RBAC/data-scope changes;
- RLS/tenant isolation;
- migrations and destructive data changes;
- secrets/credentials;
- device identity/signing;
- production infrastructure/deployment;
- privacy/customer-data behavior;
- security-control weakening.

For high-risk work, require explicit owner approval before merge/deploy and document verification plus rollback/recovery.

## Definition of Ready
Implementation should not start until the task has:
- a clear problem/goal;
- affected users/roles;
- scope boundaries;
- acceptance criteria;
- known dependencies;
- UI/API/database/security/privacy impact assessment appropriate to the task.

If these cannot be inferred safely from authoritative sources, stop and ask rather than inventing a business rule.

## Definition of Done
A repository change is complete for its stated scope only when:
- acceptance criteria are met;
- relevant lint, tests and build pass;
- required GitHub checks pass;
- security, tenant isolation, RBAC and audit impact are reviewed where applicable;
- OpenAPI, migrations and documentation are synchronized where applicable;
- the PR records verification and rollback/recovery notes;
- known deferred work is tracked explicitly rather than hidden;
- the change is merged into protected `main` when merge is part of the task.

`DONE` for repository scope does not imply staging, production, legal, operational, pilot or physical-hardware readiness unless those layers have their own evidence.

## Stop conditions
Stop and report instead of improvising when:
- the requested branch/remote/ref cannot be verified;
- the working tree contains unexplained tracked changes;
- authoritative sources contradict each other materially;
- a required test/gate fails for an unexplained reason;
- a change would require weakening security/governance;
- production/customer data or secrets would be exposed;
- a high-risk merge/deploy action was not explicitly authorized;
- physical or operational evidence is required but unavailable.
