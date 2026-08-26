# Release Notes - TaskSheet 1.0.0-rc.15

RC15 hardens resident care configuration and status handling without changing the due-task, recurrence, backup, import, or data-persistence architecture.

- Timed resident and unit tasks require an active shift belonging to the correct role and covering the entered time. Normal and overnight windows remain end-exclusive.
- Quick Care no longer falls back from a missing LPN shift to an HCA shift, or vice versa.
- HCA and LPN print packages never substitute another role's shifts. A clear blocking configuration message directs the user to Settings → Roles & Shifts.
- `On Hold` is available alongside In Hospital and Out on Pass. Care schedules are preserved but suppressed until the resident returns to Active.
- Adding or editing care for any paused/nonactive resident requires explicit acknowledgement that the task will not print until Active.
- HCA, LPN, and universal TaskSheets show a compact Resident Status — Care Suppressed panel for hospital, pass, and hold residents; their care tasks remain excluded.
- The Dashboard now reports real hospital, pass, and hold counts and no longer displays placeholder counts.

Release gates: 125/125 automated tests, zero TypeScript errors, and production build PASS.
