-- ============================================================================
-- MedSync CATMS — Seed Data: Module 02
-- File: 02_doctors_specialties_slots.sql
-- Owner: Kalana Jayawardena
-- Description: Seed data for specialties, doctor profiles, doctor specialties,
--              and doctor availability slots (1 week).
-- Reference: docs/database.md §2.1, §2.2
-- ============================================================================

-- 1. Seed Specialties (10 diverse medical specialties)
INSERT INTO specialty (name, description) VALUES
    ('General Medicine', 'Primary care, general health assessments, and preventative care'),
    ('Cardiology', 'Heart health, cardiovascular diseases, hypertension, and cardiac diagnostics'),
    ('Dermatology', 'Skin, hair, nails, and cutaneous health treatments'),
    ('Pediatrics', 'Comprehensive healthcare and medical treatment for infants, children, and adolescents'),
    ('Orthopedics', 'Musculoskeletal system, bone fractures, joints, and spine care'),
    ('Neurology', 'Brain, spinal cord, nerves, and neurological disorders'),
    ('Gynecology & Obstetrics', 'Women''s reproductive health, pregnancy, and childbirth care'),
    ('Ophthalmology', 'Eye examinations, vision care, and ocular surgery'),
    ('ENT (Otolaryngology)', 'Ear, nose, throat, and head/neck disorders'),
    ('Psychiatry', 'Mental health diagnostics, emotional wellness, and therapy')
ON CONFLICT (name) DO NOTHING;

-- 2. Seed doctor users and staff rows before extending them as doctors.
INSERT INTO app_user (
    role_id, first_name, last_name, id_number, address, birthdate, gender, email
)
SELECT r.role_id, doctors.first_name, doctors.last_name, doctors.id_number,
    doctors.address, doctors.birthdate::DATE, doctors.gender::gender_enum, doctors.email
FROM (VALUES
    ('Samantha', 'Perera', '901234567V', 'Colombo', '1989-01-15', 'Female', 'dr.samantha@medsync.lk'),
    ('Nuwan', 'Fernando', '901234568V', 'Colombo', '1989-04-20', 'Male', 'dr.nuwan@medsync.lk'),
    ('Priyantha', 'Silva', '901234569V', 'Kandy', '1989-07-10', 'Male', 'dr.priyantha@medsync.lk'),
    ('Anoma', 'Wijesinghe', '901234570V', 'Kandy', '1989-09-12', 'Female', 'dr.anoma@medsync.lk'),
    ('Rohan', 'De Silva', '901234571V', 'Galle', '1989-11-02', 'Male', 'dr.rohan@medsync.lk'),
    ('Kusal', 'Mendis', '901234572V', 'Colombo', '1990-02-08', 'Male', 'dr.kusal@medsync.lk'),
    ('Dilani', 'Jayasuriya', '901234573V', 'Galle', '1990-05-14', 'Female', 'dr.dilani@medsync.lk'),
    ('Chamara', 'Gunawardena', '901234574V', 'Kandy', '1990-08-18', 'Male', 'dr.chamara@medsync.lk')
) AS doctors(first_name, last_name, id_number, address, birthdate, gender, email)
CROSS JOIN role r
WHERE r.role_name = 'Doctor'
ON CONFLICT (id_number) DO NOTHING;

INSERT INTO staff (user_id, branch_id, username, password_hash)
SELECT u.user_id, b.branch_id, 'doctor.' || lower(u.first_name),
       crypt('MedSync@2026', gen_salt('bf'))
FROM app_user u
JOIN branch b ON b.name = split_part(u.address, ', ', 1)
WHERE u.email LIKE 'dr.%@medsync.lk'
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO doctor (user_id, license_number)
SELECT u.user_id, doctors.license_number
FROM (VALUES
    ('dr.samantha@medsync.lk', 'SLMC-48192'),
    ('dr.nuwan@medsync.lk', 'SLMC-39281'),
    ('dr.priyantha@medsync.lk', 'SLMC-51920'),
    ('dr.anoma@medsync.lk', 'SLMC-28491'),
    ('dr.rohan@medsync.lk', 'SLMC-61029'),
    ('dr.kusal@medsync.lk', 'SLMC-47201'),
    ('dr.dilani@medsync.lk', 'SLMC-38190'),
    ('dr.chamara@medsync.lk', 'SLMC-59281')
) AS doctors(email, license_number)
JOIN app_user u ON u.email = doctors.email
ON CONFLICT (license_number) DO NOTHING;

-- 3. Seed Doctor Specialties (allocating 1-2 specialties per doctor)
INSERT INTO doctor_speciality (user_id, speciality_id)
SELECT d.user_id, s.speciality_id
FROM (VALUES
    ('dr.samantha@medsync.lk', 'General Medicine'),
    ('dr.nuwan@medsync.lk', 'Cardiology'),
    ('dr.nuwan@medsync.lk', 'General Medicine'),
    ('dr.priyantha@medsync.lk', 'Pediatrics'),
    ('dr.anoma@medsync.lk', 'Dermatology'),
    ('dr.rohan@medsync.lk', 'Orthopedics'),
    ('dr.kusal@medsync.lk', 'Neurology'),
    ('dr.dilani@medsync.lk', 'Gynecology & Obstetrics'),
    ('dr.chamara@medsync.lk', 'ENT (Otolaryngology)'),
    ('dr.chamara@medsync.lk', 'General Medicine')
) AS assignments(email, specialty_name)
JOIN app_user u ON u.email = assignments.email
JOIN doctor d ON d.user_id = u.user_id
JOIN specialty s ON s.name = assignments.specialty_name
ON CONFLICT (user_id, speciality_id) DO NOTHING;

-- 4. Seed Availability Slots (A full week of consultation slots per doctor)
-- Status is 'Open'::slot_status_enum per docs/database.md §2.2
INSERT INTO doctor_availability_slots (doctor_id, date, start_time, end_time, status)
SELECT 
    d.user_id,
    (CURRENT_DATE + day_offset)::DATE,
    slot_times.start_time,
    slot_times.end_time,
    'Open'::slot_status_enum
FROM 
    doctor d
CROSS JOIN 
    generate_series(0, 6) AS day_offset
CROSS JOIN (
    VALUES 
        ('09:00:00'::TIME, '09:30:00'::TIME),
        ('09:30:00'::TIME, '10:00:00'::TIME),
        ('10:00:00'::TIME, '10:30:00'::TIME),
        ('10:30:00'::TIME, '11:00:00'::TIME),
        ('14:00:00'::TIME, '14:30:00'::TIME),
        ('14:30:00'::TIME, '15:00:00'::TIME),
        ('15:00:00'::TIME, '15:30:00'::TIME),
        ('15:30:00'::TIME, '16:00:00'::TIME)
) AS slot_times(start_time, end_time)
ON CONFLICT DO NOTHING;
