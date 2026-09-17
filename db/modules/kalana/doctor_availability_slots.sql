-- ============================================================================
-- Table: doctor_availability_slots
-- Role: Store availability slots of each doctor
-- Owner: Kalana Jayawardena
-- ============================================================================

-- btree_gist extension needed for the EXCLUDE constraint
-- needed for checking overlapping ranges
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Slot status enum
DO $$ BEGIN
    CREATE TYPE slot_status_enum AS ENUM ('Open', 'Booked', 'Blocked');
EXCEPTION
    -- exception handling
    WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS doctor_availability_slots (
    slot_id      INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    doctor_id    INT NOT NULL REFERENCES doctor(user_id) ON DELETE CASCADE,
    date         DATE NOT NULL,
    start_time   TIME NOT NULL,
    end_time     TIME NOT NULL CHECK (end_time > start_time),
    status       slot_status_enum NOT NULL DEFAULT 'Open',

    -- a generated column
    -- function creates a half-open interval, [start,end)
    slot_range   TSRANGE GENERATED ALWAYS AS
                     (tsrange(date + start_time, date + end_time, '[)')) STORED
);

CREATE INDEX IF NOT EXISTS idx_slots_doctor_date_status 
    ON doctor_availability_slots(doctor_id, date, status);

-- Overlap prevention constraint at the slot level:
-- cannot have two overlapping availability slots for same doctor.
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'excl_slot_overlap'
    ) THEN
        ALTER TABLE doctor_availability_slots
            ADD CONSTRAINT excl_slot_overlap
            -- only when doctor is the same '=' and slots overlap '&&'
            EXCLUDE USING gist (doctor_id WITH =, slot_range WITH &&);
    END IF;
END $$;
