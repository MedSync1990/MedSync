-- ============================================================================
-- Table: appointment
-- Role: Store data about apointments of patients
-- Owner: Kalana Jayawardena
-- ============================================================================

-- Appointment types and statuses
DO $$ BEGIN
    CREATE TYPE appointment_type_enum AS ENUM ('Scheduled Visit', 'Walk-in', 'Follow-up');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE appointment_status_enum AS ENUM ('Scheduled', 'Completed', 'Cancelled');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS appointments (
    appointment_id    INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    appointment_code  VARCHAR(20) GENERATED ALWAYS AS ('APT-' || lpad(appointment_id::text, 6, '0')) STORED,
    patient_id        INT NOT NULL,
    slot_id           INT NOT NULL UNIQUE REFERENCES doctor_availability_slots(slot_id) ON DELETE RESTRICT,
    appointment_type  appointment_type_enum NOT NULL DEFAULT 'Scheduled Visit',
    status            appointment_status_enum NOT NULL DEFAULT 'Scheduled',
    created_at        TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes per docs/database.md:
CREATE INDEX IF NOT EXISTS idx_appointments_patient ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
