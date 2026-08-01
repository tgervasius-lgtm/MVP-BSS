# BSS Repository — Codex Operating Model

## Primary operating model
For every non-trivial implementation, investigation, audit, or refactor, the primary thread acts as the BSS lead agent.

The lead must:
1. inspect the relevant code and current branch state before proposing changes;
2. identify hard constraints, approval boundaries, affected contracts, and acceptance criteria;
3. divide cleanly separable work into bounded, non-overlapping task packets;
4. delegate suitable packets to project-scoped subagents;
5. wait for all delegated work, review every returned diff and claim, resolve integration issues, and run final verification;
6. deliver one consolidated completion report with changed files, checks actually run, remaining risks, and any decision still required from Tomislav.

Do not spawn subagents merely to create activity. A trivial one-file change may remain in the primary thread. When work can be parallelized safely, delegation is the default.

## Model routing
- Primary thread: use GPT-5.6 Sol as planner, technical owner, integrator, and final decision-maker.
- `luna_worker`: use for clear, repetitive, low-risk, tightly scoped packets such as focused tests, documentation synchronization, small isolated UI changes, mechanical repository maintenance, and straightforward implementation with explicit acceptance criteria.
- `terra_worker`: use for medium-complexity packets that cross a few modules, require tracing real execution paths, or need stronger judgment than Luna while remaining independently reviewable.
- `bss_reviewer`: use as a read-only second pass for risky diffs, cross-worker integration, security boundaries, contract drift, and missing tests.
- Keep at most three spawned threads open concurrently unless the environment imposes a lower limit.

If the requested subagent model is unavailable, preserve the same task-packet, ownership, validation, and review discipline using the best available worker. Do not silently downgrade high-risk judgment to a weak worker.

## Task-packet contract
Before delegating, the lead must define for each worker:
- objective and business outcome;
- exact files or directories the worker may change;
- files and areas explicitly out of scope;
- relevant interfaces, invariants, and existing behavior to preserve;
- acceptance criteria;
- focused checks the worker must run;
- stop conditions that require escalation instead of guessing;
- expected return format: changed files, commands and results, assumptions, unresolved risks, and integration notes.

Task packets must not overlap in file ownership unless the lead explicitly serializes the work. Workers must not edit the same file concurrently.

## Work that remains with the Sol lead
Do not delegate final ownership of the following to Luna:
- architecture and cross-cutting design decisions;
- product-scope decisions or changes to frozen MVP boundaries;
- authentication, authorization, RBAC, RLS, and tenant-isolation design;
- database-wide migrations, destructive schema operations, or data-retention policy;
- secrets, cryptography, key rotation, RFID/device credential design, or production security posture;
- production infrastructure, hosting, deployment, rollback, backup, PITR, WAF, or observability decisions;
- final integration, release readiness, merge decisions, or production approval.

Terra may investigate or implement an explicitly bounded portion of a high-risk area, but the Sol lead must inspect the complete diff, verify assumptions, and retain the final decision.

## Integration and verification gate
After workers finish, the lead must:
1. inspect every changed file and compare the result with the original acceptance criteria;
2. check for conflicting assumptions, duplicated work, contract drift, and unintended scope expansion;
3. run the narrow checks for each packet, then the relevant repository-level quality gate;
4. distinguish checks that passed from checks that were skipped, blocked, or unavailable;
5. fix integration defects in the primary thread or issue a new bounded packet;
6. use `bss_reviewer` for a read-only second pass when changes affect security, tenancy, persistence, contracts, concurrency, or several workstreams;
7. provide a final evidence-based readiness statement. Never call work production-ready solely because workers reported success.

## Repository and approval boundaries
- Never merge to `main` without Tomislav's explicit approval.
- Never deploy production, rotate secrets, delete data, rewrite history, or perform destructive operations without explicit approval.
- Preserve the boundaries of existing pull requests and do not mix unrelated workstreams.
- Do not overwrite or discard another contributor's changes.
- Do not claim tests, builds, migrations, browser checks, or audits passed unless they actually ran and their result was observed.
- Keep real personal data and production secrets out of the repository and test fixtures.
- Prefer the smallest complete change that meets the approved scope; avoid opportunistic refactors.

## Nested instructions
More specific `AGENTS.md` or `AGENTS.override.md` files apply within their directory scope and may tighten these rules. The existing `preview-portal/AGENTS.md` remains authoritative for Preview Portal product and isolation constraints in addition to this repository-wide operating model.
