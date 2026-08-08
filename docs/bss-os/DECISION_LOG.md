# BSS Decision Log

This log records material product, architecture, governance and delivery decisions. A decision is not considered implemented until its implementation evidence is recorded.

| ID | Date | Decision | Status | Reason | Implementation evidence / next action |
|---|---|---|---|---|---|
| DEC-001 | 2026-08-05 | GitHub is the source of truth for implemented software state. | APPROVED / ACTIVE | Chat history is incomplete and cannot prove repository state. | Use commits, PRs, checks, releases and versioned documentation. |
| DEC-002 | 2026-08-05 | ChatGPT conversations are planning and analysis tools, not implementation records. | APPROVED / ACTIVE | Prevents false `DONE` claims based on conversation context. | All material outcomes must be transferred to GitHub or another named source of truth. |
| DEC-003 | 2026-08-05 | BSS will not be rewritten from scratch. | APPROVED / ACTIVE | Existing frontend, backend, tests and governance have material value; current issues are consolidation and incremental technical debt. | Continue incremental refactoring from the authoritative merged baseline. |
| DEC-004 | 2026-08-05 | Preview Portal is a sales and validation sandbox, not production evidence. | APPROVED / ACTIVE | It uses demo behavior and is intentionally isolated from production backend and real personal data. | Maintain explicit preview labeling and separate infrastructure. |
| DEC-005 | 2026-08-05 | Hardware remains `PARTIAL` until physical metrology and production CAD are complete. | APPROVED / ACTIVE | Parametric models cannot prove fit without exact component measurements and confirmed SKUs. | Measure real components and produce final SolidWorks/STEP/manufacturing outputs. |
| DEC-006 | 2026-08-05 | PR #27 is business-approved for continuation after developer review, but not for unsafe direct merge while conflicted. | SUPERSEDED / COMPLETED THROUGH PR #99 | Technical branch divergence required a dedicated integration path rather than direct merge. | PR #99 safely integrated the retained Phase B content into current `main`; PR #27 was closed as superseded. |
| DEC-007 | 2026-08-05 | PR #53 may merge only into the PR #27 branch as a dependency/security repair. | DONE | It removed dependency blockers without prematurely changing `main`. | PR #53 merged into `agent/bss-backend-phase-b-v1` and its retained result was later integrated through PR #99. |
| DEC-008 | 2026-08-05 | New unrelated core development is paused until Backend Phase B is consolidated into `main`. | SUPERSEDED / CONDITION SATISFIED | The pause prevented further branch divergence while the authoritative backend baseline was unresolved. | Condition satisfied by merged PR #99; future development must start from current `main` unless an explicitly documented short-lived stack is required. |
| DEC-009 | 2026-08-05 | PR #31 will not be merged wholesale without a gap analysis. | APPROVED / ACTIVE | Most governance/security controls were later implemented independently in `main`. | Now that Phase 0 is complete, perform the final gap analysis and extract only still-useful controls. |
| DEC-010 | 2026-08-05 | PR #28 should be retargeted or split after baseline consolidation. | APPROVED / ACTIVE | Hardware, QA, API, Docker/operations and handoff are distinct review domains. | Create focused branches from current `main`, preserve useful work and then supersede PR #28. |
| DEC-011 | 2026-08-05 | PR #30 should not be treated as a normal small rebase. | APPROVED / ACTIVE | It is an unusually large, long-lived preview branch with infrastructure dependencies. | Reconstruct Preview Portal from current `main`, preserving validated Preview capabilities without carrying forward stale root configuration wholesale. |
| DEC-012 | 2026-08-05 | One PR should have one clear, reviewable purpose. | APPROVED / ACTIVE | Reduces hidden regressions, review cost and dependency ambiguity. | Enforce through PR governance and owner review. |
| DEC-013 | 2026-08-05 | New development branches start from the current `main` unless a short-lived stacked dependency is explicitly documented. | APPROVED / ACTIVE | Prevents long-lived parallel product versions. | Include base dependency and merge order in stacked PR descriptions. |
| DEC-014 | 2026-08-06 | Backend Phase B is integrated through a new branch from the protected `main` baseline, preserving static demo behavior and activating API bindings only when a real backend is present. | DONE | Preserved the released frontend baseline while integrating the full backend without treating Cloudflare static hosting as a functional backend deployment. | Completed through PR #99; resulting `main` commit `198b2ce9f1ad73b7b72058a930cf005cbb35a0da`. |
| DEC-015 | 2026-08-08 | PR #99 establishes the single authoritative post-Phase-0 software baseline in `main`. | APPROVED / DONE | Required CI, PostgreSQL/full-stack checks and CodeQL were green, and the reviewed integration content landed without direct-merging the stale PR #27 branch. | PR #99 squash-merged as `198b2ce9f1ad73b7b72058a930cf005cbb35a0da`; PR #27 closed as superseded; issue #55 closed as completed. |
| DEC-016 | 2026-08-08 | Merged software baseline and production readiness remain separate states. | APPROVED / ACTIVE | PR #99 proves repository integration and test status, not staging, hosting, observability, hardware or live-customer readiness. | Keep deployment, infrastructure, restore, privacy, hardware and pilot gates open until separately evidenced. |
| DEC-017 | 2026-08-08 | BSS OS truth sources must be synchronized before changing Codex operating instructions. | APPROVED / IN PROGRESS | `AGENTS.md` must not point Codex at stale or contradictory governance state. | Update Control Board, Decision Log, Risk Register, Product Feature Registry and Readiness Matrix first; then create `AGENTS.md v2`. |

## Decision change procedure

When changing a decision:

1. keep the original row;
2. mark it superseded rather than deleting its history;
3. create a new decision ID when the decision itself changes materially;
4. document the reason, impact and migration action;
5. update affected scope, risk, feature and readiness documents.
