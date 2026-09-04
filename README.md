# TaskSheet

**TaskSheet** is a local-first operational planning and print-support application for long-term care and assisted living teams.

It is designed to complement systems such as PointClickCare, Yardi, eMAR, and other facility-approved clinical or resident-management platforms — not replace them.

> **The clinical system documents the care. TaskSheet helps you run the shift.**

TaskSheet brings the operational picture of the unit into one place: shift assignments, resident follow-up, FYIs, attention items, bathing, wounds, huddle information, and purpose-built printouts for frontline staff.

## Why TaskSheet

A facility may already have a strong clinical system and still rely on handwritten assignment sheets, whiteboards, verbal reminders, bathing grids, wound lists, temporary tracking notes, and manually prepared shift paperwork.

TaskSheet fills that operational gap.

It helps the LPN/RN or Team Lead quickly answer questions such as:

- Who is in hospital or out on pass?
- What changed since the previous shift?
- Which residents need follow-up today?
- What tasks must not be missed?
- What temporary unit or site situations are active?
- What FYIs should staff hear during huddle?
- What needs to be printed for this shift?

For casual, float, or unfamiliar staff, the generated TaskSheet becomes a practical **shift guide** — a clear starting point for understanding the assignment without replacing orientation, facility policy, or the official care record.

## Core product principle

**ORGANIZE → GENERATE → PRINT**

TaskSheet is intentionally focused on operational clarity and working-sheet generation rather than becoming another full clinical charting system.

## Key capabilities

### Operational Dashboard

- Current census and away-from-unit visibility
- Current Unit Situation
- Resident Attention
- Resident Follow-up / must-not-miss tasks
- Important FYIs
- Shift Huddle view
- Code of the Month / configurable safety reminders
- Dashboard attention indicators and configurable cards

### Shift Operations

- Shift list and Shift Workspace
- Role- and shift-aware task routing
- Resident Tasks and Unit Tasks
- Bulk assignment tools
- Follow-up continuity across shifts/days
- Overdue and carry-forward visibility
- Tracking progress such as `Day 4/5`
- Occurrence-based follow-up such as `2/3 collections`

### Residents

- Resident list and profile
- Smart resident search/select controls
- Care-task assignment
- Resident status handling
- Resident / Unit / Site Attention
- Wounds and wound supplies
- Bathing schedule

### FYI Binder

- Standing operational FYIs
- Role / shift scope
- Effective and expiry windows
- Dashboard and Huddle visibility
- Printable FYI Binder

### Print Center

TaskSheet treats printing as a first-class workflow.

Dedicated operational documents include:

- HCA TaskSheet
- LPN/RN Clinical Worksheet
- Bathing Grid
- Weekly Wound Schedule
- Wound Supply Re-order Worksheet
- FYI Binder
- 7-Day Lookahead
- Blank Templates
- Printer Calibration / reference documents

The Print Center also supports:

- Quick Print
- Print Packages
- Saved Print Packages
- Print History
- Paper-accurate preview
- Preflight warnings
- Custom Report Builder
- Saved custom-report presets
- Natural room sorting
- Resident and wound status suppression
- Overnight-shift handling

Print layouts are optimized for **Letter paper, 100% / Actual Size, monochrome laser printing first**, with inkjet compatibility and paper/toner conservation in mind.

## Custom reporting

Managers can build one-off or recurring reports from TaskSheet data without requiring a new developer-built report each time.

Examples:

- All residents with active wounds
- Current behaviour tracking
- Overdue Resident Follow-up
- Bathing assignments grouped by shift
- Current wound-supply usage
- Census by room/status
- Role- or shift-specific FYIs

Custom reports can be previewed, printed, and saved as reusable presets.

## Source of truth

TaskSheet is an organizational and print-support tool.

It does **not** replace the facility's official clinical record, care plan, eMAR, MAR/TAR, orders, medication system, or approved policies.

If information in TaskSheet conflicts with the facility-approved source of truth, the official facility record takes precedence.

Applicable HCA/LPN printouts use the concise notice:

> **Shift guide only — verify against your site’s approved source of truth. If there is any discrepancy or unclear instruction, check with the Team Lead before proceeding.**

## Local-first design

TaskSheet is designed as a Windows desktop application with local persistence for normal day-to-day operation.

Key principles include:

- Local workstation operation
- No cloud dependency for normal use
- Local backup / restore
- Demo / Real / Empty data modes
- Provenance-aware demo/imported/manual data
- Accessible keyboard interaction
- Print-safe operational output

## Technology

The application is built with a modern desktop/web stack centered on:

- Electron
- React
- TypeScript
- Tailwind CSS
- Local browser/Electron persistence

The repository source remains the authority for exact dependency and runtime versions.

## Development status

TaskSheet is under active development and release hardening.

Do not infer production certification from the repository README alone. Release readiness is determined by the repository's version, release evidence, automated verification, packaged-build validation, and physical-print validation.

See [`VERSIONING.md`](VERSIONING.md) for versioning and Git release rules and [`CHANGELOG.md`](CHANGELOG.md) for release notes.

## Git / release policy

- `main` is the protected release-ready integration branch.
- Development work should be done on short-lived feature/fix branches.
- Use semantic versioning (`MAJOR.MINOR.PATCH`) with prerelease identifiers such as `1.0.0-rc.1` when appropriate.
- Keep application version identifiers synchronized across package/runtime metadata before tagging a release.
- Release tags should use the form `v1.0.0` or `v1.0.0-rc.1`.
- Every release candidate should pass the repository's full verification suite before tagging.

## Publisher

**SoftVibeSolutions**  
Healthcare workflow and productivity software

## Repository

This repository contains the source code and release documentation for TaskSheet.

Copyright © SoftVibeSolutions. All rights reserved.
