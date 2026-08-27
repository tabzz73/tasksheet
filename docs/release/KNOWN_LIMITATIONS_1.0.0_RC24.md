# Known Limitations - TaskSheet 1.0.0-rc.24

- Physical landscape printing remains required because of the known `.print-landscape @page` build warning.
- Bundle size remains a performance observation unless clean-machine behavior degrades.
- The installer is unsigned; verify its published SHA-256 before pilot installation.
- A finite course counts scheduled calendar occurrences, not electronically confirmed care. Hospital, pass, hold, missed, or unprinted dates do not automatically extend the course.
- Restart begins the preserved recurrence pattern on the current date; staff must clinically review the resulting schedule before use.
- Full-screen print preview intentionally replaces the application workspace until **Back** is selected.
