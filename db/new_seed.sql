-- =============================================================================
-- MedSync CATMS — Complete Database Seed File
-- =============================================================================
-- Engine: PostgreSQL (confirmed by project schema)
-- Purpose: Populate the database with realistic interconnected data that
--          exercises all functions, triggers, constraints, and business rules.
--
-- Prerequisites: The full schema must already be applied (db/schema.sql).
-- Usage:         psql -d medsync -f db/new_seed.sql
--
-- IMPORTANT:
--   - This seed is designed to be run on a CLEAN database.
--   - It uses explicit IDs to guarantee deterministic references.
--   - Identity columns are reset with ALTER TABLE ... RESTART WITH after
--     explicit inserts so future app-generated IDs do not collide.
--   - Password hash: '$2b$12$8oR8QG1CzwICjoIQqYHa1OKQX4KygnGybO52NTqU8SIrb.Dbr118a'
--     is bcrypt for "medsync" (cost factor 12). Replace if the backend
--     uses Argon2 — see note at bottom of file.
--   - All names, NICs, phones, emails, addresses are fictional.
-- =============================================================================

BEGIN;

-- =============================================================================
-- SECTION 1: LOOKUP / REFERENCE DATA
-- =============================================================================

-- 1.1 Roles (5 standard roles)
INSERT INTO role (role_id, role_name) OVERRIDING SYSTEM VALUE VALUES
    (1, 'Administrator'),
    (2, 'Branch Manager'),
    (3, 'Doctor'),
    (4, 'Receptionist'),
    (5, 'Patient');

SELECT setval('role_role_id_seq', (SELECT MAX(role_id) FROM role));

-- 1.2 Branches (3 branches)
INSERT INTO branch (branch_id, name, address, phone_number, is_active) OVERRIDING SYSTEM VALUE VALUES
    (1, 'Colombo', '123 Galle Road, Colombo 03, Western Province', '0112345678', TRUE),
    (2, 'Kandy',   '456 Peradeniya Road, Kandy, Central Province',  '0812345678', TRUE),
    (3, 'Galle',   '789 Main Street, Galle, Southern Province',     '0912345678', TRUE);

SELECT setval('branch_branch_id_seq', (SELECT MAX(branch_id) FROM branch));

-- 1.3 Specialties
INSERT INTO specialty (specialty_id, name, description) OVERRIDING SYSTEM VALUE VALUES
    (1, 'General Medicine', 'General practice and internal medicine'),
    (2, 'Pediatrics',       'Medical care for infants, children, and adolescents'),
    (3, 'ENT',              'Ear, Nose, and Throat specialist care'),
    (4, 'Dermatology',      'Skin, hair, and nail conditions'),
    (5, 'Cardiology',       'Heart and cardiovascular system'),
    (6, 'Internal Medicine','Adult internal medicine subspecialty');

SELECT setval('specialty_specialty_id_seq', (SELECT MAX(specialty_id) FROM specialty));

-- 1.4 Allergies
INSERT INTO allergy (allergy_id, allergy_code, name) OVERRIDING SYSTEM VALUE VALUES
    (1, 'ALG-PEN',  'Penicillin'),
    (2, 'ALG-PEA',  'Peanuts'),
    (3, 'ALG-LAT',  'Latex'),
    (4, 'ALG-SUL',  'Sulfa Drugs'),
    (5, 'ALG-SHF',  'Shellfish'),
    (6, 'ALG-ASP',  'Aspirin');

SELECT setval('allergy_allergy_id_seq', (SELECT MAX(allergy_id) FROM allergy));

-- 1.5 Treatment Catalogue (12 treatments across categories)
INSERT INTO treatment_catalogue
    (treatment_code, treatment_name, category, price, is_eligible_for_insurance, is_active)
OVERRIDING SYSTEM VALUE VALUES
    (1,  'General Consultation',   'Consultation', 2500.00, TRUE,  TRUE),
    (2,  'Pediatric Consultation', 'Consultation', 3000.00, TRUE,  TRUE),
    (3,  'ENT Examination',        'Consultation', 3500.00, TRUE,  TRUE),
    (4,  'Skin Examination',       'Consultation', 3200.00, TRUE,  TRUE),
    (5,  'Cardiology Consultation','Consultation', 5000.00, TRUE,  TRUE),
    (6,  'Blood Test - Full Count','Laboratory',   1200.00, TRUE,  TRUE),
    (7,  'Blood Sugar Test',       'Laboratory',    800.00, TRUE,  TRUE),
    (8,  'ECG',                    'Diagnostic',   4500.00, TRUE,  TRUE),
    (9,  'X-Ray - Chest',          'Diagnostic',   3800.00, TRUE,  TRUE),
    (10, 'Minor Surgical Procedure','Procedure',   8000.00, TRUE,  TRUE),
    (11, 'Wound Dressing',         'Procedure',    1500.00, FALSE, TRUE),
    (12, 'Vaccination - Influenza','Preventive',   2000.00, TRUE,  TRUE);

SELECT setval('treatment_catalogue_treatment_code_seq',
              (SELECT MAX(treatment_code) FROM treatment_catalogue));

