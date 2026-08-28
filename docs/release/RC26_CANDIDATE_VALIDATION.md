# TaskSheet 1.0.0-rc.26 Candidate Validation

- Status: **Not approved for tagging**
- Validation date: 2026-08-27

RC25 remains immutable at `cb5cf7e` and is not reused or modified.

## RC26 accessibility and navigation correction

- Dashboard shift cards, Shift list rows/cards, and Resident rows/cards use native overlay navigation buttons.
- Print, Care Setup, and overflow/menu controls are sibling native buttons rather than nested interactive descendants.
- Navigation buttons have accessible names, native Enter/Space behavior, hand cursors, and explicit `:focus-visible` rings.
- Resident room rows use native buttons with the same explicit focus-visible treatment.
- Redundant **Open**, **Open Shift**, and **Open Resident** visual controls remain removed.

No axe-equivalent package was already present, so no new accessibility framework was added during release closure. Semantic DOM assertions, manual source review, keyboard interaction coverage, and browser accessibility-role queries were used instead.

## Automated evidence

| Gate | Result |
|---|---|
| TypeScript | PASS — 0 errors |
| Unit/component regression | PASS — 154/154 tests across 19 files |
| Focused navigation tests | PASS — Dashboard, Shift List/Cards, Resident List/Cards, nested-action isolation |
| Playwright browser journeys | PASS — 10/10 |
| Keyboard behavior | PASS — Tab order, Enter, Space, and visible focus ring |
| Responsive navigation | PASS — 1280×720, 768×900, and 390×844 |
| Production build | PASS |

The Playwright hang was traced to the Windows test-owned development-server lifecycle. Running the browser suite against a separately managed local Vite server completed normally; the Playwright server command was also changed from an `npm` wrapper to the direct Vite executable.

## Pending release gate

Physical HCA, LPN, FYI Binder, and dense specialized print acceptance remains pending under `PRINT_CERTIFICATION_RC26.md`. RC26 must not be tagged or packaged until that candidate typography gate passes. If it passes, create the immutable `v1.0.0-rc.26` tag from the exact clean candidate source and package only from that tag; repeat artifact-specific print verification during clean-machine validation.
