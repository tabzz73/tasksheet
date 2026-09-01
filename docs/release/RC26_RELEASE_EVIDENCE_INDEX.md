# TaskSheet 1.0.0-rc.26 — Release Evidence Index

This is the authoritative index of what has and has not been verified for RC26. Every claim below was checked directly in this preparation pass, not carried over from an earlier report without re-verification.

## Document set

- [Release Notes](RELEASE_NOTES_1.0.0-rc.26.md) — scope, improvements, defects fixed, certification status
- [Feature Scope](RC26_FEATURE_SCOPE.md) — authoritative in/out-of-scope inventory
- [Known Limitations](RC26_KNOWN_LIMITATIONS.md) — current, accurate limitations only
- [Clean-Machine Validation](RC26_CLEAN_MACHINE_VALIDATION.md) — executable checklist, not yet performed
- [Physical Print Validation](RC26_PHYSICAL_PRINT_VALIDATION.md) — printer certification checklist, not yet performed
- Superseded by this document for RC26 purposes: `TASKSHEET_1.0.0_RELEASE_EVIDENCE_INDEX.md`, `GAP_AUDIT_1.0.0_2026-08-29.md`, `KNOWN_LIMITATIONS_1.0.0.md`, `RC26_CANDIDATE_VALIDATION.md` (earlier RC26 pre-Report-Center-scope snapshots — retained for history, not authoritative for this candidate)

## 1. Git state (final, post-commit and post-tag)

| Item | Value |
|---|---|
| Branch | `main` |
| Prior HEAD (pre-commit) | `40165e8ee39ffacf521f3a968c818733c4ccd848` |
| **Release commit HEAD** | **`3593d07053b6d8e3f40e3c4ff0c359376cd18c09`** |
| Commit message | `release: prepare TaskSheet 1.0.0-rc.26` |
| Immutable tag | **`v1.0.0-rc.26`** — points exactly at `3593d07053b6d8e3f40e3c4ff0c359376cd18c09`, verified by `git rev-list -n 1` |
| Previous immutable tag | `v1.0.0-rc.25` → `cb5cf7ec3aaaf1d6c9b2e9e0701cc22aee4d2be4` — confirmed **unchanged** by this process |
| `package.json` version | `1.0.0-rc.26` |
| Working tree at commit time | Clean (0 unstaged/untracked paths) — verified before and after tagging, and again after packaging |

**Provenance defect found and fixed before committing**: `.gitignore` contained an unscoped `coverage/` pattern (intended to exclude `vitest --coverage` report output). Because the pattern had no leading slash, it also matched the real, load-bearing source directory `src/services/coverage/` — confirmed via `git log --all -- src/services/coverage/index.ts` returning nothing, i.e. **this file had never been committed to this repository, in any prior RC**. Every previous tag (rc.1 through rc.25) is missing this file from its git history, even though it was present on disk and required for the Service Coverage feature and the generator to function. Fixed by anchoring the pattern to `/coverage/` (repo-root only) before staging. This is now included in the RC26 commit. No other real source files were found affected by an overly-broad ignore pattern (checked `logs/`, `tmp/`, `temp/`, `backups/`, `dist-ssr/` against the actual source tree).

**What the 102 committed paths represent**: (a) the pre-existing Report & Print Center feature work (`ReportCatalogPanel.tsx`, `CustomReportDocument.tsx`, `ServiceCoverageSettingsTab.tsx`, `RoomSetupTab.tsx`, `services/reports/`, `services/validation/`, `services/coverage/`, plus their tests), (b) two prior audit passes' defect fixes (data integrity, security, print, timezone, accessibility), (c) the release documentation, and (d) the `.gitignore` provenance fix above. No file was found in the diff that falls outside these categories. No sensitive data (secrets, API keys, real resident/facility information, absolute developer-machine paths) was found in the diff — checked directly before staging.

## 2. Automated release gate (re-run fresh in this pass, not reused from a prior session)

