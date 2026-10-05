# Partner UX review: attendance pairing and correction replies

Date: 2026-10-05. Issue: #252. Baseline: 37fbefd2829f17416ba69336741d870e7436e8d7.
Owner authorized implementation of feedback items 2 and 4 only.

## Behavior

Admin home replaces separate latest arrivals/departures with six derived attendance
records. Each row keeps the same worker and work date; an unfinished day has no invented
checkout. A checkout earlier on the clock is labeled next day for an overnight shift.
The full attendance screen and raw terminal event history remain the detailed sources.

Correction requests show returned decision note and decision time in the worker's own
scoped list. Submission explains where to find the reply. The refresh button reads the
current API state; it is not a push/email notification or a read receipt.
Admin/scoped Manager review original/requested values in a decision dialog. Rejection
requires 2–1000 characters; approval may include an optional note. The actual entered
note is sent to the existing endpoint with the existing revision header. Pending,
approved, rejected and cancelled states remain distinct; backend audit/RBAC/revision
checks remain authoritative. Legacy decisions without notes have an explicit fallback.

## Verification and recovery

Regression tests cover date isolation, overnight checkout, own-worker privacy, escaped
reply text, required rejection note, repeated decision prevention and the real API
adapter's note/revision payload. Browser tests exercise the dialog and worker reply on
desktop/mobile with axe checks. Repository CI provides standard browser/full-stack
regression evidence before review. Revert this frontend PR to recover; no database,
OpenAPI, backend runtime, scope or persistent product preference changes are included.

## Separate proposals

Palette families/light-dark comparisons are review artifacts only; no production token
changes are authorized. Contextual help and an overview of existing request outcomes
need a focused UX specification. Corporate announcements/read acknowledgements and
secure payslip document delivery are new product/data workflows requiring separate
scope decisions. Payroll calculation is not part of the document-delivery proposal.
