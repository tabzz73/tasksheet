# Release Notes - TaskSheet 1.0.0-rc.9

RC9 fixes the Residents list three-dot action popup:

- The popup now renders at the viewport level and is no longer clipped by the resident-list card.
- It opens upward near the bottom edge and downward when space is available.
- Horizontal placement is clamped to the visible window.
- Limited-height menus scroll internally.
- Outside click, Escape, window resize, and scrolling close the popup safely.

Resident data, status-change behavior, TaskSheet generation, printing, recurrence, backup, and import logic are unchanged.