| Command | Result | Notes |
|---|---|---|
| `npm run typecheck` | **PASS** — 0 errors | This command was fixed this pass; it previously checked 0 files silently (see Release Notes). Now runs `tsc -b tsconfig.app.json tsconfig.node.json`, confirmed to genuinely catch errors by deliberately introducing and then removing a type error. |
| `npm test` (Vitest) | **PASS** — 266/266 tests, 33 files | Includes 21 new tests added across the two prior audit passes (data integrity, ReDoS guard, blank-template privacy, shift-deactivation warning, timezone anchoring). |
| `npm run build` | **PASS** | Clean production build. Bundle-size advisory only (982 KB / 233 KB gzip, single chunk) — pre-existing, non-blocking, tracked in Known Limitations. |
| `npx oxlint` | **PASS** — 0 errors, 153 warnings | All warnings are pre-existing React-hooks/refresh advisories, none introduced this pass, none are errors. |
| `npx playwright test` | **PASS** — 14/14 journeys | Re-run fresh; this suite briefly regressed to 11/14 mid-pass when native-dialog confirmations were replaced with the app's own modal system (the E2E tests were waiting for a native browser dialog that no longer appeared) — fixed by updating the two affected spec files to interact with the new in-app dialog, and by updating one test's headline-text assertion to match a deliberate copy change. Both fixes are recorded in the diff; no test assertion was weakened. |

All five commands were executed in this session against the current working tree; none of these results are inherited from an earlier report without a fresh run.

## 3. What has NOT been verified (explicitly, so it isn't mistaken for done)

- Clean-machine installation, first-launch, and destructive-recovery behavior (Section 1–17 of `RC26_CLEAN_MACHINE_VALIDATION.md`) — requires a physical clean Windows machine, which this development environment is not.
- Physical print output on a real printer (`RC26_PHYSICAL_PRINT_VALIDATION.md`) — requires physical hardware.
- Upgrade from an RC25 (or earlier) installer — requires a prior installer artifact and a target machine.
- Windows restart persistence — requires a real machine restart.
- The evening-hours timezone reproduction (Section 5 of the clean-machine checklist) — the automated regression test (`timezoneAnchorSafety.test.ts`) proves the code is correct under a pinned timezone, but a live, real-clock reproduction on the actual packaged application has not been performed and is the single most important manual check remaining given this was the most severe defect found this cycle.
- Actual Windows uninstall/reinstall data-retention behavior — must be observed empirically per the checklist, not assumed.

## 4. Package verification (Section 20) — status

**PACKAGED.** Built via the approved process, from the exact tagged commit, with the packaging script's own clean-tree/tag safety checks intact and unbypassed.