-- 1.6 Insurance Providers & Policies
INSERT INTO insurance_policy_details (policy_id, provider_name, policy_name) OVERRIDING SYSTEM VALUE VALUES
    (1, 'Ceylinco Life',    'Gold Health Plan'),
    (2, 'Ceylinco Life',    'Silver Health Plan'),
    (3, 'Softlogic Life',   'Executive Health'),
    (4, 'AIA Insurance',    'Family Care Plan');

SELECT setval('insurance_policy_details_policy_id_seq',
              (SELECT MAX(policy_id) FROM insurance_policy_details));

-- 1.7 Policy Treatment Coverage
-- Different coverage % per policy/treatment to exercise fn_calculate_insurance_coverage
INSERT INTO policy_treatment_coverage (policy_id, treatment_code, coverage_percentage) VALUES
    -- Gold Health Plan (policy 1) — generous coverage
    (1, 1,  80.00),  -- General Consultation 80%
    (1, 3,  90.00),  -- ENT Examination 90%
    (1, 6,  70.00),  -- Blood Test 70%
    (1, 8,  90.00),  -- ECG 90%
    (1, 10, 60.00),  -- Minor Procedure 60%
    -- Silver Health Plan (policy 2) — moderate coverage
    (2, 1,  60.00),  -- General Consultation 60%
    (2, 6,  50.00),  -- Blood Test 50%
    (2, 9,  70.00),  -- X-Ray 70%
    -- Executive Health (policy 3) — high coverage
    (3, 1, 100.00),  -- General Consultation 100%
    (3, 2,  85.00),  -- Pediatric Consultation 85%
    (3, 5,  90.00),  -- Cardiology 90%
    (3, 8, 100.00),  -- ECG 100%
    -- Family Care Plan (policy 4) — pediatric focus
    (4, 2,  85.00),  -- Pediatric Consultation 85%
    (4, 6,  60.00),  -- Blood Test 60%
    (4, 12, 75.00);  -- Vaccination 75%

-- =============================================================================
-- SECTION 2: APPLICATION USERS (20 total)
-- =============================================================================
-- Password hash below is bcrypt cost-12 for the string "medsync":
--   $2b$12$8oR8QG1CzwICjoIQqYHa1OKQX4KygnGybO52NTqU8SIrb.Dbr118a
-- All 15 staff users share the same password "medsync" as required.
-- =============================================================================

-- 2.1 app_user rows (user_id 1–20)
-- Order: 2 admins, 3 managers, 5 doctors, 5 receptionists, 5 patients
INSERT INTO app_user
    (user_id, role_id, first_name, middle_name, last_name, id_number,
    address, birthdate, gender, marital_status, email)
OVERRIDING SYSTEM VALUE VALUES
    -- Administrators (role_id=1)
    (1,  1, 'Arjuna',   'Kumar',  'Silva',     '198512345678', '10 Hospital Road, Colombo 07',        '1985-03-14', 'Male',   'Married', 'arjuna.silva@medsync.lk'),
    (2,  1, 'Dilini',   NULL,     'Wickrama',  '199023456789', '22 Lake Drive, Colombo 05',           '1990-07-22', 'Female', 'Single',  'dilini.wickrama@medsync.lk'),
    -- Branch Managers (role_id=2)
    (3,  2, 'Saman',    'Percy',  'Jayawardena','198045678901','45 Temple Road, Colombo 03',          '1980-01-10', 'Male',   'Married', 'saman.j@medsync.lk'),
    (4,  2, 'Nadeesha', 'Kumari', 'Bandara',   '198556789012', '78 Hill Street, Kandy',               '1985-11-05', 'Female', 'Married', 'nadeesha.b@medsync.lk'),
    (5,  2, 'Rohan',    NULL,     'Dissanayake','198267890123','12 Beach Road, Galle',                '1982-06-18', 'Male',   'Married', 'rohan.d@medsync.lk'),
    -- Doctors (role_id=3)
    (6,  3, 'Kasun',    'Nimal',  'Perera',    '198878901234', '30 Flower Road, Colombo 07',          '1988-09-12', 'Male',   'Married', 'kasun.perera@medsync.lk'),
    (7,  3, 'Nimali',   'Rashmi', 'Fernando',  '198389012345', '56 Kandy Road, Kandy',                '1983-04-25', 'Female', 'Married', 'nimali.fernando@medsync.lk'),
    (8,  3, 'Sanjeewa', 'Chandana','Gunawardena','197990123456','89 Galle Road, Galle',              '1979-12-03', 'Male',   'Married', 'sanjeewa.g@medsync.lk'),
    (9,  3, 'Thilini',  'Amaya',  'Rajapaksa',  '199001234567', '14 Park Avenue, Kandy',              '1990-08-19', 'Female', 'Single',  'thilini.r@medsync.lk'),
    (10, 3, 'Dinesh',   'Prasad', 'Karunaratne','198512341234', '67 Station Road, Colombo 04',         '1985-02-28', 'Male',   'Married', 'dinesh.k@medsync.lk'),
    -- Receptionists (role_id=4)
    (11, 4, 'Amali',    NULL,     'Senanayake', '199523452345', '20 Main Street, Colombo 11',          '1995-05-16', 'Female', 'Single',  'amali.s@medsync.lk'),
    (12, 4, 'Chamara',  'Lal',    'Weerasinghe','199434563456', '33 Cross Road, Kandy',                '1994-10-08', 'Male',   'Single',  'chamara.w@medsync.lk'),
    (13, 4, 'Ishara',   'Madhavi','Peiris',     '199845674567', '99 Lower Street, Galle',              '1998-03-21', 'Female', 'Single',  'ishara.p@medsync.lk'),
    (14, 4, 'Ruwan',    NULL,     'Jayasuriya', '199356785678', '41 Upper Road, Colombo 06',            '1993-07-30', 'Male',   'Married', 'ruwan.j@medsync.lk'),
    (15, 4, 'Sachini',  'Nethmi', 'Herath',     '199967896789', '27 Temple Lane, Kandy',               '1999-12-11', 'Female', 'Single',  'sachini.h@medsync.lk'),
    -- Patients (role_id=5)
    (16, 5, 'Pradeep',  'Kumara', 'Alwis',     '197890987890', '55 Hospital Street, Colombo 08',      '1978-04-02', 'Male',   'Married', 'pradeep.a@email.com'),
    (17, 5, 'Kumari',   'Anoma',  'Ekanayake', '198901098901', '18 Lake View, Kandy',                 '1989-09-27', 'Female', 'Married', 'kumari.e@email.com'),
    (18, 5, 'Tharindu', 'Sanjaya','Munasinghe','200112309012', '72 Beach Lane, Galle',                '2001-01-15', 'Male',   'Single',  'tharindu.m@email.com'),
    (19, 5, 'Anjali',   'Dilrukshi','Wijesinghe','199612340123','63 Flower Garden, Colombo 05',       '1996-11-08', 'Female', 'Single',  'anjali.w@email.com'),
    (20, 5, 'Suresh',   'Nuwan',  'Liyanage',  '199212451234', '84 Hill Top, Kandy',                  '1992-06-23', 'Male',   'Married', 'suresh.l@email.com');

