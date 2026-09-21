CREATE EXTENSION IF NOT EXISTS pgcrypto;

INSERT INTO staff (user_id, branch_id, username, password_hash)
SELECT u.user_id, b.branch_id, v.username, crypt('MedSync@2026', gen_salt('bf'))
FROM (VALUES
    ('test.admin@medsync.test', 'test.admin', 'Self-Test Colombo'),
    ('test.manager@medsync.test', 'test.manager', 'Self-Test Colombo'),
    ('test.doctor@medsync.test', 'test.doctor', 'Self-Test Colombo'),
    ('test.reception@medsync.test', 'test.reception', 'Self-Test Kandy'),
    ('test.doctor2@medsync.test', 'test.doctor2', 'Self-Test Galle'),
    ('test.reception2@medsync.test', 'test.reception2', 'Self-Test Galle')
) AS v(email, username, branch_name)
JOIN app_user u ON u.email = v.email
JOIN branch b ON b.name = v.branch_name
ON CONFLICT (username) DO NOTHING;
