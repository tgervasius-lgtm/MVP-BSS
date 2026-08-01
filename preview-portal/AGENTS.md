# BSS Preview Portal — Codex Instructions

## Mission
Build a production-quality interactive preview portal that helps a Croatian business owner imagine using BSS in their own company and converts qualified visitors into demo or pilot leads.

## Isolation
- Work only inside `preview-portal/` unless a task explicitly says otherwise.
- Do not modify the production backend, database migrations, authentication, RBAC, RLS, API contracts, or PR #27 scope.
- Do not merge to `main`.
- Every implementation batch must be delivered through a focused pull request from `feature/bss-preview-portal` or a child branch.

## Product principles
1. The visitor participates; they do not passively watch.
2. The experience should feel like a real business workday, not a game or a static mockup.
3. The demo company is `BSSProject d.o.o.` and all data is clearly marked as simulated.
4. No fake or dead controls. Every visible primary action must work.
5. The portal may demonstrate only capabilities planned for the real BSS MVP.
6. Mobile-first responsiveness, keyboard usability, WCAG-conscious contrast and reduced-motion support are mandatory.
7. Keep the first meaningful interaction within three clicks and do not require registration before the demo.

## Initial scope
- Public landing experience.
- Short company-context setup: industry, employee range, locations and shifts.
- Guided interactive workday.
- Role switching: owner/director, administrator, manager, employee and accounting.
- Virtual RFID terminal simulation.
- Real-time local demo-state updates.
- Lead capture for online presentation, live demonstration and pilot interest.
- Privacy-respecting product analytics event model.
- Automatic demo reset.

## Technical constraints
- The preview portal must operate without the production backend.
- Use deterministic local fixtures and a documented state machine.
- Avoid unnecessary dependencies.
- No secrets in source control.
- Add automated tests for every critical guided path.
- Treat Croatian as the primary interface language; structure copy for later localization.

## Definition of done for each task
- Acceptance criteria are met.
- Relevant unit/integration/E2E tests pass.
- No console errors.
- Responsive at 320 px, tablet and desktop widths.
- Keyboard flow works.
- Loading, empty and error states are addressed where applicable.
- Documentation is updated.
