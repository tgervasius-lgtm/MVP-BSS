# BSS v1 Design Foundation

## 0. Metadata and status boundary

| Field | Value |
|---|---|
| Name | BSS v1 Design Foundation |
| Version | 1.0 |
| Status | **PROPOSED / NOT ACCEPTED** |
| Date | 04.09.2026 |
| Issue | #156 |
| Proposal baseline | protected `main` at `43565ab6c3117369d46a33270eace283110f37ca` |
| Product authority | `BSS_V1_PRODUCT_CONTRACT.md` v1.0 — **ACCEPTED / FROZEN** |
| Current UI / gap authority | `BSS_SCREEN_MAP_V1.md` |
| Machine-readable screen/API evidence | `backend/contracts/frontend-screen-api-map-v1.json` |
| Existing visual/interactions baseline | `BSS_DESIGN_SYSTEM_V1.md` |
| Preview authority | **NONE — inventory only** |
| Figma | **CANDIDATE / INACTIVE** |
| Storybook | **CANDIDATE / INACTIVE** |

The status boundary is strict:

> **PROPOSED / NOT ACCEPTED**
>
> != ACCEPTED
>
> != IMPLEMENTED
>
> != EVIDENCE PROVEN
>
> != STAGING READY
>
> != PILOT PASS
>
> != PRODUCTION / COMMERCIAL PASS

This document is a Design Foundation execution specification derived from the frozen Product Contract. It is not a second Product Contract, a duplicate Screen Map or OpenAPI contract, an implementation-completion checklist, a visual redesign, or a Preview restoration plan.

## 1. Purpose and authority hierarchy

The authority and evidence chain is:

`Frozen Product Contract -> accepted Design Foundation -> approved screen/workflow specification -> optional Figma node / optional Storybook story -> frontend implementation -> automated and review evidence`

- The Product Contract is the product-scope authority. This proposal may express frozen scope but may not invent, remove, or reinterpret it.
- Once separately accepted, the Design Foundation governs design intent and handoff; it does not prove implementation.
- The Screen Map records current UI ownership, demo boundaries, and contract-defined gaps without being duplicated here.
- OpenAPI and merged runtime code are the authorities for implemented HTTP and software behavior.
- Figma, Storybook, Preview, and AI tools cannot change product scope or override repository authority.
- Conflicts between authorities must stop implementation and be resolved through governed review; implementers must not guess.

## 2. Design principles

- **Clarity-first and Croatian-first:** plain Croatian labels and unambiguous outcomes take priority over decorative language.
- **Role-purposeful:** each role sees work it can perform and the data scope needed for that work.
- **Mobile-operational:** phone use supports real tasks rather than presenting a diminished desktop.
- **Accessible:** keyboard, screen-reader, contrast, focus, motion, and touch requirements are part of each pattern.
- **Predictable over decorative:** stable placement, explicit state, and reversible recovery take priority over novelty.
- **No gamification or decorative KPI density:** metrics and visual effects require a real operational purpose.
- **Server authority:** server-side deny-by-default authorization is the security boundary; frontend visibility is never authorization.
- **Integrity before convenience:** positive user acknowledgement, provenance, immutable evidence, and conflict handling must not be weakened for visual simplicity.

## 3. State classification model

| Classification | Meaning |
|---|---|
| **CURRENT UI** | A screen, binding, or pattern implemented on protected `main`; existence does not prove environment or operational readiness. |
| **TARGET DESIGN FOUNDATION** | The accepted-intent target described by this proposal. **TARGET does not mean IMPLEMENTED.** |
| **CONTRACT-DEFINED GAP** | Required by the frozen Product Contract but not implemented in the current UI. |
| **DEMO/PREVIEW-ONLY** | Synthetic or historical Preview material with no production authority or implementation evidence. |
| **OUT-OF-SCOPE** | Excluded by the frozen Product Contract or an accepted decision. |
| **FUTURE CANDIDATE** | A non-authoritative idea that requires a later governed decision before it may enter scope. |

These classifications must be visible in design review and handoff. A target design, mockup, story, or screenshot may not be relabeled current merely because it exists.

## 4. Information architecture

The information architecture follows frozen workflows and the reconciled Screen Map; it does not add modules:

- **Workforce:** employees, departments, assignments, and the onboarding/import gap.
- **Attendance:** daily records, raw and derived evidence, corrections, and recalculation.
- **Leave:** requests, decisions, and scoped shared-leave visibility.
- **Corrections:** worker requests, manager/admin review, reasons, provenance, and locked-period recovery.
- **Period lifecycle:** review, finalize, close, reopen, blockers, and historical versions.
- **Reports and exports:** scoped reporting, current client-rendered preview, server-preview gap, export state, and verification.
- **Terminal administration:** status, pairing, revoke, history, reconciliation, and credential-rotation gap.
- **Users and roles:** tenant administration without creating new roles or permissions.
- **Audit:** traceable security and business actions with tenant and actor context.
- **Settings:** supported tenant configuration only.
- **Employee terminal UI:** a separate, task-focused boundary from the administrative web/PWA.

