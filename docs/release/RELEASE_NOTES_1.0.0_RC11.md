# Release Notes - TaskSheet 1.0.0-rc.11

RC11 improves common care-task entry while preserving the hardened generator and print rules:

- Adds **Wellness Check** as a shared Common task for both HCA and LPN roles.
- Gives every standard catalog task an editable starter instruction, using the task description or a safe general completion prompt when a specialized instruction is unavailable.
- Adds **Settings → Care Timing Presets** for editable medication and meal schedules.
- Ships initial medication choices of 0800, 1200, 1700, and 2100, plus breakfast, lunch, and dinner defaults.
- Medication Assistance and meal-related catalog tasks offer the applicable facility preset times during Add Care Task.
- Only preset times inside the selected shift's end-exclusive time window are offered; manual time entry remains available and uses the existing hard validation.
- Selecting a different catalog task deterministically replaces stale instructions and attention configuration.

Task generation, recurrence, resident status handling, printing, backup, restore, demo isolation, and import behavior are otherwise unchanged.
