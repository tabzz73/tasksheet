# Build Evidence - TaskSheet 1.0.0-rc.1

## Verified pre-tag baseline

- Version: `1.0.0-rc.1`
- Node.js: `v24.11.1`
- npm: `11.6.2`
- `npx tsc --noEmit`: PASS - 0 TypeScript errors
- `npm test`: PASS - 91/91
- `npm run build`: PASS - 1,853 modules transformed
- Production preview smoke: PASS - HTTP 200 and root mount present
- Windows x64 Electron bundle preflight: PASS

## Authoritative artifact evidence

The authoritative chain-of-custody record is generated beside the installer as:

`release/TaskSheet-Build-Evidence-1.0.0-rc.1.txt`

It is intentionally generated after the immutable commit and tag exist. Embedding a future commit SHA or installer checksum inside that same commit would create a self-reference and would not prove the packaged binary. The external evidence file records:

- exact Git commit SHA and `v1.0.0-rc.1` tag;
- clean-tree status;
- UTC build timestamp;
- Node and npm versions;
- typecheck, regression, web-build, and installer results;
- installer filename and SHA-256;
- SHA-256 for every generated `dist/` file.

Preserve the evidence file with the pilot installer and attach both to clean-machine validation and pilot acceptance records.

## Non-blocking validation items

- The `.print-landscape @page` CSS warning requires physical/PDF landscape verification.
- The main bundle-size warning remains a performance observation unless startup or load behavior degrades.