Navigation may group these areas differently by role and viewport, but may not alter ownership or data scope.

## 5. Role-based navigation and data scope

| Role | Allowed areas and primary jobs | Data scope | Hidden or forbidden expectations |
|---|---|---|---|
| **Admin** | Organization settings, workforce administration, attendance oversight/recalculation, leave/corrections, period lifecycle, reports/exports, terminal administration, users/roles, audit, and employee import | Tenant-wide critical authority within the active tenant | No cross-tenant access; no raw-event rewrite or audit bypass; no invented payroll, multi-site, or unsupported product administration |
| **Voditelj** | Assigned-department attendance review, corrections and leave work assigned by contract, assigned-department reporting, scoped period-state read, and terminal status/history read-only | Assigned department(s); terminal visibility follows event-effective assigned departments | No attendance recalculation; no period transition; no terminal pair/revoke/rotate/reconcile; no tenant-wide administration, unrelated departments, role administration, or hidden privilege elevation |
| **Radnik** | Self-service attendance, own pending leave/correction requests, own leave balance, and privacy-minimized approved-leave calendar | Self only except the configured privacy-minimized shared calendar | No coworker records beyond permitted calendar names/dates, request decisions, shared administrative actions, tenant settings, or business exports |
| **Knjigovodstvo** | Controlled tenant-wide reporting, approved privacy-minimized leave evidence, export inspection/verification, and period-state read | Tenant-wide reporting with privacy minimization | No raw attendance drill-down, correction workflow or free text, workforce/terminal/user administration, period transition, role administration, or audit log |

All routes and actions remain server-authorized and tenant-isolated. Navigation hiding improves comprehension but is not an authorization control. Negative permission states must fail closed and must not disclose forbidden object existence or data.

## 6. Screen/workflow ownership

`BSS_SCREEN_MAP_V1.md` remains the current screen-ownership authority. The matrix below carries every stable registered screen into Design Foundation handoff so that role, data scope, current/demo status, and target responsibility remain reviewable in one package. It does not relabel a partial screen as a complete workflow.

### 6.1 Current stable screen matrix

| Stable screen ID | Current classification | Admin | Voditelj | Radnik | Knjigovodstvo | Target responsibility / boundary |
|---|---|---|---|---|---|---|
| `home` | CURRENT / KEEP | scoped dashboard | scoped dashboard | self dashboard | reporting dashboard | Clarity-first summary; no decorative analytics |
| `attendance` | CURRENT BUT UPDATE | tenant-wide read | assigned-department read | no screen | no raw-attendance screen | Distinguish raw evidence, derived result, period readiness, and explicit recovery gaps |
| `mytime` | CURRENT / KEEP | demo entry only; no Radnik permission inheritance | no screen | self-only read and correction entry | no screen | Preserve self scope; an Admin demo entry does not create a Product Contract permission |
| `workers` | CURRENT BUT UPDATE | tenant read/write | assigned-department read-only | no registry | no registry | Worker + department + shift + RFID only; no Job Position entity |
| `worker` | CURRENT BUT UPDATE | tenant detail | assigned-department read-only | no administrative detail | no detail | Preserve worker history and supported assignments without legacy Job Position presentation |
| `shifts` | CURRENT / KEEP | read/write | scoped/reference read | no screen | no screen | Keep manager mutations unavailable and server-denied |
| `requests` | CURRENT BUT UPDATE | all requests and decisions | assigned-department decisions | own create/view/cancel pending | no workflow screen | Add period-aware blocked/recovery state without expanding reversal or delegation |
| `vacations` | CURRENT BUT UPDATE | tenant leave overview | assigned-department overview | self overview | no current navigation | Accountant approved/minimized data belongs to reporting/shared-calendar patterns |
| `sharedLeave` | CURRENT / KEEP | configured tenant view | configured scoped view | configured privacy-minimized view | configured privacy-minimized view | Name plus approved `annual_leave` dates only; no reasons, notes, balances, or illness data |
| `corrections` | CURRENT BUT UPDATE | all requests/decisions | assigned-department requests/decisions | own create/view/cancel pending | no access | Fail closed for locked periods; privileged reopen remains a separate Admin gap |
| `reports` | CURRENT BUT UPDATE | tenant reporting | assigned-department reporting | no business export | tenant reporting, privacy-minimized | Label client-derived preview honestly; server preview, lifecycle, and verification remain gaps |
| `terminal` | CURRENT BUT UPDATE | manage tenant terminals | event-effective assigned-department read-only | no access | no access | Manager cannot pair/revoke/rotate/reconcile; ingestion/heartbeat are not screen actions |
| `terminalDemo` | DEMO/PREVIEW-ONLY | demo mode only | demo mode only | hidden | hidden | Local simulator never writes production attendance or audit evidence |
| `flow` | DEMO/PREVIEW-ONLY | demo mode only | demo mode only | hidden | hidden | Static sales/demo content is not runtime or implementation evidence |
| `roles` | CURRENT / KEEP | users, invitations, roles, and department scope | no access | no access | no access | UI visibility is not authorization; server remains deny-by-default |
| `audit` | CURRENT / KEEP | tenant-wide read-only audit | no access | no access | no access | Append-only evidence; no frontend mutation |
| `settings` | CURRENT BUT UPDATE | supported organization configuration | no access | no access | no access | Remove legacy Job Position presentation; do not absorb onboarding/import |

