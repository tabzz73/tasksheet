# Controlled Production Pilot Plan

## Objective

Confirm that real HCA and LPN users can configure, generate, print, and recover TaskSheets reliably across actual shifts. This pilot validates existing 1.0 behavior; it is not a feature-discovery exercise.

## Entry criteria

- Candidate is identified as `1.0.0-rc.24`.
- Automated regression suite passes.
- A reproducible production build is available.
- Pilot facility, device, printer, pilot lead, and support contact are named.
- A verified pre-pilot backup is stored outside the application device.
- Pilot users have reviewed the User Manual and understand that the printed sheet is a working aid, not the authoritative care record.

If the current production-build blocker remains open, the pilot entry gate has not passed.

## Scope and scenarios

Run realistic HCA and LPN workflows over several shifts and record evidence for each row.

| ID | Scenario | Required evidence | Result |
|---|---|---|---|
| PIL-01 | Day shift generation and print | HCA and LPN sheets; expected tasks checked | Pending |
| PIL-02 | Evening shift generation and print | Correct boundaries and assignments | Pending |
| PIL-03 | Night/overnight shift | 2300, 0000, 0659 included; 0700 excluded for 2300-0700 | Pending |
| PIL-04 | Hospital and pass changes | Inappropriate resident tasks disappear and return correctly | Pending |
| PIL-05 | Quick Add | Intended task created once on the correct shift | Pending |
| PIL-06 | Recurring work | Due work appears; non-due work does not | Pending |
| PIL-07 | Print and reprint | Readable output; reprint reflects intended state | Pending |
| PIL-08 | HCA/LPN switching | Role-specific layout and information remain correct | Pending |
| PIL-09 | Backup and restore | Backup exported, state changed, backup restored and verified | Pending |
| PIL-10 | Configuration exception | Out-of-shift task excluded and Needs Review warning displayed | Pending |

For each scenario record date/time, shift, role, tester, device/browser, printer, expected result, actual result, evidence reference, and defect ID if applicable. Use realistic but authorized pilot data; do not use public-demo data.

## Defect classification

| Severity | Definition | Pilot action |
|---|---|---|
| P0 | Safety, data-integrity, privacy, or catastrophic reliability failure | Stop affected use immediately; approval blocked |
| P1 | Major workflow failure or materially incorrect TaskSheet with no safe practical workaround | Approval blocked |
| P2 | Usability or limited workflow issue with a safe workaround | Triage before approval; document disposition |
| P3 | Enhancement, preference, or new capability | Defer to the 1.1 backlog; do not expand 1.0 scope |

Defect record: ID, severity, summary, environment, exact steps, expected/actual result, screenshots or print sample, affected role/shift, workaround, owner, status, retest evidence, and release disposition.

## Stop rules

Pause the affected workflow on any suspected P0, data loss/corruption, privacy exposure, wrong-shift task printing, or inability to produce a reliable working sheet. Preserve the backup and evidence before attempting recovery.

## Exit and release decision

The pilot passes only when all planned scenarios are executed, evidence is reviewed, P0 = 0, P1 = 0, every P2 has an explicit disposition, backup/restore succeeds, and pilot owners sign the acceptance report. Passing the pilot does not override the clean-machine and production-build gates.
