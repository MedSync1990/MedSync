-- Atomic consultation completion and invoice creation.
CREATE OR REPLACE FUNCTION fn_complete_appointment(
    p_appointment_id INT,
    p_diagnosis VARCHAR(255),
    p_notes TEXT,
    p_treatments JSONB
) RETURNS INT
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_status appointment_status_enum;
    v_patient_id INT;
    v_consultation_id INT;
    v_invoice_id INT;
    v_total DECIMAL(10,2);
    v_insurance_amount DECIMAL(10,2);
    v_item JSONB;
    v_code INT;
    v_quantity INT;
    v_price DECIMAL(10,2);
    v_is_active BOOLEAN;
BEGIN
    IF p_notes IS NULL OR btrim(p_notes) = '' THEN
        RAISE EXCEPTION 'consultation notes are required before completing this appointment'
            USING ERRCODE = '23514';
    END IF;

    SELECT status, patient_id
    INTO v_status, v_patient_id
    FROM appointments
    WHERE appointment_id = p_appointment_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'appointment % does not exist', p_appointment_id USING ERRCODE = 'P0002';
    END IF;

    IF v_status <> 'Scheduled' THEN
        RAISE EXCEPTION 'only a Scheduled appointment can be completed (current status: %)', v_status
            USING ERRCODE = '23514';
    END IF;

    UPDATE appointments
    SET status = 'Completed'
    WHERE appointment_id = p_appointment_id;

    INSERT INTO consultations (appointment_id, diagnosis, consultation_notes)
    VALUES (p_appointment_id, p_diagnosis, p_notes)
    RETURNING consultation_id INTO v_consultation_id;

    FOR v_item IN SELECT value FROM jsonb_array_elements(COALESCE(p_treatments, '[]'::jsonb)) LOOP
        v_code := (v_item ->> 'treatment_code')::INT;
        v_quantity := COALESCE((v_item ->> 'quantity')::INT, 1);

        IF v_quantity < 1 THEN
            RAISE EXCEPTION 'treatment quantity must be at least 1' USING ERRCODE = '23514';
        END IF;

        SELECT price, is_active
        INTO v_price, v_is_active
        FROM treatment_catalogue
        WHERE treatment_code = v_code
        FOR UPDATE;

        IF NOT FOUND OR NOT v_is_active THEN
            RAISE EXCEPTION 'treatment code % is not a valid active catalogue entry', v_code
                USING ERRCODE = '23514';
        END IF;

        INSERT INTO consultation_treatments (consultation_id, treatment_code, quantity, unit_price)
        VALUES (v_consultation_id, v_code, v_quantity, v_price);
    END LOOP;

    v_total := fn_calculate_invoice_total(v_consultation_id);
    v_insurance_amount := fn_calculate_insurance_coverage(v_patient_id, v_consultation_id);

    INSERT INTO invoices (consultation_id, appointment_id, total_amount, insurance_amount, status)
    VALUES (v_consultation_id, p_appointment_id, v_total, v_insurance_amount, CASE WHEN v_insurance_amount >= v_total THEN 'Paid' ELSE 'Unpaid' END::invoice_status_enum)
    RETURNING invoice_id INTO v_invoice_id;

    RETURN v_invoice_id;
END;
$$;
