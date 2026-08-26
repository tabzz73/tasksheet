# TaskSheet 1.0 Release Closure

Release candidate: **1.0.0-rc.3**
Current decision: **Pilot Artifact Ready; clean-machine validation and controlled pilot pending**

## Release gates

| Gate | Required result | Current status |
|---|---|---|
| Full regression | All automated tests pass | Passed: 98/98 on 2026-08-26 |
| Controlled production pilot | Completed; open P0 = 0 and P1 = 0 | Pending external execution |
| Clean Windows validation | All required checks pass | Pending external execution |
| Production build | Reproducible web artifact, no TypeScript errors | Passed on 2026-08-26 |
| Source provenance and pilot installer | Clean Git commit/tag and installer checksum | Passed; exact values are in the generated artifact evidence |
| Documentation | Required release documents complete | Drafted for pilot use |
| Presentation layer | Hero retained; public demo asset reviewed | Hero complete; polished video pending |

No document in this folder authorizes production use by itself. Approval is recorded only in the completed [Pilot Acceptance Report](PILOT_ACCEPTANCE_REPORT.md) after every release gate passes.

## Documents

- [Controlled Pilot Plan](CONTROLLED_PILOT_PLAN.md)
- [Clean-Machine Validation - RC3](CLEAN_MACHINE_VALIDATION_RC3.md)
- [Pilot Acceptance Report](PILOT_ACCEPTANCE_REPORT.md)
- [Release Notes - RC3](RELEASE_NOTES_1.0.0_RC3.md)
- [Known Limitations - RC3](KNOWN_LIMITATIONS_1.0.0_RC3.md)
- [RC2 Superseded Record](RC2_SUPERSEDED_RECORD.md)
- [RC1 Rejection Record](RC1_REJECTION_RECORD.md)
- [User Manual](USER_MANUAL_1.0.md)
- [Backup and Restore](BACKUP_RESTORE.md)
- [Data Management](DATA_MANAGEMENT.md)
- [Requirements Traceability Matrix](REQUIREMENTS_TRACEABILITY_MATRIX.md)
- [Version and Build Information](VERSION_BUILD_INFO.md)
- [Build Evidence - 1.0.0-rc.3](BUILD_EVIDENCE_1.0.0_RC3.md)
- [Windows Pilot Installer Pipeline](WINDOWS_INSTALLER.md)

## Feature freeze

During release closure, accept only defects found while validating existing 1.0 behavior. Classify them as P0-P3. Fix P0/P1 before approval; triage P2 deliberately; defer P3 enhancements to 1.1. Presentation work may continue only when it does not change the frozen operational core or pilot data.
