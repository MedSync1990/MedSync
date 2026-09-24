-- MedSync CATMS complete PostgreSQL schema.
-- Apply with psql from the repository root: psql "$DATABASE_URL" -f db/schema.sql
CREATE EXTENSION IF NOT EXISTS btree_gist;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

\i db/modules/01_auth_branch_staff.sql
\i db/modules/chenith/patient.sql
\i db/modules/chenith/allergy.sql
\i db/modules/chenith/patient_allergy.sql
\i db/modules/chenith/admission.sql
\i db/modules/chenith/treatment_catalogue.sql
\i db/modules/02_doctor_appointment.sql
\i db/modules/chenith/consultations.sql
\i db/modules/chenith/consultation_treatments.sql
\i db/modules/chenith/consultation_guards.sql
\i db/modules/chenith/fn_complete_appointment.sql
\i db/modules/chenith/fn_deactivate_treatment.sql
\i db/modules/04_billing_insurance.sql
\i db/modules/05_reporting_infra.sql
