---
name: TaskSheet
description: Print-first shift-organization software for HCA/LPN long-term-care workflows — the screen exists to produce a correct paper TaskSheet, not to be the product.
colors:
  app: "#faf7f0"
  panel: "#ffffff"
  panel-sunken: "#f5f2e9"
  ink: "#141414"
  ink-soft: "#5b5f52"
  muted: "#6b6f76"
  faint: "#6a6d64"
  hairline: "#ece8dc"
  rail-demo-accent: "#e8a23a"
  rail-facility-text: "#7c869a"
  accent: "#1f6b4c"
  accent-strong: "#1a5c40"
  accent-soft: "#e8f2ec"
  danger: "#b3261e"
  danger-soft: "#fde2e1"
  warning: "#8a6a1e"
  warning-soft: "#fdf3d8"
  positive: "#1f6b4c"
  positive-soft: "#e5f1ea"
  rail-bg: "#0d1f38"
  rail-text-muted: "#9aa4b5"
typography:
  heading:
    fontFamily: "Archivo, Public Sans, sans-serif"
    fontWeight: 700
  body:
    fontFamily: "Public Sans, system-ui, -apple-system, sans-serif"
    fontWeight: 400
  mono:
    fontFamily: "IBM Plex Mono, ui-monospace, SF Mono, monospace"
    fontWeight: 500
rounded:
  control: "0.5rem"
  surface: "0.75rem"
  badge: "0.2rem"
spacing:
  control-h: "2.25rem"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "#ffffff"
    rounded: "{rounded.control}"
    padding: "0 0.85rem"
    height: "{spacing.control-h}"
  button-primary-hover:
    backgroundColor: "#000000"
  button-accent:
    backgroundColor: "{colors.accent}"
    textColor: "#ffffff"
    rounded: "{rounded.control}"
    height: "{spacing.control-h}"
  button-accent-hover:
    backgroundColor: "{colors.accent-strong}"
  button-secondary:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    height: "{spacing.control-h}"
  button-secondary-hover:
    backgroundColor: "{colors.panel-sunken}"
  button-danger:
    backgroundColor: "{colors.danger}"
    textColor: "#ffffff"
    rounded: "{rounded.control}"
    height: "{spacing.control-h}"
  badge-accent:
    backgroundColor: "{colors.accent-soft}"
    textColor: "{colors.accent-strong}"
    rounded: "{rounded.badge}"
---

# Design System: TaskSheet

## Overview

**Creative North Star: "The Shift Binder"**

TaskSheet's screen UI plays a supporting role to the artifact staff actually carry away from it: a printed paper worksheet. The system reads like the working documents of a well-run nursing unit — a dark navy rail as fixed structural chrome (the binder's spine), a warm cream working surface (the paper itself), flat hairline-bordered panels (never an elevated card), one confident forest-green accent for anything interactive, and numeral-led identifiers (room, shift code, time) set apart in a mono face so they scan instantly down a column. Nothing competes for attention with the task at hand; the interface is built to disappear into the workflow, not to be evaluated on its own.

This is at least the third named visual direction this codebase has shipped — an earlier teal "Field Blueprint+" pass was superseded by a deliberate revert back toward TaskSheet's original navy-and-green identity. This document describes the system as it is actually built today, in `src/index.css`'s own words: **"navy rail / forest accent."** A prior DESIGN.md described Field Blueprint+'s teal/Barlow/heavier-hairline system in detail; none of those specific values are current and this file replaces it rather than merging stale numbers forward.

**Key Characteristics:**
- Flat, hairline-bordered panels — never a floating card
- One accent color, reserved for "interactive or selected," never decoration
- Dense, numeral-forward typography for anything tabular
- Motion limited to subtle press/entrance feedback — never lift, bounce, or attention-seeking movement
- Desktop-first density tuned for a single nursing-station workstation, not a marketing surface

## Colors

The palette pairs a warm, paper-like working surface with one confident forest-green accent — closer to a ledger or clinical schedule than a SaaS dashboard.

### Primary
- **Forest Accent** (`#1f6b4c`): the one interactive/brand color in the system — primary CTAs, active nav state, links, focus rings. Also the positive/confirmed-good status color (see Named Rules); this system does not carry a separate positive hue.
- **Forest Accent Strong** (`#1a5c40`): accent hover/pressed state.
- **Forest Accent Soft** (`#e8f2ec`): accent-tinted backgrounds — selected rows, `.badge-accent`.