| Item | Value |
|---|---|
| Packaging command | `npm run dist:win` (runs `verify:release` then `scripts/build-pilot-installer.cjs`) |
| Underlying installer command | `electron-builder --win nsis --x64` |
| Git commit packaged | `3593d07053b6d8e3f40e3c4ff0c359376cd18c09` |
| Git tag | `v1.0.0-rc.26` |
| App version (from installed executable's VersionInfo) | `1.0.0-rc.26` (FileVersion) |
| Architecture | x64 |
| Installer filename | `TaskSheet-Setup-1.0.0-rc.26-x64.exe` |
| Installer size | 113,039,353 bytes (~107.8 MiB) |
| Installer SHA-256 | `8393E241E68452EC274DE60337667BD405EC4374667DC9DAE2EC7E7FEF78E386` — computed independently with `sha256sum` against the actual produced file, and confirmed to match the packaging script's own self-reported checksum in `release/TaskSheet-Build-Evidence-1.0.0-rc.26.txt` |
| Attempt history | First two packaging attempts failed with `EPERM: operation not permitted, rename ... win-unpacked.tmp -> win-unpacked` — root-caused to a leftover background Vite dev server process (started earlier in this development session for browser-based UI verification, never stopped) file-watching the entire project tree including `release/`. Stopped that process, cleared the stale temp directory, retried — third attempt succeeded cleanly. This was a development-environment condition, not a defect in the tagged source; `verify:release` passed identically (typecheck/tests/build all green) on every attempt including the two that failed at the packaging step. |

**Package output inspected** (per Section 10 — not a clean-machine install test, just a direct inspection of the produced package on this machine):
- `release/win-unpacked/TaskSheet.exe` — VersionInfo confirms `ProductName: TaskSheet`, `FileVersion: 1.0.0-rc.26`, `CompanyName: SoftVibeSolutions`. Correct on all counts.
- `resources/app.asar` contents inspected directly (`npx asar list`): contains exactly `build/icon.png`, `dist/` (the built web app), `electron/main.cjs`, `package.json`, and the `node_modules` for the three runtime dependencies (`canvas-confetti`, `clsx`, `lucide-react`). No `src/`, no test files, no `.git`, no documentation, no development-only files. **Minor non-blocking observation**: the three runtime-dependency `node_modules` are packaged in full even though Vite already inlines them into `dist/assets/index-*.js` for the renderer — this is redundant (electron-builder's default dependency-bundling behavior) and modestly inflates installer size, but does not affect correctness since the app never loads them from that path. Not fixed in this pass per the no-opportunistic-refactoring instruction; noted for a future packaging-config cleanup, not release-blocking.
- **Code signing**: `Get-AuthenticodeSignature` reports the installer as **Not Signed**, despite the build log showing `signing with signtool.exe` steps (these ran without a trusted certificate configured, so signing was effectively a no-op). This means Windows SmartScreen will very likely show an "Unknown Publisher" warning on first run on a clean machine. This is an existing characteristic of this build pipeline, not introduced by this pass — `RC26_CLEAN_MACHINE_VALIDATION.md` Section 1.1 already anticipates a dismissible SmartScreen prompt. Recorded here explicitly so it isn't mistaken for a new defect during certification.

Full self-reported build evidence (commit SHA, tag, clean-tree status, per-command results, dist file manifest with checksums) is written to `release/TaskSheet-Build-Evidence-1.0.0-rc.26.txt` by the packaging script itself. **One inaccuracy in that auto-generated file**: it contains a hardcoded string `Test result: PASS - 154/154`, left over from an earlier version of the script written when the suite had 154 tests. The actual, directly-observed result for this build (both in the pre-package `verify:release` run and independently before it) was **PASS — 266/266**. This is a stale literal in `scripts/build-pilot-installer.cjs`, not a real discrepancy in test results — flagged here rather than silently corrected, since editing the script was not requested and this pass avoids opportunistic changes to release infrastructure beyond what was needed to fix the provenance defect above.

## 5. Automated gate results, restated against the exact packaged commit

Run a third time, immediately before packaging, against commit `3593d07`:

| Command | Result |
|---|---|
| `npm run typecheck` | PASS — 0 errors |
| `npm test` | **PASS — 266/266**, 33 files |
| `npm run build` | PASS |
| `npx oxlint` | PASS — 0 errors, 153 pre-existing warnings |
| `npx playwright test` | PASS — 14/14 |

## 6. Final RC26 decision

**TASKSHEET 1.0.0-rc.26 PACKAGED AND READY FOR CLEAN-MACHINE CERTIFICATION.**

This is not a production-release decision. The tagged commit is verified, immutable, and now packaged into a real installer with an independently-confirmed checksum. Clean-machine installation/first-launch/destructive-recovery testing (`RC26_CLEAN_MACHINE_VALIDATION.md`) and physical print certification (`RC26_PHYSICAL_PRINT_VALIDATION.md`) remain **pending manual execution** and are not marked PASS anywhere in this document — they cannot be, since they were not performed. If either surfaces a release-significant (P0/P1/P2) defect, per the project's release rule: do not modify the `v1.0.0-rc.26` tag or its commit; fix on `main`, increment to `1.0.0-rc.27`, and repeat the affected certification sections against a new tag.
