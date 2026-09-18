INSERT INTO patient (
    user_id, blood_group, emergency_contact, contact_name, registered_branch
)
SELECT
    u.user_id,
    CASE substring(u.first_name FROM 8)::INT % 4
        WHEN 0 THEN 'A+'
        WHEN 1 THEN 'B+'
        WHEN 2 THEN 'O+'
        ELSE 'AB+'
    END,
    lpad((7100000000 + substring(u.first_name FROM 8)::INT)::text, 10, '0'),
    'Emergency Contact ' || substring(u.first_name FROM 8),
    b.branch_id
FROM app_user u
JOIN (
    SELECT branch_id
    FROM branch
    WHERE is_active
    ORDER BY branch_id
    LIMIT 1
) b ON TRUE
WHERE u.first_name ~ '^Patient[0-9]+$'
  AND NOT EXISTS (
      SELECT 1 FROM patient p WHERE p.user_id = u.user_id
  )
ORDER BY u.user_id
LIMIT 35;