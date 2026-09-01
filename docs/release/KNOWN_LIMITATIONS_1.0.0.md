# TaskSheet 1.0.0 Known Limitations

- TaskSheet 1.0 supports one standalone Windows workstation. It does not synchronize a live operational database between computers.
- The live database must remain local. Inactive exported backup files may be stored in an approved network or external location.
- TaskSheet has no application-level user accounts, administrator permissions, or centralized authentication. Windows account and physical-device security are required.
- No general resident/task CSV import is included. Catalog import and structured TaskSheet backup/restore are separate capabilities.
- Print preview cannot replace physical printer certification. Driver margins, scaling, orientation, pagination, and fallback fonts must be validated on the target printer.
- Native print dialogs cannot always distinguish printer unavailability from a user-cancelled print operation.
- A finite course counts scheduled calendar occurrences, not electronically confirmed care. Hospital, pass, hold, missed, or unprinted dates do not automatically extend it.
- Restarting a recurrence begins the preserved pattern on the selected restart date and requires clinical review.
- Runtime commercial licensing or activation enforcement is not included.

See [Supported Deployment](SUPPORTED_DEPLOYMENT_1.0.md), [Installation Guide](INSTALLATION_GUIDE.md), and [First-Run Setup](FIRST_RUN_SETUP_GUIDE.md).

