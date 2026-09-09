-- ============================================================================
-- Table: doctor
-- Module: 02 - Doctor & Appointment Management
-- Owner: Kalana Jayawardena
-- Reference: docs/database.md §2.1
-- ============================================================================

CREATE TABLE IF NOT EXISTS doctor (
    user_id         INT PRIMARY KEY,
    license_number  VARCHAR(30) NOT NULL UNIQUE
);

-- Foreign key to staff(user_id) ON DELETE RESTRICT
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
