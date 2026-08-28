# TaskSheet 1.0.0-rc.25 Physical Print Certification

This certification applies only to the exact installer, commit, tag, printer, driver, and settings recorded below. Preview inspection alone does not pass this gate.

- Installer: `TaskSheet-Setup-1.0.0-rc.25-x64.exe`
- Installer SHA-256: ______________________________
- Git commit/tag: ______________________________
- Printer/driver: ______________________________
- Paper/scaling/margins: ______________________________
Tester/date: ______________________________

## Required physical samples

| Sample | Orientation | Result | Page count | Evidence / defect |
|---|---|---|---|---|
| HCA normal workload | Configured profile | Pending | | |
| HCA heavy workload (15+ residents) | Configured profile | Pending | | |
| LPN normal workload | Landscape | Pending | | |
| LPN heavy workload | Landscape | Pending | | |
| FYI Binder multi-page | Configured profile | Pending | | |
| Densest specialized schedule/report | Configured profile | Pending | | |

## Criteria for every applicable sample

- Arial is used where available; an acceptable Helvetica/sans-serif fallback is used otherwise.
- Body text remains readable at 8.5 pt; secondary text at 8 pt and footer text at 7.5 pt remain legible.
- The 16 pt title, 10 pt section headings, and 8.5 pt bold column headings form a clear hierarchy.
- Time, room, resident, task, important information, vitals/results, and notes remain visually distinguishable.
- Checkboxes and attention icons remain large and clear enough for practical paper use; the legend matches them.
- No clipping, overlapping, border collisions, truncated text, or content outside printable margins occurs.
- Long task names and instructions wrap without obscuring adjacent fields.
- Rows and sections break safely across pages; table headers repeat where required.
- Page count is reasonable for the workload and handwritten notes/results retain usable writing space.
- Landscape output is physically landscape and matches preview structure. The known selector warning is accepted only when this check passes.

## Decision

- [ ] PASS — all six samples and applicable criteria passed; P0 = 0 and P1 = 0.
- [ ] FAIL — correction and a new immutable release candidate are required.

Print-certification owner: ____________________ Date: __________

Operational reviewer: ________________________ Date: __________
