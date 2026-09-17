-- =============================================================================
-- 04_staff.sql — Staff table
-- Module: Auth & Branch/Staff Management (Dilantha)
-- Ref:    database.md §2.1
-- =============================================================================
-- Staff extends app_user (1:1 via PK/FK on user_id). Only staff members have
-- login credentials (username/password_hash). Patients never get a staff row.
--
-- Security columns:
--   - password_hash:          Argon2/bcrypt hash (app verifies, DB never sees plaintext)
--   - failed_login_attempts:  Counter for brute-force lockout (FR-UAC)
--   - locked_until:           Timestamp when lockout expires
--   - last_login_at:          Audit trail for last successful login (FR-UAC-06)
-- =============================================================================

CREATE TABLE staff (
    user_id                INT PRIMARY KEY REFERENCES app_user(user_id) ON DELETE RESTRICT,
    branch_id              INT NOT NULL REFERENCES branch(branch_id),
    username               VARCHAR(50) NOT NULL UNIQUE,
    password_hash          VARCHAR(255) NOT NULL,
    is_active              BOOLEAN NOT NULL DEFAULT TRUE,
    failed_login_attempts  SMALLINT NOT NULL DEFAULT 0,
    locked_until           TIMESTAMPTZ,
    last_login_at          TIMESTAMPTZ
);

CREATE INDEX idx_staff_branch ON staff(branch_id);
