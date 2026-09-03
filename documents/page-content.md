# MedSync CATMS — Page Content / Copy

Source of truth for on-screen text per page. Sidebar structure below matches the reference
screenshot (Receptionist view) and extends it for the other four roles per SRS §3.1.

## Sidebar (Receptionist)

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

Settings / Help Center / Logout
```

## Dashboard
- Heading: "Good morning/afternoon/evening, {first name}" + branch subtitle (as in screenshot).
- Widgets: today's appointment count by status, quick "Book Appointment" and "Register Patient"
  buttons, recent activity feed.

## Register Patient
- Heading: "Register Patient" — sub: "Add a new patient record accessible from any branch."
- Sections: Personal Details (name, DOB, gender, address, phone, email), Emergency Contact,
  Health Insurance (optional — "Add insurance details now, or add them later from the patient's
  profile").
- Validation copy: NIC — "Enter a valid NIC (9 digits + letter, or 12 digits)"; phone — "Enter a
  10-digit phone number."
- Success toast: "Patient registered successfully — ID {PT-xxxxxx}."

## Patient Directory
- Heading: "Patient Directory" — sub: "Search and manage patient records across all branches."
- Search placeholder: "Search by NIC, name, or contact number."
- Empty state: "No patients found. Try a different search, or register a new patient."
- Row actions: View Profile, Edit, Book Appointment.

## Book Appointment (reference screenshot)
- Heading: "Book an Appointment" — sub: "Schedule a consultation with an available doctor."
- Step 1 "Find Patient": NIC/name search + "Register New Patient" shortcut; selected-patient
  card shows name, ID, DOB/age, gender, phone, with "Change Patient".
- Step 2 "Select Appointment Category": dropdown — Doctor Consultation, Walk-in, Follow-up.
- Step 3 "Select Specialty": dropdown of specialties, filters the doctor list.
- (continues) Step 4 "Select Doctor & Slot": doctor cards with next available slots.
- Step 5 "Confirm": summary + "Book Appointment" primary button.
- Success toast: "Appointment booked for {patient} with Dr. {name} on {date, time}."
- Conflict error copy: "This doctor is no longer available at the selected time. Please choose
  another slot."

## Manage Appointments
- Heading: "Manage Appointments" — sub: "View, reschedule, or cancel scheduled appointments."
- Filters: branch, date, status, doctor.
- Row actions: Reschedule, Cancel (confirmation: "Cancel this appointment? This can't be
  undone."), View Details.
- "Create Walk-in" button, top right, for emergency registrations.

## Invoices
- Heading: "Invoices" — sub: "Generated invoices for completed consultations and treatments."
- Table columns: Invoice #, Patient, Date, Total, Insurance Covered, Payable, Status.
- Detail view: itemised treatment lines with prices, insurance coverage breakdown, payment
  history for that invoice.

## Collect Payment
- Heading: "Collect Payment" — sub: "Record a full or partial payment against an invoice."
- Fields: invoice lookup, outstanding balance (read-only, prominent), amount received, payment
  type (cash/card/insurance settlement).
- Validation copy: "Amount cannot exceed the outstanding balance of {amount}."
- Success toast: "Payment recorded. Remaining balance: {amount}." or "Invoice fully paid."

## Doctor role — additional pages
- **My Schedule**: today's appointments, "Start Consultation" action on the current patient.
- **Consultation** (on a completed-eligible appointment): notes/diagnosis textarea, treatment
  picker from catalogue (multi-select with price shown), "Complete Appointment" button — disabled
  until notes are saved (FR-CTM-07 copy: "Add consultation notes before completing this
  appointment.").

## Branch Manager / Admin — Reports pages
- Shared heading pattern: "{Report Name}" — sub explains the filter needed (branch/date range).
- Five reports, each with a filter bar + table/chart + "No data available for the selected
  criteria." empty state (FR-RA-06): Branch Appointment Summary, Doctor Revenue, Outstanding
  Balances, Treatment Category Breakdown, Insurance vs. Out-of-Pocket.

## Admin — Management pages
- **Manage Branches**, **Manage Staff & Users**, **Manage Doctors & Specialties**, **Manage
  Treatment Catalogue** — each a standard list + add/edit form + soft-delete confirmation
  ("Deactivate {branch/staff/treatment}? Historical records are kept.").

## Patient portal
- **My Appointments**: upcoming + history, read-only.
- **My Invoices & Balances**: same invoice detail view as staff, read-only, no payment entry.

## Shared microcopy
- Session timeout: "Your session has expired. Please log in again."
- Access denied: "You don't have permission to view this page."
- Generic save error: "Something went wrong while saving. Please try again."
