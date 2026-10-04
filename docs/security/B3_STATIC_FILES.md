# B3 — static-file security and runtime compatibility

Issue #177 / PR #167 follows R34 on protected-main baseline
`7f565e67921211306af084b7e6e91c373bf7561b`. This document describes the
candidate; merge and current check results must be read from the PR.

## Dependency and threat review

- Pin `@fastify/static` 10.1.4, replacing locked 10.1.2. Its only changed
  transitive package is `content-disposition` 2.0.1 -> 3.0.0. Both use MIT.
- The [10.1.4 release](https://github.com/fastify/fastify-static/releases/tag/v10.1.4)
  identifies GHSA-r799-r9gc-m956 / CVE-2026-90982: case-insensitive filesystem
  aliases could bypass route guards or `allowedPath` checks.
- The [reviewed source diff](https://github.com/fastify/fastify-static/compare/v10.1.2...v10.1.4)
  also rejects noncanonical paths before the file sender normalizes them,
  while preserving native absolute Windows `sendFile` paths.
- The full advisory page was unavailable through the available reader.
  The release and code diff support these claims; no severity score or
  evidence of an actual BSS incident is asserted.
- File spelling checks assume the static tree is not attacker-writable
  between validation and file opening. Public assets must remain public;
  these tests do not make a static root suitable for private tenant data.
- R34 Fastify 5.12.5 and rate-limit 11.2.0 pins remain intact. No new package
  or install/postinstall hook is introduced. `content-disposition` declares
  a development `prepare` script; locked CI installs keep lifecycle scripts
  disabled and explicitly rebuild only esbuild, as before.

## Runtime compatibility decision

`content-disposition` 3 is ESM-only, while the static plugin requires it
from CommonJS. An actual Node 22.9.0 import passes with static 10.1.2 and
fails with static 10.1.4 (`ERR_REQUIRE_ESM`). Node 22.12.0 loads the new
plugin, but existing root ESLint 10 already declares a Node 22.13 floor
within the Node 22 line. Both BSS manifests and lockfile root metadata now
declare >=22.13.0, and the developer setup contract and guide agree.
`.nvmrc` remains 22; use a maintained Node 22 patch release in practice.

This is an intentional compatibility change: upgrade Node before applying
the package to any environment still using 22.9–22.12. CI verifies the exact
22.13.0 minimum on Linux and current Node 22 on native Windows. Neither
that matrix nor local Node 24 evidence proves every future Node version.

## Actual BSS applicability and regression coverage

`buildApp` serves the configured public frontend directory using wildcard
static routing and `sendFile('index.html')` for SPA fallback. It does not
configure `allowedPath`, private static folders or `reply.download`.
Report downloads use BSS's own response construction.

`backend/test/contract/static-files.test.ts` contains six tests:

1. Public CSS bytes, HEAD, ETag/304, last-modified and security headers.
2. HTML/SPA fallback and cache policy, API 404, unauthenticated 401,
   worker 403, admin 200, and no SPA fallback for non-GET requests.
3. Real HTTP traversal requests cannot expose a synthetic sibling file.
4. Separate upstream-style protected-route fixture rejects noncanonical
   raw request targets, including `//private/secret.txt`.
5. Native filesystem case aliases cannot bypass route or `allowedPath`
   authorization; Windows CI must prove `win32` and actual case folding,
   rather than skipping or mocking the test.
6. Relative and native absolute `sendFile` plus Unicode attachment names
   exercise file delivery and the CommonJS/ESM dependency boundary.

The unchanged protected-route assertion fails on 10.1.2: the double-slash
path returns 200 and the synthetic sentinel. On 10.1.4 all six tests pass
locally on Linux Node 24.19.0 and 22.13.0. This fixture demonstrates the
upstream defect, not a confidential BSS file leak. Actual Windows results
must come from the native CI job; Linux results do not establish them.

BSS's pre-existing generic error handler maps static-plugin errors to
500. The traversal test verifies denial and no sentinel leakage without
claiming BSS returns the plugin's native 403. Changing the error contract
is outside this dependency package.

## Gates and evidence boundaries

The backend quality workflow retains its existing PostgreSQL 16 job and
adds two bounded static compatibility jobs with immutable action SHAs.
The real full-stack/browser, audit, dependency/license, OpenAPI, CodeQL,
Gitleaks, workflow validation and other applicable gates remain required.
The Windows test fails if case-insensitive evidence is unavailable.

Local PowerShell verification wrappers and PostgreSQL are unavailable in
the Linux workspace. Direct local checks and repository CI are separate
evidence sources. No manual owner QA, staging, production, restore,
physical hardware, design acceptance or general restart is established.

## Recovery and approval

This security-sensitive package requires explicit owner approval before
merge under `AGENTS.md`. PR #167's branch name retains `10.1.3`, but the
reviewed candidate is 10.1.4. No schema, migration or business API changes.

Do not roll back the dependency merely to run an obsolete Node version.
Prefer a compatible Node upgrade or focused forward correction. A full
commit revert is possible without a data migration but restores known
path-handling weaknesses; assess exposure and preserve protection before
any environment rollback. Deployment requires its separate protected path.
