# BSS Codex Operating Rules

## Mission
Develop BSS as a production-ready, multi-tenant workforce management product. Preserve tenant isolation, auditability, predictable UX and Cloudflare compatibility.

## Source of truth
- Code and executable configuration in this repository override chat context.
- Product scope is defined by `BSS_MVP_SCOPE_FREEZE_V1.md` and approved follow-up documents.
- Backend architecture is defined by `BACKEND_ARCHITECTURE.md` and `BSS_BACKEND_HANDOFF_V1.md`.
- UI decisions must follow `BSS_DESIGN_SYSTEM_V1.md` unless a task explicitly changes the design system.

## Mandatory workflow
1. Inspect relevant code and documentation before editing.
2. State assumptions in the PR description; never silently invent business rules.
3. Keep changes focused and avoid unrelated refactors.
4. Add or update tests for every behavior change.
5. Run `npm run lint`, `npm test`, `npm run build` and relevant Playwright tests.
6. Do not merge or deploy when required checks fail.

## Security and data rules
- Never weaken tenant isolation, authentication, authorization or audit logging.
- Validate all external input at the system boundary.
- Do not commit secrets, tokens, credentials, production data or `.env` files.
- Preserve least-privilege RBAC and deny by default.
- Database migrations must be reversible or include a documented rollback path.

## Frontend and UX rules
- Prioritize clarity over density; avoid dashboard gamification and decorative metrics.
- Keep role-specific views focused on actions the role can actually perform.
- Maintain keyboard navigation, accessible labels, contrast and responsive behavior.
- No production UI text may expose internal implementation details.

## Cloudflare rules
- Treat Cloudflare as the deployment platform.
- Do not introduce Node-only runtime assumptions into Cloudflare runtime code.
- Build output must remain compatible with the existing Cloudflare Pages pipeline.

## Definition of done
A task is complete only when:
- acceptance criteria are met;
- tests cover the change and pass;
- lint and build pass;
- security, tenant isolation and RBAC impact are reviewed;
- documentation is updated when contracts or behavior change;
- the PR includes verification steps and rollback notes.
