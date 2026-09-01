# TaskSheet Report & Print Center — Change / Risk Report

Date: 2026-08-28  
Baseline commit: `40165e8ee39ffacf521f3a968c818733c4ccd848`  
Release metadata observed: `1.0.0-rc.26`  
Tag/package action: **Not performed**

## Scope delivered

- Shared report-definition engine for system and user presets.
- Privacy-limited sources for Residents, Resident Care, Recurring Care, Care Tasks, Unit Tasks, Shifts, Rooms, FYIs, Wounds, Wound Supplies, Care Catalog, and Bathing.
- Guided builder flow: source, filters, columns/order, grouping, sorting, layout, density, preview, and print.
- Matching-record count, page estimate, active-filter summary, empty-result blocking, and large-report warning.
- User preset save, edit/rename, duplicate, and delete. Presets store configuration only.
- Administrative CSV export restricted to non-clinical tabular sources.
- Shared custom-report renderer using the approved TaskSheet print typography and repeating footer/page-number standard.
- Date-range recurring-care expansion through the existing recurrence engine (bounded to 90 days per report).
- Compact weekly bathing grid by shift line and configured operational week, with room-only identity, configured capacity, availability, and over-capacity visibility.
- Bathing Assignment Detail, Residents With Bathing Care, Bathing Capacity/Open Slots, and Bathing Scheduling Gaps presets.
- Facility setting for bathing capacity per shift line/day.
- AcuiCare-style weekly bathing grid with configurable bathing-capable shift lines, repeated report/weekday headers, explicit available positions, neutral capacity display, and preview-visible over-capacity exceptions.
- Existing specialized HCA, LPN, FYI Binder, wound, and package renderers remain in place.

## Automated evidence

- TypeScript: PASS — 0 errors.
- Unit/component tests: PASS — 190/190.
- Playwright: PASS — 13/13, including Report Library and compact bathing preview.
- Production build: PASS.
- Lint: PASS with warnings already present across the wider codebase; no lint error.
- Known bundle observation remains: main JavaScript bundle is approximately 908 kB before gzip / 214 kB gzip.

## Remaining manual gates

- Physical print validation for portrait and landscape generic reports, including multi-page repeated headings and footer clearance.
- Three bathing physical samples: normal week, high-capacity week, and assignment detail.
- Saved-preset backup/restore and upgrade persistence on a clean installation.
- Manual review of real facility bathing configurations where multiple separate bathing tasks occur for the same resident/day.

## Risk assessment

| Area | Risk | Control |
| --- | --- | --- |
| Release scope | High | This is a material feature expansion and must not be folded into an already certified RC without a new full acceptance cycle. |
| Privacy | Low–Medium | Builder exposes only explicitly approved fields; compact bathing grid is room-only. Physical-output review remains required. |
| Pagination | Medium | Shared typography/footer and repeated table headers are implemented; physical printers remain the final authority. |
| Data persistence | Medium | Presets are added to facility settings. Backup/restore and upgrade validation remain manual gates. |
| Recurrence | Medium | Uses the hardened recurrence engine and is read-only, but date-range reports add a new consumption path. |
| Existing operational core | Low | No task generation, shift assignment, resident lifecycle, import, backup, or HCA/LPN generator logic was changed. |

## Release recommendation

Do **not** tag or package this working tree as RC26. The Report & Print Center is large enough to be treated as a 1.1 feature line (recommended) or, if it must ship in 1.0, as a new release candidate with a complete clean-machine and physical-print certification cycle. Preserve the pre-expansion baseline commit and its evidence independently.

Current decision: **Implementation validated in development; release designation pending product-owner approval and physical print certification.**
