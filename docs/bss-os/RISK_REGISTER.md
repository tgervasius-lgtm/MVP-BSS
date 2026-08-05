# BSS Risk Register

Scale:

- Impact: Low / Medium / High / Critical
- Probability: Low / Medium / High
- Status: OPEN / MITIGATING / ACCEPTED / CLOSED / EXTERNAL

| ID | Risk | Impact | Probability | Status | Mitigation | Closure evidence |
|---|---|---|---|---|---|---|
| R-001 | `main` and Backend Phase B exist as divergent software baselines. | Critical | High | MITIGATING | Integrate current PR #27 head into a branch created from current `main`; resolve conflicts individually and run all required checks. | Integration PR merged into `main`; PR #27 closed or superseded. |
| R-002 | Additional work is stacked on an unmerged base branch. | High | High | MITIGATING | Pause unrelated core development; retarget or split PRs #28 and #31 after baseline consolidation. | No active long-lived PR depends on obsolete PR #27 base. |
| R-003 | Preview Portal PR is too large and stale for normal review. | High | High | OPEN | Reconstruct or carefully integrate from stable `main`; preserve preview isolation; rerun unit, E2E, accessibility and offline tests. | Reviewable PR from current `main` with green checks and explicit external-access decision. |
| R-004 | Production backend hosting architecture is not selected and proven. | Critical | High | OPEN / EXTERNAL | Select hosting, private networking, database, secrets/KMS, WAF/rate limiting and deployment model. | Staging and production architecture approved and deployed with runbook. |
| R-005 | Backup documentation exists without a proven production restore/PITR drill. | Critical | Medium | OPEN / EXTERNAL | Configure automated backups and execute timestamped restore/PITR rehearsal. | Signed drill record with RPO/RTO result and remediation actions. |
| R-006 | Monitoring, error tracking, alerting and incident response are incomplete. | Critical | High | OPEN / EXTERNAL | Define SLIs/SLOs, logs, metrics, traces, alerts, escalation and incident runbook. | Staging incident exercise and alert evidence. |
| R-007 | Production key management and RFID/device credential rotation are not operationally proven. | High | Medium | OPEN / EXTERNAL | Use managed KMS/secrets, document rotation and revocation, rehearse compromise response. | Rotation drill and least-privilege configuration evidence. |
| R-008 | Hardware enclosure fit is based on unverified component dimensions. | High | High | OPEN / EXTERNAL | Measure exact Nextion, Pi/cooling, RFID revision, connectors and cable clearances. | Approved measurement sheet and final CAD/STEP/manufacturing package. |
| R-009 | Cloudflare Access may block anonymous pilot prospects from Preview Portal. | Medium | High | OPEN / EXTERNAL | Decide public preview policy, remove hostname from Access or create controlled allowlist. | Successful external access test from a non-owner account. |
| R-010 | Preview Portal lacks a formal lead/contact capture destination. | Medium | High | OPEN | Define privacy-safe contact workflow, consent text, storage and ownership. | Tested lead flow and documented retention/access controls. |
| R-011 | GDPR/legal readiness is not independently validated. | High | Medium | OPEN / EXTERNAL | Complete data map, retention, processor/subprocessor review, DPA terms and legal review. | Approved compliance pack and contract templates. |
| R-012 | Two large backend service modules create maintainability and review risk. | High | Medium | ACCEPTED / MITIGATING | Freeze growth via architecture budget, then decompose incrementally with tests. | Reduced module scope without contract regression. |
| R-013 | RFID/event queries may contain bounded N+1 or scaling pressure. | Medium | Medium | OPEN | Establish realistic data volumes, query plans and load/soak tests; optimize only with evidence. | Query plan baselines and load test targets met. |
| R-014 | Solo-owner review model creates key-person dependency. | Medium | High | MITIGATING | Maintain handoff docs, CODEOWNERS, decision/risk registers and reproducible setup; later require independent approval. | External developer completes clean-clone takeover exercise. |
| R-015 | Public repository exposure increases the consequence of accidental secrets or sensitive test data. | High | Medium | MITIGATING | Maintain full-history Gitleaks, minimal fixtures, no real personal data and rotation procedure. | Continuous green secret scan and documented incident process. |

## Review cadence

- Review P0 and Critical risks before each merge affecting core architecture, data or deployment.
- Review the full register at least monthly during active development.
- A risk is closed only with evidence, not because work was planned or discussed.
