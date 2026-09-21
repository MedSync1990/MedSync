INSERT INTO patient (user_id, blood_group, emergency_contact, contact_name, registered_branch)
SELECT u.user_id, v.blood_group, v.emergency_contact, v.contact_name, b.branch_id
FROM (VALUES
    ('test.patient1@medsync.test', 'O+', '0771111111', 'Test Emergency One', 'Self-Test Colombo'),
    ('test.patient2@medsync.test', 'A+', '0772222222', 'Test Emergency Two', 'Self-Test Kandy'),
    ('test.patient3@medsync.test', 'B+', '0773333333', 'Test Emergency Three', 'Self-Test Galle'),
    ('test.patient4@medsync.test', 'AB+', '0774444444', 'Test Emergency Four', 'Self-Test Jaffna')
) AS v(email, blood_group, emergency_contact, contact_name, branch_name)
JOIN app_user u ON u.email = v.email
JOIN branch b ON b.name = v.branch_name
ON CONFLICT (user_id) DO NOTHING;
