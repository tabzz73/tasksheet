# TaskSheet 1.0.0-rc.11 Clean-Machine Validation

Run the full clean-machine checklist against the exact checksummed RC11 installer. In addition to RC10 validation:

- verify a fresh installation still opens with blank editable production setup and no demo operational data;
- verify Wellness Check appears in Common and search for both an HCA shift and an LPN shift;
- select several catalog tasks and confirm Instructions are pre-filled, editable, and replaced when a different task is selected;
- configure medication times 0800, 1200, 1700, and 2100 plus facility meal times, restart, and confirm persistence;
- on a 0700–1500 shift, verify Medication Assistance offers 0800 and 1200 but does not offer 1700 or 2100;
- on evening and overnight shifts, verify only their in-window configured choices appear, including the midnight crossing and end-exclusive boundary;
- verify a meal-related task offers the matching facility meal choices;
- verify manual valid-time entry remains available and out-of-shift times remain blocked;
- generate HCA and LPN sheets and confirm the selected timing and edited instructions appear correctly;
- physically validate portrait and landscape print output;
- verify backup/restore retains the facility timing configuration.

Record the machine, Windows build, architecture, printer, display scaling, installer SHA-256, Git commit/tag, screenshots, PASS/FAIL result, and all classified defects.
