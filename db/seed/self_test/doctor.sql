INSERT INTO doctor (user_id, license_number)
SELECT u.user_id, 'SELF-TEST-001'
FROM app_user u
WHERE u.email = 'test.doctor@medsync.test'
  AND NOT EXISTS (SELECT 1 FROM doctor d WHERE d.user_id = u.user_id)
  AND NOT EXISTS (SELECT 1 FROM doctor d WHERE d.license_number = 'SELF-TEST-001');

INSERT INTO doctor (user_id, license_number)
SELECT u.user_id, 'SELF-TEST-002'
FROM app_user u
WHERE u.email = 'test.doctor2@medsync.test'
  AND NOT EXISTS (SELECT 1 FROM doctor d WHERE d.user_id = u.user_id)
  AND NOT EXISTS (SELECT 1 FROM doctor d WHERE d.license_number = 'SELF-TEST-002');