`invitation-acceptance` remains a CURRENT / KEEP authentication entry pattern, not a business screen. `terminal-device-protocol` remains a CURRENT / KEEP device protocol surface, not a web/PWA action. `legacy-job-position-presentation` remains SUPERSEDED / DEPRECATE with no v1 model, API, permission, or persistence.

### 6.2 Frozen workflow gap ownership

| Workflow/domain | Primary future pattern owner | Role/data scope | Classification | Gap or handoff note |
|---|---|---|---|---|
| Attendance recalculation | Attendance recovery pattern | Admin only; open period | CONTRACT-DEFINED GAP | Require reason, revision, audit, and explicit preview/confirm/result/conflict; Voditelj has no recalculation authority |
| Period state and review/finalize/close/reopen | Period-control pattern | Read: Admin, scoped Voditelj, Knjigovodstvo; transitions: Admin only | CONTRACT-DEFINED GAP | Show blockers and immutable history; privileged transitions must not appear for non-Admin roles |
| Server-authoritative report preview | Reports preview pattern | Admin tenant-wide; Voditelj assigned departments; Knjigovodstvo tenant-wide with privacy minimization | CONTRACT-DEFINED GAP | Never claim current UI invokes `createReportPreview` |
| Export verification | Report/export evidence pattern | Admin tenant-wide; Voditelj assigned departments; Knjigovodstvo tenant-wide with privacy minimization | CONTRACT-DEFINED GAP | Expose dataset, version, format, state, and verification without payroll claims |
| Terminal reconciliation | Terminal recovery pattern | Admin only | CONTRACT-DEFINED GAP | Present retained proof, accepted/rejected outcome, reason, audit, and safe recovery |
| Terminal credential rotation | Terminal security pattern | Admin only | CONTRACT-DEFINED GAP | Deliberate consequence/confirmation and audit; not current UI ownership |
| Customer onboarding | Guided onboarding pattern | Authorized onboarding/Admin context; no new product role | CONTRACT-DEFINED GAP | Resumable evidence gates through explicit go-live approval; a completed screen never authorizes go-live |
| Atomic CSV/XLSX employee import | Guided import pattern | Admin only | CONTRACT-DEFINED GAP | Create-only validate/preview/review/atomic commit/cancel; no partial update/merge/deactivate behavior |
| Recovery from locked periods | Period recovery/reopen pattern | Admin owns reopen; other roles may encounter the blocked state | CONTRACT-DEFINED GAP | Non-Admin roles cannot reopen; preserve revision, reason, audit, and immutable historical versions |

## 7. UX state contract

Applicable workflows must specify the following states. A state specification must tell the user what happened or is pending, which action is allowed, which action is forbidden, and what audit/provenance context is relevant.

| State | Required understanding and permitted action | Forbidden or protected behavior |
|---|---|---|
| **Loading** | Scope and operation are clear; preserve context and prevent duplicate submission | Do not imply success or expose stale controls as safe |
| **Empty** | Explain whether no data exists, filters exclude it, or access is scoped; offer a valid next action | Do not fabricate samples or imply broader access |
| **Success** | Confirm the completed action and durable result; link to evidence when relevant | Do not claim success before authoritative acknowledgement |
| **Validation** | Associate field and form errors with corrective action | Do not silently coerce values that change contract meaning |
| **Permission denied** | State that the action is unavailable without leaking protected data | Do not offer retry paths that imply privilege elevation |
| **Not found** | Distinguish unavailable resource safely and provide navigation recovery | Do not reveal whether a forbidden tenant object exists |
| **Conflict / stale revision** | Preserve user input where safe, identify stale evidence, and require refresh/review | Do not silently overwrite a newer authoritative revision |
| **Offline / degraded** | Identify unavailable authority and whether safe read-only context remains | No private-data or business-mutation offline web/PWA cache |
| **Reconciliation required** | Identify pending or conflicting evidence and the authorized recovery path | Do not present queued or ambiguous terminal evidence as confirmed |
| **Blocked finalization** | List actionable blockers and their provenance/scope | Do not enable finalization while contract blockers remain |
| **Destructive confirmation** | Name object, consequence, scope, and recovery limits | No ambiguous generic confirmation or hidden side effect |
| **Recovery / reopen** | Explain reason, revision, audit trail, and the resulting active state | Do not mutate immutable historical evidence |
| **Unavailable / legacy-unavailable** | Fail closed and identify supported alternatives where the contract permits | Do not revive superseded behavior or simulate capability |

