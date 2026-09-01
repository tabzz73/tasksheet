# TaskSheet RC26 Conflict Validation Implementation Report

Date: 2026-08-28  
Release state: development source only; version/tag/installer metadata unchanged

## Outcome

TaskSheet now uses centralized, structured domain validation for the highest-risk scheduling mutations. Normal UI saves cannot create an out-of-shift timed resident task, unit task, active wound schedule, duplicate bathing assignment, over-capacity bathing schedule, or duplicate operational task. Shift edits and deletions are dependency-checked before commit. Multi-record task creation validates against a simulated next state and commits once, so a rejected row leaves the full batch unchanged.

The application remains an ORGANIZE -> GENERATE -> PRINT system. No electronic completion tracking was introduced.

## Architecture introduced

- `src/services/validation/index.ts`
  - Shared `ValidationResult` contract with severity, stable code, context, affected records, and recommended actions.
  - `DomainConflictError` for expected business-rule conflicts.
  - Military-time, shift-window, bathing, task-assignment, shift-impact, shift-deletion, overlap, and capacity validators.
- `src/components/common/ConflictNotice.tsx`
  - Accessible, icon-and-text conflict presentation that does not rely on color alone.
- Database mutation gates in `src/db/index.ts`
  - Validation is enforced below React, rather than only in individual screens.
  - State revision increments and optional expected-revision checks protect supported edit flows against stale overwrites.
- Task timing model in `src/types/index.ts`
  - Fixed Time, Start of Shift, End of Shift, and During Shift/Period.

## Rules implemented

### Time and shifts

- Exactly four military-time digits from `0000` through `2359`.
- Shift start inclusive; shift end exclusive for fixed-time tasks.
- Correct overnight membership, including `2300-0700` and after-midnight task times.
- Validation for resident tasks, unit tasks, wound schedules, and generator hardening.
- Shift changes analyze dependent resident tasks, unit tasks, bathing assignments, wounds, role changes, and overlaps before save.
- Fixed tasks remain fixed and block incompatible shift changes.
- semantic Start-of-Shift and End-of-Shift times follow approved boundary changes atomically.
- Shift deletion is blocked while active dependencies remain; deactivation is offered as the safer alternative.

### Bathing

- Same resident/day/shift duplicates blocked.
- Same resident/day on another shift blocked unless facility policy explicitly allows it.
- Configurable per-shift-line capacity enforced before commit.
- Capacity reductions below current recurring assignments blocked without deleting data.
- Optional resident weekly bathing frequency enforced.
- Inactive shifts blocked.
- Hospital/pass/hold schedules remain configured and are excluded or annotated by the existing operational generation rules; they are not erased.
- Room moves retain resident-owned bathing schedules and update the displayed occupancy label.

### Other operational records

- Duplicate resident and unit task/time assignments blocked.
- Permanently inactive, discharged, or deceased residents cannot receive new operational tasks.
- Inactive catalog tasks cannot be assigned.
- Duplicate resident-scoped FYIs blocked.
- Duplicate active wound locations blocked.
- Active/healing wounds require a dressing protocol in the normal UI.
- Resolving/discontinuing an active wound requires an explicit impact acknowledgement and explains that future recurrence will stop.
- Existing room/bed occupancy protections remain authoritative, including distinct labels such as `101A` and `101B`.
- Unsaved-change warnings cover the main task/wound/FYI/resident add modal and shift configuration modal.

## Recovery and atomicity

- Expected conflicts preserve entered form values and return corrective actions.
- Stale expected-revision writes are rejected instead of overwriting the newer state.
- Bulk resident-task creation is all-or-nothing.
- Rejected shift edits, capacity edits, and task edits leave the prior state intact.
- Backup restore remains parse/migrate-then-commit; generator validation continues to quarantine legacy invalid timing instead of printing it on the wrong shift.
- Demo cleanup remains source/provenance based and does not remove manual records.

## UI states implemented

- Invalid Time Format
- Task Outside Shift
- Shift Inactive / Missing
- Duplicate Task Assignment
- Shower Already Scheduled
- Shower Already Assigned for This Day
- Shower Capacity Reached
- Weekly Shower Requirement Already Met
- Existing Assignments Exceed New Capacity
- Shift Change Creates Conflicts
- Shift Times Overlap
- Shift Has Dependencies
- Catalog Item Inactive
- Resident Not Operationally Active
- Duplicate Wound / Duplicate FYI
- Future Wound Care Will Stop
- This Record Has Changed
- Unsaved Changes
- Critical safe-save fallback that preserves the form and hides stack traces

## Tests added

`src/test/conflictValidation.test.ts` adds 24 cases covering:

- invalid and valid military-time formats;
- daytime start/end boundaries;
- overnight boundaries;
- first/second/third bathing capacity behavior;
- same-shift and cross-shift bathing duplicates;
- inactive shifts;
- rejected out-of-window edits with state preservation;
- shift shortening impact;
- semantic start/end task adjustment;
- overlap impact warnings;
- capacity reduction rollback;
- atomic batch rollback;
- stale record rejection;
- wound time validation;
- duplicate FYI and wound handling.

Existing suites continue to cover resident status printing, room occupancy and multi-bed isolation, recurrence, generation, wound workflows, backup/restore, demo cleanup, print output, and responsive navigation.

## Known limitations / intentionally deferred

- TaskSheet currently has no general resident/task CSV operational-import workflow. Catalog import and full backup restore are separate workflows. A future row-based import feature must use a staged Import Review transaction with row-level corrections; no new import surface was added in this release-hardening change.
- Revision validation is local-state optimistic concurrency. True simultaneous multi-workstation guarantees require a shared transactional server/database, which the standalone local-storage deployment does not currently provide.
- Guided alternatives are presented as recommended actions and affected records. A full drag/drop or bulk conflict-resolution workspace was not introduced late in RC26.
- Unsaved-change protection is applied to the high-risk scheduling modals changed here. A later systematic navigation-guard audit is still appropriate for every low-risk settings editor.
- Shift-role analysis conservatively flags active wound protocols for review. A future credential-policy matrix can extend this to facility-specific scope-of-practice rules without hard-coding jurisdictional clinical policy.
- Physical print certification remains a separate manual release gate.

## Release assessment

The newly automated high-risk scheduling, capacity, time-boundary, occupancy, and atomicity checks are passing. This report does not authorize tagging or packaging. RC26 remains mutable development source until the complete automated suite, browser journeys, build, clean-tree review, and required physical print certification are recorded.

## Verification recorded on 2026-08-28

- TypeScript (`npm run typecheck`): PASS, 0 errors.
- Unit/component regression (`npm test`): PASS, 223/223 tests across 27 files.
- Production build (`npm run build`): PASS.
- Playwright browser journeys (`npx playwright test`): PASS, 13/13.
- Existing non-blocking build observation remains: the primary minified bundle exceeds Vite's 500 kB advisory threshold. No behavior or startup regression was observed in the browser audit.
- Physical print certification: not run by this implementation; remains pending/manual.
