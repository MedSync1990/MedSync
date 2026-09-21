INSERT INTO patient_allergy (patient_id, allergy_id)
SELECT p.user_id, a.allergy_id
FROM patient p
JOIN app_user u ON u.user_id = p.user_id
JOIN allergy a ON a.allergy_code IN ('SELF-ALL-001', 'SELF-ALL-002')
WHERE u.email = 'test.patient1@medsync.test'
ON CONFLICT (patient_id, allergy_id) DO NOTHING;

INSERT INTO patient_allergy (patient_id, allergy_id)
SELECT p.user_id, a.allergy_id
FROM patient p
JOIN app_user u ON u.user_id = p.user_id
JOIN allergy a ON a.allergy_code = 'SELF-ALL-003'
WHERE u.email = 'test.patient2@medsync.test'
ON CONFLICT (patient_id, allergy_id) DO NOTHING;

INSERT INTO patient_allergy (patient_id, allergy_id)
SELECT p.user_id, a.allergy_id
FROM patient p
JOIN app_user u ON u.user_id = p.user_id
JOIN allergy a ON a.allergy_code IN ('SELF-ALL-004', 'SELF-ALL-005')
WHERE u.email = 'test.patient3@medsync.test'
ON CONFLICT (patient_id, allergy_id) DO NOTHING;

INSERT INTO patient_allergy (patient_id, allergy_id)
SELECT p.user_id, a.allergy_id
FROM patient p
JOIN app_user u ON u.user_id = p.user_id
JOIN allergy a ON a.allergy_code = 'SELF-ALL-001'
WHERE u.email = 'test.patient4@medsync.test'
ON CONFLICT (patient_id, allergy_id) DO NOTHING;