SELECT setval('app_user_user_id_seq', (SELECT MAX(user_id) FROM app_user));

-- 2.2 Contact phone numbers (one-to-many)
INSERT INTO contact (contact_id, user_id, phone_number) OVERRIDING SYSTEM VALUE VALUES
    (1,  1,  '0771234567'), (2,  2,  '0772345678'),
    (3,  3,  '0773456789'), (4,  4,  '0774567890'),
    (5,  5,  '0775678901'), (6,  6,  '0776789012'),
    (7,  7,  '0777890123'), (8,  8,  '0778901234'),
    (9,  9,  '0779012345'), (10, 10, '0770123456'),
    (11, 11, '0761234567'), (12, 12, '0762345678'),
    (13, 13, '0763456789'), (14, 14, '0764567890'),
    (15, 15, '0765678901'), (16, 16, '0751234567'),
    (17, 16, '0751234568'), -- patient 16 has two phones
    (18, 17, '0752345678'), (19, 18, '0753456789'),
    (20, 19, '0754567890'), (21, 20, '0755678901');

SELECT setval('contact_contact_id_seq', (SELECT MAX(contact_id) FROM contact));

-- =============================================================================
-- SECTION 3: STAFF ROWS (15 staff: 2 admin + 3 manager + 5 doctor + 5 receptionist)
-- =============================================================================
-- All staff share the same bcrypt password hash for "medsync".
-- Branch assignments:
--   Colombo (1): manager1, doctor1, doctor2, receptionist1, receptionist4
--   Kandy   (2): manager2, doctor3, doctor4, receptionist2, receptionist5
--   Galle   (3): manager3, doctor5, receptionist3
-- Admins (user 1, 2) are global — assigned to Colombo as their "home" branch
-- since staff.branch_id is NOT NULL.
-- =============================================================================

INSERT INTO staff
    (user_id, branch_id, username, password_hash, is_active,
     failed_login_attempts, locked_until, last_login_at)
VALUES
    -- Administrators (home branch: Colombo)
    (1,  1, 'admin1',       '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewKyNiAYMyzJgW2y', TRUE, 0, NULL, NULL),
    (2,  1, 'admin2',       '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewKyNiAYMyzJgW2y', TRUE, 0, NULL, NULL),
    -- Branch Managers
    (3,  1, 'manager1',     '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewKyNiAYMyzJgW2y', TRUE, 0, NULL, NULL),
    (4,  2, 'manager2',     '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewKyNiAYMyzJgW2y', TRUE, 0, NULL, NULL),
    (5,  3, 'manager3',     '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewKyNiAYMyzJgW2y', TRUE, 0, NULL, NULL),
    -- Doctors
    (6,  1, 'doctor1',      '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewKyNiAYMyzJgW2y', TRUE, 0, NULL, NULL),
    (7,  1, 'doctor2',      '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewKyNiAYMyzJgW2y', TRUE, 0, NULL, NULL),
    (8,  2, 'doctor3',      '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewKyNiAYMyzJgW2y', TRUE, 0, NULL, NULL),
    (9,  2, 'doctor4',      '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewKyNiAYMyzJgW2y', TRUE, 0, NULL, NULL),
    (10, 3, 'doctor5',      '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewKyNiAYMyzJgW2y', TRUE, 0, NULL, NULL),
    -- Receptionists
    (11, 1, 'receptionist1','$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewKyNiAYMyzJgW2y', TRUE, 0, NULL, NULL),
    (12, 2, 'receptionist2','$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewKyNiAYMyzJgW2y', TRUE, 0, NULL, NULL),
    (13, 3, 'receptionist3','$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewKyNiAYMyzJgW2y', TRUE, 0, NULL, NULL),
    (14, 1, 'receptionist4','$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewKyNiAYMyzJgW2y', TRUE, 0, NULL, NULL),
    (15, 2, 'receptionist5','$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewKyNiAYMyzJgW2y', TRUE, 0, NULL, NULL);

