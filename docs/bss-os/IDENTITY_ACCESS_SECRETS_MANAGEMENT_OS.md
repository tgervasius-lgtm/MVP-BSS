# BSS Identity, Access & Secrets Management Operating System

Status: `PROPOSED v0.1 / FOUNDER AND TECHNICAL-SECURITY APPROVAL REQUIRED`

Owner: BSS founders

Related issues: #95, #55, #59, #62, #64, #66, #75, #85, #87 and #93

## 1. Purpose

This document defines how BSS requests, approves, provisions, reviews, changes, suspends, revokes and evidences access to company systems and data.

It also defines how BSS creates, stores, distributes, rotates, revokes and recovers:

- passwords;
- API keys;
- personal access tokens;
- database credentials;
- deployment credentials;
- SSH keys;
- signing keys;
- recovery codes;
- service-account credentials;
- device and terminal secrets;
- integration credentials;
- other authentication material.

The objectives are to prevent:

- one founder being the only person who can recover a critical account;
- contractors retaining access after work ends;
- personal accounts becoming the sole custody point for BSS systems;
- shared credentials with no accountable owner;
- production access being granted because someone can technically obtain it;
- secrets being stored in source code, chat, screenshots or public documents;
- dormant accounts remaining active;
- leaked credentials remaining valid;
- service accounts with no owner or decommission path;
- customer data being accessed without a defined purpose and approval;
- emergency access becoming permanent access;
- lost devices exposing company or customer systems;
- a vendor controlling source systems, recovery methods or signing material.

This is operational security governance. It does not replace a professional security assessment, legal advice, data-protection review, employment process, customer-specific contract or provider-specific implementation guide.

## 2. Core principles

1. Identity, authorization, active access and credential possession are separate concepts.
2. Every human access path is attributable to one named person.
3. Shared accounts are prohibited by default.
4. Every machine identity has a defined owner, purpose and lifecycle.
5. Access is least-privilege and limited to the shortest practical duration.
6. Access must be approved before provisioning.
7. A contract, role title, merged pull request or customer request does not automatically authorize production access.
8. MFA is required wherever the provider supports it for critical BSS systems.
9. Company-critical systems must not depend on one personal mailbox, phone or recovery method.
10. Secrets are stored only in approved private systems.
11. Secrets are never committed to the public repository.
12. Secrets are never copied into issue bodies, pull requests, screenshots, recordings or public documentation.
13. Production and customer-data access are denied by default.
14. Break-glass access is exceptional, time-limited, logged and reviewed.
15. Departed, suspended or compromised identities are revoked immediately under the applicable process.
16. Service accounts must not be used for interactive human work unless explicitly designed and approved for that purpose.
17. Every secret has an owner, system, purpose, scope, storage location and revocation path.
18. Rotation after suspected exposure is mandatory; periodic rotation intervals remain provider- and risk-specific.
19. Recovery methods are protected with the same care as primary credentials.
20. Real account identifiers, secret values, recovery codes and customer-access records remain outside the public repository.

## 3. Definitions

| Term | Meaning |
|---|---|
| Identity | A uniquely attributable human, service, workload, device or integration identity. |
| Authentication | Evidence used to prove an identity. |
| Authorization | Approved permission for an identity to perform defined actions. |
| Access | The technically active ability to use a system or resource. |
| Credential | A password, key, token, certificate, code or other authentication material. |
| Secret | Sensitive authentication or cryptographic material whose disclosure creates risk. |
| Privilege | The scope of actions an identity can perform. |
| Recovery method | A controlled method for regaining account access. |
| Service account | A non-human identity used by an application, workflow or integration. |
| Device identity | A non-human identity representing a terminal or managed device. |
| Break-glass access | Emergency access outside the normal operating path. |
| Access owner | Person accountable for deciding whether access remains justified. |
| System owner | Person accountable for the system and its access model. |
| Credential custodian | Person or system authorized to hold or recover a credential. |

## 4. Access status language

| Status | Meaning |
|---|---|
| `REQUESTED` | Access need has been recorded but not approved. |
| `UNDER REVIEW` | Purpose, scope, risk and approvers are being evaluated. |
| `APPROVED` | Access is authorized but may not yet be technically active. |
| `PROVISIONED` | Account or permission exists; validation may remain open. |
| `ACTIVE` | Access is technically active and verified. |
| `LIMITED` | Access is intentionally restricted by scope, time or environment. |
| `TEMPORARY` | Access has a defined expiry date or event. |
| `SUSPENDED` | Access is disabled temporarily pending review. |
| `EXPIRED` | Approved access period ended. |
| `REVOCATION PENDING` | Revocation is ordered but evidence is incomplete. |
| `REVOKED` | Access was removed and verified. |
| `BREAK-GLASS ACTIVE` | Emergency access is temporarily active. |
| `COMPROMISED` | Identity or credential is suspected or confirmed exposed. |
| `BLOCKED` | Access cannot safely be granted or continued. |

