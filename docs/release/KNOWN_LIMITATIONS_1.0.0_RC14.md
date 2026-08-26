# Known Limitations - TaskSheet 1.0.0-rc.14

- The longer tagline wraps to two lines in the compact desktop sidebar by design.
- Physical landscape printing remains a required clean-machine validation item because the production CSS optimizer reports the known `.print-landscape @page` warning.
- The main bundle remains a performance observation unless clean-machine startup or navigation is visibly degraded.
- The installer is unsigned; verify its published SHA-256.
- RC14 remains subject to clean-machine and controlled-pilot approval.
