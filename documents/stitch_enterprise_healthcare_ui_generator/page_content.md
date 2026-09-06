# MedSync CATMS — Page Content

Source of truth for what appears on every screen: sidebar items, top bar, page copy, form
fields, table columns, buttons, and empty/error/success states. If it's not written here, don't
invent it in the frontend — extend this file in the same PR instead (see `AGENTS.md` §3).

Layout rules (sidebar structure, card/button/table conventions, states) are defined once in
`docs/ui-guidelines.md` — this file is the **content**, not the layout system.

Four roles exist: **Admin**, **Branch Manager**, **Doctor**, **Receptionist**. There is no
Patient role or patient login — see §5 for how patients interact with the system. Each staff
role gets its own sidebar and page set below.

---

## 0. Shared across every role

### Top bar (all authenticated pages)
- Left: sidebar collapse toggle, breadcrumbs (only on pages nested more than one level deep).
- Right, left to right: notifications bell, theme toggle, branch/location indicator (current
  branch name), greeting **"Good morning/afternoon/evening, {first name}"** with a subtitle of
  **{role} · {branch}**, avatar (opens Profile / Settings / Logout menu).

### Global microcopy (used on any page)
- Session timeout: **"Your session has expired. Please log in again."**
- Access denied: **"You don't have permission to view this page."**
- Generic save error: **"Something went wrong while saving. Please try again."**
- Generic load error: **"Couldn't load this page. [Retry]"**
- Generic delete/deactivate confirm: **"This action can't be undone. Are you sure?"**
- Field required: **"This field is required."**

### Sidebar footer (identical for every role)
```
Settings
Help Center
Logout
```

---

## 1. Receptionist

### Sidebar
```
MedSync — Healthcare System
  Dashboard

PATIENTS
  Register Patient
  Patient Directory

APPOINTMENTS
  Book Appointment
  Manage Appointments

BILLING & PAYMENTS
  Invoices
  Collect Payment
```

### 1.1 Dashboard
- Heading: **"Good morning/afternoon/evening, {first name}"** — sub: **"{Branch name} ·
  Receptionist"**.
- Widget 1 — Today's Appointments: counts by status (Scheduled / Completed / Cancelled) as
  three stat tiles.
- Widget 2 — Quick Actions: **"Book Appointment"** (primary, teal), **"Register Patient"**
  (secondary).
