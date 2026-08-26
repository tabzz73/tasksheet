# Release Notes - TaskSheet 1.0.0-rc.18

RC18 closes the clinical shift-workspace entry gap for wound protocols.

- LPN/RN shift workspaces now include **+ Wound Protocol** in the **Add to [shift]** menu.
- Opening the wound form from a clinical workspace preselects that exact shift.
- HCA shift menus do not expose Wound Protocol because wound scheduling requires an LPN/RN shift.
- Wound snapshot times now use the configured protocol time instead of a hardcoded value.

Release gates: 135/135 automated tests, zero TypeScript errors, and production build PASS.
