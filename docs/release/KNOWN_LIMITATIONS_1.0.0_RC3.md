# Known Limitations - TaskSheet 1.0.0-rc.3

- RC3 is not production-approved until clean-machine and controlled-pilot gates pass.
- The Windows installer is unsigned and may display an unknown-publisher warning. Verify the published SHA-256 before execution.
- Browser/Electron local storage is device/profile-local and does not provide multi-user synchronization.
- Restore replaces current state rather than merging it; create a current backup before restore.
- Browser/printer drivers may affect pagination and margins. The landscape CSS warning requires physical/PDF validation.
- The main JavaScript bundle exceeds the build reporter's 500 kB observation threshold; monitor startup/navigation responsiveness.
