# Release Notes - TaskSheet 1.0.0-rc.21

RC21 fixes attention-indicator mismatch between shift view and print preview.

- Operational print rows retain every configured indicator instead of silently capping regular rows at three and PRN rows at two.
- Indicators remain deduplicated and priority ordered.
- Record on Form is retained alongside other configured indicators.
- The print legend contains the same complete indicator set.

Release gates: 139/139 automated tests, zero TypeScript errors, and production build PASS.
