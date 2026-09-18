# MedSync CATMS — UI Guidelines
Based on SRS §3.1 and the reference screenshot (Book Appointment page). This is the contract
every page must follow so the app feels like one product, not five students' separate pages.

## 1. Layout skeleton (every authenticated page)

- **Left sidebar**, collapsible, grouped by section headers (not a flat list):
  `PATIENTS`, `APPOINTMENTS`, `BILLING & PAYMENTS`, etc. — matches the reference screenshot.
  Logo + product name pinned at top; `Settings`, `Help Center`, `Logout` pinned at bottom.
- **Top bar**: notifications bell, theme toggle, branch/location indicator, "Good
  morning/afternoon, {first name}" + role/branch subtitle, avatar.
- **Breadcrumbs** under the top bar on any page nested more than one level deep.
- **Content area**: white cards on a light-grey page background, each card with a clear section
  header. Multi-step forms (like Book Appointment) use numbered circular badges (1, 2, 3…) per
  section — reuse this pattern for any multi-step flow (registration, invoice generation).

### 1.1 Region separation (applies to every page, not just the dashboard)

The sidebar, top bar, and content area must be told apart at a glance, without reading labels —
someone re-orienting mid-shift after an interruption (phone call, patient at the counter) should
not have to hunt for where one region ends and another begins. Use color, not just borders, to do
this work:

- **Sidebar** — dark navy fill (`#0F172A`), not white and not the same shade as content. Inner
  content recolors accordingly: white/70% body text, white/50% icons, white/40% uppercase
  section labels, teal-light (`#38BDF8`) for the active item's icon and left accent bar, a
  translucent white (`bg-white/10`) for hover/active row backgrounds. Logout stays visually
  distinct (rose/red tones) even against the dark fill.
- **Top bar** — white (`surface-card`), fixed, with a `border-subtle` bottom edge and a
  drop shadow that **strengthens on scroll** (base `0 1px 4px rgba(15,23,42,0.04)`, scrolled
  `0 4px 12px rgba(15,23,42,0.08)`) so it visibly reads as a layer floating above content rather
  than part of the page flow.
- **Content canvas** — a grey-blue background (`#E9EEF5`), deliberately a few points darker than
  the old near-white default, so white cards inside it read as distinct surfaces rather than
  blending into the page chrome. Pair with a faint inset shadow along the content area's left
  edge (`inset 1px 0 0 rgba(15,23,42,0.06)`) to reinforce the sidebar boundary beyond color alone.
- Do not substitute a hairline border for this separation on its own — border-only separation is
  too subtle at low contrast/brightness (shared desk monitors, bright reception lighting) and
  fails the accessibility baseline in §6.
- These are the **only** three fixed-chrome colors in the system. Don't introduce a fourth tone
  for a specific page — if a page needs to feel different, vary content inside the white cards,
  not the shell around them.

### 1.2 Typography

- **Roboto is the only typeface in the system.** Earlier pages used a two-font system (Plus
  Jakarta Sans for headings, Inter for body/labels) — this has been replaced. Every text token
  (`display-lg`, `headline-md`, `headline-sm`, `body-md`, `body-sm`, `label-lg`, `label-md`,
  `label-sm`, `mono-data`) maps to Roboto, loaded once via:
  `https://fonts.googleapis.com/css2?family=Roboto:ital,wght@0,100..900;1,100..900&display=swap`
- Don't reintroduce a second family for headings "to add personality" — differentiate headings
  from body text with weight and size only (the existing `font-*` tokens already do this).
- **Type scale baseline** (revised up from the original spec for legibility on shared desk
  monitors): `body-md` 16px, `body-sm` / `label-md` 14px, `label-lg` 16px, `mono-data` 14px,
  `label-sm` 12px. Headline and display sizes are unchanged from the original scale
  (`headline-sm` 16px, `headline-md` 20px, `headline-lg`/`display-lg-mobile` 24px, `display-lg`
  32px). Apply this scale by editing the shared `fontSize` tokens in the Tailwind config, never
  by hand-picking a literal size (`text-[13px]`, etc.) on individual elements — a handful of
  IDs/tags across the Manage Appointments table did this and had to be swept up after the fact.

## 2. Component rules

- **Summary counts**: prefer small pill badges next to the page title (e.g. "✓ 06 Completed",
  "⛔ 02 Cancelled") over a full row of large metric cards when the counts are secondary context,
  not the primary thing the page is for. Reserve the full metric-card strip (icon, big number,
  trend line) for pages where those numbers *are* the point, like the Dashboard. A page built
  around a working table (Manage Appointments, Invoices) shouldn't spend a quarter of the
  viewport on stats before the user reaches the table they came for.

- **Buttons**: primary action = filled teal (matches brand color from the screenshot), max one
  primary button per card/section. Secondary actions = outlined. Destructive actions (cancel
  appointment, delete) = red, always behind a confirmation dialog.
- **Search fields**: icon-left input with placeholder text describing exactly what's searchable
  (e.g. "Enter NIC or Name" — not just "Search").
- **Cards**: 1px border, rounded corners, consistent padding; a card's header states what step
  or section it represents.
- **Tables**: sortable columns for anything used in reports or lists (appointments, invoices,
  patients); status shown as a colored pill (Scheduled=blue, Completed=green, Cancelled=grey/red).
- **Forms**: label above field, inline validation message directly under the field on blur (not
  only on submit), required fields marked with `*`.
- **Confirmation dialogs**: required before delete, cancel-appointment, or payment-modification
  actions (SRS §3.1 explicit requirement) — never let a destructive action fire on a single click.
- **Success/error toasts**: every create/update/delete shows a toast; errors state what went
  wrong in plain language, not a raw exception.

## 3. Role-based visibility

- Sidebar items are filtered by role at render time, not just route-guarded — a Receptionist
  should never see a "Manage Branches" link even disabled.
- Patient-facing views are read-only: invoices, balances, own appointments/history. No edit
  affordances render for that role at all.
- The dark-navy sidebar treatment (§1.1) applies regardless of role — only the *items inside it*
  change per role, never its color or the active/hover pattern.

## 4. Responsiveness

- Target desktop and tablet (SRS §2.4.1) — sidebar collapses to icon-only or a drawer below
  ~1024px; tables become horizontally scrollable rather than reflowing into unreadable stacks.
- When the sidebar collapses to icon-only, keep the dark navy fill and white/teal icon treatment
  from §1.1 — the region-separation color logic doesn't get suspended just because labels hide.

## 5. States to always design for

- Empty state (no patients found, no appointments today, no report data — SRS FR-RA-06 requires
  an explicit "no data" notification, not a blank table). Use a dashed-border placeholder card
  with an icon, one line explaining what's missing, and — where relevant — a next-step button
  (e.g. "Register Patient"), not just empty whitespace.
- Loading state (skeleton or spinner, not a blank card).
- Error state (failed fetch — retry affordance, not a silent blank page).

## 6. Accessibility / usability baseline

- All interactive elements keyboard-reachable, visible focus states (`outline: 2px solid
  #0284C7; outline-offset: 2px` on `:focus-visible`).
- Respect `prefers-reduced-motion` — disable non-essential transitions/animations for users who
  request it at the OS level.
- Color is never the only signal for status — pair status pills with text, not color alone. This
  extends to the region-separation rule in §1.1: color plus shadow/contrast, never color alone.
- Form errors are announced near the field, not only in a toast, so screen readers/low-vision
<<<<<<< HEAD
  users don't lose them.
=======
  users don't lose them.
>>>>>>> origin/shavinda
