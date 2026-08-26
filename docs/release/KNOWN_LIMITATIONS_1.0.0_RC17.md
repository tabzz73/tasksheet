# Known Limitations - TaskSheet 1.0.0-rc.17

- Legacy production wound protocols created before RC17 require an administrator to assign an LPN/RN shift and scheduled time before they can print operationally.
- TaskSheet coordinates wound work on paper; the facility-authorized clinical record remains the authoritative wound assessment and treatment documentation source.
- Physical landscape printing remains required because the production CSS optimizer reports the known `.print-landscape @page` warning.
- The main bundle remains a performance observation unless clean-machine startup or navigation is visibly degraded.
- The installer is unsigned; verify its published SHA-256.
