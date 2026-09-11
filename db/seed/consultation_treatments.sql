DO $$
DECLARE
    v_consultation_id INT;
    v_treatment_code INT;
BEGIN
    SELECT treatment_code
    INTO v_treatment_code
    FROM treatment_catalogue
    WHERE is_active
    ORDER BY treatment_code
    LIMIT 1;

    IF v_treatment_code IS NULL THEN
        RETURN;
    END IF;

    FOR v_consultation_id IN
        SELECT c.consultation_id
        FROM consultations c
        WHERE NOT EXISTS (
            SELECT 1
            FROM consultation_treatments ct
            WHERE ct.consultation_id = c.consultation_id
        )
    LOOP
        INSERT INTO consultation_treatments (
            consultation_id, treatment_code, quantity, unit_price
        )
        SELECT v_consultation_id, treatment_code, 1, price
        FROM treatment_catalogue
        WHERE treatment_code = v_treatment_code;
    END LOOP;
END;
$$;