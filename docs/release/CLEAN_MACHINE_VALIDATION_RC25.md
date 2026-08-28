# TaskSheet 1.0.0-rc.25 Clean-Machine Validation

Validate the exact RC25 installer on a clean Windows 10/11 x64 machine with no development tools. Record machine, Windows edition/build, architecture, display scaling, printer/driver, installer filename, SHA-256, Git commit, and Git tag.

| ID | Check | Result | Evidence / defect |
|---|---|---|---|
| CM25-01 | Installer SHA-256 matches generated RC25 build evidence | Pending | |
| CM25-02 | Expected unsigned-publisher warning is documented; install and launch succeed | Pending | |
| CM25-03 | App version is RC25; no missing runtime, asset, local-path, or blank-screen issue | Pending | |
| CM25-04 | Blank production-first startup and facility/shift setup work | Pending | |
| CM25-05 | Optional demo data can be loaded/cleared without overwriting production records | Pending | |
| CM25-06 | Valid in-shift tasks print; out-of-shift tasks are excluded and flagged | Pending | |
| CM25-07 | Persistence survives close/reopen | Pending | |
| CM25-08 | Export and backup/restore recover modified or deleted test data | Pending | |
| CM25-09 | Uninstall/reinstall behavior matches documented data-retention expectations | Pending | |
| CM25-10 | Startup and navigation remain responsive; bundle warning has no user-visible impact | Pending | |
| CM25-11 | All six samples in `PRINT_CERTIFICATION_RC25.md` pass physical inspection | Pending | |

Record screenshots of the installer/version screen and photos or scans of every physical print sample. Classify each defect P0-P3. RC25 cannot enter the controlled pilot until P0 = 0, P1 = 0, and the print-certification gate is signed.
