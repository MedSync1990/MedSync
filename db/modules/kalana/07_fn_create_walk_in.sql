-- ============================================================================
-- Function: fn_create_walk_in
-- Module: 02 - Doctor & Appointment Management
-- Owner: Kalana Jayawardena
-- Description: Emergency walk-in booking without prior slot; relies on the
--              excl_slot_overlap constraint to prevent conflicting bookings.
-- Reference: docs/database.md §7.2 (FR-AM-07)
-- ============================================================================

CREATE OR REPLACE FUNCTION fn_create_walk_in(
    p_doctor_id   INT,
    p_patient_id  INT,
    p_date        DATE,
    p_start_time  TIME,
    p_end_time    TIME
) RETURNS INT
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_slot_id INT;
    v_appointment_id INT;
BEGIN
    -- The EXCLUDE constraint (§2.2) rejects this INSERT outright if it overlaps an existing slot
    -- for this doctor — no separate overlap check needed here.
    INSERT INTO doctor_availability_slots (doctor_id, date, start_time, end_time, status)
    VALUES (p_doctor_id, p_date, p_start_time, p_end_time, 'Open')
    RETURNING slot_id INTO v_slot_id;

    v_appointment_id := fn_book_appointment(p_patient_id, v_slot_id, 'Walk-in');
    RETURN v_appointment_id;
EXCEPTION
    WHEN exclusion_violation THEN
        RAISE EXCEPTION 'doctor % is already booked over this time range', p_doctor_id
            USING ERRCODE = '23P01';
END;
$$;
