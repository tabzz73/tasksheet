# TaskSheet 1.0 Facility IT Deployment Guide

## Approved topology

- One Windows 10/11 x64 workstation per live TaskSheet facility database.
- Authorized Windows account and physical-device controls.
- Local live operational database only.
- Inactive exported backups may be stored on an approved network share, encrypted external drive, or approved backup service.

## Unsupported topology

- A live database on a network share or synchronized folder.
- Two or more workstations concurrently editing the same facility data.
- Copying live databases between running workstations as a synchronization method.
- Claims of application-level authentication, administrator roles, centralized audit enforcement, or server-side record locking.

TaskSheet 1.0 has no runtime licensing/activation enforcement. Any future licensing or shared facility service requires separate security, offline-access, recovery, concurrency, and data-retention acceptance.

Use the artifact checksum and tag/commit evidence supplied with the release. Complete the clean-machine, backup/restore, upgrade, uninstall/reinstall, printer, and physical-print validation records before approval. The authoritative boundary is [Supported Deployment](SUPPORTED_DEPLOYMENT_1.0.md).

