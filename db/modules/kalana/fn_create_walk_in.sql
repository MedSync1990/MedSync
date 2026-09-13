-- ============================================================================
-- Function: fn_create_walk_in
-- Description: Emergency walk-in booking without prior slot; relies on the
--              excl_slot_overlap constraint to prevent conflicting bookings.
-- Owner: Kalana Jayawardena
-- ============================================================================

-- Note
-- walk-ins can only be created in time periods without any slots
-- If the walk in time period in on an open slot, a normal appointment must be created.


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
    -- The EXCLUDE constraint rejects this INSERT outright if it overlaps an existing slot
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