- Widget 3 — Recent Activity feed: last ~10 actions ("Appointment booked for {patient} with
  Dr. {name}", "Payment of {amount} recorded against Invoice #{id}", etc.), newest first.
- Empty state (no appointments today): **"No appointments scheduled for today."**

### 1.2 Register Patient
- Heading: **"Register Patient"** — sub: **"Add a new patient record accessible from any
  branch."**
- Section 1 — Personal Details (numbered badge 1): Full Name*, Date of Birth*, Gender*
  (Male/Female/Other), Address*, Phone Number*, Email (optional), NIC*.
- Section 2 — Emergency Contact (badge 2): Contact Name*, Relationship*, Phone Number*.
- Section 3 — Health Insurance (badge 3, optional): toggle **"Add insurance details now"** —
  if on: Insurance Provider (dropdown), Policy Number, Policy Start/End Date. If off: helper
  text **"Add insurance details now, or add them later from the patient's profile."**
- Validation copy:
  - NIC: **"Enter a valid NIC (9 digits + letter, or 12 digits)."**
  - Phone: **"Enter a 10-digit phone number."**
  - Email (if filled): **"Enter a valid email address."**
- Primary button: **"Register Patient"**. Secondary: **"Cancel"**.
- Success toast: **"Patient registered successfully — ID {PT-xxxxxx}."**

### 1.3 Patient Directory
- Heading: **"Patient Directory"** — sub: **"Search and manage patient records across all
  branches."**
- Search field: icon-left, placeholder **"Search by NIC, name, or contact number."**
- Table columns: Patient ID, Name, NIC, Phone, Registered Branch, Insurance (Yes/No pill).
- Row actions: **View Profile**, **Edit**, **Book Appointment**.
- Empty state: **"No patients found. Try a different search, or register a new patient."**
- Loading state: skeleton rows (5 placeholder rows).

### 1.4 Book Appointment (reference screenshot flow)
- Heading: **"Book an Appointment"** — sub: **"Schedule a consultation with an available
  doctor."**
- **Step 1 — Find Patient** (badge 1): NIC/name search field + **"Register New Patient"**
  shortcut link; once selected, a patient card shows Name, ID, DOB/Age, Gender, Phone, with a
  **"Change Patient"** link.
- **Step 2 — Select Appointment Category** (badge 2): dropdown — Doctor Consultation, Walk-in,
  Follow-up.
- **Step 3 — Select Specialty** (badge 3): dropdown of specialties; filters the doctor list in
  the next step.
- **Step 4 — Select Doctor & Slot** (badge 4): doctor cards (photo placeholder, name,
  specialty, branch) each showing a row of next-available time chips; clicking a chip selects
  that slot.
- **Step 5 — Confirm** (badge 5): summary card (patient, doctor, specialty, date/time, branch)
  + primary button **"Book Appointment"**.
- Success toast: **"Appointment booked for {patient} with Dr. {name} on {date, time}."**
- Conflict error (409 from overlap check): **"This doctor is no longer available at the
  selected time. Please choose another slot."**

### 1.5 Manage Appointments
- Heading: **"Manage Appointments"** — sub: **"View, reschedule, or cancel scheduled
  appointments."**
- Filter bar: Branch, Date, Status (Scheduled/Completed/Cancelled), Doctor.
- **"Create Walk-in"** button, top right (secondary color, opens the walk-in flow — same steps
  as Book Appointment, minus prior-slot selection).
- Table columns: Patient, Doctor, Specialty, Date/Time, Status (colored pill), Branch.
- Row actions: **Reschedule** (reopens Step 4/5 of the booking flow), **Cancel** (confirmation
  dialog: **"Cancel this appointment? This can't be undone."**), **View Details**.
- Empty state: **"No appointments match these filters."**

### 1.6 Invoices
- Heading: **"Invoices"** — sub: **"Generated invoices for completed consultations and
  treatments."**
- Table columns: Invoice #, Patient, Date, Total, Insurance Covered, Payable, Status
  (Paid/Partially Paid/Unpaid pill).
- Detail view (on row click): itemised treatment lines (name, code, price), insurance coverage
  breakdown (covered vs. payable), payment history table (date, amount, method) for that
  invoice.

### 1.7 Collect Payment
- Heading: **"Collect Payment"** — sub: **"Record a full or partial payment against an
  invoice."**
- Fields: Invoice lookup (search by invoice # or patient), Outstanding Balance (read-only,
  large/prominent), Amount Received*, Payment Type* (Cash / Card / Insurance Settlement).
- Validation copy: **"Amount cannot exceed the outstanding balance of {amount}."**
- Primary button: **"Record Payment"** — behind confirmation dialog per `ui-guidelines.md` §2.
- Success toast: **"Payment recorded. Remaining balance: {amount}."** or, if balance hits zero,
  **"Invoice fully paid."**

---

## 2. Doctor

### Sidebar
```
MedSync — Healthcare System
  Dashboard

MY WORK
  My Schedule
  Consultation

EARNINGS
  My Earnings

REFERENCE
  Treatment Catalogue (view-only)
```

### 2.1 Dashboard
- Heading: **"Good morning/afternoon/evening, Dr. {last name}"** — sub: **"{Branch name} ·
  Doctor · {Specialty}"**.
- Widget 1 — Today's Appointments: count of Scheduled / Completed for the day.
- Widget 2 — Quick Action: **"Start Consultation"** on the current/next patient, if one is
  waiting.
- Widget 3 — This Month's Earnings: total revenue tile + **"View My Earnings"** link to §2.5.
- Widget 4 — Recent Activity: last consultations completed today.

### 2.2 My Schedule
- Heading: **"My Schedule"** — sub: **"Today's appointments."**
- Date picker (defaults to today) to look at other days (read-only for past/future; only
  today's row gets the action button).
- Table columns: Time, Patient, Category (Consultation/Follow-up/Walk-in), Status.
- Row action on the current Scheduled appointment: **"Start Consultation"** — opens 2.3 for
  that appointment.
- Empty state: **"No appointments scheduled for today."**

### 2.3 Consultation
- Heading: **"Consultation — {patient name}"** — sub: patient ID, age/gender, allergy flags
  shown as red pills if present (e.g. **"Allergy: Penicillin"**).
- Section — Notes & Diagnosis (badge 1): Notes textarea*, Diagnosis field.
- Section — Treatments (badge 2): multi-select picker from the Treatment Catalogue, each item
  showing name, code, price; selected items list with a quantity stepper and a running
  subtotal.
- Primary button: **"Complete Appointment"** — disabled until notes are saved. Disabled-state
  helper text (FR-CTM-07): **"Add consultation notes before completing this appointment."**
- Success toast: **"Appointment completed. Invoice generated."**

### 2.4 Treatment Catalogue (view-only)
- Heading: **"Treatment Catalogue"** — sub: **"Reference list of available treatments and
  prices."**
- Table columns: Code, Name, Category, Price, Insurance-Eligible (Yes/No pill).
- No add/edit affordances for this role (Admin-only, see 3.5).

### 2.5 My Earnings
- Heading: **"My Earnings"** — sub: **"Revenue generated from your completed appointments and
  payments received against them."**
- Filter bar: Date range (defaults to current month), Branch (only shown if the doctor works
  across more than one branch).
- Summary tiles (top of page): **Total Revenue** (sum of treatment/consultation charges from
  this doctor's completed appointments in range), **Collected** (portion actually paid by
  patients/insurance so far), **Outstanding** (billed but not yet paid).
- Chart: revenue by day/week across the selected range (line or bar, matches
  `docs/ui-guidelines.md` §2 table/chart conventions).
- Table columns: Date, Patient, Invoice #, Treatments (count), Total Billed, Insurance Covered,
  Paid, Status (Paid/Partially Paid/Unpaid pill).
- Row action: **View Invoice** — opens the same read-only invoice detail view used elsewhere
  (§1.6: itemised lines, insurance breakdown, payment history) — no payment-entry affordance
  for this role, matching the Doctor's read-only billing access.
- Empty state: **"No completed appointments in this date range."**
- This page reads from the same data as the Admin/Branch Manager **Doctor Revenue** report
  (§3.2), scoped to `doctor_id = current user` — no separate calculation, just a filtered view.

---

## 3. Admin

### Sidebar
```
MedSync — Healthcare System
  Dashboard

REPORTS
  Branch Appointment Summary
  Doctor Revenue
  Outstanding Balances
  Treatment Category Breakdown
  Insurance vs. Out-of-Pocket

MANAGEMENT
  Manage Branches
  Manage Staff & Users
  Manage Doctors & Specialties
  Manage Treatment Catalogue
```

### 3.1 Dashboard
- Heading: **"Good morning/afternoon/evening, {first name}"** — sub: **"Administrator ·
  All Branches"**.
- Widget 1 — System-wide snapshot: total active patients, doctors, staff, and branches (four
  stat tiles).
- Widget 2 — Today across all branches: appointments by status, rolled up.
- Widget 3 — Quick Actions: **"Manage Staff & Users"**, **"Manage Branches"**.

### 3.2 Reports (five pages, shared pattern)
Each report page:
- Heading: **"{Report Name}"** — sub explains the required filter, e.g. **"Filter by branch and
  date to see appointment counts."**
- Filter bar (per report — branch/date range as applicable), **"Apply Filters"** button.
- Body: table and/or chart of results.
- Empty state (FR-RA-06, no exceptions): **"No data available for the selected criteria."**

| Report | Heading | Sub | Columns / chart |
|---|---|---|---|
| Branch Appointment Summary | "Branch Appointment Summary" | "Scheduled, completed, and cancelled appointments by branch and day." | Branch, Date, Scheduled, Completed, Cancelled |
| Doctor Revenue | "Doctor Revenue" | "Revenue generated per doctor over a date range." | Doctor, Specialty, Branch, Appointments Completed, Revenue |
| Outstanding Balances | "Outstanding Balances" | "Patients with unpaid or partially paid invoices." | Patient, Invoice #, Total, Paid, Outstanding, Last Payment Date |
| Treatment Category Breakdown | "Treatment Category Breakdown" | "Number of treatments performed per category over a period." | Category, Treatment, Count, % of Total |
| Insurance vs. Out-of-Pocket | "Insurance vs. Out-of-Pocket" | "Coverage split between insurance and patient payments over a period." | Period, Insurance Covered, Out-of-Pocket, % Covered |

### 3.3 Manage Branches
- Heading: **"Manage Branches"** — sub: **"Add or update clinic branch locations."**
- Table columns: Branch Name, Address, Branch Manager, Staff Count, Status (Active/Inactive).
- **"Add Branch"** primary button → form: Name*, Address*, Branch Manager (dropdown of
  eligible staff).
- Row actions: **Edit**, **Deactivate** — confirmation: **"Deactivate {branch name}? Historical
  records are kept."** Deactivation is blocked server-side while staff are still assigned
  (FR-DMI-08); error copy: **"This branch has staff assigned and can't be deactivated. Reassign
  staff first."**

### 3.4 Manage Staff & Users
- Heading: **"Manage Staff & Users"** — sub: **"Register and manage staff accounts across all
  branches."**
- Filter bar: Branch, Role.
- Table columns: Name, Role, Branch, Email/Username, Status (Active/Inactive).
- **"Add Staff"** primary button → form: Name*, NIC*, Phone*, Email*, Role* (Admin / Branch
  Manager / Doctor / Receptionist), Branch*, Specialty (only if Role = Doctor), Temporary
  Password (auto-generated, shown once).
- Row actions: **Edit**, **Deactivate** — confirmation: **"Deactivate {staff name}? Historical
  records are kept."**

### 3.5 Manage Doctors & Specialties
- Heading: **"Manage Doctors & Specialties"** — sub: **"Assign specialties and manage doctor
  availability."**
- Two tabs: **Doctors**, **Specialties**.
- Doctors tab table columns: Name, Branch, Specialties (chips), Status.
- Row action: **"Manage Specialties"** — multi-select of specialties for that doctor.
- Specialties tab table columns: Name, Doctor Count. **"Add Specialty"** button → Name* field.

### 3.6 Manage Treatment Catalogue
- Heading: **"Manage Treatment Catalogue"** — sub: **"Add or update treatments, prices, and
  insurance eligibility."**
- Table columns: Code, Name, Category, Price, Insurance-Eligible (toggle pill), Status.
- **"Add Treatment"** primary button → form: Service Code*, Name*, Category*, Price*,
  Insurance-Eligible (toggle).
- Row actions: **Edit**, **Deactivate** — confirmation: **"Deactivate {treatment name}?
  Historical records are kept."** Soft-delete only when linked to existing records (FR-TCM-05).

---

## 4. Branch Manager

### Sidebar
```
MedSync — Healthcare System
  Dashboard

REPORTS
  Branch Appointment Summary
  Doctor Revenue
  Outstanding Balances
  Treatment Category Breakdown
  Insurance vs. Out-of-Pocket

BRANCH
  Manage Branches (view-only, own branch)
```

- Reports pages: identical content to Admin (§3.2), but filters default to and are locked to
  the manager's own branch — no branch selector shown.
- **Manage Branches** here is read-only: shows the manager's own branch details (name, address,
  staff list) with no Edit/Deactivate affordances.
- Dashboard: same widget pattern as Admin (§3.1) but scoped to **"{Branch name} · Branch
  Manager"** and only that branch's numbers.

---

## 5. Patient access (no login, no portal)

There is **no Patient role, no patient login, and no patient-facing portal** in this system.
Patients never authenticate and never see a MedSync screen. Everything a patient needs happens
through staff, in person or by phone:

- **Booking / rescheduling / cancelling an appointment** — the patient calls or visits a branch;
  the Receptionist does it via **Book Appointment** / **Manage Appointments** (§1.4–1.5).
- **Checking a balance or invoice** — the patient calls or visits a branch; the Receptionist
  looks it up via **Invoices** (§1.6) or **Patients → View Profile** (§1.3) and relays it
  verbally or prints/emails it on request.
- **Making a payment** — the patient pays in person or by phone; the Receptionist records it via
  **Collect Payment** (§1.7). There is no "Pay Now" button anywhere, because there is no patient
  session to attach one to.

If a self-service patient portal is ever added later, it is a separate, explicitly-scoped
feature — not assumed by anything in this document, and it would need its own login flow,
role, and set of pages defined from scratch rather than reusing the staff sidebar pattern.

---

## 6. Copy conventions

- Dates: `{Month} {day}, {year}` in tables and cards (e.g. "Sep 3, 2026"); times as `h:mm AM/PM`.
- Currency: `LKR {amount}` with thousands separators (matches MedSync's Sri Lanka branches).
- IDs: `PT-xxxxxx` (patient), `INV-xxxxxx` (invoice), `APT-xxxxxx` (appointment) — zero-padded
  six digits.
- Every destructive action's confirmation dialog names the specific item being acted on, never
  a generic "this item."
- Every toast is one sentence; put anything longer in the page body, not a toast.