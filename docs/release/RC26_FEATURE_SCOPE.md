# TaskSheet 1.0.0-rc.26 — Authoritative Feature Scope

Status: **Feature Frozen** as of this document.
Scope decision: **Option B** — the Report & Print Center expansion (Report Library, Custom Report Builder, Service Coverage, Room Setup, compact weekly Bathing Grid) is IN 1.0.0 scope and will be certified alongside the operational core, not deferred to 1.1.

This document is built by inspecting the actual repository (navigation, Settings tabs, Print Center document list, service layer) as of commit `40165e8` plus the working-tree changes described in `RC26_RELEASE_EVIDENCE_INDEX.md`. Nothing below is aspirational — every item listed is implemented and reachable in the running application. Anything not listed here is out of scope for 1.0.0.

## How to read this document

- **IN RC26** — implemented, reachable in the UI, and part of the frozen scope.
- **Certification status** — `Certified` (covered by the automated suite and/or the prior audit passes with no open defect), or `Pending` (implemented, but requires the clean-machine/physical-print cycle before it can be called certified — this is the "implemented but not yet certified" distinction the product decision explicitly calls out).

---

## 1. Core Operational

| Feature | Certification status |
|---|---|
| Dashboard (today's shift summary, resident/active-shift/FYI-binder counts, Quick Add) | Certified |
| Shifts list (list/card view, per-shift resident-care/unit-task counts, print action) | Certified |
| Shift Workspace (per-shift generated sheet: start/during/end unit tasks, resident assignments, PRN section, resident status exceptions, wound sections, edit/stop/restart/delete actions) | Certified |
| Residents directory (list/card view, status badges, room display) | Certified |
| Resident Profile (care tasks, wounds, FYIs, status change, restart/resolve/delete actions) | Certified |
| Global "+ Add" (context-aware resident task / unit task / wound / FYI creation) | Certified |
| Quick Care Setup (bundled AM/PM care, meal, stock-check presets) | Certified |
| FYI Binder (facility/role/shift-scoped standing information, binder confirmed-current tracking) | Certified |

## 2. Setup / Administration (Settings)

| Feature | Certification status |
|---|---|
| Facility Setup (identity, address, print branding, quick-contact extensions, header layout preview) | Certified |
| Rooms & Occupancy (single/multi-occupancy/range room creation, rename, activate/deactivate, natural sort) | Pending — new this cycle (`RoomSetupTab`) |
| Roles & Shifts (add/edit/duplicate/deactivate/delete shift, custom short codes, overnight shift support, shift-change/deactivation conflict warnings) | Certified |
| Care Timing Presets (medication/meal quick-time presets) | Certified |
| Service Coverage (funded / private-pay / complimentary / facility-included / temporary-exception / custom classifications) | Pending — new this cycle (`ServiceCoverageSettingsTab`) |
| Preferences (clock format, operational week start, developer footer, welcome-page behavior) | Certified |
| Print Profiles (HCA/LPN layout, density, vitals columns, handoff lines) | Certified |
| Quick Add Presets (facility-configurable shortcuts) | Certified |
| Attention & Safety (facility attention-rule patterns, smart-suggestion toggle) | Certified (ReDoS-hardened this cycle) |
| Care Task Catalog (Alberta Starter Catalog, active/inactive toggle, reset to standard) | Certified |
| Wound Supply Catalog (facility stock, sizes, reorder levels) | Certified |
| Backup & Restore (export/import full database) | Certified |
| Demo Workspace (load/clear demo data) | Certified |
| App Information (version, welcome-page behavior, presentation mode) | Certified |
| Developer Information (publisher identity) | Certified |

## 3. Print / Report (Print Center)

| Document | Certification status |
|---|---|
| Per-shift HCA TaskSheet (Quick Print, individual and "Print All Shifts") | Certified |
| Per-shift LPN/RN Clinical TaskSheet | Certified |
| Blank TaskSheet Template (facility header + blank writable rows, no resident data) | Certified — this cycle's P1 privacy fix, regression-tested |
| HCA Daily Package / LPN Clinical Package (multi-document bundles) | Certified |
| Weekly Bathing Grid (specialized document) | Certified |
| Compact weekly Bathing Grid (Report Library preset) | Pending — new this cycle |
| Wound & Dressing Treatment Schedule | Certified |
| Weekly Wound Care Overview | Certified |
| Wound Supplies Re-Order List | Certified |
| Upcoming 7-Day Care Lookahead | Certified |
| Master Shift Configuration Reference | Certified |
| FYI Standing Information Binder | Certified |
| What Changed (delta sheet since last print) | Certified |
| Printer Hardware Calibration Sheet | Certified |
| Report Library — system presets (Residents, Wound Care, Care & Tasks, FYI, Facility/Setup, Bathing categories — see `services/reports/index.ts` `SYSTEM_REPORT_PRESETS` for the exact list) | Pending — new this cycle |
| Custom Print Builder (source/filter/column/grouping/sorting/layout guided report) | Pending — new this cycle |

## 4. Data Management

| Feature | Certification status |
|---|---|
| Full database export (JSON backup) | Certified |
| Full database restore (with shape validation, duplicate-ID rejection, and atomic rollback on failure — hardened this cycle) | Certified |
| Standard catalog reset | Certified |
| Demo data load / clear (source-tagged, provenance-isolated from manual/imported records — hardened this cycle) | Certified |
| Catalog import (facility task-template import) | Certified |
| **Not implemented**: general resident/task CSV import. This is a known, documented product limitation, not a defect — see `RC26_KNOWN_LIMITATIONS.md`. | N/A — out of scope |

## 5. Help / Application Information

| Feature | Certification status |
|---|---|
| App Information tab (in-app: version, welcome-page controls) | Certified |
| Developer Information tab (in-app: publisher identity) | Certified |
| User Manual | **Documentation only** (`docs/release/USER_MANUAL_1.0.md`) — there is no in-app "User Manual" screen. Confirmed by inspecting the navigation and Settings tab list; nothing was invented to fill this gap. |

---

## Explicitly OUT of scope for 1.0.0

Per the feature-freeze decision, none of the following exist in the codebase and none should be implied by release documentation or marketing copy:

- Digital task/medication completion tracking (explicitly removed under ADR-001; `LegacyCompletion` is retained only for safe migration of old data).
- General resident/task CSV import.
- Multi-workstation / networked / Facility Mode deployment.
- Application-level user accounts, roles, or permissions.
- Runtime licensing/activation enforcement.
- Cloud sync, messaging, AI features, staff scheduling, or analytics dashboards.
