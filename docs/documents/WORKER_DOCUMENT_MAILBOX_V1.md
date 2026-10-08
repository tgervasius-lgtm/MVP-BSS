# Worker document mailbox v1 — issue #256

Status: core MERGED (#257); PDF policy extension IMPLEMENTED FOR REVIEW (#259) / DISABLED BY DEFAULT / NOT DEPLOYED.
Owner authorized the first mailbox implementation on 2026-10-06. Base: `98c4a44e59e02dfac29de246ddf0bbe4c1067680`. Merge and deployment remain separate decisions. Payroll calculation is explicitly deferred by the owner.

## User-facing contract

- Admin/accountant selects one active worker by name and stable employee code, uploads a finished PDF (maximum 5 MiB), and saves a draft. Payslips require a month; contracts/other documents may omit it.
- Draft review displays the exact recipient and permits downloading the original before explicit publication. Recipient/content/title/category/month are immutable: mistakes require withdrawal and a new draft.
- Worker sees only their own published documents, with category/month filters, paginated archive and direct PDF download using the existing BSS session. No additional document password or artificial password rotation is introduced.
- Manager has no mailbox role. Accounting receives a dedicated minimal recipient lookup, not access to worker administration, raw attendance or arbitrary personal fields.
- Withdrawn documents cannot be downloaded, including by the uploader. Already downloaded copies and downloads authorized before withdrawal cannot be recalled. An administrator can still see withdrawn metadata.
- This is in-product document delivery. No email account, workflow email, SMS/push, worker uploads, bulk PDF splitting, signatures, legal receipt or reading confirmation is implemented.
- Preview uses synthetic metadata only; no upload field or real PDF is available in demo mode. API errors/disabled state never fall back to demo content.

## Architecture and boundaries

Dedicated `backend/src/documents` module; no growth of PgMvpService/PgPhaseAService. Seven additive operations are specified in OpenAPI 1.5. `src/views/documents.js` owns UI state in memory. Login identity changes invalidate late responses, logout clears state, and file form closure clears transient payload references. No business documents are saved to localStorage, IndexedDB or the service-worker cache. All API responses are no-store/private; PDFs are attachments with nosniff, no public object URLs and no inline PDF embedding.

The first implementation stores bounded AES-256-GCM encrypted PDF bytes in PostgreSQL together with metadata. This is a reviewable initial storage choice, not approval of production sizing. AAD binds bytes to organization and document ID; random 96-bit nonce, authentication tag and key ID are stored. The independent environment keyring retains old decryption keys; active key changes affect new uploads only. Sensitive content is not included in application/audit logs. Human titles/names/months are metadata and remain readable to the database operator; application encryption does not conceal metadata or replace least-privilege DB access.

Advantages: atomic document/metadata/audit persistence and one restore boundary for the first small deployment, with no new paid storage provider. Limitations: database/backup growth, key recovery ownership, application memory while uploading/downloading, and the need for a local scanner. Default quota is 250 MiB per organization, configurable from 5 MiB to 1 GiB, with at most 10000 retained documents including drafts/withdrawn records. There are at most two simultaneous HTTP uploads per API instance. Larger deployments should review encrypted object storage in a separate ADR before raising limits; measure capacity and restore time first.

Migration 014 creates FORCE RLS policies that re-check the active database user, tenant, role and worker binding. Worker SELECT is restricted to own published records; only admin/accountant INSERT/UPDATE is allowed. Composite FKs prevent cross-tenant recipients/uploaders; no DELETE policy or automatic grants. Immutable-content trigger plus revision checking protects transitions. Per-tenant upload lock serializes quota/idempotency; per-document advisory locks serialize download authorization with withdrawal. Upload UUID is scoped to organization/uploader; exact retries return the same record, changed data conflicts. Publication/withdrawal have no automatic network or session replay.

Audit actions: `document.uploaded`, `document.published`, `document.withdrawn`, `document.download_issued`. Audit stores identifiers/action/request correlation only, not file contents, filenames, titles or salary amounts. `download_issued` means the server authorized bytes, not that the user received, read or legally accepted them.

## Validation and scanner

Owner accepted rejection of embedded-file PDFs on 2026-10-08. See [PDF acceptance policy](PDF_ACCEPTANCE_POLICY.md) for qpdf 12.4.2 runtime prerequisites, limits, privacy and regression evidence. New uploads and exact retries undergo mandatory structural inspection before any database lookup; embedded/associated files, attachment annotations and portfolios are rejected. Password/encryption, parse warnings/errors and inspection failures cannot pass. Original PDF bytes are never rewritten; text, images and multiple pages remain allowed.

Base64 is canonical and bounded; a PDF header/EOF check rejects obvious wrong types. A conservative `/Encrypt` rejection catches ordinary password-protected PDFs and is supplemented by the mandatory independent qpdf inspection. Every new payload must receive the exact clean ClamAV INSTREAM response before persistence. Timeout, socket failure, size-limit/error/malformed response or FOUND fails closed; raw scanner output is not exposed or logged. The native adapter uses only an operator-configured local Unix socket, never a user-controlled remote destination. Inactive/missing config produces 503 rather than bypassing scanning or encryption.

Before activation, configure and verify supported ClamAV with current signatures, ScanPDF, encrypted-document detection (`AlertEncrypted`/PDF equivalent), and scanning/recursion/stream limits covering the full permitted PDF. Alert on exceeded scan limits. Validate encrypted/obfuscated PDFs, malformed/polyglot files, EICAR and clean representative PDFs with the actual engine. Local protocol fixtures only verify transport/fail-closed handling; they do not establish malware-detection effectiveness. Engine/signature health, Unix socket permissions and deployment compatibility must be operationally monitored. Do not send payroll PDFs to public scanning services.

## Configuration / activation gates

Provider-neutral execution checklist and restore evidence requirements: [Mailbox staging verification](MAILBOX_STAGING_VERIFICATION.md). Preparation is not execution or activation approval.

`DOCUMENTS_ENABLED` defaults to false. An enabled process must have all of:

- `DOCUMENTS_KEYS_JSON`: secret-store JSON map of key IDs to independent random 32-byte base64 keys (no committed values).
- `DOCUMENTS_ACTIVE_KEY_ID`: ID present in that keyring.
- `DOCUMENTS_CLAMD_SOCKET`: absolute local Unix socket path. Existing generic Render Node hosting is not evidence that this daemon/socket exists; deployment packaging remains required.
- Optional `DOCUMENTS_QUOTA_BYTES`, within the bounded range above.
- Migration 014 applied and least-privilege grants reviewed: SELECT on users/workers/worker_documents for the existing runtime context, INSERT on worker_documents/audit_events, UPDATE on worker_documents; no DELETE on documents. Recipient `FOR SHARE` also needs the existing worker UPDATE privilege (or column-scoped `UPDATE(id)`); it does not mutate workers. Existing auth/RLS setup remains authoritative.

Before real employee data: approve document retention/destruction/access-after-employment policy and lawful delivery/privacy arrangements; validate actual scanner and key handling; prove encrypted backup+key restore; capacity-test upload concurrency/quota/download; prove worker/tenant isolation and session revocation in staging. Those are explicit activation blockers, not green-CI claims. There is no speculative retention deletion job in this change. Existing production/Pilot readiness gates continue to apply.

## Verification and recovery

Focused tests cover PDF bounds, encryption/AAD/tampering/old-key support, config rejection, scanner framing/failure/timeout, auth/role/origin/revision contracts, PostgreSQL RLS/lifecycle/quota/concurrency/idempotency/encrypted storage/audit/migration boundaries, UI privacy/lifecycle, and desktop/mobile/axe flows. Browser API fixtures are explicitly UI/adapter evidence; CI's disposable PostgreSQL tests provide storage/RLS evidence. The existing full-stack regression remains required.

This Work environment cannot run the PowerShell wrapper, PostgreSQL or Unix sockets (`EPERM` on a minimal Node socket probe). Equivalent available npm checks run locally; CI must provide the unavailable PostgreSQL/socket evidence. No unavailable test is counted as PASS.

The first PR CI run verified 72 backend unit/contract tests and 20 PostgreSQL integration tests without skips, including the mailbox and scanner transport fixtures. A separate dependency gate found GHSA-68fv-2mgg-jv7q in existing development-only `source-map-js@1.2.1`; `npm audit --json` reproduced it on clean main `98c4a44`. The lockfile receives the upstream 1.2.2 patch within the existing semver range; no new dependency, license change or gate suppression is introduced. Final evidence remains the checks on the latest PR head.

Runtime rollback: set DOCUMENTS_ENABLED=false through the normal reviewed release path, revert application code if needed, preserve schema/bytes/keyring and backups. Migration down is allowed only when worker_documents is empty and outside production under the existing migration guard. A nonempty mailbox refuses down migration. Never delete decryption keys while matching records/backups exist. Retention erasure and crypto re-encryption are future explicitly reviewed work.

## Recorded related decisions

Current white/grey theme remains the owner's first choice. Gallery shortlist: 1, 6, 7, 13, 14, 16, 17. This mailbox uses existing tokens; no palette decision/application is included. Worker-to-company uploads remain deferred pending a separate recipient/processing/access decision.
