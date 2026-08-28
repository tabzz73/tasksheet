# Release Notes - TaskSheet 1.0.0-rc.25

RC25 standardizes print typography across the TaskSheet presentation layer. RC24 remains immutable and is not promoted.

- Uses Arial as the primary print font with Helvetica and sans-serif fallbacks.
- Defines shared sizes for titles, section headings, table headers, task text, secondary information, and footers.
- Uses compact 1.1 line spacing for operational print density.
- Applies the shared hierarchy to HCA, LPN, FYI Binder, universal, and specialized print documents.
- Retains role-specific columns, attention icons, legends, task filtering, recurrence, resident status, backup, import, and shift behavior.
- Adds a rendering regression for the shared print typography contract.

Release gates: 151/151 automated tests, zero TypeScript errors, and production build PASS. Packaging and physical-print certification are recorded separately.