### Neutral
- **Warm Cream** (`#faf7f0`): the outermost page background only — never a panel or card surface.
- **Panel White** (`#ffffff`): every working surface — panels, modals, inputs, table backgrounds.
- **Panel Sunken** (`#f5f2e9`): a recessed surface *inside* a panel — table header rows, hover states, the print-preview canvas.
- **Ink** (`#141414`): primary text, headings, `.btn-primary`'s fill.
- **Ink Soft** (`#5b5f52`): secondary text — subtitles, dense-row body copy, form-label descriptions.
- **Muted** (`#6b6f76`): tertiary/metadata text — timestamps, counts, captions.
- **Faint** (`#6a6d64`): lowest-emphasis text/icons — empty-state hints, disabled-adjacent content. Sits close to Muted by necessity (see the AA-Over-Distinction Rule); reserve it for content that's genuinely decorative or disabled, not a lighter-weight version of real informational text.
- **Hairline** (`#ece8dc`): the system's one border weight — row dividers *and* panel/card outlines both use this exact value (see the One Border Rule).

### Status
- **Danger** (`#b3261e` / soft `#fde2e1`): destructive actions and true blocking errors only — never used for "inactive" or merely historical data.
- **Warning** (`#8a6a1e` / soft `#fdf3d8`): needs-attention states — paused care, demo-mode banners, on-hold/out-on-pass/in-hospital resident status.
- **Positive** (`#1f6b4c` / soft `#e5f1ea`): confirmed-good states — Active resident status, "binder current." Shares its hex with Accent (see Named Rules).

**One documented exception:** `src/components/layout/Sidebar.tsx` defines its own small dark-navy palette for the persistent left rail and mobile bottom bar — deliberately separate from the screen tokens above, since nothing in the inherited style chain provides legible text against a navy background this dark. `#0d1f38` background, `#9aa4b5` muted nav text, a `rgba(255,255,255,…)` hover/active tint, plus two one-off text colors: `#e8a23a` (demo-mode indicator) and `#7c869a` (facility name and the "SoftVibeSolutions" publisher line).

### Named Rules
**The One Border Rule.** `hairline` and `hairline-strong` resolve to the identical `#ece8dc` — this system uses exactly one border weight everywhere (row dividers, panel outlines, table header underlines). There is no heavier "structural" weight layered on top; don't introduce one without updating this token first.

**The Unified Accent Rule.** `--color-accent` and `--color-positive` share the same forest-green hex (`#1f6b4c`). This system does not carry a separate "confirmed good" hue distinct from its brand color — a resident marked Active and a button inviting a click read as the same color family on purpose.

**The AA-Over-Distinction Rule.** `--color-faint` and `--color-muted` sit close together (`#6a6d64` vs. `#6b6f76`). On a light panel, a text color that's meaningfully lighter than Muted and still clears 4.5:1 WCAG AA doesn't exist in this hue — correctness won over preserving a wider visual gap between the two "de-emphasized" tokens. Don't lighten Faint back toward its old `#9a9d8f` value without re-verifying contrast against both `--color-panel` and `--color-app`.

## Typography

**Heading Font:** Archivo (with Public Sans, sans-serif fallback)
**Body Font:** Public Sans (with system-ui fallback)
**Mono Font:** IBM Plex Mono (with ui-monospace fallback)

**Character:** A grotesque-sans pairing — Archivo's heavier weights carry titles and every button label; Public Sans stays quiet everywhere else. IBM Plex Mono is reserved for numerals that must align by digit width down a column (room numbers, shift codes, times), never used as a general UI face. All three ship self-hosted (static per-weight `.woff2` files) so the UI renders correctly with no internet access, consistent with TaskSheet's local-first positioning.

### Hierarchy
- **Page title** (700, 22px, Archivo): one per screen — "Dashboard," "Shifts," "Settings." Never larger; this is workstation software, not a landing page.
- **Section title** (700, 13px, uppercase, `tracking-wide`, Archivo): "Today's Shifts," settings nav-group labels.
- **Body** (400–500, 13px, Public Sans): row content, form values, descriptive text.
- **Metadata** (400, 11–11.5px, `muted`/`faint`): counts, timestamps, secondary descriptors.
- **Table headers** (700, 10.5–11px, uppercase, `tracking-wide`, `muted`): `.table-schedule thead th` and equivalent grid headers.
- **Form labels** (700, 11–12px, uppercase, `tracking-wider`, `ink-soft`): bold-and-small, never large-and-regular.
- **Tabular data** (IBM Plex Mono, 500/600): shift codes, time ranges, room numbers — anywhere digits must align by width, not just proportion.

`font-variant-numeric: tabular-nums` is set globally on `body`, so numeral columns stay aligned even outside the mono face.

### Named Rules
**The Weight-Over-Size Rule.** Hierarchy is carried by weight and structure more than size — a bold 13px row title next to a regular 13px metadata line reads clearly without a large size jump.

## Layout

Desktop-first: density is tuned for 1366×768–1920×1080 workstation use; every primary screen fits with minimal scrolling at 1366×768. Tablet (~768px) and mobile (375px) are a usable fallback, not a parallel design target.