-- Normalize the seeded staff credentials to the verified bcrypt hash for "medsync".
UPDATE staff
SET password_hash = '$2b$12$8oR8QG1CzwICjoIQqYHa1OKQX4KygnGybO52NTqU8SIrb.Dbr118a';

-- =============================================================================
-- SECTION 4: DOCTOR PROFILES + SPECIALTIES
-- =============================================================================

INSERT INTO doctor (user_id, license_number) VALUES
    (6,  'SLMC-12345'),
    (7,  'SLMC-23456'),
    (8,  'SLMC-34567'),
    (9,  'SLMC-45678'),
    (10, 'SLMC-56789');

-- Doctor specialties (some doctors have multiple)
INSERT INTO doctor_specialty (user_id, specialty_id) VALUES
    -- doctor1: General Medicine + Internal Medicine
    (6, 1), (6, 6),
    -- doctor2: Pediatrics
    (7, 2),
    -- doctor3: ENT + General Medicine
    (8, 3), (8, 1),
    -- doctor4: Dermatology
    (9, 4),
    -- doctor5: Cardiology
    (10, 5);

-- =============================================================================
-- SECTION 5: PATIENTS
-- =============================================================================

INSERT INTO patient
    (user_id, blood_group, emergency_contact, contact_name,
     registered_branch, registered_date, is_active)
VALUES
    (16, 'O+',  '0711111111', 'Sunil Alwis',      1, CURRENT_DATE - 365, TRUE),
    (17, 'A+',  '0712222222', 'Ranjith Ekanayake',2, CURRENT_DATE - 270, TRUE),
    (18, 'B+',  '0713333333', 'Kamal Munasinghe', 3, CURRENT_DATE - 180, TRUE),
    (19, 'AB+', '0714444444', 'Nimal Wijesinghe', 1, CURRENT_DATE - 90,  TRUE),
    (20, 'O-',  '0715555555', 'Chaminda Liyanage',2, CURRENT_DATE - 30,  TRUE);

-- Patient allergies
INSERT INTO patient_allergy (patient_id, allergy_id) VALUES
    (16, 1),  -- patient 1: Penicillin
    (16, 6),  -- patient 1: Aspirin (multiple allergies)
    (17, 2),  -- patient 2: Peanuts
    (18, 3),  -- patient 3: Latex
    (19, 4),  -- patient 4: Sulfa
    (20, 5);  -- patient 5: Shellfish

-- =============================================================================
-- SECTION 6: PATIENT INSURANCE
-- =============================================================================
-- Scenario coverage:
--   Patient 16: Active Gold policy (high coverage)
--   Patient 17: Active Executive policy (very high coverage)
--   Patient 18: Expired Silver policy (zero coverage via fn_is_policy_active)
--   Patient 19: Active Family Care policy
--   Patient 20: NO insurance (zero coverage path)
-- =============================================================================

INSERT INTO patient_insurance
    (insurance_id, patient_id, policy_id, insurance_card_number,
    start_date, end_date, is_active)
OVERRIDING SYSTEM VALUE VALUES
    (1, 16, 1, 'CEY-GOLD-001',   CURRENT_DATE - 200, CURRENT_DATE + 165, TRUE),
    (2, 17, 3, 'SOFT-EXEC-042',  CURRENT_DATE - 100, CURRENT_DATE + 265, TRUE),
    (3, 18, 2, 'CEY-SILV-107',   CURRENT_DATE - 400, CURRENT_DATE - 35,  TRUE),  -- EXPIRED
    (4, 19, 4, 'AIA-FAM-219',    CURRENT_DATE - 50,  CURRENT_DATE + 315, TRUE);
-- Patient 20 intentionally has NO insurance row.

SELECT setval('patient_insurance_insurance_id_seq',
              (SELECT MAX(insurance_id) FROM patient_insurance));

-- =============================================================================
-- SECTION 7: DOCTOR AVAILABILITY SLOTS (non-overlapping per doctor)
-- =============================================================================
-- EXCLUDE constraint (excl_slot_overlap) prevents overlaps per doctor.
-- All slots below are on distinct dates or non-overlapping time ranges.
-- =============================================================================

INSERT INTO doctor_availability_slots
    (slot_id, doctor_id, date, start_time, end_time, status)
