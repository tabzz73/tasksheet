# Release Notes - TaskSheet 1.0.0-rc.2

Status: **Pilot Artifact Ready; clean-machine validation pending**

## Scope

RC2 is a narrow correction for `CM-P1-001`. Generator, recurrence, shift-window filtering, print composition, backup serialization, catalog import, and resident-care behavior remain frozen from RC1 except where backup restoration must identify legacy RC1 demo state safely.

## Corrected behavior

- Fresh installations persist explicit `demo` configuration state.
- A prominent application-wide **Demo Mode - Sample Data** banner identifies Cedar Grove, sample shifts, residents, and tasks as fictional.
- **Start Real Setup** removes demo-provenance records and shifts, clears the sample facility, retains roles/catalogs/presets, and enters persistent setup-required state.
- Completing a real facility profile plus a manual shift advances the configuration to operational mode.
- Loading demo records into an operational setup preserves manual records and displays **Demo Data Active** until demo records are cleared.
- Restoring an RC1 backup infers Cedar Grove/demo provenance and cannot silently reopen as operational configuration.

## Verification

- Typecheck: 0 errors.
- Automated regression: 95/95 tests.
- CM-P1-001 coverage includes fresh banner rendering, demo cleanup, facility/shift reset, real setup persistence, reverse demo loading, manual-record isolation, and RC1 backup migration.
