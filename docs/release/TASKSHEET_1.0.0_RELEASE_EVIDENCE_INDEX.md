# TaskSheet 1.0.0 Final Release Evidence Index

Document purpose: authoritative index connecting the exact approved TaskSheet 1.0.0 source, artifact, validation, operating boundary, and support documents.

Current decision: **NOT APPROVED FOR PRODUCTION RELEASE**  
Feature scope: **FROZEN**  
Supported topology: **one standalone Windows workstation**  
Next release gate: **physical print certification**

This index must not be marked Approved until every required field and linked gate below is complete, P0 = 0, P1 = 0, and the installer tested on the clean machine is byte-for-byte identical to the checksummed artifact built from the recorded tag.

## Release identity

| Evidence | Authoritative value | Status |
|---|---|---|
| Product | TaskSheet | Recorded |
| Final release version | `1.0.0` | Target only |
| Candidate version | Pending final RC selection | Pending |
| Git commit SHA | Pending authoritative clean commit | Pending |
| Git tag | Pending exact tag at commit | Pending |
| Git tree status | Must be clean before tag and packaging | Pending |
| Installer filename | Pending tagged build | Pending |
| Installer SHA-256 | Pending tagged build | Pending |
| Package/installer metadata match | Pending verification | Pending |
| Build timestamp and toolchain | Pending tagged build evidence | Pending |
| Electron/runtime version | Development source: Electron `44.0.0`; record exact tagged-build value | Pending final evidence |
| Node version | Development verification: Node `24.11.1`; record exact tagged-build value | Pending final evidence |
| npm version | Development verification: npm `11.6.2`; record exact tagged-build value | Pending final evidence |
| SQLite/database engine version | Not applicable: TaskSheet 1.0 uses Electron/browser `localStorage` with structured JSON, not SQLite | Recorded |
| Windows architectures supported | Windows x64 only | Recorded; clean-machine verification pending |
| Minimum supported Windows version | Windows 10 x64; Windows 11 x64 also supported | Recorded; clean-machine verification pending |

## Approval gates

| Gate | Required evidence | Status |
|---|---|---|
| Automated verification | TypeScript, unit/component, browser journeys, production build | Current development source passed; repeat for authoritative candidate |
| Physical print certification | [RC26 Physical Print Certification](PRINT_CERTIFICATION_RC26.md) or successor tied to exact candidate | Pending |
| Clean-machine validation | [Clean-Machine Validation](CLEAN_MACHINE_VALIDATION.md) tied to exact installer/checksum, including Electron storage location/lifecycle, restart, uninstall/reinstall, Windows-user separation, corruption, application-data removal, and external-backup restoration | Pending |
| Backup, restore, upgrade, and destructive recovery | Clean-machine report plus [Backup and Restore](BACKUP_RESTORE.md) procedure/evidence | Pending |
| Source and artifact provenance | Clean commit, exact tag, guarded tagged build, SHA-256 evidence | Pending |
| Final documentation/support | Every final document listed below reviewed against exact release | In progress |
| Operational acceptance | Day, Evening, Night/overnight scenarios; P0 = 0 and P1 = 0 | Pending |

## Clean-machine environment record

Complete this table using the exact machine that validates the checksummed installer. Do not substitute development-machine results.

| Environment evidence | Exact value |
|---|---|
| Windows edition | Pending |
| Windows version and OS build | Pending |
| Architecture | Pending; must be x64 |
| TaskSheet history | Pending: fresh machine or documented prior-version history |
| Prior TaskSheet version/state used for upgrade | Pending or Not applicable |
| Printer model | Pending |
| Printer driver and version | Pending |
| Installation location | Pending |
| Windows account type | Pending: standard user or administrator |
| Display scaling | Pending |
| Backup external/network location tested | Pending |
| Resolved Electron `userData` path | Pending |
| Resolved Chromium Local Storage path | Pending |
| Uninstall data-retention behavior | Pending |
| Reinstall data behavior | Pending |
| Windows-user separation result | Pending |
| Application-data removal/recovery result | Pending |

## Current automated evidence

The 2026-08-29 development-source audit recorded:

