-- ============================================================================
-- Function: fn_reschedule_appointment
-- Description: Moves an existing scheduled appointment to a new open slot,
--              re-opening the previous slot and booking the new one.
-- Owner: Kalana Jayawardena
-- ============================================================================

CREATE OR REPLACE FUNCTION fn_reschedule_appointment(
    p_appointment_id INT,
    p_new_slot_id    INT
) RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_old_slot_id INT;
    v_status appointment_status_enum;
    v_new_slot_status slot_status_enum;
BEGIN
    SELECT slot_id, status INTO v_old_slot_id, v_status
    FROM appointments WHERE appointment_id = p_appointment_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'appointment % does not exist', p_appointment_id USING ERRCODE = 'P0002';
    END IF;

    IF v_status <> 'Scheduled' THEN
        RAISE EXCEPTION 'only a Scheduled appointment can be rescheduled (current status: %)', v_status
            USING ERRCODE = '22000';
    END IF;

    SELECT status INTO v_new_slot_status
    FROM doctor_availability_slots WHERE slot_id = p_new_slot_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'the selected new slot does not exist' 
            USING ERRCODE = 'P0002';
    END IF;

    IF v_new_slot_status <> 'Open' THEN
        RAISE EXCEPTION 'the selected new slot is no longer available' USING ERRCODE = '23505';
    END IF;

    UPDATE doctor_availability_slots SET status = 'Open' WHERE slot_id = v_old_slot_id;
    UPDATE doctor_availability_slots SET status = 'Booked' WHERE slot_id = p_new_slot_id;
    UPDATE appointments SET slot_id = p_new_slot_id WHERE appointment_id = p_appointment_id;
END;
$$;
