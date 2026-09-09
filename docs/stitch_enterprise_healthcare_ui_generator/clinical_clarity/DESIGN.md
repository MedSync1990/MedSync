---
name: Clinical Clarity
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#3f4850'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#707881'
  outline-variant: '#bfc7d2'
  surface-tint: '#006398'
  primary: '#006194'
  on-primary: '#ffffff'
  primary-container: '#007bb9'
  on-primary-container: '#fdfcff'
  inverse-primary: '#93ccff'
  secondary: '#565e74'
  on-secondary: '#ffffff'
  secondary-container: '#dae2fd'
  on-secondary-container: '#5c647a'
  tertiary: '#00628d'
  on-tertiary: '#ffffff'
  tertiary-container: '#007cb1'
  on-tertiary-container: '#fcfcff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#cce5ff'
  primary-fixed-dim: '#93ccff'
  on-primary-fixed: '#001d31'
  on-primary-fixed-variant: '#004b73'
  secondary-fixed: '#dae2fd'
  secondary-fixed-dim: '#bec6e0'
  on-secondary-fixed: '#131b2e'
  on-secondary-fixed-variant: '#3f465c'
  tertiary-fixed: '#c9e6ff'
  tertiary-fixed-dim: '#89ceff'
  on-tertiary-fixed: '#001e2f'
  on-tertiary-fixed-variant: '#004c6e'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
  canvas-bg: '#F8FAFC'
  surface-card: '#FFFFFF'
  surface-subtle: '#F1F5F9'
  border-subtle: '#E2E8F0'
  border-focus: '#0284C7'
  status-scheduled-text: '#0369A1'
  status-scheduled-bg: '#E0F2FE'
  status-completed-text: '#047857'
  status-completed-bg: '#D1FAE5'
  status-cancelled-text: '#BE123C'
  status-cancelled-bg: '#FFE4E6'
  status-pending-text: '#B45309'
  status-pending-bg: '#FEF3C7'
  brand-navy-deep: '#0F172A'
  brand-teal-light: '#38BDF8'
typography:
  display-lg:
    fontFamily: plusJakartaSans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: plusJakartaSans
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-lg:
    fontFamily: plusJakartaSans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.015em
  headline-md:
    fontFamily: plusJakartaSans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: plusJakartaSans
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.005em
  body-lg:
    fontFamily: inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  label-lg:
    fontFamily: inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
  label-md:
    fontFamily: inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: inter
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 14px
    letterSpacing: 0.05em
  mono-data:
    fontFamily: inter
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
    letterSpacing: 0.01em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  space-2xs: 0.25rem
  space-xs: 0.5rem
  space-sm: 0.75rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
  space-2xl: 2.5rem
  space-3xl: 3rem
  sidebar-width: 260px
  sidebar-collapsed-width: 72px
  topbar-height: 68px
  content-max-width: 1600px
  gutter-desktop: 1.5rem
  gutter-mobile: 1rem
---

## Brand & Style

This design system delivers an ultra-modern, clinical-grade digital experience tailored for healthcare operations, clinic administrators, doctors, and receptionists. Built for the Clinic and Appointment Management System (CATMS), the personality balances clinical precision, reassurance, and high-efficiency operational ergonomics. 

The aesthetic is anchored in **Corporate / Modern** mixed with **Refined Clinical Minimalism**:
- **Clarity & Airiness:** Soft cool-tinted canvas backdrops (`#F8FAFC` to `#F1F5F9`) isolate pure white elevated cards (`#FFFFFF`) framed with hairline borders (`#E2E8F0`).
- **Focus & Trust:** Deep nautical slate navy anchors all structural text and brand authority, complemented by vibrant cyan/sky-teal accents derived from medical iconography to signal vitality, progress, and immediate clarity.
- **Operational Density:** Balanced information density allows healthcare workers to scan appointments, queue schedules, diagnosis forms, and financial ledgers at rapid velocity without cognitive fatigue.

## Colors

The palette draws directly from modern clinical environments and precision diagnostic software:

- **Primary (`#0284C7` / `#0EA5E9`):** Vibrant clinical cyan-teal. Used for primary CTAs, active states, step navigation indicators, and key metric badges.
- **Secondary (`#0F172A`):** Deep nautical navy. Used for top-tier headings, high-contrast structural data (patient IDs, monetary aggregates in LKR), and primary text hierarchies.
- **Canvas & Card Architecture:** The background relies on soft slate neutrals (`#F8FAFC` canvas with `#F1F5F9` structural wells). Cards, tables, and floating panels use pure `#FFFFFF` with precise `#E2E8F0` micro-borders to maintain maximum optical separation.
- **Semantic Status Badges:**
  - **Scheduled / Consultation Active:** Sky-blue tint (`bg: #E0F2FE`, `text: #0369A1`).
  - **Completed / Paid:** Emerald medical green (`bg: #D1FAE5`, `text: #047857`).
  - **Cancelled / Critical Allergy:** Rose crimson (`bg: #FFE4E6`, `text: #BE123C`).
  - **Walk-in / Pending / Unpaid:** Amber ochre (`bg: #FEF3C7`, `text: #B45309`).

## Typography

The typographic pairing unites geometric, friendly authority with utilitarian data clarity:
- **Headings (Plus Jakarta Sans):** Lends humanized warmth to clinic greetings, patient names, and page headers without sacrificing corporate clarity. Tight tracking (-0.02em to -0.01em) ensures high impact on KPI metrics.
- **Body & Data Grid (Inter):** Highly legible at small sizes. Used for dense data tables (NIC numbers, timestamps, invoice IDs, treatment codes) and clinical consultation text areas.
- **Data Treatment:** Numerical columns, monetary values (`LKR`), and serial codes (`PT-xxxxxx`, `APT-xxxxxx`) must use tabular figures (`font-variant-numeric: tabular-nums`) to ensure vertical alignment down tables.

