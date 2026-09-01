# TaskSheet 1.0.0 Gap Audit and Release-Readiness Scorecard

Audit date: 2026-08-29  
Audited state: current RC26 development workspace  
Decision: **NOT READY TO TAG OR PACKAGE**  
Feature state: **FROZEN — bugs, hardening, usability corrections, and release evidence only**

## Executive result

The software-side operational core is substantially hardened, and the audit found and corrected one P0 persistence defect: failed local-storage writes previously changed in-memory state and were reported only in the console. Mutations now become authoritative only after durable storage succeeds. Failed writes and failed restores preserve the prior active database and surface a corrective error.

No known automated path remains that permits bathing capacity, exceptional Service Coverage, fixed task time, wound clinical role, room occupancy, or shift dependencies to bypass the centralized validation gates tested here.

Release approval is still blocked by external/manual evidence: physical print certification, clean-machine installation/upgrade/recovery testing, final artifact provenance, and final 1.0.0 documentation. TaskSheet 1.0 must be represented as a single-workstation standalone product; multi-workstation Facility Mode is not supported.

## Severity summary

| Severity | Open | Corrected during audit | Notes |
|---|---:|---:|---|
| P0 | 0 known in automated scope | 1 | Atomic durable-save failure fixed and regression-tested |
| P1 | 4 release gates | 0 | Primarily physical/external evidence and release closure; standalone distribution decision resolved |
| P2 | 3 | 0 | Advisory/usability/support refinements |

An open P1 gate means **do not tag/package/promote**, even though automated tests pass.

## Release-readiness scorecard

| Area | Score | Status | Evidence / remaining gap |
|---|---:|---|---|
| Conflict engine | 9/10 | PASS with bounded limitation | Structured domain validation, impact results, atomic batch rejection, stale-edit protection. A full bulk guided-resolution workspace is intentionally deferred. |
| Bathing | 9/10 | PASS automated | Capacity, duplicate, same-day, funded/additional frequency, room movement, multi-bed labels, status suppression, grid and sorting covered. Distributed last-slot races are outside standalone topology. |
| Shift/task time and recurrence | 9/10 | PASS automated | End-exclusive boundaries, overnight times, shift impacts, semantic timing, finite courses, 14/28-day schedules, monthly short-month behavior, selected months, effective dates. |
| Role/credential safety | 8/10 | PASS current configured policy | Catalog role-to-shift enforcement and LPN/RN wound restriction added. No jurisdiction-specific configurable credential matrix. |
| Room/occupancy integrity | 9/10 | PASS automated | Exact labels, A/B positions, occupied/deactivate protection, move and reuse isolation, hospital/pass bed holds. Structural conversion preview remains limited. |
| Resident/task/wound lifecycle | 9/10 | PASS automated | Hospital/pass/hold suppression, return behavior, ended courses, resolved wound suppression, move-out identity isolation, expired coverage. |
| Demo/production separation | 9/10 | PASS automated | Persistent banner, provenance-tagged cleanup, demo-to-real conversion, manual records preserved. Must be reconfirmed on clean install. |
| Print Center/documents | 7/10 | **P1 pending** | Shared typography/footer, pagination, grids, wound prints, coverage symbols and legends implemented. Physical certification and native printer failure behavior remain unapproved. |
| Backup/restore/migration | 8/10 | PASS automated; **P1 external pending** | Corrupt shape/time rejection, atomic failed persistence, old-backup migration, Service Coverage defaults. Real disk-full/permission/interrupted OS tests and clean-machine restore/upgrade pending. |
| Import/export | 6/10 | Scope decision required | Structured backup/export and catalog import exist. No general resident/task CSV import is shipped, so unknown coverage/task row mapping and partial-failure review are not product capabilities. Do not claim them for 1.0. |
| Multi-workstation | 2/10 | Not supported | No shared server, distributed locking, or network recovery. 1.0 support is formally standalone only. |
| Licensing | 3/10 | Product decision pending | No runtime licensing/activation exists; therefore it cannot lock or delete data. Commercial licensing controls require a separate acceptance gate if required for launch. |
| Permissions/admin | 6/10 | ACCEPTED FOR STANDALONE 1.0 | No authenticated application roles. The approved standalone deployment delegates access control to authorized Windows accounts and physical device controls. Broader deployment remains unsupported. |
| Navigation/accessibility | 8/10 | PASS automated | Native card navigation, focus-visible, responsive journeys, settings/task coverage journey. A literal every-control manual audit remains part of clean-machine acceptance. |
| Documentation/provenance | 6/10 | **P1 pending** | Operational manuals and RC records exist. Final 1.0 release notes, installation/first-run/IT guides, final known limitations, troubleshooting, tagged evidence and checksum do not yet exist. |

Software readiness score: **78/100**. This score does not override the release blockers below.

## Corrected P0 — durable save and restore atomicity

Previous behavior:

- in-memory state changed before `localStorage.setItem`;
- write errors were swallowed after console logging;
- the UI could proceed as though saved while restart lost the mutation.

