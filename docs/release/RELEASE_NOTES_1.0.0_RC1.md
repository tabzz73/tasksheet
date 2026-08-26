# Release Notes - TaskSheet 1.0.0-rc.1

Status: **Ready for Controlled Production Pilot; not approved for production release**

## Candidate scope

- Shift-organized HCA and LPN TaskSheet generation and printing.
- Resident tasks, unit tasks, recurring schedules, FYIs, wounds/status information, Quick Add, print packages, backup, and restore.
- Optional Welcome/Why TaskSheet presentation layer, independently controlled from demo data.

## Safety and reliability correction

Timed work is now filtered by one shared, end-exclusive shift-window rule before rendering. A 0700-1500 shift accepts 0700 through 1459; 1500 belongs to the next shift. A 2300-0700 shift accepts 2300 through 2359 and 0000 through 0659. Invalid or out-of-shift resident and unit work is excluded and reported as a Needs Review exception. Data-entry workflows also prevent saving known time/shift mismatches.

Regression coverage includes resident, unit, imported, and edited tasks; normal and overnight boundaries; exception propagation into print models/packages; and cross-shift unit-task leakage protection.

Recorded verification on 2026-08-25: 91/91 automated tests passed.

## Release closure policy

The 1.0 operational feature set is frozen. Pilot findings are classified P0-P3. P0/P1 block release, P2 requires disposition, and P3 is deferred to 1.1.

## Outstanding gates

- Controlled production pilot not yet executed.
- Clean Windows install/upgrade/print validation not yet executed.
- Typecheck, regression, production web build, source provenance, and the guarded NSIS pilot-installer pipeline pass. Clean-machine and controlled-pilot validation remain pending.
- The polished public 45-75 second demo video is not yet present at `public/tasksheet-60-second-demo.mp4`.
