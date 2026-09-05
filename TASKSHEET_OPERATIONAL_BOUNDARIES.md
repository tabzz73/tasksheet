# TASKSHEET — OPERATIONAL BOUNDARIES SPECIFICATION
**Audit Scope, Completion Semantics, Expiry vs. Resolution, and Print Trust**
*Developed by SoftVibeSolutions*

This document exists because none of the four rules below are enforced by the
type system. They are conventions that every future change to `AuditEvent`,
follow-up status, date-windowed records, or print documents must be checked
against by a person, not a compiler. When in doubt, this file wins over
precedent in the code — a past change that violated a rule here is a bug to
fix, not evidence the rule doesn't apply.

---

## 1. Audit / History Scope Boundary

TaskSheet's audit trail (`AuditEvent`, `db.appendAudit`) exists to answer
**operational** questions — who did what, when, and to which record. It must
never become a second clinical chart.

**Always permitted in `summary` / `changes`:**
- Status transitions (`due → done`, `carry_forward`, `needs_review`, …)
- Dates: due dates, effective/expiry windows, tracking start/end
- Counts: carry-forward count, occurrence sequence (`2/3`), overdue days
- Actor identity: user display-name snapshot, shift snapshot, source mode
- Title/room snapshots, so a later rename never rewrites history's meaning

**Never permitted, under any future spec, unless TaskSheet's core domain
model is deliberately and explicitly extended to store it as a first-class
field (not smuggled into a free-text audit string):**
- Clinical results or values (vitals readings, lab results, specimen
  findings, wound measurements, weights, BG readings)
- Diagnoses, clinical interpretation, or care-plan narrative
- Anything a facility's official clinical/EMR system is the source of truth
  for

**The test to apply to any new `appendAudit(...)` call:** does this string
describe that an operational action happened, or does it describe a
clinical fact? *"Occurrence recorded: 2/3"* passes. *"BG 4.2 mmol/L, gave
15g carbs"* fails, even if it feels like useful context in the moment —
that belongs in the facility's clinical system, not in TaskSheet's history.

There is no automated check for this. Anyone adding a new audited mutation
should re-read this section before deciding what goes in `changes`.

---

## 2. Completion Semantics

**"Done" in TaskSheet means "this operational follow-up reminder is
resolved." It does not mean, and must never be presented as meaning, "this
care was clinically performed or documented."**

This is the existing ADR-001 boundary (completion/charting removed from
TaskSheet's active architecture) applied to the follow-up system:
- Marking a task `done` clears it from Dashboard/Huddle. It is a screen
  state, not a clinical record.
- Every surface that lets a user resolve a follow-up item (currently
  `FollowUpActionsModal`) must keep a visible reminder of this — today
  that's the standing footer line: *"TaskSheet tracks operational follow-up
  only. Verify current care and instructions in the site's approved
  source-of-truth system."* Do not remove or water this down when reworking
  that UI.
- No report, print document, or history view may phrase a completion event
  as clinical confirmation (e.g. never "administered," "collected
  successfully," or similar) — only operational language ("marked Done,"
  "occurrence recorded").

---

## 3. Expired vs. Resolved

Attention items, FYIs, and tracking periods all use date windows
(`startDate`/`endDate`, `effectiveDate`/`expiryDate`, `active`) that are
evaluated at read time (`isWithinActiveWindow` and equivalents). This is
efficient and correct for "what should currently be visible," but it
creates one real gap:

**An item whose window has simply run out looks identical, from the
outside, to an item someone deliberately reviewed and closed.** Both just
stop appearing in the active lists. Nothing today distinguishes "time ran
out, unreviewed" from "resolved."

Until this is addressed structurally, treat the following as a known,
documented limitation rather than a bug to silently patch around:
- Do not treat "fell out of the active date window" as equivalent to "someone
  confirmed this is handled" in any UI copy or report — say "expired" or
  "no longer active," not "resolved," if the two are ever shown together.
- A future improvement (not yet built) would be a distinct, temporary
  "recently expired — not reviewed" state surfaced once before an item
  disappears entirely, so a Team Lead gets one chance to explicitly close it
  rather than have it vanish unacknowledged. This is a real gap, flagged
  here rather than fixed under time pressure as a side effect of an
  unrelated change.

---

## 4. Print Document Trust Checklist

The paper output is the product for the shift that's actually working —
it must stay trustworthy, readable, and explicitly subordinate to the
facility's real source-of-truth system. Every new print document (a
specialized document, a report, a package item) must satisfy all of the
following before being considered done:

- [ ] **Source-of-truth notice** present somewhere on the document — a
  short line stating this is an operational aid, not the official record,
  and to check with the Team Lead or the approved system for anything
  unclear. (See `HuddleSheetDocument`, `FyiBinderPrintDocument` for the
  established wording pattern — reuse it, don't reinvent it per document.)
- [ ] **Grayscale-safe** — no color-only status signaling; any priority/flag
  uses a text label (e.g. the bordered `InlineFlag` pattern), never color
  alone. Verify with a real grayscale render, not just "looks fine on a
  color screen."
- [ ] **No clinical result fields** — same boundary as Section 1. A print
  document derived from operational data must never surface a clinical
  value the underlying record doesn't already store as a matter of
  TaskSheet's core domain.
- [ ] **Honest action wording** — "Print Preview Opened," never "Printed,"
  in both the UI and any audit event the print action records. TaskSheet
  cannot confirm a physical print completed; don't imply it can.
- [ ] **Print-standard compliance** — monochrome laser-first, light fills
  only, thin rules, no large dark banners, Letter paper, 100%/Actual Size —
  the same standard already applied across the print system.

This checklist is deliberately manual. If the print system grows enough
that this becomes error-prone, the next step is a shared print-document
wrapper component that bakes in the notice and footer once — not a linter,
since most of these are visual/content judgments a linter can't make.
