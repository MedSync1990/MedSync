-- ============================================================================
-- MedSync CATMS — Central Database Schema (PostgreSQL 16)
-- Integration target: db/schema.sql
-- ============================================================================

-- Global Extensions
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- ============================================================================
-- MODULE: Doctor, Specialty & Appointment Management (Owner: Kalana)
-- ============================================================================

-- 1. SPECIALTY
CREATE TABLE IF NOT EXISTS specialty (
    speciality_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description VARCHAR(500),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_specialty_name ON specialty(name);

-- 2. DOCTOR
CREATE TABLE IF NOT EXISTS doctor (
    user_id INT PRIMARY KEY,
    license_number VARCHAR(50) NOT NULL UNIQUE,
    consultation_fee NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_doctor_is_active ON doctor(is_active);

-- 3. DOCTOR_SPECIALTY
CREATE TABLE IF NOT EXISTS doctor_specialty (
    user_id INT NOT NULL,
    speciality_id INT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, speciality_id),
    CONSTRAINT fk_ds_doctor FOREIGN KEY (user_id) 
        REFERENCES doctor(user_id) 
        ON DELETE CASCADE,
    CONSTRAINT fk_ds_specialty FOREIGN KEY (speciality_id) 
        REFERENCES specialty(speciality_id) 
        ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS idx_ds_specialty_id ON doctor_specialty(speciality_id);

-- 4. DOCTOR_AVAILABILITY_SLOTS
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
CREATE INDEX IF NOT EXISTS idx_slots_doctor_date_status 
    ON doctor_availability_slots(doctor_id, date, status);

-- 5. APPOINTMENTS
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
    slot_id INT NULL,
    appointment_type appointment_type NOT NULL DEFAULT 'Consultation',
    appointment_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    status appointment_status NOT NULL DEFAULT 'Scheduled',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

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

    -- FR-AM-03: Double-booking prevention
    CONSTRAINT no_overlapping_doctor_appointments EXCLUDE USING gist (
        doctor_id WITH =,
        appointment_time_range WITH &&
    ) WHERE (status <> 'Cancelled')
);

CREATE INDEX IF NOT EXISTS idx_appointments_doctor_date_status 
    ON appointments(doctor_id, appointment_date, status);
CREATE INDEX IF NOT EXISTS idx_appointments_patient_id 
    ON appointments(patient_id);
