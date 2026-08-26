# Release Notes - TaskSheet 1.0.0-rc.16

RC16 adds structured paper tracking assignments while preserving TaskSheet's non-electronic-documentation boundary.

- HCA catalog tracking: RAI observation, bowel movement, fluid intake, weight, sleep pattern, food intake, and behaviour.
- LPN pain assessment and reassessment now print structured pain-scale fields. Existing LPN vital-sign, blood-pressure, assessment, glucose, respiratory, catheter-output, and wound workflows continue to provide their appropriate result fields.
- Tracking tasks carry attention icons: Observe / Monitor and Record on Form. Food adds Meal-Linked; pain reassessment adds Follow-Up; acute change assessment adds High Alert and Follow-Up.
- Tracking instructions are prefilled, searchable, editable, and role-aware in Add Care Task and Quick Care Setup.
- HCA, LPN, and universal print layouts render structured write-in prompts compactly.
- Existing catalog-created Weight, Pain, and monitoring tasks are upgraded from their current template metadata at startup.

Tracking results remain handwritten on the TaskSheet or recorded in the facility-authorized clinical form. TaskSheet does not store these clinical results electronically.

Release gates: 128/128 automated tests, zero TypeScript errors, and production build PASS.
