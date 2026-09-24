-- =============================================================================
-- 01_auth_branch_staff.sql — Entry point for Module 01 (Dilantha)
-- =============================================================================
-- This is the thin entry point that Ashen's merge step concatenates into
-- db/schema.sql. It just \i's the per-table files in FK-safe order.
--
-- To run this module standalone:
--   psql -f db/modules/01_auth_branch_staff.sql
--
-- File layout (db/modules/dilantha/):
--   01_role.sql                  — CREATE TABLE role
--   02_branch.sql                — CREATE TABLE branch
--   03_app_user.sql              — CREATE TABLE app_user + contact
--   04_staff.sql                 — CREATE TABLE staff
--   05_protection_functions.sql  — fn_deactivate_branch/staff + fn_block_hard_delete + triggers
--   06_auth_functions.sql        — fn_register_login_attempt (lockout)
--   07_pg_roles.sql              — catms_owner/app/readonly/admin + grants
-- =============================================================================

-- Custom types needed by this module
DO $$ BEGIN
	CREATE TYPE gender_enum AS ENUM ('Male', 'Female', 'Other');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
	CREATE TYPE slot_status_enum AS ENUM ('Open', 'Booked', 'Blocked');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
	CREATE TYPE appointment_type_enum AS ENUM ('Scheduled Visit', 'Walk-in', 'Follow-up');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
	CREATE TYPE appointment_status_enum AS ENUM ('Scheduled', 'Completed', 'Cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
	CREATE TYPE admission_status_enum AS ENUM ('Admitted', 'Discharged');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
	CREATE TYPE invoice_status_enum AS ENUM ('Unpaid', 'Partially Paid', 'Paid');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
	CREATE TYPE payment_type_enum AS ENUM ('Cash', 'Card', 'Insurance Settlement');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Tables (FK-safe order)
\i db/modules/dilantha/01_role.sql
\i db/modules/dilantha/02_branch.sql
\i db/modules/dilantha/03_app_user.sql
\i db/modules/dilantha/04_staff.sql

-- Functions and triggers (tables must exist first)
\i db/modules/dilantha/05_protection_functions.sql
\i db/modules/dilantha/06_auth_functions.sql

-- PostgreSQL roles and grants (tables must exist first)
\i db/modules/dilantha/07_pg_roles.sql