- Toolbars use `flex-wrap` rather than clipping at narrow widths.
- Wide tables scroll horizontally inside their own `overflow-x-auto` container rather than compressing until content overlaps.
- Multi-column stat strips reflow to fewer columns rather than overflowing.
- Any percentage-based CSS Grid table must give every header cell `min-w-0 truncate` and wrap the whole grid in `overflow-x-auto` with an explicit `min-w-[Npx]` — without this the grid silently overflows the page at narrow widths (a real, previously-shipped defect, fixed on Dashboard/Shifts/Residents).
- Mobile collapses the sidebar to a bottom tab bar (Dashboard/Shifts/Residents/FYI Binder + a "More" trigger) plus a "More" sheet for Settings/Print Center, sharing the rail's dark identity.

Don't "fix" density by shrinking text below the Typography scale — use hierarchy, grouping, and removing decorative whitespace instead.

## Elevation & Depth

Flat by default. Panels, table rows, cards, and buttons carry no shadow at rest — their structure comes entirely from the one hairline border weight, never elevation. `--shadow-elevated` is the single shadow token in the system, reserved for things genuinely floating above the page: modals, dropdown/status menus, tooltips, toasts, and the print-preview "paper" (screen-only, never inside the print document itself).

### Shadow Vocabulary
- **Elevated** (`box-shadow: 0 8px 24px -8px rgb(23 25 28 / 0.28), 0 1px 0 rgb(23 25 28 / 0.04)`): modals, popovers, toasts, the print-preview sheet.

### Named Rules
**The Flat-Card Rule.** A panel's hierarchy comes from its hairline border, never a shadow. If a surface needs to read as "more important," give it a bolder heading or a section title — never add elevation to something that isn't actually floating.

## Shapes

Three radius steps: `--radius-control` (0.5rem) for buttons, inputs, and small chips; `--radius-surface` (0.75rem) for panels, modals, and dropdown menus; a `0.2rem` badge-only radius, smaller than either named token, on `.badge`. No `rounded-xl`/`rounded-2xl`/`rounded-full` in screen UI outside a genuine pill/circular element (none currently occurs). The browser-default scrollbar thumb uses its own `4px` radius, sized to its 8px track rather than the control/surface scale — a functional micro-detail, not a system radius.

## Components

### Buttons
Four levels, one shared height (`2.25rem`), one radius, one type scale (Archivo, 600 weight, 13px):
- **Primary** (`.btn-primary`, ink fill → black on hover): the highest-emphasis action that isn't specifically "the accent action" — banner CTAs, confirm on non-destructive dialogs.
- **Accent** (`.btn-accent`, forest green → accent-strong on hover): the "do the main thing" action — Add/Save/Configure/Print. This is the button users should reach for most often.
- **Secondary** (`.btn-secondary`, white + hairline border → panel-sunken on hover): Cancel, Back, and other non-primary actions that still need a real button, not a bare text link.
- **Danger** (`.btn-danger`, danger fill → darker red on hover): destructive confirmation only (Delete) — never for a reversible action like "Stop," which uses Primary or Secondary with a warning-toned icon instead.
- **Press feedback:** every button scales to `0.97` on `:active` (120ms ease-out) — the one sanctioned scale transform in the system, reserved for confirming a press was heard, never used for hover or entrance decoration.

Never give two buttons doing the same conceptual job (e.g. five "submit this form" buttons across five entity types) five different colors — unify to `.btn-accent`.

**Icon-only buttons** (row overflow menus, print/edit triggers) stay visually small (28–32px, matching the row density this system is built around) but carry `.hit-target-44` — a transparent `::before` pseudo-element (`inset: -6px`) that pads the actual tappable region out to ~44px without changing the button's rendered size. Apply it to any new icon-only control whose visible box is under 44px.

### Badges
`.badge` + one of `neutral`/`accent`/`warning`/`danger`/`positive`. Reserved for real identity or state (Demo, Active, In Hospital, a category tag, a count) — never decoration, never a substitute for a table column. Follow the Colors status mapping; don't invent a sixth badge color.

### Panels
`bg-panel` + `border border-hairline` + `rounded-surface`, flat, no shadow (`.title-block`). Don't nest panels inside panels — group related content with an internal `border-t border-hairline` divider instead. When content is a single set of comparable items (reports, shifts, presets, filter options), use a flat `divide-y` list inside one bordered container rather than one card per item.

