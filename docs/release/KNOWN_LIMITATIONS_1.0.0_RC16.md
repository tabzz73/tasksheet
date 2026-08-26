# Known Limitations - TaskSheet 1.0.0-rc.16

- Tracking fields are paper write-in prompts only. TaskSheet does not electronically store bowel, intake, sleep, weight, behaviour, RAI, pain, or other clinical results.
- Facility-authorized forms and the clinical record remain the authoritative documentation source.
- RAI wording is intentionally general; facilities must align the configured instructions with their approved RAI/MDS documentation workflow.
- Physical print validation must confirm tracking rows remain readable at the selected HCA/LPN density.
- Physical landscape printing remains required because the production CSS optimizer reports the known `.print-landscape @page` warning.
- The main bundle remains a performance observation unless clean-machine startup or navigation is visibly degraded.
- The installer is unsigned; verify its published SHA-256.
