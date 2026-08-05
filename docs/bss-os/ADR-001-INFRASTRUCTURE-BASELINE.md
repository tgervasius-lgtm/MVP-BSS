# ADR-001 — BSS EU Infrastructure Baseline

Status: `PROPOSED`
Last reviewed: 2026-08-05
Owner: BSS founders
Related issue: `#59`

## Context

BSS needs a production path that is credible for pilot companies without creating a permanent DevOps burden before the company has a dedicated operations engineer. The system processes employee attendance, leave and audit data, so infrastructure decisions must prioritize EU data residency, tenant isolation, recoverability, secrets management, observability and controlled deployment over the lowest possible server price.

The current Cloudflare deployment is suitable for static frontend and Preview Portal delivery. It is not a backend or PostgreSQL production platform for the current BSS architecture.

## Decision

Use the following baseline for the first controlled pilot, subject to successful implementation and release-gate evidence:

- **Frontend and Preview Portal:** Cloudflare Pages, with Preview remaining isolated from production data and authentication.
- **Public API edge:** Cloudflare DNS/proxy and managed TLS for the BSS API domain.
- **Backend runtime:** Render Web Service in the `Frankfurt` region.
- **Database:** Render managed PostgreSQL in `Frankfurt`, connected to the backend through Render's private internal network URL.
- **Workspace:** Render `Pro` workspace before two-person operational access or real production use.
- **Environments:** separate `staging` and `production` environments, separate databases and separate secrets.
- **Deployment source:** protected GitHub `main` plus explicit release workflow; no direct workstation-to-production deployment.
- **Error tracking:** Sentry Developer/free tier initially, with a paid-plan review when pilot event volume or retention requirements exceed the included limits.
- **Backups:** provider PITR plus a separate encrypted logical backup copied outside the primary database service.
- **Infrastructure definition:** Render Blueprint or equivalent versioned configuration after the baseline is proven manually.

This ADR approves an architectural direction only. It does **not** approve production deployment or real personal data.

## Why this option

### Operational simplicity

Render provides the application runtime and managed PostgreSQL on one platform, supports Frankfurt deployment, private service-to-database networking, health checks, rollback-oriented deployment and infrastructure-as-code. This reduces the number of operational systems BSS must own during the pilot.

### Recovery capabilities

Paid Render PostgreSQL includes continuous point-in-time recovery. The recovery window is three days on Hobby and seven days on Pro or higher. BSS still requires an independent logical backup because provider PITR alone does not prove portability or recovery from account-level failure.

### Environment separation

Render projects support distinct environments and environment-scoped secrets. Pro workspaces add team collaboration, audit logs and stronger environment isolation controls. This is a better fit for two founders and a future external developer than a single-user Hobby workspace.

### Predictable small-scale cost

As of July 2026, Render documented an always-on Starter web service plus Basic-256mb PostgreSQL at approximately USD 13 per month on a Hobby workspace, before bandwidth and storage growth. Render Pro is USD 25 per month flat. This gives BSS a comprehensible starting point without committing to enterprise infrastructure.

## Environment model

| Environment | Purpose | Data policy | Minimum controls |
|---|---|---|---|
| Preview | Sales sandbox and UX validation | Synthetic data only | Separate route, explicit preview label, no production secrets or API |
| Staging | Release candidate validation | Synthetic or irreversibly anonymized data only | Separate backend, DB and secrets; migration and rollback rehearsal |
| Production | Approved pilot companies | Real data only after all gates pass | Protected environment, private DB path, monitoring, backups, incident ownership |

Staging and production must never share a database, credentials, encryption keys or session secrets.

## Initial sizing

The following sizes are starting hypotheses, not permanent commitments:

### Controlled pilot — up to 5 companies

- one always-on Starter backend instance;
- one paid Basic PostgreSQL instance;
- separate staging backend and database, always-on during active release testing and suspendable when no release work is occurring;
- no Redis-compatible cache until measurements prove a need;
- no horizontal scaling until load tests and real usage justify it.

### Approximately 20 companies

- move the backend to at least the next measured compute tier when CPU, memory or response-time thresholds require it;
- increase PostgreSQL compute and storage based on actual connection count, query latency, table growth and vacuum behavior;
- introduce connection pooling before increasing application replicas;
- evaluate a separate background worker only for real asynchronous workload;
- keep all services and databases in Frankfurt unless a formal ADR changes the region.

### Early growth

- evaluate high-availability PostgreSQL, read replicas and multiple backend instances;
- add shared rate limiting or Key Value only when multi-instance behavior requires it;
- add dedicated log retention and paid observability based on incident and compliance requirements;
- reassess whether Render remains the correct platform before a material migration cost is created.

## Cost model

These are BSS planning envelopes, not provider quotations. Exact amounts must be confirmed in the provider dashboard before purchase.

| Stage | Expected monthly envelope | Assumptions |
|---|---:|---|
| Development and preview | USD 0–15 | Cloudflare static hosting, temporary backend/database resources, no real data |
| Controlled pilot | USD 50–80 | Render Pro USD 25, production app+DB around the documented USD 13 entry point, separate staging usage, small backup/monitoring overhead |
| Around 20 companies | USD 90–180 | larger backend and DB, persistent staging, more storage/logging and backup retention |
| Early growth | USD 250–600 | HA database consideration, multiple runtime instances, worker/cache and stronger observability |

