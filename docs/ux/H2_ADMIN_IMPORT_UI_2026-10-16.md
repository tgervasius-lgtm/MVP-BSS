# H2-2 Admin import UI — 16 October 2026

Status: **IMPLEMENTED FOR REVIEW / INACTIVE BY DEFAULT**. Owner: #237.
Source baseline: protected main `64a06b215cec864c9aaac7874a66d1fb2dd628f0` (merged H2-1c2 PR #273 and owner-approved Fastify 5.12.6 patch PR #274).
Product authority: frozen Product Contract sections 11–12 and accepted D1/D2/D3.
This is frontend behavior and test/documentation work. No backend contract, migration, runtime grant, production composition or activation changes.

## User flow and ownership

A logged-in tenant Admin opens **Radnici → Uvezi radnike** (`workerImports`).
Preview/demo and the other three customer roles have no entry or allowed screen.
The server independently reauthorizes every existing Admin-only import operation.

The actual API policy is loaded before file selection. Missing, unapproved,
disabled, malformed or unavailable policy fails closed, with explicit retry.
The page displays approved numeric limits and the server lifecycle notice.
The default server still supplies no import service and therefore exposes no
file picker. Existing sessions/results can be checked separately when new
ingestion is unavailable.

CSV delimiter is explicit. CSV and XLSX are sent as raw File bodies with the
correct MIME, policy version and one idempotency key; no JSON/base64/multipart.
The browser bounds size before reading and only hashes bytes for request identity.
It does not parse or validate worker business rules. The server remains the
authority for format, containment, normalized rows, uniqueness and references.

Every actual source column must have one distinct canonical field. Five-column
sources omit optional email; allowance never receives a hidden default.
Every distinct nonempty department/shift value needs an explicit active tenant
reference. Unsupported/empty values remain visible through server row errors.

All authorized preview pages are collected within the existing 1,000-row limit.
Revision, offsets, totals, mapping and headers must agree across pages. Every row
and diagnostic remains available; the UI pages by 100 and can show all error
rows with original source row numbers. Normalized values and changed source
values are shown together. No valid-row subset can be committed.

A current READY preview with no blockers offers a separate confirmation step.
It rereads the session/preview, then requires a new unchecked approval checkbox.
Approval binds session, revision and preview checksum. Remapping, reload, changed
revision, expiry or incomplete/stale pages invalidate it. Pending mutations
disable resubmission. Commit is a single API request for the complete batch.

## Recovery and private data

Network/5xx uncertainty never reports success or starts a fresh mutation identity.
Commit recovery GETs the original session/result. An explicit repeat is possible
only after fresh read-back confirms the same revision/checksum, and uses the
identical key/body/If-Match. A changed preview requires review and new approval.
Uncertain upload can inspect prior metadata; safe continuation repeats the identical
file/format/delimiter/policy/key. Cancel uses a separate confirmation and current
revision; uncertain mapping/cancel requires a fresh session read.

The server list restores sessions/results after reload or relogin. No uploaded
file, filename, source/canonical row, mapping or personal value is persisted in
browser storage, URLs, logs, service-worker caches or test recordings.
Session storage holds only a scoped pending request identity (random key,
session/revision/checksum or upload checksum/format/delimiter/policy).
If tab storage is unavailable, in-memory recovery and the server list remain;
no blind replay is performed. Identity/role changes abort scoped work and
discard private state; stale results cannot repaint another user's view.
Server 401/403 also clears a previously authorized private preview.
The service worker adds static assets only and retains its API-cache exclusion.

## Verification and limits

- Focused controller/transport tests cover disabled/denied policy, five-column
  mapping, complete pagination, last-row errors, stale/inconsistent previews,
  approval invalidation, double submission, lost response/exact retry,
  successful commit plus failed refresh, cancellation, identity change, safe
  rendering, oversized file rejection and raw upload through session refresh.
- `scripts/bss-verify.ps1 -Level Quick -Area Frontend` is the broader local gate.
  Full standalone desktop/mobile Playwright remains a separate gate.
- `NODE_ENV=test BSS_IMPORT_UI_SYNTHETIC_TEST=synthetic-ci-only BSS_TEST_DATABASE_URL=...`
  plus `node scripts/verify-import-ui.cjs` runs actual Chromium + HTTP + disposable
  PostgreSQL proof, keyboard/axe/light/dark, CSV/XLSX transport/mapping,
  later-page diagnostics, explicit approval, lost-response read-back,
  durable resume, cancellation/purge counts and denied roles.
- That helper is an isolated test composition, not a production feature toggle.
  It accepts exact known synthetic CSV/XLSX fixture bytes through a controlled
  parser adapter. Browser/HTTP/PostgreSQL orchestration is real; actual parser
  format/containment proof remains the independent mandatory Linux parser CI.
  No test fixture is imported by `backend/src/server.ts`.
- By default no browser trace/video/screenshot or credentials are saved by the proof. Optional local visual QA captures exact synthetic fixture screens only.
  No real customer data, target-environment readiness, physical iPhone/Safari,
  privacy/backup/restore clearance or independent human audit is claimed.
- Final executed command counts, failures and CI results belong in the PR receipt.

## Remaining scope and recovery

H2-3/4 resumable onboarding and operator identities remain open. H2 activation
still requires target-runtime, network-fault/containment/capacity/monitoring,
privacy/backup/restore/erasure and customer/independent go-live acceptance.
Complete #237 is OPEN. The older standalone synthetic UX proposal remains a
design-review surface and is not itself API or onboarding evidence.

A reviewed revert can remove this frontend slice. It cannot undo a committed
import or delete workers/history. Existing backend disable/drain/purge and
reviewed migration/forward-recovery rules remain authoritative. No rollback,
backend deployment, migration execution or activation is performed here.

## Preservation checkpoint — security dependency, 16 October 2026

This UI candidate is unpublished/unmerged and must resume from a patched main. Daily v77 introduced the Fastify dependency prerequisite after the initial v75 read. Official GHSA-389g-gv7q-r4x8 / CVE-2026-107832 is LOW and affects5.12.2 through5.12.5;5.12.6 is fixed. This does not prove an exploitable BSS route. A separate dependency-only patch is being prepared.

Executed local evidence:205/205 frontend tests PASS;15/15 HTTP/OpenAPI contracts PASS; lint/types/build and architecture99-source budget PASS; actual Chromium/HTTP/disposable-PG synthetic proof PASS at1440px and390px with controlled parser. Later mobile caption/hint/readability fixes still require their final visual/proof rerun. The full Windows PR frontend wrapper is NOT PASS:205 unit tests passed, but Admin/Manager30-second browser cases timed out; the suite was deliberately stopped at the security handoff. No timeout/gate changed and no baseline claim is made for those new browser failures.

The separate H2 worktree/branch preserves all code. There is no H2 commit on main, UI PR publication, backend deployment, activation or new model run.


## Resumed verification — 17 October 2026

PR #274 was owner-approved and squash merged as 64a06b215cec864c9aaac7874a66d1fb2dd628f0; its tree equals the reviewed 4b641881 head. This UI branch was rebased onto that protected main. The original b9fc868f WIP remains on a local preservation branch. Backend dependencies now resolve to the verified 5.12.6 set; no runtime composition or activation changed.

The combined real HTTP disconnect test now waits for actual admission and completed release, retaining its lease-null, empty staging and successful next-upload assertions and adding exactly-one-release evidence. Its old initial-null polling could finish before admission; a controlled external probe reproduced that observation race on both Fastify versions. The separate gated disconnect-during-admission test remains unchanged. No timeout or security gate was relaxed.

Earlier Windows browser failures remain recorded above. Their traces stopped during ordinary demo navigation/layout operations, including requests/shared-leave screens, rather than the authenticated import flow. The unchanged-main two-case comparison passed; this does not establish the precise cause of the first failures. Fresh focused, full-wrapper and CI evidence follows in the PR receipt.