### Modals
`Modal.tsx` provides the shared shell: `bg-panel`, `rounded-surface`, `shadow-elevated`, `border-hairline`, focus trap, Escape-to-close, focus restoration on close. Header uses `bg-panel-sunken` with a `border-b border-hairline`. Opens and closes with a centered scale-and-fade (`scale(0.96) → scale(1)`, opacity `0 → 1`, 200ms, strong custom ease-out `cubic-bezier(0.23,1,0.32,1)`) rather than a hard cut — occasional enough (never keyboard-repeated) to earn the animation budget. Don't build a one-off modal overlay outside this shared component — `FyiBinderPrintModal` is the one deliberate exception, since it must render an embedded print-document preview, and even there the screen chrome reuses the same tokens.

Dangerous-action confirmation is visually distinct from a routine save: a danger/warning icon, tone-matched callout background, and a `.btn-danger` (or tone-matched) confirm button — never the same visual weight as an "OK" on a routine dialog.

`FyiBinderPrintModal`'s own overlay (its documented shell exception) additionally uses `backdrop-blur-sm` — a deliberate, bounded effect on that one full-viewport print-preview backdrop, not a general system pattern. Don't add blur to `Modal.tsx`'s shared shell or any other overlay without a similarly specific reason.

### Menus, Tooltips, Toasts
Popovers/dropdown menus and tooltips enter with a trigger-anchored scale-and-fade (`scale(0.95) → 1`, 140ms, the same strong ease-out curve, `transform-origin` set to the corner nearest the trigger — never a bare geometric center). Toasts enter from their fixed anchor (`translateY(8px) → 0`, 200ms). All three replace an earlier set of Tailwind utility classes (`animate-in fade-in zoom-in-95`) that referenced a plugin never installed in this project and silently did nothing — every menu, tooltip, and toast used to appear with a hard instant cut despite the code implying otherwise.

### Tables
`.table-schedule`: uppercase muted headers with a hairline bottom border, hairline row dividers, panel-sunken row hover, accent-soft focus-within. Several list surfaces (Dashboard, Shifts, Residents) use CSS Grid rows instead of a real `<table>`, specifically because each row needs a full-row click target that can't coexist with real `<tr role="button">` semantics — see the No-Nested-Interactive rule below.

### Forms
Section-based, not card-per-field — group related fields (Short Code + Role side by side) to show their relationship and increase density. Labels: bold, small, uppercase, `ink-soft`, with a `danger`-colored `*` for required fields. Inputs: hairline border, `rounded-control`, height matches `.btn`, `focus:ring-2 focus:ring-accent`. Helper/consequence text uses an inline `accent-soft`/`warning-soft` callout directly under the fields it explains — never a modal, never a tooltip. Footer actions: secondary action(s) left, accent/primary submit action last.

### Navigation
A persistent left rail (`w-56`, deliberately separate dark-navy palette — see Colors), not a top bar and not floating pills. The brand mark is a solid accent-green square carrying a white "T," next to the "TaskSheet" wordmark and a small-caps "SoftVibeSolutions" line. Active nav state is white text over a subtle `rgba(255,255,255,0.1)` background tint. Settings is a normal item in the same flat vertical list (Dashboard/Shifts/Residents/FYI Binder/Print Center/Settings), not split into its own utility section. Mobile collapses to a bottom tab bar (same four primary items) plus a "More" sheet, sharing the rail's dark identity and requiring an explicit muted-on-dark text color since nothing in the inherited chain supplies one.

## Do's and Don'ts

### Do:
- **Do** route every color through the tokens above — never a raw Tailwind palette class (`bg-slate-100`, `text-teal-600`) or an arbitrary hex in screen UI.
- **Do** use `CardNavigationButton` (`src/components/common/CardNavigationButton.tsx`) for any fully-clickable row/card — a real `<button data-card-navigation="true">` positioned as a *sibling* to any other interactive control in that row, never a `<div role="button">` or `<tr role="button">` that contains a nested real button.
- **Do** give every interactive element a visible focus ring (`focus-visible:ring-2 focus-visible:ring-accent`).
- **Do** communicate status with a text label, never color alone — a badge carries text, not just a color chip.
- **Do** keep `.tasksheet-print-document`, everything under `@media print`, and `src/components/print/` on their own separately-verified typography contract (Arial/Helvetica) — a print-hardware-reliability choice, not a stylistic one. Never "fix" it toward the screen fonts, and verify with a diff that no print-only line changed as a side effect of a shared-code edit.

### Don't:
- **Don't** nest panels inside panels — use an internal `border-t border-hairline` divider instead.
- **Don't** use `rounded-xl`/`rounded-2xl`/`rounded-full` outside a genuine pill/circular element.
- **Don't** add a shadow to a surface that isn't genuinely floating — hierarchy comes from the hairline border.
- **Don't** add hover-lift, bounce, or other attention-seeking motion — the only sanctioned transforms are the button press-scale and the modal/popover/toast entrances documented under Components.
- **Don't** give two buttons doing the same conceptual job different colors.
- **Don't** invent a sixth badge color.
