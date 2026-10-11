# Sonar main findings — focused remediation review

Status: IMPLEMENTED LOCALLY FOR REVIEW; scanner closure and merge are unproven.
Baseline: protected main `4a09ada7a631f6d17a7059ce5781c45564846351`.
Sonar main analysis `aeead957-4b2b-4bd8-ac9e-22343f28d7fa` at 2026-10-11T14:22:05+0000 matches that SHA. Quality Gate ERROR, new Security D / Reliability D. Actual impact filtering finds 19 SECURITY/RELIABILITY issues among 281 open/confirmed New Code findings.

## Remediation scope

- `shelldre:S7688` (2): Bash CI/architecture guards use `[[ ]]`.
- `shell:S6506` (1): installer curl permits HTTPS for both transfer and redirects; qpdf version/digest and fail-before-install checks remain.
- `typescript:S7758`, `S7773` (2): two-hex-digit PDF names use fromCodePoint/Number.parseInt; escape range remains 0–255.
- `typescript:S1143` (1): PDF error handling captures the inspection error, always attempts cleanup after directory creation and rejects outside finally. Cleanup failure retains explicit 503 precedence, including after a rejected PDF; it cannot accept an uncleaned input or expose parser/filesystem metadata.
- `typescript:S8786` (1): bounded import-email validation uses linear string/whitespace scans, preserving the old accepted language, not introducing stricter email policy.
- `typescript:S7503` (10): route registration and nine pure fixture methods retain Promise returns, immediate body evaluation and rejection conversion without dummy awaits. Other service methods are not broadly refactored.

These 17 are code remediation candidates, not proof that Sonar has closed them.

## Two contextual findings remain open

`AaEdGENiSplG0XCcTnBj` / `typescript:S5443`: private PDF input uses atomic unpredictable mkdtemp under required `/dev/shm` tmpfs, 0700 directory and exclusive 0600 file. Added lstat directory/type/effective-owner/exact-permission checks before writing or parsing. Fault tests verify actual fixture permissions and rejection for wrong mode/owner. Parser execution is mocked in those tests. Deployment private-tmpfs/host/swap and process/container-crash cleanup still require independent staging evidence. No NOSONAR, exclusions, hidden path or disk fallback. Contextual disposition is PROPOSED, not accepted or applied.

`AaEdGEklSplG0XCcTnBo` / `yaml:S2068`: the value is the ephemeral PostgreSQL CI `bss_test` service credential in backend-quality.yml, not an identified production secret. Workflow unchanged. No label evasion or replacement with a production secret. Contextual disposition is PROPOSED, not accepted or applied.

## Evidence

- PASS TypeScript source/test lint, backend build, OpenAPI lint, architecture (95 source files), Bash syntax, git whitespace check.
- PASS 31 focused unit/HTTP/document contract tests with zero skipped, including PDF cleanup/permission faults and Promise rejection semantics.
- PASS legacy/new email equivalence on 87,372 nonempty short inputs; committed curated Unicode/length/whitespace/multiple-dot cases. The comparison's old backtracking regex is not added to shipped tests.
- PASS installer non-CI/wrong-architecture guards; both HTTPS-only arguments; actual curl HTTP denial; bad synthetic digest stops before sudo/provisioning. No successful real download/redirect-chain installation proof is claimed.
- Full backend unit/contract suite: **FAIL, 89 PASS / 1 FAIL / 0 SKIPPED**. Existing ClamAV stream adapter test fails to create its Unix socket with `listen EPERM`. Reproduced the same failure on a clean worktree at exact current main. Test/scanner gates remain intact; baseline reproduction does not turn this into PASS.
- UNAVAILABLE locally: actual pinned qpdf/ClamAV operational corpus, PostgreSQL/RLS/full-stack execution, deployment containment/crash-cleanup evidence, PowerShell verification wrapper. No implicit database, runtime provisioning or laptop checkout change.
- Fresh published-head GitHub quality/security/Sonar results must be inspected before any merge proposal. Main FAIL is not closed by PR-only PASS.

## Contracts, activation and rollback

No API/OpenAPI, schema/migration, RLS/RBAC, audit, document retention, frontend or dependency changes. qpdf pin, subprocess environment/resource limits, privacy and fail-closed document policy remain. Import/report integrations remain inactive. Pilot/production readiness is unchanged.

Revert this focused code change if reviewed integration requires rollback; no data migration or environment rollback is involved. No gate weakening, Sonar disposition or branch-protection change is authorized by this implementation record. Merge and deployment require separate owner approval.