`APPROVED`, `PROVISIONED` and `ACTIVE` are different states.

## 5. Identity classes

| Code | Identity class | Examples | Default rule |
|---|---|---|---|
| `FND` | Founder | BSS co-founder | Named account, MFA, no unnecessary standing production access |
| `EMP` | Employee | future developer, support or operations employee | Role-based, least-privilege, joiner/mover/leaver process |
| `CTR` | Contractor | external software developer, designer | Temporary, scoped, expiry required |
| `VND` | Vendor | hosting, support or specialist provider | Contract- and task-specific access only |
| `CUS-ADM` | Customer administrator | customer-side admin | Tenant-scoped permissions only |
| `CUS-USR` | Customer user | manager, worker, accounting user | Application RBAC only |
| `SUP` | BSS support identity | support operator | No default direct database or unrestricted customer-data access |
| `AUD` | Auditor/reviewer | security or legal reviewer | Read-only and time-limited where practical |
| `SVC` | Service account | CI workflow, backend integration | Non-human, named owner, minimal scope |
| `DEV` | Device identity | BSS terminal | Unique device identity where technically supported |
| `INT` | Integration identity | email, monitoring, export integration | Purpose-limited, revocable, monitored |
| `BRK` | Break-glass identity | emergency administrator | Disabled or protected until emergency use |

## 6. System criticality tiers

| Tier | Description | Examples | Minimum control level |
|---|---|---|---|
| `I1 — Low` | Public or low-impact internal system | public research workspace | Named account where available |
| `I2 — Internal` | Internal business information | project planning, non-sensitive documentation | MFA where supported, access review |
| `I3 — Sensitive` | Source, contracts, private CRM or operational data | private repository, CRM, support evidence | MFA, least privilege, logging, controlled recovery |
| `I4 — Critical` | Production, customer data, domain, email, finance or root administration | production hosting, DNS, bank, password manager | strongest available MFA, two-person continuity, break-glass and recovery evidence |

Criticality is based on impact, not convenience.

## 7. Authoritative access inventory

The public repository contains only the template and control rules. The real inventory must be stored in a private BSS-controlled system.

### 7.1 Required inventory fields

| Field | Required content |
|---|---|
| System ID | Internal identifier |
| System name | Provider/product name |
| Business purpose | Why BSS uses it |
| Criticality tier | `I1`–`I4` |
| System owner | Named accountable owner |
| Backup owner | Named continuity owner |
| Identity type | Human, service, device or integration |
| Account identifier | Stored privately |
| Role/permission | Current effective privilege |
| Environment | Preview, staging, production, corporate or customer-specific |
| Customer-data access | None, metadata, limited or direct |
| MFA method | Provider-supported method |
| Recovery method | Stored privately |
| Credential location | Password manager or managed secret store reference |
| Approval record | Decision reference |
| Provisioned date | Date/time |
| Expiry/review date | Date or event |
| Last reviewed | Date and reviewer |
| Status | Access status |
| Revocation method | How to disable access |
| Evidence reference | Private proof link |

### 7.2 Minimum systems to inventory

- GitHub and source repositories;
- company email and administrative mailbox;
- domain registrar and DNS/Cloudflare;
- hosting and infrastructure provider;
- managed database;
- monitoring, logging and error tracking;
- password manager;
- CRM and prospect records;
- accounting and finance systems;
- bank and payment provider;
- customer support channels;
- design and CAD source systems;
- artifact and release storage;
- code-signing or package-signing systems;
- CI/CD and deployment identities;
- terminal provisioning and device-management systems;
- backup and recovery systems;
- legal and contract storage;
- grant/subsidy records;
- future HR/payroll systems.

## 8. Access decision roles

| Role | Responsibility |
|---|---|
| Requester | Explains the business need and requested duration. |
| Subject | Person or service receiving access. |
| System owner | Confirms technical scope and least privilege. |
| Data owner | Approves customer/personal-data access where applicable. |
| Security reviewer | Reviews high-risk or critical access. |
| Founder approver | Approves according to Founder OS and risk level. |
| Provisioner | Implements access without self-approving it where separation is practical. |
| Reviewer | Verifies effective permissions and evidence. |
| Revocation owner | Ensures access is removed and verified. |

One person may hold several roles in an early-stage company, but the record must show which responsibility was performed.

## 9. Access request record

Every non-trivial access grant requires a record.

