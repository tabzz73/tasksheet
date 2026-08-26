# Release Notes - TaskSheet 1.0.0-rc.3

Status: **Pilot Artifact Ready; clean-machine validation pending**

## Production-first startup

- Fresh installations contain no demo facility, shifts, residents, tasks, FYIs, or wounds.
- The first-run Facility Profile is blank, editable, and ready for real configuration.
- Built-in roles and standardized task catalogs remain available as product baseline data.
- Fictional Cedar Grove content is available only through **Settings → Demo Data → Load Demo Workspace**.
- Demo loading and clearing preserve manually entered facility data and operational records.

## Verification

- Typecheck: PASS, 0 errors.
- Automated regression: PASS, 98/98 tests.
- UI regression directly edits and saves the blank first-run Facility Profile.
- Optional-demo regressions cover explicit loading, complete clearing, visible provenance, and manual-data preservation.
