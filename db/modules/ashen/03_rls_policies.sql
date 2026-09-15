-- =============================================================================
-- 03_rls_policies.sql — Row Level Security policies
-- Module: Audit & RLS (Ashen)
-- =============================================================================
-- Enforces role-based data isolation using PostgreSQL RLS.
-- The backend sets these session variables before executing queries:
--   SET app.current_role = 'Doctor';
--   SET app.current_user_id = '42';
--   SET app.current_branch_id = '3';
-- =============================================================================

ALTER TABLE consultations           ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultation_treatments ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments            ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────────────────────
-- (A) Consultations: all staff can read; only the treating doctor can write
-- ─────────────────────────────────────────────────────────────────────────────

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

-- ─────────────────────────────────────────────────────────────────────────────
-- (B) Consultation treatments: all staff can read; only the treating doctor can write
-- ─────────────────────────────────────────────────────────────────────────────

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

-- ─────────────────────────────────────────────────────────────────────────────
-- (C) Appointments:
--     Admin/Receptionist → full access (cross-branch booking is a requirement)
--     Doctor             → their own appointments only
--     Branch Manager     → their branch only
-- ─────────────────────────────────────────────────────────────────────────────

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
