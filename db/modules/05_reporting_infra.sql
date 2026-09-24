-- Module 05: audit, RLS, and cross-module protection.
\i db/modules/ashen/01_audit_log.sql
\i db/modules/ashen/02_fn_audit_trigger.sql
\i db/modules/ashen/03_rls_policies.sql
\i db/modules/ashen/04_audit_triggers.sql
\i db/modules/ashen/05_reporting_views.sql

-- Patients and catalogue entries are deactivated, never hard-deleted.
CREATE TRIGGER trg_block_delete_patient
    BEFORE DELETE ON patient
    FOR EACH ROW EXECUTE FUNCTION fn_block_hard_delete();

CREATE TRIGGER trg_block_delete_treatment_catalogue
    BEFORE DELETE ON treatment_catalogue
    FOR EACH ROW EXECUTE FUNCTION fn_block_hard_delete();

-- Operational grants for the application and reporting roles.
GRANT SELECT, INSERT, UPDATE ON
    doctor, specialty, doctor_specialty, doctor_availability_slots,
    patient, allergy, patient_allergy, admission, treatment_catalogue,
    appointments, consultations, consultation_treatments,
    insurance_policy_details, patient_insurance, policy_treatment_coverage,
    invoices, payments
    TO catms_app;

GRANT SELECT ON
    doctor, specialty, doctor_specialty, doctor_availability_slots,
    patient, allergy, patient_allergy, admission, treatment_catalogue,
    appointments, consultations, consultation_treatments,
    insurance_policy_details, patient_insurance, policy_treatment_coverage,
    invoices, payments
    TO catms_readonly;

GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO catms_admin;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO catms_app, catms_readonly, catms_admin;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO catms_app, catms_admin;

-- Reporting projections. Date and branch filters remain parameterized in the API queries.
