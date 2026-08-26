# Known Limitations - TaskSheet 1.0.0-rc.15

- Resident status changes do not delete care schedules. This is intentional so care resumes when the resident returns to Active; administrators must review preserved schedules before reactivation.
- Status exception panels identify hospital, pass, and hold residents but do not print their suppressed task details.
- Physical landscape printing remains a required clean-machine validation item because the production CSS optimizer reports the known `.print-landscape @page` warning.
- The main bundle remains a performance observation unless clean-machine startup or navigation is visibly degraded.
- The installer is unsigned; verify its published SHA-256.
- RC15 remains subject to clean-machine and controlled-pilot approval.