| Field | Required content |
|---|---|
| Request ID | Internal identifier |
| Subject identity | Named person/service/device |
| System/resource | Exact target |
| Environment | Preview, staging, production or corporate |
| Requested role | Exact permission level |
| Business purpose | Specific task or responsibility |
| Data involved | None, internal, customer, employee or special category |
| Start date | Planned activation |
| Expiry/event | End date or revocation trigger |
| Existing access | Current permissions |
| Alternative considered | Lower-privilege option |
| Risk tier | `I1`–`I4` system impact |
| Approvers | Required owners |
| Provisioner | Named implementer |
| Validation | Evidence access matches approval |
| Status | Current lifecycle state |

### 9.1 Hard blockers

Do not grant access when:

- purpose is vague;
- account ownership is unclear;
- a shared credential is proposed without approved exception;
- MFA is available but intentionally disabled without approved exception;
- requested privilege exceeds the documented task;
- production access is requested only for convenience;
- customer-data purpose or authority is unclear;
- vendor agreement or confidentiality requirement is unresolved;
- no revocation method exists;
- no system owner or accountable approver exists;
- access would make one vendor the sole custodian of a critical system;
- a compromised identity has not been remediated;
- secrets would need to be transmitted through an unapproved channel.

## 10. Least-privilege rules

1. Prefer read-only over write.
2. Prefer repository-level over organization-level access.
3. Prefer project-specific over company-wide access.
4. Prefer Preview over staging and staging over production.
5. Prefer temporary elevation over permanent administration.
6. Prefer application support tools over direct database access.
7. Prefer tenant-scoped support views over unrestricted multi-tenant data access.
8. Prefer managed deployment roles over raw infrastructure credentials.
9. Prefer service-specific tokens over broad personal access tokens.
10. Prefer provider roles over shared root credentials.
11. Remove unused permissions instead of keeping them “just in case.”
12. Do not give a vendor billing, domain, production and repository administration unless each permission is separately justified.

## 11. Separation of duties

Where practical:

- the requester does not self-approve critical access;
- the developer does not unilaterally approve and deploy a high-risk production change;
- the person accepting vendor work is not the only person authorizing payment;
- bank/payment authority is separated from invoice preparation;
- production database access is separated from ordinary support access;
- secret creation and secret consumption are logged independently where providers support it;
- break-glass activation and post-use review are performed by different people where possible.

Early-stage limitations must be recorded as risks, not hidden.

## 12. Joiner workflow

Before a founder, employee, contractor or vendor receives access:

1. Confirm identity and engagement status privately.
2. Define role, scope and expected duration.
3. Identify required systems only.
4. Complete access requests and approvals.
5. Create named accounts using controlled business email where appropriate.
6. Enforce MFA.
7. Store recovery material in the approved private system.
8. Provide only the minimum role.
9. Validate effective permissions.
10. Record expiry or review date.
11. Explain security, customer-data and secret-handling rules.
12. Confirm access does not depend on a personal device without protective controls.
13. Store evidence in the private access register.

No onboarding checklist item may contain actual passwords, keys or recovery codes.

## 13. Mover workflow

When responsibilities change:

1. Review all existing access, not only new access.
2. Remove permissions no longer required.
3. Add new permissions through the normal approval path.
4. Reassess production and customer-data access.
5. Update expiry dates and owners.
6. Rotate credentials when role change creates exposure risk.
7. Validate the final effective permission set.
8. Record the decision and evidence.

A promotion or expanded project scope does not justify retaining all previous access indefinitely.

## 14. Leaver and vendor-offboarding workflow

Revocation begins before or at the effective end of access.

### 14.1 Required actions

- suspend or remove human accounts;
- remove organization, repository and team memberships;
- revoke active sessions;
- revoke personal access tokens and SSH keys;
- rotate shared or potentially known secrets;
- remove infrastructure, database and monitoring access;
- remove domain/DNS, email and support access;
- transfer ownership of files, repositories, dashboards and devices;
- return or wipe BSS devices;
- remove customer-specific access;
- disable service accounts created solely for the engagement;
- review audit logs for unexpected recent activity;
- verify no vendor-controlled recovery method remains;
- update the private access inventory;
- record revocation evidence.

### 14.2 Urgent revocation triggers

- suspected malicious activity;
- compromised device or account;
- unapproved copying of data or credentials;
- contract termination for cause;
- refusal to return BSS assets;
- access outside agreed scope;
- loss of trust in a critical administrator;
- confirmed secret exposure.

## 15. MFA baseline

MFA is required where supported for:

- GitHub;
- company email;
- domain registrar and DNS;
- cloud hosting and database;
- password manager;
- monitoring and error tracking;
- finance and banking;
- CRM and customer-support systems;
- backup systems;
- release/signing systems;
- administrative customer portals.

### 15.1 MFA preference order

Subject to provider support and approved implementation:

