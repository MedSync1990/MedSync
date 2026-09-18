-- ============================================================================
-- Table: doctor
-- Role: Holding data (license_number) of the doctors
-- Owner: Kalana Jayawardena
-- ============================================================================

CREATE TABLE IF NOT EXISTS doctor (
    user_id         INT PRIMARY KEY,
    license_number  VARCHAR(50) NOT NULL UNIQUE
);

-- Conditional Foreign Key Creation
-- Foreign key to staff(user_id) ON DELETE RESTRICT
-- throws an error if executed out of order (staff table doesn't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_constraint 
        WHERE conname = 'fk_doctor_staff'
    ) THEN
            -- Adding foreign key
            -- ON DELETE RESTRICT make sure record cannot be deleted from staff table
            -- if a record on doctor table exists
        ALTER TABLE doctor 
            ADD CONSTRAINT fk_doctor_staff 
            FOREIGN KEY (user_id) 
            REFERENCES staff(user_id) 
            ON DELETE RESTRICT;
    END IF;
END $$;
