# TaskSheet RC26 Service Coverage Implementation Report

Date: 2026-08-28  
Release metadata: unchanged (`1.0.0-rc.26` development source; no tag or installer produced)

## Outcome

Service Coverage is now an operational classification on each resident task assignment. It identifies why a service is provided without adding billing, prices, invoices, payment status, or financial information. Coverage does not bypass TaskSheet's capacity, shift-time, duplicate, recurrence, resident-status, occupancy, or shift-impact rules.

## Data model and migration

- Added `ServiceCoverageDefinition` and assignment-level `TaskServiceCoverage` snapshots.
- Resident tasks store coverage type, label/short-code/icon snapshots, effective dates, additional-service status, and an optional non-financial reference note.
- Existing tasks without coverage are interpreted as `Funded / Authorized`; no destructive migration is required.
- Backup/export automatically includes assignment coverage and facility definitions because both remain inside the existing structured application state.
- Restore uses the current settings migration, seeding built-in definitions when an older backup lacks them while preserving stored snapshots.

## Default definitions

- Funded / Authorized — no print indicator.
- Private Pay — `$`.
- Complimentary — `★` (`COMP` short code).
- Facility Included — `INC`.
- Temporary Exception — `!`.
- Custom / Other — `OTHER` baseline, plus administrator-created custom classifications.

## UI changes

- Resident task Add/Edit now includes an accessible Service Coverage selector.
- Exceptional classifications expose Additional Service, effective start/end dates, and an optional coverage note.
- Temporary Exception without an end date displays an operational warning.
- End-before-start is blocked inline/through the shared conflict notice.
- Changing an existing assignment's coverage requires explicit impact acknowledgement.
- Resident Care Tasks show exceptional badges and a grouped Service Coverage summary.
- Settings > Facility > Service Coverage manages built-in classifications and adds unique custom name/short-code definitions.
- Referenced definitions are deactivated rather than erased; assignment snapshots remain readable.

## Scheduling and conflict behavior

- Funded bathing occurrences count toward `bathingFrequencyPerWeek`.
- Explicit exceptional/additional occurrences do not consume the funded frequency allocation.
- Additional Private Pay or Complimentary bathing remains subject to same-day duplicate and shift/day capacity rules.
- All coverage types remain subject to fixed-time and overnight shift validation.
- Disjoint recurring assignments with the same task/time are no longer misclassified as duplicates; duplicate detection checks schedule overlap.
- Future-start coverage does not generate early.
- Expired coverage stops future generation without deleting the assignment or its historical configuration.
- Shift shortening/deletion impact automatically includes covered tasks because coverage does not create a separate scheduling path.
- Existing optimistic revision checks protect coverage edits made through the resident-task editor from stale overwrites.

## Print and reports

- HCA/LPN task titles receive compact exceptional indicators; funded tasks remain uncluttered.
- A Service Coverage legend prints only when exceptional classifications occur on the document.
- Bathing grid cells append compact indicators such as `118 $` and print a used-items-only legend.
- Print Center report fields now include Coverage, Coverage Code, Additional Service, and Coverage Dates.
- Added `Current Private Pay Services` and `Coverage Expiring Soon` report presets.
- Recurring care reports respect coverage effective dates.

## Tests added

`src/test/serviceCoverage.test.ts` adds 10 focused tests:

- funded default/migration behavior;
- private-pay snapshot and no-financial-data scope;
- funded frequency versus additional private-pay bathing;
- funded-frequency blocking;
- capacity protection;
- shift-time protection;
- invalid date periods;
- future/active/expired generation;
- TaskSheet indicator and conditional legend;
- bathing-grid indicator and Private Pay report filtering.

Playwright Journey 11 verifies Settings classifications and accessible resident-task coverage entry.

## Verification

- TypeScript: PASS, 0 errors.
- Unit/component tests: PASS, 233/233 across 28 files.
- Playwright: PASS, 14/14.
- Production build: PASS.
- Existing non-blocking bundle-size advisory remains.
- Physical print validation of the new symbols/legends remains a manual release gate.

## Known limitations and deferred items

- The standalone app has no general row-based resident/task CSV importer. Coverage is included in backup/export, reports, and restored application state. A future CSV importer must add staged unknown-code mapping and transactional row review rather than silently guessing coverage.
- Local revision checking prevents stale saves in supported editors, but true simultaneous multi-workstation transactions require a shared server/database deployment.
- Role/credential validation continues to use TaskSheet's configured shift roles and wound clinical-shift restrictions. A facility/jurisdiction-specific credential matrix is not hard-coded.
- Coverage end dates stop generation and appear in reports; TaskSheet does not push background expiry notifications while closed.
- Definition deactivation is supported. Reactivation/editing of inactive custom definitions can be expanded in a later administrative refinement; historical assignment snapshots already remain readable.
- Physical print certification must confirm `$`, `★`, `!`, and custom short codes on the facility printer before release approval.

## Release assessment

No known path in the implemented normal resident-task workflow permits exceptional coverage to bypass capacity, time-window, duplication, recurrence, resident lifecycle, or shift dependency validation. This change does not authorize tagging or packaging; the workspace remains development source pending normal release gates and physical print certification.
