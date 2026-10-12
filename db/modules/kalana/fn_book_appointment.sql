-- ============================================================================
-- Function: fn_book_appointment
-- Description: Books an appointment against an open slot, locking the slot row
--              to prevent race conditions.
-- Owner: Kalana Jayawardena
-- ============================================================================

CREATE OR REPLACE FUNCTION fn_book_appointment(
    p_patient_id  INT,
    p_slot_id     INT,
    p_appt_type   appointment_type_enum
) RETURNS INT
LANGUAGE plpgsql
SECURITY INVOKER  -- executes using the privileges of the user calling it
SET search_path = public, pg_temp   -- security against search path hijacking
AS $$
DECLARE
    -- temporary variables
    v_status slot_status_enum;
    v_date DATE;
    v_is_active BOOLEAN;
    v_appointment_id INT;
BEGIN
    -- Lock the slot row so two concurrent bookings can't both pass the status check.
    SELECT das.status, das.date, s.is_active
    INTO v_status, v_date, v_is_active
    FROM doctor_availability_slots das
    JOIN staff s ON das.doctor_id = s.user_id
    WHERE das.slot_id = p_slot_id
    FOR UPDATE OF das;  -- places row level write lock to prevent race conditions

    -- if sql statement returned zero rows
    IF NOT FOUND THEN
        RAISE EXCEPTION 'slot % does not exist', p_slot_id USING ERRCODE = 'P0002'; -- no_data_found err code
    END IF;

    IF NOT v_is_active THEN
        RAISE EXCEPTION 'cannot book appointment with a deactivated doctor' USING ERRCODE = '22000';
    END IF;

    IF v_date < CURRENT_DATE THEN
        RAISE EXCEPTION 'cannot book appointment for past date %', v_date USING ERRCODE = '22000';
    END IF;

    IF v_status <> 'Open' THEN
        RAISE EXCEPTION 'slot % is no longer available', p_slot_id USING ERRCODE = '23505'; -- unique_violation
    END IF;

    UPDATE doctor_availability_slots SET status = 'Booked' WHERE slot_id = p_slot_id;

    INSERT INTO appointments (patient_id, slot_id, appointment_type, status)
    VALUES (p_patient_id, p_slot_id, p_appt_type, 'Scheduled')
    RETURNING appointment_id INTO v_appointment_id;

    RETURN v_appointment_id;
END;
$$;
