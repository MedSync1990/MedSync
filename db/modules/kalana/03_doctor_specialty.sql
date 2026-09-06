-- ============================================================================
-- Table: DOCTOR_SPECIALTY (DOCTOR_SPECIALITY per ERD)
-- Module: Doctor/Specialty & Appointment Management
-- Owner: Kalana Jayawardena
-- Description: Many-to-many junction table for doctor specialty allocations
-- ============================================================================

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

-- Indexes for efficient lookups when filtering doctors by specialty or vice versa
CREATE INDEX IF NOT EXISTS idx_ds_specialty_id ON doctor_specialty(speciality_id);
