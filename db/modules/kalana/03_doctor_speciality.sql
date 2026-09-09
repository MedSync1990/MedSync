-- ============================================================================
-- Table: doctor_speciality
-- Module: 02 - Doctor & Appointment Management
-- Owner: Kalana Jayawardena
-- Reference: docs/database.md §2.1
-- ============================================================================

CREATE TABLE IF NOT EXISTS doctor_speciality (
    user_id        INT NOT NULL REFERENCES doctor(user_id) ON DELETE CASCADE,
    speciality_id  INT NOT NULL REFERENCES specialty(speciality_id) ON DELETE RESTRICT,
    PRIMARY KEY (user_id, speciality_id)
);

CREATE INDEX IF NOT EXISTS idx_doctor_speciality_speciality ON doctor_speciality(speciality_id);
