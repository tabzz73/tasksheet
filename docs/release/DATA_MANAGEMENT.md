# Data Management Instructions

## Storage model

TaskSheet stores application state in browser local storage under the current browser profile (`tasksheet_v1_db_state_v2`, with migration support for the prior key). Data remains on that device/profile unless it is cleared, restored, migrated, or exported manually.

## Data minimization and authority

Use only the minimum resident information required by TaskSheet - name and room number - plus authorized operational instructions. Do not treat TaskSheet as the authoritative care plan or clinical record. Validate assignments against the facility's official systems and policies.

## Operational controls

- Restrict the Windows account/device and backup locations to authorized staff.
- Keep resident status current. Hospital/pass status suppresses inappropriate work from generated sheets.
- Review **Needs Review** exceptions before every print. Correct the source shift/time; do not bypass the warning by copying the task onto an incorrect sheet.
- Label and validate imports. Imported data is still filtered at generation time and is not trusted merely because it was accepted into storage.
- Keep demo records isolated by their source tag. Presentation Mode does not imply demo data.
- A persistent **Demo Mode** banner identifies bundled sample facility/shift data. Use **Start Real Setup** before operational use; this removes the sample facility, demo shifts, and source-tagged demo records while retaining the standardized built-in catalogs.
- If demo records are later loaded into an operational facility, TaskSheet identifies them separately and clearing them must preserve manually entered production records.
- Export a verified backup before restore, upgrade, import, bulk edit, pilot start, and pilot close.
- Follow facility retention and secure-disposal rules for JSON backups and printed sheets.

## Corrections and deletion

Use status changes, task edit/stop, or authorized removal according to the actual operational situation. Confirm the next generated sheet after any correction. Clearing operational or browser data can be irreversible without a backup; record who authorized it and verify the exact device/profile first.

## Incident handling

On suspected data loss, privacy exposure, corruption, or wrong-shift printing: stop affected use, preserve the device and latest backups, capture steps/evidence, classify the defect, notify the pilot/release owner, and use an approved fallback workflow until resolved.
