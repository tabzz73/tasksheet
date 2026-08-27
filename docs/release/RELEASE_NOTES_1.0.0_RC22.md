# Release Notes - TaskSheet 1.0.0-rc.22

RC22 replaces internal wound frequency values with accurate human-readable recurrence wording.

- Wound Schedule displays examples such as **Every 2 Days**, **Daily**, and **Every Thu / Sat**.
- Weekly, multi-week, monthly, one-time, date-range, and PRN protocols use their full recurrence descriptions.
- Resident profiles and resident care summaries use the same formatter.
- Legacy protocols receive safe readable fallback labels instead of raw underscore values.

Release gates: 140/140 automated tests, zero TypeScript errors, and production build PASS.