Corrected behavior:

- next state is serialized and persisted first;
- only a successful storage write replaces authoritative in-memory state;
- storage/disk/permission failures throw a user-safe recovery message;
- no listeners are notified for a rejected write;
- restore parses, validates, migrates, and performs its durable write before activation;
- malformed collection shapes and invalid shift military times are rejected atomically;
- schema version `3` records the current migration level;
- older backups receive current Service Coverage defaults without changing historical task meaning.

Regression evidence: `src/test/releaseRecoveryHardening.test.ts`.

## Open P1 release gates

### P1-01 — Physical print certification

`PRINT_CERTIFICATION_RC26.md` remains Pending. Complete every required HCA, LPN, FYI, bathing/wound/specialized sample on the target printer with coverage indicators/legends included where applicable. Verify margins, orientation, repeated headers/footers, Page X of Y, wrapping, writing space, and no clipping.

### P1-02 — Clean-machine installer, upgrade, and destructive recovery

`CLEAN_MACHINE_VALIDATION.md` remains Pending. Required evidence includes first install, restart persistence, old-state upgrade, corrupt restore rejection, backup/restore, simulated and real storage failure where safely reproducible, uninstall/reinstall behavior, no local-path dependency, and artifact-specific printing.

### P1-03 — Exact source/artifact provenance

The worktree is intentionally dirty and RC26 is not tagged. The current `HEAD` is not the candidate source containing these changes. After all code/manual gates pass: create a clean authoritative commit, decide the next RC number under the existing immutable-tag policy, tag exact HEAD, package only that tag, and record installer/dist SHA-256 evidence.

### P1-04 — Final documentation/support package

Before production promotion, create/finalize version-specific:

- 1.0.0 Release Notes;
- Installation and First-Run Setup guides;
- final Known Limitations;
- Troubleshooting guide;
- standalone Facility IT deployment guidance;
- exact Version/Build/Commit/Tag/Checksum evidence;
- updated User Manual sections for bathing, room occupancy, conflicts, and Service Coverage.

### Resolved P1-05 — Distribution security decision

The standalone deployment boundary and Windows/device access-control requirement are approved for controlled 1.0 release. TaskSheet has no authenticated application-level administrator roles, and multi-workstation or broadly shared facility deployment remains unsupported. Any future requirement for in-app permissions is a separately designed and validated release capability, not a 1.0 blocker.

## Scope decisions recorded

### Standalone only

`SUPPORTED_DEPLOYMENT_1.0.md` is authoritative: single-workstation standalone Windows deployment only. Multi-workstation Facility Mode must not be marketed or enabled as a supported 1.0 topology.

### Import

TaskSheet has catalog import plus full structured backup/restore. It does not expose a general operational resident/task CSV import. Therefore 1.0 documentation must not claim unknown-task/modifier/coverage row mapping or partial row import. If operational CSV import becomes required, it is a new release-scoped capability with staged review, provenance, re-import prevention, and transactional rollback—not a late RC fix.

### Licensing

No license enforcement is present. Licensing cannot currently cause resident/task data loss. If commercial activation is required, define offline behavior, machine replacement/recovery, grace periods, validation failure, and permanent data access before adding enforcement.

## Automated evidence after hardening

- TypeScript: PASS, 0 errors.
- Unit/component: PASS, 245/245 across 30 files at the first full post-fix run.
- Focused persistence/recovery: PASS, 6/6.
- Recurrence release audit: PASS, 4/4.
- Service Coverage: role, time, capacity, frequency, dates, print and report behavior covered.
- Production build: PASS (`npm run build`). The existing large-bundle advisory remains non-blocking pending clean-machine performance validation.
- Playwright: PASS, 14/14 Chromium journeys, including responsive card navigation, keyboard interaction, print-action isolation, service coverage, operational workflows, wound reports, and Print Center reports.

## P2 observations

- Vite continues to report the existing large-bundle advisory; promote only if clean-machine startup/navigation performance is poor.
- Native browser/Electron print dialogs cannot reliably report physical printer availability or a user-cancelled job back to the web layer. Troubleshooting and physical validation remain necessary.
- Full structural room conversion and full bulk conflict resolution are intentionally narrower than a dedicated enterprise administration system.

## Promotion sequence

1. Keep feature freeze.
2. Complete final automated verification.
3. Perform physical print certification.
4. Produce a tagged clean candidate and installer from that tag.
5. Run the exact installer on a clean Windows 10/11 machine.
6. Complete destructive backup/restore/upgrade evidence.
7. Complete final documentation and standalone/security decisions.
8. Run realistic Day, Evening, and Overnight workflows with deliberate conflicts.
9. Require P0 = 0 and P1 = 0.
10. Promote that exact validated source/artifact to `1.0.0`.

Until every P1 gate is closed, the authoritative decision is:

**TaskSheet 1.0.0 — Feature Frozen, Automated Hardening In Progress, Not Approved for Release**
