INSERT INTO contact (user_id, phone_number)
SELECT u.user_id, '077' || lpad((1000000 + row_number() OVER (ORDER BY u.user_id))::text, 7, '0')
FROM app_user u
WHERE u.email LIKE '%@medsync.test'
  AND NOT EXISTS (SELECT 1 FROM contact c WHERE c.user_id = u.user_id);
