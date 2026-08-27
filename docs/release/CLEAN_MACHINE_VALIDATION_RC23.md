# TaskSheet 1.0.0-rc.23 Clean-Machine Validation

Validate the exact RC23 installer on a clean Windows 10/11 x64 machine.

1. Verify the installer SHA-256 against the generated RC23 build evidence.
2. Confirm the expected unsigned-publisher warning, install, launch, version display, and persistence.
3. Open Print FYI Binder and confirm its backdrop, header, controls, and preview remain above the application navbar, sidebar, and Binder cards at all scroll positions.
4. Open a shift workspace, click **Shifts** in the primary navigation, and confirm the Shifts list opens without using the breadcrumb arrow.
5. Open a resident profile, click **Residents**, and confirm the Residents directory opens without using the breadcrumb arrow.
6. Select shifts in Print Center, reselect **Print Center**, and confirm temporary selections clear.
7. Apply FYI Binder search/scope filters, reselect **FYI Binder**, and confirm the Binder root state returns.
8. Open a non-Facility Settings subsection, type an unsaved facility-name change, reselect **Settings**, and confirm Facility Setup returns with the unsaved entry preserved.
9. Confirm desktop Settings categories operate as a single-group accordion without unnecessary page-height expansion; confirm the mobile grouped selector remains usable.
10. Physically validate HCA/LPN portrait and landscape printing, backup/restore, restart persistence, and uninstall/reinstall behavior.

Record PASS/FAIL evidence and classify every defect P0-P3. RC23 is approved for the controlled pilot only when P0 = 0 and P1 = 0.