OVERRIDING SYSTEM VALUE VALUES
    -- Doctor 1 (Colombo) — 3 slots
    (1,  6, CURRENT_DATE,                 '09:00', '09:30', 'Open'),
    (2,  6, CURRENT_DATE,                 '10:00', '10:30', 'Open'),
    (3,  6, CURRENT_DATE,                 '11:00', '11:30', 'Open'),
    (4,  6, CURRENT_DATE + 1,             '09:00', '09:30', 'Open'),
    -- Doctor 2 (Colombo) — 2 slots
    (5,  7, CURRENT_DATE,                 '14:00', '14:30', 'Open'),
    (6,  7, CURRENT_DATE + 1,             '15:00', '15:30', 'Open'),
    -- Doctor 3 (Kandy) — 3 slots
    (7,  8, CURRENT_DATE,                 '08:30', '09:00', 'Open'),
    (8,  8, CURRENT_DATE,                 '09:30', '10:00', 'Open'),
    (9,  8, CURRENT_DATE + 2,             '10:00', '10:30', 'Open'),
    -- Doctor 4 (Kandy) — 2 slots
    (10, 9, CURRENT_DATE,                 '13:00', '13:30', 'Open'),
    (11, 9, CURRENT_DATE + 1,             '14:00', '14:30', 'Open'),
    -- Doctor 5 (Galle) — 2 slots
    (12, 10, CURRENT_DATE,                '11:00', '11:30', 'Open'),
    (13, 10, CURRENT_DATE + 3,            '09:00', '09:30', 'Open');

SELECT setval('doctor_availability_slots_slot_id_seq',
              (SELECT MAX(slot_id) FROM doctor_availability_slots));

-- =============================================================================
-- SECTION 8: APPOINTMENTS
-- =============================================================================
-- Uses fn_book_appointment() to book the open slots below.
-- The function changes each selected slot from 'Open' to 'Booked'.
-- =============================================================================

-- 8.1 Completed appointments (via fn_book_appointment then fn_complete_appointment)
-- Appointment 1: Patient 16 (insured) with Doctor 1
SELECT fn_book_appointment(16, 1, 'Scheduled Visit') AS appt1;
-- Appointment 2: Patient 17 (insured) with Doctor 2
SELECT fn_book_appointment(17, 5, 'Scheduled Visit') AS appt2;
-- Appointment 3: Patient 18 (expired insurance) with Doctor 3
SELECT fn_book_appointment(18, 7, 'Follow-up') AS appt3;

-- 8.2 Scheduled (future) appointments
SELECT fn_book_appointment(19, 2, 'Scheduled Visit') AS appt4;
SELECT fn_book_appointment(20, 8, 'Scheduled Visit') AS appt5;

-- 8.3 Walk-in appointment (via fn_create_walk_in)
-- Patient 16 visits Doctor 4 (Dermatology) as a walk-in on a slot-free time
SELECT fn_create_walk_in(9, 16, CURRENT_DATE + 5, '09:00', '09:30') AS appt6;

-- 8.4 Rescheduled appointment: book slot 3 then reschedule to slot 4
SELECT fn_book_appointment(17, 3, 'Scheduled Visit') AS appt7;
SELECT fn_reschedule_appointment(
    (SELECT appointment_id FROM appointments WHERE slot_id = 3),
    4
) AS reschedule_result;

-- 8.5 Cancelled appointment: book slot 6 then cancel
SELECT fn_book_appointment(18, 6, 'Scheduled Visit') AS appt8;
SELECT fn_cancel_appointment(
    (SELECT appointment_id FROM appointments WHERE slot_id = 6)
) AS cancel_result;

-- 8.6 Completed appointment 4: Patient 19 with Doctor 5 (Galle)
SELECT fn_book_appointment(19, 12, 'Scheduled Visit') AS appt9;

-- =============================================================================
-- SECTION 9: COMPLETE APPOINTMENTS (consultations + treatments + invoices)
-- =============================================================================
-- fn_complete_appointment() atomically:
--   1. Checks appointment is 'Scheduled'
--   2. Sets status = 'Completed'
--   3. Inserts consultation (trigger fn_guard_consultation validates)
--   4. Inserts consultation_treatments (trigger fn_guard_consultation_treatments validates)
--   5. Computes total via fn_calculate_invoice_total()
--   6. Computes insurance via fn_calculate_insurance_coverage()
--   7. Inserts invoice
-- =============================================================================

-- 9.1 Appointment 1 — Patient 16 (Active Gold insurance) with Doctor 1
--     Treatments: General Consultation ×1, Blood Test ×1, ECG ×1
--     Total: 2500 + 1200 + 4500 = 8200
--     Insurance (Gold): 80% of 2500 + 70% of 1200 + 90% of 4500 = 2000 + 840 + 4050 = 6890
SELECT fn_complete_appointment(
    (SELECT appointment_id FROM appointments WHERE slot_id = 1),
    'Hypertension and elevated cholesterol',
    'Patient presented with elevated blood pressure (150/95). Ordered full blood count and ECG. Advised lifestyle modifications and follow-up in 2 weeks.',
    '[{"treatment_code": 1, "quantity": 1}, {"treatment_code": 6, "quantity": 1}, {"treatment_code": 8, "quantity": 1}]'::jsonb
) AS invoice_1;

-- 9.2 Appointment 2 — Patient 17 (Active Executive insurance) with Doctor 2 (Pediatric)
--     Treatments: Pediatric Consultation ×1, Blood Test ×2, Vaccination ×1
--     Total: 3000 + 2×1200 + 2000 = 7400
--     Insurance (Executive): Pediatric 85% of 3000 = 2550; Blood Test not covered by policy 3 (no row);
--     Vaccination not covered by policy 3 (no row) → total coverage = 2550
SELECT fn_complete_appointment(
    (SELECT appointment_id FROM appointments WHERE slot_id = 5),
    'Routine pediatric check-up with mild anemia',
    'Child presented for routine 5-year check-up. Mild iron-deficiency anemia noted. Blood tests ordered. Influenza vaccination administered. Dietary advice given.',
    '[{"treatment_code": 2, "quantity": 1}, {"treatment_code": 6, "quantity": 2}, {"treatment_code": 12, "quantity": 1}]'::jsonb
) AS invoice_2;