Audit/provenance is shown when it helps verify actor, tenant/scope, revision, source evidence, reason, or time. Sensitive context remains minimized by role.

## 8. Forms and validation pattern

- Every control has an explicit visible label; placeholders are supplementary.
- Field errors are associated with the field and summarized at form level when multiple errors block submission.
- Required and optional meanings are explicit and consistent; absence must not activate a hidden business default.
- Destructive or irreversible effects require a named confirmation and consequence statement.
- Stale revisions preserve safe input, identify the newer version, and require deliberate refresh or retry.
- Defaults may improve ergonomics only when they cannot change frozen Product Contract semantics.
- Phone inputs use appropriate keyboard/input modes, stable zoom, and reachable actions.
- Validation moves focus accessibly to the error summary or first invalid field and preserves user-entered values where safe.

## 9. Tables, filters and large operational lists

- Use table-first layouts for comparison-heavy operational work; use cards only where they improve task completion.
- On phones, use deliberate horizontal containment, prioritized columns, or a disclosed row-detail pattern. Critical data must not exist only beyond an undiscoverable off-screen region.
- Search, sort, filters, and pagination preserve clear scope and active-filter state; reset behavior is explicit.
- Loading, empty, validation, permission, and error states retain table/list context.
- Show department, employee, period, or tenant scope where it prevents a mistaken action.
- Bulk actions expose selection scope and require authorization for every affected record.
- Do not fabricate advanced BI, analytics, or export capabilities.

## 10. Dialog, drawer and action patterns

- Dialogs are reserved for focused decisions, confirmations, and short forms; drawers may retain surrounding operational context.
- Reversible actions distinguish undo/recovery from destructive actions.
- Approval and rejection identify affected record, revision, outcome, and reason requirements from the contract.
- Controlled reopen requires a reason, current-state check, and visible audit expectation.
- Privileged actions never appear to elevate the current role and must still be rejected server-side when unauthorized.
- Closing a surface must not silently submit, discard consequential work without warning, or hide an unresolved conflict.

## 11. Notifications and feedback

- **Inline validation:** local, actionable input correction.
- **Transient success:** non-critical confirmation after authoritative completion.
- **Persistent blocking notice:** remains until a blocker is resolved or the user leaves the affected context.
- **Degraded/offline state:** names unavailable authority and prohibits unsafe action.
- **Reconciliation required:** persistent evidence state with an authorized recovery route.
- **Terminal employee acknowledgement:** immediate, unambiguous accepted/rejected/queued/offline feedback tied to durable semantics.

This pattern set does not authorize or imply a general notification platform.

## 12. Attendance and correction design patterns

- Raw event evidence is immutable provenance and must never be visually represented as an editable fact.
- Derived attendance is labeled separately from source evidence and exposes active, incomplete, corrected, and late states where applicable.
- Corrections show original evidence, requested or applied change, actor, reason, state, and relevant revision without exposing data outside role scope.
- Attendance recalculation is a contract-defined UI gap for **Admin only**, applies only to an **open period**, and requires reason, revision, audit, explicit preview/confirmation, outcome, and conflict patterns before implementation. Voditelj has no recalculation authority.
- Fail-closed states prevent false acknowledgement, duplicate mutation, or finalization when authority is unavailable.
- Locked-period recovery routes through the governed reopen/recovery pattern rather than silent mutation.

The integrity objectives remain: **zero lost `USER_ACKNOWLEDGED` attendance** and **zero incorrect attendance duplicates**. Visual convenience may not weaken durable acknowledgement, idempotency, or reconciliation evidence.

## 13. Period lifecycle pattern

The lifecycle is `OPEN -> REVIEW -> FINALIZED -> CLOSED`, with governed recovery/reopen where the frozen contract permits it.

Admin, scoped Voditelj, and Knjigovodstvo may read period state within their respective data scopes. Only Admin may perform the `REVIEW`, `FINALIZE`, `CLOSE`, or `REOPEN` transitions. Other roles may encounter blocked-period state but cannot perform the privileged reopen transition.

Each representation must show:

- the current state and authoritative period/revision;
- allowed next transition for the current role and data scope;
- blockers, reconciliation state, and incomplete evidence;
- conflict/stale-revision handling before mutation;
- reason and audit expectations for critical transitions;
- recovery/reopen consequence and resulting version;
- immutable historical finalized/issued versions.

Unauthorized lifecycle actions are not presented as available. Frontend hiding remains secondary to server denial. `FINALIZED` and `CLOSED` evidence may not be visually treated as mutable current data.

## 14. Reports and export provenance

The current frontend report preview is rendered from hydrated client-side state. It does **not** invoke the server-authoritative `createReportPreview` operation. The target keeps server-authoritative preview as the explicit **CONTRACT-DEFINED GAP** `report-server-preview` until a separately governed implementation is merged and proven.

