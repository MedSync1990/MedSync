# MedSync CATMS — Branch Manager & Administrator Sidebar Navigation

Companion reference to `medsync-ui-guidelines.md` §1 (Layout skeleton) and §1.1 (Region
separation). Both sidebars below follow the same rules as the Receptionist sidebar already built:

- Dark navy fill (`#0F172A`), not white.
- `Dashboard` sits alone above the grouped sections — it's the landing page, not part of a group.
- Sections are grouped under uppercase, white/40%-opacity labels — never a flat list.
- `Settings` and `Help Center` are grouped under **System**; `Logout` is pinned at the very bottom,
  visually separate, in rose/red — even against the dark fill.
- Active item: `bg-white/10`, white text, teal-light (`#38BDF8`) icon + left accent bar.
- Every item carries a `data-path` for route wiring and active-state highlighting.

---

## Branch Manager sidebar

Scope: everything here is **branch-locked** — Branch Manager never sees another branch's data,
and the reports below render with no branch selector (server forces `branch` to the BM's own).

| Section | Item | `data-path` | Icon |
|---|---|---|---|
| *(standalone)* | Dashboard | `dashboard` | `dashboard` |
| **Reports** | Branch Appointments | `report-branch-appointments` | `event_note` |
| | Doctor Revenue | `report-doctor-revenue` | `monitoring` |
| | Outstanding Balances | `report-outstanding-balances` | `account_balance_wallet` |
| | Treatment Breakdown | `report-treatment-breakdown` | `pie_chart` |
| | Insurance vs. Cash | `report-insurance-vs-cash` | `health_and_safety` |
| **Management** | Manage Staff | `manage-staff` | `badge` |
| | Doctors & Specialties | `doctors-specialties` | `stethoscope` |
| | Patients | `patients` | `contact_page` |
| | Treatment Catalogue | `treatment-catalogue` | `medical_services` |
| **System** | Settings | `settings` | `settings` |
| | Help Center | `help-center` | `help` |
| *(pinned bottom)* | Logout | `logout` | `logout` |

**What Branch Manager does *not* get** (see `medsync-what-is-left.md` for the full route-level
detail): no Branch Management item — BM can't create, edit, or deactivate branches, only view
their own (`GET /branches/{id}`) from inside Dashboard/context, not a dedicated nav item. No
Specialties *catalogue* creation — "Doctors & Specialties" here means assigning existing
specialties to doctors, not adding new specialty types.

---

## Administrator sidebar

Scope: unrestricted — every report renders **with** a branch selector (the only role that gets
one), and Administrator gets one extra Management item Branch Manager doesn't: **Branch
Management** itself.

| Section | Item | `data-path` | Icon |
|---|---|---|---|
| *(standalone)* | Dashboard | `dashboard` | `dashboard` |
| **Reports** | Branch Appointments | `report-branch-appointments` | `event_note` |
| | Doctor Revenue | `report-doctor-revenue` | `monitoring` |
| | Outstanding Balances | `report-outstanding-balances` | `account_balance_wallet` |
| | Treatment Breakdown | `report-treatment-breakdown` | `pie_chart` |
| | Insurance vs. Cash | `report-insurance-vs-cash` | `health_and_safety` |
| **Management** | Branch Management | `branch-management` | `apartment` |
| | Manage Staff | `manage-staff` | `badge` |
| | Doctors & Specialties | `doctors-specialties` | `stethoscope` |
| | Patients | `patients` | `contact_page` |
| | Treatment Catalogue | `treatment-catalogue` | `medical_services` |
| **System** | Settings | `settings` | `settings` |
| | Help Center | `help-center` | `help` |
| *(pinned bottom)* | Logout | `logout` | `logout` |

**Admin-only inside shared pages** (same page component as Branch Manager's, different
permissions — not a separate UI):
- **Branch Management** is the one page BM never sees at all — create/edit/deactivate branches.
- On **Doctors & Specialties**, Admin can create new specialty *types* (`POST /specialties`); BM
  can only assign existing specialties to a doctor.
- On **Manage Staff**, Admin can create/edit Administrator and Branch Manager accounts; BM is
  rejected (`403`) if it tries.
- Every **Report** renders a branch selector for Admin; the same report page renders without one
  for BM.

---

## Shared component note

Because Branch Manager and Administrator share almost the entire Management section (Manage
Staff, Doctors & Specialties, Patients, Treatment Catalogue) and all five Report pages, **build
these as one component each**, gated by role and branch-scope at the data layer — not as two
parallel page implementations. Only `Branch Management` and the two Admin-only actions above
need role-specific UI at all; everything else is the same page with a narrower dataset for BM.