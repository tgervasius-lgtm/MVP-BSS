# Employee import and customer onboarding — UX proposal

Status: **PROPOSED / INTERACTIVE SYNTHETIC PREVIEW**, not H2-2 implemented, accepted UX, activated import or production onboarding.

Owner: #237. Baseline: protected `main` `be6e9835ac898aecf5b1c01728dd880c51fe044b`, refreshed on 2026-10-09. #262 is independently OPEN / DRAFT; this proposal does not stack on or change it. The last reported central versions are Board v179 / Map v58. Only attached snapshots were read in this cycle: **SOURCE_FRESHNESS_UNVERIFIED**, no synchronization claimed.

## Purpose and impact

Provide a concrete reviewable Croatian Admin flow while H2-1c2 HTTP/admission/monitored cleanup remains pending. Frozen Product Contract sections 11–12 and accepted D1/D2/D3 govern the proposal. Audience: customer Admin and UX reviewer. Impact: a standalone design-system page, fixture-only frontend presentation, documentation and tests. No changes to production application navigation, API/contract, workers, database, grants, authentication, authorization, persistence, infrastructure or hardware. No dependency added.

Open `/design-system/import-onboarding.html` after the normal build; the Design System header links to it. It is intentionally a design-review surface, not a role-protected production screen. All fixtures are synthetic; the displayed Admin role is an audience label, not authorization evidence. There is no file input, file reader, network/API call, storage, login reuse or reference to application state. Changes disappear on reload. The prototype does not resume real sessions or accept personal data.

## Review paths

| Path | Proposed result |
| --- | --- |
| CSV or XLSX sample | Staged processing view, then six explicit column bindings and existing active department/shift bindings |
| Incomplete or duplicated column selection | Continue remains disabled; no automatic defaults |
| Valid sample | Whole-batch preview, separate explicit checkbox, simulated result of 3 workers |
| Duplicate/invalid allowance | Original row numbers and readable fixes; whole batch blocked; remap or replace source |
| Cancel | Explicit confirmation, unavailable preview, restart from selection; does not undo committed workers |
| Expired preparation | No old values or approval; select a new source |
| Stale approval | Commit rejected, refresh review, fresh unchecked approval |
| Unknown commit outcome | Read existing result first; no button to create a new batch in that state |
| Onboarding | Sample company setup, sample import result, missing access/terminal/dry-run evidence, blocked readiness, no live approval |

The scenario selector and manual parsing-result button are review controls only and never belong in production UX. Validation/commit results are **scripted fixtures**, not frontend implementations of backend business validation. The only input checks are presentation completeness/unique selections and explicit approval. A later real UI must use authoritative server-normalized values/counts/errors/revision/result, never infer a successful commit from this controller.

## Future integration acceptance — still pending

- Admin-only registered UI against the proven authoritative API, including server-side role/tenant enforcement; no frontend permission claim here.
- Published active policy and approved data/backup notice before upload; true CSV delimiter selection, actual bounded file transfer, real parser/error handling and safe five-column optional-email handling.
- Map every actual source column and distinct department/shift value without a silent fallback; show active tenant references.
- Paginated complete preview with normalized values and all row errors, current counts/revision/checksum, original row numbers and stale-page recovery.
- Duplicate-in-tenant, inactive/missing/ambiguous reference, unsupported cell, disabled policy, capacity/429, timeout, lost session and unavailable/purged data copy.
- Exact revision-bound approval and idempotent commit; cancel/expire purges data; uncertain outcome uses GET/same-key read-back, never a new identity or blind retry.
- Durable resumable onboarding with server-owned profile, evaluated prerequisites, independent evidence, revalidation and separately authorized operator approval. No automatic certification by visiting or ticking UI.
- True successful result does not create access accounts/RFID assignments automatically; corrective worker operations are separate from reverting UI.

## Verification

PASS: frontend lint, production build and all 174 unit/regression tests; 40 desktop/mobile Chromium browser scenarios, including fixture flow and WCAG 2 A/AA serious/critical checks in both themes. Local Playwright uses an existing executable override; default packaged browser and PowerShell verification wrapper are unavailable. Visual screenshots cover desktop import errors and mobile import/onboarding. Mobile review uses labelled stacked rows so error text is visible without horizontal scrolling. After this visual refinement, all four focused desktop/mobile UX scenarios were rerun. Initial exact-label lookup was fixed with separate label/select markup. A theme-transition contrast measurement was corrected by waiting for the final computed background before scanning; no rule or color was weakened. Real PostgreSQL/full-stack, physical iPhone/Safari, API activation, deployment/privacy/backup and operational readiness remain outside this fixture-only scope. Existing CI image retrieval and main Sonar remediation belong to the central workstream; no retry, suppression or gate relaxation is part of this UX change.

## Recovery

Revert the focused frontend/design PR and remove its review link. No database migration or worker changes exist to undo. An eventual successful real import requires separate governed corrective operations; removing UI cannot reverse it.
