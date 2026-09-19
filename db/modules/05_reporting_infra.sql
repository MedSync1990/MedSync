-- Module 05: audit, RLS, and cross-module protection.
\i db/modules/ashen/01_audit_log.sql
\i db/modules/ashen/02_fn_audit_trigger.sql
\i db/modules/ashen/03_rls_policies.sql
\i db/modules/ashen/04_audit_triggers.sql

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
CREATE OR REPLACE VIEW v_branch_appointment_summary AS
SELECT b.branch_id, b.name AS branch_name, das.date,
       COUNT(*) FILTER (WHERE a.status = 'Scheduled') AS scheduled_count,
       COUNT(*) FILTER (WHERE a.status = 'Completed') AS completed_count,
       COUNT(*) FILTER (WHERE a.status = 'Cancelled') AS cancelled_count
FROM appointments a
JOIN doctor_availability_slots das ON das.slot_id = a.slot_id
JOIN staff s ON s.user_id = das.doctor_id
JOIN branch b ON b.branch_id = s.branch_id
GROUP BY b.branch_id, b.name, das.date;

CREATE OR REPLACE VIEW v_doctor_revenue AS
SELECT d.user_id AS doctor_id,
       u.first_name || ' ' || u.last_name AS doctor_name,
       COALESCE(SUM(p.amount_paid), 0)::DECIMAL(10,2) AS revenue_amount
FROM doctor d
JOIN app_user u ON u.user_id = d.user_id
LEFT JOIN doctor_availability_slots das ON das.doctor_id = d.user_id
LEFT JOIN appointments a ON a.slot_id = das.slot_id
LEFT JOIN invoices i ON i.appointment_id = a.appointment_id
LEFT JOIN payments p ON p.invoice_id = i.invoice_id
GROUP BY d.user_id, u.first_name, u.last_name;

CREATE OR REPLACE VIEW v_outstanding_balances AS
SELECT i.invoice_id, i.invoice_code, a.patient_id,
       (i.total_amount - i.insurance_amount - COALESCE(SUM(p.amount_paid), 0))::DECIMAL(10,2)
           AS outstanding_amount
FROM invoices i
JOIN appointments a ON a.appointment_id = i.appointment_id
LEFT JOIN payments p ON p.invoice_id = i.invoice_id
GROUP BY i.invoice_id, i.invoice_code, a.patient_id, i.total_amount, i.insurance_amount
HAVING i.total_amount - i.insurance_amount - COALESCE(SUM(p.amount_paid), 0) > 0;

CREATE OR REPLACE VIEW v_treatment_category_breakdown AS
SELECT tc.category, COUNT(*) AS treatment_line_count,
       SUM(ct.quantity) AS treatment_quantity
FROM consultation_treatments ct
JOIN treatment_catalogue tc ON tc.treatment_code = ct.treatment_code
JOIN consultations c ON c.consultation_id = ct.consultation_id
GROUP BY tc.category;

CREATE OR REPLACE VIEW v_insurance_vs_out_of_pocket AS
SELECT i.invoice_id, i.invoice_code, i.total_amount, i.insurance_amount,
       COALESCE(SUM(p.amount_paid), 0)::DECIMAL(10,2) AS paid_amount,
       (i.total_amount - i.insurance_amount)::DECIMAL(10,2) AS patient_payable_amount
FROM invoices i
LEFT JOIN payments p ON p.invoice_id = i.invoice_id
GROUP BY i.invoice_id, i.invoice_code, i.total_amount, i.insurance_amount;

GRANT SELECT ON v_branch_appointment_summary, v_doctor_revenue,
    v_outstanding_balances, v_treatment_category_breakdown,
    v_insurance_vs_out_of_pocket TO catms_app, catms_readonly, catms_admin;