-- 9.3 Appointment 3 — Patient 18 (EXPIRED insurance) with Doctor 3 (ENT)
--     Treatments: ENT Examination ×1, Minor Procedure ×1
--     Total: 3500 + 8000 = 11500
--     Insurance: 0 (policy expired → fn_is_policy_active returns FALSE)
SELECT fn_complete_appointment(
    (SELECT appointment_id FROM appointments WHERE slot_id = 7),
    'Chronic sinusitis with nasal polyp',
    'Patient presented with chronic nasal congestion and facial pain. Nasal endoscopy revealed polyp. Minor excision performed under local anesthesia. Prescribed antibiotics and nasal spray.',
    '[{"treatment_code": 3, "quantity": 1}, {"treatment_code": 10, "quantity": 1}]'::jsonb
) AS invoice_3;

-- 9.4 Appointment 9 — Patient 19 (Active Family Care insurance) with Doctor 5 (Cardiology)
--     Treatments: Cardiology Consultation ×1, ECG ×1, X-Ray ×1
--     Total: 5000 + 4500 + 3800 = 13300
--     Insurance (Family Care): Cardiology not covered (no row for policy 4/treatment 5);
--     ECG not covered; X-Ray not covered → 0 coverage
SELECT fn_complete_appointment(
    (SELECT appointment_id FROM appointments WHERE slot_id = 12),
    'Chest pain — rule out cardiac event',
    'Patient presented with intermittent chest pain. ECG showed normal sinus rhythm. Chest X-ray clear. Advised stress test and cardiology follow-up. No acute cardiac event.',
    '[{"treatment_code": 5, "quantity": 1}, {"treatment_code": 8, "quantity": 1}, {"treatment_code": 9, "quantity": 1}]'::jsonb
) AS invoice_4;

-- =============================================================================
-- SECTION 10: PAYMENT SCENARIOS
-- =============================================================================
-- Exercise fn_record_payment() for all paths:
--   Invoice 1: Fully paid (two payments)
--   Invoice 2: Partially paid (one payment)
--   Invoice 3: No payment (Unpaid, zero coverage)
--   Invoice 4: Partially paid (two payments)
-- =============================================================================

-- 10.1 Invoice 1 (total 8200, insurance 6890, patient payable 1310)
--      Payment 1: 600 (Cash) → remaining 710
--      Payment 2: 710 (Card) → fully paid → status 'Paid'
SELECT fn_record_payment(1, 600.00, 'Cash');
SELECT fn_record_payment(1, 710.00, 'Card');

-- 10.2 Invoice 2 (total 7400, insurance 2550, patient payable 4850)
--      Payment 1: 2000 (Cash) → remaining 2850 → status 'Partially Paid'
SELECT fn_record_payment(2, 2000.00, 'Cash');

-- 10.3 Invoice 3 (total 11500, insurance 0, patient payable 11500)
--      No payment → stays 'Unpaid'

-- 10.4 Invoice 4 (total 13300, insurance 0, patient payable 13300)
--      Payment 1: 3000 (Insurance Settlement) → remaining 10300
--      Payment 2: 5000 (Card) → remaining 5300 → status 'Partially Paid'
SELECT fn_record_payment(4, 3000.00, 'Insurance Settlement');
SELECT fn_record_payment(4, 5000.00, 'Card');

-- =============================================================================
-- SECTION 11: ADMISSIONS (inpatient scenarios)
-- =============================================================================

INSERT INTO admission
    (admission_id, patient_id, admit_date, discharge_date, reason, status)
OVERRIDING SYSTEM VALUE VALUES
    (1, 16, CURRENT_DATE - 10, CURRENT_DATE - 7, 'Hypertensive crisis — observation', 'Discharged'),
    (2, 18, CURRENT_DATE - 5,  NULL,             'Post-operative recovery after nasal polyp excision', 'Admitted'),
    (3, 19, CURRENT_DATE - 2,  CURRENT_DATE - 1, 'Chest pain observation — ruled out MI', 'Discharged');

SELECT setval('admission_admission_id_seq', (SELECT MAX(admission_id) FROM admission));

-- =============================================================================
-- SECTION 12: AUDIT LOG — seed a few historical entries
-- =============================================================================
-- The audit triggers already fire on the inserts above. This section adds a
-- couple of manual entries to demonstrate the audit table structure.
-- =============================================================================

INSERT INTO audit_log (table_name, operation, row_pk, changed_by, old_data, new_data) VALUES
    ('app_user', 'UPDATE', '16', '1',
     '{"user_id": 16, "email": "old.pradeep@email.com"}'::jsonb,
     '{"user_id": 16, "email": "pradeep.a@email.com"}'::jsonb),
    ('branch',   'UPDATE', '1',  '1',
     '{"branch_id": 1, "phone_number": "0111111111"}'::jsonb,
     '{"branch_id": 1, "phone_number": "0112345678"}'::jsonb);

