# TaskSheet 1.0.0-rc.26 — Release Evidence Index

This is the authoritative index of what has and has not been verified for RC26. Every claim below was checked directly in this preparation pass, not carried over from an earlier report without re-verification.

## Document set

- [Release Notes](RELEASE_NOTES_1.0.0-rc.26.md) — scope, improvements, defects fixed, certification status
- [Feature Scope](RC26_FEATURE_SCOPE.md) — authoritative in/out-of-scope inventory
- [Known Limitations](RC26_KNOWN_LIMITATIONS.md) — current, accurate limitations only
- [Clean-Machine Validation](RC26_CLEAN_MACHINE_VALIDATION.md) — executable checklist, not yet performed
- [Physical Print Validation](RC26_PHYSICAL_PRINT_VALIDATION.md) — printer certification checklist, not yet performed
- Superseded by this document for RC26 purposes: `TASKSHEET_1.0.0_RELEASE_EVIDENCE_INDEX.md`, `GAP_AUDIT_1.0.0_2026-08-29.md`, `KNOWN_LIMITATIONS_1.0.0.md`, `RC26_CANDIDATE_VALIDATION.md` (earlier RC26 pre-Report-Center-scope snapshots — retained for history, not authoritative for this candidate)

## 1. Git state (verified directly, this pass)

| Item | Value |
|---|---|
| Branch | `main` |
| HEAD commit | `40165e8ee39ffacf521f3a968c818733c4ccd848` |
| Most recent immutable tag | `v1.0.0-rc.25` |
| `package.json` version | `1.0.0-rc.26` |
| Is HEAD tagged `v1.0.0-rc.26`? | **No** |
| Working tree clean? | **No** — 66 modified paths, 28 untracked paths (94 total) |
| Any generated/build artifacts tracked or staged? | No — verified against `.gitignore`; `node_modules/`, `dist/`, `release/`, `test-results/`, `*.tsbuildinfo`, and backup exports are all correctly excluded |

**What the 94 changed paths represent**: a combination of (a) the pre-existing, previously-flagged Report & Print Center feature work (`ReportCatalogPanel.tsx`, `CustomReportDocument.tsx`, `ServiceCoverageSettingsTab.tsx`, `RoomSetupTab.tsx`, `services/reports/`, `services/validation/`, plus their tests), (b) two prior audit passes' defect fixes (data integrity, security, print, timezone, accessibility — see Release Notes), and (c) this pass's new release documentation. No file was found in the diff that falls outside these three categories; every modified source file belongs to either an in-scope feature or a fix described in the Release Notes.

**Packaging status**: `scripts/build-pilot-installer.cjs` refuses to run unless the working tree is clean AND `HEAD` carries the exact tag `v${package.json version}`. Neither condition is currently true, by design — this preparation pass does not commit or tag. Packaging is therefore **BLOCKED** pending an explicit decision to commit and tag, which was intentionally not made in this pass per instruction.

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

**BLOCKED.** Packaging requires a clean, tagged tree by the build script's own safety check (see Section 1). No installer has been built, so there is no filename, size, or SHA-256 checksum to record yet. Once a commit and tag decision is made:

```
git add -A
git commit -m "..."
git tag v1.0.0-rc.26
npm run dist:win
```

`npm run dist:win` runs `verify:release` (typecheck → test → build) and then `scripts/build-pilot-installer.cjs`, which will refuse unless the commit is tagged, and will write `release/TaskSheet-Setup-1.0.0-rc.26-x64.exe` plus a build-evidence text file containing the exact commit SHA, installer SHA-256, and a full `dist/` file manifest with per-file checksums. That evidence file should be linked from this index once it exists.

## 5. Final RC26 decision

**RC26 SOURCE READY FOR CLEAN-MACHINE CERTIFICATION.**

This is a source-readiness decision, not a production-release decision. It means: the automated release gate is genuinely green (re-verified, not assumed), the feature scope is explicit and documented, the known limitations are accurate, and every confirmed defect found during two audit passes has been fixed and covered by a regression test. It does not mean the packaged installer has been tested on a clean machine, and it does not mean physical print output has been inspected — both remain required before any production-readiness claim, per `RC26_CLEAN_MACHINE_VALIDATION.md` and `RC26_PHYSICAL_PRINT_VALIDATION.md`.

Do not tag `v1.0.0-rc.26` until this preparation package has been reviewed and the tag is explicitly requested.
