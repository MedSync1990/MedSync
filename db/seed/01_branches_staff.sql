-- =============================================================================
-- 01_branches_staff.sql — Seed data for Module 01 (Dilantha)
-- =============================================================================
-- Seeds: 5 roles, 3 branches (Colombo, Kandy, Galle),
--        6 app_user rows (1 Administrator + 1 Branch Manager per branch),
--        6 staff rows with bcrypt-hashed passwords.
--
-- Default password for all staff: 'MedSync@2026'
-- Requires: CREATE EXTENSION IF NOT EXISTS pgcrypto; (run before this file)
-- =============================================================================

-- Enable pgcrypto for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Roles (all five, including 'Patient' per database.md §2.8)
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO role (role_name) VALUES
    ('Administrator'),
    ('Branch Manager'),
    ('Doctor'),
    ('Receptionist'),
    ('Patient')
ON CONFLICT (role_name) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Branches (Colombo, Kandy, Galle)
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO branch (name, address, phone_number) VALUES
    ('Colombo', '123 Galle Road, Colombo 03',  '0112345678'),
    ('Kandy',   '45 Dalada Vidiya, Kandy',      '0812345678'),
    ('Galle',   '78 Main Street, Galle',         '0912345678');

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. App Users (1 Administrator + 1 Branch Manager per branch = 6 users)
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO app_user (role_id, first_name, middle_name, last_name, id_number, address, birthdate, gender, marital_status, email) VALUES
    -- Colombo Administrator
    ((SELECT role_id FROM role WHERE role_name = 'Administrator'),
     'Amara', NULL, 'Perera', '912345678V',
     '45 Temple Road, Colombo 05', '1991-06-15', 'Female', 'Single',
     'admin.cmb@medsync.lk'),
    -- Colombo Branch Manager
    ((SELECT role_id FROM role WHERE role_name = 'Branch Manager'),
     'Kamal', 'Dinesh', 'Silva', '851234567V',
     '12 Kandy Road, Colombo 10', '1985-03-22', 'Male', 'Married',
     'bm.cmb@medsync.lk'),
    -- Kandy Administrator
    ((SELECT role_id FROM role WHERE role_name = 'Administrator'),
     'Nimal', NULL, 'Fernando', '198512345678',
     '67 Peradeniya Road, Kandy', '1985-11-08', 'Male', 'Married',
     'admin.kdy@medsync.lk'),
    -- Kandy Branch Manager
    ((SELECT role_id FROM role WHERE role_name = 'Branch Manager'),
     'Sunil', 'Kumar', 'Jayawardena', '199012345678',
     '23 Hill Street, Kandy', '1990-01-30', 'Male', 'Single',
     'bm.kdy@medsync.lk'),
    -- Galle Administrator
    ((SELECT role_id FROM role WHERE role_name = 'Administrator'),
     'Priyanka', NULL, 'De Silva', '881234567V',
     '89 Main Street, Galle', '1988-07-19', 'Female', 'Married',
     'admin.gle@medsync.lk'),
    -- Galle Branch Manager
    ((SELECT role_id FROM role WHERE role_name = 'Branch Manager'),
     'Roshan', 'Lakmal', 'Bandara', '921234567V',
     '34 Church Street, Galle', '1992-12-05', 'Male', 'Single',
     'bm.gle@medsync.lk');

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Staff records (password_hash using pgcrypto bcrypt)
--    Default password: 'MedSync@2026'
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO staff (user_id, branch_id, username, password_hash) VALUES
    -- Colombo
    ((SELECT user_id FROM app_user WHERE email = 'admin.cmb@medsync.lk'),
     (SELECT branch_id FROM branch WHERE name = 'Colombo'),
     'admin.cmb', crypt('MedSync@2026', gen_salt('bf'))),

    ((SELECT user_id FROM app_user WHERE email = 'bm.cmb@medsync.lk'),
     (SELECT branch_id FROM branch WHERE name = 'Colombo'),
     'bm.cmb', crypt('MedSync@2026', gen_salt('bf'))),

    -- Kandy
    ((SELECT user_id FROM app_user WHERE email = 'admin.kdy@medsync.lk'),
     (SELECT branch_id FROM branch WHERE name = 'Kandy'),
     'admin.kdy', crypt('MedSync@2026', gen_salt('bf'))),

    ((SELECT user_id FROM app_user WHERE email = 'bm.kdy@medsync.lk'),
     (SELECT branch_id FROM branch WHERE name = 'Kandy'),
     'bm.kdy', crypt('MedSync@2026', gen_salt('bf'))),

    -- Galle
    ((SELECT user_id FROM app_user WHERE email = 'admin.gle@medsync.lk'),
     (SELECT branch_id FROM branch WHERE name = 'Galle'),
     'admin.gle', crypt('MedSync@2026', gen_salt('bf'))),

    ((SELECT user_id FROM app_user WHERE email = 'bm.gle@medsync.lk'),
     (SELECT branch_id FROM branch WHERE name = 'Galle'),
     'bm.gle', crypt('MedSync@2026', gen_salt('bf')));
