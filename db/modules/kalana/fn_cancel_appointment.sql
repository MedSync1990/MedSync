-- ============================================================================
-- Function: fn_cancel_appointment
-- Description: Cancels a scheduled appointment and reopens the corresponding slot.
-- Owner: Kalana Jayawardena
-- ============================================================================

CREATE OR REPLACE FUNCTION fn_cancel_appointment(p_appointment_id INT) RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_slot_id INT;
    v_status appointment_status_enum;
BEGIN
    SELECT slot_id, status INTO v_slot_id, v_status
    FROM appointments WHERE appointment_id = p_appointment_id
    FOR UPDATE;  -- lock appointment row

    IF NOT FOUND THEN
        RAISE EXCEPTION 'appointment % does not exist', p_appointment_id USING ERRCODE = 'P0002';
    END IF;

    IF v_status <> 'Scheduled' THEN
        RAISE EXCEPTION 'only a Scheduled appointment can be cancelled (current status: %)', v_status
            USING ERRCODE = '22000'; -- data_exception
    END IF;

    UPDATE appointments SET status = 'Cancelled' WHERE appointment_id = p_appointment_id;
    UPDATE doctor_availability_slots SET status = 'Open' WHERE slot_id = v_slot_id;
END;
$$;
