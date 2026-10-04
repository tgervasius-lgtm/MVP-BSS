# Terminal UI #234 — reconciliation candidate

Baseline: `9ac82a4b2764110f879343bdad1e2e4aeb0d01c8`.
Status: implementation candidate, owner review required. Related issue #234; hardware #132 remains separate.

The sync-event response now includes `reconciliation`, an Admin-only nullable summary (`resolution`, `attendanceDayId`, `createdAt`) from the existing immutable resolution. Manager responses always contain null and retain their existing event-effective department scope. No free-text reason or actor identity is added to this read surface. Both the original delivery and duplicate deliveries reference the same raw receipt and final decision. No migration or mutation semantic change is required.

The terminal adapter retains receipt identity, stable status and available evidence. The Admin detail refreshes authoritative state before offering a decision; old servers without the summary property fail closed. A trimmed reason and explicit confirmation are required. A lost response triggers read-back, never an automatic mutation retry. Original delivery status remains visible after resolution. Server DEC-025, historical configuration, clock, period lock, idempotency and audit rules remain authoritative.

## Verification boundary

Frontend tests cover raw-ID routing, role restrictions, confirmation/validation, competing decision, duplicate submission and lost-response read-back. The browser test uses synthetic data only to verify actual delegated actions, keyboard focus, Escape and accessibility; it is not PostgreSQL evidence.

Real PostgreSQL integration assertions cover unresolved/resolved read-back, both duplicate deliveries, manager redaction, tenant rejection, raw immutability and same/different decision replay. They run in the existing required backend-quality workflow with an explicit disposable test database. Local PostgreSQL and PowerShell wrappers were unavailable in the Work environment; direct npm commands are recorded in the PR. CI results must be read before any merge recommendation.

## Recovery and readiness

Reverting this UI/read projection does not undo immutable resolutions. Preserve raw/audit/resolution rows and stop new actions during recovery; use the approved attendance recovery process. This change does not authorize deployment or live decisions and does not establish staging, physical 9C, Pilot or production readiness. Credential rotation is a separate PR within #234.