-- =============================================================================
-- SECTION 13: RESET IDENTITY SEQUENCES
-- =============================================================================
-- Ensures future app-generated IDs don't collide with explicit seed IDs.
-- =============================================================================

SELECT setval('role_role_id_seq',                   (SELECT MAX(role_id) FROM role));
SELECT setval('branch_branch_id_seq',               (SELECT MAX(branch_id) FROM branch));
SELECT setval('specialty_specialty_id_seq',         (SELECT MAX(specialty_id) FROM specialty));
SELECT setval('allergy_allergy_id_seq',             (SELECT MAX(allergy_id) FROM allergy));
SELECT setval('treatment_catalogue_treatment_code_seq', (SELECT MAX(treatment_code) FROM treatment_catalogue));
SELECT setval('insurance_policy_details_policy_id_seq', (SELECT MAX(policy_id) FROM insurance_policy_details));
SELECT setval('app_user_user_id_seq',               (SELECT MAX(user_id) FROM app_user));
SELECT setval('contact_contact_id_seq',             (SELECT MAX(contact_id) FROM contact));
SELECT setval('doctor_availability_slots_slot_id_seq', (SELECT MAX(slot_id) FROM doctor_availability_slots));
SELECT setval('appointments_appointment_id_seq',    (SELECT MAX(appointment_id) FROM appointments));
SELECT setval('consultations_consultation_id_seq',  (SELECT MAX(consultation_id) FROM consultations));
SELECT setval('invoices_invoice_id_seq',            (SELECT MAX(invoice_id) FROM invoices));
SELECT setval('payments_payment_id_seq',            (SELECT MAX(payment_id) FROM payments));
SELECT setval('admission_admission_id_seq',         (SELECT MAX(admission_id) FROM admission));
SELECT setval('patient_insurance_insurance_id_seq', (SELECT MAX(insurance_id) FROM patient_insurance));

COMMIT;

-- =============================================================================
-- ========================================
-- SEED VERIFICATION
-- ========================================
-- =============================================================================
-- All queries below are READ-ONLY. Run them to verify the seed data.
-- =============================================================================

\echo ''
\echo '=== 1. USER COUNTS BY ROLE ==='
SELECT r.role_name, COUNT(*) AS user_count
FROM app_user u
JOIN role r ON r.role_id = u.role_id
GROUP BY r.role_name
ORDER BY r.role_name;

\echo ''
\echo '=== 2. USERS BY BRANCH ==='
SELECT b.name AS branch_name, r.role_name, COUNT(*) AS staff_count
FROM staff s
JOIN branch b ON b.branch_id = s.branch_id
JOIN app_user u ON u.user_id = s.user_id
JOIN role r ON r.role_id = u.role_id
GROUP BY b.name, r.role_name
ORDER BY b.name, r.role_name;

\echo ''
\echo '=== 3. DOCTORS AND SPECIALTIES ==='
SELECT u.first_name || ' ' || u.last_name AS doctor_name,
       d.license_number,
       b.name AS branch,
       STRING_AGG(sp.name, ', ' ORDER BY sp.name) AS specialties
FROM doctor d
JOIN app_user u ON u.user_id = d.user_id
JOIN staff s ON s.user_id = d.user_id
JOIN branch b ON b.branch_id = s.branch_id
LEFT JOIN doctor_specialty ds ON ds.user_id = d.user_id
LEFT JOIN specialty sp ON sp.specialty_id = ds.specialty_id
GROUP BY u.first_name, u.last_name, d.license_number, b.name
ORDER BY doctor_name;

\echo ''
\echo '=== 4. PATIENTS AND INSURANCE STATUS ==='
SELECT u.first_name || ' ' || u.last_name AS patient_name,
       p.patient_code,
       p.blood_group,
       b.name AS registered_branch,
       CASE
           WHEN pi.insurance_id IS NULL THEN 'No Insurance'
           WHEN pi.end_date < CURRENT_DATE THEN 'Expired: ' || ipd.provider_name || ' ' || ipd.policy_name
           WHEN pi.start_date > CURRENT_DATE THEN 'Future'
           ELSE 'Active: ' || ipd.provider_name || ' ' || ipd.policy_name
       END AS insurance_status
FROM patient p
JOIN app_user u ON u.user_id = p.user_id
JOIN branch b ON b.branch_id = p.registered_branch
LEFT JOIN patient_insurance pi ON pi.patient_id = p.user_id
LEFT JOIN insurance_policy_details ipd ON ipd.policy_id = pi.policy_id
ORDER BY patient_name;

\echo ''
\echo '=== 5. APPOINTMENT STATUS DISTRIBUTION ==='
SELECT status, COUNT(*) AS count
FROM appointments
GROUP BY status
ORDER BY status;

\echo ''
\echo '=== 6. COMPLETED APPOINTMENTS AND CONSULTATIONS ==='
SELECT a.appointment_code,
       a.status AS appt_status,
       u.first_name || ' ' || u.last_name AS patient_name,
       c.consultation_id,
       c.diagnosis,
       c.created_date
FROM appointments a
JOIN patient p ON p.user_id = a.patient_id
JOIN app_user u ON u.user_id = p.user_id
LEFT JOIN consultations c ON c.appointment_id = a.appointment_id
WHERE a.status = 'Completed'
ORDER BY a.appointment_id;

