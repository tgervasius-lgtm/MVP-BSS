# Explicit report version selection — UX proposal

Status: ACCEPTED UX / SYNTHETIC PREVIEW, not integrated. Owner accepted the displayed desktop/mobile UX on 2026-10-10 (Europe/Warsaw) and authorized preparation of its draft PR. Independent branch from refreshed main be6e983. Acceptance covers this interaction design only; no merge, deployment or live export activation is authorized.

Audience: authorized report users (Admin, Manager, Accountant). Existing role/data scope remains server-owned; this public design-review surface provides no authorization evidence.

Purpose: distinguish current data from an explicitly selected immutable monthly dataset. No production files, API, DB, permissions or export logic changed. Review surface: /design-system/report-versions.html. Scenario/date/version fixtures are synthetic; no network, storage or file generation.

Accepted UX criteria:
- Current source is clearly labelled as not locked. Choosing locked source requires a fresh explicit selection, with no silent default.
- Version choices show lock date/time and distinguish earlier and newest versions. Friendly version numbering and descriptions are proposed presentation metadata, not currently promised API fields.
- Empty/error/unavailable version blocks locked export and never silently switches source. A user may explicitly choose current data.
- Confirmation repeats source, period, report type, department scope and format. Editing selections invalidates the displayed confirmation.
- Current report preview is never represented as content of the selected saved version. Prototype shows no invented preview rows.
- History should preserve the selected source/version, with existing independent verification shown separately from mere creation or download.

Integration dependencies: OpenAPI ReportExportWrite accepts periodVersionId; saved full month must match requested period. ReportPreviewWrite does not expose a saved-version selector. AttendancePeriod exposes datasetVersion; these identifiers must not be assumed interchangeable. A tenant-scoped authorized source of actual periodVersionId/version metadata must be established before implementation. No endpoint or backend expansion invented in this design step. Exact role/scope, error, checksum and concurrency handling require separate contract review.

Rollback: remove the standalone HTML, CSS, JS and this proposal. No exported data or database changes to reverse.

Central source freshness: current central Board v188 and Map v58 read on 2026-10-10 (Europe/Warsaw). Current main and repository Control Board independently read; the explicit report-version-selection integration gap remains open. Snapshot copies are not automatic synchronization.

## Local evidence

PASS lint, production build, 169 frontend unit/regression tests (0 skipped), and both focused desktop/mobile Chromium browser scenarios (0 retries/skips), repeated successfully on 2026-10-10 (Europe/Warsaw). Browser checks cover explicit selection, earlier version confirmation, invalidation after format edits, unavailable/empty/error blocking without fallback, both-theme serious/critical WCAG A/AA checks and viewport overflow. Desktop 1440px and mobile 390px screenshots inspected in the original preparation. The repeated browser run initially failed before tests due to the temporary runner's working directory; corrected runner configuration passed. No gate/rule change. GitHub CI is pending publication; real backend/version retrieval, full-stack export verification and physical Safari/iPhone were not run.
