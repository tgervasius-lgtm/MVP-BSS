# Trivy filesystem/configuration baseline

Status: `PROPOSED / LOCAL BASELINE`
Issue: #129
Baseline captured: 2026-08-11
Authoritative source commit scanned: `daf1434c0bd751b4558e4fc34fac3ca924b55861`

## Purpose and boundary

Trivy adds a repository-filesystem view of dependency vulnerabilities and supported configuration/IaC misconfigurations. It does not replace or weaken any existing BSS control:

- CodeQL remains the source/security-query analyzer;
- SonarQube Cloud remains the independent reliability, maintainability and static-analysis opinion;
- Gitleaks remains the full-history secret scanner, so the Trivy secret scanner is disabled;
- npm audit, dependency review and Dependabot remain the authoritative package-ecosystem controls, and a differing Trivy result must be classified before any lockfile change;
- CycloneDX generation remains the dependency-inventory/SBOM evidence;
- actionlint remains the GitHub Actions syntax, expression and embedded-shell check.

Image scanning is deliberately absent. Authoritative `main` does not contain an approved current container build artifact; legacy PR #28 container work remains a separate reviewed workstream.

## Deterministic scanner provenance

The proposed workflow installs the official Aqua Security Trivy `v0.73.0` Linux 64-bit release archive directly and verifies this published SHA-256 before execution:

`2edd39da482bb4e9831962487b68f68e3928ec3137794757f54d00383d79547b`

No `latest` tag, floating action reference, `curl | sh`, package lifecycle script or unverified executable is used. The vulnerability database and misconfiguration check bundle are intentionally current external security data, so their contents evolve independently of the pinned scanner binary. Every scan is therefore time-specific even when the source commit and scanner version are unchanged.

The local Windows baseline used the official `trivy_0.73.0_windows-64bit.zip` archive after verifying its published SHA-256:

`d2d3ad5292aae470a03eb6506db86fce81b1894592b8451cadaf60eaa22f2025`

Trivy is published by `aquasecurity/trivy` under Apache License 2.0. The BSS repository maintainer owns the workflow pin. Binary updates are manual rather than Dependabot-managed: review the official release and release notes, replace the version and platform checksum together, rerun the current-main baseline, compare finding classes/counts, and update this evidence record in the same focused review.

## Explicit scan contract

| Setting | Phase 1 value |
|---|---|
| Scan type/target | Filesystem, repository root (`trivy fs .`) |
| Scanners | `vuln,misconfig` |
| Dependency coverage | Root and backend committed npm graphs, including development dependencies |
| Severities retained | `UNKNOWN,LOW,MEDIUM,HIGH,CRITICAL` |
| Finding exit policy | `--exit-code 0` (reviewable, non-blocking baseline) |
| Ignore policy | No Trivy ignore file or policy |
| Outputs | JSON and SARIF workflow artifacts, retained for 90 days |
| GitHub permissions | `contents: read` only |
| Code scanning upload | Not enabled; no `security-events: write` permission requested |
| Triggers | Pull requests to `main`, pushes to `main`, weekly schedule and manual dispatch |

The workflow job still fails on installation, checksum, database download, scanner execution, JSON validation, conversion or artifact-upload errors. Only the presence of findings is non-blocking during Phase 1. The job is not added to the repository ruleset's required status checks in this change.

## Initial current-main result

The verified Trivy `v0.73.0` binary scanned a clean Git archive of `daf1434c0bd751b4558e4fc34fac3ca924b55861`. The scan included development dependencies and used vulnerability DB schema 2 updated at `2026-08-11T13:06:59Z`; the downloaded misconfiguration check-bundle digest was `sha256:1583562f8b90ed2a071b99f0e5ffff6b57e4ceb6ca3e4796577b4e6a339eb74c`.

| Finding class | UNKNOWN | LOW | MEDIUM | HIGH | CRITICAL | Total | Classification |
|---|---:|---:|---:|---:|---:|---:|---|
| Dependency vulnerabilities | 0 | 0 | 0 | 0 | 0 | 0 | No findings to classify in this time-specific baseline |
| Supported configuration/IaC misconfigurations | 0 | 0 | 0 | 0 | 0 | 0 | No supported configuration target was detected |

Trivy detected two dependency targets: `package-lock.json` and `backend/package-lock.json`. It detected zero supported configuration targets in the current tree. That zero is an applicability result, not evidence that GitHub workflows, Cloudflare configuration, deployment configuration or the repository as a whole are secure.

The initial classification is therefore:

- real risk: 0;
- duplicate evidence: 0;
- accepted legacy debt: 0;
- false positive: 0;
- not applicable: configuration/IaC finding class for the currently detected target set (zero supported targets).

## Phase 2 decision gate

No blocking finding policy is approved by this baseline. Before any Trivy finding can become a required merge gate, BSS OS review must approve:

1. how a pull request is compared with the accepted current-main baseline;
2. which new or clearly regressive `HIGH`/`CRITICAL` findings block;
3. how duplicate npm evidence is reconciled with npm audit, dependency review and Dependabot;
4. how an accepted item records its exact finding ID, affected path/package, owner, rationale, expiry/review date and compensating control;
5. how false-positive or not-applicable dispositions remain narrow and auditable.

A broad ignore, global severity suppression, scanner disablement or arbitrary lockfile rewrite is not an acceptable debt-management mechanism.

## Evidence limits, rollout and rollback

The local baseline proves only that the pinned scanner executed against the named commit with the named time-specific databases and returned the recorded counts. It is not a GitHub Actions run, required-check result, security audit, deployment, release, pilot acceptance or production-readiness proof. GitHub workflow evidence remains pending until this focused change is reviewed and allowed to run through the repository PR process.

Before merge, rollback is closing the unmerged PR. After merge, rollback is a reviewed revert of the Trivy workflow/configuration change. Historical workflow artifacts or security findings must not be deleted merely to make the security record look clean.
