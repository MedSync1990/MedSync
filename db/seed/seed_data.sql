-- Complete MedSync seed set. Apply after db/schema.sql from the repository root.
\set ON_ERROR_STOP on
\ir 01_roles.sql
\ir 02_branches.sql
\ir 03_users.sql
\ir 04_contacts.sql
\ir 05_staff.sql
\ir 06_specialties.sql
\ir 07_doctors.sql
\ir 08_doctor_specialities.sql
\ir 09_patients.sql
\ir 10_allergies.sql
\ir 11_patient_allergies.sql
\ir 12_admissions.sql
\ir 13_treatments.sql
\ir 14_slots.sql
\ir 15_appointments.sql
\ir 16_consultations.sql
\ir 17_consultation_treatments.sql
\ir 18_insurance_policies.sql
\ir 19_patient_insurance.sql
\ir 20_policy_coverage.sql
\ir 21_invoices.sql
\ir 22_payments.sql
\ir 23_audit_log.sql