1. phishing-resistant hardware/security key;
2. platform passkey or security-key-backed method;
3. authenticator application;
4. provider recovery process;
5. SMS only when stronger options are unavailable and risk is accepted.

Exact rollout and mandatory security-key requirements remain `OPEN` until approved.

### 15.2 MFA rules

- MFA enrollment must be verified before critical access becomes `ACTIVE`.
- Recovery codes are secrets.
- Recovery codes must not be stored with the same single point of failure as the primary authenticator.
- Personal phone loss must not permanently lock BSS out of a company-critical system.
- MFA reset is a security-sensitive event and requires identity verification and evidence.
- Provider “remember this device” options must be risk-reviewed for critical systems.

## 16. Recovery and continuity

Every `I4` system requires:

- primary owner;
- backup owner;
- controlled recovery method;
- evidence that recovery information is current;
- documented provider recovery path;
- test or tabletop review at an approved cadence;
- no dependency on one personal mailbox or phone;
- clear action if a founder is unavailable.

Recovery evidence must confirm availability without exposing the recovery secret in the evidence itself.

## 17. Password manager requirements

The approved password manager must support, where practical:

- company-controlled vaults;
- named users;
- MFA;
- role-based sharing;
- access revocation;
- audit history;
- emergency/recovery process;
- export/backup governance;
- separation of personal and company credentials.

### 17.1 Prohibited practices

- passwords in source code;
- passwords in public or private GitHub issues;
- passwords in ordinary chat messages;
- passwords in screenshots or screen recordings;
- credentials in unencrypted spreadsheets;
- reuse of personal passwords for company systems;
- one founder keeping all recovery data only on a personal device;
- vendor-exclusive storage of BSS credentials.

## 18. Service-account lifecycle

Every service account must have:

| Field | Required content |
|---|---|
| Service identity ID | Internal identifier |
| System/provider | Where it exists |
| Technical purpose | Exact workload or integration |
| Human owner | Accountable BSS owner |
| Backup owner | Continuity owner |
| Environment | Preview, staging or production |
| Permissions | Minimal effective scope |
| Credential type | Token, key, certificate or managed identity |
| Secret location | Approved private store reference |
| Consumers | Workflows/services using it |
| Created date | Timestamp |
| Review/expiry | Date or event |
| Rotation triggers | Exposure, ownership, provider or policy event |
| Logs | Available audit source |
| Revocation method | Disable/delete path |
| Decommission dependency | What must be changed first |
| Status | Lifecycle state |

### 18.1 Service-account rules

- no anonymous service account;
- no account named only “admin” without purpose and owner;
- no interactive login unless required and approved;
- no personal mailbox as the service identity owner where avoidable;
- no broad organization token when repository-specific scope works;
- no production token reused in Preview;
- no secret shared across unrelated services when separate credentials are practical;
- no orphaned account after integration removal;
- no hidden vendor-owned integration identity.

## 19. Device and terminal identities

Where the final architecture supports device identities, every deployed BSS terminal should have:

- BSS asset ID;
- unique device identity;
- assigned tenant/site;
- configuration version;
- certificate/key or approved authentication method;
- provisioning date and owner;
- last-seen and health evidence;
- revocation capability;
- replacement/reprovisioning process;
- secret-rotation process;
- secure retirement/data-wipe process.

A single credential reused across all customer terminals is prohibited unless a documented architecture decision proves why it is unavoidable and defines compensating controls and migration.

Hardware and device-secret implementation remains `BLOCKED` by actual hardware architecture and issue #60.

## 20. Secret classification

| Class | Description | Examples | Handling expectation |
|---|---|---|---|
| `S0 — Public` | Not secret | public keys intended for publication | Public handling permitted |
| `S1 — Internal` | Limited internal sensitivity | non-production low-impact token | Approved private storage |
| `S2 — Sensitive` | Material system or data access | private repository token, staging database credential | Managed secret storage, restricted access |
| `S3 — Critical` | Production, finance, domain or broad customer-data access | production DB, DNS admin, bank recovery | Strongest controls, minimal custodians, recovery plan |
| `S4 — Cryptographic root` | Signing, root CA or equivalent trust anchor | signing private key, root recovery material | Specialized custody, dual-control consideration, explicit external review |

Classification is based on impact if disclosed, not on token length or provider name.

## 21. Approved secret storage model

| Secret use | Preferred storage category |
|---|---|
| Human credentials | Company password manager |
| CI/CD secrets | GitHub Actions environment/repository secrets or approved provider secret store |
| Runtime application secrets | Managed environment secret/configuration store |
| Database credentials | Provider-managed or approved secret store |
| Local developer secrets | Local environment file excluded from version control and documented secure setup |
| Recovery material | Protected recovery vault with continuity controls |
| Device secrets | Approved provisioning/device-management mechanism |
| Signing keys | Dedicated protected storage appropriate to risk |

