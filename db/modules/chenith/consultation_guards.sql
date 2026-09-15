-- FR-CTM-06: clinical records may only be inserted after the appointment is completed.
CREATE OR REPLACE FUNCTION fn_guard_consultation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
    v_status appointment_status_enum;
BEGIN
    SELECT status
    INTO v_status
    FROM appointments
    WHERE appointment_id = NEW.appointment_id;

    IF v_status IS DISTINCT FROM 'Completed' THEN
        RAISE EXCEPTION 'consultation notes may only be recorded once the appointment is Completed'
            USING ERRCODE = '23514';
    END IF;

    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION fn_guard_consultation_treatments()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
    v_status appointment_status_enum;
BEGIN
    SELECT a.status
    INTO v_status
    FROM consultations c
    JOIN appointments a ON a.appointment_id = c.appointment_id
    WHERE c.consultation_id = NEW.consultation_id;

    IF v_status IS DISTINCT FROM 'Completed' THEN
        RAISE EXCEPTION 'treatments may only be recorded once the appointment is Completed'
            USING ERRCODE = '23514';
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_guard_consultation
    BEFORE INSERT ON consultations
    FOR EACH ROW EXECUTE FUNCTION fn_guard_consultation();

CREATE TRIGGER trg_guard_consultation_treatments
    BEFORE INSERT ON consultation_treatments
    FOR EACH ROW EXECUTE FUNCTION fn_guard_consultation_treatments();