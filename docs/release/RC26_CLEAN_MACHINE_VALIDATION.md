# TaskSheet 1.0.0-rc.26 — Clean-Machine Validation Checklist

**Audience**: this checklist assumes you did not develop TaskSheet and will not read source code. Every step tells you exactly what to click and what you should see.

**Machine requirement**: a Windows 10 or Windows 11 machine that has never had TaskSheet, Node.js, or any TaskSheet development tooling installed. If the machine has ever run `npm run dev` or opened this repository, it is not a clean machine — use a different one or a fresh VM.

**Data rule**: use only fictional facility/resident names throughout this entire checklist. Never enter a real person's information.

**Evidence rule**: mark every row PASS, FAIL, N/A, or BLOCKED. Never write "looks okay" or leave a row blank. For each FAIL, write the exact on-screen text or behavior you saw. Record a screenshot filename or printed-page identifier where noted.

**Stop condition**: if any step marked **(P0/P1)** fails, stop testing in that section, record it, and do not continue to sections that assume that step succeeded. Do not attempt to "work around" a failure to keep testing — a workaround hides the defect.

---

## 0. Before you start

| Item | Value |
|---|---|
| Tester name | ______________________ |
| Test date | ______________________ |
| Windows version (Settings → System → About) | ______________________ |
| Machine make/model | ______________________ |
| Local timezone (e.g. America/Edmonton, MDT/MST) | ______________________ |
| Installer filename used | ______________________ |
| Installer SHA-256 (see `RC26_RELEASE_EVIDENCE_INDEX.md`) | ______________________ |

---

## 1. Installation

| # | Step | Expected result | Status |
|---|---|---|---|
| 1.1 | Copy the installer to the clean machine (not a network share — a local path) and double-click it. | Installer window opens within a few seconds. No antivirus/SmartScreen block that can't be dismissed normally. | |
| 1.2 **(P1)** | Follow the installer prompts (it should ask for an install location; do not need admin rights per-machine install). | Install completes without an error dialog. | |
| 1.3 | Check the Desktop. | A "TaskSheet" shortcut exists with the correct icon (not a generic/blank icon). | |
| 1.4 | Check the Start Menu. | A "TaskSheet" entry exists under the Start Menu. | |
| 1.5 **(P0)** | Launch TaskSheet from the Desktop shortcut. | The application window opens. No console/terminal window appears behind or alongside it. No "cannot connect to localhost" or similar developer-mode error. | |
| 1.6 **(P0)** | Look at the title bar / window content. | No visible reference to `localhost`, `vite`, `webpack`, or a raw file path is shown anywhere in the UI. | |

---

## 2. First Launch

| # | Step | Expected result | Status |
|---|---|---|---|
| 2.1 | Observe the initial screen. | "Facility Setup Required" banner or equivalent first-run state is shown. No demo data or fictional facility is pre-loaded. | |
| 2.2 | Check Settings → Developer Information. | Publisher reads "SoftVibeSolutions." | |
| 2.3 | Check Settings → App Information. | Version reads `1.0.0-rc.26` (or the exact version being certified). | |
| 2.4 | Without loading demo data, check Dashboard, Shifts, Residents, FYI Binder, Print Center. | Each shows an empty state with actionable next-step text (e.g. "no shifts configured yet"), not a blank white screen or a JavaScript error. | |

---

## 3. Demo Workflow

| # | Step | Expected result | Status |
|---|---|---|---|
| 3.1 | Settings → Data & Support → Demo Workspace → Load Demo Workspace. Confirm the dialog. | A fictional facility ("Cedar Grove Continuing Care" or similar) loads. | |
| 3.2 **(P1)** | Look at the top of every screen. | A persistent "Demo Mode - Sample Data" banner is visible and cannot be missed. | |
| 3.3 | Open Residents. | A list of fictional residents with room numbers is shown. | |
| 3.4 | Open Shifts → open an HCA shift → Print. | A print preview opens showing the HCA TaskSheet layout with facility header, resident rows, checkboxes. | |
| 3.5 | Open an LPN/RN shift → Print. | Print preview shows the LPN layout, including a Vitals/Results column that the HCA sheet did not have. | |
| 3.6 | Open FYI Binder → Print Binder. | A binder-style document previews with standing information organized by resident/role/shift. | |
| 3.7 | Open Print Center → Weekly Bathing Grid (or Report Library → Bathing category). | A weekly grid with days across and shifts down previews correctly. | |
| 3.8 | Open Print Center → Report Library. | Category tabs (Residents, Wound Care, Care & Tasks, FYI, Facility/Setup, Bathing, Custom) are all clickable and each shows at least one report. | |

---

## 4. Demo → Real Setup