Target reporting patterns identify, at an appropriate level:

- report scope and privacy-minimized role view;
- dataset/snapshot and period version;
- preview authority and generation state;
- export format and immutable artifact version;
- verification outcome, checksum/version identifier, and provenance without exposing unnecessary implementation detail;
- superseded versus current issued artifact.

Reporting scope is explicit: Admin is tenant-wide; Voditelj is limited to assigned departments; Knjigovodstvo has tenant-wide reporting with privacy minimization; Radnik has no business export. Knjigovodstvo receives controlled, minimized reporting data rather than broad workforce access. Report design must not imply payroll calculation, statutory-premium correctness, or any expanded legal claim.

## 15. Onboarding and atomic employee import gaps

Customer onboarding and employee import remain separate **CONTRACT-DEFINED GAP** workflows. This section assigns future design ownership only and neither implements a flow nor creates an implementation issue.

### A. Customer onboarding

The target preserves the frozen resumable lifecycle:

`DRAFT -> COMPANY_SETUP -> PEOPLE_IMPORT -> ACCESS_SETUP -> TERMINAL_SETUP -> DRY_RUN -> READY_FOR_GO_LIVE -> GO_LIVE_APPROVED`

It must show completed evidence, the last proven/resumable step, open limitations, and the authorized actor for each gate. `READY_FOR_GO_LIVE` is computed readiness and never approval; only an explicit authorized decision produces `GO_LIVE_APPROVED`. Demo, Preview, Pilot, and Production data/configuration remain separated.

### B. Atomic CSV/XLSX employee import

The target preserves the frozen flow:

`UPLOAD -> PARSE -> NORMALIZE/STAGE -> MAP -> VALIDATE -> PREVIEW -> APPROVE -> COMMIT -> RESULT/AUDIT`

It must show normalized create-only rows, blocking duplicate/reference/field errors, totals, reviewed session revision, cancellation, atomic commit, and the result/audit summary. Invalid rows prevent the entire commit, cancellation makes no business mutation, and a failed commit rolls back rather than leaving a partial employee set. The design must not imply update, merge, deactivation, user creation, RFID assignment, historical data import, or a hidden annual-leave default.

## 16. Terminal UX boundary

### A. Employee terminal UX

The physical terminal experience prioritizes a clear tap/read result: **accepted**, **rejected**, **queued**, or **offline**. It must provide positive user acknowledgement only when contract durability permits it and must never show ambiguous success. Queued/retry state must protect the zero-loss and zero-incorrect-duplicate objectives.

### B. Web/PWA terminal administration

Admin manages terminal status, pairing, revoke, history, reconciliation, and credential rotation where each capability is implemented. Voditelj has read-only terminal status/history visibility only for event-effective assigned departments and cannot pair, revoke, rotate, or reconcile. The administrative web/PWA presents device evidence and authorized recovery but is not the employee tap/read interface.

Physical hardware evidence under #132 remains separate. This proposal cannot prove enclosure, mounting, thermal, RFID, offline, or production hardware readiness.

## 17. Component/pattern classification

This matrix classifies design work; it does not define final visuals or claim implementation.

| Area | KEEP | CHANGE | ADD | DEPRECATE | Status note |
|---|---|---|---|---|---|
| Semantic tokens | Existing semantic vocabulary | Clarify state usage | Only missing frozen semantics | Arbitrary primitives in feature UI | Repository baseline remains authority |
| Typography | Existing scale and Croatian readability | Operational hierarchy guidance | Dense-data examples at Visual Design Gate | Decorative display hierarchy | Target specification |
| Spacing/radius/elevation | Existing scale | Apply consistently by surface purpose | None unless proven necessary | One-off values | Target discipline |
| Button | Existing hierarchy and focus states | Clarify destructive/loading behavior | Conflict/retry variants as patterns | Ambiguous action styling | Target pattern |
| Form | Labels, controls, accessible errors | Stale revision and form summary | Import validation pattern | Placeholder-only labels | Current plus gap |
| Table | Operational table baseline | Mobile handling and scope visibility | Provenance/version presentation | Undiscoverable clipped critical data | Target pattern |
| Status badge | Semantic non-color labels | Align lifecycle terminology | Reconciliation/verification states | Color-only meaning | Target pattern |
| Navigation | Role-purposeful current structure | Explicit scope and mobile priorities | Gap entries only when implemented | Forbidden or legacy entries | Screen Map controls current ownership |
| Cards/panels | Purposeful grouping | Reduce decorative KPI density | State/context panels as needed | Gamified or decorative dashboards | Target pattern |
| Dialog | Existing modal foundation | Consequence, focus return, stale state | Controlled reopen confirmation | Generic destructive prompts | Target pattern |
| Notification | Inline/transient feedback | Separate durable blockers | Degraded/reconciliation feedback | General platform implication | Pattern only |
| Loading/empty/error | Existing basic states | Workflow-specific action and scope | Not-found/legacy-unavailable | Fake sample data as evidence | Target contract |
| Offline/degraded | Fail-closed cues | Clarify safe versus forbidden action | Authority-unavailable pattern | Private-data mutation/cache | Gap/pattern |
| Permission/conflict | Server denial and basic error | Non-disclosure and stale recovery | Revision comparison pattern | UI-only authorization | Target contract |
| Provenance/audit | Existing audit concepts | Role-minimized presentation | Version/source context patterns | Decorative activity feed | Target pattern |
| Period lifecycle | Frozen state vocabulary | None to current UI until implemented | Review/finalize/close/reopen patterns | Mutable finalized-history cues | Contract-defined gap |
| Report verification | Current export status | Label current client preview honestly | Server preview/version/verification | Fake or unverifiable exports | Contract-defined gap |
| Import flow | None claimed current | None | Upload/validate/preview/atomic commit | Partial-import success | Contract-defined gap |
| Terminal feedback | Existing acknowledgement intent | Sharpen accepted/rejected/queued/offline | Reconciliation and rotation patterns | Ambiguous success | Mixed current/gap |
| Responsive | Existing responsive foundation | Pattern-level phone/tablet/desktop rules | Mobile operational specifications | Reduced-desktop assumption | Target pattern |
| Accessibility | Existing baseline | Workflow/state-specific evidence | Gate review for critical surfaces | Color-only/inaccessible custom controls | Target and evidence boundary |
| Light/dark themes | Existing semantic themes | Verify state parity | New semantics only if required | Tool-specific theme authority | Both themes required |

