# TaskSheet — Design System

<!-- impeccable:design-schema 1 -->

This document is authoritative for TaskSheet's screen-UI visual language. It describes what was actually built during the `/impeccable` redesign pass and is written to prevent a future session from drifting the interface back toward a generic Tailwind admin-dashboard look. See `PRODUCT.md` for product context (users, purpose, positioning, constraints).

## Product Visual Philosophy

TaskSheet is purpose-built healthcare workflow software — an ORGANIZE → GENERATE → PRINT tool for LTC/assisted-living HCA and LPN staff. It is **not** a generic SaaS dashboard, not a marketing site, not an EMAR, and not a startup product competing for attention. The screen UI's job is to get a shift's information organized correctly and fast, then get out of the way of the printed page, which is the actual work product.

Core principles, in priority order:

1. **Calm.** No decorative color, no motion for its own sake, no visual noise competing with the task at hand.
2. **Clinical.** Restrained palette, precise numerals (room, shift code, time) set against quiet metadata — the visual world of a technical drawing schedule (a door schedule, a room-finish schedule), not a marketing page.
3. **Compact.** Dense, scannable layouts. A shift-change worker should see what they need without excessive scrolling.
4. **Operational.** Every screen answers "what do I need to do or know right now," not "how healthy is this business" (no vanity KPIs, no decorative charts).
5. **Print-oriented.** Screen chrome exists to produce a correct paper TaskSheet; it must never be confused with, or allowed to influence, the print output itself.
6. **Desktop-first.** Designed and density-tuned for 1366×768–1920×1080 workstation use; mobile is a usable fallback, not a parallel design target.
7. **Accessible.** Keyboard navigation, visible focus, semantic controls, and modal focus-trapping are load-bearing requirements, not nice-to-haves.
8. **Low decoration.** No gradients, no hover-lift, no rainbow icon backgrounds, no shadows except true elevation.
9. **Strong information hierarchy.** Achieved through type weight, spacing, and structure — not size alone, and not color.

## Color Tokens

All screen-UI color lives in `src/index.css` under `@theme`, generating real Tailwind utilities (`bg-accent`, `text-ink`, `border-hairline-strong`, etc.). **Never use raw Tailwind palette classes** (`bg-slate-100`, `text-teal-600`, `bg-rose-50`, …) or arbitrary hex (`bg-[#...]`) in screen UI — if a value doesn't exist as a token, add the token, don't reach for a one-off.

| Token | Value | Meaning — when to use it |
|---|---|---|
| `--color-app` | `#f7f7f6` | Page background only — the surface the whole app shell sits on. Never used for panels or cards. |
| `--color-panel` | `#ffffff` | The working surface: table backgrounds, modal bodies, input backgrounds, card-equivalent bordered sections. |
| `--color-panel-sunken` | `#faf9f6` | A slightly recessed surface *inside* a panel — table header rows, hover states, toolbar bars, the canvas behind a print-preview paper. Never used as the outermost page background. |
| `--color-ink` | `#1d1f20` | Primary text, headings, and the "primary" button fill. |
| `--color-ink-soft` | `#43474d` | Secondary text — subtitles, body copy inside dense rows, form labels' descriptive text. |
| `--color-muted` | `#767779` | Tertiary/metadata text — timestamps, counts, helper captions. |
| `--color-faint` | `#a4a5a6` | Lowest-emphasis text/icons — empty-state icons, disabled-adjacent hints. |
| `--color-hairline` | `#dbdbdb` | Default border/divider weight — table row dividers, section separators. |
| `--color-hairline-strong` | `#c9c9ca` | Structural border weight — panel/card outlines, table header underlines, segmented-control borders. |
| `--color-accent` | `#5980a6` (muted blue-grey) | The **one** interactive/brand accent — primary CTAs, active nav/tab state, links, focus rings. Reserved for "this is interactive or currently selected," not decoration. |
| `--color-accent-strong` | `#2c455d` | Accent hover/pressed state, and accent-toned text needing more contrast than `--color-accent` on a light background. |
| `--color-accent-soft` | `#eef6ff` | Accent-tinted background — selected list rows, info callouts, `.badge-accent`. |
| `--color-danger` | `#8a3f3a` | Destructive actions and true errors/blocking conditions only (delete, validation failure, wound/clinical-safety flags). Never used for "inactive" or merely historical data. |
| `--color-danger-soft` | `#f6ece9` | Danger-tinted background for alerts/badges. |
| `--color-warning` | `#8a5a1e` | Needs-attention states: paused care, demo-mode banners, setup-required banners, stopped tasks, on-hold/out-on-pass/in-hospital resident status. |
| `--color-warning-soft` | `#faf1de` | Warning-tinted background. |
| `--color-positive` | `#1e6b45` | Confirmed-good states only: Active resident status, "binder current," successful save feedback. |
| `--color-positive-soft` | `#e7f2ec` | Positive-tinted background. |

