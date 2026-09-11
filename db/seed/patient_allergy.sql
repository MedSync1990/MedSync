INSERT INTO patient_allergy (patient_id, allergy_id)
SELECT p.user_id,
       a.allergy_id
FROM app_user u
JOIN patient p ON p.user_id = u.user_id
JOIN allergy a ON a.allergy_code = 'ALG-' || lpad(
    (((substring(u.first_name FROM 8)::INT - 1) % 4) + 1)::TEXT,
    3,
    '0'
)
WHERE u.first_name ~ '^Patient[0-9]+$'
  AND substring(u.first_name FROM 8)::INT % 3 = 0
ON CONFLICT (patient_id, allergy_id) DO NOTHING;