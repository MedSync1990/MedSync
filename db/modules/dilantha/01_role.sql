-- =============================================================================
-- 01_role.sql — Role table
-- Module: Auth & Branch/Staff Management (Dilantha)
-- Ref:    database.md §2.1
-- =============================================================================
-- The ROLE table is the first table created because every app_user row
-- references it. Five roles are seeded in the seed script (01_branches_staff.sql):
-- Administrator, Branch Manager, Doctor, Receptionist, Patient.
-- =============================================================================

CREATE TABLE role (
    role_id     INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    role_name   VARCHAR(30) NOT NULL UNIQUE
);
