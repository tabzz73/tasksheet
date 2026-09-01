# TaskSheet 1.0.0-rc.26 — Known Limitations

This list contains only genuine, current, accepted limitations of the product as designed or as a documented trade-off. Resolved defects are not listed here — see `RELEASE_NOTES_1.0.0-rc.26.md` for what was fixed this cycle.

## Deployment

- TaskSheet 1.0 supports one standalone Windows workstation. It does not synchronize a live operational database between computers.
- The live database must remain local to that workstation. Exported backup files may be stored in a facility-approved network or external location.
- TaskSheet has no application-level user accounts, administrator permissions, or centralized authentication. Windows account and physical-device security are required to restrict access.
- No runtime commercial licensing or activation enforcement is included.

## Data / Import

- No general resident/task CSV import is included. Catalog import (task templates) and structured full-database backup/restore are the only supported import paths. Do not represent unknown-row-mapping CSV import as a 1.0 capability.
- A legacy wound record imported from a pre-shift-assignment backup with no `shiftId` will not appear on the primary per-shift TaskSheet (it does surface a configuration warning on the dedicated Wound Schedule report). New wounds cannot be created without an assigned shift, so this can only affect old imported data, not anything created in 1.0.
- A shift that is fully deleted (not deactivated) while it still has *stopped* resident/unit tasks or *resolved* wounds referencing it will leave those historical records with a dangling shift reference. This does not cause a crash (consumers look the shift up defensively) but can show a blank shift name in stopped-task history views.

## Printing

- Print preview cannot replace physical printer certification. Driver margins, scaling, orientation, pagination, and fallback fonts must be validated on the target printer — see `RC26_PHYSICAL_PRINT_VALIDATION.md`.
- Native browser/Electron print dialogs cannot always distinguish "no printer available" from "user cancelled the print job." Facility IT should confirm printer availability independently if a print appears to silently fail.

## Recurrence / Scheduling

- A finite-course task or wound (an "after N occurrences" schedule) counts scheduled calendar occurrences, not electronically confirmed care. TaskSheet does not track digital completion, so hospital days, pass days, hold days, missed days, or days the sheet was not printed do not automatically extend the course.
- Restarting a stopped recurring item begins the preserved recurrence pattern on the selected restart date. This requires clinical/administrative review — TaskSheet does not attempt to infer whether the intervening gap was clinically appropriate.

## Performance

- The production JavaScript bundle is approximately 982 KB (233 KB gzipped) as a single chunk. This is flagged by the build tool as a size advisory, not a measured performance problem. Code-splitting is deferred to 1.1 unless clean-machine startup/navigation testing shows an actual problem.

## Architecture (not user-facing, noted for completeness)

- `src/db/index.ts` (~1,400 lines) is a single persistence-layer file covering all entity types. This is a maintainability observation, not a functional limitation, and is deliberately not being restructured during a certification-focused release cycle.
