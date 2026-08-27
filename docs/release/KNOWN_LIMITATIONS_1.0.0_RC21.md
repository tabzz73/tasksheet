# Known Limitations - TaskSheet 1.0.0-rc.21

- Rows with many alert indicators may wrap the compact icon group; clean-machine printing must verify readability.
- Physical landscape printing remains required because of the known `.print-landscape @page` build warning.
- Bundle size remains a performance observation unless clean-machine behavior degrades.
- The installer is unsigned; verify its published SHA-256.
