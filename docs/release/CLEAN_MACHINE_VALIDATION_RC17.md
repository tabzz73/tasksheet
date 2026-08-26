# TaskSheet 1.0.0-rc.17 Clean-Machine Validation

Run the full clean-machine checklist against the exact checksummed RC17 installer. Specifically verify:

- Add Wound Protocol exposes the full recurrence selector used by Add Care Task;
- only active LPN/RN clinical shifts appear in the wound shift selector;
- a valid scheduled wound time saves and prints only on the selected clinical shift;
- a time at the shift end boundary or outside the shift is rejected;
- selected-weekday, weekly, interval, monthly, one-time, and PRN recurrence settings persist after edit;
- a due wound appears on the selected date and a non-due wound does not;
- missing or invalid legacy scheduling is withheld from shift sheets and visibly flagged for review;
- wound schedule and resident care summary show the assigned shift and time;
- active wound dependencies prevent clinical-shift deletion;
- demo wound protocols remain assigned to the baseline LPN day shift without changing production records.

Also complete physical HCA/LPN printing, landscape verification, persistence, backup/restore, uninstall/reinstall, and dependency/blank-screen checks. Record the machine, Windows build, architecture, display scaling, installer SHA-256, Git commit/tag, screenshots, PASS/FAIL result, and classified defects.
