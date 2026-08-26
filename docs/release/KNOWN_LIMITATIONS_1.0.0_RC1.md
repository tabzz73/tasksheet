# Known Limitations - TaskSheet 1.0.0-rc.1

- This is a release candidate, not a production-approved release. Pilot and clean-machine evidence remain pending.
- Application state is stored in the browser's local storage on the current Windows profile/device. It is not a multi-user server database and does not synchronize automatically between devices.
- Backup is a manual JSON download. Restore replaces the current in-browser state after limited core-schema validation; it does not merge records and has no built-in undo.
- TaskSheet is a shift working-sheet and print tool. It does not replace the facility's authoritative care plan, medication record, clinical record, or required documentation system.
- Resident identity is intentionally minimal. Operators must verify name/room and current facility records before relying on a printed sheet.
- Browser and printer drivers can affect pagination, scaling, and margins. Each supported printer needs clean-machine validation.
- Stored/imported out-of-shift timed tasks are omitted from the affected sheet and shown as configuration exceptions. An administrator must correct the source assignment.
- The pilot installer is not digitally code-signed. Windows may display an unknown-publisher warning; preserve the SHA-256 evidence and distribute only through the authorized pilot channel.
- The build reports a pre-existing CSS warning for the `.print-landscape @page` selector and a non-blocking JavaScript chunk-size warning. Physical/PDF landscape output remains a clean-machine validation item.
- Upgrade behavior and uninstall/reinstall data retention have not yet been verified on a clean Windows machine.
- The public demo player expects `public/tasksheet-60-second-demo.mp4`; the polished public video is pending. The hero remains usable without changing operational data.
- Demo data and Presentation Mode are separate concepts. Presentation Mode must not be assumed to create or isolate fake data.
