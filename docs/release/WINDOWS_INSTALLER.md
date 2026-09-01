# Windows Pilot Installer Pipeline

## Target artifact

- Format: NSIS `.exe`
- Architecture: Windows x64
- Filename: `TaskSheet-Setup-1.0.0-rc.25-x64.exe`
- Desktop runtime: Electron
- Builder: electron-builder
- Installation mode: assisted installer; current-user by default; installation directory may be selected

MSI/MSIX is outside the 1.0 pilot scope and may be added later for facility IT deployment.

TaskSheet 1.0 supports one standalone Windows workstation. The live operational database must remain local to that workstation. Inactive exported backup files may be stored on a facility-approved network share or external location. See [Supported Deployment](SUPPORTED_DEPLOYMENT_1.0.md) and [Installation Guide](INSTALLATION_GUIDE.md).

## Chain-of-custody enforcement

Run only:

```powershell
npm run dist:win
```

The command performs typecheck, all regression tests, and the production web build before packaging. The installer script then refuses to run unless:

1. The workspace is a Git work tree.
2. `git status --porcelain` is empty.
3. `HEAD` is tagged exactly `v1.0.0-rc.25`.

On success it writes the installer and `TaskSheet-Build-Evidence-1.0.0-rc.25.txt` under the ignored `release/` directory. The evidence record contains commit SHA, tag, clean-tree status, UTC build time, Node/npm versions, command results, installer filename/checksum, and hashes for every `dist/` file.

## Reproduction

From the authoritative source repository:

```powershell
git checkout v1.0.0-rc.25
npm ci
npm run dist:win
```

Do not modify source, package metadata, lockfiles, or documentation between checkout and packaging. Preserve the generated evidence record beside the installer supplied to the clean-machine validator.

## Required external validation

The installer is unsigned unless a trusted Windows code-signing certificate is configured. Windows may display an unknown-publisher warning. Record that behavior during the pilot; do not represent the installer as digitally signed.

Clean-machine validation must cover install, launch, first-run setup, persistence, HCA/LPN and landscape printing, backup/restore, uninstall/reinstall behavior, and missing runtime dependencies.