## Layout & Spacing

The layout follows a fluid-responsive enterprise application shell:
- **Application Shell:** A fixed 260px categorized sidebar on the left, an anchored 68px top bar spanning the content header, and a fluid main canvas (`#F8FAFC`) with a max bound of 1600px to maintain scannability on ultra-wide medical monitors.
- **Sidebar Categorization:** Navigation groups (e.g., `PATIENTS`, `APPOINTMENTS`, `BILLING & PAYMENTS`, `REPORTS`) are separated by 24px vertical intervals with uppercase 11px micro-labels tracking at 0.05em.
- **Dashboard & Card Grid:** Built on an 8pt layout grid. Multi-column metric cards stack 4-wide on desktop (>=1280px), 2-wide on tablet (>=768px), and 1-wide on mobile (<768px). Card interiors maintain consistent 20px padding (`1.25rem`) with 16px gaps between adjacent cards.

## Elevation & Depth

Visual hierarchy uses a refined multi-layered elevation model rather than heavy drop shadows:
- **Level 0 (Canvas):** Flat base `#F8FAFC` providing soft contrast against white cards.
- **Level 1 (Cards & Data Tables):** Pure `#FFFFFF` surface accompanied by a hairline border `1px solid #E2E8F0` and an ultra-diffused, ambient shadow: `0 1px 3px 0 rgba(15, 23, 42, 0.04), 0 1px 2px -1px rgba(15, 23, 42, 0.02)`.
- **Level 2 (Interactive Floating Cards & Dropdowns):** Subtle lift on hover or active flyouts: `0 10px 15px -3px rgba(15, 23, 42, 0.06), 0 4px 6px -4px rgba(15, 23, 42, 0.03)` with `border-color: #CBD5E1`.
- **Level 3 (Modals, Step Drawers & Dialogs):** Centered popups and confirmation dialogues: `0 20px 25px -5px rgba(15, 23, 42, 0.1), 0 8px 10px -6px rgba(15, 23, 42, 0.05)` layered over a translucent backdrop blur (`rgba(15, 23, 42, 0.4)` with `backdrop-filter: blur(4px)`).

## Shapes

The design system maintains a **Rounded (Level 2)** shape identity that balances friendly healthcare ergonomics with structural software rigor:
- **Cards, Panels & Table Containers:** `16px` (`1rem`, `rounded-2xl`) on outer corners, creating a modern, floating, soft-panel appearance.
- **Inputs, Filter Controls & Standard Buttons:** `10px` to `12px` (`0.625rem` to `0.75rem`) for a comfortable, tap-friendly ergonomic feel.
- **Status Badges, Step Number Badges & Time Slot Chips:** Fully pill-shaped (`9999px`) to emphasize their transient, tag-like nature.

## Components

### Buttons
- **Primary:** Background `#0284C7`, text `#FFFFFF`, font-weight 600, height 42px, padding `0 20px`, border-radius 10px. Hover: `#0369A1` with subtle translation (`transform: translateY(-0.5px)`). Focus: `box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.25)`.
- **Secondary / Ghost:** White background `#FFFFFF`, border `1px solid #E2E8F0`, text `#0F172A`. Hover: background `#F8FAFC`, border `#CBD5E1`.
- **Destructive:** Rose red `#E11D48` background for delete/deactivation confirms.

### Navigation & Sidebar Active Indicator
- Sidebar nav items have an 8px border-radius, 40px height, and 12px horizontal padding.
- **Active State:** Background `#E0F2FE`, text color `#0369A1`, font weight 600, accented by a 3px vertical pill bar along the left edge in `#0284C7`.

### Status Badges & Chips
- Heights fixed to 24px, pill-radius (`rounded-full`), padding `2px 10px`, font size 12px, font-weight 600.
- `Scheduled`: `#E0F2FE` background with `#0369A1` text.
- `Completed`: `#D1FAE5` background with `#047857` text.
- `Cancelled` / `Allergy Flag`: `#FFE4E6` background with `#BE123C` text.
- **Time Slot Chips (Booking Flow):** Unselected: `#F8FAFC` with `#E2E8F0` border. Selected: `#0284C7` background with `#FFFFFF` text.

### Tables & Data Grids
- Wrapped inside Level 1 cards with zero margin bleed.
- Table headers: `#F8FAFC` background, uppercase 11px Inter, weight 700, tracking 0.05em, text `#64748B`, height 44px, bottom border `1px solid #E2E8F0`.
- Rows: 56px height, alternating row transitions on hover (`#F8FAFC`), cell border `1px solid #F1F5F9`.

### Form Fields & Inputs
- Height 42px, background `#FFFFFF`, border `1px solid #CBD5E1`, border-radius 10px, padding `0 14px`, text `#0F172A`.
- Placeholder: `#94A3B8`.
- Focus: border `#0284C7`, ring `3px rgba(2, 132, 199, 0.15)`.
- Error state: border `#E11D48`, helper text in `#E11D48` with icon.

### Step Indicator Badges (Registration & Booking Flows)
- 28px circular indicator with centered number.
- Active / Completed step: `#0284C7` background with `#FFFFFF` text.
- Upcoming step: `#F1F5F9` background with `#64748B` text and hairline border `#E2E8F0`.