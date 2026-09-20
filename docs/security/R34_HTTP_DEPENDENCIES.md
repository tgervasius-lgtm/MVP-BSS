# R34 — HTTP security dependency maintenance

Issue: [#172](https://github.com/tgervasius-lgtm/MVP-BSS/issues/172)  
Candidate: [#108](https://github.com/tgervasius-lgtm/MVP-BSS/pull/108)  
Baseline inspected: `ae25e2319786c377819a5e550339c803869ca96e` (20 September 2026).

## Purpose and scope

Update Fastify from 5.12.1 to 5.12.5 and `@fastify/rate-limit` from 11.1.0 to
11.2.0. Both remain exact direct dependency pins. The npm-generated lockfile
adds only the required `ip-address` 10.7.2 dependency; unrelated versions stay
unchanged. These three packages use MIT licences and declare no installation
lifecycle scripts. Existing npm installation and explicit esbuild rebuild
controls remain in place.

All BSS roles use this HTTP/auth layer. Endpoint contracts, session cookies,
origin checks, tenant/RBAC/RLS rules, database schema and attendance semantics
are unchanged. This package is required before production-like staging.

## Findings and limits

| Finding | Evidence and BSS applicability |
| --- | --- |
| IPv6 rate-limit bypass | The [upstream advisory](https://github.com/fastify/fastify-rate-limit/security/advisories/GHSA-grpc-p53c-r64v) affects versions below 11.2.0. BSS uses the default client-IP key and supports explicitly trusted proxies. Contract tests reproduce address-rotation and alternate-address-form bypasses with the original graph. |
| Fastify validation advisories | The [header-schema advisory](https://github.com/fastify/fastify/security/advisories/GHSA-9q9j-q6p8-xq58) affects versions below 5.12.2. Updating the affected package is justified; this does not establish that BSS exposes that exact header-schema exploit path. Existing BSS HTTP validation/session contract tests remain required. |
| HTTP/2 trailer DoS | The [upstream advisory](https://github.com/fastify/fastify/security/advisories/GHSA-4mh8-r7rc-xpvc) is patched in 5.12.5. Inspected BSS `buildApp` does not enable HTTP/2 or register response trailers. No BSS exploit or production incident is claimed. |

The [5.12.5 release](https://github.com/fastify/fastify/releases/tag/v5.12.5)
was the current published Fastify release when this package was prepared.
Recheck vendor advisories before a later deployment; these are dated findings.

## Behaviour and verification

The upstream limiter now canonicalizes addresses, maps IPv4-in-IPv6 forms to
IPv4, and groups IPv6 clients by /64. Existing BSS limits are retained: login
and invitation acceptance 5/minute, refresh/logout 30/minute and `/me`
120/minute. No custom key generator or trust-proxy expansion was added.

`backend/test/contract/auth-rate-limit.test.ts` exercises real `buildApp`
routes with in-memory service fakes. Its 11 cases cover:

- address rotation within one /64 on all five auth/session routes;
- independence of another /64 and other IPv4 clients;
- compressed, expanded, mixed-case and IPv4-mapped spellings;
- rejection of spoofed forwarding headers from untrusted peers;
- the nearest untrusted client boundary in a forwarding chain;
- rejected login attempts being blocked before a sixth password check.

The identical test file produced **8 failures and 3 passes** with the original
dependency graph, then **11 passes** after the targeted upgrade. These expected
baseline failures reproduce the vulnerability; they are not passing baseline
evidence. No production traffic or customer data was used.

Local Linux / Node 24.19.0 checks passed: backend typechecks, OpenAPI validation,
56 unit/contract tests, backend build, architecture guard and full backend npm
audit (0 reported vulnerabilities at that time). The Windows launcher/wrapper
was unavailable in this environment. Local service-fake tests do not prove
PostgreSQL behaviour; the backend workflow must separately pass its mandatory
PostgreSQL integration tests, and the full-stack workflow must pass browser/axe
checks on the final PR candidate. Their authoritative results are attached to
PR #108; this document does not predeclare a pending run successful.

The refreshed candidate incorporates two independently reviewed prerequisites:
PR #174 isolates disposable PostgreSQL fixtures after #173 ACL contention;
PR #176 corrects the separately reproduced RFID transaction/lock-order defect
in #175. Those changes keep their own evidence and review boundaries. Merge
#174, then #176, refresh this PR against resulting main, and require green
protected checks on each remaining candidate before the R34 merge. This
candidate composition is validation work, not protected-main acceptance.

## Review, staging and recovery

This is a high-risk auth/security dependency change. Required GitHub checks,
review of the final diff and explicit owner merge approval are required by
`AGENTS.md`. A prepared PR or passing test suite is not deployment approval.

Clients sharing a /64 now share a limiter bucket. Before live staging, verify
the actual proxy allowlist and observed `request.ip` values, representative
shared networks and the intended replica count. Existing risk R-018 for a
shared/distributed limiter remains open; these in-process tests do not resolve
it. No staging, production, pilot or physical-terminal readiness is promoted.

No database rollback is needed. Hold deployment if compatibility fails. A
reviewed revert restores the old dependency graph but also restores known
vulnerabilities; treat it as containment, not security remediation, and prefer
a focused forward fix before exposing the service.

## Separate static-file candidate

PR #167 remains separate. Review of the [10.1.2 to 10.1.3 upstream diff](https://github.com/fastify/fastify-static/compare/v10.1.2...v10.1.3)
found non-canonical-path rejection as well as Windows absolute `sendFile`
compatibility. It is therefore broader than the short Windows-only release
summary suggests. BSS currently serves its frontend root and uses relative
`sendFile("index.html")`; this review does not prove exposure of protected
static files or Windows runtime behaviour. Refresh and verify that candidate
against the resulting baseline after R34; its dependency update is not included
in this package.
