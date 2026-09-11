INSERT INTO contact (user_id, phone_number)
SELECT
    u.user_id,
    lpad((7700000000 + substring(u.first_name FROM 8)::INT)::text, 10, '0')
FROM app_user u
WHERE u.first_name ~ '^Patient[0-9]+$'
  AND NOT EXISTS (
      SELECT 1 FROM contact c WHERE c.user_id = u.user_id
  )
ORDER BY u.user_id
LIMIT 35;