*(Revised 2026-09-03: accent hue changed from the original desaturated teal to a muted blue-grey, and text/hairline neutrals lightened slightly, following a new Claude Design mockup. Danger/warning also re-tuned to the mockup's muted tone. Radius/shadow/spacing scale, surface rules, and the Print Separation boundary below are unchanged from the original pass.)*

**Status-semantic mapping (apply consistently everywhere a status/state appears — resident status, task status, binder status, shift toggles):**

- Active / current / confirmed-good → `positive`
- In Hospital / Out on Pass / On Hold / paused / stopped / setup-required / demo-mode → `warning`
- Discharged / inactive / historical / "schedule ended" → `neutral` (badge-neutral / ink-soft), **not** danger — inactivity is not an error
- Destructive action or blocking validation failure → `danger`
- Everything else that's just "this is the current selection or an interactive control" → `accent`

**One exception, documented at its source:** `src/components/layout/Sidebar.tsx` defines `RAIL_ACCENT = '#7fa8d4'`, a brighter blue than `--color-accent`, used only for active-state indicators against the mobile nav's near-black surfaces (`RAIL_BG = '#15181c'`). `--color-accent` (`#5980a6`) is too dark to read as an "active" indicator on that background. This is a deliberate dark-surface variant, not a second brand color — it is not used anywhere else, and it is defined once as a named constant, not repeated as a magic hex value.

## Typography Hierarchy

Three fonts, each with a specific job — not a single stack used everywhere:

- **Public Sans** (`--font-body`, weights 400–700, self-hosted variable font) — body text, form values, table cells, everything not called out below. Applied globally via `body { font-family: var(--font-body) }`.
- **Archivo** (`--font-heading`, weights 500–700, self-hosted variable font) — page titles (`h1`) and section titles (`h2`), applied globally via a base-layer rule, plus every button label via `.btn`'s shared class. Used for emphasis/display, never for body copy.
- **IBM Plex Mono** (`--font-mono`, weights 500/600, self-hosted static files) — tabular/numeric identifiers only: shift codes, times, room numbers. Applied per-element (`font-[family-name:--font-mono]` or an inline style), not globally — most text should not be monospace.

`font-variant-numeric: tabular-nums` remains set globally on `body` so numeral columns still align even where Plex Mono isn't applied. Sizes are set per-element with Tailwind arbitrary values (`text-[22px]`, `text-[13px]`, …) rather than the default type scale, to hit exact hierarchy targets:

| Level | Size / weight | Where |
|---|---|---|
| Page title | `22px`, `font-bold`, Archivo | One per screen — "Dashboard," "Shifts," "Settings." Never larger; this is workstation software, not a landing page. |
| Section title | `13px`, `font-bold`, uppercase, `tracking-wide`, Archivo | "Today's Shifts," settings nav-group labels, table section headers. |
| Body | `13px`, regular/medium, Public Sans | Row content, form values, descriptive text. |
| Metadata | `11–11.5px`, `text-muted` or `text-faint` | Counts, timestamps, secondary descriptors under a title. |
| Table headers | `10.5–11px`, `font-bold`, uppercase, `tracking-wide`, `text-muted` | `.table-schedule thead th` and equivalent div-grid headers. |
| Labels (forms) | `11–12px`, `font-bold`, uppercase, `tracking-wider`, `text-ink-soft` | Field labels — bold-and-small, not large-and-regular. |
| Helper text | `11px`, `text-muted` | Under an input, explaining format or consequence. |
| Tabular data | Plex Mono | Shift codes, time ranges, room numbers — anywhere columns of numerals need to align by digit width, not just proportionally. |

Hierarchy is carried by **weight and structure more than size** — a bold 13px row title next to a regular 13px metadata line reads clearly without needing a large size jump.

## Surface Rules

- **Full page background:** `bg-app` on the outermost scroll container only.
- **Panel:** `bg-panel` + `border border-hairline-strong` + `rounded-surface` — the default "this is a distinct section" treatment. Class: `.title-block` (bordered context bar / header treatment) or a bare `bg-panel rounded-surface border ...` block.
- **Bordered section inside a panel:** use `border-t border-hairline` dividers, not a nested panel. **Do not nest panels inside panels** — this was the single biggest anti-pattern removed in this redesign (endless white rounded-xl cards nested in cards).
- **Divider:** `border-hairline` for row-level separation (table rows, list items), `border-hairline-strong` for structural separation (panel edges, section boundaries, table header underline).

**When NOT to use a card:** if the content is a single list of comparable items (reports, shifts, presets, entity-type choices, filter options), use a flat `divide-y divide-hairline` list inside one bordered container, not one card per item. Cards-per-item were converted to flat lists in three places during this pass: the GlobalAddModal entity-type picker, the Print Center report catalog, and (structurally) the Dashboard/Shifts/Residents row lists. Reach for a card only for a genuinely standalone, non-repeating block (e.g., the paused-care-status callout, a single stat strip).

## Radius Rules

Two tokens only:

- `--radius-control` (`0.25rem`) — buttons, inputs, badges, small chips, table-adjacent controls.
- `--radius-surface` (`0.375rem`) — panels, modals, dropdown menus.

**Never use `rounded-xl`/`rounded-2xl`/`rounded-full` in screen UI** (the one exception is a genuine pill/circular element with no equivalent, which does not currently occur). Bubbly, oversized radii were systematically converted to these two values across every redesigned file.

## Shadow Rules

`--shadow-elevated` is the **only** shadow token, and it is reserved for things that are genuinely floating above the page:

- Modals (`Modal.tsx`)
- Dropdown menus / popovers (`TaskActionMenu`, Add-menus, status-change menus)
- The print-preview "paper" (screen-only; never applied inside `.tasksheet-print-document` itself)
- The dark full-screen print-preview toolbar (`PrintPreviewPage.tsx`)

Flat panels, table rows, cards, and buttons carry **no shadow** — their structure comes from `border-hairline-strong`, not elevation. `shadow-sm`/`shadow-md`/`shadow-xs` on non-floating elements were removed throughout.

## Button Hierarchy

Exactly four levels, defined once in `@layer components` (`src/index.css`) as `.btn` + a modifier:

- **`.btn-primary`** (`bg-ink`) — the highest-emphasis action on a screen that isn't specifically "the accent action." Used for banner CTAs (Demo Mode, setup-required) and confirm buttons on non-destructive dialogs.
- **`.btn-accent`** (`bg-accent`) — the primary "do the main thing" action: Add/Save/Configure/Print buttons across forms and toolbars. This is the button users should reach for most often.
- **`.btn-secondary`** (`bg-panel` + border) — Cancel, Back, Duplicate, and other non-primary actions that still need a real button (not a bare text link).
- **`.btn-danger`** (`bg-danger`) — destructive confirmation only (Delete). Never used for "Stop" (a reversible, non-destructive action — that uses `.btn-primary` or `.btn-secondary` with a `text-warning` icon instead).

All four share one height (`--spacing-control-h`, `2.25rem`), one radius (`--radius-control`), and one type scale. **Never give two buttons that do the same conceptual thing (e.g., five different "submit this form" buttons across five entity types) five different colors** — this was a real anti-pattern found and fixed in `GlobalAddModal.tsx` (blue/purple/amber/rose/teal submit buttons unified to `.btn-accent`).

## Badge Semantics

`.badge` + one of `.badge-neutral` / `.badge-accent` / `.badge-warning` / `.badge-danger` / `.badge-positive`. Badges are reserved for real identity or state — Demo, Active, In Hospital, HCA/LPN/RN, a category tag, a count. They are not decoration and not a substitute for a table column. Follow the status-semantic mapping above; do not invent a fifth badge color (violet/purple/blue/cyan/sky badges were all found and converted to one of the five during this pass).

## Table Design

`.table-schedule` (in `@layer components`) is the shared language for real `<table>` markup: uppercase muted headers with a `hairline-strong` bottom border, `hairline` row dividers, `panel-sunken` row hover, `accent-soft` focus-within. Used by `FYIBinderView`.

Several list surfaces (Dashboard, ShiftsView list, ResidentsView list) use **CSS Grid rows** instead of a real `<table>`, specifically because each row needs a full-row click target (`CardNavigationButton`, see Accessibility below) that cannot coexist with real `<tr role="button">` semantics. These grids replicate the same visual language (uppercase muted header row, hairline dividers, tabular-nums) via a shared `gridTemplateColumns` string per screen.

**Mandatory safety rule for any percentage-based `gridTemplateColumns` table:** grid tracks sized by percentage will still expand to fit unwrappable header/content text unless every cell has `min-w-0` (plus `truncate` where the text can be long). Without this, the grid — and the whole page around it — silently overflows horizontally at narrow viewports. **Always** wrap such a table in `overflow-x-auto`, give the grid a `min-w-[Npx]` matching its natural content width, and put `min-w-0 truncate` on every header cell. This exact bug (unwrappable "Resident Care"/"Unit Tasks" header text forcing the entire Dashboard page to overflow at 768px) was found and fixed in this pass in `DashboardView.tsx`, `ShiftsView.tsx`, and `ResidentsView.tsx` — do not reintroduce a percentage grid table without this wrapper.

Toolbars above a table (date navigator + search + view toggle) must use `flex-wrap`, not a fixed height with no-wrap, so they degrade to a second line at narrow widths instead of clipping.

## Forms

- Section-based, not card-per-field. Group related fields (e.g., Short Code + Role side by side) to increase density and show the relationships between fields, rather than stacking every field full-width in its own box.
- Labels: bold, small, uppercase, `text-ink-soft`, with a `text-danger` `*` for required fields.
- Inputs: `border-hairline-strong`, `rounded-control`, height matches `.btn` (`h-10`/`2.5rem` is the norm), `focus:ring-2 focus:ring-accent focus:outline-none`.
- Helper/consequence text (e.g., "Overnight shift: working hours automatically span past midnight") uses an inline `bg-accent-soft` or `bg-warning-soft` callout directly under the fields it explains — not a modal, not a tooltip.
- Footer actions: secondary action(s) left or first, primary/accent submit action last, using `.btn-secondary` / `.btn-accent` — never ad hoc button styling per form.

## Modals

`Modal.tsx` provides the shared shell: `bg-panel`, `rounded-surface`, `shadow-elevated`, `border-hairline-strong`, focus trap, Escape-to-close, focus restoration on close. Header uses `bg-panel-sunken` with a `border-b border-hairline`. **Never build a one-off modal overlay** (`fixed inset-0 bg-black/60`) outside this shared component — `FyiBinderPrintModal` is the one deliberate exception because it must render an embedded print-document preview, and even there the screen chrome (header, controls, close button) reuses the same tokens.

Dangerous-action confirmation (`ConfirmDialog`, `TaskActionConfirmModal`) is visually distinct from a routine save: a danger/warning icon, tone-matched callout background, and a `.btn-danger` or tone-matched confirm button — never the same visual weight as an "OK" button on a routine dialog.

## Navigation

Sidebar is a flat structured rail (`RAIL_BG`/`RAIL_LINE`/`RAIL_TEXT_MUTED`/`RAIL_ACCENT` — a deliberately separate dark palette from the screen tokens, documented above), not floating rounded pills. Active state is a 3px left accent stripe plus a subtle tinted background, not a filled rounded button. Mobile collapses to a bottom tab bar (5 primary destinations) plus a "More" sheet for Settings/Print Center — both the rail and the sheet must set an explicit base text color (`RAIL_TEXT_MUTED`) on their container, since nothing else in the inherited style chain provides a legible color against `RAIL_BG`.

## Responsive Rules

Desktop-first: density is tuned and verified at 1366×768, 1440×900, and 1920×1080 — every primary screen must fit with minimal scrolling at 1366×768 (verified: Dashboard, Shifts, Residents all fit with zero scroll at this size in the demo dataset). Tablet (~768px) and mobile (375px) are a **usable fallback**, not a parallel design target:

- Toolbars wrap (`flex-wrap`) rather than clip.
- Wide tables scroll horizontally inside their own `overflow-x-auto` container rather than compressing until content overlaps or breaking the page's own width.
- Multi-column stat strips (`flex flex-wrap` with `min-w-[Npx]` per cell) reflow to fewer columns rather than overflowing.
- The mobile bottom nav + "More" drawer must remain legible (explicit muted-on-dark text color, not inherited).

Do not "fix" density by shrinking text below the type scale above — use hierarchy, grouping, and removing decorative whitespace (`p-8`, `gap-6`, oversized headers) instead.

## Accessibility Rules

- **No nested interactive descendants.** A row/card that is fully clickable must use `CardNavigationButton` (`src/components/common/CardNavigationButton.tsx`) — a real `<button data-card-navigation="true">` absolutely positioned as a *sibling* to any other interactive control in that row (Print, Care Setup, overflow menu), never a `<tr role="button">` or `<div role="button">` that *contains* a real nested `<button>`. This is enforced by tests (`clickableShiftCards.test.tsx`, `residentsMenu.test.tsx`) and must not be "simplified" back into a clickable-row-with-nested-button pattern.
- Every interactive element has a visible focus ring (`focus-visible:ring-2 focus-visible:ring-accent`, or the `CardNavigationButton`'s own focus-visible style).
- Modals trap focus and restore it to the trigger on close (`Modal.tsx`).
- Escape closes modals and dropdown menus.
- Overflow/action menus have accessible names (`aria-label`) and correct `aria-expanded`/`aria-haspopup`.
- Form controls have associated `<label>`s; required fields are marked both visually (`*`) and via `required`.
- Status is never communicated by color alone — badges carry text, not just a color chip.

## Print Separation

**Screen-design tokens defined in this document must never be used to casually alter the print-document system.** `.tasksheet-print-document`, everything under `@media print` in `src/index.css`, and the components under `src/components/print/` are a separately verified, print-certified system with its own typography contract (`--print-font-family: Arial, Helvetica, sans-serif`, `--print-title-size`, etc.). Arial is used there deliberately for print-hardware reliability, not as a stylistic choice — the `/impeccable` detector's "overused-font" rule flags it as a false positive for this reason; do not "fix" it.

If a change to shared print/screen code is unavoidable, verify with a diff that no line under the `/* ─── Print CSS ─── */` boundary in `src/index.css`, and no print-document component's print-only output, changed as a side effect.

## Anti-Patterns (do not reintroduce)

- Card grids for everything, including single-item lists that should be a flat `divide-y` list.
- Rainbow icon backgrounds / a different accent color per entity type, tab, or button that does the same conceptual job.
- Decorative gradients or glows (the old sidebar brand-mark glow, hero-card gradients).
- Oversized marketing-style headings (anything above 22px for a page title).
- Hover-lift, bounce, scale, or other decorative motion — only subtle color/background transitions on hover and focus.
- Nested interactive controls (`<tr role="button">` containing a real `<button>`) — see Accessibility above.
- Fake clickable table rows without a real, independently-testable navigation control.
- Arbitrary Tailwind palette colors (`slate`, `rose`, `amber`, `blue`, `purple`, `violet`, `sky`, `cyan`, `indigo` as raw utility classes) anywhere in screen UI — always route through the tokens above.
- Excessive rounded containers (`rounded-xl`/`rounded-2xl`/`rounded-full`) — use `rounded-control` / `rounded-surface`.
- Decorative badges — a badge with no real identity/state behind it.
- Percentage-based CSS Grid tables without a `min-w-0`/`truncate`/`overflow-x-auto` safety net (see Table Design).
