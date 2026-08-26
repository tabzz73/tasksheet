# Known Limitations - TaskSheet 1.0.0-rc.11

- Timing presets are facility-wide; unit-specific timing profiles are outside the 1.0 scope.
- Preset selection accelerates entry but does not replace current care plans, medication records, authorizations, orders, or facility policy.
- Physical landscape printing remains a required clean-machine validation item because the production CSS optimizer reports the known `.print-landscape @page` warning.
- The main bundle remains a performance observation unless clean-machine startup or navigation is visibly degraded.
- The installer is unsigned; verify its published SHA-256.
- RC11 remains subject to clean-machine and controlled-pilot approval.
