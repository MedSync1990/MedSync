-- MedSync CATMS - Patient Management and Consultation/Treatment seed data
-- Run after the identity/branch seed and before consultation-dependent billing seed.

INSERT INTO allergy (allergy_code, name) VALUES
    ('ALG-001', 'Penicillin'),
    ('ALG-002', 'Peanuts'),
    ('ALG-003', 'Latex'),
    ('ALG-004', 'Aspirin'),
    ('ALG-005', 'Dust mites');

INSERT INTO treatment_catalogue
    (treatment_name, category, price, is_eligible_for_insurance)
VALUES
    ('General Consultation', 'Consultation', 2500.00, TRUE),
    ('Follow-up Consultation', 'Consultation', 1500.00, TRUE),
    ('Blood Pressure Check', 'Diagnostic', 500.00, FALSE),
    ('Blood Glucose Test', 'Diagnostic', 850.00, TRUE),
    ('Full Blood Count', 'Laboratory', 1800.00, TRUE),
    ('Urine Analysis', 'Laboratory', 1200.00, TRUE),
    ('Wound Dressing', 'Procedure', 1000.00, TRUE),
    ('Injection Administration', 'Procedure', 750.00, FALSE),
    ('Nebulisation', 'Procedure', 1800.00, TRUE),
    ('ECG', 'Diagnostic', 3500.00, TRUE),
    ('Ultrasound Scan', 'Diagnostic', 6500.00, TRUE),
    ('Physiotherapy Session', 'Therapy', 3000.00, TRUE),
    ('Dental Cleaning', 'Dental', 4000.00, FALSE),
    ('Dental Filling', 'Dental', 5500.00, FALSE),
    ('Minor Surgical Dressing', 'Procedure', 2500.00, TRUE),
    ('Health Screening Package', 'Preventive', 8000.00, TRUE),
    ('Medication Review', 'Consultation', 1200.00, TRUE),
    ('Nutritional Consultation', 'Consultation', 3000.00, TRUE),
    ('Chest X-Ray', 'Diagnostic', 4500.00, TRUE),
    ('Lipid Profile', 'Laboratory', 2400.00, TRUE);

DO $$
DECLARE
    v_patient_role_id INT;
    v_branch_id INT;
    v_user_id INT;
    v_index INT;
BEGIN
    SELECT role_id INTO v_patient_role_id
    FROM role
    WHERE role_name = 'Patient';

    SELECT branch_id INTO v_branch_id
    FROM branch
    WHERE is_active
    ORDER BY branch_id
    LIMIT 1;

    IF v_patient_role_id IS NULL OR v_branch_id IS NULL THEN
        RAISE EXCEPTION 'Patient seed requires the Patient role and an active branch';
    END IF;

    FOR v_index IN 1..35 LOOP
        INSERT INTO app_user (
            role_id, first_name, middle_name, last_name, id_number,
            address, birthdate, gender, email
        )
        VALUES (
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
        )
        RETURNING user_id INTO v_user_id;

        INSERT INTO patient (
            user_id, blood_group, emergency_contact, contact_name, registered_branch
        )
        VALUES (
            v_user_id,
            CASE v_index % 4
                WHEN 0 THEN 'A+'
                WHEN 1 THEN 'B+'
                WHEN 2 THEN 'O+'
                ELSE 'AB+'
            END,
            lpad((7100000000 + v_index)::text, 10, '0'),
            'Emergency Contact ' || v_index,
            v_branch_id
        );

        INSERT INTO contact (user_id, phone_number)
        VALUES (v_user_id, lpad((7700000000 + v_index)::text, 10, '0'));
    END LOOP;
END;
$$;