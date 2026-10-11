# Design audit fixes — 09.10.2026.

Scope: frontend presentation and synthetic demonstration consistency. Baseline: protected main `be6e9835ac898aecf5b1c01728dd880c51fe044b`. Affected roles: administrator, manager, worker and accountant.

## Acceptance criteria

- Month controls display Croatian names and a year regardless of browser locale; filters and upload payloads retain ISO `YYYY-MM`. Optional document periods can be cleared. Changing month/year triggers existing handlers, including the worker's immediate month refresh.
- The synthetic scenario has one clearly labelled reference date, 10.07.2026., matching its attendance fixtures. API hydration continues to supply the organization-timezone date/time. Demo documents use the same reference month.
- Worker home displays available leave after pending reservations, matching the existing leave summary. No new balance calculation is introduced.
- Terminal headings/status and report boundary labels use semantic text tokens in light and dark themes.
- Primary request and daily attendance actions stay visible in horizontal table regions; keyboard navigation and existing decision dialogs remain available.
- Login/status copy distinguishes synthetic demo data. The displayed role matrix matches accepted role scope; it is explanatory copy, not an authorization mechanism.
- Shared-calendar detail list explicitly describes its annual scope in both demo and API sessions. Rejection is labelled as rejection; technical copy is simplified where touched. API report loading, empty, error, summary and export-verification messages use Croatian user-facing wording; checksums, dataset/version identifiers and verification logic remain unchanged.

## Implementation boundary

The change preserves the accepted white/grey design, existing screens, business rules, endpoints, payload formats, permissions, tenant isolation and deployment controls. It does not implement import/onboarding or locked-report-version selection.

Native day/date and time popovers may follow the browser/OS language. This change guarantees Croatian names for app-rendered calendars and the replacement month-period controls; it does not claim control of system-owned date popovers.

## Validation

Frontend unit regressions cover localized period selection, years outside the demo year, clearing an optional period and consistent available leave/demo dates. Browser regressions cover the worker month refresh, real mocked document upload payload, visible decision buttons and axe checks for terminal light/dark themes, on desktop and mobile Chromium profiles. Test screenshots are local browser-profile evidence, not physical-phone or production proof.

The PowerShell verification wrapper is unavailable in this Linux environment. Equivalent frontend npm checks are used; required GitHub checks remain the merge gate. No merge or deployment is authorized by this document.

### Architecture-budget follow-up — 10.10.2026.

The targeted rerun of quality run `37993579694` passed PostgreSQL initialization but exposed an architecture-budget failure: `app.js` had 2118 lines against its frozen limit of 2105. The month-period enhancer is now a dedicated `src/views/month-picker.js` module, loaded before the app and included in the public-shell precache (cache revision r8). The app passes its current reference date at both render and modal call sites; ISO values, Croatian labels, validation and existing change handlers are preserved. No gate or budget is relaxed.

Local validation on Node 24.19.0: architecture guard PASS (91 source files; app.js 2087 lines), frontend lint PASS, all 173 unit/regression tests PASS, and build PASS. A new regression verifies the current reference year, invalid-year clearing, zero-padded years and single event delivery after repeated enhancement. Existing regressions cover worker refresh and optional document periods. Clean current-main architecture baseline also passes.

Local Chromium E2E is UNAVAILABLE: Playwright's browser installation returned an invalid/truncated ZIP and no existing Chromium executable was found in the checked locations. No browser scenario is claimed PASS for this follow-up. Local full-stack/PostgreSQL and the PowerShell wrapper are UNAVAILABLE; GitHub required quality/security/browser checks must supply fresh evidence on the new head before merge. Physical Safari/iPhone review remains separate.

## Recovery and remaining evidence

Revert this frontend commit/PR to restore the previous presentation. No data migration or database rollback is needed. Production/API readiness, full-stack PostgreSQL evidence, real Safari/iPhone review and deployment verification remain separate gates. Changes to authentication, role enforcement, hardware and Sonar findings belong to the main workstream.
