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

## 2. Component rules

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

## 4. Responsiveness

- Target desktop and tablet (SRS §2.4.1) — sidebar collapses to icon-only or a drawer below
  ~1024px; tables become horizontally scrollable rather than reflowing into unreadable stacks.

## 5. States to always design for

- Empty state (no patients found, no appointments today, no report data — SRS FR-RA-06 requires
  an explicit "no data" notification, not a blank table).
- Loading state (skeleton or spinner, not a blank card).
- Error state (failed fetch — retry affordance, not a silent blank page).

## 6. Accessibility / usability baseline

- All interactive elements keyboard-reachable, visible focus states.
- Color is never the only signal for status — pair status pills with text, not color alone.
- Form errors are announced near the field, not only in a toast, so screen readers/low-vision
  users don't lose them.