| # | Step | Expected result | Status |
|---|---|---|---|
| 4.1 | Before clearing demo, go to Residents and note the exact count and one resident's name (for step 4.4). | Recorded: ______ | |
| 4.2 | Add one manual fictional resident and one manual fictional shift while still in Demo Mode. | Both are created without error and appear in their respective lists. | |
| 4.3 **(P1)** | Settings → Demo Workspace → "Start Real Setup" (or "Clear Demo"). Confirm the dialog. | The fictional demo facility, demo shifts, demo residents, demo tasks, demo FYIs, and demo wounds are all removed. | |
| 4.4 **(P1 — regression target)** | Check that the manual resident and manual shift you added in step 4.2 still exist. | Both are still present and unchanged. **This is the exact scenario a prior defect broke — a manual record assigned to a demo shift was previously deleted along with the demo data.** | |
| 4.5 | Enter a fictional real facility name, address, and phone number. Save. | Values save and appear in the print header preview. | |
| 4.6 | Create a real (non-demo) shift with a custom short code (e.g. `D1`, `0700`–`1500`). | Shift saves and appears in Shifts. | |
| 4.7 | Create a fictional resident, add one care task, one unit task, one FYI, and one wound. | All four save without error and appear in the appropriate views. | |

---

## 5. Timezone Regression Certification (P1 — do not skip)

A recently-fixed defect caused the application to treat the local evening as if it were already the next calendar day, because it read the UTC date instead of the local date. This section reproduces the exact scenario. **Perform this during evening hours in your local timezone if at all practical** (roughly 6pm–11:59pm local time in a North American timezone is when the old defect would have been visible; if you must test earlier in the day, still record the clock time — a PASS at 2pm is weaker evidence than a PASS at 8pm, but still record it).

