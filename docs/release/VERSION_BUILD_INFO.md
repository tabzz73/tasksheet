# Version and Build Information

## Candidate identity

- Product: TaskSheet
- Version: `1.0.0-rc.1`
- Release state: Ready for Controlled Production Pilot
- Production approval: **Not granted**
- Package metadata: `package.json` and `package-lock.json`
- UI identity: Welcome footer

## Recorded development toolchain

- Operating environment: Windows / PowerShell
- Node.js: `v24.11.1`
- npm: `11.6.2`
- Build: `npm run build` (`tsc -b && vite build`)
- Automated tests: `npm test` (`vitest run`)

## Release Artifact Recovery baseline

- 2026-08-25: `npm test` passed 91/91 tests across 2 test files.
- 2026-08-25: `npm run build` failed during `tsc -b`; Vite artifact generation did not run.
- The initial build failure was classified as a **P1 release blocker**. The type/build corrections below resolved that blocker; the failed baseline is retained for audit history.

The clean-machine validator must record the exact supported release environment and artifact checksum; development tool versions do not by themselves define production support.

## Current build disposition

Release Artifact Recovery corrected schema/type drift without changing the frozen operational algorithms. Final verification on 2026-08-25:

- `npx tsc --noEmit`: PASS, 0 errors.
- `npm test`: PASS, 91/91 tests.
- `npm run build`: PASS; 1,853 modules transformed and `dist/` produced.

The build emitted non-failing warnings for a `.print-landscape @page` CSS selector and a JavaScript chunk over 500 kB. These remain visible in build evidence and clean-machine print validation.

The authoritative source is maintained in Git and tagged `v1.0.0-rc.1`. The guarded NSIS pipeline requires a clean tagged `HEAD`, reruns every release gate, builds the Windows x64 installer, and writes the exact commit SHA and installer checksum to the external build-evidence record beside the artifact.

Build output: `dist/`  
Build ID: `TS-1.0.0-rc.1-20260825T213112-0600`  
Build date: `2026-08-25T21:31:12-06:00`  
Source identifier: See `release/TaskSheet-Build-Evidence-1.0.0-rc.1.txt`  
Git tag: `v1.0.0-rc.1`  
Pilot installer: `TaskSheet-Setup-1.0.0-rc.1-x64.exe`  
Installer SHA-256: See generated artifact evidence
