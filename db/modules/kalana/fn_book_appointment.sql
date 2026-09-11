-- ============================================================================
-- Function: fn_book_appointment
-- Module: 02 - Doctor & Appointment Management
-- Owner: Kalana Jayawardena
-- Description: Books an appointment against an open slot, locking the slot row
--              to prevent race conditions.
-- Reference: docs/database.md §7.1 (FR-AM-01/02/03/09)
-- ============================================================================

CREATE OR REPLACE FUNCTION fn_book_appointment(
    p_patient_id  INT,
    p_slot_id     INT,
    p_appt_type   appointment_type_enum
) RETURNS INT
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_status slot_status_enum;
    v_appointment_id INT;
BEGIN
    -- Lock the slot row so two concurrent bookings can't both pass the status check.
    SELECT status INTO v_status
    FROM doctor_availability_slots
    WHERE slot_id = p_slot_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'slot % does not exist', p_slot_id USING ERRCODE = 'P0002';
    END IF;

    IF v_status <> 'Open' THEN
        RAISE EXCEPTION 'slot % is no longer available', p_slot_id USING ERRCODE = '23505';
    END IF;

    UPDATE doctor_availability_slots SET status = 'Booked' WHERE slot_id = p_slot_id;

    INSERT INTO appointments (patient_id, slot_id, appointment_type, status)
    VALUES (p_patient_id, p_slot_id, p_appt_type, 'Scheduled')
    RETURNING appointment_id INTO v_appointment_id;

    RETURN v_appointment_id;
END;
$$;