| # | Step | Expected result | Status |
|---|---|---|---|
| 5.1 | Record: local timezone, local clock time right now. | Recorded: ______________________ | |
| 5.2 | On the Dashboard/Navbar, click "Today." | The date shown matches today's actual local calendar date (check your phone or system clock). | |
| 5.3 | Click "Tomorrow." | The date shown is exactly one calendar day after today's local date. | |
| 5.4 **(P1)** | Create a new recurring resident care task. Set its recurrence to include today's weekday (e.g. if today is Monday, choose "Selected Weekdays" and check Monday), with no explicit start date override (accept the default). | The default anchor/start date offered by the form is today's actual local date, not tomorrow's. | |
| 5.5 **(P1)** | Generate/open today's TaskSheet for the shift that task was assigned to. | The new task **appears on today's sheet**, not missing, not deferred to tomorrow. | |
| 5.6 **(P1)** | Repeat 5.4–5.5 for a new wound protocol (recurrence including today's weekday). | The wound appears on today's LPN/RN sheet. | |
| 5.7 | Add a new FYI with the default effective date. | The FYI's effective date is today's local date and the FYI is visible immediately (not deferred one day). | |
| 5.8 | Open Print Center and check the default "Assignment Date." | It reads today's actual local date. | |
| 5.9 | Record the outcome. | Local timezone: ______ Local time: ______ Selected date shown by app: ______ Actual local date: ______ Match? Y/N | |

---

## 6. Resident Status Validation

Create one fictional resident for each status below (or change one resident's status between checks).

| Status | HCA sheet | LPN sheet | Bathing | Wound docs | FYI | Census/report | Status |
|---|---|---|---|---|---|---|---|
| Active | Tasks appear | Tasks appear | Included if scheduled | Included if active/healing | Shown | Counted as active | |
| In Hospital | No care tasks generated; resident shown in a status-exception list | Same | Not included | Not included | Not shown for that resident | Reflects "In Hospital" | |
| Out on Pass | No care tasks generated; status-exception list | Same | Not included | Not included | Not shown | Reflects "Out on Pass" | |
| Inactive / Discharged (if you can set this status) | Fully excluded from all generation | Fully excluded | Excluded | Excluded | Excluded | Reflects discharged/inactive | |

---

## 7. Shift Validation

Create these four shifts (fictional short codes, adjust names as needed):

- `D1` — Day, `0700`–`1500`
- `E1` — Evening, `1500`–`2300`
- `N1` — Overnight, `2300`–`0700`
- `D1LPN` — Day LPN, `0700`–`1900`

| # | Step | Expected result | Status |
|---|---|---|---|
| 7.1 | Assign a fixed-time task to `D1` at a time inside its window (e.g. `0800`). | Saves without conflict. | |
| 7.2 | Try assigning a fixed-time task to `D1` at a time outside its window (e.g. `1600`). | The app blocks this with a clear message naming the valid window. | |
| 7.3 | Assign a task to the overnight shift `N1` at `0300`. | Saves; appears on `N1`'s sheet, not on `D1`'s or `E1`'s. | |
| 7.4 | Generate `N1`'s sheet for today's date. | The overnight shift's tasks print correctly under a single date without being split across two separate sheets. | |
| 7.5 | Click Today, then Tomorrow, with `N1` selected. | Date changes correctly; no off-by-one. | |
| 7.6 **(P1)** | Deactivate a shift that has at least one active resident task assigned. | A warning appears naming the number of affected resident tasks/unit tasks/wounds before you can proceed. | |
| 7.7 | Confirm the deactivation anyway. | The shift no longer appears in active-shift lists; its prior tasks are retained in the data (not deleted) but stop generating. | |

---

## 8. Recurrence Validation (manual — do not rely on automated test evidence alone)

For each pattern, create a fictional task with that recurrence, then check 3–4 generated dates spanning at least two weeks and record expected vs. actual.

| Pattern | Dates checked | Expected due dates | Actual result | Status |
|---|---|---|---|---|
| Daily | | Every date | | |
| Selected weekdays (e.g. Mon/Wed/Fri) | | Only those weekdays | | |
| Weekly (specific day) | | Once every 7 days on that weekday | | |
| Every 14 days | | Exactly every 14th day from the anchor | | |
| Every 28 days | | Exactly every 28th day from the anchor | | |
| Monthly (specific day of month) | | Same day-of-month each month | | |
| Date-range constrained (start/end date) | | Due only within the range, absent outside it | | |

---

## 9. Report & Print Center Certification

Every currently-exposed Print Center document must be checked. Do not skip a button because it's inconvenient.

| Document | Opens | Correct data | Empty state sensible | Multi-page handled | Physical print | Status |
|---|---|---|---|---|---|---|
| HCA TaskSheet (per shift) | | | | | | |
| LPN/RN TaskSheet (per shift) | | | | | | |
| Blank TaskSheet Template | | | | | | see Section 10 |
| HCA Daily Package | | | | | | |
| LPN Clinical Package | | | | | | |
| Weekly Bathing Grid (specialized) | | | | | | |
| Compact weekly Bathing Grid (Report Library) | | | | | | |
| Wound & Dressing Treatment Schedule | | | | | | |
| Weekly Wound Care Overview | | | | | | |
| Wound Supplies Re-Order List | | | | | | |
| Upcoming 7-Day Care Lookahead | | | | | | |
| Master Shift Configuration Reference | | | | | | |
| FYI Standing Information Binder | | | | | | |
| What Changed (delta sheet) | | | | | | |
| Printer Hardware Calibration Sheet | | | | | | |
| Report Library — Residents category (each preset) | | | | | | |
| Report Library — Wound Care category (each preset) | | | | | | |
| Report Library — Care & Tasks category (each preset) | | | | | | |
| Report Library — FYI category (each preset) | | | | | | |
| Report Library — Facility/Setup category (each preset) | | | | | | |
| Report Library — Bathing category (each preset) | | | | | | |
| Custom Print Builder (build and print one custom report) | | | | | | |

---

## 10. Blank TaskSheet Privacy Regression (P1 — certify explicitly)

| # | Step | Expected result | Status |
|---|---|---|---|
| 10.1 | With demo or real fictional resident data loaded, open Print Center → Print Blank. | Preview opens. | |
| 10.2 **(P1)** | Read the entire document, every row. | Contains: facility name/address/phone (if configured), a document label indicating it is a blank template, and blank writable rows with column headings (checkbox, time, room, resident, task, etc.) — no text filled into the resident-data columns. | |
| 10.3 **(P1)** | Confirm the document does NOT contain any of: a real/fictional resident's name, a room number tied to an actual resident, a task description, wound information, or FYI text. | Confirmed absent. | |
| 10.4 | Capture evidence (screenshot or printed page). | Filename/ID: ______________________ | |

---

## 11. HCA Structured Tracking Regression

| # | Step | Expected result | Status |
|---|---|---|---|
| 11.1 | Create an HCA-role task using a bowel-movement tracking template (or equivalent tracking prompt). | Task saves. | |
| 11.2 | Repeat for blood glucose, weight, and vitals tracking prompts, all assigned to an HCA shift. | All save. | |
| 11.3 **(P1)** | Generate/print the real HCA TaskSheet for that shift (not a preview of a different document). | Each task's structured write-in prompt (e.g. "BM: ☐ None ☐ Small ☐ Medium ☐ Large") is visible on the sheet — in the Important Information area, since HCA sheets have no separate Vitals/Results column. | |
| 11.4 | Capture evidence. | Filename/ID: ______________________ | |

---

## 12. Backup / Restore Certification

| # | Step | Expected result | Status |
|---|---|---|---|
| 12.1 | With realistic fictional data entered, Settings → Backup & Restore → Export. | A `.json` file downloads. | |
| 12.2 | Change several records (edit a resident, delete a task, add a new shift). | Changes save. | |
| 12.3 **(P1)** | Restore the exported backup. Confirm the dialog. | A confirmation is required before restoring (this was previously missing entirely). | |
| 12.4 **(P1)** | After restore, check the records changed in 12.2. | The pre-export state is restored exactly — the resident edit is reverted, the deleted task is back, the new shift from 12.2 is gone. | |
| 12.5 | Fully close and reopen TaskSheet. | The restored state persists (survives restart). | |
| 12.6 **(P1)** | Attempt to restore an invalid file (rename a `.txt` file to `.json` with garbage content, or hand-edit a valid backup to remove a required field). | Restore is rejected with a clear error message; the active data is unchanged. | |
| 12.7 | Hand-edit a valid backup to duplicate a resident's `id` on a second record, then attempt restore. | Restore is rejected (duplicate-ID check); active data is unchanged. | |

---

## 13. Application Restart

After completing sections 4–12, fully close TaskSheet (not minimize) and reopen it.

| Item | Present after restart? |
|---|---|
| Facility profile | |
| Shifts | |
| Residents | |
| Care tasks | |
| Wounds | |
| FYIs | |
| Print profile settings | |
| Report Center saved presets (if any were saved) | |
| Room Setup configuration | |
| Service Coverage configuration | |
| Demo Mode state (should reflect real setup, not revert to demo) | |

---

## 14. Windows Restart

| # | Step | Expected result | Status |
|---|---|---|---|
| 14.1 | Restart the entire test machine (not just the app). | Machine restarts normally. | |
| 14.2 | Launch TaskSheet again. | Application opens normally, no first-run/setup screen reappearing unexpectedly. | |
| 14.3 | Spot-check the data from Section 13's table. | All still present. | |

---

## 15. Upgrade Validation (only if an RC25 or earlier installer is available)

| # | Step | Expected result | Status |
|---|---|---|---|
| 15.1 | Install the prior version on the clean machine. | Installs successfully. | |
| 15.2 | Enter fictional facility/resident/shift/task data. | Saves. | |
| 15.3 | Install RC26 over/alongside it per the approved upgrade path. | Installs without requiring manual data migration steps. | |
| 15.4 **(P1)** | Launch RC26. | Prior data is present and correctly migrated (check schema-dependent fields like Service Coverage, which did not exist in older backups). | |
| 15.5 | Generate a TaskSheet from the migrated data. | Generates correctly. | |
| 15.6 | Export a backup from the upgraded install. | Succeeds. | |

If no prior installer is available for this cycle, mark this entire section **N/A** and note it in the evidence index — do not assume upgrade safety from a clean install alone.

---

## 16. Uninstall / Reinstall Behavior

| # | Step | Expected result | Status |
|---|---|---|---|
| 16.1 | Use Windows "Add or remove programs" to uninstall TaskSheet. | Uninstall completes without error. | |
| 16.2 | Check the install directory. | Record what remains, if anything: ______________________ | |
| 16.3 | Check the application data location (see Section 17). | Record what remains: ______________________ | |
| 16.4 | Reinstall TaskSheet without manually deleting anything from 16.2/16.3. | Record whether prior data reappears: ______________________ | |
| 16.5 | Manually remove anything found in 16.2/16.3, then reinstall. | Confirm this produces a true first-run state (Section 2 behavior). | |

Do not infer this behavior from the installer configuration — determine it empirically and record what you actually observed.

---

## 17. Application Data Location

Record the actual resolved location(s) on the test machine. **Sanitize the Windows username before this document leaves your machine** (replace it with `<user>`).

| Item | Path |
|---|---|
| Electron userData directory (if applicable) | |
| Browser/Chromium local storage location (if applicable) | |
| Default backup-export download location | |
| Any other persistent-data location found | |

---

## Section sign-off

| Section | Result |
|---|---|
| 1. Installation | |
| 2. First Launch | |
| 3. Demo Workflow | |
| 4. Demo → Real Setup | |
| 5. Timezone Regression | |
| 6. Resident Status | |
| 7. Shift Validation | |
| 8. Recurrence Validation | |
| 9. Report & Print Center | |
| 10. Blank TaskSheet Privacy | |
| 11. HCA Tracking Regression | |
| 12. Backup / Restore | |
| 13. Application Restart | |
| 14. Windows Restart | |
| 15. Upgrade Validation | |
| 16. Uninstall / Reinstall | |
| 17. Data Location | |

**Overall clean-machine result**: PASS / FAIL / BLOCKED — ______________________
