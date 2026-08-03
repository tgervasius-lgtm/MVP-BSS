# BSS Preview Portal — Product Requirements v1.2

## 1. Objective
Validate market interest before the physical BSS pilot by giving potential buyers a credible, interactive experience of using BSS in their own company.

The portal succeeds when a relevant visitor understands the product, completes meaningful interactions and requests an online presentation, a live demonstration or pilot participation.

## 2. Demo company
Interni demonstracijski fixture ostaje **BSSProject d.o.o.**, ali korisničko sučelje iskustvo prikazuje kao posjetiteljevo vlastito demo okruženje na temelju agregiranog profila.

Default scenario:
- Metal production and warehouse operations
- 68 employees
- 2 locations
- 2 RFID terminals
- 2 shifts
- Simulated data clearly disclosed as demo data

Visitor choices adapt the labels, employee volume and scenario density, but v1 does not create a real tenant or claim true company-specific configuration. The setup never asks for employee names, OIB or other personal data.

## 3. Target users
Primary:
- Owners and directors of Croatian SMEs
- Operations and HR administrators
- Companies with approximately 10–250 employees

Secondary:
- Team managers
- Accounting/payroll stakeholders
- Employees evaluating usability

Priority industries:
- Manufacturing
- Metal industry
- Logistics and warehouses
- Construction
- Retail and service operations

## 4. Core experience
The portal must make the visitor feel that they are managing a normal workday with BSS.

### Entry flow
1. Visitor understands the value proposition.
2. Visitor starts the demo without registration.
3. Visitor selects basic company context: industry, employee range, number of locations and shifts.
4. Portal frames the experience as an example for a company of that profile.
5. Visitor chooses free exploration (default) or the same open workspace with contextual recommendations.

### Assisted workday
The story begins shortly before a shift starts. The system recommends one useful event at a time, but recommendations never lock modules, actions or role switching.

Minimum scenario:
1. Review attendance as the shift begins.
2. Identify one late employee.
3. Use the virtual RFID terminal to register an employee.
4. Switch to manager view and decide on a leave request.
5. Switch to employee view and inspect personal hours and leave balance.
6. Switch to accounting view and preview/export a monthly report.
7. Return to the Administration view and review the operational summary.
8. Complete the experience and choose a commercial next step.

### Free exploration
This is the primary path. The visitor can switch roles, execute all permitted demo actions in any order and continue using the workspace after completing all five capability checks.

## 5. Roles
### Administration / Uprava
- Combines the owner-level overview with the real `admin` permission model; there is no separate Director demo role.
- Company-wide KPI, attendance, absence, exception and location overview
- Employees
- Shifts
- Time records and exceptions
- RFID assignments
- Leave administration
- Terminal health
- Audit-style activity feed

### Manager
- Own team only
- Attendance and exceptions
- Leave request decisions
- Team schedule and scoped team report

### Employee
- Personal time records
- Personal schedule
- Leave balance and functional local leave request
- Personal notifications

### Accounting
- Read-only time and absence reports
- Monthly preview
- Export simulation
- No employee administration

## 6. Interactive terminal
The virtual terminal must:
- Display a realistic BSS terminal surface
- Let the visitor select or simulate an RFID card
- Show immediate success/error feedback
- Update the shared demo state and dashboard counters
- Support entry, exit and at least one exception scenario
- Demonstrate offline queue behaviour without claiming live production connectivity

## 7. Engagement model
Use professional game-design mechanics without making the product childish:
- Clear next objective
- Immediate feedback
- Visible progress through the workday
- Contextual prompts rather than long tutorials
- Optional role changes
- Meaningful operational events
- Completion summary

Progress is descriptive, not a gate. Completion must never replace or close the demo workspace.

No dark patterns, artificial waiting, false scarcity or misleading personalization.

## 8. Conversion
Primary calls to action:
- Request online presentation
- Request live demonstration in Croatia
- Apply for pilot consideration

Lead form fields:
- Company name
- Contact name
- Business email
- Phone optional
- Industry
- Employee range
- Number of locations
- Current time-tracking method
- Primary operational problem
- Preferred next step
- Consent and privacy acknowledgement

The form must not imply automatic pilot acceptance.

## 9. Analytics
Track product events, not invasive behaviour.

Required events:
- landing_viewed
- demo_started
- context_completed
- mode_selected
- role_viewed
- guided_task_started
- guided_task_completed
- terminal_simulated
- report_previewed
- conversion_cta_clicked
- lead_submitted
- demo_completed

No sensitive employee or visitor data belongs in analytics payloads.

## 10. Non-functional requirements
- Fast first load on ordinary mobile connections
- Responsive from 320 px upward
- Keyboard-operable critical flows
- Reduced-motion support
- Clear Croatian copy
- No dead buttons or placeholder screens in the published route
- Deterministic resettable demo state
- Production backend independence
- Basic SEO and social-sharing metadata for public pages
- Privacy and cookie behaviour aligned with the actual analytics implementation

## 11. Success metrics
Initial validation targets, to be reviewed after real traffic:
- Demo start rate
- Context completion rate
- First guided task completion rate
- Full demo completion rate
- CTA click-through rate
- Qualified lead conversion rate
- Lead quality by company size, industry and current process

Traffic volume alone is not treated as product-market validation.

## 12. Explicitly out of scope for v1
- Real customer tenant provisioning
- Production authentication
- Real payroll calculation
- Real hardware communication
- AI chatbot
- Fully generated company names and employee datasets
- Multiple complete industry-specific products
- Payment or contract signing
- Claims of guaranteed savings

## 13. Release gate
The portal is ready for public marketing only when:
- Free exploration and assisted recommendations both use the same consistent sandbox state.
- Every demo action works in any order without forcing a role change.
- No persistent or sticky guidance surface covers application content at 320 px or larger.
- All four roles show internally consistent data.
- A worker leave request is visible to the manager and the manager decision returns to the worker view.
- Terminal actions update the correct views.
- Every primary CTA is connected to a functioning lead workflow.
- Analytics events are verified.
- Mobile, accessibility and performance checks pass.
- Demo disclosure and privacy copy are visible and accurate.
