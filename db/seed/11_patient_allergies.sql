WITH numbered_patients AS (
	SELECT u.user_id, row_number() OVER (ORDER BY u.email) AS sequence
	FROM app_user u
	WHERE u.email LIKE 'patient%@medsync.test'
)
INSERT INTO patient_allergy (patient_id, allergy_id)
SELECT p.user_id, a.allergy_id
FROM numbered_patients np
JOIN patient p ON p.user_id = np.user_id
JOIN allergy a ON a.allergy_code = 'ALG-' || lpad(np.sequence::text, 3, '0')
ON CONFLICT (patient_id, allergy_id) DO NOTHING;
