# TaskSheet 1.0.0-rc.15 Clean-Machine Validation

Run the full clean-machine checklist against the exact checksummed RC15 installer. Specifically verify:

- with no evening HCA shift, a 1715 HCA care task cannot be saved and the message directs the user to Settings → Roles & Shifts;
- an LPN task never offers or accepts an HCA shift, and HCA/LPN package printing stops when its matching role has no active shift;
- normal boundaries 0700/1459 pass and 1500/1715 fail for 0700–1500;
- overnight boundaries 2300/0000/0659 pass and 0700 fails for 2300–0700;
- In Hospital, Out on Pass, and On Hold residents require explicit acknowledgement for future care configuration;
- those three statuses show in the compact printed suppression panel while their task rows are absent;
- returning a paused resident to Active restores preserved due care on the correct shift;
- inactive, discharged, and deceased residents remain absent from operational TaskSheets;
- Dashboard counts match the resident directory.

Also complete physical HCA/LPN printing, landscape verification, persistence, backup/restore, uninstall/reinstall, and dependency/blank-screen checks. Record the machine, Windows build, architecture, display scaling, installer SHA-256, Git commit/tag, screenshots, PASS/FAIL result, and classified defects.
