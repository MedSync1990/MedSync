-- ============================================================================
-- Table: DOCTOR_AVAILABILITY_SLOTS
-- Module: Doctor/Specialty & Appointment Management
-- Owner: Kalana Jayawardena
-- Description: Pre-defined consultation slots for doctors to book appointments
-- ============================================================================

-- PostgreSQL ENUM for slot status
DO $$ BEGIN
    CREATE TYPE slot_status AS ENUM ('Available', 'Booked', 'Cancelled');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS doctor_availability_slots (
    slot_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    doctor_id INT NOT NULL,
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    status slot_status NOT NULL DEFAULT 'Available',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_slot_doctor FOREIGN KEY (doctor_id) 
        REFERENCES doctor(user_id) 
        ON DELETE CASCADE,
    CONSTRAINT chk_slot_time_valid CHECK (start_time < end_time)
);

-- Index per database.md §5: fast availability lookups during appointment booking
CREATE INDEX IF NOT EXISTS idx_slots_doctor_date_status 
    ON doctor_availability_slots(doctor_id, date, status);