The controlled-pilot budget should reserve at least USD 80 per month even if initial usage is lower. Infrastructure cost must not be reduced by removing staging, backups, monitoring or tenant-isolation controls.

## Alternatives considered

### Railway Pro

Strengths:

- USD 20 minimum monthly usage;
- usage-based compute;
- private networking, GitHub deployment, rollbacks, health checks, backups and configurable alerts;
- 99.99% availability target and 30-day log history on Pro.

Reason not selected as the default:

- Railway is attractive for fast deployment, but its database product is presented primarily as deploying an open-source database with volumes and backups. For the BSS baseline, Render currently documents managed PostgreSQL, PITR, private networking and optional HA more explicitly.
- Railway remains the first fallback if Render deployment or pricing proves unsuitable during a short proof of concept.

### Hetzner Cloud

Strengths:

- excellent raw compute price in German and Finnish regions;
- predictable monthly caps;
- inexpensive daily server backups and optional load balancers.

Reason rejected for the pilot baseline:

- BSS would own operating-system patching, PostgreSQL upgrades, replication, PITR, firewalling, TLS termination, monitoring, restore automation and incident response;
- the lower invoice would create a much larger hidden operations burden and single-person knowledge risk.

Hetzner may become appropriate later with a managed operations provider or an internal DevOps owner.

### AWS, Azure or Google Cloud

Deferred rather than rejected. These platforms provide mature managed services and contractual options, but their complexity and cost controls are disproportionate for the first BSS pilot. Re-evaluate when procurement requirements, customer security questionnaires, regional redundancy or enterprise contracts demand them.

## Security and networking rules

- PostgreSQL must use the private internal connection path; public database access is disabled or restricted to explicit temporary administrative IPs.
- Production secrets live only in the provider secret store and GitHub environment secrets where required.
- No secret is copied into repository files, screenshots, support tickets or chat history.
- The API domain is proxied through Cloudflare with TLS enforced.
- CORS is restricted to approved BSS origins.
- Rate limits are tenant-aware and suitable for multi-instance deployment before horizontal scaling.
- Administrative database access is time-limited, audited and removed after use.
- Production logs must redact credentials, session tokens, raw RFID identifiers and unnecessary personal data.

## Backup and disaster-recovery baseline

Required before real pilot data:

1. provider PITR is enabled and its effective recovery window is recorded;
2. encrypted logical backups run on a defined schedule and are copied outside the primary database service;
3. backup retention and deletion are documented;
4. one full restore into an isolated environment succeeds;
5. restored data passes schema, tenant-isolation and application smoke checks;
6. RPO and RTO are approved after the drill rather than guessed;
7. the date, operator, duration and result of every restore drill are recorded.

Proposed pilot targets for validation:

- **RPO:** 24 hours for the independent logical backup, with provider PITR offering a materially smaller loss window;
- **RTO:** four hours for a documented pilot restore and service recovery.

These targets remain `PROPOSED` until a real drill proves them.

## Observability baseline

Before production:

- structured backend logs with request, organization and correlation IDs but no secret or unnecessary personal data;
- application error tracking for frontend and backend;
- uptime checks for public health endpoints;
- alerts for repeated 5xx errors, failed migrations, database saturation, disk growth, failed backups and terminal-sync backlog;
- named alert recipients and escalation expectations;
- a dashboard that distinguishes staging from production.

## Deployment and migration rules

- only a protected release path may deploy production;
- production deploys require green repository checks and an approved release record;
- database migrations run as an explicit pre-deploy step with a tested rollback or forward-repair strategy;
- the application must remain compatible with the previous schema during rolling deployment where practical;
- every release records application SHA, migration version, operator, time and rollback reference;
- emergency rollback must not silently reverse an irreversible data migration.

## Mandatory release gates

BSS may not accept real employee data until all are evidenced:

- issue `#55` is complete and Backend Phase B is in the authoritative `main`;
- staging is provisioned from versioned configuration;
- production and staging separation is verified;
- DPA/subprocessor and EU-region review is complete;
- secrets and administrative access controls are verified;
- migration rehearsal passes on staging;
- provider PITR and independent logical restore drills pass;
- monitoring and alert delivery are tested;
- tenant-isolation, authentication and authorization suites pass in the deployed environment;
- load and soak criteria for the pilot pass;
- incident, rollback and customer-notification ownership is documented;
- `BSS_READINESS_MATRIX.md` production blockers are updated from evidence, not assumption.

## Open questions

- exact Render database compute/storage plan after representative load testing;
- whether the two founders require Render Pro from the first staging deployment or only before production access;
- final off-platform backup destination and encryption-key ownership;
- Sentry EU-region and retention configuration for employee-related metadata;
- final Cloudflare zone, WAF and Access rules for API, staging and Preview;
- final customer-facing RPO, RTO and support commitments.

## Review trigger

Review this ADR when any of the following occurs:

- pilot load exceeds the current sizing thresholds;
- a customer requires a specific cloud provider or certification;
- monthly infrastructure spend exceeds USD 250 for two consecutive months;
- a significant platform incident or missing feature changes the risk assessment;
- BSS hires a dedicated operations owner;
- production architecture requires more than one region.
