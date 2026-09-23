INSERT INTO staff (user_id, branch_id, username, password_hash)
SELECT u.user_id,
       b.branch_id,
       split_part(u.email, '@', 1),
    '$2b$12$4240chNONKaShJF.Q8MUguccZSbYxRc2UMxxqkASkXYzO02Y4z3RC'
FROM app_user u
JOIN branch b ON b.name = CASE (u.user_id - (SELECT min(user_id) FROM app_user WHERE email LIKE 'admin%')) % 10
    WHEN 0 THEN 'Colombo Central' WHEN 1 THEN 'Kandy City' WHEN 2 THEN 'Galle Fort'
    WHEN 3 THEN 'Jaffna Town' WHEN 4 THEN 'Negombo Beach' WHEN 5 THEN 'Matara South'
    WHEN 6 THEN 'Kurunegala North' WHEN 7 THEN 'Anuradhapura' WHEN 8 THEN 'Ratnapura'
    ELSE 'Batticaloa East' END
WHERE u.email IN ('admin01@medsync.test', 'manager01@medsync.test', 'reception01@medsync.test', 'reception02@medsync.test')
   OR u.email LIKE 'doctor%@medsync.test'
ON CONFLICT (username) DO NOTHING;
