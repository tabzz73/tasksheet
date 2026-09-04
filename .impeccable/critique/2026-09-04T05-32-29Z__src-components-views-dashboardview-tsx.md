---
target: src/components/views/DashboardView.tsx
total_score: 26
max_score: 40
na_heuristics: 0
p0_count: 0
p1_count: 3
timestamp: 2026-09-04T05-32-29Z
slug: src-components-views-dashboardview-tsx
---
# Critique: Dashboard (`src/components/views/DashboardView.tsx`)

Method: dual-agent — an isolated design-review assessment (Nielsen heuristics, personas, cognitive load, live interaction testing) and an isolated detector + browser-evidence assessment (static `detect.mjs` scan plus a live DOM overlay scan with screenshots), synthesized here without either agent seeing the other's findings.

## Design Health Score

| # | Heuristic | Score |
|---|---|---|
| 1 | Visibility of System Status | 3/4 |
| 2 | Match Between System and Real World | 3/4 |
| 3 | User Control and Freedom | 2/4 |
| 4 | Consistency and Standards | 3/4 |
| 5 | Error Prevention | 3/4 |
| 6 | Recognition Rather Than Recall | 3/4 |
| 7 | Flexibility and Efficiency of Use | 2/4 |
| 8 | Aesthetic and Minimalist Design | 3/4 |
| 9 | Help Users Recognize/Diagnose/Recover from Errors | 2/4 |
| 10 | Help and Documentation | 2/4 |
| **Total** | | **26/40** |

No heuristics were marked N/A for this surface.

## Design Specificity Verdict

Genuinely grounded, not generic-SaaS-skinned, on the whole. The "Shift Command" kicker, mono-numeral shift codes (D1/E1/LP1), room-number-first list rows, the resident-status vocabulary (Out on Pass/In Hospital/On Hold), and the Shift Huddle's assembly of Census/Away/Attention/Follow-up/FYI/Code-of-Month into one read-aloud briefing all come from the actual care-facility domain, not a template — confirmed by both live inspection and source reading.

Where it slips toward generic-SaaS, the two assessments independently converge on the same spot: Assessment A flagged the four-stat-tile row (Scheduled Today / Residents / Active Shifts / FYI Binder) as "a classic KPI-card-strip composition interchangeable with any admin dashboard," and Assessment B's detector independently flagged those same stat cards under `gpt-thin-border-wide-shadow` — the mechanical signature of default-generated card styling (0.8px border + 24px shadow blur). Two independent methods landing on the same component is a strong signal this is a real issue, not a false positive from either.

