# TaskSheet 1.0.0-rc.16 Clean-Machine Validation

Run the full clean-machine checklist against the exact checksummed RC16 installer. Specifically verify:

- HCA search and Common choices expose RAI, bowel, fluid, weight, sleep, food, and behaviour tracking;
- LPN search exposes Pain Assessment and Pain Reassessment;
- selecting a tracker prefills editable instructions and shows its attention icons;
- correct-role shift/time validation still applies to every tracker, including 0630 sleep tracking on an overnight shift;
- HCA print shows compact structured write-in prompts for every tracking kind;
- LPN pain rows show a 0–10 / PAINAD field and attention icons;
- universal print shows the same tracking prompt without losing resident, room, time, or task information;
- printed legends identify Observe / Monitor, Record on Form, Meal-Linked, Follow-Up, and High Alert icons used by the selected tasks;
- no entered tracking result is persisted electronically;
- existing Weight or Pain catalog tasks gain the current tracking field after upgrade without duplication.

Also complete physical HCA/LPN printing, landscape verification, persistence, backup/restore, uninstall/reinstall, and dependency/blank-screen checks. Record the machine, Windows build, architecture, display scaling, installer SHA-256, Git commit/tag, screenshots, PASS/FAIL result, and classified defects.
