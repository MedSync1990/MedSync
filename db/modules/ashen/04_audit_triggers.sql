-- =============================================================================
-- 04_audit_triggers.sql — Audit trigger attachments
-- Module: Audit & RLS (Ashen)
-- =============================================================================
-- Attaches fn_audit_trigger() to every table that requires a change trail.
-- Must be run AFTER all table definitions and fn_audit_trigger() are applied.
-- Pass the primary key column name as the trigger argument.
-- =============================================================================

-- ─── Dilantha's tables ───────────────────────────────────────────────────────

CREATE TRIGGER trg_audit_app_user
    AFTER INSERT OR UPDATE OR DELETE ON app_user
    FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger('user_id');

CREATE TRIGGER trg_audit_staff
    AFTER INSERT OR UPDATE OR DELETE ON staff
    FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger('user_id');

CREATE TRIGGER trg_audit_branch
    AFTER INSERT OR UPDATE OR DELETE ON branch
    FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger('branch_id');

-- ─── Kalana's tables ─────────────────────────────────────────────────────────

CREATE TRIGGER trg_audit_doctor
    AFTER INSERT OR UPDATE OR DELETE ON doctor
    FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger('user_id');

CREATE TRIGGER trg_audit_appointments
    AFTER INSERT OR UPDATE ON appointments
    FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger('appointment_id');

-- ─── Chenith's tables ────────────────────────────────────────────────────────

CREATE TRIGGER trg_audit_patient
    AFTER INSERT OR UPDATE OR DELETE ON patient
    FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger('patient_id');

CREATE TRIGGER trg_audit_consultations
    AFTER INSERT OR UPDATE OR DELETE ON consultations
    FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger('consultation_id');

CREATE TRIGGER trg_audit_admission
    AFTER INSERT OR UPDATE OR DELETE ON admission
    FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger('admission_id');

CREATE TRIGGER trg_audit_treatment_catalogue
    AFTER INSERT OR UPDATE OR DELETE ON treatment_catalogue
    FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger('treatment_code');

-- ─── Shavinda's tables ───────────────────────────────────────────────────────

CREATE TRIGGER trg_audit_patient_insurance
    AFTER INSERT OR UPDATE OR DELETE ON patient_insurance
    FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger('patient_insurance_id');

CREATE TRIGGER trg_audit_invoices
    AFTER INSERT OR UPDATE ON invoices
    FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger('invoice_id');

CREATE TRIGGER trg_audit_payments
    AFTER INSERT ON payments
    FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger('payment_id');
