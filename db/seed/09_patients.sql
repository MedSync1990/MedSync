WITH numbered_patients AS (
  SELECT u.user_id, u.email,
       row_number() OVER (ORDER BY u.email) AS sequence
  FROM app_user u
  WHERE u.email LIKE 'patient%@medsync.test'
)
INSERT INTO patient (user_id, blood_group, emergency_contact, contact_name, registered_branch)
SELECT u.user_id,
  (ARRAY['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'A+', 'B+'])[np.sequence],
  '071' || lpad((2000000 + np.sequence)::text, 7, '0'),
  'Emergency Contact ' || np.sequence,
       b.branch_id
FROM app_user u
JOIN numbered_patients np ON np.user_id = u.user_id
JOIN branch b ON b.name = CASE (np.sequence - 1)
    WHEN 0 THEN 'Colombo Central' WHEN 1 THEN 'Kandy City' WHEN 2 THEN 'Galle Fort'
    WHEN 3 THEN 'Jaffna Town' WHEN 4 THEN 'Negombo Beach' WHEN 5 THEN 'Matara South'
    WHEN 6 THEN 'Kurunegala North' WHEN 7 THEN 'Anuradhapura' WHEN 8 THEN 'Ratnapura'
    ELSE 'Batticaloa East' END
WHERE u.email LIKE 'patient%@medsync.test'
  AND NOT EXISTS (SELECT 1 FROM patient p WHERE p.user_id = u.user_id);
