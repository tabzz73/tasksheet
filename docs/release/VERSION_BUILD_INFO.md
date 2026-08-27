# Version and Build Information

## Candidate identity

- Product: TaskSheet
- Version: `1.0.0-rc.23`
- Release state: Pilot Artifact Ready; clean-machine validation pending
- Production approval: **Not granted**
- Package metadata: `package.json` and `package-lock.json`
- UI identity: Welcome footer

## Recorded development toolchain

- Operating environment: Windows / PowerShell
- Node.js: `v24.11.1`
- npm: `11.6.2`
- Build: `npm run build` (`tsc -b && vite build`)
- Automated tests: `npm test` (`vitest run`)

## Preserved release history

- 2026-08-25: `npm test` passed 91/91 tests across 2 test files.
- 2026-08-25: `npm run build` failed during `tsc -b`; Vite artifact generation did not run.
- The initial build failure was classified as a **P1 release blocker**. The type/build corrections below resolved that blocker; the failed baseline is retained for audit history.
- RC1 subsequently passed its build and packaging gates but was rejected during clean-machine validation for `CM-P1-001`. Its tag, installer, and checksum remain immutable; see `RC1_REJECTION_RECORD.md`.
- RC2 corrected demo provenance but retained demo-first installation. It was superseded by RC3 at product-owner direction; its source tag and installer remain unchanged.

The clean-machine validator must record the exact supported release environment and artifact checksum; development tool versions do not by themselves define production support.

## Current build disposition

RC23 corrects FYI Binder modal stacking, makes primary sidebar items reliable parent-navigation controls, and compacts the grouped Settings navigation. Final RC23 verification is recorded in the generated build evidence:

- `npx tsc --noEmit`: PASS, 0 errors.
- `npm test`: PASS, 144/144 tests.
- `npm run build`: PASS.

The build emitted non-failing warnings for a `.print-landscape @page` CSS selector and a JavaScript chunk over 500 kB. These remain visible in build evidence and clean-machine print validation.

The authoritative source is maintained in Git and tagged `v1.0.0-rc.23`. The guarded NSIS pipeline requires a clean tagged `HEAD`, reruns every release gate, builds the Windows x64 installer, and writes the exact commit SHA and installer checksum to the external build-evidence record beside the artifact.

Build output: `dist/`  
Build ID: See generated RC23 build evidence
Build date: See generated RC23 build evidence
Source identifier: See `release/TaskSheet-Build-Evidence-1.0.0-rc.23.txt`
Git tag: `v1.0.0-rc.23`
Pilot installer: `TaskSheet-Setup-1.0.0-rc.23-x64.exe`
Installer SHA-256: See generated artifact evidence