## 18. Semantic token discipline

`BSS_DESIGN_SYSTEM_V1.md` remains the current frozen visual/interactions baseline. Reuse its semantic tokens before adding vocabulary. A new semantic token is permitted only when existing semantics cannot express a frozen requirement, and it requires reviewed repository change. Feature UI must not leak arbitrary color, spacing, radius, elevation, or typography primitives.

Light and dark themes require semantic parity; neither is a secondary unsupported skin. A design-tool variable, generated palette, screenshot, or AI choice cannot override repository token authority.

## 19. Responsive and mobile rules

| Viewport | Required design behavior |
|---|---|
| **Phone** | Keep the primary task and scope visible; use deliberate progressive disclosure; maintain reachable controls, usable tables, and explicit destructive actions |
| **Tablet** | Support field and supervisory operation with adaptive navigation, comparison, and touch targets; do not assume desktop pointer behavior |
| **Desktop** | Support efficient operational scanning and multi-record work without decorative density or loss of state context |

Mobile is operational, not reduced desktop. Every pattern must preserve role/data-scope comprehension, validation and recovery, deliberate destructive action, and accessibility targets across supported viewports.

## 20. Accessibility baseline

- Complete keyboard operation with logical order and visible focus.
- Modal focus trap, initial focus, Escape behavior where safe, and focus return.
- Programmatic labels, instructions, descriptions, and error association.
- Status and validation conveyed by text/structure, not color alone.
- Adequate touch targets and spacing for operational use.
- Logical headings, landmarks, table semantics, and names.
- Restrained live regions for meaningful asynchronous change, avoiding duplicate announcements.
- Reduced-motion support and no meaning dependent on animation.
- Contrast appropriate to light/dark themes and interactive states.
- Mobile screen-reader, zoom, reflow, and orientation review for critical workflows.

Automated axe results are useful evidence but are not complete WCAG certification or proof of usability.

### 20.1 Workflow-level responsive and accessibility ownership

The universal rules above apply everywhere; this matrix identifies the additional evidence each workflow must carry before its design or implementation can be considered complete.

