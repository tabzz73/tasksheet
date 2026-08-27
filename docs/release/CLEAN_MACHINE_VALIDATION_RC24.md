# TaskSheet 1.0.0-rc.24 Clean-Machine Validation

Validate the exact RC24 installer on a clean Windows 10/11 x64 machine.

1. Verify the installer SHA-256 against the generated RC24 build evidence.
2. Confirm the expected unsigned-publisher warning, install, launch, version display, and persistence.
3. Create a resident care task scheduled daily for five days; confirm days one through five are included and day six is excluded.
4. Create a unit routine scheduled daily for five days; confirm days one through five are included and day six is excluded.
5. Create a wound protocol scheduled daily for five days; confirm days one through five are included and day six is excluded.
6. Confirm ended resident tasks, unit routines, and wound protocols remain available in their review views and do not appear on current TaskSheets.
7. Restart each ended schedule and confirm it begins today while preserving the original recurrence pattern.
8. Confirm a wound whose schedule ended is not marked resolved; use the separate confirmed **Mark Protocol Resolved** action and verify the result.
9. Confirm unit-routine add/edit supports the same finite recurrence choices and end controls as resident care scheduling.
10. Physically validate HCA/LPN portrait and landscape printing, including exclusion of ended schedules.
11. Validate backup/restore, restart persistence, and uninstall/reinstall behavior.

Record PASS/FAIL evidence and classify every defect P0-P3. RC24 is approved for the controlled pilot only when P0 = 0 and P1 = 0.
