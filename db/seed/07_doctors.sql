INSERT INTO doctor (user_id, license_number)
SELECT u.user_id, 'SLMC-' || lpad(row_number() OVER (ORDER BY u.email)::text, 6, '0')
FROM app_user u
JOIN staff s ON s.user_id = u.user_id
WHERE u.email LIKE 'doctor%@medsync.test'
  AND NOT EXISTS (SELECT 1 FROM doctor d WHERE d.user_id = u.user_id);