| Workflow group | Phone / narrow viewport | Tablet / desktop | Accessibility and state evidence |
|---|---|---|---|
| Dashboard and navigation | Prioritize the role's next valid action and preserve current scope in reachable navigation | Keep stable role-grouped navigation and avoid decorative KPI density | Logical landmarks/headings, `aria-current`, keyboard route access, visible focus, loading/empty/error states |
| Workforce, settings, users, and import | Use progressive disclosure for record detail; keep save/cancel and blocking validation reachable | Support comparison and scoped administration without hiding consequence or selection scope | Label/error association, error summary focus, 44 px targets, destructive confirmation, stale/conflict recovery, no forbidden-field disclosure |
| Attendance and own time | Keep business date, status, IN/OUT evidence, and permitted next action together | Support operational scanning while separating immutable raw evidence from derived results | Table/reflow semantics, non-color states, timezone/provenance comprehension, loading/empty/permission/conflict/reconciliation recovery |
| Leave and corrections | Preserve date range, current state, own/scoped identity, and approve/reject/cancel consequences | Keep request, original/requested values, decision reason, and revision reviewable without dense nesting | Accessible date inputs, validation summary, status announcements, focus-managed decisions, locked-period and stale-revision recovery |
| Period lifecycle | Show current period/state and blockers before any allowed transition; privileged actions remain deliberate | Compare blockers and immutable versions without visually treating finalized evidence as editable | Structured blocker list, descriptive confirmation, conflict focus/announcement, keyboard transition flow, non-Admin denied state |
| Reports and exports | Prioritize filters, privacy scope, generation state, and artifact identity; disclose secondary columns | Support dataset/version comparison and verification without decorative analytics | Accessible filters/tables/download state, privacy-minimized content, loading/empty/error/conflict, verification result not conveyed by color alone |
| Terminal administration | Surface health, queue/reconciliation state, scope, and safe Admin action without implying employee-tap behavior | Support terminal/history comparison and retained proof review | Status text, live updates without announcement noise, destructive credential/revoke confirmation, degraded/reconciliation recovery, manager read-only clarity |
| Employee terminal feedback | One immediate, unambiguous outcome with touch/visual priority; no administrative navigation | Same semantics on the deployed terminal viewport; no reduced web-admin imitation | Text plus non-color feedback, readable contrast, perceivable focus/input where interactive, reduced motion, accepted/rejected/queued/offline semantics tied to durability |
| Audit and provenance | Use disclosed detail without losing actor/action/time context | Support chronological and target comparison while preserving tenant scope | Semantic table/list structure, keyboard detail access, accessible timestamps/labels, loading/empty/error states, no mutation control |

## 21. Figma / Storybook / frontend relationship

Current status:

- **Figma: CANDIDATE / INACTIVE**; no account, paid service, library, or workflow activation is authorized.
- **Storybook: CANDIDATE / INACTIVE**; no package, configuration, stories, Code Connect, or CI activation is authorized.
- `/design-system/` is the current implemented repository design-system guide.

The optional future chain is:

`Accepted Design Foundation -> optional approved Figma representation -> optional Storybook component/state representation -> frontend implementation -> tests/evidence`

Neither tool is product authority, implementation evidence by itself, or permission to change the Product Contract.

## 22. Design-to-implementation handoff

- Open an implementation issue only when concrete work becomes active and authorized; this proposal creates no child issue.
- Each future issue references the Product Contract, the relevant Design Foundation section, and the Screen Map/current gap.
- Split work into reviewable workflow or pattern changes; do not create a mega-issue or broad frontend rewrite.
- Keep CURRENT, TARGET, GAP, and evidence status explicit in issue and PR language.
- Missing product or visual decisions are escalated rather than invented by an implementer.
- Current-state maps change only after implementation is merged and relevant behavior is proven.

## 23. Drift control

Review the Design Foundation when any of these triggers occurs:

- Product Contract version or accepted scope change;
- new or removed route;
- role, permission, tenant, or data-scope change;
- screen/workflow ownership change;
- closure or creation of a contract-defined implementation gap;
- employee terminal contract or web/terminal boundary change;
- accessibility or responsive baseline change;
- accepted Figma, Storybook, Code Connect, or other design-tool workflow change.

Review must compare the Product Contract, Screen Map/API map, implementation, and evidence rather than treating this prose as runtime truth. Ordinary visual tuning that preserves scope, contracts, semantic tokens, accessibility, and interaction meaning does not require unnecessary product governance.

## 24. Preview inventory boundary

Preview has **no authority**. Synthetic Preview evidence may be inventoried as an **IDEA / RESEARCH** source for:

- layout ideas;
- visual treatments;
- interaction concepts;
- animation concepts;
- presentation concepts.

The following are rejected or non-transferable without a new accepted decision and implementation evidence:

- multi-location behavior;
- gamification or progress mechanics;
- lead capture or marketing analytics;
- fake exports;
- simulated terminal evidence;
- simulated role capability presented as current implementation.

Reuse requires reconciliation with frozen scope, privacy, role/data boundaries, accessibility, and the Visual Design Gate.

## 25. Explicit out-of-scope protection

The Product Contract owns the complete out-of-scope list. Design work must specifically guard against high-risk creep into:

- multi-site or multi-location models;
- a separate Job Position entity or legacy Job Position presentation;
- payroll or statutory-premium calculation engines;
- advanced BI/AI claims;
- broad HR/ERP/CRM expansion;
- a general notification platform;
- offline private-data PWA mutation or cache;
- billing.

A visual concept cannot introduce any of these by implication.

## 26. Implementation gap register

This register records only established gaps. It activates no implementation issue.