The static `detect.mjs` scan of the DashboardView source and dashboard component directory found **0 findings** — the component code itself contains no mechanically-detectable anti-patterns. All 34 detector findings came from the live-rendered DOM, meaning they stem from runtime composition (Tailwind's generated font sizes, computed layout) rather than anything visible in a source read. This is worth noting for future audits: source-only scans of this codebase will systematically undercount.

## Overall Impression

A functionally solid, domain-authentic Dashboard let down by one real workflow-breaking interaction bug, a same-screen inconsistency in something users need to trust implicitly (the date), and a cluster of small-but-real typography/layout issues the live browser exposes that a source read alone would miss entirely.

## What's Working

- The empty/quiet states ("Everyone is currently in the facility," "Nothing unusual to report — a quiet shift so far," "No new or recently changed wounds") are calm, specific, and confirm the system checked rather than just showing "no data" — this matters for trust in a safety-adjacent tool.
- Icon discipline: one icon per scope, never reused across unrelated warning types, executed consistently across all eight dashboard widgets (`UNIT_SITUATION_ICON`, `FyiImportanceFlag`).
- `CardNavigationButton`'s full-row click target sidesteps the nested-interactive-element accessibility trap while keeping the whole shift-table row clickable — a real technical constraint solved cleanly.
- Cognitive load passes on: single focus per screen, panel-bordered grouping, weight-over-size hierarchy, one-thing-at-a-time modals, and no hidden state (working memory isn't taxed).

## Priority Issues

**P1 — Modal doesn't lock body scroll; the Shift Huddle briefing can vanish mid-read.**
Confirmed live: scrolling the mouse wheel while the Shift Huddle modal is open scrolls the page behind it, and the modal disappears with no warning, no undo, and no preserved state. `src/components/common/Modal.tsx` (around lines 136–167) is `fixed inset-0` but never sets `document.body.style.overflow = 'hidden'`, so ambient scroll input still reaches the page underneath. For a briefing meant to be read aloud during a live shift handoff, an accidental scroll silently ending it is a real interruption at the worst possible moment.
→ Fix: lock body scroll for the duration any Modal is open.

**P1 — Date format is inconsistent on the one screen that most needs "today" to be trustworthy.**
Dashboard header renders "Thursday, September 3, 2026"; the Shift Huddle modal it opens shows "Briefing for 2026-09-03" — a raw ISO string (`src/components/dashboard/HuddleView.tsx:33`, `subtitle={\`Briefing for ${today}\`}`) that never passes through the same locale formatter DashboardView uses (`DashboardView.tsx:91-93`). Two format conventions for the same date, one screen away, erodes confidence the two views agree on what day it is.
→ Fix: route HuddleView's date through the same formatter.

**P1/P2 — Nested panels contradict the design system's own documented rule.**
The live DOM overlay flagged 2 instances of `nested-cards` on the Dashboard. This directly contradicts DESIGN.md's explicit "Don't nest panels inside panels" guardrail, which the doc records as a rule added after an earlier cleanup pass specifically removed this pattern — meaning it has regressed. The static source scan didn't catch it, so exact call sites need a follow-up pass with the browser inspector open (Assessment B did not return precise file:line for this pattern, only the DOM location).
→ Fix: locate the two nesting instances (likely stat tiles or widget cards containing another bordered panel) and flatten to a single panel boundary per the documented rule.

**P2 — Stat-tile clickability is undiscoverable and inconsistent.**
Two of the four top stat cards (Residents, FYI Binder) are real buttons with hover feedback; the other two (Scheduled Today, Active Shifts) are static divs — nothing in the visual language (no chevron, no underline) distinguishes which until hover, so a user either misses two working shortcuts or wastes a click on two dead ones.
→ Fix: make all four consistently interactive or add a persistent (non-hover-dependent) affordance to the clickable two.

**P2 — Customize modal's 8 widget toggles have no grouping or descriptions.**
One flat checklist, no visual separation between situational-awareness/clinical/informational widgets, no "what does this show" copy — forces trial-and-error for a first-time facility admin.
→ Fix: group into labeled sections; add one-line descriptions per widget.

**P2 — Undersized UI text, several instances below the documented type scale.**
The live overlay flagged nav labels (~9.5px), "SoftVibeSolutions" (9.5px), "DEMO MODE" (10px), stat labels (10.5px), and Huddle table headers (10.5px) as undersized, plus several generic 11px `tiny-text` instances. Cross-checked against DESIGN.md's own Typography Hierarchy (documented floor: 10.5–11px for table headers/metadata): the 10.5–11px instances are within the documented scale and likely not regressions, but the 9.5px instances (nav labels, footer brand text) sit below anything DESIGN.md documents and are real out-of-scale findings.
→ Fix: either bump the 9.5px instances to the documented 10.5px floor, or add an explicitly-scoped "compact label" size to DESIGN.md's Typography Hierarchy if this size is intentional for the nav rail — don't leave it undocumented either way.

**P3 — Latest FYI card unbalances the two-column widget grid.**
With 5 FYI entries at 2–3 lines each, the card runs visibly taller than its Resident Attention neighbor and the row below, breaking the "flat list inside one bordered panel" rhythm.
→ Fix: cap with a max-height and internal scroll, matching the pattern already used in modal content.

**P3 — Heading hierarchy skips a level (h1 → h3, no h2).** Flagged independently by both assessments — the design review via manual DOM inspection (a11y/screen-reader landmark navigation concern for the "Sam" persona) and the detector's live overlay. Two-method agreement; low effort to fix.
→ Fix: insert an h2 (can be visually hidden if "Current Unit Situation" shouldn't visually promote) or renumber.

**P3 — Cluster of smaller detector findings**, all live-DOM-only (not caught by source scan): `clipped-overflow-container` on the outer `div.h-screen.overflow-hidden.flex.bg-app.text-ink`; `cramped-padding` on a flex container with children flush to its border; `line-length` (~107 chars) on the DEMO MODE banner description; `all-caps-body` (2 instances, 43 and 31 chars — likely the same "DEMO MODE" and a stat label, worth checking against the AA-Over-Distinction/weight-over-size rules already documented); `text-occlusion` (2 instances — one self-flagged by the agent as a possible false positive/DOM-measurement artifact on the Add Attention modal's h3, worth a manual look before treating as real).

## Persona Red Flags

- **Alex (impatient power user)**: hits the scroll-dismisses-modal bug directly — mid-huddle-read, one careless wheel-scroll loses their place. Quick Add is also a click-then-click dropdown for the single most frequent action on this screen, adding friction for a frequency-driven persona.
- **Sam (accessibility-dependent)**: the 9.5–10.5px uppercase tracking-wide labels sit at the edge of comfortable legibility and weren't stress-tested at 200% zoom; the skipped h1→h3 heading level breaks landmark navigation for screen-reader users jumping by heading.
- **Jordan (facility admin, first-time setup)**: the Customize modal's flat, ungrouped, undescribed 8-item toggle list forces trial-and-error rather than informed choice.

## Minor Observations

- Quick Add's "Wound Protocol" item uses a danger-red icon while the other 4 use accent-green — worth confirming this is intentional per the documented "Danger color: destructive actions and true blocking errors only" rule, since wound entry itself isn't destructive.
- The time-of-day greeting ("Good evening…") is based on device clock, not the shift actually being worked — an overnight LPN opening the app at 11pm gets "Good evening" at the *start* of their shift. Minor tone mismatch for the overnight-shift scenario PRODUCT.md calls out as first-class.
- The shift-row Print icon button gave no observable click feedback during testing — worth confirming it responds immediately, since a busy nurse triggering it twice because "nothing happened" is a plausible failure mode.
- "FYI Binder" stat tile's "Current" state label reads slightly ambiguous without a verb, out of context.

## Questions to Consider

1. If the printed sheet is the actual product, should the Dashboard's top-of-fold real estate go to 4 generic KPI tiles, or to "what's not ready to print yet"?
2. The Shift Huddle is explicitly read-only/ephemeral — does a once-per-shift-change handoff between outgoing and incoming charge nurses need at least a "mark reviewed" or print/copy path?
3. DESIGN.md documents this as the third named visual direction this codebase has shipped — what's anchoring "navy rail / forest accent" as final, and is the Dashboard (the first thing every shift sees) the highest-risk place to keep re-skinning?
