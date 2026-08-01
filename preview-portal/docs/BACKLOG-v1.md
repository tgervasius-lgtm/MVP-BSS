# BSS Preview Portal — Delivery Backlog v1

## Milestone 0 — Foundation
- [ ] Confirm application boundary inside `preview-portal/`
- [ ] Select frontend stack compatible with the existing repository
- [ ] Add isolated build, lint and test commands
- [ ] Create route map and component boundaries
- [ ] Define local demo-state schema and reset mechanism
- [ ] Add Croatian copy catalogue prepared for later localization
- [ ] Add accessibility and performance budgets

**Exit:** isolated application starts locally and CI can test it without touching the production backend.

## Milestone 1 — Conversion landing
- [ ] Hero with a direct value proposition
- [ ] Primary CTA: start interactive demo
- [ ] Secondary explanation: worker → terminal → dashboard → report
- [ ] Benefits for owner/director
- [ ] Credibility section without unsupported claims
- [ ] Live demo and pilot CTAs
- [ ] Responsive navigation, footer, privacy and demo disclosure
- [ ] SEO/social metadata

**Exit:** visitor can understand BSS and enter the demo within three clicks.

## Milestone 2 — Context setup
- [ ] Industry selection
- [ ] Employee range
- [ ] Locations
- [ ] Shift count
- [ ] Explain that the result is a simulated example
- [ ] Generate deterministic scenario configuration
- [ ] Offer Guided Workday and Free Exploration

**Exit:** selected context changes labels, volumes and scenario framing consistently.

## Milestone 3 — Demo shell and roles
- [ ] BSSProject d.o.o. demo header
- [ ] Demo disclosure and reset
- [ ] Role switcher
- [ ] Owner/director dashboard
- [ ] Administrator workspace
- [ ] Manager workspace
- [ ] Employee self-service view
- [ ] Accounting read-only reports view
- [ ] Shared consistent fixture data

**Exit:** all five roles work and show only role-appropriate information.

## Milestone 4 — Scenario engine
- [ ] Deterministic state machine
- [ ] Workday clock and event queue
- [ ] Guided objectives and progress
- [ ] Contextual narrator prompts
- [ ] Attendance-start scenario
- [ ] Late employee scenario
- [ ] Leave approval scenario
- [ ] Missing/incorrect record scenario
- [ ] Completion summary
- [ ] Pause, skip and exit-to-free-exploration controls

**Exit:** a first-time visitor can complete the guided workday without instructions from a salesperson.

## Milestone 5 — Virtual RFID terminal
- [ ] Terminal UI matching planned hardware proportions
- [ ] Employee/card selector
- [ ] Entry and exit actions
- [ ] Success, duplicate and offline feedback
- [ ] Shared-state dashboard updates
- [ ] Offline queue explanation
- [ ] Reduced-motion and keyboard interaction

**Exit:** a terminal action visibly changes attendance and reporting data.

## Milestone 6 — Reports and proof moments
- [ ] Daily attendance report
- [ ] Monthly time preview
- [ ] Overtime and exception summary
- [ ] Leave overview
- [ ] Export simulation with generated demo file or explicit preview
- [ ] Before/after operational explanation

**Exit:** owner and accounting users understand the business outcome, not only the interface.

## Milestone 7 — Lead conversion
- [ ] Contextual CTA after high-intent actions
- [ ] Online presentation request
- [ ] Live demonstration request
- [ ] Pilot interest application
- [ ] Company qualification fields
- [ ] Validation, consent and privacy handling
- [ ] Success and retry states
- [ ] Internal lead delivery integration selected and documented

**Exit:** qualified visitors can submit a reliable, traceable lead.

## Milestone 8 — Analytics and experimentation
- [ ] Event taxonomy from PRD
- [ ] Consent-aware analytics adapter
- [ ] Funnel validation dashboard specification
- [ ] Source/campaign attribution
- [ ] Role and task engagement measurement
- [ ] No sensitive payloads
- [ ] A/B test hooks for hero and CTA copy, disabled by default

**Exit:** the team can distinguish traffic from real product interest.

## Milestone 9 — Quality and launch gate
- [ ] Unit tests for state transitions
- [ ] Integration tests for cross-role consistency
- [ ] E2E guided journey
- [ ] E2E terminal-to-dashboard flow
- [ ] E2E lead submission
- [ ] Accessibility audit
- [ ] Mobile/responsive audit
- [ ] Performance audit
- [ ] Security and privacy review
- [ ] Error monitoring strategy
- [ ] Demo reset and data integrity soak test

**Exit:** all PRD release gates pass.

## Recommended implementation order for Codex
1. Foundation and state model
2. Demo shell and one owner dashboard vertical slice
3. Scenario engine skeleton
4. Terminal vertical slice updating the dashboard
5. Complete guided workday
6. Remaining roles
7. Landing and conversion journey
8. Lead workflow and analytics
9. Hardening and launch review

## First vertical-slice acceptance criteria
The first executable slice must let a visitor:
1. Open the preview route.
2. Enter the guided demo without registration.
3. See BSSProject d.o.o. as owner/director.
4. Receive the objective to check shift attendance.
5. Open the virtual terminal and register one employee.
6. Return to the dashboard and see the present count increase.
7. Reset the demo to its original deterministic state.

This slice is intentionally narrow. It proves the architecture, interaction model and shared state before broad UI production begins.
