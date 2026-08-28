# Known Limitations - TaskSheet 1.0.0-rc.25

- The `.print-landscape @page` build warning is a documented physical-validation item. It is not automatically release-blocking, but every required landscape sample must print correctly before approval.
- The main JavaScript bundle-size warning is classified P3 technical debt unless clean-machine startup or navigation shows user-visible degradation.
- The installer is unsigned; verify its published SHA-256 before validation or pilot installation.
- Print preview is not a substitute for physical-printer certification. Printer drivers, scaling, margins, pagination, and fallback fonts must be checked using the exact RC25 installer.
- A finite course counts scheduled calendar occurrences, not electronically confirmed care. Hospital, pass, hold, missed, or unprinted dates do not automatically extend the course.
- Restart begins the preserved recurrence pattern on the current date; staff must clinically review the resulting schedule before use.
- Full-screen print preview intentionally replaces the application workspace until **Back** is selected.
