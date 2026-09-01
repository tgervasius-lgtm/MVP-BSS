# ADR-002: Terminal event-time lifecycle integrity

Status: ACCEPTED / MERGED / AUDIT A SOFTWARE EVIDENCE PROVEN
Date: 2026-08-16
Issue: #144
Risk class: BLACK / GATE

## Context

The current delayed terminal ingestion path checks mutable worker and RFID status when an offline batch reaches the cloud. A terminal can therefore durably acknowledge a valid attendance event and later have that fact rejected after an administrator changes the worker, RFID card or shift before reconnect.

The accepted terminal contract requires zero lost USER_ACKNOWLEDGED attendance and zero incorrect duplicates. It also requires genuinely post-revocation events, forged evidence, unauthorized devices and cross-tenant submissions to remain rejected.

## Decision

1. The terminal first durably commits each individual event locally, including its immutable event ID and monotonic sequence, and only after that commit creates the acknowledgement receipt. Server verification cannot by itself prove terminal storage behavior; #132 physical/terminal evidence remains separate.
2. A terminal event carries `acknowledgedAt`, `acknowledgementKeyId`, `acknowledgementKeyVersion`, `clockStatus` and `acknowledgementSignature`. `BSS-TERMINAL-ACK-V2` is HMAC-SHA-256 with a `BSS-TERMINAL-ACK-KEY-V1` domain-separated key derived from the device credential, terminal ID and acknowledgement key identity/version. The exact canonical order is documented in OpenAPI and contains no plaintext secret.
3. Acknowledgement must not precede occurrence. The outer batch remains independently device-signed, fresh and nonce-protected. HMAC proves key use, not human perception or correct/uncompromised clocks; uncertain or implausible clock evidence fails closed to `reconciliation_required`.
4. Worker status is versioned in effective intervals. RFID validity uses its existing `valid_from`/`valid_to` interval. Worker status, RFID, shift assignment/configuration and timezone must cover occurrence through acknowledgement.
5. A proven pre-change acknowledgement may derive authoritative attendance after reconnect even when current mutable state is blocked or reassigned. An event acknowledged at or after the relevant blocked/revoked boundary is rejected.
6. Historical receipt verification selects the persisted device-specific acknowledgement key ID/version and accepts its pre-rotation validity interval. Normal rotation retains encrypted historical credentials for verification and does not invalidate earlier receipts. At/after the credential revocation or compromise boundary, the key cannot authorize new attendance.
7. Missing or ambiguous authoritative history becomes `reconciliation_required`. Reconciliation is an explicit Administrator-only server action recorded append-only with reason, actor, before/after and provenance. It never rewrites raw receipt evidence; only an explicit accepted resolution may produce or supersede derived attendance.
8. `(terminal_id, device_event_id)` remains the idempotency identity. A SHA-256 payload fingerprint returns `duplicate` only for the same immutable evidence; reuse with changed evidence returns `EVENT_IDENTITY_MISMATCH` and cannot create another business event.
9. Pre-migration history is never guessed and never receives fabricated HMAC evidence. Legacy rows carry explicit UNKNOWN / unavailable-evidence markers and require reconciliation whenever DEC-025 proof is required. Admins retain tenant-wide timeline visibility; managers remain limited to the immutable event-effective department.

## Canonical receipt and key derivation

After the event ID and sequence are durably committed, the terminal derives the 32-byte acknowledgement key as `HMAC-SHA-256(deviceCredential, keyContext)`, where `keyContext` is the UTF-8 newline-joined value:

```text
BSS-TERMINAL-ACK-KEY-V1
terminalId
acknowledgementKeyId
acknowledgementKeyVersion
```

The lowercase hexadecimal `acknowledgementSignature` is `HMAC-SHA-256(derivedAcknowledgementKey, canonicalReceipt)`. `canonicalReceipt` is the UTF-8 newline-joined value below; integer values use base 10, the card hash is lowercase, and both timestamps are exactly the strings carried by the signed event payload:

```text
BSS-TERMINAL-ACK-V2
terminalId
acknowledgementKeyId
acknowledgementKeyVersion
deviceEventId
sequence
occurredAt
eventType
cardUidHash
deviceClockOffsetSeconds
clockStatus
acknowledgedAt
```

The immutable retry fingerprint is `SHA-256(canonicalReceipt + "\n" + acknowledgementSignature)`. The typed UUID, integer, date-time, enum and fixed-hex fields cannot contain newline separators. HMAC authenticates the terminal assertions; it does not independently prove durable media behavior, human perception or clock correctness.

## Alternatives considered

- Keep sync-time status validation: rejected because it can erase a previously acknowledged business fact.
- Trust only `occurredAt`: rejected because it does not prove that durable positive acknowledgement preceded a lifecycle boundary.
- Accept every signed backdated event: rejected because it weakens revocation and makes post-revocation backdating authoritative.
- Rewrite raw history after lifecycle changes: rejected because raw evidence and audit must remain append-only.
- Guess pre-migration lifecycle intervals: rejected because mutable current state cannot reconstruct historical truth safely.

## Consequences

- The terminal v1 event payload gains required acknowledgement key, clock-health and receipt fields and OpenAPI moves to 1.3.0 before Product Contract freeze.
- Existing pre-migration worker history is authoritative only from migration time; an older delayed event without complete evidence routes to reconciliation.
- Device credentials remain encrypted at rest. Event/audit/read models contain only acknowledgement key identity/version and proof, never plaintext device or derived acknowledgement secrets.
- Secure-element storage remains compatible future #132 work and is not required for software MVP conformance.

## Migration and recovery

Migration `011_terminal_event_lifecycle_integrity` is additive: it introduces worker status history and immutable acknowledgement, fingerprint and lifecycle-evidence columns. Existing rows receive explicit legacy evidence markers and are not rewritten as accepted history.

If the application must be recovered after new evidence is written, pause terminal ingestion, retain migration 011 and its raw evidence, and deploy a corrected forward version. The down migration refuses to remove acknowledgement or reconciliation evidence. Database rollback must never delete USER_ACKNOWLEDGED attendance evidence.

## Required approval evidence

- PostgreSQL-backed deactivate/reactivate, RFID revoke/replace and shift reassignment races.
- Duplicate, concurrent retry/restart, out-of-order and reused-ID mismatch evidence.
- Normal key rotation, suspected-compromise/revocation boundary, historical receipt and forged/cross-tenant negative tests.
- Trusted/uncertain clock assertions, Administrator-only accepted/rejected reconciliation, legacy UNKNOWN treatment, RLS and append-only raw/audit evidence.
- Applicable Backend, Database and Security PR verification and targeted AUDIT A recheck.

DEC-025 is merged through PR #150 and the targeted AUDIT A software/PostgreSQL evidence passed on `b904eca`. This does not prove the terminal's physical durable write, feedback, power-loss recovery, deployment, Pilot or production behavior; those remain #132/AUDIT C evidence.
