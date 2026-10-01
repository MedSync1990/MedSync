-- ============================================================================
-- Table: doctor_specialty
-- Role: Joins doctor table and specialty table
-- Owner: Kalana Jayawardena
-- ============================================================================

CREATE TABLE IF NOT EXISTS doctor_specialty (
    -- if a doctor's record is removed automatically delete record in this table.
    user_id        INT NOT NULL REFERENCES doctor(user_id) ON DELETE CASCADE,
    -- restricts deleting specialty if doctors have that specialty
    specialty_id   INT NOT NULL REFERENCES specialty(specialty_id) ON DELETE RESTRICT,
    PRIMARY KEY (user_id, specialty_id)  -- Composite primary key
);

-- index for looking up a specific doctor's specialty automatically created
-- this index improves reverse lookups
CREATE INDEX IF NOT EXISTS idx_doctor_specialty_specialty ON doctor_specialty(specialty_id);
