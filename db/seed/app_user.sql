DO $$
DECLARE
    v_patient_role_id INT;
    v_index INT;
BEGIN
    SELECT role_id INTO v_patient_role_id
    FROM role
    WHERE role_name = 'Patient';

    IF v_patient_role_id IS NULL THEN
        RAISE EXCEPTION 'Patient seed requires the Patient role';
    END IF;

    FOR v_index IN 1..35 LOOP
        INSERT INTO app_user (
            role_id, first_name, middle_name, last_name, id_number,
            address, birthdate, gender, email
        )
        SELECT
            v_patient_role_id,
            'Patient' || v_index,
            NULL,
            'Seed',
            lpad((900000000000 + v_index)::text, 12, '0'),
            'Seed address ' || v_index,
            CURRENT_DATE - ((20 + (v_index % 45)) * INTERVAL '1 year'),
            CASE v_index % 3
                WHEN 0 THEN 'Male'::gender_enum
                WHEN 1 THEN 'Female'::gender_enum
                ELSE 'Other'::gender_enum
            END,
            'patient' || v_index || '@example.test'
        WHERE NOT EXISTS (
            SELECT 1 FROM app_user
            WHERE email = 'patient' || v_index || '@example.test'
        );
    END LOOP;
END;
$$;