# Croatian date controls — 2026-10-11

Status: IMPLEMENTED LOCALLY / FOR REVIEW. Base main be6e9835ac898aecf5b1c01728dd880c51fe044b. Central Board v206 / Map v58 read this cycle.

Scope: worker correction and absence dates; Admin holiday dates in demo and API modal. Manager displays continue using Croatian formatting; no new manager permissions or actions. Month-only filters remain separate in #262. New controls show day / Croatian month / year, retaining native ISO input IDs, min/max validation and one delegated change. Invalid or out-of-range selections show an explicit Croatian message and clear the submitted value. No dependencies, API payload, authorization, storage or data changes.

PASS: architecture budget, lint, production build, 170 unit tests (0 skipped); 36 existing desktop/mobile Chromium scenarios; 2 added focused desktop/mobile scenarios, including axe and no page overflow. Native physical iPhone/Safari and full-stack are not verified locally. Counts differ from #262 because this branch starts on current main and does not include that draft.

Visual QA: leave form desktop/mobile screenshots inspected separately. All checks are local evidence; GitHub required checks and owner merge decision remain separate. Main Sonar findings are outside this scope.

Rollback: revert this frontend change. New date module is loaded before app and public-shell precached under r10; no migration. Reconcile index/app/SW integration with #262 when choosing merge order; do not overwrite its month module or cache assets. Existing English month-only controls on main are not fixed by this branch alone.

## Follow-up: 24-hour time controls — 11.10.2026.

The same localization PR now includes worker correction arrival/departure and Admin shift start/end controls. Visible choices use 00–23 hours / 00–59 minutes. Original native time inputs, IDs, min/max/step validity and HH:mm API values are retained, with one delegated change event and explicit Croatian invalid-range feedback. Midnight and overnight 18:00–06:00 shifts retain existing validation. No API, permission, database or business-rule change. The new time module is included in index and public-shell precache r10.

An extended dark-theme correction audit exposed an inherited approval-table green-label contrast failure (foreground #356859 over #12332b, ratio2.13). Exact pre-change #265 content tree fabb3022ba7fd66e27c21aa69f395ac1a9e19780 reproduced the settled-color failure; it was not a theme animation. Focused dark approval status overrides now use existing semantic theme tokens for green/orange/red/gray. No accessibility rule was weakened.

PASS architecture (92 source files), lint, 172 frontend tests (0 skipped), build (63 files). PASS all 40 standalone Chromium desktop/mobile scenarios with en-US locale, including serious/critical WCAG A/AA checks in both themes for corrections and the overnight shift modal. Fresh desktop/mobile time screenshots inspected. Physical Safari/iPhone and actual backend/full-stack remain unverified locally.

The isolated combined #262–#265 preview also passes architecture (95 source files), lint, 184 frontend tests (0 skipped), build (70 files) and 48 desktop/mobile Chromium scenarios, including both themes and the new time checks. Combined cache uses r11 and retains all three month/date/time modules. This is local integration evidence, not GitHub merge/CI evidence. No main or published integration branch was changed.