| Gap ID | Domain | Contract source | Current evidence | Target pattern | Activation trigger | Status |
|---|---|---|---|---|---|---|
| `report-server-preview` | Reports | Frozen reporting/version authority | Screen Map/API map: current preview is client-state derived | Server-authoritative preview with dataset/version provenance | Separately authorized focused implementation issue | CONTRACT-DEFINED GAP |
| `report-export-verification` | Reports/exports | Frozen immutable issued evidence | Screen Map/API map explicit UI gap | Artifact version, format, checksum/verification, supersession | Separately authorized focused implementation issue | CONTRACT-DEFINED GAP |
| `attendance-recalculation` | Attendance | Frozen derived-attendance integrity workflow | Screen Map/API map explicit UI gap | Admin-only open-period preview, reason, revision, confirmation, conflict, result, audit | Separately authorized focused implementation issue | CONTRACT-DEFINED GAP |
| `period-lifecycle` | Periods | Frozen OPEN/REVIEW/FINALIZED/CLOSED workflow | Screen Map/API map explicit UI gap | Scoped state read; Admin-only review/finalize/close/reopen; blockers and immutable history | Separately authorized focused implementation issue | CONTRACT-DEFINED GAP |
| `terminal-reconciliation` | Terminal | Frozen durable acknowledgement/retry integrity | Screen Map/API map explicit UI gap | Queued/confirmed/conflict evidence and safe recovery | Separately authorized focused implementation issue | CONTRACT-DEFINED GAP |
| `terminal-credential-rotation` | Terminal security | Frozen terminal credential governance | Screen Map/API map explicit UI gap | Deliberate rotation/revocation, consequence, audit | Separately authorized focused implementation issue | CONTRACT-DEFINED GAP |
| `customer-onboarding` | Workforce activation | Frozen resumable onboarding and explicit go-live approval | Screen Map/API map explicit UI gap; no current screen or OpenAPI operation | Evidence-bearing resumable gates from DRAFT through explicit GO_LIVE_APPROVED | Separately authorized focused implementation issue | CONTRACT-DEFINED GAP |
| `employee-import` | Workforce | Frozen Admin-only atomic import workflow | Screen Map/API map explicit UI gap; no current screen or OpenAPI operation | Upload, mapping, validation, preview, blocking errors, atomic commit/cancel, result/audit | Separately authorized focused implementation issue | CONTRACT-DEFINED GAP |
| `locked-period-recovery` | Attendance/periods | Frozen correction and reopen recovery | Screen Map/current UI-gap evidence | Admin-only reasoned reopen; revision/conflict, audit, immutable history | Separately authorized focused implementation issue | CONTRACT-DEFINED GAP |

## 27. Acceptance and evidence boundary

Acceptance of this document would mean only **DESIGN FOUNDATION ACCEPTED**. It would not mean implementation is complete, a gap is implemented, evidence is proven, Staging is ready, Pilot has passed, hardware is proven, or Production/Commercial readiness exists.

### Visual Design Gate — mandatory #156 acceptance checkpoint

The BSS v1 Design Foundation **MUST NOT be marked ACCEPTED** until the Visual Design Gate has been completed and explicitly approved by the BSS owner.

- AI-generated mockups, generated UI concepts, and Codex-created visual choices are **IDEA / RESEARCH only** until explicitly reviewed and approved by the BSS owner/design process.
- Codex is not authorized to autonomously define BSS visual identity, and this proposal must not freeze an unreviewed visual aesthetic.
- Before frontend implementation is authorized, the gate must use concrete representative BSS screen designs/specifications derived from real frozen workflows—not generic placeholder dashboards or prose-only descriptions.
- Review must cover representative Admin, Voditelj, Radnik, Knjigovodstvo, and employee-terminal feedback surfaces where applicable.
- Visual approval must demonstrate one coherent system across operational desktop UI, mobile worker UI, privacy-sensitive reporting, critical states/recovery flows, and terminal employee feedback.
- Evidence must cover desktop/mobile, light/dark, operational tables/forms, loading/empty/error/offline/conflict/recovery states, accessibility, responsive behavior, and privacy-sensitive role views.
- Final implementation must follow an approved design specification. Missing design decisions must be escalated instead of invented by the implementer.
- Design fidelity, responsive behavior, and accessibility review are required before visual implementation can be considered complete.
- Figma and Storybook may later represent approved design or implemented states, but remain **CANDIDATE / INACTIVE** until separately accepted. Neither Figma, Storybook, nor any AI tool is product-scope authority.

This Visual Design Gate is an acceptance checkpoint inside #156. It is not new product scope, a new roadmap phase, an implementation issue, or authorization to activate tooling. BSS visual direction must be intentionally designed and owner-approved; it must not default to generic AI/SaaS aesthetics, decorative KPI density, gamification, or unjustified visual effects.

## 28. Change control / rollback

- **Before merge:** close the Draft PR if the proposal is rejected or superseded.
- **After merge:** use a reviewed revert if the proposal must be withdrawn. A merge would still leave the document PROPOSED until separate owner/BSS OS acceptance and completion of the Visual Design Gate.
- **Material product change:** use a separately reviewed, versioned Product Contract change; do not edit this document to bypass product authority.
- **Implementation gap:** create a focused future issue only when the gap is activated and authorized.
- **Design Foundation acceptance:** requires explicit owner/BSS OS review, completed Visual Design Gate evidence, and a separately governed status change.
