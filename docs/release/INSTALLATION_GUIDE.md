# TaskSheet 1.0 Installation Guide

## Supported installation

Install TaskSheet on one authorized Windows 10 or Windows 11 x64 workstation. TaskSheet 1.0 is a standalone application and does not synchronize a live facility database between computers.

Before installing, read [Supported Deployment](SUPPORTED_DEPLOYMENT_1.0.md). Keep the live operational database on the installed workstation. Exported, inactive backup files may be copied to a facility-approved network share, encrypted external drive, or other approved backup location.

## Installation

1. Verify the installer filename and published SHA-256 checksum against the release evidence.
2. Run the installer using the authorized Windows account that will operate TaskSheet.
3. If the controlled-pilot installer is unsigned, confirm that the documented unknown-publisher warning matches the release record.
4. Launch TaskSheet and complete [First-Run Setup](FIRST_RUN_SETUP_GUIDE.md).
5. Create a backup and perform the required clean-machine and physical-print checks before operational use.

Do not install one shared copy on a network drive, redirect the live application database to a shared folder, or operate copied live databases as though they synchronize.

