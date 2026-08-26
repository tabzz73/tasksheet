# TaskSheet 1.0.0-rc.1 Rejection Record

## Immutable artifact identity

- Version: `1.0.0-rc.1`
- Git commit: `077e08a826bfe32359f9591de5995dc873671ada`
- Git tag: `v1.0.0-rc.1`
- Installer: `TaskSheet-Setup-1.0.0-rc.1-x64.exe`
- SHA-256: `F15A753AE0766681C3FE068DB7C682F0F6B86B768EF0CA2B1E9F2C824C97E2BC`

RC1 remains immutable. Its tag, installer, and checksum were not replaced.

## Rejection

Defect: `CM-P1-001`  
Severity: **P1**  
Disposition: **Rejected for controlled production pilot**

RC1 opened with the fictional Cedar Grove facility, sample shifts, and demo operational records but did not display a persistent application-wide Demo Mode indicator. Its Clear Demo action removed source-tagged operational records while retaining the sample facility and shifts. A user could therefore mistake the remaining sample configuration for a configured production facility.

## Corrective release

The defect is corrected only in `1.0.0-rc.2`. RC2 adds explicit persisted demo/setup/operational state, demo-shift provenance, a persistent banner, an atomic Start Real Setup flow, legacy RC1 backup migration, and focused regression coverage. All hardened RC1 operational engines remain unchanged.
