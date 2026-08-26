# TaskSheet 1.0.0-rc.12 Clean-Machine Validation

Run the full clean-machine checklist against the exact checksummed RC12 installer. In addition to RC11 validation:

- verify the permanent desktop sidebar does not display Welcome & Overview;
- verify Settings includes an Application group with App Information and Developer Information;
- verify App Information shows the installed RC12 version, release channel, and Windows platform;
- open Welcome & Overview and Presentation Mode from App Information and verify operational/demo data is unchanged;
- change Welcome Page Behavior, restart, and verify the selected startup behavior persists;
- verify Developer Information identifies SoftVibeSolutions and the local-first product architecture;
- verify the narrow/mobile Settings selector can open both information pages;
- verify normal Dashboard, Shifts, Residents, FYI Binder, Print Center, and Settings navigation remains unchanged.

Record the machine, Windows build, architecture, installer SHA-256, Git commit/tag, screenshots, PASS/FAIL result, and all classified defects.
