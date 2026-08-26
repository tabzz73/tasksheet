# TaskSheet 1.0.0-rc.2 Clean-Machine Validation

Status: **Pending external execution**

Record tester, date/timezone, machine model, Windows edition/build, x64 architecture, display resolution/scaling, printer/driver, and paper size. Verify the installer against the SHA-256 in `TaskSheet-Build-Evidence-1.0.0-rc.2.txt` before execution.

| ID | Ordered validation | Result/evidence |
|---|---|---|
| RC2-CM-01 | Verify exact installer filename, version, SHA-256, Git commit, and `v1.0.0-rc.2` tag | Pending |
| RC2-CM-02 | Install on fresh Windows 10/11 x64 without development tools; document unsigned-publisher warning | Pending |
| RC2-CM-03 | Launch without missing runtime, blank screen, crash, localhost, or source-path dependency | Pending |
| RC2-CM-04 | Verify persistent **Demo Mode - Sample Data** banner on first launch | Pending |
| RC2-CM-05 | Verify Cedar Grove facility, sample shifts, residents, and tasks are clearly identified as fictional | Pending |
| RC2-CM-06 | Generate sample HCA and LPN sheets from demo data | Pending |
| RC2-CM-07 | Confirm valid in-shift demo task prints and out-of-shift task is excluded/flagged | Pending |
| RC2-CM-08 | Select **Start Real Setup** and confirm the destructive action | Pending |
| RC2-CM-09 | Verify Cedar Grove, demo shifts, residents, tasks, FYIs, and wounds are gone; catalog remains | Pending |
| RC2-CM-10 | Verify persistent **Real setup required** state | Pending |
| RC2-CM-11 | Configure fictional validation facility and new HCA/LPN shifts from scratch | Pending |
| RC2-CM-12 | Restart and confirm real setup persists with no returning demo state | Pending |
| RC2-CM-13 | Add manual resident/task, reload demo data from Settings, and verify manual records are unchanged | Pending |
| RC2-CM-14 | Verify **Demo Data Active** banner; clear demo records and confirm manual setup remains | Pending |
| RC2-CM-15 | Physically inspect HCA, LPN, and landscape printouts | Pending |
| RC2-CM-16 | Export, backup, modify/delete test data, restore, restart, and verify recovery | Pending |
| RC2-CM-17 | Uninstall/reinstall exact artifact and document data-retention behavior | Pending |
| RC2-CM-18 | Record startup/navigation responsiveness and attach screenshots/photos without unauthorized data | Pending |

Approval requires every required item executed, open P0 = 0, and open P1 = 0.

- [ ] **PASS - TaskSheet 1.0.0-rc.2 Approved for Controlled Production Pilot**
- [ ] Extension required
- [ ] FAIL

Tester: ____________________ Date: __________  
Release owner: ______________ Date: __________  
Operational owner: ___________ Date: __________
