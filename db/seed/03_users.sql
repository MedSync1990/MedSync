INSERT INTO app_user (
    role_id, first_name, middle_name, last_name, id_number, address,
    birthdate, gender, marital_status, email
)
SELECT roles.role_id, seed.first_name, seed.middle_name, seed.last_name,
       seed.id_number, seed.address, seed.birthdate::date, seed.gender::gender_enum,
       seed.marital_status, seed.email
FROM (VALUES
    ('Staff01', NULL, 'Admin', '900000001V', 'Colombo', '1985-01-10', 'Other', 'Single', 'admin01@medsync.test', 'Administrator'),
    ('Staff02', NULL, 'Manager', '900000002V', 'Kandy', '1986-02-11', 'Female', 'Married', 'manager01@medsync.test', 'Branch Manager'),
    ('Staff03', NULL, 'Reception', '900000003V', 'Galle', '1987-03-12', 'Male', 'Single', 'reception01@medsync.test', 'Receptionist'),
    ('Staff04', NULL, 'Reception', '900000004V', 'Jaffna', '1988-04-13', 'Female', 'Single', 'reception02@medsync.test', 'Receptionist'),
    ('Staff05', NULL, 'Doctor', '900000005V', 'Colombo', '1980-05-14', 'Male', 'Married', 'doctor01@medsync.test', 'Doctor'),
    ('Staff06', NULL, 'Doctor', '900000006V', 'Kandy', '1981-06-15', 'Female', 'Single', 'doctor02@medsync.test', 'Doctor'),
    ('Staff07', NULL, 'Doctor', '900000007V', 'Galle', '1982-07-16', 'Male', 'Married', 'doctor03@medsync.test', 'Doctor'),
    ('Staff08', NULL, 'Doctor', '900000008V', 'Jaffna', '1983-08-17', 'Female', 'Single', 'doctor04@medsync.test', 'Doctor'),
    ('Staff09', NULL, 'Doctor', '900000009V', 'Negombo', '1984-09-18', 'Other', 'Single', 'doctor05@medsync.test', 'Doctor'),
    ('Staff10', NULL, 'Doctor', '900000010V', 'Matara', '1985-10-19', 'Male', 'Married', 'doctor06@medsync.test', 'Doctor'),
    ('Staff11', NULL, 'Doctor', '900000011V', 'Kurunegala', '1986-11-20', 'Female', 'Single', 'doctor07@medsync.test', 'Doctor'),
    ('Staff12', NULL, 'Doctor', '900000012V', 'Anuradhapura', '1987-12-21', 'Male', 'Single', 'doctor08@medsync.test', 'Doctor'),
    ('Staff13', NULL, 'Doctor', '900000013V', 'Ratnapura', '1988-01-22', 'Female', 'Married', 'doctor09@medsync.test', 'Doctor'),
    ('Staff14', NULL, 'Doctor', '900000014V', 'Batticaloa', '1989-02-23', 'Male', 'Single', 'doctor10@medsync.test', 'Doctor'),
    ('Patient01', NULL, 'Patient', '900000015V', 'Colombo', '1990-01-01', 'Female', 'Single', 'patient01@medsync.test', 'Patient'),
    ('Patient02', NULL, 'Patient', '900000016V', 'Kandy', '1991-02-02', 'Male', 'Married', 'patient02@medsync.test', 'Patient'),
    ('Patient03', NULL, 'Patient', '900000017V', 'Galle', '1992-03-03', 'Female', 'Single', 'patient03@medsync.test', 'Patient'),
    ('Patient04', NULL, 'Patient', '900000018V', 'Jaffna', '1993-04-04', 'Male', 'Single', 'patient04@medsync.test', 'Patient'),
    ('Patient05', NULL, 'Patient', '900000019V', 'Negombo', '1994-05-05', 'Other', 'Married', 'patient05@medsync.test', 'Patient'),
    ('Patient06', NULL, 'Patient', '900000020V', 'Matara', '1995-06-06', 'Female', 'Single', 'patient06@medsync.test', 'Patient'),
    ('Patient07', NULL, 'Patient', '900000021V', 'Kurunegala', '1996-07-07', 'Male', 'Single', 'patient07@medsync.test', 'Patient'),
    ('Patient08', NULL, 'Patient', '900000022V', 'Anuradhapura', '1997-08-08', 'Female', 'Married', 'patient08@medsync.test', 'Patient'),
    ('Patient09', NULL, 'Patient', '900000023V', 'Ratnapura', '1998-09-09', 'Male', 'Single', 'patient09@medsync.test', 'Patient'),
    ('Patient10', NULL, 'Patient', '900000024V', 'Batticaloa', '1999-10-10', 'Female', 'Single', 'patient10@medsync.test', 'Patient')
) AS seed(first_name, middle_name, last_name, id_number, address, birthdate, gender, marital_status, email, role_name)
JOIN role roles ON roles.role_name = seed.role_name
WHERE NOT EXISTS (SELECT 1 FROM app_user existing WHERE existing.email = seed.email);
