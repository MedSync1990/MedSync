-- ============================================================================
-- Table: appointments
-- Module: 02 - Doctor & Appointment Management
-- Owner: Kalana Jayawardena
-- Reference: docs/database.md §2.6
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
    appointment_code  VARCHAR(10) GENERATED ALWAYS AS ('APT-' || lpad(appointment_id::text, 6, '0')) STORED,
    patient_id        INT NOT NULL,
    slot_id           INT NOT NULL UNIQUE REFERENCES doctor_availability_slots(slot_id),
    appointment_type  appointment_type_enum NOT NULL,
    status            appointment_status_enum NOT NULL DEFAULT 'Scheduled',
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Foreign key to patient(user_id) ON DELETE RESTRICT
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'patient') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'fk_appt_patient' AND table_name = 'appointments'
        ) THEN
            ALTER TABLE appointments 
                ADD CONSTRAINT fk_appt_patient FOREIGN KEY (patient_id) 
                REFERENCES patient(user_id) ON DELETE RESTRICT;
        END IF;
    END IF;
END $$;

-- Indexes per docs/database.md §2.6:
CREATE INDEX IF NOT EXISTS idx_appt_patient ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appt_status ON appointments(status);
