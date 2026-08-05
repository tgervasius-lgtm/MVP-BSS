# BSS Operating System

Status: ACTIVE
Owner: Tomislav Bognar / BSS
Repository source of truth: `tgervasius-lgtm/MVP-BSS`

## Purpose

BSS OS is the governance layer for product, software, hardware, operations and pilot readiness. It does not replace technical documentation. It links decisions, risks, feature status and readiness evidence so the project can be continued by Codex, an external developer or a future internal team without relying on chat history.

## Sources of truth

| Area | Authoritative source |
|---|---|
| Implemented code | GitHub repository and merged commits |
| Pull request status | GitHub pull requests and required checks |
| Technical readiness | `BSS_READINESS_MATRIX.md` |
| Product scope | `BSS_MVP_SCOPE_FREEZE_V1.md` and approved scope changes |
| API contract | `openapi/bss-mvp-api-v1.yaml` |
| Database state | versioned migrations and integration tests |
| Decisions | `docs/bss-os/DECISION_LOG.md` |
| Risks | `docs/bss-os/RISK_REGISTER.md` |
| Feature status | `docs/bss-os/PRODUCT_FEATURE_REGISTRY.md` |
| Current operating priorities | `docs/bss-os/CONTROL_BOARD.md` |
| Infrastructure proposal | `docs/bss-os/ADR-001-INFRASTRUCTURE-BASELINE.md` |
| Pilot readiness | `docs/bss-os/PILOT_READINESS_PACKAGE.md` |
| GDPR/data governance baseline | `docs/bss-os/GDPR_DATA_GOVERNANCE_BASELINE.md` |
| Legal operations templates | `docs/bss-os/LEGAL_OPERATIONS_TEMPLATE_PACK.md` |

## Status language

- `IDEA`: not approved.
- `PROPOSED`: defined proposal awaiting decision.
- `APPROVED`: approved but not necessarily implemented.
- `IN PROGRESS`: active work with an identified owner or PR.
- `BLOCKED`: work cannot safely continue until a dependency is resolved.
- `IN REVIEW`: implementation exists and is under review.
- `DONE`: merged or otherwise proven complete for its stated scope.
- `RELEASED`: included in a declared release.
- `PARTIAL`: some required layers or evidence are missing.
- `EXTERNAL`: depends on infrastructure, legal validation, physical measurement or another non-repository action.

## Operating rules

1. Chat messages are not implementation evidence.
2. A feature is not `DONE` without an identifiable commit or pull request, passing checks and updated documentation where applicable.
3. New branches start from the current `main`, except explicitly documented short-lived stacked work.
4. One pull request should have one reviewable purpose.
5. Large or multi-domain pull requests must be split when practical.
6. Preview and demo behavior must never be represented as production behavior.
7. Production readiness requires closure of repository, infrastructure, operations, security, privacy and hardware blockers, not only green application tests.

## Update discipline

Update these registers when a change affects product scope, architecture, API, data, security, deployment, terminal behavior, privacy, hardware, pilot readiness or developer handoff.
