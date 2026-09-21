INSERT INTO doctor_specialty (user_id, specialty_id)
SELECT d.user_id, s.specialty_id
FROM doctor d
JOIN specialty s ON s.name IN ('Self-Test General Medicine', 'Self-Test Cardiology')
JOIN app_user u ON u.user_id = d.user_id
WHERE u.email = 'test.doctor@medsync.test'
ON CONFLICT (user_id, specialty_id) DO NOTHING;

INSERT INTO doctor_specialty (user_id, specialty_id)
SELECT d.user_id, s.specialty_id
FROM doctor d
JOIN specialty s ON s.name IN ('Self-Test Pediatrics', 'Self-Test Dermatology')
JOIN app_user u ON u.user_id = d.user_id
WHERE u.email = 'test.doctor2@medsync.test'
ON CONFLICT (user_id, specialty_id) DO NOTHING;
