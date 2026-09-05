# Changelog

All notable changes to TaskSheet should be documented in this file.

The format follows the spirit of Keep a Changelog and Semantic Versioning.

## [Unreleased]

## [1.0.0-rc.36] - 2026-09-04

### Added
- Local user accounts: login gate, PBKDF2 password hashing, per-user roles (admin/supervisor/lpn_rn/hca/viewer).
- Append-only audit trail across resident, task, follow-up, attention, FYI, wound, shift, backup, print, and session events.
- Settings > Users & Access and Settings > Audit History administration screens.
- Multi-occurrence follow-up: per-occurrence timestamp/actor/shift records, period-scoped (daily-reset vs. once) progress, cross-shift continuity, and safe occurrence reversal.
- Printable Shift Huddle / Endorsement Sheet, available from Print Center, the Huddle screen, and Saved Print Packages.
- Resident Profile > Activity & History: a filterable, searchable timeline over the audit log, with "View History" deep links from Dashboard, Huddle, and Resident Profile.
- Rich, human-readable outcome history for follow-up transitions (due date, overdue age, and carry-forward count captured at the moment of each event).
- Operational Dashboard and Huddle workflow enhancements.
- Resident Follow-up continuity for must-not-miss tasks.
- Carry-forward, overdue, tracking-progress, and needs-review behavior.
- Shared operational visibility for Dashboard/Huddle routing.
- Smart resident search/selection controls.
- Print Center information-architecture and history improvements.
- Dedicated operational reports including Bathing Grid, Weekly Wound reporting, and Wound Supply Re-order Worksheet.
- Laser-first, grayscale-safe, paper/toner-efficient print standards.

### Changed
- Product positioning reframed around reducing shift cognitive load (Clarity/Continuity/Confidence/Coordination) in README, PRODUCT.md, and the in-app tagline.
- Print Center reorganized around Quick Print, Operational Reports, Print Packages, Custom Reports, and History.
- Print output styling refined to reduce large dark fills while preserving protected layouts.
- Dashboard emphasis shifted from passive statistics toward operational awareness.
- CSS entrance animations (popover, toast, fade-in) now respect `prefers-reduced-motion`.

### Fixed
- Package prints now participate correctly in Print History / changed-since tracking.
- Print packages warn about empty sections before printing.
- Print documents with previously toner-heavy fills use lighter grayscale-safe treatments.

## Release notes policy

When preparing a release:

1. Move relevant entries from `[Unreleased]` into a new version section.
2. Use a heading such as `## [1.0.0-rc.2] - YYYY-MM-DD`.
3. Record only shipped behavior.
4. Do not claim validation gates that were not actually completed.
5. Keep release-candidate notes immutable after the release tag is published.