\echo ''
\echo '=== 7. CONSULTATION TREATMENTS ==='
SELECT c.consultation_id,
       tc.treatment_name,
       ct.quantity,
       ct.unit_price,
       (ct.quantity * ct.unit_price) AS line_total
FROM consultation_treatments ct
JOIN consultations c ON c.consultation_id = ct.consultation_id
JOIN treatment_catalogue tc ON tc.treatment_code = ct.treatment_code
ORDER BY c.consultation_id, tc.treatment_name;

\echo ''
\echo '=== 8. INVOICES AND TOTALS ==='
SELECT i.invoice_code,
       u.first_name || ' ' || u.last_name AS patient_name,
       i.total_amount,
       i.insurance_amount,
       (i.total_amount - i.insurance_amount) AS patient_payable,
       i.status,
       i.created_at::DATE AS created_date
FROM invoices i
JOIN appointments a ON a.appointment_id = i.appointment_id
JOIN patient p ON p.user_id = a.patient_id
JOIN app_user u ON u.user_id = p.user_id
ORDER BY i.invoice_id;

\echo ''
\echo '=== 9. PAYMENTS AND OUTSTANDING BALANCES ==='
SELECT i.invoice_code,
       i.total_amount,
       i.insurance_amount,
       COALESCE(SUM(py.amount_paid), 0) AS total_paid,
       (i.total_amount - i.insurance_amount - COALESCE(SUM(py.amount_paid), 0)) AS outstanding,
       i.status,
       COUNT(py.payment_id) AS payment_count,
       STRING_AGG(DISTINCT py.payment_type::text, ', ') AS payment_types
FROM invoices i
LEFT JOIN payments py ON py.invoice_id = i.invoice_id
GROUP BY i.invoice_id, i.invoice_code, i.total_amount, i.insurance_amount, i.status
ORDER BY i.invoice_id;

\echo ''
\echo '=== 10. INSURANCE COVERAGE CALCULATIONS (via function) ==='
SELECT i.invoice_code,
       u.first_name || ' ' || u.last_name AS patient_name,
       i.total_amount,
       i.insurance_amount AS stored_insurance,
       fn_calculate_insurance_coverage(p.user_id, c.consultation_id) AS recalculated_insurance,
       CASE WHEN i.insurance_amount = fn_calculate_insurance_coverage(p.user_id, c.consultation_id)
            THEN 'MATCH' ELSE 'MISMATCH' END AS check_result
FROM invoices i
JOIN consultations c ON c.consultation_id = i.consultation_id
JOIN appointments a ON a.appointment_id = i.appointment_id
JOIN patient p ON p.user_id = a.patient_id
JOIN app_user u ON u.user_id = p.user_id
ORDER BY i.invoice_id;

\echo ''
\echo '=== 11. BRANCH-WISE STATISTICS ==='
SELECT b.name AS branch_name,
       COUNT(DISTINCT CASE WHEN r.role_name = 'Doctor' THEN s.user_id END) AS doctors,
       COUNT(DISTINCT CASE WHEN r.role_name = 'Receptionist' THEN s.user_id END) AS receptionists,
       COUNT(DISTINCT CASE WHEN r.role_name = 'Branch Manager' THEN s.user_id END) AS managers,
       COUNT(DISTINCT p.user_id) AS registered_patients
FROM branch b
LEFT JOIN staff s ON s.branch_id = b.branch_id
LEFT JOIN app_user u ON u.user_id = s.user_id
LEFT JOIN role r ON r.role_id = u.role_id
LEFT JOIN patient p ON p.registered_branch = b.branch_id
GROUP BY b.name
ORDER BY b.name;

\echo ''
\echo '=== 12. POLICY TREATMENT COVERAGE MATRIX ==='
SELECT ipd.provider_name, ipd.policy_name,
       tc.treatment_name,
       ptc.coverage_percentage
FROM policy_treatment_coverage ptc
JOIN insurance_policy_details ipd ON ipd.policy_id = ptc.policy_id
JOIN treatment_catalogue tc ON tc.treatment_code = ptc.treatment_code
ORDER BY ipd.provider_name, ipd.policy_name, tc.treatment_name;

\echo ''
\echo '=== 13. DOCTOR REVENUE (reporting view) ==='
SELECT * FROM v_doctor_revenue ORDER BY revenue_amount DESC;

\echo ''
\echo '=== 14. OUTSTANDING BALANCES (reporting view) ==='
SELECT * FROM v_outstanding_balances ORDER BY outstanding_amount DESC;

\echo ''
\echo '=== 15. INSURANCE VS OUT-OF-POCKET (reporting view) ==='
SELECT * FROM v_insurance_vs_out_of_pocket ORDER BY invoice_id;

\echo ''
\echo '=== SEED COMPLETE ==='
\echo '20 users, 3 branches, 5 doctors, 5 patients, 5 receptionists, 3 managers, 2 admins'
\echo '4 completed appointments, 3 scheduled, 1 walk-in, 1 rescheduled, 1 cancelled'
\echo '4 invoices, 5 payments, 1 paid, 2 partially paid, 1 unpaid'
\echo '3 admissions, 4 insurance policies, 15 coverage rules'
\echo '========================================'