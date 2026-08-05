# BSS Operating System

Status: ACTIVE
Owner: Tomislav Bognar / BSS
Repository source of truth: `tgervasius-lgtm/MVP-BSS`

## Purpose

BSS OS is the governance layer for product, software, hardware, operations, finance, releases, sales, pricing and pilot readiness. It does not replace technical documentation, statutory accounting or signed legal documents. It links decisions, risks, feature status, release/change control, commercial workflow, finance controls, asset controls, pricing controls and readiness evidence so the project can be continued by Codex, an external developer or a future internal team without relying on chat history.

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
| Founder governance | `docs/bss-os/FOUNDER_OPERATING_SYSTEM.md` |
| Finance and cashflow governance | `docs/bss-os/FINANCE_CASHFLOW_OPERATING_SYSTEM.md` |
| Procurement, inventory and assets | `docs/bss-os/PROCUREMENT_INVENTORY_ASSET_MANAGEMENT_OS.md` |
| External developers and vendors | `docs/bss-os/EXTERNAL_DEVELOPER_VENDOR_MANAGEMENT_PACK.md` |
| Release, change and product communication | `docs/bss-os/RELEASE_CHANGE_PRODUCT_COMMUNICATION_OS.md` |
| Infrastructure proposal | `docs/bss-os/ADR-001-INFRASTRUCTURE-BASELINE.md` |
| Pilot readiness | `docs/bss-os/PILOT_READINESS_PACKAGE.md` |
| Pilot success and post-pilot review | `docs/bss-os/PILOT_SUCCESS_POST_PILOT_REVIEW_PACK.md` |
| Pilot installation and acceptance | `docs/bss-os/PILOT_INSTALLATION_ACCEPTANCE_PACK.md` |
| Demo and role-based training | `docs/bss-os/DEMO_TRAINING_PLAYBOOK.md` |
| Customer administration | `docs/bss-os/CUSTOMER_ADMIN_MANUAL.md` |
| GDPR/data governance baseline | `docs/bss-os/GDPR_DATA_GOVERNANCE_BASELINE.md` |
| Legal operations templates | `docs/bss-os/LEGAL_OPERATIONS_TEMPLATE_PACK.md` |
| Sales and customer onboarding | `docs/bss-os/SALES_CUSTOMER_ONBOARDING_OS.md` |
| Customer discovery and outreach | `docs/bss-os/CUSTOMER_DISCOVERY_OUTREACH_PACK.md` |
| Pricing and commercial offers | `docs/bss-os/PRICING_COMMERCIAL_OFFER_BASELINE.md` |
| Support and incident operations | `docs/bss-os/SUPPORT_INCIDENT_OPERATING_SYSTEM.md` |

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
8. Real prospect and customer personal data must not be committed to the public product repository.
9. Assumptions and working price bands must not be presented as approved customer prices.
10. Proposed support response targets must not be presented as contractual SLA commitments before approval and signed customer terms.
11. An installation checklist or customer signature must not be presented as proof of physical readiness when a critical acceptance test is failed, blocked or unsupported by evidence.
12. A successful demo, completed training session or participant signature must not be presented as proof of production readiness or permission to process live employee data.
13. Process documentation without verified screenshots and click paths must not be presented as an authoritative user-interface manual.
14. A positive pilot narrative, customer enthusiasm or weighted score must not override a failed critical security, privacy, tenant-isolation, safety or data-integrity gate.
15. A founder discussion, chat agreement or personal assumption is not an approved company decision until it is recorded through the authorized decision process.
16. Time spent, an open pull request, a screenshot or a verbal promise is not an accepted vendor deliverable without the agreed evidence and acceptance result.
17. Budget, forecast, scenario, commitment, invoice and paid actual are separate financial states and must not be presented as interchangeable.
18. A supplier invoice alone is not payment authorization; payment requires an approved commitment, matching evidence, acceptance where applicable and authorized approval.
19. Ordered, received, inspected, accepted, available and deployed are separate hardware and inventory states.
20. A similar-looking component or changed revision is not an approved substitute until compatibility, required retesting and the change decision are documented.
21. Merged, deployed, verified and released are separate software and product states; a successful pull request is not a production release.
22. Customer-facing release notes and product claims must match the Product Feature Registry and the actual verified release scope.

## Update discipline

Update these registers when a change affects founder roles, decision rights, spending controls, budgets, commitments, invoices, receivables, subscriptions, grants, cashflow, runway, payment authorization, procurement, approved parts, suppliers, inventory, assets, BOMs, configuration traceability, custody, spares, repairs, RMAs, disposal, release candidates, versioning, deployment approval, rollout, rollback, migrations, release notes, product communication, critical access, vendor engagement, external development, deliverable acceptance, intellectual-property evidence, product scope, architecture, API, data, security, deployment, terminal behavior, privacy, hardware, sales, pricing, customer onboarding, customer administration, demo, training, installation, acceptance, support, incident response, pilot readiness, pilot evaluation, post-pilot conversion or developer handoff.
