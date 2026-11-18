# D3 internal authority draft — 18 November 2026

## Status and scope

**ACCEPTED FOR INACTIVE DRAFT / IMPLEMENTED FOR REVIEW.** Tomislav approved contract v0.3 in BSS OS on 18 November 2026. This isolated candidate starts from main `44c3958d38d6b6c276bbaf26267c2fb294c8183a` and belongs to existing #95/#59/#62 and #237 D3. It is separate from annual-leave PR #308.

The draft implements a dedicated internal Fastify composition, signed OIDC Code + PKCE verification and a private PostgreSQL authority registry. The standard BSS server never imports or registers it. No real identities, grants, listeners, provider destination, business effect or runtime activation are configured. Merge, deployment, actual access changes and costs require their separate decisions.

The [separate API contract](../../openapi/bss-internal-authority-draft.yaml) does not change public API semantics or the frontend screen map. This module is a trusted server library, not a client-supplied principal or arbitrary effect executor.

## Data and permissions

The explicit draft migration 022 under `backend/internal-authority-migrations` creates nine private `bss_internal` tables with FORCE RLS and no PUBLIC schema/table access. It contains no seed identities, secrets or grants. Number 021 belongs to separate PR #308. The ordinary migration runner does not scan this directory. The private migration is an explicitly applied draft with database CREATE/schema ownership prerequisites; standard BSS upgrades do not apply it.

The optional `backend/deploy/internal-authority-draft-grants.sql` must be reviewed and explicitly applied to a separate non-owner, non-superuser, non-BYPASSRLS role. Standard runtime grants do not include it. Only required reads, inserts and selected updates are granted. Security fields on grants and targets, historical receipts and audit cannot be rewritten by that runtime. Marker-column UPDATE privileges support PostgreSQL row locking without authority administration privileges.

| Record | Binding |
|---|---|
| Person and identities | Server-registered issuer + subject → stable person UUID; aliases preserve independence |
| Grant | Exact person, action, environment, profile, target, validity interval, monotonically increasing revision |
| Target | Exact scope, revision, configuration/evidence hashes, release identity, preparer person IDs |
| Session | Hashed opaque cookie and CSRF token, exact registered identity, expiry and revocation |
| Flow | Hashed state/cookie, unique nonce, encrypted PKCE verifier, expiry and session/operation binding |
| Operation | Server UUID, original session/person/grant revision, canonical payload fingerprint and target hash |
| Receipt and audit | One row each per operation, original author/revision, result and immutable attribution |

Global private identity/grant lookup is protected by schema privileges and the dedicated service boundary. Per-session, flow, target and operation RLS provides additional context isolation. Internal database credentials remain trusted service credentials, never customer credentials. No secret or identity registry content belongs in public evidence.

## Authentication and freshness

Configure a pinned issuer/client, authorization/token/JWKS endpoints and exact callback. HTTPS is required except explicitly isolated loopback. The public PKCE client matches the prior isolated provider proof; confidential-client configuration is not supplied here. Every exchange checks RS256 signature, a unique matching RSA signing key of at least 2048 bits, issuer, audience, authorized party when present, nonce and time claims. JWKS is read on each exchange, so a valid key rotation needs no process restart. Redirect following is disabled; provider responses and requests are bounded and timed out.

`max_age=0` is requested. Verified `auth_time` must be at or after the persisted flow start, within the configured confirmation interval, with the configured verified passkey method in `amr`. The deployed provider flow must enforce user verification; an AMR string alone does not configure WebAuthn policy. A virtual authenticator is not evidence of physical-key readiness.

The browser receives only a Secure HttpOnly opaque session cookie and a CSRF token. Session cookie SameSite is Strict; the cross-provider flow cookie is Lax, one-use and session-bound. Mutations require exact Origin and CSRF. Callback request logging is disabled and every response is no-store/no-referrer. Automatic HEAD callback routes are disabled. Provider codes/tokens and plaintext PKCE secrets are never persisted or logged; verifier encryption uses an explicitly supplied independent key.

## Transaction and writer protocol

All service requests use the existing transaction wrapper. Lock order is session/person → operation when applicable → target FOR UPDATE → grant FOR SHARE. Confirmation also locks its flow before session/operation. Each first effect rechecks current person, session, capability, validity, independent reviewer, exact scope, grant revision and target hash/revision. A changed target or grant requires preparation and fresh confirmation again. Target/grant security updates must increment revision exactly once, including restoration of previous content.

Authority or target writers must lock the same affected records and commit revocation/configuration changes through that protocol. No operator grant-management interface is implemented. Tests exercise owner-side synthetic writers only. A domain effect runs on the *same supplied transaction*; result, audit and confirmation consumption commit together. Failure of audit rolls all four back.

GET and identical POST recovery reauthorize the current session and grant, then return the original result without another effect or audit. A different fingerprint conflicts. A newly authorized person may recover a completed operation but cannot execute another person's uncompleted operation. Historical attribution remains the original author. Revocation blocks subsequent read and replay.

## Proof and limits

The repository tests use disposable PostgreSQL, a non-owner/non-BYPASSRLS role, cryptographically signed RSA OIDC fixtures and the actual standalone HTTP adapter. They cover signature/issuer/audience/nonce/PKCE/time validation, key rotation, CSRF, flow replay, stale proof, person aliases, foreign scope, first-use binding, canonical replay, revision changes, authority revocation in both lock orders, audit rollback, runtime privilege denial and a genuine TCP response loss after commit followed by GET and two exact POST retries.

The effect inserts a synthetic marker. **These tests do not create a BSS tenant or prove actual provisioning, verified onboarding or go-live.** Prior actual Keycloak/Edge/virtual-WebAuthn proof belongs to the previous isolated adapter; do not silently attribute it to this new composition. Exact-head test totals and any new actual-provider proof belong in the PR and BSS OS journal.

## Recovery and remaining activation decisions

Before any real activation, complete independent review and choose private IdP/hosting destination, registered persons and grant administrators, lifetimes, retention/cleanup, encryption-key storage/rotation, operational revocation and secret-safe observability. Integrate actual approved domain writers, authoritative preparation history, release/config/evidence updates and one provisioning-request-to-tenant mapping under the same transaction protocol. Prove first tenant creation, actual permissions, target deployment/privacy/backup/restore and a physical key where required. Existing #59/#237/#62, partner import and Pilot gates remain open.

With no data, down migration removes the draft schema. With any identity, flow or historical record it refuses destructive rollback. Preserve history and use reviewed forward recovery after the first write. Code rollback does not authorize deleting an authority registry. Neither this candidate nor its synthetic tests promote Staging, Pilot or Commercial Production readiness.
