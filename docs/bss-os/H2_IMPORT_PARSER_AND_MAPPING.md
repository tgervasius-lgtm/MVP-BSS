# H2-1b — isolated file parsing and explicit mapping

Status: **IMPLEMENTED FOR REVIEW / INACTIVE**. Owner: [#237](https://github.com/tgervasius-lgtm/MVP-BSS/issues/237).
Prepared 2026-10-09 from protected main `582cd772fad8674328dc9786e65bbf02c3297199`.
Continuity checked: central Board v175, source map v58. The owner's current continuation authorizes this work; the old pause after #242 does not undo the newer instruction. Central historical conversation reconciliation remains separate.

## Purpose and boundaries

The H2-1a store accepts canonical rows only. Exposing it to spreadsheets without bounded parsing would violate accepted D1/D2 controls. This focused dependency implements a format reader, isolated adapter and mapping primitive. It has no HTTP route, runtime registration, activation, database change or UI. Source/mapping persistence, admission, monitored cleanup, API and UI remain required by #237. This does not complete H2-1, employee import or onboarding.

The future role is tenant Admin only. The parser receives bytes and format/delimiter, never an ActorContext, cookie, DB connection, organization ID or credentials. Mapping returns canonical rows only when every row is valid. The store must still validate active same-tenant references, uniqueness, revision and approval inside its atomic transaction.

## Runtime decision and security model

The earlier ExcelJS experiment used a V8 heap setting, which does not bound native allocations or whole-process memory. A local experiment could not initialize this Node runtime under 256 MiB address space, including jitless/small-heap settings. This slice uses Python's standard `csv`, `zipfile` and `ElementTree` implementations for a narrow tabular OOXML reader, inside Linux namespaces with mandatory seccomp. There is no new third-party workbook library, npm dependency, queue, service or vendor. Native runtime packaging and BSS-owned OOXML interpretation add maintenance obligations.

Requirements: Linux x86_64; `/usr/bin/bwrap` supporting `--disable-userns`; `/usr/bin/prlimit`; patched Python 3.12+ and Expat >=2.6.0; `libseccomp.so.2`. Minimum versions are compatibility checks, not vulnerability clearance. CI records native versions from maintained Ubuntu packages. Deployment must inventory, pin/update/scan these dependencies and prove the same sandbox under its intended unprivileged identity. Python uses the PSF license, Expat MIT, bubblewrap and libseccomp LGPL. No production packaging or privileges are authorized by CI.

- Input: 1 MiB; 1,000 records plus header; five/six columns; 1,024 decoded characters/cell; headers 80. Reject overrun, never truncate.
- ZIP: actual streamed expansion <=10 MiB total, <=5 MiB/entry, <=100 entries, <=100:1. Strict part/path allowlist, CRC, duplicate/encrypted/unsupported-entry rejection; no extraction to disk. ExcelJS's unused VML default declaration is tolerated; VML files and relationships are rejected.
- XML/XLSX: UTF-8 only, DTD/entities rejected before parsing, bounded depth/node/coordinates, exactly one visible worksheet. Formulas/cached formulas, macros, external relationships, embedded content, hyperlinks, rich-text/error/date cells and hidden data rejected.
- Memory: hard 256 MiB address-space limit including native allocations; three CPU seconds and a three-second parent wall deadline. This is stricter than the candidate RSS ceiling; neither ignored Linux `RLIMIT_RSS` nor V8 heap is presented as a total limit.
- Seccomp denies fork/clone/exec/network/namespace-changing syscalls, preventing child processes multiplying the memory budget. Capabilities are dropped; core dumps and file writes disabled.
- Only code/runtime paths are read-only mounted. No host `/proc`, `/etc`, home, app config, DB credentials or secrets. Stdin transports bytes; no raw file paths or persistent uploads. Environment is cleared. Parent bounds/validates stdout, suppresses parser stderr/values, kills the whole process group and awaits close on timeout/cancel. Missing sandbox fails UNAVAILABLE; no fallback.

CSV supports explicit comma/semicolon delimiters, BOM, quoted delimiters/quotes/newlines and text IDs. Invalid UTF-8/NUL, ragged records, formula-like values and extra fields are rejected. Only trailing blank records can be ignored within scan limits.

XLSX supports ordinary text cells and bounded nonnegative integer cells. Numeric employee IDs retain numeric type and mapping rejects them; no reconstruction of leading zeros or dates from number formats. This deliberately narrow subset does not promise every spreadsheet extension. Standard ExcelJS-generated files are the interoperability fixture.

## Mapping and future integration

Every source column maps exactly once to a canonical field, including optional email when present. Source department/shift strings need explicit ID bindings: no fuzzy/global lookup, new references, ignored PII columns or implicit allowance. Missing bindings and invalid fields return row numbers/error codes and `canonicalRows: null`; no partial import. Error records contain no source values.

`mappingChecksum` binds raw checksum, parser version, headers, source values, column mapping and sorted bindings. It is NOT yet the store preview checksum. The next slice must persist source/mapping under the same tenant/expiry/purge boundary and include this identity in session/commit validation. Do not expose `prepare` directly through a route before completing those controls.

## Verification and limits

Local: direct hostile CSV/XLSX corpus, real ExcelJS interoperability, TypeScript/build and mapping checks. Corpus execution outside namespaces proves format behavior only. Tests cover lexical codes/zero allowance, whole-batch refusal, mapping fingerprint changes, byte limits and pre-spawn cancellation.

Sonar review follow-up: exact object-key validation uses own-key membership/counts, not alphabetical sorting. Mapping fingerprints retain the existing locale-independent code-unit order. XLSX validation is split into entry, workbook, stylesheet, cell and row helpers without relaxing format/resource controls; digit expressions explicitly remain ASCII-only. Rejection tests assert specific exception classes and, for corrupted/duplicate/forged ZIP entries, stable rejection codes. Added regression cases cover property/binding insertion order, inherited keys and non-ASCII numeric markup. No finding is suppressed and no quality gate is changed. Exact final analysis/CI results belong to PR #260.

The new CI job runs the corpus, real adapter/compiled artifact, 1,000-row XLSX, cancellation after spawn and unsafe-file cases. Same-sandbox probes check hard memory/CPU limits, denied fork/network, absent synthetic external secret, cleared environment and read-only filesystem. Ubuntu CI uses runner root only to create namespaces; all sandbox capabilities are dropped. Reviewed code/build fixtures are copied into a temporary traversable path because remapped root cannot traverse the runner's private home; the home is not exposed. This is not proof of the eventual application's unprivileged runtime and introduces no BSS sudo path.

Local namespace creation is UNAVAILABLE (`bwrap` netlink EPERM). Existing ClamAV socket unit test also encounters the known local listen EPERM; that unchanged check is required in CI. No PostgreSQL mutation is introduced by this slice. Required CI/PG regressions still gate merge. Exact outcomes are recorded in the PR, never inferred from pending jobs.

## Recovery and next dependency

Revert these isolated files/build-copy/CI additions before activation; no worker data, migrations, grants or durable session identities change. Owner approval is required before this security-boundary merge.

H2-1c must provide source/mapping/revision/replay persistence, deployment-wide parser admission/lease and tenant limits, authenticated raw HTTP with upload/disconnect deadlines, and monitored startup/recurring cleanup with overdue fail-closed behavior. Then connect the Admin UI. Privacy/backup/restore, deployment capacity, named operator and go-live remain independent gates.

Primary references: [Python XML security](https://docs.python.org/3/library/xml.html), [ZIP pitfalls](https://docs.python.org/3/library/zipfile.html#decompression-pitfalls), [Linux limits](https://man7.org/linux/man-pages/man2/getrlimit.2.html), [bubblewrap](https://github.com/containers/bubblewrap), [Node memory settings](https://nodejs.org/api/cli.html#--max-old-space-sizesize-in-mib).
