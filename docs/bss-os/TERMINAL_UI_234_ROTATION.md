# Terminal UI #234 — credential rotation candidate

Baseline: `9ac82a4b2764110f879343bdad1e2e4aeb0d01c8`; short-lived stacked dependency on PR #235, explicitly recorded in issue #234.
Status: implementation candidate, owner review required. Reconciliation is covered separately by PR #235. This candidate alone does not close #234.

Only Admin can start a rotation for an online/offline terminal with a valid revision. The modal refreshes the terminal before confirmation, distinguishes normal rotation from suspected compromise, and resets confirmation when the reason changes. The POST uses the captured If-Match and explicitly disables session replay. The server remains the role, revision, cryptographic lifecycle and audit authority.

The one-time credential is held in a module closure and a readonly password input. It is not placed in global application state, storage, URLs, log messages or HTML attributes. Reveal/copy require explicit action. Opening another modal, rendering/navigation, close, logout and pagehide clear references and the input value. This is reference cleanup, not a claim of guaranteed JavaScript memory erasure. A delayed response after dismissal is discarded and never reopens the credential. Clipboard lifetime is controlled by the user after explicit copy.

No automatic device installation is implied. An unknown response can mean the rotation committed; the UI refreshes state, reports uncertainty and does not retry. A lost credential cannot be retrieved: recovery is a newly reviewed and explicitly confirmed rotation through the approved provisioning process. Stale revision also requires a fresh review and confirmation.

## Verification

Focused frontend tests cover both reasons, revision header, explicit confirmation, duplicate submission, role/revoked guards, lost response, late response after dismissal, malformed response, secret cleanup, reveal/copy and action registration. Existing PostgreSQL lifecycle coverage is extended with unauthorized roles, stale revision, compromise closure/revocation, post-boundary rejection, revoked-terminal rejection and secret-free audit assertions.

A desktop full-stack browser test creates a disposable terminal through the test API, rotates through the UI and checks masking/cleanup/reload using boolean assertions. Trace/video/screenshots are disabled for that test. The shared single-terminal E2E tenant runs the mutation once in the existing desktop scenario; the mobile scenario verifies reconciliation layout/keyboard/accessibility. No additional login is added and no rate-limit gate is weakened. Local PostgreSQL/browser runtime is unavailable; the required CI provides those results before review.

## Recovery and readiness

Reverting UI code cannot undo a committed rotation. Preserve encrypted key history and audit; recover with the approved secure credential transfer/rotation process. No mutation is executed against a real customer or hardware terminal by this implementation task. Staging, hardware 9C, Pilot and production claims remain outside this package.

## Existing API response cleanup discovered by the browser test

The required reload check exposed an unfinished `/auth/refresh` response with HTTP 401 already received. `src/adapters/api.js` was byte-identical to main when a new focused regression reproduced that failed refresh bodies were never consumed. The adapter now drains the failed response body, preserves the original authorization failure and never replays the protected request after a failed refresh. No refresh policy, token lifecycle, RBAC, rate limit or server behavior is changed. The browser test continues to assert that API requests finish and reports any failed request; it does not ignore navigation aborts.
