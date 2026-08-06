# BSS Decision Log

This log records material product, architecture, governance and delivery decisions. A decision is not considered implemented until its implementation evidence is recorded.

| ID | Date | Decision | Status | Reason | Implementation evidence / next action |
|---|---|---|---|---|---|
| DEC-001 | 2026-08-05 | GitHub is the source of truth for implemented software state. | APPROVED / ACTIVE | Chat history is incomplete and cannot prove repository state. | Use commits, PRs, checks, releases and versioned documentation. |
| DEC-002 | 2026-08-05 | ChatGPT conversations are planning and analysis tools, not implementation records. | APPROVED / ACTIVE | Prevents false `DONE` claims based on conversation context. | All material outcomes must be transferred to GitHub or another named source of truth. |
| DEC-003 | 2026-08-05 | BSS will not be rewritten from scratch. | APPROVED | Existing frontend, backend, tests and governance have material value; current issues are consolidation and incremental technical debt. | Continue incremental refactoring after baseline consolidation. |
| DEC-004 | 2026-08-05 | Preview Portal is a sales and validation sandbox, not production evidence. | APPROVED / ACTIVE | It uses demo behavior and is intentionally isolated from production backend and real personal data. | Maintain explicit preview labeling and separate infrastructure. |
| DEC-005 | 2026-08-05 | Hardware remains `PARTIAL` until physical metrology and production CAD are complete. | APPROVED / ACTIVE | Parametric models cannot prove fit without exact component measurements and confirmed SKUs. | Measure real components and produce final SolidWorks/STEP/manufacturing outputs. |
| DEC-006 | 2026-08-05 | PR #27 is business-approved for continuation after developer review, but not for unsafe direct merge while conflicted. | APPROVED / IN PROGRESS | Technical branch divergence remains a separate risk from business approval. | Complete integration branch from current `main`, run checks, then merge. |
| DEC-007 | 2026-08-05 | PR #53 may merge only into the PR #27 branch as a dependency/security repair. | DONE | It removes current dependency blockers without changing `main`. | PR #53 merged into `agent/bss-backend-phase-b-v1`. |
| DEC-008 | 2026-08-05 | New unrelated core development is paused until Backend Phase B is consolidated into `main`. | APPROVED / ACTIVE | Prevents further branch divergence and repeated conflict resolution. | Resume core feature work after baseline PR merges. |
| DEC-009 | 2026-08-05 | PR #31 will not be merged wholesale without a gap analysis. | PROPOSED | Most governance/security controls were later implemented independently in `main`. | Compare PR #31 against stable `main` and extract only missing controls. |
| DEC-010 | 2026-08-05 | PR #28 should be retargeted or split after baseline consolidation. | PROPOSED | Hardware, QA, API, Docker/operations and handoff are distinct review domains. | Review conflicts and divide into focused PRs where practical. |
| DEC-011 | 2026-08-05 | PR #30 should not be treated as a normal small rebase. | PROPOSED | It is an unusually large, long-lived preview branch with infrastructure dependencies. | Reconstruct or carefully integrate from stable `main`, with full regression testing. |
| DEC-012 | 2026-08-05 | One PR should have one clear, reviewable purpose. | APPROVED / ACTIVE | Reduces hidden regressions, review cost and dependency ambiguity. | Enforce through PR governance and owner review. |
| DEC-013 | 2026-08-05 | New development branches start from the current `main` unless a short-lived stacked dependency is explicitly documented. | APPROVED / ACTIVE | Prevents long-lived parallel product versions. | Include base dependency and merge order in stacked PR descriptions. |
| DEC-014 | 2026-08-06 | Backend Phase B is integrated through a new branch from the protected `main` baseline, preserving static demo behavior and activating API bindings only when a real backend is present. | APPROVED / IN REVIEW | Preserves the released frontend baseline and the full backend without treating Cloudflare static hosting as a functional backend deployment. | Integration branch and draft PR; final implementation status depends on required CI and owner approval. |

## Decision change procedure

When changing a decision:

1. keep the original row;
2. mark it superseded;
3. create a new decision ID;
4. document the reason, impact and migration action;
5. update affected scope, risk and readiness documents.
