INSERT INTO app_user (
    role_id, first_name, last_name, id_number, address, birthdate, gender, marital_status, email
)
SELECT r.role_id, v.first_name, v.last_name, v.id_number, v.address,
       v.birthdate::date, v.gender::gender_enum, v.marital_status, v.email
FROM (VALUES
    ('Test', 'Admin', '990000001V', 'Self-Test Colombo', '1989-01-01', 'Other', 'Single', 'test.admin@medsync.test', 'Administrator'),
    ('Test', 'Manager', '990000002V', 'Self-Test Colombo', '1988-02-02', 'Female', 'Married', 'test.manager@medsync.test', 'Branch Manager'),
    ('Test', 'Doctor', '990000003V', 'Self-Test Colombo', '1987-03-03', 'Male', 'Single', 'test.doctor@medsync.test', 'Doctor'),
    ('Test', 'Reception', '990000004V', 'Self-Test Kandy', '1992-04-04', 'Female', 'Single', 'test.reception@medsync.test', 'Receptionist'),
    ('Test', 'Patient One', '990000005V', 'Self-Test Colombo', '1990-05-05', 'Female', 'Married', 'test.patient1@medsync.test', 'Patient'),
    ('Test', 'Patient Two', '990000006V', 'Self-Test Kandy', '1995-06-06', 'Male', 'Single', 'test.patient2@medsync.test', 'Patient'),
    ('Test', 'Doctor Two', '990000007V', 'Self-Test Galle', '1986-07-07', 'Female', 'Married', 'test.doctor2@medsync.test', 'Doctor'),
    ('Test', 'Reception Two', '990000008V', 'Self-Test Galle', '1993-08-08', 'Male', 'Single', 'test.reception2@medsync.test', 'Receptionist'),
    ('Test', 'Patient Three', '990000009V', 'Self-Test Galle', '1985-09-09', 'Other', 'Single', 'test.patient3@medsync.test', 'Patient'),
    ('Test', 'Patient Four', '990000010V', 'Self-Test Jaffna', '2000-10-10', 'Female', 'Single', 'test.patient4@medsync.test', 'Patient')
) AS v(first_name, last_name, id_number, address, birthdate, gender, marital_status, email, role_name)
JOIN role r ON r.role_name = v.role_name
WHERE NOT EXISTS (SELECT 1 FROM app_user u WHERE u.email = v.email);
