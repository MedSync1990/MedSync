-- db/seed/01_branches_staff.sql
-- Seed data for roles, branches, users, and staff

-- 1. Insert Roles (with descriptions for the added column)
INSERT INTO "ROLE" (role_name, description) VALUES
('Admin', 'System Administrator with full access'),
('Branch Manager', 'Manages operations at a specific branch'),
('Doctor', 'Medical professional providing consultations'),
('Receptionist', 'Handles appointments and billing'),
('Patient', 'Clinic patient with access to own records')
ON CONFLICT (role_name) DO NOTHING;

-- 2. Insert Branches (with email for the added column)
INSERT INTO "BRANCH" (name, address, phone_number, email) VALUES
('Colombo', '123 Galle Road, Colombo 03', '0112345678', 'colombo@medsync.lk'),
('Kandy', '45 Dalada Vidiya, Kandy', '0812345678', 'kandy@medsync.lk'),
('Galle', '78 Main Street, Galle', '0912345678', 'galle@medsync.lk');

-- 3. Insert Users (1 Admin + 1 Branch Manager per branch)
-- is_active, failed_login_attempts, created_at, updated_at use their defaults
INSERT INTO "USER" (role_id, first_name, middle_name, last_name, id_number, address, birthdate, gender, marital_status, email) VALUES
-- Colombo
((SELECT role_id FROM "ROLE" WHERE role_name = 'Admin'), 'Amara', NULL, 'Perera', '912345678V', '45 Temple Road, Colombo 05', '1991-06-15', 'Female', 'Single', 'admin.cmb@medsync.lk'),
((SELECT role_id FROM "ROLE" WHERE role_name = 'Branch Manager'), 'Kamal', 'Dinesh', 'Silva', '851234567V', '12 Kandy Road, Colombo 10', '1985-03-22', 'Male', 'Married', 'bm.cmb@medsync.lk'),
-- Kandy
((SELECT role_id FROM "ROLE" WHERE role_name = 'Admin'), 'Nimal', NULL, 'Fernando', '198512345678', '67 Peradeniya Road, Kandy', '1985-11-08', 'Male', 'Married', 'admin.kdy@medsync.lk'),
((SELECT role_id FROM "ROLE" WHERE role_name = 'Branch Manager'), 'Sunil', 'Kumar', 'Jayawardena', '199012345678', '23 Hill Street, Kandy', '1990-01-30', 'Male', 'Single', 'bm.kdy@medsync.lk'),
-- Galle
((SELECT role_id FROM "ROLE" WHERE role_name = 'Admin'), 'Priyanka', NULL, 'De Silva', '881234567V', '89 Main Street, Galle', '1988-07-19', 'Female', 'Married', 'admin.gle@medsync.lk'),
((SELECT role_id FROM "ROLE" WHERE role_name = 'Branch Manager'), 'Roshan', 'Lakmal', 'Bandara', '921234567V', '34 Church Street, Galle', '1992-12-05', 'Male', 'Single', 'bm.gle@medsync.lk');

-- 4. Insert Staff Records (password hashed with pgcrypto bcrypt)
-- Default password: 'MedSync@2026'
-- is_active, hire_date, created_at, updated_at use their defaults
INSERT INTO "STAFF" (user_id, branch_id, username, password) VALUES
((SELECT user_id FROM "USER" WHERE email = 'admin.cmb@medsync.lk'), (SELECT branch_id FROM "BRANCH" WHERE name = 'Colombo'), 'admin.cmb', crypt('MedSync@2026', gen_salt('bf'))),
((SELECT user_id FROM "USER" WHERE email = 'bm.cmb@medsync.lk'), (SELECT branch_id FROM "BRANCH" WHERE name = 'Colombo'), 'bm.cmb', crypt('MedSync@2026', gen_salt('bf'))),
((SELECT user_id FROM "USER" WHERE email = 'admin.kdy@medsync.lk'), (SELECT branch_id FROM "BRANCH" WHERE name = 'Kandy'), 'admin.kdy', crypt('MedSync@2026', gen_salt('bf'))),
((SELECT user_id FROM "USER" WHERE email = 'bm.kdy@medsync.lk'), (SELECT branch_id FROM "BRANCH" WHERE name = 'Kandy'), 'bm.kdy', crypt('MedSync@2026', gen_salt('bf'))),
((SELECT user_id FROM "USER" WHERE email = 'admin.gle@medsync.lk'), (SELECT branch_id FROM "BRANCH" WHERE name = 'Galle'), 'admin.gle', crypt('MedSync@2026', gen_salt('bf'))),
((SELECT user_id FROM "USER" WHERE email = 'bm.gle@medsync.lk'), (SELECT branch_id FROM "BRANCH" WHERE name = 'Galle'), 'bm.gle', crypt('MedSync@2026', gen_salt('bf')));
