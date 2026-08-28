# TaskSheet 1.0.0-rc.26 Candidate Physical Print Certification

This pre-tag gate validates the RC26 candidate build. Record the exact clean candidate commit, printer, driver, and settings. Repeat artifact-specific printing from the tagged installer during clean-machine validation.

- Candidate commit: ______________________________
- Printer/driver: ______________________________
- Paper/scaling/margins: ______________________________
- Tester/date: ______________________________

## Required physical samples

| Sample | Orientation | Result | Page count | Evidence / defect |
|---|---|---|---|---|
| HCA normal workload | Configured profile | Pending | | |
| HCA heavy workload (15+ residents) | Configured profile | Pending | | |
| LPN normal workload | Landscape | Pending | | |
| LPN heavy workload | Landscape | Pending | | |
| FYI Binder multi-page | Configured profile | Pending | | |
| Densest specialized schedule/report | Configured profile | Pending | | |

## Acceptance criteria

- Arial or the documented Helvetica/sans-serif fallback is used consistently.
- Body, secondary, and footer text remain legible at the approved sizes.
- Title, section, and table-header hierarchy remains clear.
- Operational columns, checkboxes, attention icons, and legends remain usable.
- No clipping, overlap, border collision, truncated text, or printable-margin overflow occurs.
- Long content wraps safely; rows and sections break correctly; repeating headers work where required.
- Page counts remain reasonable and handwritten fields retain usable space.
- Landscape output is physically landscape and structurally matches preview.

## Decision

- [ ] PASS — all six samples passed; P0 = 0 and P1 = 0.
- [ ] FAIL — correct the candidate before any RC26 tag.

Print-certification owner: ____________________ Date: __________

Operational reviewer: ________________________ Date: __________
