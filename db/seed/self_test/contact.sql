INSERT INTO contact (user_id, phone_number)
SELECT u.user_id, v.phone_number
FROM (VALUES
    ('test.admin@medsync.test', '0711111111'),
    ('test.manager@medsync.test', '0722222222'),
    ('test.doctor@medsync.test', '0733333333'),
    ('test.reception@medsync.test', '0744444444'),
    ('test.patient1@medsync.test', '0755555555'),
    ('test.patient2@medsync.test', '0766666666'),
    ('test.doctor2@medsync.test', '0773333333'),
    ('test.reception2@medsync.test', '0784444444'),
    ('test.patient3@medsync.test', '0795555555'),
    ('test.patient4@medsync.test', '0706666666')
) AS v(email, phone_number)
JOIN app_user u ON u.email = v.email
WHERE NOT EXISTS (
    SELECT 1 FROM contact c WHERE c.user_id = u.user_id AND c.phone_number = v.phone_number
);
