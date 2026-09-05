# Product

<!-- impeccable:product-schema 1 -->

## Platform

web
<!-- Packaged as a local Electron desktop app (Windows NSIS installer); the UI itself is a standard React/Vite web app with no OS-specific design language, so "web" is the correct design platform per the adaptive/native distinction. -->

## Users

Assisted-living / long-term-care facility staff on a single nursing-unit workstation:
- **HCA (Health Care Aide)** and **LPN/RN** staff, printing and working from paper TaskSheets during a shift.
- **Charge staff / supervisors**, generating shift sheets, managing the FYI Binder, and reviewing wound/bathing schedules.
- **Facility administrators**, doing setup: facility profile, rooms, shifts, care/task catalog, service coverage, backup/restore.

The primary "user" of the finished screen is often not looking at it — the actual work product is the **printed paper TaskSheet** a staff member carries during a shift. The application UI's job is to organize input and generate that document correctly, quickly, and legibly at a workstation, not to be a destination in itself.

## Product Purpose

TaskSheet's core value is reducing the cognitive load of running a shift, not adding another system to learn — clarity, continuity, confidence, coordination. It turns resident care assignments, unit/shift responsibilities, and standing facility information into organized, print-ready HCA and LPN working sheets. Core loop: **ORGANIZE → GENERATE → PRINT**. Success is a staff member picking up an accurate, legible paper sheet for their shift with minimal setup friction.

## Positioning

TaskSheet is explicitly **not** a clinical charting system, EMAR, hospital EHR, digital task-completion tracker, or SaaS analytics dashboard. It does not electronically record whether a printed task was clinically performed — that completion-tracking domain was deliberately removed from the architecture (ADR-001) and stays out of the generator and print output. One narrow, deliberate exception: `ResidentTask` carries an opt-in **follow-up-status** field (Due / Carry Forward / Needs Review / Done / No Longer Needed) that drives Dashboard "Resident Follow-up" and Huddle visibility only — an operational continuity reminder so an important task doesn't silently drop off the screen across shifts, not a clinical record of care performed. It never reaches the generator, print output, or `GeneratedShiftSheet`. TaskSheet stores minimal resident information by design (name and room only — no DOB, no health numbers). Its differentiated mechanism is generating a correct printed shift worksheet from lightweight recurrence/shift/role configuration, for facilities that run on paper documentation, not for facilities wanting to go fully digital.

## Operating Context

- Runs local-first on one standalone Windows workstation per facility (no multi-workstation sync in 1.0).
- Used in short bursts around shift changes: a charge nurse or supervisor opens it, checks/edits today's assignments, and prints.
- The printed output (HCA TaskSheet, LPN/RN Clinical Worksheet, Bathing Grid, FYI Binder, wound schedules, blank template) is the primary deliverable and is inspected on paper, at the nursing station and on the floor, often photocopied.
- Demo Mode exists so a facility can explore with clearly-marked fictional data before committing to real setup; provenance (manual/demo/imported) is tracked per record so demo and real data never mix silently.
- Roles map to shift-print profiles: HCA gets a simpler checklist-style sheet; LPN/RN gets a denser clinical worksheet with a Vitals/Results column.

## Capabilities and Constraints

- Confirmed domains: Dashboard, Shifts, Shift Workspace (per-shift generated sheet), Residents, Resident Profile, FYI Binder, Print Center (Report Library, Custom Print Builder, specialized documents, print packages, print preview), Settings (Facility, Rooms & Occupancy, Roles & Shifts, Care Timing, Service Coverage, Preferences, Print Profiles, Quick Add Presets, Attention & Safety, Care Task Catalog, Wound Supply Catalog, Backup & Restore, Demo Workspace, App/Developer Information).
- Recurrence engine, resident-status suppression (Active/In Hospital/Out on Pass/On Hold/Discharged/Deceased/Inactive), wound suppression (active/healing only), shift/date/timezone logic, print data-selection rules, demo provenance, and backup/restore are **verified business logic and out of scope for this and future visual work** unless a defect is confirmed.
- Local application-level user accounts exist (login gate, per-user role, append-only audit trail of who changed what and when). There is no cloud authentication or multi-workstation identity sync — accounts are local to the one workstation, and physical device security still matters, but access is no longer delegated solely to the Windows account.
- No general resident/task CSV import; only catalog import and full JSON backup/restore.
- Overnight shifts (e.g. 2300–0700) are supported and must read correctly across the midnight boundary, in the UI and on paper.
- Natural room sorting must handle non-numeric room labels (e.g. "101A", "L101", "101LF") and must stay visually obvious in any resident-facing list.

## Brand Commitments

- Product name: **TaskSheet**. Publisher: **SoftVibeSolutions** (shown in Developer Information; keep professional and understated, not a marketing identity).
- Existing accent color across the shipped UI is teal; the persistent sidebar uses a dark navy (`#081D3A`) as structural chrome. Treated as evidence, not a binding constraint, for this redesign pass (see DESIGN.md for the resolved direction).
- Tagline: "Less figuring out. More getting through the shift." (revised from the earlier generic "The Smartest Workflow for Modern Healthcare," which read as marketing copy rather than product description).

## Evidence on Hand

- Full existing React/TypeScript/Tailwind v4 source tree under `src/`, an already-built and functioning application (RC26, tagged `v1.0.0-rc.26`) — this is the incumbent visual system and the primary evidence for this redesign.
- Extensive prior audit documentation under `docs/release/` describing verified business rules, print certification status, and known limitations — authoritative for what must not change.
- No customer testimonials, case studies, or press exist or should be fabricated; none are needed for an internal operational tool.

## Product Principles

1. The printed page is the product; on-screen UI exists to produce it correctly and fast, not to compete with it for attention.
2. Minimize resident data and cognitive load — show only what staff need for the current shift/date, not a dashboard of everything.
3. Never blur the three domain concepts staff must trust as distinct: Resident Care Task, Unit/Shift Task, and FYI (standing information, never counted as a task).
4. Compact, scannable, and calm beats decorative — this is workstation software used repeatedly under time pressure, not a product being evaluated on a landing page.
5. Preserve all verified domain logic; this and future design passes touch composition, hierarchy, and visual language, not recurrence/print/data rules.

## Accessibility & Inclusion

Keyboard navigation, visible focus, semantic buttons/labels, modal focus trapping, and color-contrast-independent status communication (not color-only) are required and already partially verified in prior audit passes; this redesign must preserve or improve them, not trade them for visual cleanliness.