Actual provider selection and configuration remain subject to issue #59 and security review.

## 22. Secret creation and issuance

1. Define purpose and consumer.
2. Select the narrowest scope.
3. Choose the correct environment.
4. Create through an approved provider or secure generation process.
5. Store directly in the approved secret system.
6. Avoid displaying or copying the value unnecessarily.
7. Record metadata without recording the value.
8. Configure the consuming service.
9. Validate function without exposing the secret in logs.
10. Remove temporary copies.
11. Record owner, revocation method and rotation triggers.
12. Confirm monitoring/logging does not print the secret.

## 23. Secret metadata register

Store metadata privately without the secret value.

| Field | Required content |
|---|---|
| Secret ID | Internal identifier |
| Secret class | `S1`–`S4` |
| Provider/system | Target system |
| Purpose | Exact use |
| Environment | Preview, staging, production or corporate |
| Owner | Accountable human |
| Backup owner | Continuity owner |
| Consumer identities | Services/users allowed to use it |
| Scope | Effective permission |
| Storage reference | Private vault reference |
| Created | Date |
| Last rotated | Date |
| Rotation trigger | Events requiring replacement |
| Expiry | Provider expiry if applicable |
| Revocation path | How to invalidate it |
| Exposure status | No indication, suspected or confirmed |
| Evidence | Private audit reference |

## 24. Rotation requirements

Mandatory rotation triggers include:

- suspected or confirmed disclosure;
- secret committed to source history;
- secret printed in logs or support evidence;
- employee/contractor/vendor departure when they knew or could access it;
- lost or compromised device;
- ownership change;
- privilege reduction;
- provider breach or provider recommendation;
- environment cloning that copied secrets improperly;
- customer termination for customer-specific credentials;
- algorithm/key-strength concern;
- break-glass use where policy requires replacement;
- unknown custody or missing inventory evidence.

Periodic rotation intervals remain `OPEN` by secret class and provider. Event-driven rotation does not wait for the periodic date.

## 25. Secret rotation procedure

1. Classify exposure and affected systems.
2. Assign incident/security owner.
3. Limit or suspend affected access.
4. Create replacement credential with minimal scope.
5. Update consumers in a controlled sequence.
6. Validate new credential.
7. Revoke old credential.
8. Confirm the old credential no longer works where safe to test.
9. Search source, logs, artifacts and documentation for exposure.
10. Remove exposed copies where technically and legally appropriate.
11. Assess customer/personal-data implications.
12. Record timeline and evidence.
13. Update secret metadata.
14. Complete post-incident corrective actions.

Rewriting Git history alone is not sufficient; the exposed credential must be revoked.

## 26. GitHub access controls

### 26.1 Human access

- named accounts only;
- MFA required;
- least repository/organization role;
- no direct `main` pushes where branch protection applies;
- required PR workflow and checks;
- review of organization owners and repository admins;
- remove inactive collaborators;
- no vendor as sole organization owner;
- avoid broad classic personal access tokens where narrower methods exist;
- SSH and signing keys attributable to the user.

### 26.2 Repository secrets

- no secret values in repository files;
- no production secret available to Preview-only workflow;
- separate environment secrets;
- protected production environment where implementation permits;
- limited workflow permissions;
- pinned and reviewed third-party Actions per repository policy;
- audit secret access and workflow changes where provider logs permit;
- rotate credentials after workflow compromise.

## 27. CI/CD and automation identities

Every automation must define:

- triggering event;
- repository/environment scope;
- token permissions;
- artifact permissions;
- deployment authority;
- secret dependencies;
- logs and audit source;
- failure behavior;
- revocation/decommission path.

Default workflow permissions should be read-only unless write is explicitly required.

A workflow capable of deploying production must not automatically gain unrelated organization, billing or secret-administration privileges.

## 28. Environment separation

Preview, staging/pilot and production must use separate credentials where practical.

Rules:

- never copy production secrets into Preview fixtures;
- never use customer credentials in local development;
- never use one database credential across unrelated environments when separation is available;
- environment naming must be unambiguous;
- secret owner and consumer must know the environment;
- rollback and restore credentials must be separately controlled;
- production access must not be inferred from staging access.

## 29. Production access

Production access is `DENY BY DEFAULT`.

Before access becomes `ACTIVE`, require:

- specific task or standing responsibility;
- approved role and duration;
- MFA;
- least privilege;
- logging capability;
- customer/personal-data purpose review where applicable;
- confidentiality and vendor controls where applicable;
- revocation method;
- backup/continuity owner;
- post-access validation.

