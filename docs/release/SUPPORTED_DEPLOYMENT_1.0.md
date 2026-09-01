# TaskSheet 1.0 Supported Deployment

## Supported production topology

TaskSheet 1.0 is a **single-workstation, standalone Windows application**. Its facility database is stored locally for that installed application/user context.

Do not place the local application database on a shared network drive, copy a live database between running workstations, or represent 1.0 as a synchronized multi-workstation system.

Backup files exported by TaskSheet may be copied to an approved network share, encrypted external drive, or other facility-approved backup location. This exception applies only to inactive backup files. The live operational database must remain local to the supported TaskSheet workstation and must never be opened or shared from a network location.

## Multi-workstation status

Multi-workstation Facility Mode is not a supported 1.0 deployment. Local revision checks prevent stale overwrites inside supported editor flows on one running application instance, but they are not a distributed transaction, record-locking, or network-recovery system.

Facilities needing two or more simultaneously active workstations must wait for a shared transactional service/database release and a separate concurrency, network interruption, crash recovery, and access-control certification.

## Licensing status

This source currently contains no runtime license enforcement or activation workflow. Therefore license validation cannot disable access to resident/task data or cause data loss. Commercial licensing, offline activation, machine replacement, grace periods, and license recovery require a separate product decision and acceptance gate before commercial distribution if those controls are introduced.

## Operational safeguards

- Maintain approved backups outside the device according to facility policy.
- Verify the correct facility, date, shift, and print output before operational use.
- Restrict the Windows account and physical device to authorized personnel.
- TaskSheet 1.0 does not provide application-level user roles or administrator permissions; facilities must use device/Windows controls until an authenticated permissions system is released and validated.