- TypeScript: PASS, 0 errors.
- Unit/component tests: PASS, 245/245 across 30 files.
- Playwright Chromium journeys: PASS, 14/14.
- Production build: PASS.
- Git diff validation: PASS.

These results demonstrate candidate readiness but do not replace a final rerun against the clean authoritative source selected for tagging. See [TaskSheet 1.0.0 Gap Audit](GAP_AUDIT_1.0.0_2026-08-29.md).

## Release and support documents

| Document | Purpose | Status |
|---|---|---|
| [Supported Deployment](SUPPORTED_DEPLOYMENT_1.0.md) | Authoritative standalone topology and access boundary | Approved boundary |
| [Installation Guide](INSTALLATION_GUIDE.md) | Supported installation and artifact verification | Drafted; final artifact fields pending |
| [First-Run Setup Guide](FIRST_RUN_SETUP_GUIDE.md) | Initial facility configuration and safety checks | Drafted |
| [Facility IT Deployment Guide](FACILITY_IT_DEPLOYMENT_GUIDE.md) | IT topology, storage, security, and unsupported modes | Drafted |
| [Known Limitations](KNOWN_LIMITATIONS_1.0.0.md) | Final supported limitations | Drafted; final review pending |
| [Backup and Restore](BACKUP_RESTORE.md) | Backup location, validation, restore, and recovery | Drafted; clean-machine evidence pending |
| [User Manual](USER_MANUAL_1.0.md) | Operational use | Final content review pending |
| Troubleshooting Guide | Installation, storage, printing, recovery, and support paths | Not yet created |
| 1.0.0 Release Notes | Final changes and resolved defects | Not yet created |
| [Version and Build Information](VERSION_BUILD_INFO.md) | Version/toolchain/artifact identity | Final tagged values pending |
| [Requirements Traceability Matrix](REQUIREMENTS_TRACEABILITY_MATRIX.md) | Requirements-to-evidence mapping | Final review pending |
| [Pilot Acceptance Report](PILOT_ACCEPTANCE_REPORT.md) | Final operational acceptance | Pending |

## Physical print acceptance set

Certification must include PDF output and at least one real target printer for:

1. HCA primary TaskSheet, including normal and dense workloads.
2. LPN/RN TaskSheet, including normal and dense workloads.
3. Bathing grid.
4. Wound quick print and wound reports.
5. FYI Binder, including multi-page content.
6. Private Pay and Complimentary symbols and legend.
7. Long resident/task text, dense census, page breaks, repeated headers/footers, Page X of Y, margins, orientation, writing space, and clipping.
8. Maximum-density HCA and LPN/RN stress sheets containing the longest realistic resident name, longest realistic task description, long Important Information text, multi-page continuation, Private Pay and Complimentary indicators, and mixed room labels such as `101A`, `101B`, `L101`, and `101LF`.

Record printer model, driver, paper size, orientation, scaling, PDF viewer where applicable, result, defect ID, and evidence reference for every sample.

## Release blocker summary

Complete this immediately before the final approval decision.

| Blocker field | Decision value |
|---|---|
| P0 open | Pending |
| P1 open | Pending |
| P2 open | Pending |
| Known limitations accepted | Pending: Yes / No |
| Deferred items documented | Pending: Yes / No |

## Final approval record

| Decision field | Value |
|---|---|
| Open P0 defects | Pending |
| Open P1 defects | Pending |
| Exact candidate approved | Pending |
| Exact installer approved | Pending |
| Approval decision | **NOT APPROVED** |
| Approved by | Pending |
| Approval date | Pending |

Changing source, version metadata, installer configuration, or release documentation after the approved tag requires a new candidate, a new artifact/checksum, and repetition of every affected gate. Never move or reuse an immutable release tag.

## Release rejection rule

Any failure or correction that changes source code, schema, print rendering, installer configuration, persistence behavior, backup/restore behavior, or release metadata invalidates the current candidate until every affected validation gate is repeated and recorded against the replacement candidate. A change must not be exempted merely because it is described as small, cosmetic, documentation-only, or low risk; its actual impact determines which gates must be repeated.
