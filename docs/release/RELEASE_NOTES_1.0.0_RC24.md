# Release Notes - TaskSheet 1.0.0-rc.24

RC24 adds a consistent finite-course lifecycle for resident care tasks, unit routines, and wound protocols without changing the established shift, resident-status, backup, import, or print-hardening rules.

- Finite schedules include their final scheduled day and stop appearing after the configured end boundary.
- Resident tasks, unit routines, and wound protocols retain ended records for operational review instead of deleting them.
- Human-readable frequency labels identify courses such as **Daily for 5 days**.
- Ended resident tasks and wound protocols can be filtered, edited or extended, restarted from today, or duplicated.
- Shift workspaces expose ended unit routines and provide edit, restart, duplicate, and stop actions.
- Unit-routine entry now uses the same recurrence controls as resident care tasks.
- Wound schedule completion is distinct from clinical resolution; a wound is marked resolved only through an explicit confirmed action.
- Print and care-summary generation exclude schedules after their end boundary.

Release gates: 149/149 automated tests, zero TypeScript errors, and production build PASS.
