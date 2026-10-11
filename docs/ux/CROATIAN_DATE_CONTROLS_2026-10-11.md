# Croatian date controls — 2026-10-11

Status: IMPLEMENTED LOCALLY / FOR REVIEW. Base main be6e9835ac898aecf5b1c01728dd880c51fe044b. Central Board v206 / Map v58 read this cycle.

Scope: worker correction and absence dates; Admin holiday dates in demo and API modal. Manager displays continue using Croatian formatting; no new manager permissions or actions. Month-only filters remain separate in #262. New controls show day / Croatian month / year, retaining native ISO input IDs, min/max validation and one delegated change. Invalid or out-of-range selections show an explicit Croatian message and clear the submitted value. No dependencies, API payload, authorization, storage or data changes.

PASS: architecture budget, lint, production build, 170 unit tests (0 skipped); 36 existing desktop/mobile Chromium scenarios; 2 added focused desktop/mobile scenarios, including axe and no page overflow. Native physical iPhone/Safari and full-stack are not verified locally. Counts differ from #262 because this branch starts on current main and does not include that draft.

Visual QA: leave form desktop/mobile screenshots inspected separately. All checks are local evidence; GitHub required checks and owner merge decision remain separate. Main Sonar findings are outside this scope.

Rollback: revert this frontend change. New date module is loaded before app and public-shell precached under r9; no migration. Reconcile index/app/SW integration with #262 when choosing merge order; do not overwrite its month module or cache assets. Existing English month-only controls on main are not fixed by this branch alone.
