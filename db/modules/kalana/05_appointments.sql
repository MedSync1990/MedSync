-- ============================================================================
-- Table: APPOINTMENTS
-- Module: Doctor/Specialty & Appointment Management
-- Owner: Kalana Jayawardena
-- Description: Patient appointment bookings with doctor overlap prevention (FR-AM-03)
-- ============================================================================

-- PostgreSQL extension required for btree indexing inside GiST exclusion constraints
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- PostgreSQL ENUMs for appointment type and status matching ERD
DO $$ BEGIN
    CREATE TYPE appointment_type AS ENUM ('Consultation', 'Walk-in', 'Follow-up');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE appointment_status AS ENUM ('Scheduled', 'Completed', 'Cancelled');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS appointments (
    appointment_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    doctor_id INT NOT NULL,
    patient_id INT NOT NULL,
    slot_id INT NULL, -- NULL for emergency walk-ins
    appointment_type appointment_type NOT NULL DEFAULT 'Consultation',
    appointment_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    status appointment_status NOT NULL DEFAULT 'Scheduled',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Generated timestamp range for scheduling calculations
    -- tsrange over (date + time) is IMMUTABLE and natively supported for generated columns
    appointment_time_range TSRANGE GENERATED ALWAYS AS (
        tsrange(appointment_date + start_time, appointment_date + end_time)
    ) STORED,

    CONSTRAINT fk_apt_doctor FOREIGN KEY (doctor_id) 
        REFERENCES doctor(user_id) 
        ON DELETE RESTRICT,
    CONSTRAINT fk_apt_slot FOREIGN KEY (slot_id) 
        REFERENCES doctor_availability_slots(slot_id) 
        ON DELETE SET NULL,
    CONSTRAINT chk_apt_time_valid CHECK (start_time < end_time),

    -- FR-AM-03: PostgreSQL engine-level exclusion constraint preventing overlapping bookings
    -- Refuses any insert/update if another active (non-cancelled) appointment overlaps for the same doctor
    CONSTRAINT no_overlapping_doctor_appointments EXCLUDE USING gist (
        doctor_id WITH =,
        appointment_time_range WITH &&
    ) WHERE (status <> 'Cancelled')
);

-- Foreign key to PATIENT table (owned by Chenith):
-- Enforced if patient table is already created in the schema
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'patient') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'fk_apt_patient' AND table_name = 'appointments'
        ) THEN
            ALTER TABLE appointments 
                ADD CONSTRAINT fk_apt_patient FOREIGN KEY (patient_id) 
                REFERENCES patient(user_id) ON DELETE RESTRICT;
        END IF;
    END IF;
END $$;

-- Indexes for common queries per database.md §5:
-- 1. Daily schedules and doctor appointment list
CREATE INDEX IF NOT EXISTS idx_appointments_doctor_date_status 
    ON appointments(doctor_id, appointment_date, status);

-- 2. Patient medical history lookup
CREATE INDEX IF NOT EXISTS idx_appointments_patient_id 
    ON appointments(patient_id);
