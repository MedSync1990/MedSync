-- ============================================================================
-- Table: DOCTOR
-- Module: Doctor/Specialty & Appointment Management
-- Owner: Kalana Jayawardena
-- Description: Doctor profile extending staff/user with medical credentials
-- ============================================================================

CREATE TABLE IF NOT EXISTS doctor (
    user_id INT PRIMARY KEY,
    license_number VARCHAR(50) NOT NULL UNIQUE,
    consultation_fee NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    -- AGENTS.md rule: No hard deletes on DOCTOR, use is_active flag
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
);

-- Foreign key to STAFF table (owned by Dilantha):
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'staff') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'fk_doctor_staff' AND table_name = 'doctor'
        ) THEN
            ALTER TABLE doctor 
                ADD CONSTRAINT fk_doctor_staff FOREIGN KEY (user_id) 
                REFERENCES staff(user_id) ON DELETE RESTRICT;
        END IF;
    END IF;
END $$;

-- Index for doctor active status and license lookup
CREATE INDEX IF NOT EXISTS idx_doctor_is_active ON doctor(is_active);
