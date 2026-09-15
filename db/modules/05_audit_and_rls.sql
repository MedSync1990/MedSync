CREATE TABLE audit_log (
    audit_id     BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    table_name   VARCHAR(64) NOT NULL,
    operation    VARCHAR(10) NOT NULL,
    row_pk       VARCHAR(64) NOT NULL,
    changed_by   VARCHAR(64),
    changed_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    old_data     JSONB,
    new_data     JSONB
);
CREATE INDEX idx_audit_table_time ON audit_log(table_name, changed_at);

CREATE OR REPLACE FUNCTION fn_audit_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_pk TEXT;
BEGIN
    v_pk := COALESCE(
        (to_jsonb(COALESCE(NEW, OLD)) ->> TG_ARGV[0]),
        'unknown'
    );
    INSERT INTO audit_log (table_name, operation, row_pk, changed_by, old_data, new_data)
    VALUES (
        TG_TABLE_NAME,
        TG_OP,
        v_pk,
        current_setting('app.current_user_id', true),
        CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END,
        CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END
    );
    RETURN COALESCE(NEW, OLD);
END;
$$;

ALTER TABLE consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultation_treatments ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- (A) Consultations: everyone on staff can read; only the treating doctor can write.
CREATE POLICY consultations_read_all_staff ON consultations
    FOR SELECT
    USING (current_setting('app.current_role', true)
           IN ('Administrator', 'Branch Manager', 'Doctor', 'Receptionist'));

CREATE POLICY consultations_doctor_write_own ON consultations
    FOR INSERT WITH CHECK (
        current_setting('app.current_role', true) = 'Doctor'
        AND EXISTS (
            SELECT 1 FROM appointments a
            JOIN doctor_availability_slots das ON das.slot_id = a.slot_id
            WHERE a.appointment_id = consultations.appointment_id
              AND das.doctor_id = current_setting('app.current_user_id', true)::int
        )
    );

CREATE POLICY consultation_treatments_read_all_staff ON consultation_treatments
    FOR SELECT
    USING (current_setting('app.current_role', true)
           IN ('Administrator', 'Branch Manager', 'Doctor', 'Receptionist'));

CREATE POLICY consultation_treatments_doctor_write_own ON consultation_treatments
    FOR INSERT WITH CHECK (
        current_setting('app.current_role', true) = 'Doctor'
        AND EXISTS (
            SELECT 1 FROM consultations c
            JOIN appointments a ON a.appointment_id = c.appointment_id
            JOIN doctor_availability_slots das ON das.slot_id = a.slot_id
            WHERE c.consultation_id = consultation_treatments.consultation_id
              AND das.doctor_id = current_setting('app.current_user_id', true)::int
        )
    );

-- (B) Appointments: Admin/Receptionist see everything (booking across branches is a stated
-- requirement); a Doctor sees their own; a Branch Manager sees only their branch's.
CREATE POLICY appointments_admin_reception_full ON appointments
    FOR ALL
    USING (current_setting('app.current_role', true) IN ('Administrator', 'Receptionist'))
    WITH CHECK (current_setting('app.current_role', true) IN ('Administrator', 'Receptionist'));

CREATE POLICY appointments_doctor_own ON appointments
    FOR SELECT
    USING (
        current_setting('app.current_role', true) = 'Doctor'
        AND EXISTS (
            SELECT 1 FROM doctor_availability_slots das
            WHERE das.slot_id = appointments.slot_id
              AND das.doctor_id = current_setting('app.current_user_id', true)::int
        )
    );

CREATE POLICY appointments_branch_manager_own_branch ON appointments
    FOR SELECT
    USING (
        current_setting('app.current_role', true) = 'Branch Manager'
        AND EXISTS (
            SELECT 1 FROM doctor_availability_slots das
            JOIN staff s ON s.user_id = das.doctor_id
            WHERE das.slot_id = appointments.slot_id
              AND s.branch_id = current_setting('app.current_branch_id', true)::int
        )
    );

CREATE TRIGGER trg_audit_staff
    AFTER INSERT OR UPDATE OR DELETE ON staff
    FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger('user_id');

CREATE TRIGGER trg_audit_branch
    AFTER INSERT OR UPDATE OR DELETE ON branch
    FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger('branch_id');

CREATE TRIGGER trg_audit_treatment_catalogue
    AFTER INSERT OR UPDATE OR DELETE ON treatment_catalogue
    FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger('treatment_code');

CREATE TRIGGER trg_audit_invoices
    AFTER INSERT OR UPDATE ON invoices
    FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger('invoice_id');

CREATE TRIGGER trg_audit_payments
    AFTER INSERT ON payments
    FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger('payment_id');

CREATE TRIGGER trg_audit_appointments
    AFTER INSERT OR UPDATE ON appointments
    FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger('appointment_id');