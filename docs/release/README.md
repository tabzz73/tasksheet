# TaskSheet 1.0 Release Closure

Release candidate: **1.0.0-rc.26**
Current decision: **RC26 source ready for clean-machine certification; not tagged, not packaged, not production-released.** See [RC26 Release Evidence Index](RC26_RELEASE_EVIDENCE_INDEX.md) for the authoritative, current status — it supersedes the gate table below for RC26 purposes.

## RC26 — start here

- [RC26 Release Evidence Index](RC26_RELEASE_EVIDENCE_INDEX.md) — authoritative current status, git state, automated gate results
- [RC26 Release Notes](RELEASE_NOTES_1.0.0-rc.26.md) — scope, improvements since RC25, defects fixed
- [RC26 Feature Scope](RC26_FEATURE_SCOPE.md) — explicit in/out-of-scope inventory, including the Report & Print Center decision
- [RC26 Clean-Machine Validation](RC26_CLEAN_MACHINE_VALIDATION.md) — executable checklist, not yet performed
- [RC26 Physical Print Validation](RC26_PHYSICAL_PRINT_VALIDATION.md) — printer certification checklist, not yet performed
- [RC26 Known Limitations](RC26_KNOWN_LIMITATIONS.md) — current, accurate limitations only

## Historical release gates (RC25 and earlier)

The table below reflects the state as of RC25 and is retained for history. It does not describe RC26 — see the Evidence Index above.

| Gate | Required result | Status as of RC25 |
|---|---|---|
| Full regression | All automated tests pass | Passed: 151/151 on 2026-08-27 |
| Controlled production pilot | Completed; open P0 = 0 and P1 = 0 | Pending external execution |
| Clean Windows validation | All required checks pass | Pending external execution |
| Production build | Reproducible web artifact, no TypeScript errors | Passed on 2026-08-26 |
| Source provenance and pilot installer | Clean Git commit/tag and installer checksum | Passed after guarded tagged build; exact values are in generated artifact evidence |
| Documentation | Required release documents complete | Drafted for pilot use |
| Presentation layer | Hero retained; public demo asset reviewed | Hero complete; polished video pending |

No document in this folder authorizes production use by itself. Approval is recorded only in a completed Pilot Acceptance Report after every release gate passes.

## Other documents

- [TaskSheet 1.0.0 Final Release Evidence Index](TASKSHEET_1.0.0_RELEASE_EVIDENCE_INDEX.md) *(pre-RC26-scope snapshot; superseded by the RC26 Evidence Index above)*
- [RC26 Candidate Validation](RC26_CANDIDATE_VALIDATION.md) *(pre-Report-Center-scope snapshot)*
- [RC26 Physical Print Certification (typography-only, earlier)](PRINT_CERTIFICATION_RC26.md) *(superseded by RC26 Physical Print Validation above)*
- [Controlled Pilot Plan](CONTROLLED_PILOT_PLAN.md)
- [Clean-Machine Validation - RC25](CLEAN_MACHINE_VALIDATION_RC25.md)
- [Physical Print Certification - RC25](PRINT_CERTIFICATION_RC25.md)
- [Pilot Acceptance Report](PILOT_ACCEPTANCE_REPORT.md)
- [Release Notes - RC25](RELEASE_NOTES_1.0.0_RC25.md)
- [Known Limitations - RC25](KNOWN_LIMITATIONS_1.0.0_RC25.md)
- [RC2 Superseded Record](RC2_SUPERSEDED_RECORD.md)
- [RC1 Rejection Record](RC1_REJECTION_RECORD.md)
- [User Manual](USER_MANUAL_1.0.md)
- [Backup and Restore](BACKUP_RESTORE.md)
- [Data Management](DATA_MANAGEMENT.md)
- [Requirements Traceability Matrix](REQUIREMENTS_TRACEABILITY_MATRIX.md)
- [Version and Build Information](VERSION_BUILD_INFO.md)
- [Build Evidence - 1.0.0-rc.25](BUILD_EVIDENCE_1.0.0_RC25.md)
- [Windows Pilot Installer Pipeline](WINDOWS_INSTALLER.md)
- [Supported Deployment - 1.0](SUPPORTED_DEPLOYMENT_1.0.md)
- [Installation Guide](INSTALLATION_GUIDE.md)
- [First-Run Setup Guide](FIRST_RUN_SETUP_GUIDE.md)
- [Facility IT Deployment Guide](FACILITY_IT_DEPLOYMENT_GUIDE.md)
- [Known Limitations - 1.0.0](KNOWN_LIMITATIONS_1.0.0.md)

## Feature freeze (in effect as of RC26)

TaskSheet 1.0.0-rc.26 is **feature frozen**. The scope in [RC26 Feature Scope](RC26_FEATURE_SCOPE.md) is final for 1.0.0.

**Allowed from this point forward:**
- Fixes for confirmed P0/P1/P2 defects (data loss, security, packaging, print, clean-machine installation)
- Release documentation corrections
- Test corrections, only when the implementation being tested is proven correct and the test itself was wrong

**Not allowed:**
- New workflows, reports, settings, or dashboard widgets
- Architectural cleanup (e.g. splitting `db/index.ts`) or bundle optimization, unless clean-machine testing proves a real problem
- Cosmetic redesign
- Any feature expansion beyond what [RC26 Feature Scope](RC26_FEATURE_SCOPE.md) already lists

Certification findings are handled by severity: P0/P1 stop certification and require a fix plus re-running the affected certification sections before continuing; P2 defaults to fix-before-release; P3/P4 are documented in [RC26 Known Limitations](RC26_KNOWN_LIMITATIONS.md) or deferred to 1.1, not used as a pretext to keep redesigning the application during certification.
