-- MedSync CATMS complete PostgreSQL schema.
-- Apply with psql from the repository root: psql "$DATABASE_URL" -f db/schema.sql
CREATE EXTENSION IF NOT EXISTS btree_gist;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

\i db/modules/01_auth_branch_staff.sql
\i db/modules/02_doctor_appointment.sql
\i db/modules/03_patient_consultation.sql
\i db/modules/04_billing_insurance.sql
\i db/modules/05_reporting_infra.sql