Standing production administrator access should be minimized. Temporary elevation is preferred where practical.

## 30. Customer and employee data access

Access to customer employee records requires:

- defined support/operational purpose;
- correct controller/processor context;
- approved BSS role;
- tenant-scoped access where technically possible;
- minimum data needed;
- auditability;
- no local uncontrolled copies;
- no use for product development unless separately lawful and approved;
- no disclosure to unrelated vendors;
- closure evidence after the support purpose ends.

Direct database access to solve an ordinary support question is prohibited when a safer application-level method exists.

## 31. Support access

Support identities should use:

1. application-level diagnostic views;
2. tenant-scoped impersonation/support tools with audit where designed and approved;
3. read-only operational metadata;
4. direct database access only as an exceptional controlled action.

Support staff must not silently modify attendance evidence. Corrections follow the authorized audit workflow.

## 32. Vendor and contractor access

Vendor access requires alignment with the External Developer & Vendor Management Pack.

Minimum controls:

- named identity;
- exact scope and engagement;
- expiry date/event;
- MFA;
- BSS-controlled repository/workspace;
- no production/customer data by default;
- no vendor-owned recovery method;
- offboarding and secret-rotation trigger;
- deliverable and access review before final payment/closure;
- subcontractor disclosure where applicable.

## 33. Shared-account exception

A shared account may be considered only when a provider does not support named users and the business need is material.

Required exception record:

- provider limitation;
- affected system and criticality;
- named custodians;
- approved vault location;
- MFA/recovery design;
- access logging limitations;
- rotation trigger;
- replacement/migration plan;
- expiry/review date;
- founder approval;
- security risk acceptance.

The exception does not normalize shared accounts elsewhere.

## 34. Break-glass access

Break-glass access is for emergencies such as:

- primary administrators unavailable;
- critical account lockout;
- production incident requiring urgent elevated access;
- active compromise requiring immediate control recovery.

### 34.1 Break-glass record

| Field | Required content |
|---|---|
| Event ID | Incident/change reference |
| Reason | Why normal access was insufficient |
| Approver | Authorized person |
| Activator | Person using access |
| Start time | Activation timestamp |
| Expected expiry | Maximum required duration |
| Systems | Exact scope |
| Actions planned | Intended changes |
| Monitoring | Audit/log source |
| End time | Deactivation timestamp |
| Credentials rotated | Yes/no/not applicable |
| Post-use review | Findings and actions |

### 34.2 Break-glass rules

- do not use for convenience;
- activate the smallest scope;
- notify the second founder/owner as soon as practical;
- record actions contemporaneously where safe;
- disable access immediately after the emergency;
- rotate affected secrets when required;
- complete post-use review;
- investigate any unlogged or unexplained use.

## 35. Access review cadence

The actual cadence remains subject to approval. At minimum, reviews are triggered by:

- role or engagement change;
- customer pilot start/end;
- production launch;
- provider change;
- security incident;
- founder unavailability plan change;
- vendor offboarding;
- material system expansion;
- evidence of dormant or excessive access.

### 35.1 Review questions

- Does the identity still need access?
- Is the scope still minimal?
- Is production access still justified?
- Is customer-data access still justified?
- Is MFA active?
- Is recovery current?
- Are tokens/keys attributable and inventoried?
- Is expiry defined?
- Are there dormant sessions or credentials?
- Does the backup owner still work?
- Is any vendor the sole custodian?
- Are service accounts still used?
- Are old environments and integrations retired?

## 36. Dormant account and credential cleanup

A dormant account is not automatically safe.

Process:

1. Confirm last meaningful use.
2. Confirm business owner and current need.
3. Suspend when uncertain and operationally safe.
4. Revoke unused tokens, keys and sessions.
5. Transfer required ownership.
6. Delete when retention is unnecessary and safe.
7. Record evidence.
8. Rotate secrets if custody is uncertain.

Exact inactivity thresholds remain `OPEN` by provider and risk.

## 37. Logging and monitoring expectations

For critical systems, retain or review where available:

- login and failed-login events;
- MFA changes;
- recovery-method changes;
- role and permission changes;
- token/key creation and revocation;
- secret/configuration changes;
- production deployment access;
- database administrative activity;
- domain/DNS changes;
- organization-owner changes;
- break-glass activation;
- unusual geographic/device access;
- customer-data export or bulk access events.

Log retention and alert thresholds depend on the final infrastructure and legal/privacy baseline.

## 38. Compromised account response

1. Treat the account as `COMPROMISED` or suspected compromised.
2. Suspend sessions and access.
3. Preserve relevant logs.
4. Reset authentication and recovery methods.
5. Revoke tokens, keys and application passwords.
6. Check role/permission changes.
7. Review recent commits, deployments, exports and configuration changes.
8. Rotate related secrets.
9. Assess customer/personal-data exposure.
10. Follow Support & Incident and GDPR/legal escalation where applicable.
11. Restore only the minimum access after identity verification.
12. Record evidence and corrective actions.

