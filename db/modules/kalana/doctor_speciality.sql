-- ============================================================================
-- Table: doctor_speciality
-- Role: Joins doctor table and speciality table
-- Owner: Kalana Jayawardena
-- ============================================================================

CREATE TABLE IF NOT EXISTS doctor_speciality (
    -- if a doctor's record is removed automatically delete record in this table.
    user_id        INT NOT NULL REFERENCES doctor(user_id) ON DELETE CASCADE,
    -- restricts deleting speciality if doctors have that speciality
    speciality_id  INT NOT NULL REFERENCES specialty(speciality_id) ON DELETE RESTRICT,
    PRIMARY KEY (user_id, speciality_id)  -- COmposite primary key
);

-- index for looking up a specific doctor's speciality automatically created
-- this index improves reverse lookups
CREATE INDEX IF NOT EXISTS idx_doctor_speciality_speciality ON doctor_speciality(speciality_id);
