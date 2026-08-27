# Release Notes - TaskSheet 1.0.0-rc.23

RC23 corrects presentation-layer stacking and makes primary navigation consistently return to section roots without changing operational task, recurrence, resident, shift, backup, import, or print-generation logic.

- Print FYI Binder now renders in a document-level portal above the navbar, sidebar, cards, and clipped application containers.
- Clicking **Shifts** from a shift workspace returns to the Shifts list; clicking **Residents** from a resident profile returns to the Residents directory.
- Reselecting **Print Center** clears temporary batch selections and errors.
- Reselecting **FYI Binder** clears transient search/scope state and closes Binder dialogs.
- Reselecting **Settings** returns to Facility Setup while preserving unsaved facility form entries.
- Desktop Settings navigation uses a compact, accessible single-group accordion; mobile retains the grouped selector.

Release gates: 144/144 automated tests, zero TypeScript errors, and production build PASS.
