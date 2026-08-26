# Backup and Restore Instructions

## Create a backup

1. Open **Settings > Backup & Restore**.
2. Select the full database backup action.
3. Confirm that a file named like `TaskSheet_Backup_YYYY-MM-DD.json` downloaded.
4. Rename or store it with facility, device, date/time, and release version so same-day files cannot be confused.
5. Copy it to an approved secure location outside the TaskSheet device and verify it can be read.

Back up before the pilot, before upgrades, before bulk imports/configuration changes, daily during the pilot, and after the accepted final configuration.

## Restore safely

1. Stop data entry and printing on the affected device.
2. Export a current-state backup first, even if the state may be damaged.
3. Confirm the intended restore file, device, facility, date/time, and version.
4. In **Settings > Backup & Restore**, choose the verified JSON backup.
5. After the success message, restart TaskSheet.
6. Verify facility, shifts, roles, resident count/status, resident tasks, unit tasks, FYIs, settings, and representative HCA/LPN sheets.
7. Record the backup filename, checksum if available, tester, results, and any defect.

## Important behavior

Restore is a full replacement, not a merge. Current application state is overwritten. The current implementation parses JSON and checks only that `facility`, `roles`, and `shifts` exist before saving, so file provenance and post-restore verification are mandatory. There is no automatic rollback; recovery depends on the pre-restore backup.

Do not email or place backups in unapproved public locations. Treat the file according to facility privacy, access-control, retention, and secure-disposal policy.