## 39. Lost or stolen device response

For a device with BSS access:

- report immediately;
- identify accounts, sessions, keys and locally stored data;
- revoke sessions and device trust where possible;
- rotate accessible secrets;
- remote lock/wipe if approved and available;
- assess customer-data exposure;
- replace MFA/recovery method safely;
- inspect audit logs;
- record asset status under the Asset Management OS;
- complete incident review.

A device being protected by a screen lock does not eliminate the need for assessment.

## 40. Secret exposure in Git history

Required response:

1. Revoke the exposed secret immediately.
2. Create and deploy a replacement.
3. Identify affected environments and consumers.
4. Search logs and audit events for use.
5. Assess data/security impact.
6. Remove the secret from active files.
7. Decide whether history rewrite is necessary and safe.
8. Invalidate cached artifacts where applicable.
9. document the incident without repeating the secret;
10. improve scanning/prevention controls.

A history rewrite without revocation is incomplete remediation.

## 41. Local development rules

- use fictional or sanitized data;
- use separate non-production credentials;
- keep local environment files out of version control;
- do not paste secrets into coding assistants or public support channels;
- do not store secrets in shell history when safer methods exist;
- protect local devices with OS authentication and updates;
- revoke local credentials when a device or developer leaves;
- document setup using placeholders only;
- use `.env.example` files without real values.

## 42. Customer-admin identity lifecycle

Customer-admin accounts require:

- customer authorization;
- tenant-scoped role;
- unique identity;
- MFA when supported by the final product;
- invitation/activation evidence;
- role-change process;
- suspension and offboarding path;
- audit of high-risk administration actions;
- no cross-tenant access.

Final application implementation depends on issue #55 and verified RBAC/tenant-isolation evidence.

## 43. Exception management

Any exception to this OS requires:

| Field | Required content |
|---|---|
| Exception ID | Internal reference |
| Rule affected | Exact section/control |
| Business reason | Why compliance is not currently possible |
| Systems/data | Affected scope |
| Risk | Security, privacy, continuity and customer impact |
| Compensating controls | Temporary protection |
| Owner | Accountable person |
| Approvers | Required founder/security/legal owner |
| Start | Effective date |
| Expiry | Mandatory review/end date |
| Remediation plan | Path to remove exception |
| Status | Open, accepted, expired or closed |

Permanent exceptions are not allowed without periodic reapproval.

## 44. Metrics

Proposed internal metrics:

- percentage of critical systems with primary and backup owner;
- percentage of critical accounts with MFA verified;
- number of shared-account exceptions;
- number of dormant accounts;
- number of expired temporary accesses still active;
- time from offboarding trigger to verified revocation;
- number of orphaned service accounts;
- number of secrets with unknown owner;
- number of secrets exposed in code/logs;
- time from exposure detection to revocation;
- percentage of production access with current approval;
- number of break-glass uses and overdue reviews;
- percentage of critical systems with tested recovery path.

Actual targets remain `OPEN` until operating evidence exists.

## 45. Operating cadence

### Event-driven

- joiner, mover and leaver actions;
- vendor start/end;
- compromised account;
- secret exposure;
- production release/change;
- lost device;
- customer pilot start/end;
- provider migration.

### Periodic

- critical access review;
- service-account review;
- shared-account exception review;
- recovery continuity review;
- dormant-account cleanup;
- secret metadata review;
- break-glass readiness review.

Exact periodic frequencies remain subject to founder and technical-security approval.

## 46. Private system requirements

Real records must be kept in a private BSS-controlled system with:

- restricted named access;
- MFA;
- backup/recovery;
- audit history;
- export capability;
- ownership continuity;
- no public links;
- no credential values in ordinary issue trackers;
- separation between metadata and secret values where practical.

The public repository stores policy, templates, fictional examples and non-sensitive evidence references only.

## 47. Fictional dry run A — contractor onboarding and offboarding

All details are fictional.

### Scenario

A fictional external frontend contractor needs access for a two-week Preview accessibility task.

### Request

- Identity class: `CTR`.
- System: one repository.
- Environment: Preview only.
- Permission: repository write through branch/PR flow.
- Production access: none.
- Customer data: none.
- Duration: fictional two-week period.
- MFA: required.
- Expiry: engagement end.

### Provisioning result

1. Named GitHub account verified.
2. Repository-scoped permission granted.
3. Organization owner role not granted.
4. Production secrets not granted.
5. Preview fixtures remain fictional.
6. Expiry and offboarding owner recorded.
7. Effective permissions validated.

