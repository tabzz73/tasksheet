# Clean Windows Machine Validation

Status: **Pending external execution**

Record Windows edition/build, device, install source, TaskSheet version, browser/runtime, printer/driver, tester, and date. Use a Windows account and device that have not hosted a development checkout.

| ID | Validation | Pass criteria | Result/evidence |
|---|---|---|---|
| CM-01 | Install/startup | Candidate starts without developer tooling or source checkout | Pending |
| CM-02 | Assets | No missing icons, fonts, images, video references, or blank views | Pending |
| CM-03 | Local paths | No dependency on developer usernames, drive paths, localhost, or repository files | Pending |
| CM-04 | Persistence | Facility, shifts, residents, tasks, FYIs, and preferences survive restart | Pending |
| CM-05 | HCA printing | Preview and physical/PDF print are complete and legible | Pending |
| CM-06 | LPN printing | Vitals/Results and role-specific layout are complete and legible | Pending |
| CM-07 | Settings | Saved settings persist and affect output as designed | Pending |
| CM-08 | Backup/restore | Export, full restore, restart, and record-count spot checks pass | Pending |
| CM-09 | Upgrade | Prior supported data opens or migrates without loss; rollback backup retained | Pending |
| CM-10 | Shift exceptions | Invalid stored/imported timed work never prints on wrong shift and is flagged | Pending |
| CM-11 | Reprint | Reprint produces the expected current/snapshot behavior | Pending |
| CM-12 | Uninstall/reinstall | Documented data retention/removal behavior is confirmed | Pending |
| CM-13 | Electron storage location | Record the resolved Electron `userData` directory and the Chromium Local Storage location for the installed artifact; confirm the live store is local, not redirected to a shared/network location | Pending |
| CM-14 | Windows-user separation | Data created under Windows account A is not silently exposed as the live database for Windows account B | Pending |
| CM-15 | Storage corruption | After taking a verified backup, simulate a corrupt stored database safely; confirm TaskSheet does not activate malformed operational data and document recovery | Pending |
| CM-16 | Application-data removal | After taking a verified backup and closing TaskSheet, remove the test account's TaskSheet application-data directory; confirm the next launch behavior, then restore the backup and verify recovery | Pending |
| CM-17 | External backup location | Copy an inactive exported backup to an approved external/network location, restore from the copied file, and confirm TaskSheet does not use that location as its live database | Pending |

Attach installation logs, screenshots, print samples, backup filename/hash, before/after record counts, the resolved Electron storage paths, and every defect ID. Perform destructive storage tests only against fictional validation data after creating and verifying a recoverable backup. Any failed item must be classified under the pilot severity rules. Do not mark this checklist passed from a development-machine browser run.
