# Mailbox PDF acceptance policy v1.1

Policy: OWNER ACCEPTED, 2026-10-08. Implementation: PR #259, FOR REVIEW.
Owner approved rejecting embedded-file PDFs while retaining ClamAV. This does not
authorize merge, deployment, real documents or activation. The core mailbox is
merged in #257 and remains disabled by default.

## Contract and scope

Admin/accountant may upload original PDFs up to 5 MiB: ordinary text, images,
scanned pages and multiple pages remain allowed. Workers download the original
bytes under the existing session and authorization rules. No PDF rewriting,
flattening, attachment extraction or new password is introduced.

Reject embedded/associated files (including PDF/A-3 embedded XML), attachment
annotations and portfolios. Reject encrypted PDFs (including empty user passwords),
parse errors/warnings, external stream content and documents exceeding inspection
limits. Return 422 for a disallowed/invalid PDF, 503 for unavailable/failed inspection
infrastructure. Both reject before content/audit persistence. The upload form explains
the restriction and a forbidden attachment receives a specific Croatian error.

Structural inspection also precedes an exact retry lookup, so an old draft cannot
bypass the new upload policy. It does not retroactively certify existing records:
before activation inventory and inspect any pre-policy documents under the approved
operator procedure. No document or key is deleted by this change. RBAC/RLS,
recipient review, encryption, quotas, audit and schema are unchanged.

## Control and dependency decision

Owner: BSS backend/security maintainer. Threat: a PDF disguises an attachment via
escaped names, object streams, indirect objects or catalog/annotation variants,
including the ClamAV MIME-token reproducer recorded in the staging runbook.

`pdf-policy.ts` runs upstream qpdf **12.4.2**, checks syntax without cross-reference
recovery and rejects any warning, then inspects JSON v2 for every resolved object
(including object-stream and unreferenced objects). Semantic names are checked;
ordinary document strings, image streams and embedded fonts are not attachments.
ClamAV still checks accepted bytes before database insertion. qpdf is not malware
detection, and this is not a claim of universal PDF safety or a fix to ClamAV.

qpdf is Apache-2.0, free and local; no document leaves the host. Compared with a
byte regex or only listing catalog attachments, its object representation covers
encoded/compressed forms. A hosted paid scanner would add a sensitive-data transfer,
vendor and cost without addressing this acceptance policy. No new npm dependency
or paid service is required. A newer qpdf release requires a reviewed version/digest
change and corpus run; replacement is confined to this module.

Review sources (checked 2026-10-08):
- https://qpdf.readthedocs.io/en/stable/json.html (JSON v2/object streams/names)
- https://qpdf.readthedocs.io/en/stable/cli.html (`--check`, warning status, suppress recovery)
- https://qpdf.readthedocs.io/en/stable/license.html (Apache-2.0)
- https://qpdf.readthedocs.io/en/stable/release-notes.html (12.4 recursion/robustness fixes)
- https://github.com/qpdf/qpdf/issues/1739 (hostile linearization memory use)
- https://github.com/qpdf/qpdf/releases/tag/v12.4.2

Do not equate an empty advisory list with absence of vulnerabilities. Native parsing
is a separate process with OS memory/CPU/output/time limits and no inherited secrets.
Version 12.4.2 was selected over the older distro 11.9 after this review. Its binary
archive bundles libraries: include these in the actual runtime SBOM and vulnerability/
license inventory, retain their required notices, and monitor upstream updates before
and after activation. The repository npm audit does not cover these native libraries.

## Runtime, privacy and rollback

- Supported inspection runtime: Linux x86_64, `/opt/bss-qpdf/12.4.2/bin/qpdf`,
  `/usr/bin/prlimit` (util-linux). Architecture changes require a reviewed artifact.
- Official archive SHA-256:
  `db367d897829f22c4198ce1094143c9d467bd6ee7dfabc44ba6f02056b24f8b1`.
  `backend/scripts/install-qpdf-ci.sh` installs it only in CI, verifies the checksum,
  and prints the version. It does not provision any BSS environment.
- Read-only parser directory and libraries, owned by the image/operator, not the app
  user. No shell or user-controlled command/path. Child environment contains only
  LANG/PATH; parser stdout/stderr and document metadata are never logged or returned.
- Each upload has an unpredictable 0700 directory and 0600 input under `/dev/shm`;
  runtime verifies it is tmpfs and never falls back to a disk directory. qpdf needs a
  seekable input. Cleanup runs on success/error and cleanup failure rejects upload.
  Use a private container tmpfs with lifecycle cleanup, disabled/encrypted swap,
  restricted host access and enough capacity for the two bounded uploads. Verify
  process/container-crash cleanup before real data; finally alone is not crash proof.
- Each qpdf process: 256 MiB address space, 3 CPU seconds, 5 s wall clock, 8 MiB
  captured output, zero regular-file output/core dumps and 64 file descriptors.
  Two sequential processes (syntax, JSON) per upload. Parsed structure: 20,000
  objects, 200,000 nodes, depth 64. Existing two-upload HTTP concurrency limit applies.
- Process limits contain resource failure; they are not a sandbox against a native
  code-execution flaw. The actual runtime must apply its standard non-root/container,
  filesystem and egress restrictions; do not run the backend/scanner as root.
- Monitor inspection failures/timeouts/latency and temporary storage without recording
  file bytes/names/salaries or raw child errors. Repeat representative accountant
  document and resource-limit tests on the actual staging image.
- Rollback: keep/set `DOCUMENTS_ENABLED=false` through the approved release path,
  preserve schema/ciphertext/keyring/backups. Never revert to accepting attachments
  while leaving the feature active. No down migration or data deletion.

## Verification and remaining evidence

Local PASS: TypeScript, OpenAPI, build, structural unit tests, actual qpdf 12.4.2
corpus (text/images/multiple pages, benign attachments, MIME variants, escaped and
indirect names, unreferenced embedded streams, associated files, annotations,
portfolios, compressed objects, incremental attachment, encrypted/invalid PDFs,
output-budget rejection and normal/error temporary-file cleanup). Frontend lint,
168 tests and build PASS. Socket test is locally UNAVAILABLE (`listen EPERM`), also
reproduced on the unchanged baseline test; it is not marked PASS.

CI PENDING on the implementation revision: actual ClamAV + original EICAR PDF upload
rejection, benign attachment rejection, missing parser/scanner, no ciphertext or
upload audit on rejection, clean upload/download, PostgreSQL/RLS and keyring restore.
The original rejection assertion remains mandatory; no test was skipped to pass it.

Before activation: deployed M01–M15, representative real-export synthetic/redacted
corpus and ambiguous/polyglot coverage, runtime vulnerability/SBOM and process
isolation evidence, crash cleanup, resource exhaustion/latency, monitoring,
retention/privacy decisions and approved release. CI is not staging/Pilot/Production.
Attached central Board/Map copies have no verified current VersionId:
`SOURCE_FRESHNESS_UNVERIFIED`; no closed project tasks are reopened.
