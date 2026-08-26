# Release Notes - TaskSheet 1.0.0-rc.17

RC17 makes wound protocols fully schedule-aware while preserving the hardened shift and print behavior from RC16.

- Add and Edit Wound Protocol now use the same recurrence controls as resident care tasks, including daily, selected weekdays, weekly, interval, monthly, one-time, and PRN options.
- Every new wound protocol requires an active LPN/RN shift and a scheduled time inside that shift's end-exclusive time window.
- Wounds print only on their assigned clinical shift and only when due on the selected assignment date.
- A wound with a missing or out-of-window time is withheld and reported under Exceptions / Needs Review.
- Legacy real-data wounds without a clinical assignment are not guessed or printed. They remain visible in the resident profile and wound schedule with a Needs Review warning.
- Demo wound protocols migrate safely to the baseline clinical shift; manual production records are never silently reassigned.
- Wound schedule and resident care summary outputs now display clinical shift and scheduled time.
- An active clinical shift cannot be deleted while a wound protocol depends on it.

Release gates: 133/133 automated tests, zero TypeScript errors, lint completed with no errors, and production build PASS.