### Offboarding result

1. Repository access removed.
2. Active sessions/tokens reviewed.
3. No BSS-owned secret was shared.
4. Work and handoff evidence remained in BSS-controlled repository.
5. Access inventory status changed to `REVOKED`.
6. Revocation evidence stored privately.

Result: `PASS` for the fictional governance dry run.

This does not prove the real GitHub organization access inventory is complete.

## 48. Fictional dry run B — leaked staging token

All details are fictional.

### Scenario

A fictional staging API token appears in a CI log.

### Response

1. Token classified `S2 — Sensitive`.
2. Incident owner assigned.
3. Workflow paused.
4. Replacement token created with reduced scope.
5. Consumers updated.
6. Old token revoked.
7. Revocation tested.
8. Logs and source searched for additional exposure.
9. No production credential shared the token.
10. Audit events reviewed.
11. Logging configuration corrected.
12. Secret metadata updated.
13. Post-incident review recorded.

Result: `PASS` for the fictional rotation workflow.

This does not prove any real provider token has been rotated or any real log retention exists.

## 49. Evidence index

| Evidence ID | Required evidence |
|---|---|
| `IAM-001` | Approved Identity, Access & Secrets OS version |
| `IAM-002` | Private system access inventory exists |
| `IAM-003` | Critical system primary/backup ownership evidence |
| `IAM-004` | MFA verification for critical systems |
| `IAM-005` | Joiner/mover/leaver procedure evidence |
| `IAM-006` | Vendor/contractor access expiry and revocation evidence |
| `IAM-007` | Service-account inventory and ownership evidence |
| `IAM-008` | Secret metadata register evidence |
| `IAM-009` | Environment-separation and CI/CD secret evidence |
| `IAM-010` | Production access approval and logging evidence |
| `IAM-011` | Break-glass readiness and post-use review evidence |
| `IAM-012` | Access review and dormant-account cleanup evidence |
| `IAM-013` | Recovery continuity test/tabletop evidence |
| `IAM-014` | Compromised-account or secret-rotation drill evidence |
| `IAM-015` | Offboarding continuity and no-sole-vendor-custody evidence |

## 50. Approval gates

### `G1 — Governance approved`

- founders approve ownership and decision rights;
- actual access approvers are named privately;
- exception authority is defined.

### `G2 — Critical accounts controlled`

- critical systems inventoried;
- MFA verified;
- primary and backup recovery exist;
- no unexplained shared/root custody.

### `G3 — Technical implementation proven`

- environment secrets separated;
- service accounts inventoried;
- production access path and logging tested;
- revocation and rotation tested.

### `G4 — Pilot/production readiness`

- customer-data access model approved;
- offboarding drill passed;
- break-glass/recovery drill passed;
- unresolved critical access or secret blocker absent.

Merging this document satisfies none of `G2`–`G4` by itself.

## 51. Open decisions

The following remain `OPEN`:

- approved password manager;
- mandatory hardware/security-key scope;
- exact periodic access-review cadence;
- exact periodic secret-rotation intervals;
- production access authority;
- private access-register system;
- break-glass account/provider design;
- device identity and terminal secret architecture;
- code-signing key custody;
- customer support impersonation model;
- customer-admin MFA implementation;
- provider-specific log retention and alerts;
- formal joiner/mover/leaver owners after company formation.

## 52. Relationship to other BSS OS documents

- Founder roles and critical continuity: `FOUNDER_OPERATING_SYSTEM.md`.
- Vendor access and offboarding: `EXTERNAL_DEVELOPER_VENDOR_MANAGEMENT_PACK.md`.
- Infrastructure and environments: `ADR-001-INFRASTRUCTURE-BASELINE.md`.
- Release and emergency changes: `RELEASE_CHANGE_PRODUCT_COMMUNICATION_OS.md`.
- Support/security incidents: `SUPPORT_INCIDENT_OPERATING_SYSTEM.md`.
- GDPR and employee data: `GDPR_DATA_GOVERNANCE_BASELINE.md`.
- Legal templates and DPA path: `LEGAL_OPERATIONS_TEMPLATE_PACK.md`.
- Hardware/device lifecycle: `PROCUREMENT_INVENTORY_ASSET_MANAGEMENT_OS.md`.
- Pilot readiness: `PILOT_READINESS_PACKAGE.md`.

## 53. Final boundary

This OS creates a controlled operating model. It does not prove:

- that all real accounts are inventoried;
- that MFA is enabled everywhere;
- that production access is secure;
- that customer data is currently processed;
- that recovery has been tested;
- that secrets have been rotated;
- that device identities exist;
- that BSS is production-ready.

Those claims require private implementation evidence and the applicable readiness gates.