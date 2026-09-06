-- db/modules/01_auth_branch_staff.sql
-- Auth & Branch/Staff Management Module (Dilantha)

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Drop existing tables (to recreate with correct schema)
DROP TABLE IF EXISTS "STAFF" CASCADE;
DROP TABLE IF EXISTS "USER" CASCADE;
DROP TABLE IF EXISTS "BRANCH" CASCADE;
DROP TABLE IF EXISTS "ROLE" CASCADE;
DROP TYPE IF EXISTS gender_enum CASCADE;

-- Create enum type for gender
CREATE TYPE gender_enum AS ENUM ('Male', 'Female', 'Other');

-- 1. ROLE table
CREATE TABLE "ROLE" (
    role_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    role_name VARCHAR(100) NOT NULL UNIQUE,
    -- Added: helps admins understand what each role can do
    description TEXT
);

-- 2. BRANCH table
CREATE TABLE "BRANCH" (
    branch_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    address VARCHAR(255),
    phone_number VARCHAR(10),
    -- Added: branch contact email for patient inquiries
    email VARCHAR(100),
    -- Added: soft-delete (cannot delete branch with historical records)
    is_active BOOLEAN DEFAULT TRUE,
    -- Added: audit trail
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger to prevent branch deletion if staff are assigned (FR-DMI-08)
CREATE OR REPLACE FUNCTION fn_prevent_branch_delete()
RETURNS TRIGGER AS $$
BEGIN
    IF EXISTS (SELECT 1 FROM "STAFF" WHERE branch_id = OLD.branch_id) THEN
        RAISE EXCEPTION 'Cannot delete branch while staff are assigned to it (FR-DMI-08)';
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_branch_no_delete_with_staff
BEFORE DELETE ON "BRANCH"
FOR EACH ROW
EXECUTE FUNCTION fn_prevent_branch_delete();

-- 3. USER table
CREATE TABLE "USER" (
    user_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    role_id INT NOT NULL REFERENCES "ROLE"(role_id) ON DELETE RESTRICT,
    first_name VARCHAR(50) NOT NULL,
    middle_name VARCHAR(50),
    last_name VARCHAR(50) NOT NULL,
    id_number VARCHAR(12) UNIQUE NOT NULL CHECK (id_number ~ '^([0-9]{9}[VvXx]|[0-9]{12})$'),
    address VARCHAR(255),
    birthdate DATE,
    gender gender_enum,
    marital_status VARCHAR(20),
    email VARCHAR(100) UNIQUE NOT NULL,
    -- Added: soft-delete (cannot delete users with historical records)
    is_active BOOLEAN DEFAULT TRUE,
    -- Added: security - brute-force protection
    failed_login_attempts INT DEFAULT 0,
    locked_until TIMESTAMPTZ,
    -- Added: audit trail
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. STAFF table (user_id is PK and FK as per ERD)
-- Note: is_active, created_at, updated_at are inherited from USER (1:1 relationship)
CREATE TABLE "STAFF" (
    user_id INT PRIMARY KEY REFERENCES "USER"(user_id) ON DELETE CASCADE,
    branch_id INT NOT NULL REFERENCES "BRANCH"(branch_id) ON DELETE RESTRICT,
    username VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(150) NOT NULL
);
