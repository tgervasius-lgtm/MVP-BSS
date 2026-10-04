# BSS Visual Design Gate Decision Record

Date: 2026-10-03
Status: ACCEPTED / HARDENED VISUAL DIRECTION
Issue: #156

## Decision

The BSS owner explicitly accepted the BSS v1 visual direction after the required Visual Design Gate review.

Accepted:
- Desktop visual direction
- Table/list density
- Contextual drawer/detail pattern
- Semantic color/status language
- Mobile Worker direction with revised structure
- Overall BSS system feel

Accepted provisionally:
- Terminal visual direction, pending physical hardware validation

## Evidence boundary

This decision is design/governance acceptance only.

It is not:
- frontend implementation evidence;
- deployment evidence;
- Staging PASS;
- Pilot PASS;
- Production/Commercial readiness;
- terminal hardware proof.

## Tooling boundary

Figma and Storybook remain CANDIDATE / INACTIVE until separately activated.
They are not product-scope authority.

## Scope protection

The Visual Design Gate does not modify BSS_V1_PRODUCT_CONTRACT.md v1.0.

Shared approved-leave calendar visibility is already authorized by the frozen Product Contract. The accepted UX refinement is: worker-facing label `Kalendar`; no coworker-leave feed on the worker home; coworker annual leave is shown only after opening the calendar, using the existing privacy-minimized visibility contract.

## Implementation authorization

This decision permits focused, roadmap-ordered frontend/design-system implementation work for the existing frozen v1 scope, subject to normal issue/PR review, authorization, testing, accessibility, responsive and regression evidence.

## Terminal boundary

Terminal visual direction is accepted provisionally only.
Physical 4.3-inch / 800x480 display readability, touch, enclosure, offline durability and acknowledgement behavior remain separate hardware evidence requirements.

## Owner decision matrix

- A Desktop visual direction: ACCEPT
- B Table/list density: ACCEPT
- C Drawer/detail pattern: ACCEPT
- D Semantic color/status language: ACCEPT
- E Mobile Worker density: ACCEPT WITH REVISED STRUCTURE
- F Terminal visual direction: ACCEPT PROVISIONAL FOR HARDWARE VALIDATION
- G Overall BSS system feel: ACCEPT
