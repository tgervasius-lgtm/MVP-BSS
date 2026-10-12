# Date picker state review — 2026-10-11

Status: IMPLEMENTED LOCALLY / DRAFT REVIEW CANDIDATE; merge belongs to the main coordination chat. Baseline: protected main e1f5b0133e1b57e0022117e5c509ea7dd8bef714, re-read from GitHub before publication. Sources: current central Board v219 / Map v62, current merged design system and prior UI integration evidence. This is not source synchronization or a product-readiness claim.

## Problem and scope

The Croatian daily date picker retained a stale validation message after an external valid replacement, and retained its old visible day/month/year after an external clear. It also failed to preserve initially disabled/read-only source fields. Two new unit regressions fail against the unchanged main component; both pass with this fix.

Affected screens: correction date, leave request date range and administrator non-working-day dialogs. The external-change/locked-field regressions protect component behavior; this review does not claim every current screen already triggers those edge cases. No API, backend, authorization, tenant scope, attendance persistence, migration or import/report activation change.

## Acceptance

- External ISO replacement or clearing accompanied by change refreshes all visible date parts and removes the prior choice's stale error.
- An invalid user selection remains visible for correction; its internally delegated change does not clear it or its error.
- All date parts expose the invalid state; initially disabled/read-only inputs produce disabled replacement controls.
- Existing leap-day, range and single-change-event checks remain intact.
- Cache revision increments r11 to r12 to deliver the updated cached module. Existing cache gates are retained.

## Evidence

PASS: architecture budget (95 source files), frontend lint, all 186 unit tests (0 skipped), frontend build and git diff whitespace checks. Two new unit regressions first reproduced baseline failures. PASS: four focused Chromium browser scenarios (desktop/mobile), covering original Croatian-date behavior plus stale error, external clear, recovery, responsive width and serious axe checks. The broader local 50-scenario invocation produced only partial progress output and no final summary; it is NOT recorded as PASS. Required GitHub checks must provide fresh complete browser/full-stack evidence on the published head. Linux cannot run the PowerShell wrapper; equivalent npm checks are recorded explicitly.

Desktop leave-form screenshot inspected locally: readable Croatian controls, existing visual layout preserved. Physical iPhone/Safari and deployed-app behavior are not verified. Synthetic screenshots are review-only local output and excluded from the commit.

## Recovery and remaining work

Rollback: focused revert of the date-picker change with a monotonic cache revision for subsequent delivery. No database rollback required. Main security/Sonar review and PR267 remain in the main chat; no Sonar classifications, merge or deploy are authorized here. Accepted synthetic import/onboarding and locked-report previews still require separate functional integration. This review adds no new MVP feature and does not reopen completed UI PRs.
