-- =============================================================================
-- 03_app_user.sql — Application User table + Contact table
-- Module: Auth & Branch/Staff Management (Dilantha)
-- Ref:    database.md §2.1
-- =============================================================================
-- The ERD's "USER" entity is implemented as "app_user" because USER is a
-- reserved word in PostgreSQL. Every person in the system (staff, patient,
-- doctor) is first an app_user row.
--
-- The contact table stores phone numbers for users (one-to-many).
-- =============================================================================

CREATE TABLE app_user (
    user_id        INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    role_id        INT NOT NULL REFERENCES role(role_id),
    first_name     VARCHAR(60) NOT NULL,
    middle_name    VARCHAR(60),
    last_name      VARCHAR(60) NOT NULL,
    -- NIC format: old format (9 digits + V/v/X/x) or new format (12 digits)
    id_number      VARCHAR(12) NOT NULL UNIQUE
                     CHECK (id_number ~ '^([0-9]{9}[VvXx]|[0-9]{12})$'),
    address        VARCHAR(255) NOT NULL,
    birthdate      DATE NOT NULL CHECK (birthdate <= CURRENT_DATE),
    gender         gender_enum NOT NULL,
    marital_status VARCHAR(20),
    email          VARCHAR(120) CHECK (email IS NULL OR email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast NIC lookups (patient search FR-PM-04)
CREATE INDEX idx_app_user_id_number ON app_user(id_number);

-- ─────────────────────────────────────────────────────────────────────────────
-- Contact table — phone numbers for users
-- Ref: database.md §2.1
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE contact (
    contact_id    INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id       INT NOT NULL REFERENCES app_user(user_id) ON DELETE CASCADE,
    phone_number  VARCHAR(10) NOT NULL CHECK (phone_number ~ '^[0-9]{10}$')
);

CREATE INDEX idx_contact_user ON contact(user_id);
