-- ============================================================================
-- MedSync CATMS — Seed Data: Module 02
-- File: 02_doctors_specialties_slots.sql
-- Owner: Kalana Jayawardena
-- Description: Seed data for specialties, doctor profiles, specialty mappings,
--              and doctor availability slots (1 week).
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

-- 2. Seed Doctor Profiles (user_id 101 to 108)
-- Assumes staff rows are created by Dilantha's seed script (01_branches_staff.sql)
INSERT INTO doctor (user_id, license_number, consultation_fee, is_active) VALUES
    (101, 'SLMC-48192', 2500.00, TRUE), -- Dr. Samantha Perera (Colombo)
    (102, 'SLMC-39281', 3500.00, TRUE), -- Dr. Nuwan Fernando (Colombo)
    (103, 'SLMC-51920', 3000.00, TRUE), -- Dr. Priyantha Silva (Kandy)
    (104, 'SLMC-28491', 3200.00, TRUE), -- Dr. Anoma Wijesinghe (Kandy)
    (105, 'SLMC-61029', 4000.00, TRUE), -- Dr. Rohan De Silva (Galle)
    (106, 'SLMC-47201', 3800.00, TRUE), -- Dr. Kusal Mendis (Colombo)
    (107, 'SLMC-38190', 3000.00, TRUE), -- Dr. Dilani Jayasuriya (Galle)
    (108, 'SLMC-59281', 2800.00, TRUE)  -- Dr. Chamara Gunawardena (Kandy)
ON CONFLICT (user_id) DO UPDATE 
    SET license_number = EXCLUDED.license_number,
        consultation_fee = EXCLUDED.consultation_fee;

-- 3. Seed Doctor Specialties (allocating 1-2 specialties per doctor)
INSERT INTO doctor_specialty (user_id, speciality_id) VALUES
    (101, 1), -- Dr. Samantha -> General Medicine
    (102, 2), -- Dr. Nuwan -> Cardiology
    (102, 1), -- Dr. Nuwan -> General Medicine (secondary)
    (103, 4), -- Dr. Priyantha -> Pediatrics
    (104, 3), -- Dr. Anoma -> Dermatology
    (105, 5), -- Dr. Rohan -> Orthopedics
    (106, 6), -- Dr. Kusal -> Neurology
    (107, 7), -- Dr. Dilani -> Gynecology
    (108, 9), -- Dr. Chamara -> ENT
    (108, 1)  -- Dr. Chamara -> General Medicine (secondary)
ON CONFLICT (user_id, speciality_id) DO NOTHING;

-- 4. Seed Availability Slots (A full week of consultation slots per doctor)
INSERT INTO doctor_availability_slots (doctor_id, date, start_time, end_time, status)
SELECT 
    d.user_id,
    (CURRENT_DATE + day_offset)::DATE,
    slot_times.start_time,
    slot_times.end_time,
    'Available'::slot_status
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
