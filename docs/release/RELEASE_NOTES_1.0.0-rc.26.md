# TaskSheet 1.0.0-rc.26 — Release Notes

Status: **Feature Frozen — Source Ready for Clean-Machine Certification** (not yet tagged, not yet packaged, not production-released)

## Intended scope

RC26 is the first candidate to include the Report & Print Center expansion (Report Library, Custom Print Builder, Service Coverage configuration, Room Setup, compact weekly Bathing Grid) as part of 1.0.0, alongside the existing operational core (Dashboard, Shifts, Shift Workspace, Residents, FYI Binder, and the original HCA/LPN/Bathing/Wound/FYI Binder print set). See `RC26_FEATURE_SCOPE.md` for the complete, itemized inventory and per-feature certification status.

## Major improvements since RC25

**Data integrity**
- Fixed: clearing demo data (or converting from demo to a real setup) could delete manually-entered or imported resident tasks/unit tasks if they happened to be assigned to a demo-tagged shift. Manual/imported records are now always preserved; if their shift was removed, they fall back to matching by role instead of disappearing.
- Fixed: restoring a backup missing the `unitTasks` or `fyis` collections left them `undefined` instead of defaulting to empty, risking a crash on first use. Restore now rejects backups containing duplicate record IDs across any tracked collection.

**Security / hardening**
- Fixed: facility-entered Attention Rule patterns (regular expressions) had no protection against catastrophic backtracking (ReDoS) and were re-evaluated on every keystroke while entering a task. A malicious or accidental pattern could freeze the application for every user. Patterns are now validated at save time and defensively skipped at evaluation time if unsafe.

**Print system**
- Fixed (P1, privacy): the "Blank TaskSheet Template" button printed a fully-populated live shift sheet, including real resident names, rooms, and tasks, despite being labeled as an intentionally blank form. It now generates a genuinely blank document — facility header plus blank writable rows only — through the same production print renderer used for live sheets.
- Fixed: HCA TaskSheets silently dropped structured paper-tracking prompts (bowel, blood glucose, weight, vitals write-in fields) because the Vitals/Results column — where these are normally displayed — is LPN-only by design. The prompt is now folded into the Important Information column on HCA sheets instead of disappearing.
- Fixed: global print CSS was overriding the per-row padding used to give multi-line vitals rows extra space on the physical printout.
- Removed: two dead print document components (`HcaChecklistDocument`, `LpnClinicalDocument`) that were covered by tests but never actually rendered in the shipped application; the test that exercised them now exercises the real production renderer, which is what surfaced the HCA tracking-prompt defect above.
- Removed: an "Include Active FYIs" package-print toggle that had no effect (FYIs print regardless of the toggle's state).

**Date / timezone correctness (P1)**
- Fixed: the application computed "today" using the UTC calendar date (`new Date().toISOString().split('T')[0]`) in roughly fifteen places, rather than the local calendar date. In any negative-UTC-offset timezone (all of North and South America), this is already "tomorrow" for the back half of every evening. Depending on the local clock time, this could cause: a new recurring task or wound not appearing on the TaskSheet for the day it was created; the Today/Tomorrow navigation buttons pointing at the wrong dates; a resident FYI disappearing from the binder one day before its actual local expiry date; and incorrect default date ranges in Report Center. Fixed at the root (local-date extraction helpers) and at every call site found; covered by a dedicated regression test that pins a real negative-offset timezone so the defect cannot silently return in a UTC-hosted CI environment.

**Accessibility / UX**
- Every dialog in the application (including all destructive confirmations, which previously used the browser's native `confirm()`/`prompt()`) now uses the application's own accessible modal system, with a focus trap, initial focus, focus restoration on close, and Escape-to-close.
- Restore Backup — the single most destructive action in the application — previously had no confirmation prompt at all; it now requires explicit confirmation, matching every other destructive action.
- Deactivating a shift with active resident tasks, unit tasks, or wounds previously produced no warning, silently stopping those items from ever generating again; it now warns with the specific counts before proceeding.
- Delete-confirmation dialogs previously always read "Delete This Care Task?" regardless of whether the item was a wound, unit task, or FYI; they now name the correct entity type.

**Visual design**
- The Welcome/Overview screen was rebuilt to match the application's calm, restrained visual language (removed decorative gradients, glow effects, hover-lift buttons, and a six-color marketing card grid).
- Two Settings tabs with an inconsistent dark-gradient header now match every sibling tab's plain white-card style.
- Fixed a mobile-width layout defect where a long facility name could overlap the Demo Mode banner beneath it.

**Release engineering**
- Fixed: the `npm run typecheck` command was silently checking zero files due to how the project's TypeScript project-reference configuration interacts with plain `tsc --noEmit`. The production build's own `tsc -b` step was genuinely type-checking all along, so this did not let type errors into prior shipped builds — but the dedicated verification gate was not doing what its name promised. It now runs a real, verified check.

## Known limitations

See `RC26_KNOWN_LIMITATIONS.md` for the current, accurate list. Resolved defects (above) are not repeated there.

## Certification status

- Automated release gate: PASS (typecheck, 266/266 unit tests, production build, 0 lint errors, 14/14 Playwright journeys) — see `RC26_RELEASE_EVIDENCE_INDEX.md` for the exact commands and timestamps.
- Clean-machine installation, first-launch, and destructive-recovery testing: **not yet performed** — see `RC26_CLEAN_MACHINE_VALIDATION.md`.
- Physical print certification: **not yet performed** — see `RC26_PHYSICAL_PRINT_VALIDATION.md`.
- Source tagging and packaging: **not yet performed**. The working tree is intentionally uncommitted and untagged pending review of this preparation package.

**This is a source-readiness statement, not a production-release statement.** TaskSheet 1.0.0 is not ready for production use until the clean-machine and physical-print certification cycles are complete and their evidence is recorded.
